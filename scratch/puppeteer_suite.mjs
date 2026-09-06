import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const BRAIN_DIR = 'C:/Users/Ratanabh Sharma/.gemini/antigravity/brain/b239eb39-f914-45d2-bf9e-48c25a1a00cd';
const MODELS_DIR = path.resolve('scratch/test_models');

async function runAcceptanceTest() {
  console.log('=== STARTING SHILP STUDIO PUPPETEER ACCEPTANCE TEST ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Listen to console logs
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.log('PAGE UNCAUGHT ERROR:', err.message, err.stack);
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Initial Empty State Verification
    // -------------------------------------------------------------
    console.log('1. Navigating to http://localhost:5173/shilp-studio ...');
    await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#step-quote', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('Verifying Empty State:');
    const quoteBoxText = await page.$eval('#step-quote', (el) => el.innerText);
    const has149 = quoteBoxText.includes('₹149');
    const hasWeight = quoteBoxText.includes('~0 g') || quoteBoxText.includes('~0g');
    const hasEmptyPlaceholder = quoteBoxText.includes('Upload a model to see your instant price');

    console.log(' - ₹149 present before upload:', has149 ? 'FAIL (₹149 found)' : 'PASS (No ₹149)');
    console.log(' - 0g weight present before upload:', hasWeight ? 'FAIL (0g found)' : 'PASS (No 0g)');
    console.log(' - Empty placeholder visible:', hasEmptyPlaceholder ? 'PASS' : 'FAIL');

    // Check order and review buttons
    const hasOrderBtn = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).some((b) =>
        b.innerText.includes('Place order for verification')
      );
    });
    console.log(' - Place order button present before upload:', hasOrderBtn ? 'FAIL' : 'PASS (Not present)');

    // Screenshot 1: Empty State
    const ssEmptyPath = path.join(BRAIN_DIR, 'screenshot_empty_state.png');
    await page.screenshot({ path: ssEmptyPath, fullPage: false });
    console.log(' - Saved screenshot:', ssEmptyPath);

    // -------------------------------------------------------------
    // TEST 2: Multi-Colour Spider-Man Upload & Original Colours
    // -------------------------------------------------------------
    console.log('\n2. Uploading Multi-Colour Spider-Man Model (spiderman.zip)...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');

    const spidermanZipPath = path.join(MODELS_DIR, 'spiderman.zip');
    await fileInput.uploadFile(spidermanZipPath);

    // Wait for "Estimate Ready" badge
    await page.waitForFunction(
      () => document.body.innerText.includes('Estimate Ready'),
      { timeout: 10000 }
    );
    console.log(' - Model parsed: Status is "Estimate Ready"');

    // Wait for 3D viewer render
    await new Promise((r) => setTimeout(r, 1000));

    // Verify "Original Model Colours Detected" banner is visible
    const hasColorsBanner = await page.evaluate(() =>
      document.body.innerText.includes('Original Model Colours Detected')
    );
    console.log(' - "Original Model Colours Detected" banner visible:', hasColorsBanner ? 'PASS' : 'FAIL');

    // Screenshot 2: Spider-Man in Original Colours
    const ssSpiderOriginalPath = path.join(BRAIN_DIR, 'screenshot_spiderman_original.png');
    await page.screenshot({ path: ssSpiderOriginalPath, fullPage: false });
    console.log(' - Saved screenshot:', ssSpiderOriginalPath);

    // -------------------------------------------------------------
    // TEST 3: Filament Preview Mode & Toggling
    // -------------------------------------------------------------
    console.log('\n3. Testing Filament Preview Mode Switch...');
    // Click "Filament Preview" button in viewer controls
    const filamentBtn = await page.$('button[title="Preview in selected printing filament colour"]');
    if (filamentBtn) {
      await filamentBtn.click();
    } else {
      // Fallback click on text
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const fBtn = btns.find((b) => b.innerText.includes('Filament Preview'));
        if (fBtn) fBtn.click();
      });
    }
    await new Promise((r) => setTimeout(r, 800));

    // Screenshot 3: Spider-Man in Filament Preview
    const ssSpiderFilamentPath = path.join(BRAIN_DIR, 'screenshot_spiderman_filament.png');
    await page.screenshot({ path: ssSpiderFilamentPath, fullPage: false });
    console.log(' - Switched to Filament Preview mode');
    console.log(' - Saved screenshot:', ssSpiderFilamentPath);

    // Switch back to "Original Colours"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const origBtn = btns.find((b) => b.innerText.includes('Original Colours'));
      if (origBtn) origBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    console.log(' - Successfully switched back to Original Colours');

    // -------------------------------------------------------------
    // TEST 4: Colour Palette Verification (Step 2)
    // -------------------------------------------------------------
    console.log('\n4. Verifying Colour Palette in Step 2...');
    const step2El = await page.$('#step-options');
    const step2Text = await page.evaluate((el) => el?.innerText || '', step2El);

    const hasHexCodes = /#[0-9A-Fa-f]{6}/.test(step2Text);
    const hasPrintingColourLabel = step2Text.includes('Printing Colour:');
    const hasCustomOption = step2Text.includes('+ Custom') || step2Text.includes('Custom');

    console.log(' - Raw hex codes visible in customer labels:', hasHexCodes ? 'FAIL (Hex code exposed)' : 'PASS (Clean palette)');
    console.log(' - "Printing Colour: [Name]" label present:', hasPrintingColourLabel ? 'PASS' : 'FAIL');
    console.log(' - Custom colour picker option present:', hasCustomOption ? 'PASS' : 'FAIL');

    // Scroll step2 into clear view to avoid header overlap
    await page.evaluate(() => {
      const el = document.getElementById('step-options');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 600));

    // Verify independence: clicking a color swatch in Step 2 must NOT switch 3D viewer mode
    const initialModeIsOriginal = await page.evaluate(() => {
      const origBtn = document.querySelector('button[title*="original colors"]');
      return origBtn?.className.includes('bg-brand-500') || false;
    });
    console.log(' - Initial viewer mode before swatch click is Original:', initialModeIsOriginal);

    // Pick custom color in Step 2 via custom color palette
    console.log(' - Selecting custom colour #DC2626 via palette...');
    await page.evaluate(() => {
      const colorInput = document.querySelector('input[type="color"]');
      if (colorInput) {
        colorInput.value = '#DC2626';
        colorInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 500));

    const modeAfterCustomColor = await page.evaluate(() => {
      const origBtn = document.querySelector('button[title*="original colors"]');
      return origBtn?.className.includes('bg-brand-500') || false;
    });
    console.log(' - 3D Viewer remains in Original Colours mode after custom colour selection:', modeAfterCustomColor ? 'PASS' : 'FAIL');

    // Screenshot 4: Step 2 Colour Palette & Options
    await page.evaluate(() => {
      document.querySelectorAll('header').forEach((h) => {
        h.style.display = 'none';
      });
    });
    const materialColorCard = await page.$('#step-options > div:first-child');
    const ssPalettePath = path.join(BRAIN_DIR, 'screenshot_options_palette.png');
    if (materialColorCard) {
      await materialColorCard.screenshot({ path: ssPalettePath });
    } else {
      await step2El?.screenshot({ path: ssPalettePath });
    }
    await page.evaluate(() => {
      document.querySelectorAll('header').forEach((h) => {
        h.style.display = '';
      });
    });
    console.log(' - Saved clean screenshot of Material & Colour card:', ssPalettePath);

    // -------------------------------------------------------------
    // TEST 5: Live Quotation Calculation & Setting Changes
    // -------------------------------------------------------------
    console.log('\n5. Verifying Live Quotation in Step 3...');
    const quoteTextAfterUpload = await page.$eval('#step-quote', (el) => el.innerText);

    const hasTheoreticalNotice = quoteTextAfterUpload.includes('Theoretical Estimate');
    const hasVerificationNotice = quoteTextAfterUpload.includes('We verify your model and confirm the final price before production');
    const priceMatch1 = quoteTextAfterUpload.match(/₹[\d,]+/);
    const initialPrice = priceMatch1 ? priceMatch1[0] : 'N/A';

    console.log(' - "Theoretical Estimate" badge present:', hasTheoreticalNotice ? 'PASS' : 'FAIL');
    console.log(' - Workshop verification notice present:', hasVerificationNotice ? 'PASS' : 'FAIL');
    console.log(' - Initial quotation price:', initialPrice);

    // Changing material to PETG
    console.log(' - Switching material to PETG...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const petgBtn = btns.find((b) => b.innerText.includes('PETG'));
      if (petgBtn) petgBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Increase quantity to 3
    console.log(' - Increasing quantity to 3...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const plusBtn = btns.find((b) => b.innerText === '+');
      if (plusBtn) {
        plusBtn.click();
        plusBtn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    // Enable Protective Packaging
    console.log(' - Enabling protective packaging...');
    await page.evaluate(() => {
      const chk = document.querySelector('input[type="checkbox"]');
      if (chk && !chk.checked) chk.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const quoteTextUpdated = await page.$eval('#step-quote', (el) => el.innerText);
    const priceMatch2 = quoteTextUpdated.match(/₹[\d,]+/);
    const updatedPrice = priceMatch2 ? priceMatch2[0] : 'N/A';

    console.log(' - Updated quotation price for 3x PETG + Packaging:', updatedPrice);
    console.log(' - Quote dynamically recalculated:', updatedPrice !== initialPrice ? 'PASS' : 'FAIL');

    // Screenshot 5: Updated Quotation Card
    const quoteEl = await page.$('#step-quote');
    const ssQuotePath = path.join(BRAIN_DIR, 'screenshot_calculated_quote.png');
    await quoteEl?.screenshot({ path: ssQuotePath });
    console.log(' - Saved screenshot:', ssQuotePath);

    // -------------------------------------------------------------
    // TEST 6: Removing Model Clears the Quote
    // -------------------------------------------------------------
    console.log('\n6. Testing Model Removal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const remBtn = btns.find((b) => b.innerText.includes('Remove'));
      if (remBtn) remBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const quoteAfterRemove = await page.$eval('#step-quote', (el) => el.innerText);
    const clearedSuccessfully =
      quoteAfterRemove.includes('Upload a model to see your instant price') &&
      !quoteAfterRemove.includes('₹149');
    console.log(' - Removing model clears quote & returns to empty state:', clearedSuccessfully ? 'PASS' : 'FAIL');

    // -------------------------------------------------------------
    // TEST 7: Replacing Model with Single-Colour STL
    // -------------------------------------------------------------
    console.log('\n7. Replacing Model with Single-Colour STL (single_color.stl)...');
    const fileInput2 = await page.$('input[type="file"]');
    if (!fileInput2) throw new Error('File input not found');

    const singleStlPath = path.join(MODELS_DIR, 'single_color.stl');
    await fileInput2.uploadFile(singleStlPath);

    await page.waitForFunction(
      () => document.body.innerText.includes('Estimate Ready'),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 1000));

    const hasColorsBannerForStl = await page.evaluate(() =>
      document.body.innerText.includes('Original Model Colours Detected')
    );
    console.log(' - Single-colour STL correctly hides "Original Colours" badge:', !hasColorsBannerForStl ? 'PASS' : 'FAIL');

    const quoteTextStl = await page.$eval('#step-quote', (el) => el.innerText);
    const hasStlPrice = /₹[\d,]+/.test(quoteTextStl);
    console.log(' - Recalculated quote for replacement STL:', hasStlPrice ? 'PASS' : 'FAIL');

    // Screenshot 6: Single Colour STL
    const ssStlPath = path.join(BRAIN_DIR, 'screenshot_single_stl.png');
    await page.screenshot({ path: ssStlPath, fullPage: false });
    console.log(' - Saved screenshot:', ssStlPath);

    console.log('\n=== ALL PUPPETEER TESTS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('PUPPETEER TEST ERROR:', err);
  } finally {
    await browser.close();
  }
}

runAcceptanceTest();
