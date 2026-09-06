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

  await new Promise((r) => setTimeout(r, 4000));

  const result = await page.evaluate(async () => {
    const banner = document.body.innerText.includes('Original Model Colours Detected');
    const origBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.innerText.includes('Original Colours')
    );
    const filBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.innerText.includes('Filament Preview')
    );

    return {
      bannerVisible: banner,
      origBtnFound: !!origBtn,
      filBtnFound: !!filBtn,
    };
  });

  console.log('Initial page state before fix:', result);
  await page.screenshot({ path: 'scratch/spiderman_before_fix_page.png' });

  await browser.close();
}

run();
