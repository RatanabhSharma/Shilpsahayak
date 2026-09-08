const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('=== Starting Complete End-to-End Browser Test ===');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const interceptedResponses = [];
  page.on('response', async res => {
    if (res.url().includes(':8000/api/slice/jobs')) {
      try {
        const body = await res.json();
        interceptedResponses.push({ url: res.url(), status: res.status(), body });
      } catch (e) {}
    }
  });

  // -------------------------------------------------------------
  // TEST 1: Unscaled Stitchxpikachu.3mf -> Instant Estimate
  // -------------------------------------------------------------
  console.log('\n>>> TEST 1: Unscaled Stitchxpikachu.3mf');
  await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'networkidle2' });

  const input = await page.$('input[type="file"]');
  const file = path.resolve('slicer-service/app/storage/db431ce4-a949-46aa-a4e6-f21461f7c124_Stitchxpikachu.3mf');
  console.log('Uploading 3MF file...');
  await input.uploadFile(file);

  // Wait 2s for parse to complete and configure tab to show
  await new Promise(r => setTimeout(r, 2000));

  // Find and click "CALCULATE SLICER ESTIMATE"
  console.log('Clicking "CALCULATE SLICER ESTIMATE"...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('CALCULATE SLICER ESTIMATE') || b.innerText.includes('Calculate Slicer Estimate'));
    if (btn) btn.click();
  });

  // Wait for Estimate tab to render results
  console.log('Waiting for estimate tab calculation...');
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('Your Print Estimate') || text.includes('Unable to Calculate Automated Estimate');
  }, { timeout: 45000 });

  const textTest1 = await page.evaluate(() => document.body.innerText);
  const hasPreSlicedError1 = textTest1.includes('Pre-sliced 3MF project detected');
  const hasSuccess1 = textTest1.includes('Your Print Estimate');
  const hasLivePricingBadge = textTest1.includes('Live Admin Pricing');

  console.log('Test 1 - Has "Pre-sliced 3MF error":', hasPreSlicedError1);
  console.log('Test 1 - Has "Your Print Estimate":', hasSuccess1);
  console.log('Test 1 - Has "Live Admin Pricing":', hasLivePricingBadge);

  const completedJob1 = interceptedResponses.find(r => r.body && r.body.status === 'completed');
  if (completedJob1) {
    console.log('Test 1 - API Classification:', completedJob1.body.result?.model_intelligence?.classification);
    console.log('Test 1 - API Active Envelope:', completedJob1.body.result?.activeEnvelope);
    console.log('Test 1 - API Statistics:', completedJob1.body.result?.statistics);
    console.log('Test 1 - API Quote Total:', completedJob1.body.result?.quote?.totalPrice);
  }

  await page.screenshot({ path: 'scratch/browser_unscaled_success.png' });
  console.log('Screenshot saved: scratch/browser_unscaled_success.png');

  if (hasPreSlicedError1) {
    throw new Error('FAILED: Pre-sliced 3MF error appeared in UI!');
  }
  if (!hasSuccess1) {
    throw new Error('FAILED: Your Print Estimate heading did not appear!');
  }

  // -------------------------------------------------------------
  // TEST 2: Scaled Stitchxpikachu.3mf (150% preset: Z = 240.2 mm > 200 mm)
  // -------------------------------------------------------------
  console.log('\n>>> TEST 2: Scaled Stitchxpikachu.3mf to 150% (exceeding Z=200mm)');
  // Click "Back to Configure"
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Back to Configure') || b.innerText.includes('Configure'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  // Select "Custom" size mode then click "150%" preset scale
  console.log('Selecting Custom mode and 150% scale preset...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const customBtn = buttons.find(b => b.innerText.trim() === 'Custom');
    if (customBtn) customBtn.click();
  });

  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const p150 = buttons.find(b => b.innerText.trim() === '150%');
    if (p150) p150.click();
  });

  await new Promise(r => setTimeout(r, 800));

  const configureText = await page.evaluate(() => document.body.innerText);
  const configureShowsExceeds = configureText.includes('Exceeds') || configureText.includes('exceed');
  console.log('Configure tab displays exceeds build envelope warning:', configureShowsExceeds);

  // Click "Calculate Slicer Estimate" for the scaled model
  console.log('Clicking "Calculate Slicer Estimate" for oversized model...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('Calculate Slicer Estimate') || b.innerText.includes('CALCULATE SLICER ESTIMATE'));
    if (btn) btn.click();
  });

  // Wait for Estimate tab to show failure
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('Unable to Calculate Automated Estimate') || text.includes('exceed');
  }, { timeout: 45000 });

  const textTest2 = await page.evaluate(() => document.body.innerText);
  const hasRejectionHeader = textTest2.includes('Unable to Calculate Automated Estimate');
  const hasEnvelopeErrorText = textTest2.includes('exceeds the active printer build envelope') || textTest2.includes('200 mm');

  console.log('Test 2 - Rejection header displayed:', hasRejectionHeader);
  console.log('Test 2 - Specific active envelope error message:', hasEnvelopeErrorText);

  await page.screenshot({ path: 'scratch/browser_scaled_exceeds.png' });
  console.log('Screenshot saved: scratch/browser_scaled_exceeds.png');

  if (!hasRejectionHeader || !hasEnvelopeErrorText) {
    throw new Error('FAILED: Oversized model did not show active envelope rejection message!');
  }

  console.log('\n======================================================');
  console.log('ALL BROWSER TESTS PASSED: Live customer workflow verified!');
  console.log('======================================================');

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('Fatal error during browser test:', err);
  process.exit(1);
});
