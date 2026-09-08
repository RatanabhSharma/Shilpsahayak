const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'networkidle2' });
  const input = await page.$('input[type="file"]');
  const file = path.resolve('slicer-service/app/storage/db431ce4-a949-46aa-a4e6-f21461f7c124_Stitchxpikachu.3mf');
  await input.uploadFile(file);
  await new Promise(r => setTimeout(r, 2000));

  // Select Custom height mode and enter 224.2
  console.log('Selecting Custom height mode...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const customBtn = buttons.find(b => b.innerText.trim() === 'Custom');
    if (customBtn) customBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('Entering 224.2 into number input...');
  const numInput = await page.$('input[type="number"]');
  if (numInput) {
    await numInput.click({ clickCount: 3 });
    await numInput.type('224.2');
    await page.keyboard.press('Enter');
  }
  await new Promise(r => setTimeout(r, 800));

  // Find the exact Calculate Slicer Estimate button and click it
  console.log('Clicking Calculate Slicer Estimate button...');
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Calculate Slicer Estimate'));
    if (btn) {
      btn.click();
      return btn.innerText;
    }
    return null;
  });
  console.log('Clicked button:', clicked);

  // Wait for slicing to fail with build envelope error
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('Unable to Calculate Automated Estimate') || text.includes('exceeds the active printer build envelope');
  }, { timeout: 45000 });

  console.log('Estimate tab reached failure banner!');
  const errorText = await page.evaluate(() => document.body.innerText);

  const hasExceedsEnvelope = errorText.includes('exceeds the active printer build envelope') || errorText.includes('200 mm');
  console.log('Contains active envelope error:', hasExceedsEnvelope);

  await page.screenshot({ path: path.resolve('scratch/browser_scaled_exceeds.png') });
  console.log('Saved screenshot to scratch/browser_scaled_exceeds.png');
  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
