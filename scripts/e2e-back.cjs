/**
 * Browser check for the back button: opens each kind of screen by tapping, presses the browser back button
 * and makes sure the game is still showing (never a blank page). Needs the build served:
 *   npm run build && npx vite preview --port 8099 &   then   node scripts/e2e-back.cjs http://127.0.0.1:8099/
 * Pass --standalone to emulate the installed app (display-mode standalone, service worker active).
 */
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:8099/';
const standalone = process.argv.includes('--standalone');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(url); await p.waitForTimeout(1200);
  if (standalone) { await p.evaluate(() => navigator.serviceWorker?.ready); await p.reload(); await p.waitForTimeout(800); }
  await p.tap('text=New career'); await p.tap('text=Wessex League Premier'); await p.tap('text=Brockenhurst');
  await p.waitForSelector('button.continue', { timeout: 30000 });
  let failed = 0;
  const alive = async () => (await p.url()).startsWith(url.slice(0, 20)) && (await p.$('.app .tabs')) != null;
  const overlay = async () => !!(await p.$('.overlay'));
  const check = async (name, open) => {
    await open();
    await p.waitForTimeout(250);
    const opened = await overlay();
    let backs = 0;
    while ((await overlay()) && backs < 5) { await p.goBack(); backs++; await p.waitForTimeout(250); }
    const ok = opened && (await alive()) && !(await overlay()) && backs === 1;
    // one more back from a tab/hub must keep the game on screen too
    await p.goBack(); await p.waitForTimeout(300);
    const still = await alive();
    console.log(ok && still ? 'PASS' : 'FAIL', name, `(opened=${opened}, backs=${backs}, alive=${still})`);
    if (!(ok && still)) failed++;
    while (await p.$('.overlay .back')) await p.tap('.overlay .back');
  };
  await check('inbox', () => p.tap('.hub .linkbtn:has-text("All")'));
  await check('settings', () => p.tap('.topbar button[aria-label=Settings]'));
  await p.tap('.tabs button:has-text("Squad")');
  await check('player (from squad)', () => p.tap('.item >> nth=0'));
  await p.tap('.tabs button:has-text("Transfers")');
  await check('player (from free agents)', async () => { await p.tap('.chip:has-text("Free agents")'); await p.tap('.card .item >> nth=0'); });
  await p.tap('.tabs button:has-text("League")');
  await check('club view', async () => { await p.tap('table.tbl td.club >> nth=1').catch(() => {}); });
  await p.tap('.tabs button:has-text("Hub")');
  await check('next opponent', () => p.tap('.hub .vs'));
  // tab back button: from Club tab, back goes to the hub
  await p.tap('.tabs button:has-text("Club")'); await p.goBack(); await p.waitForTimeout(300);
  const onHub = (await p.textContent('.tabs button.on')).includes('Hub');
  console.log(onHub ? 'PASS' : 'FAIL', 'club tab, back goes to hub'); if (!onHub) failed++;
  // match report opened by Continue, then back
  await p.tap('button.continue'); await p.waitForSelector('.overlay, button.continue:not([disabled])', { timeout: 30000 });
  if (await overlay()) { await p.goBack(); await p.waitForTimeout(300); const ok = (await alive()) && !(await overlay()); console.log(ok ? 'PASS' : 'FAIL', 'match report after Continue'); if (!ok) failed++; }
  console.log('console errors:', JSON.stringify(errs));
  await b.close();
  process.exit(failed ? 1 : 0);
})();
