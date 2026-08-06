import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://icaruswick.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const data = await page.evaluate(() => {
    const logoImg = document.querySelector('header img, .header__logo img, a[href="/"] img');
    const btns = Array.from(document.querySelectorAll('button, .button, a.button')).map((b) => ({
      text: b.innerText.trim().slice(0, 60),
      bg: window.getComputedStyle(b).backgroundColor,
      color: window.getComputedStyle(b).color,
      border: window.getComputedStyle(b).border,
      font: window.getComputedStyle(b).fontFamily,
    })).filter((x) => x.text).slice(0, 20);
    const hero = Array.from(document.querySelectorAll('section, .banner, .hero, .slideshow, .image-with-text')).slice(0, 6).map((s) => ({
      tag: s.tagName,
      classes: s.className,
      text: s.innerText.trim().slice(0, 300),
      bg: window.getComputedStyle(s).backgroundColor,
      color: window.getComputedStyle(s).color,
    }));
    const navLinks = Array.from(document.querySelectorAll('nav a, header a')).map((a) => a.innerText.trim()).filter(Boolean).slice(0, 20);
    return { logo: logoImg && logoImg.src, buttons: btns, heroSections: hero, navLinks };
  });
  fs.writeFileSync('research/brand-audit.json', JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
