/**
 * Browser check for the free first season and the Full game unlock (docs/PLAY_STORE.md).
 * Run against the dev server (the dev build has a "Simulate purchase" button): npx vite, then
 *   node scripts/e2e-paywall.cjs http://localhost:5173/ [screenshot-dir]
 * With a screenshot dir it also saves the Google Play phone screenshots (1080x1920).
 */
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:5173/';
const shots = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: shots ? 3 : 1, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  let failed = 0;
  const expect = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `(got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`); if (!ok) failed++; };
  const shot = async (n) => { if (shots) { await p.evaluate(() => { const st = window.__fgm.store; st.toasts = []; st.bump(); }); await p.waitForTimeout(500); await p.screenshot({ path: `${shots}/${n}.png` }); } };
  const clearPopups = async () => { for (let i = 0; i < 6 && await p.locator('.dpop .later').count(); i++) { await p.tap('.dpop .later'); await p.waitForTimeout(150); } };
  const play = (weeks) => p.evaluate(async (w) => { const st = window.__fgm.store; const end = st.state.week + w; for (let i = 0; i < 80 && st.state.week < end; i++) { const r = await st.continueGame(Math.min(12, end - st.state.week)); if (!r) break; } }, weeks);

  await p.goto(url); await p.waitForSelector('.slots .slot.empty');
  await p.tap('.slot.empty >> nth=0'); await p.tap('text=Solent League Premier'); await p.tap('text=Fenhurst United');
  await p.waitForSelector('button.continue', { timeout: 30000 });
  await play(17); await p.evaluate(() => { const st = window.__fgm.store; st.hiddenUpTo = 1e9; st.bump(); }); await clearPopups();
  await shot('1-hub');
  await p.tap('.tabs button >> nth=1'); await p.waitForTimeout(300); await shot('2-squad');
  await p.tap('.tabs button >> nth=2'); await p.waitForTimeout(300); await shot('3-transfers');
  await p.tap('.tabs button >> nth=4'); await p.waitForTimeout(300); await shot('4-league');
  await p.tap('.tabs button >> nth=3'); await p.waitForTimeout(300); await shot('5-club');
  await p.tap('.tabs button >> nth=0'); await p.waitForTimeout(200);
  // a match report
  await p.evaluate(async () => {
    const { nav } = await import('/src/ui/store.ts'); const s = window.__fgm.store.state;
    const f = s.fixtures.filter((x) => x.hg != null && !x.cup && (x.home === s.userClubId || x.away === s.userClubId) && s.reports.has(x.id)).sort((a, b) => (b.hg + b.ag) - (a.hg + a.ag))[0];
    if (f) nav.push({ kind: 'match', fixtureId: f.id });
  });
  await p.waitForTimeout(300); await shot('6-match');
  while (await p.locator('.overlay .back').count()) { await p.tap('.overlay .back'); await p.waitForTimeout(200); }

  // play out the season
  await p.evaluate(async () => { const st = window.__fgm.store; for (let i = 0; i < 200; i++) { const r = await st.continueGame(12); if (!r) break; } st.hiddenUpTo = 1e9; st.bump(); });
  const s1 = await p.evaluate(() => [window.__fgm.store.state.season, window.__fgm.store.state.week]);
  expect('a new career stops right after its first season', s1, [2025, 47]);
  await p.waitForTimeout(300);
  while (await p.locator('.overlay .back').count()) { await p.tap('.overlay .back'); await p.waitForTimeout(200); }
  // answer any open decisions (they pause Continue before the paywall does)
  await p.evaluate(async () => {
    const d = await import('/src/core/systems/decisions.ts'); const st = window.__fgm.store; const s = st.state;
    for (const m of d.pendingDecisions(s)) for (let k = 0; k < 4 && !m.resolved; k++) d.resolveDecision(s, m.id, k);
    st.bump();
  });
  await p.waitForTimeout(300);
  expect('Continue asks for the unlock', (await p.textContent('button.continue')).includes('Unlock season 2'), true);
  await p.tap('button.continue'); await p.waitForSelector('.paywall');
  expect('paywall shows the season summary', (await p.textContent('.pw-club')).includes('finished'), true);
  expect('web build links to Google Play', await p.locator('a.pw-buy[href*="play.google.com"]').count(), 1);
  if (shots) await p.screenshot({ path: `${shots}/../paywall-check.png` });
  await p.tap('text=Not now'); await p.waitForTimeout(200);
  await p.tap('button.continue'); await p.waitForSelector('.paywall');
  expect('Continue keeps showing the paywall', await p.locator('.paywall').count(), 1);
  await p.tap('text=Simulate purchase'); await p.waitForSelector('.pw-stamp');
  await p.tap('text=Back to the club'); await p.waitForTimeout(200);
  expect('after unlock Continue is back', (await p.textContent('button.continue')).trim(), 'Continue ›');
  await p.evaluate(async () => { const st = window.__fgm.store; for (let i = 0; i < 30 && st.state.season === 2025; i++) await st.continueGame(12); });
  expect('season two starts', await p.evaluate(() => window.__fgm.store.state.season), 2026);
  await p.reload(); await p.waitForSelector('button.continue', { timeout: 20000 });
  expect('the unlock survives a reload', await p.evaluate(() => localStorage.getItem('fgm.fullGame')), 'dev');
  console.log('console errors:', JSON.stringify(errs));
  await b.close();
  process.exit(failed || errs.length ? 1 : 0);
})();
