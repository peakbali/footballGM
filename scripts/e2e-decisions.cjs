/** Browser check for decision popups and the redesigned inbox. Serve dist first (see e2e-back.cjs). */
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:8099/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(url); await p.waitForTimeout(800);
  await p.tap('text=New career'); await p.tap('text=Solent League Premier'); await p.tap('text=Fenhurst United');
  await p.waitForSelector('button.continue', { timeout: 30000 }); await p.waitForTimeout(300); if (await p.$('.welcome')) await p.click('.welcome .btn.gold'); // welcome window (DESIGN 13.3b)
  let failed = 0;
  const expect = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `(got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`); if (!ok) failed++; };
  const week = async () => (await p.textContent('.topbar .sub')).match(/Wk (\d+)/)[1];
  const w0 = await week();
  await p.tap('button.continue'); await p.waitForTimeout(1500);
  expect('popup appears after Continue (pre-season decision)', await p.locator('.dpop').count(), 1);
  const w1 = await week();
  expect('popup shows 2+ choices with consequence chips', (await p.locator('.dchoice').count()) >= 2 && (await p.locator('.dchoice .dchip').count()) >= 2, true);
  if (await p.locator('.dpop .avatar.tappable').count()) {
    await p.tap('.dpop .avatar.tappable'); await p.waitForTimeout(500);
    expect('tapping the player opens his page and hides the popup', [await p.locator('.dpop').count(), await p.locator('.overlay, .ovl').count() > 0 || (await p.locator('.dpop').count()) === 0], [0, true]);
    await p.goBack(); await p.waitForTimeout(500);
    expect('back returns to the popup', await p.locator('.dpop').count(), 1);
  } else console.log('SKIP player tap (first decision is not about a player)');
  await p.tap('.later'); await p.waitForTimeout(400);
  expect('Decide later hides the popup', await p.locator('.dpop').count(), 0);
  await p.tap('button.continue'); await p.waitForTimeout(600);
  expect('Continue with an open decision shows the popup instead of playing on', [await p.locator('.dpop').count(), await week()], [1, w1]);
  await p.tap('.dchoice >> nth=0'); await p.waitForTimeout(500);
  expect('picking a choice shows the outcome stamp', (await p.locator('.dpop .rstamp .rstamp-text').textContent()).length > 5, true);
  expect('the stamp says how it went', /Success|Failed|Done/.test(await p.textContent('.dpop .rstamp-word')), true);
  await p.tap('.dpop .btn'); await p.waitForTimeout(400);
  expect('OK closes the popup', await p.locator('.dpop').count(), 0);
  expect('hub inbox shows the chosen option', (await p.locator('.hub-mail .mail-tag.done').count()) >= 1, true);
  await p.tap('.inbox-card .linkbtn'); await p.waitForTimeout(500);
  expect('inbox lists the decision in its history', (await p.locator('.mail .mail-tag.dec').count()) >= 1, true);
  console.log('weeks', w0, w1, 'console errors:', JSON.stringify(errs));
  await b.close();
  process.exit(failed || errs.length ? 1 : 0);
})();
