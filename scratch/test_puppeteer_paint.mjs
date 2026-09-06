import puppeteer from 'puppeteer';
import path from 'path';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="file"]');

  console.log('Uploading Spiderman_urban.3mf...');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(path.resolve('scratch/test_models/Spiderman_urban.3mf'));

  await new Promise(r => setTimeout(r, 4000));

  // Check if original colors toggle exists and click it if not active
  const originalModeActive = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const origBtn = btns.find(b => b.textContent?.includes('Original Colours'));
    return origBtn ? origBtn.className : null;
  });
  console.log('Original mode button status:', originalModeActive);

  // Take screenshot
  await page.screenshot({ path: 'scratch/screenshot_test_current.png' });
  console.log('Saved scratch/screenshot_test_current.png');

  await browser.close();
}

run();
