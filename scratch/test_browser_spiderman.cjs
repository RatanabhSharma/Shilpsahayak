const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('Launching browser test for Spiderman_urban.3mf...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('3MF') || text.includes('dimensions') || text.includes('Slicing') || text.includes('bambu')) {
        console.log('[Browser Console]', text);
      }
    });

    console.log('Navigating to http://localhost:5173/shilp-studio...');
    await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('Locating file input...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');

    const filePath = path.resolve('scratch/test_models/Spiderman_urban.3mf');
    console.log('Uploading:', filePath);
    await fileInput.uploadFile(filePath);

    // Wait for Tab 2 (Configure)
    console.log('Waiting for Configure tab...');
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('Configure Your Print') || text.includes('Uniform Scale') || text.includes('Dimensions');
    }, { timeout: 30000 });

    await new Promise(r => setTimeout(r, 2000));

    // Extract displayed dimensions
    const getUiDimensions = async () => {
      return await page.evaluate(() => {
        const body = document.body.innerText;
        const xMatch = body.match(/Length\s*\(X\)[^0-9]*([0-9.]+)\s*mm/i);
        const yMatch = body.match(/Width\s*\(Y\)[^0-9]*([0-9.]+)\s*mm/i);
        const zMatch = body.match(/Height\s*\(Z\)[^0-9]*([0-9.]+)\s*mm/i);
        const fitsMatch = body.includes('Fits Workshop Printer');
        const exceedsMatch = body.includes('Exceeds') || body.includes('exceed');
        return {
          x: xMatch ? xMatch[1] : null,
          y: yMatch ? yMatch[1] : null,
          z: zMatch ? zMatch[1] : null,
          fits: fitsMatch,
          exceeds: exceedsMatch
        };
      });
    };

    const dims100 = await getUiDimensions();
    console.log('\n--- 100% Scale UI Dimensions ---');
    console.log(dims100);

    const shot1 = path.resolve('.tempmediaStorage/media_spiderman_100.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('Saved 100% screenshot to:', shot1);

    // Change scale to 200%
    console.log('\nSetting scale to 200%...');
    const scaleInput = await page.$('input[type="number"][min]');
    if (scaleInput) {
      await scaleInput.click({ clickCount: 3 });
      await scaleInput.type('200');
      await new Promise(r => setTimeout(r, 1000));
    }

    const dims200 = await getUiDimensions();
    console.log('\n--- 200% Scale UI Dimensions ---');
    console.log(dims200);

    const shot2 = path.resolve('.tempmediaStorage/media_spiderman_200.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('Saved 200% screenshot to:', shot2);

    // Set scale back to 100%
    console.log('\nSetting scale back to 100%...');
    if (scaleInput) {
      await scaleInput.click({ clickCount: 3 });
      await scaleInput.type('100');
      await new Promise(r => setTimeout(r, 1000));
    }

    // Click Calculate Estimate
    console.log('\nClicking Calculate Estimate...');
    const estimateBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.innerText.includes('Calculate Estimate') || b.innerText.includes('Estimate'));
    });

    if (estimateBtn) {
      await estimateBtn.click();
    }

    console.log('Waiting for Estimate tab result...');
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('₹') || text.includes('Estimated Price') || text.includes('exceed') || text.includes('Error');
    }, { timeout: 60000 });

    await new Promise(r => setTimeout(r, 3000));

    const estimateResult = await page.evaluate(() => {
      const body = document.body.innerText;
      const priceMatch = body.match(/₹\s*([0-9,]+(?:\.[0-9]{2})?)/);
      const isFailed = body.includes('Pre-sliced') || body.includes('exceed') || body.includes('Error');
      return {
        price: priceMatch ? priceMatch[0] : null,
        isFailed,
        textSnippet: body.slice(0, 500)
      };
    });

    console.log('\n--- Slicing & Estimation Result ---');
    console.log('Estimate result:', estimateResult);

    const shot3 = path.resolve('.tempmediaStorage/media_spiderman_estimate.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log('Saved estimate screenshot to:', shot3);

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

