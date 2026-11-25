/** Browser check for editing the club name, colours and crest (DESIGN 13.2k). Serve dist first (see e2e-back.cjs). */
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:8099/';
const shots = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: shots ? 2 : 1 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  let failed = 0;
  const expect = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `(got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`); if (!ok) failed++; };
  await p.goto(url); await p.waitForSelector('.slot.empty');
  await p.tap('.slot.empty >> nth=0'); await p.tap('text=Solent League Premier'); await p.tap('text=Fenhurst United');
  await p.waitForSelector('button.continue', { timeout: 30000 }); await p.waitForTimeout(300); if (await p.$('.welcome')) await p.click('.welcome .btn.gold'); // welcome window (DESIGN 13.3b)
  await p.tap('.tabs button:has-text("Club")'); await p.waitForTimeout(300);
  expect('club tab shows the club header', (await p.textContent('.cid-head-name')).trim(), 'Fenhurst United');
  await p.tap('.cid-head .btn'); await p.waitForTimeout(300);
  expect('edit page opens', await p.locator('.overlay .cid-preview').count(), 1);
  await p.fill('.cid-field:has-text("Club name") input', 'Pixel Rovers');
  expect('preview name updates live', (await p.textContent('.cid-name')).trim(), 'Pixel Rovers');
  expect('code follows the name', await p.inputValue('.cid-field:has-text("Code") input'), 'PIR');
  await p.fill('.cid-field:has-text("Stadium") input', 'Bit Park');
  await p.locator('.cid-colors >> nth=0').locator('.swatch[aria-label="#5a2d82"]').tap();
  await p.locator('.cid-colors >> nth=1').locator('.swatch[aria-label="#ffcc4d"]').tap();
  await p.locator('.cid-opts >> nth=0').locator('.cid-opt >> nth=4').tap();
  await p.locator('.cid-opts >> nth=1').locator('.cid-opt >> nth=5').tap();
  await p.locator('.cid-opts >> nth=2').locator('.cid-opt >> nth=1').tap();
  await p.waitForTimeout(200);
  const fill = await p.$eval('.cid-preview svg > path:nth-of-type(2)', (e) => e.getAttribute('fill'));
  expect('preview crest uses the new main colour', fill, '#5a2d82');
  if (shots) await p.screenshot({ path: `${shots}/identity-edit.png` });
  await p.fill('.cid-field:has-text("Club name") input', 'x');
  expect('a too-short name blocks saving', await p.isDisabled('.overlay .btn.gold'), true);
  await p.fill('.cid-field:has-text("Club name") input', 'Pixel Rovers');
  await p.tap('.overlay .btn.gold'); await p.waitForTimeout(400);
  expect('saved: header shows the new name', (await p.textContent('.cid-head-name')).trim(), 'Pixel Rovers');
  expect('top bar shows the new name', (await p.textContent('.topbar')).includes('Pixel Rovers'), true);
  await p.tap('.tabs button:has-text("Squad")'); await p.waitForTimeout(300);
  const shirt = await p.evaluate(() => [...document.querySelectorAll('svg.portrait rect')].some((r) => r.getAttribute('fill') === '#5a2d82'));
  expect('player shirts use the new colours', shirt, true);
  await p.tap('.tabs button:has-text("Hub")'); await p.waitForTimeout(300);
  if (shots) await p.screenshot({ path: `${shots}/identity-hub.png` });
  // persists across a reload of the save
  await p.waitForTimeout(800);
  await p.reload(); await p.waitForSelector('button.continue, .slot', { timeout: 30000 }); await p.waitForTimeout(500);
  if (await p.locator('.slot').count()) await p.tap('.slot >> nth=0');
  await p.waitForSelector('button.continue', { timeout: 30000 }); await p.waitForTimeout(300); if (await p.$('.welcome')) await p.click('.welcome .btn.gold'); // welcome window (DESIGN 13.3b)
  expect('after reload the save keeps the new name', (await p.textContent('.topbar')).includes('Pixel Rovers'), true);
  console.log('console errors:', JSON.stringify(errs));
  await b.close();
  process.exit(failed || errs.length ? 1 : 0);
})();
