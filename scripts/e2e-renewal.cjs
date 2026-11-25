/** Browser check for the contract reminder popup with free wage and length (DESIGN 13.2m). Serve dist first. */
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
  let found = false;
  for (let k = 0; k < 160 && !found; k++) {
    if (await p.locator('.dpop .renewal').count()) { found = true; break; }
    if (await p.locator('.wel-go').count()) { await p.click('.wel-go'); await p.waitForTimeout(150); continue; } // welcome / pre-season windows
    if (await p.locator('.dpop .dchoice:not(.off)').count()) { await p.tap('.dpop .dchoice:not(.off) >> nth=0'); await p.waitForTimeout(150); continue; }
    if (await p.locator('.dpop .btn').count()) { await p.tap('.dpop .btn >> nth=0'); continue; }
    if (await p.locator('.overlay .back').count()) { await p.tap('.overlay .back'); continue; }
    if (await p.locator('.atoast').count()) await p.waitForTimeout(4500);
    await p.tap('button.continue', { timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(250);
  }
  expect('a contract reminder popup with a negotiation form appears', found, true);
  if (!found) { await b.close(); process.exit(1); }
  const title = (await p.textContent('.dpop h2')).trim();
  console.log('popup:', title, '|', (await p.textContent('.topbar .sub')).trim());
  expect('reminder says 6 months or 1 month', /(6 months|1 month) left/.test(title), true);
  expect('five length options', await p.locator('.dpop .cyear').count(), 5);
  const asks = await p.$$eval('.dpop .cyear span', (els) => els.map((e) => +e.textContent.replace(/[^0-9.k]/g, '').replace('k', '')));
  console.log('asks 1..5 years', JSON.stringify(asks));
  await p.tap('.dpop .cyear >> nth=4'); await p.waitForTimeout(150);
  expect('offer button follows the chosen length', /5 years/.test(await p.textContent('.dpop .renewal .btn.primary')), true);
  await p.locator('.dpop .cwage').evaluate((el) => { el.value = el.min; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(100);
  expect('a very low wage shows he walks away', (await p.textContent('.dpop .renewal .red')).includes('walks away'), true);
  await p.tap('.dpop .renewal .linkbtn:has-text("Match his ask")'); await p.waitForTimeout(100);
  expect('matching his ask shows he signs', (await p.textContent('.dpop .renewal .green')).includes('He signs'), true);
  if (shots) await p.screenshot({ path: `${shots}/renewal.png` });
  await p.tap('.dpop .renewal .btn.primary'); await p.waitForTimeout(400);
  expect('signing closes the reminder with the result', /signs for 5 years/.test(await p.textContent('.dpop')), true);
  console.log('console errors:', JSON.stringify(errs));
  await b.close();
  process.exit(failed || errs.length ? 1 : 0);
})();
