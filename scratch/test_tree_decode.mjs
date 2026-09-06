import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

const filePath = path.resolve('scratch/test_models/Spiderman_urban.3mf');
const buffer = fs.readFileSync(filePath);
const zip = unzipSync(buffer);

const objModel = zip['3D/Objects/object_1.model'];
const xmlText = new TextDecoder().decode(objModel);

function decodePaintTree(hex) {
  if (!hex) return null;
  const reversed = hex.split('').reverse().join('');
  const reader = { pos: 0 };
  return decodePaintNode(reversed, reader);
}

function decodePaintNode(hex, reader) {
  const leaf = (state) => ({ splitSides: 0, specialSide: 0, state, children: null, uniform: state });
  if (reader.pos >= hex.length) return leaf(0);

  const nibble = parseInt(hex[reader.pos++], 16);
  if (isNaN(nibble)) return leaf(0);

  const splitSides = nibble & 3;
  const upper = (nibble >> 2) & 3;

  if (splitSides === 0) {
    if (upper < 3) return leaf(upper);
    let extState = 0;
    while (reader.pos < hex.length) {
      const ext = parseInt(hex[reader.pos++], 16);
      if (isNaN(ext)) return leaf(0);
      if (ext === 0xF) {
        extState += 15;
      } else {
        extState += ext;
        break;
      }
    }
    return leaf(3 + extState);
  }

  const numChildren = splitSides + 1;
  const children = new Array(numChildren);
  for (let i = numChildren - 1; i >= 0; i--) {
    children[i] = decodePaintNode(hex, reader);
  }

  let uniform = children[0].uniform;
  for (let i = 1; i < numChildren && uniform !== null; i++) {
    if (children[i].uniform !== uniform) uniform = null;
  }

  return { splitSides, specialSide: upper, state: 0, children, uniform };
}

const SPLIT_AREA_WEIGHTS = [
  [],
  [0.5, 0.5],
  [0.25, 0.25, 0.5],
  [0.25, 0.25, 0.25, 0.25],
];

function dominantState(node) {
  if (node.uniform !== null) return node.uniform;

  const areas = new Map();
  const walk = (n, weight) => {
    if (n.uniform !== null || !n.children) {
      const s = n.uniform ?? n.state;
      areas.set(s, (areas.get(s) ?? 0) + weight);
      return;
    }
    const weights = SPLIT_AREA_WEIGHTS[n.splitSides];
    for (let i = 0; i < n.children.length; i++) {
      walk(n.children[i], weight * (weights[i] || 0.25));
    }
  };
  walk(node, 1);

  let best = 0;
  let bestArea = -1;
  for (const [state, area] of areas) {
    if (area > bestArea) {
      best = state;
      bestArea = area;
    }
  }
  return best;
}

const triRegex = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"([^/]*)\/>/g;
let tm;
const stateCounts = {};
let total = 0;

while ((tm = triRegex.exec(xmlText)) !== null) {
  total++;
  const attrStr = tm[4];
  const paintMatch = attrStr.match(/paint_color="([^"]+)"/);
  if (paintMatch) {
    const tree = decodePaintTree(paintMatch[1]);
    const state = tree ? dominantState(tree) : 0;
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  } else {
    stateCounts[0] = (stateCounts[0] || 0) + 1; // inherit
  }
}

console.log('Total triangles:', total);
console.log('State counts (0=inherit/defaultExtruder, 1=Ext1/White, 2=Ext2/Black, 3=Ext3/Red):');
console.log(stateCounts);

