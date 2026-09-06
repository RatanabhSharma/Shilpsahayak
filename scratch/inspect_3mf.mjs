/**
 * Diagnostic: inspect what's actually inside Spiderman_urban.3mf
 * Run: node scratch/inspect_3mf.mjs
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

const filePath = path.resolve('scratch/test_models/Spiderman_urban.3mf');
const buffer = fs.readFileSync(filePath);
const zip = unzipSync(buffer);

console.log('\n=== FILES INSIDE 3MF ZIP ===');
for (const [name, data] of Object.entries(zip)) {
  console.log(`  ${name}  (${data.byteLength} bytes)`);
}

// Find the main model XML
const modelEntry = Object.keys(zip).find(k => k.toLowerCase().includes('3dmodel.model') || k.toLowerCase().endsWith('.model'));
if (modelEntry) {
  const xml = new TextDecoder().decode(zip[modelEntry]);
  
  console.log('\n=== XML SNIPPET (first 4000 chars) ===');
  console.log(xml.substring(0, 4000));
  
  // Check for coloring mechanisms
  console.log('\n=== COLOR MECHANISM ANALYSIS ===');
  console.log('Has <m:colorgroup> ?   ', xml.includes('colorgroup'));
  console.log('Has <m:color> ?        ', xml.includes('m:color'));
  console.log('Has <texture2d> ?      ', xml.includes('texture2d'));
  console.log('Has <p:texture2dgroup>?', xml.includes('texture2dgroup'));
  console.log('Has <m:sRGBColor> ?    ', xml.includes('sRGBColor'));
  console.log('Has bambu extensions ? ', xml.includes('bambu'));
  console.log('Has basematerials ?    ', xml.includes('basematerials'));
  console.log('Has m:p1= attribute ?  ', xml.includes('m:p1='));
  console.log('Has p:p1= attribute ?  ', xml.includes('p:p1='));
  
  // Sample a triangle to see color attributes
  const triMatch = xml.match(/<triangle[^>]+>/);
  if (triMatch) {
    console.log('\nSample triangle:', triMatch[0]);
  }
  
  // Check material definitions
  const materialMatches = xml.match(/<m:colorgroup[^>]*>[\s\S]*?<\/m:colorgroup>/g);
  if (materialMatches) {
    console.log('\nColor groups found:', materialMatches.length);
    console.log('First:', materialMatches[0]?.substring(0, 500));
  }
  
  const baseMaterialMatches = xml.match(/<basematerials[^>]*>[\s\S]*?<\/basematerials>/g);
  if (baseMaterialMatches) {
    console.log('\nBase materials found:', baseMaterialMatches.length);
    console.log('First:', baseMaterialMatches[0]?.substring(0, 500));
  }

  const textureMatches = xml.match(/<[^>]*texture[^>]*>/gi);
  if (textureMatches) {
    console.log('\nTexture refs found:', textureMatches.length);
    textureMatches.slice(0, 5).forEach(t => console.log(' ', t));
  }
}
