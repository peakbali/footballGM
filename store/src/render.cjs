/** Renders store/feature-graphic.png (1024x500) and store/icon-512.png. node store/src/render.cjs */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await p.goto('file://' + path.join(__dirname, 'feature-graphic.html'));
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, '..', 'feature-graphic.png') });
  fs.copyFileSync(path.join(__dirname, '..', '..', 'public', 'icons', 'icon-512.png'), path.join(__dirname, '..', 'icon-512.png'));
  await b.close();
})();
