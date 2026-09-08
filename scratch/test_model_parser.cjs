const fs = require('fs');
const fflate = require('three/examples/jsm/libs/fflate.module.js');
const THREE = require('three');

// Test the exact parser logic as written in bambu3mfParser.ts
function parse3MFTransformMatrix(transformStr) {
  if (!transformStr) return new THREE.Matrix4();
  const t = transformStr.trim().split(/\s+/).map(Number);
  if (t.length !== 12 || t.some(isNaN)) return new THREE.Matrix4();
  const m = new THREE.Matrix4();
  m.set(
    t[0], t[3], t[6], t[9],
    t[1], t[4], t[7], t[10],
    t[2], t[5], t[8], t[11],
    0, 0, 0, 1
  );
  return m;
}

function resolve3MFTransform(zip, modelEntry) {
  try {
    const rootKey = Object.keys(zip).find((k) =>
      k.toLowerCase().endsWith('3dmodel.model')
    );
    if (!rootKey) return new THREE.Matrix4();

    const rootXml = new TextDecoder().decode(zip[rootKey]);
    const normalizedTarget = modelEntry.replace(/^\//, '').toLowerCase();

    const compRegex = /<component\s+([\s\S]*?)(?:\/>|>[\s\S]*?<\/component>)/gi;
    const objRegex = /<object\s+([^>]*)>([\s\S]*?)<\/object>/gi;

    let parentObjectId = null;
    let compTransform = new THREE.Matrix4();

    let om;
    while ((om = objRegex.exec(rootXml)) !== null) {
      const objAttrs = om[1];
      const objBody = om[2];
      const idMatch = objAttrs.match(/id="([^"]+)"/i);
      if (!idMatch) continue;

      let cm;
      while ((cm = compRegex.exec(objBody)) !== null) {
        const cAttrs = cm[1];
        const pathMatch = cAttrs.match(/(?:p:)?path="([^"]+)"/i);
        if (pathMatch) {
          const cPath = pathMatch[1].replace(/^\//, '').toLowerCase();
          if (
            cPath === normalizedTarget ||
            normalizedTarget.endsWith(cPath) ||
            cPath.endsWith(normalizedTarget)
          ) {
            parentObjectId = idMatch[1];
            const transMatch = cAttrs.match(/transform="([^"]+)"/i);
            if (transMatch) {
              compTransform = parse3MFTransformMatrix(transMatch[1]);
            }
            break;
          }
        }
      }
      if (parentObjectId) break;
    }

    let itemTransform = new THREE.Matrix4();
    const buildMatch = rootXml.match(/<build[^>]*>([\s\S]*?)<\/build>/i);
    if (buildMatch) {
      const itemRegex = /<item\s+([\s\S]*?)(?:\/>|>[\s\S]*?<\/item>)/gi;
      let im;
      while ((im = itemRegex.exec(buildMatch[1])) !== null) {
        const iAttrs = im[1];
        const oIdMatch = iAttrs.match(/objectid="([^"]+)"/i);
        if (oIdMatch && (!parentObjectId || oIdMatch[1] === parentObjectId)) {
          const transMatch = iAttrs.match(/transform="([^"]+)"/i);
          if (transMatch) {
            itemTransform = parse3MFTransformMatrix(transMatch[1]);
          }
          break;
        }
      }
    }

    return itemTransform.clone().multiply(compTransform);
  } catch (err) {
    return new THREE.Matrix4();
  }
}

function test(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = fflate.unzipSync(new Uint8Array(buf));
  const modelEntry = Object.keys(zip).find(
    (k) => k.toLowerCase().startsWith('3d/objects/') && k.toLowerCase().endsWith('.model')
  );
  const transform = resolve3MFTransform(zip, modelEntry);
  const xmlText = new TextDecoder().decode(zip[modelEntry]);
  const vertexRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  const positions = [];
  let vm;
  const tempVec = new THREE.Vector3();
  while ((vm = vertexRegex.exec(xmlText)) !== null) {
    tempVec.set(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
    tempVec.applyMatrix4(transform);
    positions.push(tempVec.x, tempVec.y, tempVec.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);

  const dims = {
    x: Math.round(Math.abs(size.x) * 10) / 10,
    y: Math.round(Math.abs(size.y) * 10) / 10,
    z: Math.round(Math.abs(size.z) * 10) / 10,
  };

  console.log(`\nModel: ${filePath}`);
  console.log(`Unscaled (100%) Base Dimensions: X=${dims.x}mm, Y=${dims.y}mm, Z=${dims.z}mm`);
  console.log(`Fits 256x256x200 envelope? ${dims.x <= 256 && dims.y <= 256 && dims.z <= 200}`);

  const scaled200 = {
    x: Math.round(dims.x * 2.0 * 10) / 10,
    y: Math.round(dims.y * 2.0 * 10) / 10,
    z: Math.round(dims.z * 2.0 * 10) / 10,
  };
  console.log(`Scaled (200%) Dimensions: X=${scaled200.x}mm, Y=${scaled200.y}mm, Z=${scaled200.z}mm`);
  console.log(`Fits 256x256x200 envelope? ${scaled200.x <= 256 && scaled200.y <= 256 && scaled200.z <= 200}`);
}

test('scratch/test_models/Spiderman_urban.3mf');
test('slicer-service/app/storage/015d7611-4262-4dc0-afc5-1306fd211b86_Stitchxpikachu.3mf');

