const fs = require('fs');
const fflate = require('three/examples/jsm/libs/fflate.module.js');
const THREE = require('three');

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

function testModel(filePath) {
  console.log('Testing:', filePath);
  const buf = fs.readFileSync(filePath);
  const zip = fflate.unzipSync(new Uint8Array(buf));
  
  // Find top-level 3dmodel.model
  const mainModelKey = Object.keys(zip).find(k => k.toLowerCase().endsWith('3dmodel.model'));
  let finalMatrix = new THREE.Matrix4();
  
  if (mainModelKey) {
    const xml = Buffer.from(zip[mainModelKey]).toString('utf8');
    
    // Parse build item
    // e.g. <item objectid="2" ... transform="..." />
    const itemMatch = xml.match(/<item\s+[^>]*objectid="([^"]+)"[^>]*>/i);
    let targetObjectId = null;
    if (itemMatch) {
      targetObjectId = itemMatch[1];
      const transformMatch = itemMatch[0].match(/transform="([^"]+)"/i);
      if (transformMatch) {
        const itemMat = parseTransformMatrix(transformMatch[1]);
        finalMatrix.multiply(itemMat);
      }
    }
    
    // If targetObjectId, check if that object is defined in <resources> as components
    if (targetObjectId) {
      const objRegex = new RegExp(`<object\\s+[^>]*id="${targetObjectId}"[^>]*>([\\s\\S]*?)<\\/object>`, 'i');
      const objMatch = xml.match(objRegex);
      if (objMatch) {
        const compMatch = objMatch[1].match(/<component\s+[^>]*transform="([^"]+)"/i);
        if (compMatch) {
          const compMat = parseTransformMatrix(compMatch[1]);
          finalMatrix.multiply(compMat);
        }
      }
    }
  }
  
  // Now parse raw vertices
  const objKey = Object.keys(zip).find(k => k.toLowerCase().startsWith('3d/objects/') && k.toLowerCase().endsWith('.model')) || mainModelKey;
  const objXml = Buffer.from(zip[objKey]).toString('utf8');
  const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  const positions = [];
  let vm;
  while ((vm = vRegex.exec(objXml)) !== null) {
    const v = new THREE.Vector3(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
    v.applyMatrix4(finalMatrix);
    positions.push(v.x, v.y, v.z);
  }
  
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);
  console.log('Result Dimensions (mm):', {
    x: +size.x.toFixed(2),
    y: +size.y.toFixed(2),
    z: +size.z.toFixed(2)
  });
}

testModel('scratch/test_models/Spiderman_urban.3mf');
testModel('slicer-service/app/storage/015d7611-4262-4dc0-afc5-1306fd211b86_Stitchxpikachu.3mf');

