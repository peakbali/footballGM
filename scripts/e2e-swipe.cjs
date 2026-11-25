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
  await p.tap('text=New career'); await p.tap('text=Solent League Premier'); await p.tap('text=Fenhurst United');
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
  // a tap right after a CDP touch swipe is sometimes swallowed: wait, tap, and check
  const gotoTab = async (name) => {
    for (let i = 0; i < 3; i++) {
      await p.waitForTimeout(400); await p.tap(`.tabs button:has-text("${name}")`); await p.waitForTimeout(400);
      if ((await p.textContent('.tabs button.on')).includes(name)) return;
    }
  };
  const expect = (name, got, want) => { const ok = got === want; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `(got "${got}", want "${want}")`); if (!ok) failed++; };

  await gotoTab('Transfers');
  const on = () => active('.chips[data-seg-bar] .chip.on');
  const posOn = async () => (await p.locator('.chips[data-seg-bar]').nth(1).locator('.chip.on').textContent()).trim().split(' ')[0];
  const posBar = () => p.evaluate(() => document.querySelectorAll('.chips[data-seg-bar]').length);
  expect('transfers starts on Scouted', (await on()).toLowerCase(), 'scouted');
  expect('position bar shown for lists', await posBar(), 2);
  expect('starts on ANY', await posOn(), 'ANY');
  await swipe(300, 500, 60, 500);
  expect('swipe left -> next position, same segment', [(await on()).toLowerCase(), (await posOn()) !== 'ANY'].join(), 'scouted,true');
  await swipe(60, 500, 300, 500);
  expect('swipe right -> back to ANY', await posOn(), 'ANY');
  // walk through every Scouted position page, the next swipe lands on ★ List / ANY
  for (let i = 0; i < 20 && (await on()).toLowerCase() === 'scouted'; i++) await swipe(300, 500, 60, 500);
  expect('swipe left past last position -> ★ List', await on(), '★ List');
  expect('...on its ANY page', await posOn(), 'ANY');
  await swipe(60, 500, 300, 500);
  expect('swipe right from ANY -> previous segment', (await on()).toLowerCase(), 'scouted');
  for (let i = 0; i < 3 && (await on()) !== 'Free agents'; i++) { await p.waitForTimeout(400); await p.tap('.chips[data-seg-bar] .chip:has-text("Free agents")'); await p.waitForTimeout(400); }
  await p.tap('.chips[data-seg-bar] >> nth=1 >> .chip:has-text("ST")'); await p.waitForTimeout(400);
  expect('tap a position chip', await posOn(), 'ST');
  expect('free agent table has sort header', await p.locator('.sq-sort').count() >= 5, true);
  await p.tap('.sq-sort:has-text("Age")'); await p.waitForTimeout(300);
  const ages = await p.$$eval('.item.sq-item .sq-c:nth-child(1)', (els) => els.slice(0, 8).map((e) => +e.textContent));
  expect('sorted by age ascending', ages.every((v, i) => i === 0 || ages[i - 1] <= v), true);
  await p.tap('.sq-sort:has-text("Age")'); await p.waitForTimeout(300);
  const ages2 = await p.$$eval('.item.sq-item .sq-c:nth-child(1)', (els) => els.slice(0, 8).map((e) => +e.textContent));
  expect('tap again flips to descending', ages2.every((v, i) => i === 0 || ages2[i - 1] >= v), true);
  await p.tap('.chips[data-seg-bar] .chip:has-text("Scouted")'); await p.waitForTimeout(400);
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

  await gotoTab('League');
  const seg = () => active('.seg[data-seg-bar] button.on');
  await swipe(300, 500, 60, 500);
  expect('league swipe left -> power', await seg(), 'power');
  await p.waitForTimeout(300); await gotoTab('Club');
  await swipe(300, 500, 60, 500);
  expect('club swipe left -> Facilities', await seg(), 'Facilities');
  await swipe(60, 500, 300, 500);
  expect('club swipe right -> Money', await seg(), 'Money');
  expect('Staff is no longer under Club', await p.locator('.seg[data-seg-bar] button:has-text("Staff")').count(), 0);
  await p.waitForTimeout(300); await gotoTab('Squad');
  const inner = async () => (await p.locator('.seg[data-seg-bar]').nth(1).locator('button.on').textContent()).trim();
  expect('squad starts on Formation', await seg(), 'Formation');
  expect('formation page shows the pitch', await p.locator('svg.pitch').count(), 1);
  await swipe(300, 500, 60, 500);
  expect('swipe left -> Squad list', await seg(), 'Squad');
  expect('...on Contract', await inner(), 'Contract');
  await p.evaluate(() => { document.querySelector('.content').scrollTop = 600; });
  await swipe(300, 300, 60, 300);
  expect('squad list swipe left -> Progress (outer stays)', [await seg(), await inner()].join(), 'Squad,Progress');
  await swipe(300, 300, 60, 300);
  expect('squad list swipe left -> Form', [await seg(), await inner()].join(), 'Squad,Form');
  await swipe(300, 300, 60, 300);
  expect('squad list swipe left -> Attributes', [await seg(), await inner()].join(), 'Squad,Attributes');
  await swipe(300, 300, 60, 300);
  expect('swipe left past Attributes -> Staff', await seg(), 'Staff');
  expect('staff page shows the staff card', await p.locator('.card', { hasText: 'Staff ·' }).count(), 1);
  await swipe(60, 500, 300, 500);
  expect('swipe right from Staff -> Squad, Attributes kept', [await seg(), await inner()].join(), 'Squad,Attributes');
  for (let i = 0; i < 3; i++) await swipe(60, 400, 300, 400);
  expect('swipe right three times -> Contract', [await seg(), await inner()].join(), 'Squad,Contract');
  await swipe(60, 400, 300, 400);
  expect('swipe right past Contract -> Formation', await seg(), 'Formation');
  for (let i = 0; i < 3 && (await seg()) !== 'Staff'; i++) { await p.waitForTimeout(400); await p.tap('.seg[data-seg-bar] button:has-text("Staff")'); await p.waitForTimeout(400); }
  await gotoTab('Hub'); await gotoTab('Squad');
  expect('Squad tab remembers the sub-page', await seg(), 'Staff');
  console.log('console errors:', JSON.stringify(errs));
  await b.close();
  process.exit(failed ? 1 : 0);
})();
