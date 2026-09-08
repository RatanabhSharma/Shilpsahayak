const fs = require('fs');
const fflate = require('three/examples/jsm/libs/fflate.module.js');
const THREE = require('three');

function parseVertices(xmlText) {
  const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let m;
  while ((m = vRegex.exec(xmlText)) !== null) {
    const x = parseFloat(m[1]), y = parseFloat(m[2]), z = parseFloat(m[3]);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { dx: maxX - minX, dy: maxY - minY, dz: maxZ - minZ };
}

['scratch/test_models/Spiderman_urban.3mf', 'slicer-service/app/storage/015d7611-4262-4dc0-afc5-1306fd211b86_Stitchxpikachu.3mf'].forEach(p => {
  const buf = fs.readFileSync(p);
  const zip = fflate.unzipSync(new Uint8Array(buf));
  const obj = Buffer.from(zip['3D/Objects/object_1.model']).toString('utf8');
  console.log(p, parseVertices(obj));
});

