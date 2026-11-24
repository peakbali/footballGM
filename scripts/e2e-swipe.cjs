/** Browser check for swipe between sub-pages (real touch events through CDP). Serve dist first (see e2e-back.cjs). */
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:8099/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(url); await p.waitForTimeout(1000);
  await p.tap('text=New career'); await p.tap('text=Wessex League Premier'); await p.tap('text=Brockenhurst');
  await p.waitForSelector('button.continue', { timeout: 30000 });
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const swipe = async (x0, y0, x1, y1) => {
    await touch('touchStart', x0, y0);
    for (let i = 1; i <= 6; i++) { await touch('touchMove', x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6); await p.waitForTimeout(16); }
    await touch('touchEnd');
    await p.waitForTimeout(400);
  };
  const active = async (sel) => (await p.textContent(sel)).trim();
  let failed = 0;
  const expect = (name, got, want) => { const ok = got === want; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `(got "${got}", want "${want}")`); if (!ok) failed++; };

  await p.tap('.tabs button:has-text("Transfers")');
  const on = () => active('.chips[data-seg-bar] .chip.on');
  expect('transfers starts on Scouted', (await on()).toLowerCase(), 'scouted');
  await swipe(300, 500, 60, 500);
  expect('swipe left -> next (★ List)', await on(), '★ List');
  await swipe(300, 500, 60, 500);
  expect('swipe left -> Free agents', (await on()).toLowerCase(), 'free agents');
  await swipe(60, 500, 300, 500);
  expect('swipe right -> back to ★ List', await on(), '★ List');
  await swipe(60, 500, 300, 500);
  await swipe(60, 500, 300, 500);
  expect('swipe right at first page stays', (await on()).toLowerCase(), 'scouted');
  await swipe(200, 600, 210, 300);
  expect('vertical drag does not change page', (await on()).toLowerCase(), 'scouted');
  await swipe(300, await p.evaluate(() => Math.round(document.querySelector('.chips[data-seg-bar]').getBoundingClientRect().top + 10)), 60, 0 + (await p.evaluate(() => Math.round(document.querySelector('.chips[data-seg-bar]').getBoundingClientRect().top + 10))));
  expect('swipe on the scrollable chip row does not change page', (await on()).toLowerCase(), 'scouted');
  await p.tap('.chips[data-seg-bar] .chip:has-text("News")'); await p.waitForTimeout(400);
  expect('tapping a chip still works', (await on()).toLowerCase(), 'news');
  const vis = await p.evaluate(() => { const c = document.querySelector('.chips[data-seg-bar]'), o = c.querySelector('.on').getBoundingClientRect(), r = c.getBoundingClientRect(); return o.left >= r.left - 1 && o.right <= r.right + 1; });
  expect('active chip scrolled into view', vis, true);

  // empty space below a short page still swipes
  await p.tap('.chips[data-seg-bar] .chip:has-text("Offers")'); await p.waitForTimeout(400);
  const bottom = await p.evaluate(() => Math.round(document.querySelector('.swipe').getBoundingClientRect().bottom));
  console.log('offers content ends at', bottom, 'px of', 844);
  await swipe(300, Math.min(760, bottom + 60), 60, Math.min(760, bottom + 60));
  expect('swipe from empty space below the boxes', (await on()).toLowerCase(), 'scouts');
  await swipe(300, 650, 60, 650);
  expect('swipe left again -> news', (await on()).toLowerCase(), 'news');

  await p.tap('.tabs button:has-text("League")');
  const seg = () => active('.seg[data-seg-bar] button.on');
  await swipe(300, 500, 60, 500);
  expect('league swipe left -> fixtures', await seg(), 'fixtures');
  await p.waitForTimeout(300); await p.tap('.tabs button:has-text("Club")'); await p.waitForTimeout(400);
  await swipe(300, 500, 60, 500);
  expect('club swipe left -> Staff', await seg(), 'Staff');
  await swipe(60, 500, 300, 500);
  expect('club swipe right -> Money', await seg(), 'Money');
  console.log('console errors:', JSON.stringify(errs));
  await b.close();
  process.exit(failed ? 1 : 0);
})();
