import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 800 });
  await page.goto('http://localhost:5173/shop', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  const prices = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href^="/product/"]')).slice(0, 10).map(c => {
      const title = c.querySelector('h3')?.innerText;
      const priceContainer = c.querySelector('.mt-auto .font-mono');
      const addBtn = c.querySelector('button[title*="cart"]');
      const buyBtn = c.querySelector('button[title*="now"]');
      const addRect = addBtn?.getBoundingClientRect();
      const buyRect = buyBtn?.getBoundingClientRect();
      return {
        title,
        priceText: priceContainer ? priceContainer.innerText.replace(/\n/g, ' ') : null,
        addTop: addRect ? Math.round(addRect.top) : null,
        buyTop: buyRect ? Math.round(buyRect.top) : null,
        addH: addRect ? Math.round(addRect.height) : null,
        buyH: buyRect ? Math.round(buyRect.height) : null,
      };
    });
  });

  console.log('PRICES AND BUTTON COORDS:\n', JSON.stringify(prices, null, 2));
  await browser.close();
}

run().catch(console.error);
