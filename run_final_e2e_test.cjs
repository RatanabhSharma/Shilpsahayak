const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('=== Starting Full Customer Workflow Browser Test ===');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  const interceptedResponses = [];
  page.on('response', async (res) => {
    if (res.url().includes(':8000/api/slice/jobs')) {
      try {
        const body = await res.json();
        interceptedResponses.push({ url: res.url(), status: res.status(), body });
      } catch (e) {}
    }
  });

  // -------------------------------------------------------------
  // PART 1: Unscaled Stitchxpikachu.3mf -> Instant Estimate
  // -------------------------------------------------------------
  console.log('\n>>> PART 1: Testing unscaled Stitchxpikachu.3mf');
  await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'networkidle2' });

  const input = await page.$('input[type="file"]');
  const file = path.resolve('slicer-service/app/storage/db431ce4-a949-46aa-a4e6-f21461f7c124_Stitchxpikachu.3mf');
  console.log('Uploading 3MF:', file);
  await input.uploadFile(file);

  // Wait 2s for parse to complete and configure tab to show
  await new Promise((r) => setTimeout(r, 2000));

  // Find and click "Calculate Slicer Estimate"
  console.log('Clicking "Calculate Slicer Estimate"...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) =>
      b.innerText.toLowerCase().includes('calculate slicer estimate')
    );
    if (btn) btn.click();
  });

  // Wait for Estimate tab to render results
  console.log('Waiting for estimate tab calculation...');
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        text.includes('Your Print Estimate') ||
        text.includes('Unable to Calculate Automated Estimate')
      );
    },
    { timeout: 45000 }
  );

  const textPart1 = await page.evaluate(() => document.body.innerText);
  const hasPreSlicedError1 = textPart1.includes('Pre-sliced 3MF project detected');
  const hasSuccess1 = textPart1.includes('Your Print Estimate');
  const hasLivePricingBadge1 = textPart1.includes('Live Admin Pricing');

  console.log('Part 1 - Has "Pre-sliced 3MF error":', hasPreSlicedError1);
  console.log('Part 1 - Has "Your Print Estimate":', hasSuccess1);
  console.log('Part 1 - Has "Live Admin Pricing badge":', hasLivePricingBadge1);

  const completedJob1 = interceptedResponses.find(
    (r) => r.body && r.body.status === 'completed'
  );
  if (completedJob1) {
    console.log(
      'Part 1 - Backend Classification:',
      completedJob1.body.result?.model_intelligence?.classification
    );
    console.log(
      'Part 1 - Backend Active Envelope:',
      completedJob1.body.result?.activeEnvelope
    );
    console.log(
      'Part 1 - Backend Quote Total Price:',
      completedJob1.body.result?.quote?.totalPrice
    );
  }

  await page.screenshot({ path: 'scratch/browser_unscaled_success.png' });
  console.log('Saved screenshot: scratch/browser_unscaled_success.png');

  if (hasPreSlicedError1) {
    throw new Error('FAILED: Pre-sliced 3MF error appeared in UI!');
  }
  if (!hasSuccess1) {
    throw new Error('FAILED: Your Print Estimate heading did not appear!');
  }

  // -------------------------------------------------------------
  // PART 2: Scaled 1.4x / 150% (exceeding Z=200mm)
  // -------------------------------------------------------------
  console.log('\n>>> PART 2: Testing scaled model exceeding Z=200mm');
  // Click "Edit configuration" or tab "02 Configure"
  console.log('Navigating back to Configure tab...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const btn = buttons.find((b) => b.innerText.includes('Edit configuration') || b.innerText.includes('Configure'));
    if (btn) btn.click();
  });

  await new Promise((r) => setTimeout(r, 1500));

  // Switch to Custom size mode
  console.log('Switching to Custom size mode...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const customBtn = buttons.find((b) => b.innerText.trim() === 'Custom');
    if (customBtn) customBtn.click();
  });

  await new Promise((r) => setTimeout(r, 800));

  // Click 150% preset
  console.log('Clicking 150% preset button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const p150 = buttons.find((b) => b.innerText.trim() === '150%');
    if (p150) p150.click();
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Check configure tab warning
  const configureText = await page.evaluate(() => document.body.innerText);
  const configureShowsExceeds =
    configureText.includes('Exceeds Maximum Build Envelope') ||
    configureText.includes('exceed');
  console.log('Configure tab displays exceeds build envelope warning:', configureShowsExceeds);

  // Click "Calculate Slicer Estimate"
  console.log('Clicking "Calculate Slicer Estimate" for oversized model...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) =>
      b.innerText.toLowerCase().includes('calculate slicer estimate')
    );
    if (btn) btn.click();
  });

  // Wait for Estimate tab failure banner
  console.log('Waiting for Estimate tab to show failure banner...');
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        text.includes('Unable to Calculate Automated Estimate') &&
        (text.includes('exceeds the active printer build envelope') ||
          text.includes('200 mm'))
      );
    },
    { timeout: 45000 }
  );

  const textPart2 = await page.evaluate(() => document.body.innerText);
  const hasRejectionHeader = textPart2.includes(
    'Unable to Calculate Automated Estimate'
  );
  const hasEnvelopeErrorText =
    textPart2.includes('exceeds the active printer build envelope') ||
    textPart2.includes('200 mm');

  console.log('Part 2 - Rejection header displayed:', hasRejectionHeader);
  console.log('Part 2 - Specific active envelope error message:', hasEnvelopeErrorText);

  await page.screenshot({ path: 'scratch/browser_scaled_exceeds.png' });
  console.log('Saved screenshot: scratch/browser_scaled_exceeds.png');

  if (!hasRejectionHeader || !hasEnvelopeErrorText) {
    throw new Error(
      'FAILED: Oversized model did not show active envelope rejection message!'
    );
  }

  console.log('\n======================================================');
  console.log('ALL WORKFLOW BROWSER TESTS PASSED!');
  console.log('======================================================');

  await browser.close();
  process.exit(0);
})().catch((err) => {
  console.error('Fatal error during browser test:', err);
  process.exit(1);
});
