/** Browser check for save slots and achievements. Serve dist first (see e2e-back.cjs). */
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:8099/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  let failed = 0;
  const expect = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `(got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`); if (!ok) failed++; };
  const start = async (club) => { await p.tap('.slot.empty >> nth=0'); await p.tap('text=Solent League Premier'); await p.tap(`text=${club}`); await p.waitForSelector('button.continue', { timeout: 30000 }); };
  const toTitle = async () => { if (await p.locator('.dpop .later').count()) await p.tap('.dpop .later'); await p.waitForTimeout(200); await p.tap('[aria-label="Settings"]'); await p.tap('text=Switch slot'); await p.waitForSelector('.slots .slot'); await p.waitForTimeout(300); };
  await p.goto(url); await p.waitForSelector('.slots .slot.empty');
  expect('fresh install shows 5 empty slots', await p.locator('.slot.empty').count(), 5);
  await start('Fenhurst United');
  await p.tap('[aria-label="Settings"]');
  expect('settings names the slot', await p.locator('text=Save · slot 1').count(), 1);
  expect('settings lists achievements 0/100 or more', (await p.locator('text=/Achievements · \\d+\\/100/').count()), 1);
  await p.tap('text=Switch slot'); await p.waitForSelector('.slot.used');
  expect('slot 1 now used, 4 empty', [await p.locator('.slot.used').count(), await p.locator('.slot.empty').count()], [1, 4]);
  expect('slot card shows the club', (await p.locator('.slot.used').textContent()).includes('Fenhurst United'), true);
  await start('Crowmere Corinthians'); await toTitle();
  expect('second career lands in slot 2', [await p.locator('.slot.used').count(), (await p.locator('.slot.used >> nth=1').textContent()).includes('Crowmere Corinthians')], [2, true]);
  // keep playing slot 1 and check it is untouched by slot 2
  await p.tap('.slot.used >> nth=0 >> .slot-main'); await p.waitForSelector('button.continue');
  expect('slot 1 loads its own club', (await p.textContent('.topbar .title')).includes('Fenhurst United'), true);
  await p.tap('button.continue'); await p.waitForTimeout(1200);
  await p.reload(); await p.waitForSelector('button.continue', { timeout: 20000 });
  expect('reload resumes the slot played last', (await p.textContent('.topbar .title')).includes('Fenhurst United'), true);
  // legacy save: no slot info record, listing rebuilds it
  await toTitle();
  await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('footballgm'); r.onsuccess = () => { const tx = r.result.transaction('saves', 'readwrite'); tx.objectStore('saves').delete('slots.meta'); tx.objectStore('saves').delete('slots.last'); tx.oncomplete = () => res(); }; }));
  await p.reload(); await p.waitForSelector('.slots .slot', { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const used = await p.locator('.slot.used').count();
  expect('slots without info records are recovered on load', used >= 2, true);
  if (await p.locator('button.continue').count() === 0) { await p.tap('.slot.used >> nth=0 >> .slot-main'); await p.waitForSelector('button.continue'); }
  // play on until an achievement toast shows
  let toast = 0;
  for (let k = 0; k < 80 && !toast; k++) {
    if (await p.locator('.dpop .dchoice:not(.off)').count()) { await p.tap('.dpop .dchoice:not(.off) >> nth=0'); await p.waitForTimeout(150); continue; }
    if (await p.locator('.dpop .btn').count()) { await p.tap('.dpop .btn'); continue; }
    await p.tap('button.continue', { timeout: 3000 }).catch(() => {});
    toast = await p.waitForSelector('.atoast', { timeout: 1500 }).then(() => 1).catch(() => 0);
  }
  expect('an achievement popup appears', toast >= 1, true);
  await p.tap('.atoast'); await p.waitForTimeout(400);
  expect('tapping the popup opens the achievements page', await p.locator('.ach').count() > 50, true);
  expect('page shows an unlocked entry', await p.locator('.ach.got').count() >= 1, true);
  await p.tap('.overlay .back'); await p.waitForTimeout(300);
  await toTitle();
  await p.tap('.slot-del >> nth=0'); await p.tap('.slot-del.sure >> nth=0'); await p.waitForTimeout(600);
  expect('deleting needs a second tap and removes the slot', await p.locator('.slot.used').count(), 1);
  console.log('console errors:', JSON.stringify(errs));
  await b.close();
  process.exit(failed || errs.length ? 1 : 0);
})();
