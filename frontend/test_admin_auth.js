import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("Navigating to admin...");
  await page.goto('http://localhost:5174/admin', { waitUntil: 'networkidle0' });
  
  console.log("Current URL:", page.url());
  const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
  console.log("Body snippet:", bodyHTML);
  
  await browser.close();
})();
