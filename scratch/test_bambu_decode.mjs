/**
 * Test the correct Bambu paint_color bit-pack decoder.
 * 
 * Bambu's paint_color encoding:
 * Each hex digit = 4 bits. Pairs of hex digits = 1 byte = 4 face slots (2 bits each).
 * So each byte encodes 4 consecutive faces.
 * Bit-pair values: 00=no-override, 01=slot1, 10=slot2, 11=slot3
 * 
 * Wait - but the paint_color attribute is on individual <triangle> elements,
 * not on the mesh itself. So it's NOT a run of multiple faces - it's ONE face's color.
 * 
 * Let me re-read the long value "8888088388383"... this is on a SINGLE triangle.
 * That seems wrong. Unless the paint_color is actually a compact encoding for
 * MULTIPLE consecutive faces (like a run), starting from this triangle.
 * 
 * Let me look at the actual XML more carefully.
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

const filePath = path.resolve('scratch/test_models/Spiderman_urban.3mf');
const buffer = fs.readFileSync(filePath);
const zip = unzipSync(buffer);
const objectEntry = Object.keys(zip).find(k => k.toLowerCase().startsWith('3d/objects/') && k.toLowerCase().endsWith('.model'));
const xmlText = new TextDecoder().decode(zip[objectEntry]);

// Find context around long paint_color values
console.log('=== CONTEXT AROUND LONG PAINT_COLOR ===');
const longIdx = xmlText.indexOf('8888088388383');
if (longIdx > 0) {
  // Show surrounding 10 triangles
  const start = Math.max(0, longIdx - 200);
  const end = Math.min(xmlText.length, longIdx + 400);
  console.log(xmlText.substring(start, end));
}

// Count consecutive paint_color attrs - are they on consecutive triangles?
console.log('\n=== SAMPLE OF TRIANGLES WITH paint_color ===');
const matches = [];
const re = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"([^/]*)\/>/g;
let m;
let idx = 0;
while ((m = re.exec(xmlText)) !== null && matches.length < 30) {
  const has = m[4].includes('paint_color');
  if (has) {
    const pc = m[4].match(/paint_color="([^"]+)"/)?.[1];
    matches.push({ idx, pc });
  }
  idx++;
}
matches.slice(0, 15).forEach(x => console.log(`  tri[${x.idx}] paint_color="${x.pc}" len=${x.pc?.length}`));

// Look at what PrusaSlicer says about paint_color encoding
// Check if there's a FacesPaintColor (Bambu-style) or FacesAnnotation
console.log('\n=== METADATA IN OBJECT FILE ===');
const metaRe = /<metadata[^>]+>([^<]*)<\/metadata>/g;
let mm;
while ((mm = metaRe.exec(xmlText)) !== null) {
  console.log(mm[0].substring(0, 200));
}
