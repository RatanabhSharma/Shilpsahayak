const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('=== Starting Spiderman 3MF End-to-End Test ===');
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
  // PART 1: Upload Spiderman_urban.3mf and verify dimensions
  // -------------------------------------------------------------
  console.log('\n>>> PART 1: Uploading Spiderman_urban.3mf');
  await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'networkidle2' });

  const input = await page.$('input[type="file"]');
  const file = path.resolve('scratch/test_models/Spiderman_urban.3mf');
  console.log('Uploading 3MF:', file);
  await input.uploadFile(file);

  // Wait 3s for parse to complete and configure tab to show
  await new Promise((r) => setTimeout(r, 3000));

  // Extract displayed dimensions
  const dims100 = await page.evaluate(() => {
    const body = document.body.innerText;
    const xMatch = body.match(/Length\s*\(X\)[^0-9]*([0-9.]+)\s*mm/i);
    const yMatch = body.match(/Width\s*\(Y\)[^0-9]*([0-9.]+)\s*mm/i);
    const zMatch = body.match(/Height\s*\(Z\)[^0-9]*([0-9.]+)\s*mm/i);
    const fits = body.includes('Fits Workshop Printer');
    const exceeds = body.includes('Exceeds') || body.includes('exceed');
    return {
      x: xMatch ? xMatch[1] : null,
      y: yMatch ? yMatch[1] : null,
      z: zMatch ? zMatch[1] : null,
      fits,
      exceeds,
    };
  });

  console.log('\n--- 100% Scale UI Dimensions ---');
  console.log(dims100);
  await page.screenshot({ path: 'scratch/spiderman_100_configure.png' });
  console.log('Saved screenshot: scratch/spiderman_100_configure.png');

  // -------------------------------------------------------------
  // PART 2: Switch to Custom, set 200% scale -> Verify Exceeds warning
  // -------------------------------------------------------------
  console.log('\n>>> PART 2: Testing 200% scale dimensions');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const customBtn = buttons.find((b) => b.innerText.trim() === 'Custom');
    if (customBtn) customBtn.click();
  });

  await new Promise((r) => setTimeout(r, 800));

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const p200 = buttons.find((b) => b.innerText.trim() === '200%');
    if (p200) {
      p200.click();
    } else {
      const scaleInput = document.querySelector('input[type="number"][min]');
      if (scaleInput) {
        scaleInput.value = '200';
        scaleInput.dispatchEvent(new Event('input', { bubbles: true }));
        scaleInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  await new Promise((r) => setTimeout(r, 1000));

  const dims200 = await page.evaluate(() => {
    const body = document.body.innerText;
    const xMatch = body.match(/Length\s*\(X\)[^0-9]*([0-9.]+)\s*mm/i);
    const yMatch = body.match(/Width\s*\(Y\)[^0-9]*([0-9.]+)\s*mm/i);
    const zMatch = body.match(/Height\s*\(Z\)[^0-9]*([0-9.]+)\s*mm/i);
    const fits = body.includes('Fits Workshop Printer');
    const exceeds = body.includes('Exceeds') || body.includes('exceed');
    return {
      x: xMatch ? xMatch[1] : null,
      y: yMatch ? yMatch[1] : null,
      z: zMatch ? zMatch[1] : null,
      fits,
      exceeds,
    };
  });

  console.log('\n--- 200% Scale UI Dimensions ---');
  console.log(dims200);
  await page.screenshot({ path: 'scratch/spiderman_200_exceeds.png' });
  console.log('Saved screenshot: scratch/spiderman_200_exceeds.png');

  // -------------------------------------------------------------
  // PART 3: Reset back to Original (100%) and Calculate Estimate
  // -------------------------------------------------------------
  console.log('\n>>> PART 3: Resetting to Original size and Slicing...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const origBtn = buttons.find((b) => b.innerText.trim() === 'Original');
    if (origBtn) origBtn.click();
  });

  await new Promise((r) => setTimeout(r, 1000));

  console.log('Clicking "Calculate Slicer Estimate"...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) =>
      b.innerText.toLowerCase().includes('calculate slicer estimate')
    );
    if (btn) btn.click();
  });

  console.log('Waiting for estimate tab calculation...');
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        text.includes('Your Print Estimate') ||
        text.includes('Unable to Calculate Automated Estimate')
      );
    },
    { timeout: 60000 }
  );

  const textPart3 = await page.evaluate(() => document.body.innerText);
  const hasSuccess3 = textPart3.includes('Your Print Estimate');
  const hasPreSlicedError3 = textPart3.includes('Pre-sliced 3MF project detected');
  const priceMatch3 = textPart3.match(/₹\s*([0-9,]+(?:\.[0-9]{2})?)/);

  console.log('\n--- Estimate Tab Results ---');
  console.log('Has "Your Print Estimate":', hasSuccess3);
  console.log('Has "Pre-sliced error":', hasPreSlicedError3);
  console.log('Price quote displayed:', priceMatch3 ? priceMatch3[0] : 'None');

  const completedJob = interceptedResponses.find(
    (r) => r.body && r.body.status === 'completed'
  );
  if (completedJob) {
    console.log(
      'Backend Classification:',
      completedJob.body.result?.model_intelligence?.classification
    );
    console.log(
      'Backend Active Envelope:',
      completedJob.body.result?.activeEnvelope
    );
    console.log(
      'Backend Dimensions:',
      completedJob.body.result?.dimensions
    );
    console.log(
      'Backend Quote Total Price:',
      completedJob.body.result?.quote?.totalPrice
    );
  }

  await page.screenshot({ path: 'scratch/spiderman_estimate_success.png' });
  console.log('Saved screenshot: scratch/spiderman_estimate_success.png');

  await browser.close();
  console.log('\n=== Test Completed Successfully! ===');
})().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

