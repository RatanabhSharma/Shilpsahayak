const fs = require('fs');
const path = require('path');
const fflate = require('three/examples/jsm/libs/fflate.module.js');
const THREE = require('three');
const { execSync } = require('child_process');

const slicerExe = path.resolve('slicer-service/poc/bin/PrusaSlicer-2.9.0/prusa-slicer-console.exe');

function parseTransformMatrix(transformStr) {
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

function getPrusaDimensions(filePath) {
  try {
    const stdout = execSync(`"${slicerExe}" --info "${path.resolve(filePath)}"`, { encoding: 'utf8' });
    const dims = { x: 0, y: 0, z: 0 };
    for (const line of stdout.split('\n')) {
      const l = line.trim();
      if (l.startsWith('size_x =')) dims.x = parseFloat(l.split('=')[1].trim());
      if (l.startsWith('size_y =')) dims.y = parseFloat(l.split('=')[1].trim());
      if (l.startsWith('size_z =')) dims.z = parseFloat(l.split('=')[1].trim());
    }
    return dims;
  } catch (e) {
    return null;
  }
}

function parseModelDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = fflate.unzipSync(new Uint8Array(buf));
  
  // Find top-level 3dmodel.model
  const mainModelKey = Object.keys(zip).find(k => k.toLowerCase().endsWith('3dmodel.model'));
  if (!mainModelKey) return null;
  
  const mainXml = Buffer.from(zip[mainModelKey]).toString('utf8');
  
  // 1. Build map of objects in mainXml
  // Each object can have <components> or <mesh>
  const objectNodes = {};
  const objRegex = /<object\s+([^>]*)>([\s\S]*?)<\/object>/gi;
  let om;
  while ((om = objRegex.exec(mainXml)) !== null) {
    const attrStr = om[1];
    const bodyStr = om[2];
    const idMatch = attrStr.match(/id="([^"]+)"/i);
    if (!idMatch) continue;
    const id = idMatch[1];
    
    // Components
    const components = [];
    const compRegex = /<component\s+([\s\S]*?)(?:\/>|>[\s\S]*?<\/component>)/gi;
    let cm;
    while ((cm = compRegex.exec(bodyStr)) !== null) {
      const cAttrs = cm[1];
      const cId = (cAttrs.match(/objectid="([^"]+)"/i) || [])[1];
      const cPath = (cAttrs.match(/(?:p:)?path="([^"]+)"/i) || [])[1];
      const cTrans = (cAttrs.match(/transform="([^"]+)"/i) || [])[1];
      components.push({
        objectid: cId,
        path: cPath,
        transform: parseTransformMatrix(cTrans)
      });
    }
    
    objectNodes[id] = {
      body: bodyStr,
      components
    };
  }
  
  // 2. Parse <build> items
  const items = [];
  const buildRegex = /<build[^>]*>([\s\S]*?)<\/build>/i;
  const buildMatch = mainXml.match(buildRegex);
  if (buildMatch) {
    const itemRegex = /<item\s+([^/]*)\/>/gi;
    let im;
    while ((im = itemRegex.exec(buildMatch[1])) !== null) {
      const iAttrs = im[1];
      const oId = (iAttrs.match(/objectid="([^"]+)"/i) || [])[1];
      const iTrans = (iAttrs.match(/transform="([^"]+)"/i) || [])[1];
      items.push({
        objectid: oId,
        transform: parseTransformMatrix(iTrans)
      });
    }
    console.log('Found items:', items);
    console.log('Object keys:', Object.keys(objectNodes));
  }
  
  const allPositions = [];
  
  function processObject(objId, parentTransform, zipKey) {
    // If external zipKey
    let xml = mainXml;
    if (zipKey) {
      const cleanKey = zipKey.replace(/^\//, '').toLowerCase();
      const actualKey = Object.keys(zip).find(k => k.toLowerCase() === cleanKey);
      if (actualKey) {
        xml = Buffer.from(zip[actualKey]).toString('utf8');
      }
    }
    
    // Check if it has components in mainXml
    const objDef = objectNodes[objId];
    if (objDef && objDef.components.length > 0) {
      for (const comp of objDef.components) {
        const combinedTransform = parentTransform.clone().multiply(comp.transform);
        processObject(comp.objectid, combinedTransform, comp.path);
      }
      return;
    }
    
    console.log('processObject objId:', objId, 'zipKey:', zipKey, 'xml len:', xml.length);
    // Otherwise it's a mesh: parse vertices
    const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
    let vm;
    let vCount = 0;
    while ((vm = vRegex.exec(xml)) !== null) {
      vCount++;
      const v = new THREE.Vector3(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
      v.applyMatrix4(parentTransform);
      allPositions.push(v.x, v.y, v.z);
    }
    console.log('Parsed vertices:', vCount);
  }
  
  if (items.length > 0) {
    for (const item of items) {
      processObject(item.objectid, item.transform, null);
    }
  } else {
    // Fallback: parse any mesh directly
    const objKey = Object.keys(zip).find(k => k.toLowerCase().startsWith('3d/objects/') && k.toLowerCase().endsWith('.model')) || mainModelKey;
    const xml = Buffer.from(zip[objKey]).toString('utf8');
    const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
    let vm;
    while ((vm = vRegex.exec(xml)) !== null) {
      allPositions.push(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
    }
  }
  
  if (allPositions.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
  geo.computeBoundingBox();
  const size = new THREE.Vector3();
  geo.boundingBox.getSize(size);
  return {
    x: +size.x.toFixed(2),
    y: +size.y.toFixed(2),
    z: +size.z.toFixed(2)
  };
}

const testFiles = [
  'scratch/test_models/Spiderman_urban.3mf',
  'slicer-service/app/storage/015d7611-4262-4dc0-afc5-1306fd211b86_Stitchxpikachu.3mf',
  'slicer-service/app/storage/43f6a9e5-b355-47d4-bab2-0aa1b241d1cc_Dragon_Lamp_Update_03-29-2026.3mf'
];

for (const f of testFiles) {
  if (fs.existsSync(f)) {
    const prusa = getPrusaDimensions(f);
    const parsed = parseModelDimensions(f);
    console.log(`\nFile: ${path.basename(f)}`);
    console.log('Prusa Dimensions: ', prusa);
    console.log('Parsed Dimensions:', parsed);
  }
}
