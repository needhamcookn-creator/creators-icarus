import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('file:///' + path.resolve('dist/index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'research/portal_local_v3.png', fullPage: true });

  const samples = await page.evaluate(() => {
    const result = [];
    const selectors = [
      { name: 'feature-card-1', sel: '#features .grid > div:nth-child(1)' },
      { name: 'feature-card-2', sel: '#features .grid > div:nth-child(2)' },
      { name: 'dashboard-main-card', sel: '#dashboard .grid > div:nth-child(1)' },
      { name: 'dashboard-side-card', sel: '#dashboard .grid > div:nth-child(2) > div:nth-child(1)' },
      { name: 'product-card-1', sel: 'section:nth-of-type(5) .group:nth-child(1) > div' },
      { name: 'stats-item', sel: 'section:nth-of-type(2) > div > div:nth-child(1)' },
      { name: 'hero-text', sel: 'section.relative h1' },
    ];
    for (const { name, sel } of selectors) {
      const el = document.querySelector(sel);
      if (!el) { result.push({ name, missing: true }); continue; }
      const s = getComputedStyle(el);
      result.push({ name, bg: s.backgroundColor, color: s.color });
    }
    return result;
  });

  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map((i) => ({
      src: i.src,
      alt: i.alt,
      complete: i.complete,
      naturalWidth: i.naturalWidth,
      width: i.width,
      height: i.height,
    }));
  });

  fs.writeFileSync('research/local_contrast.json', JSON.stringify(samples, null, 2));
  fs.writeFileSync('research/local_images.json', JSON.stringify(images, null, 2));

  console.log(JSON.stringify(samples, null, 2));
  console.log(
    'Images:',
    images.map((i) => `${i.alt || i.src.split('/').pop()}: ${i.complete ? 'ok' : 'broken'} ${i.naturalWidth}x${i.naturalHeight}`)
  );

  await browser.close();
})();
