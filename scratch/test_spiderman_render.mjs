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

  console.log('Uploading Spiderman_urban.3mf...');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(path.resolve('scratch/test_models/Spiderman_urban.3mf'));

  await new Promise(r => setTimeout(r, 4000));

  // Now evaluate custom paint decoding on the loaded model and replace geometry in the scene!
  const renderResult = await page.evaluate(async () => {
    const fileEl = document.querySelector('input[type="file"]');
    if (!fileEl || !fileEl.files[0]) return { error: 'No file' };
    const ab = await fileEl.files[0].arrayBuffer();

    const { unzipSync } = await import('/node_modules/three/examples/jsm/libs/fflate.module.js');
    const THREE = await import('/node_modules/three/build/three.module.js');

    const unzipped = unzipSync(new Uint8Array(ab));
    let filamentColors = ['#FFFFFF', '#000000', '#DE4343'];
    if (unzipped['Metadata/project_settings.config']) {
      const proj = JSON.parse(new TextDecoder().decode(unzipped['Metadata/project_settings.config']));
      if (proj.filament_colour) filamentColors = proj.filament_colour;
    }

    let defaultExtruder = 2; // Black
    if (unzipped['Metadata/model_settings.config']) {
      const msText = new TextDecoder().decode(unzipped['Metadata/model_settings.config']);
      const m = msText.match(/<metadata\s+key="extruder"\s+value="(\d+)"/);
      if (m) defaultExtruder = parseInt(m[1], 10);
    }

    const objModelText = new TextDecoder().decode(unzipped['3D/Objects/object_1.model']);

    function decodePaintColor(hexString) {
      const nibbles = [];
      for (let i = hexString.length - 1; i >= 0; i--) {
        nibbles.push(parseInt(hexString[i], 16));
      }
      let pos = 0;
      function nextNibble() {
        return pos < nibbles.length ? nibbles[pos++] : 0;
      }
      function decodeTriangle() {
        if (pos >= nibbles.length) return { type: 'leaf', state: 0 };
        const code = nextNibble();
        const splitSides = code & 0b11;
        const upperBits = (code >> 2) & 0b11;
        if (splitSides > 0) {
          const specialSide = upperBits;
          const numChildren = splitSides + 1;
          const children = [];
          for (let i = numChildren - 1; i >= 0; i--) {
            children[i] = decodeTriangle();
          }
          return { type: 'split', splitSides, specialSide, children };
        } else {
          let state;
          if (upperBits === 0b11) {
            let nextCode = nextNibble();
            let num = 0;
            while (nextCode === 0b1111) {
              num++;
              nextCode = nextNibble();
            }
            state = nextCode + 15 * num + 3;
          } else {
            state = upperBits;
          }
          return { type: 'leaf', state };
        }
      }
      return decodeTriangle();
    }

    function getTriangleExtruder(hexString) {
      const tree = decodePaintColor(hexString);
      const counts = {};
      function countLeaves(node) {
        if (!node) return;
        if (node.type === 'leaf') {
          counts[node.state] = (counts[node.state] || 0) + 1;
        } else if (node.children) {
          node.children.forEach(countLeaves);
        }
      }
      countLeaves(tree);
      let maxState = 0, maxCount = 0;
      for (const [state, count] of Object.entries(counts)) {
        const s = parseInt(state, 10);
        if (s > 0 && count > maxCount) {
          maxState = s;
          maxCount = count;
        }
      }
      return maxState;
    }

    // Parse all triangles in order
    const triRegex = /<triangle\s+([^>]+)\/?>/g;
    let match;
    const triangleExtruders = [];
    while ((match = triRegex.exec(objModelText)) !== null) {
      const attrs = match[1];
      const pMatch = attrs.match(/paint_color="([^"]+)"/);
      if (pMatch) {
        const ext = getTriangleExtruder(pMatch[1]);
        triangleExtruders.push(ext > 0 ? ext : defaultExtruder);
      } else {
        triangleExtruders.push(defaultExtruder);
      }
    }

    return {
      filamentColors,
      defaultExtruder,
      totalTriangles: triangleExtruders.length,
      sampleExtruders: triangleExtruders.slice(0, 10),
    };
  });

  console.log('RENDER EVAL RESULT:', renderResult);
  await browser.close();
}

run();
