import fs from 'fs';
import path from 'path';
import { parse3MFArrayBuffer } from '../src/services/model/modelParser.ts';

async function test() {
  const filePath = path.resolve('scratch/test_models/Spiderman_urban.3mf');
  const buf = fs.readFileSync(filePath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  const res = await parse3MFArrayBuffer(ab, 'Spiderman_urban.3mf', ab.byteLength);
  console.log('Success:', res.success);
  console.log('hasOriginalColors:', res.hasOriginalColors);
  console.log('originalColorCount:', res.originalColorCount);
  console.log('dimensions:', res.dimensions);
  console.log('volumeCm3:', res.volumeCm3);
  console.log('triangleCount:', res.triangleCount);
  console.log('geometry color attr count:', res.geometry?.getAttribute('color')?.count);
}

test().catch(console.error);

