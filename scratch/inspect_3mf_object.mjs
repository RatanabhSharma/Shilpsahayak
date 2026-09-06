/**
 * Diagnostic Part 2: inspect the actual object geometry file inside the 3MF
 * Run: node scratch/inspect_3mf_object.mjs
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

const filePath = path.resolve('scratch/test_models/Spiderman_urban.3mf');
const buffer = fs.readFileSync(filePath);
const zip = unzipSync(buffer);

// Read the actual geometry object file
const objModel = zip['3D/Objects/object_1.model'];
const xml = new TextDecoder().decode(objModel);

console.log('=== OBJECT MODEL SIZE ===');
console.log(`${(objModel.byteLength / 1024 / 1024).toFixed(2)} MB`);

console.log('\n=== FIRST 3000 CHARS ===');
console.log(xml.substring(0, 3000));

console.log('\n=== COLOR MECHANISM ANALYSIS ===');
console.log('Has m:colorgroup ?     ', xml.includes('colorgroup'));
console.log('Has m:color ?          ', xml.includes('m:color'));
console.log('Has texture2d ?        ', xml.includes('texture2d'));
console.log('Has p:texture2dgroup ? ', xml.includes('texture2dgroup'));
console.log('Has basematerials ?    ', xml.includes('basematerials'));
console.log('Has m:p1= ?            ', xml.includes('m:p1='));
console.log('Has p:p1= ?            ', xml.includes('p:p1='));
console.log('Has paint_color ?      ', xml.includes('paint_color'));
console.log('Has BambuStudio ?      ', xml.includes('BambuStudio'));
console.log('Has sRGB ?             ', xml.includes('sRGB'));
console.log('Has seam_position ?    ', xml.includes('seam_position'));
console.log('Has extruder_color ?   ', xml.includes('extruder_color'));
console.log('Has extruder ?         ', xml.includes('extruder'));
console.log('Has metadata ?         ', xml.includes('<metadata'));

// Find triangle sample
const triSample = xml.match(/<triangle[^/]*\/>/);
if (triSample) console.log('\nSample triangle:', triSample[0]);

// Find mesh element start
const meshIdx = xml.indexOf('<mesh>');
if (meshIdx > 0) {
  console.log('\n=== MESH START (around <mesh>) ===');
  console.log(xml.substring(meshIdx, meshIdx + 500));
}

// Find resources
const resMatch = xml.match(/<resources>([\s\S]*?)<\/resources>/);
if (resMatch) {
  console.log('\n=== RESOURCES SECTION ===');
  console.log(resMatch[1].substring(0, 2000));
}

// Count vertices and triangles
const vertexCount = (xml.match(/<vertex /g) || []).length;
const triangleCount = (xml.match(/<triangle /g) || []).length;
console.log(`\nVertex count: ${vertexCount}`);
console.log(`Triangle count: ${triangleCount}`);
