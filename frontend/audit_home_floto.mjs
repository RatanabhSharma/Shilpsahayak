import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // listen to console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  const viewports = [
    { width: 360, height: 800, name: '360x800' },
    { width: 390, height: 844, name: '390x844' },
    { width: 768, height: 1024, name: '768x1024' },
    { width: 1280, height: 800, name: '1280x800' }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));
    
    // Check H1
    const h1 = await page.evaluate(() => {
      const el = document.querySelector('h1');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        text: el.innerText.trim(),
        visible: rect.width > 0 && rect.height > 0,
        fontSize: window.getComputedStyle(el).fontSize,
        top: Math.round(rect.top)
      };
    });

    // Check Hero CTA
    const ctas = await page.evaluate(() => {
      const hero = document.querySelector('section');
      if (!hero) return null;
      const links = Array.from(hero.querySelectorAll('a'));
      return links.map(l => {
        const rect = l.getBoundingClientRect();
        return {
          text: l.innerText.trim(),
          href: l.getAttribute('href'),
          rect: { top: Math.round(rect.top), height: Math.round(rect.height), width: Math.round(rect.width) }
        };
      });
    });

    // Check buttons with height < 36px
    const smallButtons = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button'));
      const found = [];
      for (const b of allBtns) {
        const rect = b.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36)) {
          found.push({
            text: (b.innerText || b.getAttribute('aria-label') || '').slice(0, 30).trim(),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            cls: b.className.slice(0, 40)
          });
        }
      }
      return found;
    });

    // Check typography sizes (< 12px)
    const smallTexts = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, a, button'));
      const samples = [];
      for (const el of allElements) {
        if (el.children.length === 0 && el.innerText && el.innerText.trim().length > 0) {
          const fs = parseFloat(window.getComputedStyle(el).fontSize);
          if (fs < 11) {
            samples.push({
              text: el.innerText.trim().slice(0, 35),
              fontSize: fs,
              tag: el.tagName
            });
          }
        }
      }
      return samples.slice(0, 10);
    });

    console.log(`\n=== Viewport: ${vp.name} ===`);
    console.log('H1:', h1);
    console.log('Hero CTAs:', ctas);
    console.log('Small buttons (<36px):', smallButtons);
    console.log('Very small text (<11px):', smallTexts);
  }

  await browser.close();
}

run().catch(err => { console.error(err); process.exit(1); });

