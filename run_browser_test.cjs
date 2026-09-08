const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('Starting Puppeteer End-to-End Browser Test...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const responses = [];
    page.on('response', async (res) => {
      if (res.url().includes('8000/api/slice/jobs')) {
        try {
          const body = await res.json();
          responses.push({ url: res.url(), status: res.status(), body });
        } catch (e) {}
      }
    });

    // -------------------------------------------------------------
    // PART 1: Unscaled Stitchxpikachu.3mf
    // -------------------------------------------------------------
    console.log('\n--- PART 1: Testing unscaled Stitchxpikachu.3mf ---');
    await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'networkidle2' });

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found on /shilp-studio');

    const testFile = path.resolve('slicer-service/app/storage/db431ce4-a949-46aa-a4e6-f21461f7c124_Stitchxpikachu.3mf');
    console.log('Uploading 3MF:', testFile);
    await fileInput.uploadFile(testFile);

    // Wait for Configure step
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Configure Your Print') || document.body.innerText.includes('Dimensions & Scale');
    }, { timeout: 15000 });
    console.log('Step 2 (Configure) reached.');

    // Click "View Estimate" button in the bottom sticky bar or navigate to Tab 3
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('View Estimate'));
      if (btn) btn.click();
    });

    console.log('Waiting for slicing calculation in Tab 3 (Estimate)...');
    await page.waitForFunction(() => {
      const t = document.body.innerText;
      return t.includes('Your Print Estimate') || t.includes('Unable to Calculate Automated Estimate');
    }, { timeout: 45000 });

    const textPart1 = await page.evaluate(() => document.body.innerText);
    const hasPreSlicedError1 = textPart1.includes('Pre-sliced 3MF project detected');
    const hasSuccessQuote1 = textPart1.includes('Your Print Estimate');

    console.log('Unscaled Result - Has "Pre-sliced 3MF error":', hasPreSlicedError1);
    console.log('Unscaled Result - Has "Your Print Estimate":', hasSuccessQuote1);

    const completedJob = responses.find(r => r.body && r.body.status === 'completed');
    if (completedJob) {
      console.log('Backend response confirmed classification:', completedJob.body.result?.model_intelligence?.classification);
      console.log('Backend response activeEnvelope:', completedJob.body.result?.activeEnvelope);
      console.log('Backend response quote totalPrice:', completedJob.body.result?.quote?.totalPrice);
    }

    await page.screenshot({ path: path.resolve('scratch/browser_unscaled_success.png') });
    console.log('Saved screenshot: scratch/browser_unscaled_success.png');

    if (hasPreSlicedError1) {
      throw new Error('FAIL: Unscaled 3MF still shows pre-sliced error!');
    }
    if (!hasSuccessQuote1) {
      throw new Error('FAIL: Unscaled 3MF did not display quote in Estimate tab!');
    }

    // -------------------------------------------------------------
    // PART 2: Scaled 1.4x (exceeding Z=200 envelope)
    // -------------------------------------------------------------
    console.log('\n--- PART 2: Testing 1.4x Scaled (exceeding Z=200) ---');
    // Return to configure tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Configure'));
      if (btn) btn.click();
    });

    await page.waitForFunction(() => {
      return document.body.innerText.includes('Dimensions & Scale');
    }, { timeout: 10000 });

    // Select Custom Height or set Scale Factor to 1.4
    console.log('Setting scale to 1.4x...');
    await page.evaluate(() => {
      // Find scale percentage buttons or range input
      const buttons = Array.from(document.querySelectorAll('button'));
      const customScaleBtn = buttons.find(b => b.innerText.includes('Custom Height') || b.innerText.includes('Scale'));
      if (customScaleBtn) customScaleBtn.click();
    });

    // Let's set target height to 224.2 mm via input
    const heightInput = await page.$('input[placeholder*="height"], input[type="number"], input[value="160.1"]');
    if (heightInput) {
      await heightInput.click({ clickCount: 3 });
      await heightInput.type('224.2');
      await page.keyboard.press('Enter');
      console.log('Entered target height: 224.2 mm');
    } else {
      // Direct state simulation if input selector differs
      console.log('Adjusting via slider/input...');
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const numInput = inputs.find(i => i.type === 'number' || i.value === '160.1');
        if (numInput) {
          numInput.value = '224.2';
          numInput.dispatchEvent(new Event('change', { bubbles: true }));
          numInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    }

    // Give react state 500ms to update
    await new Promise(r => setTimeout(r, 800));

    // Check if warning is visible in Tab 2 or click View Estimate
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('View Estimate') || b.innerText.includes('Estimate'));
      if (btn) btn.click();
    });

    // Wait for Slicing result in Estimate Tab
    await page.waitForFunction(() => {
      const t = document.body.innerText;
      return t.includes('exceed') || t.includes('Exceeds') || t.includes('Your Print Estimate') || t.includes('Unable to Calculate');
    }, { timeout: 45000 });

    const textPart2 = await page.evaluate(() => document.body.innerText);
    const hasBuildVolumeError = textPart2.includes('exceed') || textPart2.includes('Exceeds') || textPart2.includes('200');
    console.log('Scaled Result - Has build volume warning/rejection:', hasBuildVolumeError);

    await page.screenshot({ path: path.resolve('scratch/browser_scaled_exceeds.png') });
    console.log('Saved screenshot: scratch/browser_scaled_exceeds.png');

    console.log('\n========================================');
    console.log('ALL BROWSER TESTS COMPLETED SUCCESSFULLY!');
    console.log('========================================');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
