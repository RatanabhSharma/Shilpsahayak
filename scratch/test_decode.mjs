import fs from 'fs';
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';

const buf = fs.readFileSync('scratch/test_models/Spiderman_urban.3mf');
const unzipped = unzipSync(new Uint8Array(buf));
const text = new TextDecoder().decode(unzipped['3D/Objects/object_1.model']);

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

const triRegex = /<triangle\s+([^>]+)\/?>/g;
let match;
let totalTris = 0;
let paintedCount = 0;
const extruderCounts = {};

while ((match = triRegex.exec(text)) !== null) {
  totalTris++;
  const attrs = match[1];
  const pMatch = attrs.match(/paint_color="([^"]+)"/);
  if (pMatch) {
    paintedCount++;
    const ext = getTriangleExtruder(pMatch[1]);
    extruderCounts[ext] = (extruderCounts[ext] || 0) + 1;
  } else {
    extruderCounts[0] = (extruderCounts[0] || 0) + 1;
  }
}

console.log('Total triangles in object_1.model:', totalTris);
console.log('Painted triangles:', paintedCount);
console.log('Extruder breakdown (0=default unpainted):', extruderCounts);
