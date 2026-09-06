import puppeteer from 'puppeteer';
import path from 'path';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="file"]');

  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(path.resolve('scratch/test_models/Spiderman_urban.3mf'));

  await new Promise(r => setTimeout(r, 3000));

  const result = await page.evaluate(async () => {
    const fileEl = document.querySelector('input[type="file"]');
    if (!fileEl || !fileEl.files[0]) return { error: 'No file' };
    const ab = await fileEl.files[0].arrayBuffer();

    const { ThreeMFLoader } = await import('/node_modules/three/examples/jsm/loaders/3MFLoader.js');
    const loader = new ThreeMFLoader();
    const group = loader.parse(ab);

    const meshes = [];
    group.traverse(child => {
      if (child.isMesh) {
        meshes.push({
          name: child.name,
          vertexCount: child.geometry.attributes.position.count,
          hasIndex: !!child.geometry.index,
          indexCount: child.geometry.index ? child.geometry.index.count : null,
          hasColor: child.geometry.hasAttribute('color'),
          materialType: child.material.type,
          materialColor: child.material.color?.getHexString(),
        });
      }
    });

    return {
      childrenCount: group.children.length,
      meshes,
    };
  });

  console.log('BROWSER THREE_MF_LOADER RESULT:', JSON.stringify(result, null, 2));

  await browser.close();
}

run();
