/**
 * Diagnostic Part 4: find paint_color data in the object file
 */
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

const filePath = path.resolve('scratch/test_models/Spiderman_urban.3mf');
const buffer = fs.readFileSync(filePath);
const zip = unzipSync(buffer);

const objModel = zip['3D/Objects/object_1.model'];
const xml = new TextDecoder().decode(objModel);

// Find paint_color references 
const paintIdx = xml.indexOf('paint_color');
console.log('paint_color index:', paintIdx);
if (paintIdx > 0) {
  console.log('paint_color context:', xml.substring(paintIdx - 50, paintIdx + 500));
}

// Check metadata in the project settings for filament colors
const projData = zip['Metadata/project_settings.config'];
const proj = new TextDecoder().decode(projData);

// Find filament colours
const colorIdx = proj.indexOf('filament_colour');
if (colorIdx > 0) {
  console.log('\n=== FILAMENT COLOUR SECTION ===');
  console.log(proj.substring(colorIdx, colorIdx + 300));
}

// Check if there are multiple meshes or objects in the 3MF
console.log('\n=== OBJECT REFERENCES ===');
const objectRefs = xml.match(/<object[^>]+>/g) || [];
objectRefs.forEach(o => console.log(o));

// Count distinct extruder numbers
const extruderMatches = proj.match(/"extruder"\s*:\s*"(\d+)"/g) || [];
console.log('\n=== EXTRUDER REFERENCES ===');
extruderMatches.slice(0, 10).forEach(e => console.log(e));

// Look for slice_info
const sliceData = zip['Metadata/slice_info.config'];
if (sliceData) {
  console.log('\n=== SLICE INFO ===');
  console.log(new TextDecoder().decode(sliceData));
}

// Look for filament color values specifically
const colorMatch = proj.match(/"filament_colour":\s*\[([\s\S]*?)\]/);
if (colorMatch) {
  console.log('\n=== FILAMENT COLOURS ARRAY ===');
  console.log(colorMatch[0].substring(0, 500));
}
