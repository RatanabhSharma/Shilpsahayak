import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 800 });
  await page.goto('http://localhost:5173/shop', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  const cards = await page.evaluate(() => {
    const cardEls = Array.from(document.querySelectorAll('a[href^="/product/"]'));
    return cardEls.slice(0, 8).map((el, i) => {
      const rect = el.getBoundingClientRect();
      const title = el.querySelector('h3')?.innerText;
      const allBtns = Array.from(el.querySelectorAll('button')).map(b => {
        const br = b.getBoundingClientRect();
        return { text: b.innerText.trim(), h: Math.round(br.height), top: Math.round(br.top) };
      });
      const priceText = el.querySelector('.font-mono')?.innerText || 'NO_PRICE_FOUND';
      const badges = Array.from(el.querySelectorAll('.absolute span')).map(s => s.innerText.trim());
      return {
        index: i,
        title,
        cardH: Math.round(rect.height),
        top: Math.round(rect.top),
        badges,
        buttons: allBtns,
        priceText: priceText.replace(/\n/g, ' ')
      };
    });
  });

  console.log('SHOP CARDS INSPECTION:\n', JSON.stringify(cards, null, 2));
  await browser.close();
}

run().catch(console.error);
