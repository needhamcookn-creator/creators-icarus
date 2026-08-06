import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://creators-icaruswick.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const samples = await page.evaluate(() => {
    const result = [];
    const selectors = [
      { name: 'feature-card-1', sel: '#features > div > div.grid > div:nth-child(1)' },
      { name: 'feature-card-2', sel: '#features > div > div.grid > div:nth-child(2)' },
      { name: 'dashboard-main-card', sel: '#dashboard > div > div.grid > div:nth-child(1)' },
      { name: 'dashboard-side-card', sel: '#dashboard > div > div.grid > div:nth-child(2) > div:nth-child(1)' },
      { name: 'product-card-1', sel: 'section:nth-of-type(5) .group:nth-child(1) > div' },
      { name: 'stats-item', sel: 'section:nth-of-type(2) > div > div:nth-child(1)' },
    ];
    for (const { name, sel } of selectors) {
      const el = document.querySelector(sel);
      if (!el) { result.push({ name, missing: true }); continue; }
      const s = getComputedStyle(el);
      const text = el.querySelector('p, h3, span');
      const ts = text ? getComputedStyle(text) : null;
      result.push({
        name,
        bg: s.backgroundColor,
        textColor: ts ? ts.color : null,
        border: s.borderColor,
        classes: el.className,
      });
    }
    return result;
  });

  const heroImg = await page.evaluate(() => {
    const img = document.querySelector('img[alt="ICARUS creator campaign"]');
    return img ? { src: img.src, complete: img.complete, nw: img.naturalWidth, nh: img.naturalHeight } : null;
  });

  const allImages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map((img) => ({
      src: img.src,
      alt: img.alt,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      display: getComputedStyle(img).display,
      width: img.width,
      height: img.height,
    }));
  });

  fs.writeFileSync('research/contrast_samples.json', JSON.stringify(samples, null, 2));
  fs.writeFileSync('research/hero_image.json', JSON.stringify(heroImg, null, 2));
  fs.writeFileSync('research/all_images.json', JSON.stringify(allImages, null, 2));

  console.log('Contrast samples:', JSON.stringify(samples, null, 2));
  console.log('Hero image:', JSON.stringify(heroImg, null, 2));
  console.log('All images count:', allImages.length);
  console.log('Incomplete images:', allImages.filter((i) => !i.complete || i.naturalWidth === 0).length);

  await browser.close();
})();
