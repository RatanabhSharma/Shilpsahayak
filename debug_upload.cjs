const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'networkidle2' });
  const input = await page.$('input[type="file"]');
  const file = path.resolve('slicer-service/app/storage/db431ce4-a949-46aa-a4e6-f21461f7c124_Stitchxpikachu.3mf');
  console.log('Found input, uploading:', file);
  await input.uploadFile(file);

  for (let i = 1; i <= 8; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const info = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h1, h2, h3, p')).map(e => e.innerText);
      return {
        url: window.location.href,
        headings: h.slice(0, 10),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim())
      };
    });
    console.log(`[Second ${i}]`, info.headings);
    if (info.headings.some(text => text.includes('Configure') || text.includes('Dimensions'))) {
      console.log('Reached Configure Tab! Buttons:', info.buttons);
      break;
    }
  }

  await page.screenshot({ path: 'scratch/upload_step.png' });
  await browser.close();
})();
