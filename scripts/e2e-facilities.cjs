/** Browser check for the facility sub-upgrades and the Skills lab. Serve dist first (see e2e-back.cjs). */
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:8099/';
const shots = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  let failed = 0;
  const expect = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `(got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`); if (!ok) failed++; };
  const cash = async () => (await p.textContent('.topbar .money')).trim();
  await p.goto(url); await p.waitForSelector('.slot.empty');
  await p.tap('.slot.empty >> nth=0'); await p.tap('text=Wessex League Premier'); await p.tap('text=Brockenhurst');
  await p.waitForSelector('button.continue', { timeout: 30000 });
  await p.tap('.tabs button:has-text("Club")'); await p.waitForTimeout(300);
  await p.tap('.seg button:has-text("Facilities")'); await p.waitForTimeout(400);
  expect('20 sub-facilities in 4 branches', await p.locator('.fac-track').count(), 20);
  if (shots) await p.screenshot({ path: `${shots}/fac.png` });
  const c0 = await cash();
  const lab = p.locator('.fac-track', { hasText: 'Skills lab' });
  await lab.locator('.fac-next .btn').tap(); await p.waitForTimeout(300);
  expect('building the Skills lab spends cash and shows progress', [(await cash()) !== c0, (await lab.textContent()).includes('weeks left')], [true, true]);
  const shop = p.locator('.fac-track', { hasText: 'Club shop' });
  await shop.locator('.fac-next .btn').tap(); await p.waitForTimeout(300);
  expect('a second sub-facility builds at the same time', (await shop.textContent()).includes('weeks left'), true);
  // play on until the lab is ready
  await p.tap('.tabs button:has-text("Hub")'); await p.waitForTimeout(300);
  for (let k = 0; k < 30; k++) {
    if (await p.locator('.dpop .dchoice:not(.off)').count()) { await p.tap('.dpop .dchoice:not(.off) >> nth=0'); await p.waitForTimeout(150); continue; }
    if (await p.locator('.dpop .btn').count()) { await p.tap('.dpop .btn'); continue; }
    if (await p.locator('.overlay .back').count()) { await p.tap('.overlay .back'); continue; }
    if (await p.locator('.atoast').count()) await p.waitForTimeout(4500);
    const wk = await p.textContent('.topbar .sub');
    if (/Wk ([6-9]|\d\d)\b/.test(wk)) break;
    await p.tap('button.continue', { timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(500);
  }
  if (await p.locator('.dpop .later').count()) await p.tap('.dpop .later');
  await p.tap('.tabs button:has-text("Squad")'); await p.waitForTimeout(400);
  await p.locator('.content .item', { hasText: 'y' }).nth(3).tap();
  await p.waitForTimeout(500);
  const card = p.locator('.card', { hasText: 'Skills lab' });
  expect('player page shows the Skills lab card', await card.count(), 1);
  const stock = await card.textContent();
  expect('the lab has made items', /1\/1 in stock/.test(stock), true);
  await card.locator('.lab-item >> nth=1').tap(); await p.waitForTimeout(200);
  if (shots) await p.screenshot({ path: `${shots}/lab.png`, fullPage: false });
  await card.locator('.lab-stat >> nth=0').tap(); await p.waitForTimeout(300);
  expect('using a skill boost reports the gain', /\+\d/.test(await card.locator('.green').last().textContent()), true);
  console.log('console errors:', JSON.stringify(errs));
  await b.close();
  process.exit(failed || errs.length ? 1 : 0);
})();
