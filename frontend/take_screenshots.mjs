import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function capture() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const dir = path.resolve(process.cwd(), '../screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tasks = [
    { url: '/', vp: { width: 360, height: 800 }, name: 'home-360x800.png' },
    { url: '/', vp: { width: 390, height: 844 }, name: 'home-390x844.png' },
    { url: '/', vp: { width: 412, height: 915 }, name: 'home-412x915.png' },
    { url: '/shop', vp: { width: 360, height: 800 }, name: 'shop-360x800.png' },
    { url: '/shilp-studio', vp: { width: 360, height: 800 }, name: 'studio-360x800.png' },
    { url: '/our-story', vp: { width: 360, height: 800 }, name: 'about-360x800.png' },
    { url: '/reach-us', vp: { width: 360, height: 800 }, name: 'contact-360x800.png' },
    { url: '/', vp: { width: 768, height: 1024 }, name: 'tablet-768x1024.png' },
    { url: '/', vp: { width: 1280, height: 800 }, name: 'desktop-1280x800.png' },
  ];

  for (const t of tasks) {
    await page.setViewport(t.vp);
    await page.goto('http://localhost:5173' + t.url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));
    const filePath = path.join(dir, t.name);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log('Saved screenshot:', t.name);
  }

  // Also capture product detail page
  await page.goto('http://localhost:5173/shop', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));
  const productHref = await page.evaluate(() => {
    const link = document.querySelector('a[href^="/product/"]');
    return link ? link.getAttribute('href') : null;
  });

  if (productHref) {
    await page.setViewport({ width: 360, height: 800 });
    await page.goto('http://localhost:5173' + productHref, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(dir, 'product-360x800.png'), fullPage: false });
    console.log('Saved screenshot: product-360x800.png');
  }

  await browser.close();
}

capture().catch(console.error);
