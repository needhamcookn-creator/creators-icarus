import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('research');
fs.mkdirSync(outDir, { recursive: true });

const urls = [
  { name: 'homepage', url: 'https://icaruswick.com/' },
  { name: 'collections', url: 'https://icaruswick.com/collections/all' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  for (const { name, url } of urls) {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });

      const colors = await page.evaluate(() => {
        const styles = Array.from(document.querySelectorAll('body, header, footer, nav, h1, h2, h3, a, button, p, span, div.section, .button, .btn'))
          .slice(0, 500)
          .map((el) => window.getComputedStyle(el));
        return {
          bgColors: [...new Set(styles.map((s) => s.backgroundColor).filter(Boolean))].slice(0, 30),
          textColors: [...new Set(styles.map((s) => s.color).filter(Boolean))].slice(0, 30),
          fonts: [...new Set(styles.map((s) => s.fontFamily).filter(Boolean))].slice(0, 30),
        };
      });

      fs.writeFileSync(path.join(outDir, `${name}_styles.json`), JSON.stringify(colors, null, 2));
      console.log(`Captured ${name}`);
    } catch (e) {
      console.error(`Failed ${name}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
