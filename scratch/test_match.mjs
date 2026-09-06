import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/shilp-studio', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="file"]');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(path.resolve('scratch/test_models/Spiderman_urban.3mf'));
  await new Promise(r => setTimeout(r, 3000));

  const check = await page.evaluate(async () => {
    const fileEl = document.querySelector('input[type="file"]');
    const ab = await fileEl.files[0].arrayBuffer();
    const { ThreeMFLoader } = await import('/node_modules/three/examples/jsm/loaders/3MFLoader.js');
    const { unzipSync } = await import('/node_modules/three/examples/jsm/libs/fflate.module.js');
    const unzipped = unzipSync(new Uint8Array(ab));
    const objText = new TextDecoder().decode(unzipped['3D/Objects/object_1.model']);

    const loader = new ThreeMFLoader();
    const group = loader.parse(ab);
    let mesh = null;
    group.traverse(c => { if (c.isMesh) mesh = c; });

    // Let's get the first 5 triangles from XML
    const triRegex = /<triangle\s+[^>]*v1="(\d+)"[^>]*v2="(\d+)"[^>]*v3="(\d+)"/g;
    const xmlTris = [];
    let m;
    while ((m = triRegex.exec(objText)) !== null && xmlTris.length < 5) {
      xmlTris.push([parseInt(m[1]), parseInt(m[2]), parseInt(m[3])]);
    }

    const loaderTris = [];
    const idx = mesh.geometry.index.array;
    for (let i = 0; i < 5; i++) {
      loaderTris.push([idx[i*3], idx[i*3+1], idx[i*3+2]]);
    }

    return { xmlTris, loaderTris };
  });

  console.log('TRIANGLE MATCH CHECK:\n', JSON.stringify(check, null, 2));
  await browser.close();
})();
