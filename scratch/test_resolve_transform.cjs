const fs = require('fs');
const fflate = require('three/examples/jsm/libs/fflate.module.js');
const THREE = require('three');

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

function resolveTransform(zip, modelEntry) {
  const rootKey = Object.keys(zip).find((k) => k.toLowerCase().endsWith('3dmodel.model'));
  if (!rootKey) return new THREE.Matrix4();

  const rootXml = Buffer.from(zip[rootKey]).toString('utf8');

  // Normalize target path
  const normalizedTarget = modelEntry.replace(/^\//, '').toLowerCase();

  // 1. Search for <component ... p:path="..." ... /> referencing this model file
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
        if (cPath === normalizedTarget || normalizedTarget.endsWith(cPath) || cPath.endsWith(normalizedTarget)) {
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

  // 2. Find <item> in <build> referencing parentObjectId (or modelEntry if no components)
  const targetId = parentObjectId;
  let itemTransform = new THREE.Matrix4();

  const buildMatch = rootXml.match(/<build[^>]*>([\s\S]*?)<\/build>/i);
  if (buildMatch) {
    const itemRegex = /<item\s+([\s\S]*?)(?:\/>|>[\s\S]*?<\/item>)/gi;
    let im;
    while ((im = itemRegex.exec(buildMatch[1])) !== null) {
      const iAttrs = im[1];
      const oIdMatch = iAttrs.match(/objectid="([^"]+)"/i);
      if (oIdMatch && (!targetId || oIdMatch[1] === targetId)) {
        const transMatch = iAttrs.match(/transform="([^"]+)"/i);
        if (transMatch) {
          itemTransform = parse3MFTransformMatrix(transMatch[1]);
        }
        break;
      }
    }
  }

  return itemTransform.clone().multiply(compTransform);
}

['scratch/test_models/Spiderman_urban.3mf', 'slicer-service/app/storage/015d7611-4262-4dc0-afc5-1306fd211b86_Stitchxpikachu.3mf'].forEach((f) => {
  const buf = fs.readFileSync(f);
  const zip = fflate.unzipSync(new Uint8Array(buf));
  const objectEntry = Object.keys(zip).find(
    (k) => k.toLowerCase().startsWith('3d/objects/') && k.toLowerCase().endsWith('.model')
  );
  const transform = resolveTransform(zip, objectEntry);
  console.log(f);
  console.log('Matrix elements:', transform.elements);

  const xmlText = Buffer.from(zip[objectEntry]).toString('utf8');
  const vertexRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  const positions = [];
  let vm;
  while ((vm = vertexRegex.exec(xmlText)) !== null) {
    const v = new THREE.Vector3(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
    v.applyMatrix4(transform);
    positions.push(v.x, v.y, v.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);
  console.log('Resolved Dimensions (mm):', {
    x: +size.x.toFixed(2),
    y: +size.y.toFixed(2),
    z: +size.z.toFixed(2),
  });
});

