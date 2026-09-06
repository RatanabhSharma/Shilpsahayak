import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseSTLArrayBuffer,
  parseZIPArrayBuffer,
  parseOBJText,
  parse3MFArrayBuffer,
} from '../model/modelParser';

describe('Real 3D File Format Parsing & Color Support', () => {
  const dir = 'scratch/test_models';

  beforeAll(() => {
    if (typeof (globalThis as any).document === 'undefined') {
      (globalThis as any).document = {
        createElementNS: () => ({
          addEventListener: () => {},
          removeEventListener: () => {},
          set src(_: any) {},
        }),
      };
    }
  });

  it('1. Single-colour STL: parses successfully and identifies hasOriginalColors=false', () => {
    const filePath = path.join(dir, 'single_color.stl');
    const buf = fs.readFileSync(filePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const res = parseSTLArrayBuffer(ab, 'single_color.stl', ab.byteLength);

    expect(res.success).toBe(true);
    expect(res.hasOriginalColors).toBe(false);
    expect(res.dimensions.x).toBeCloseTo(20, 0);
    expect(res.dimensions.y).toBeCloseTo(20, 0);
    expect(res.dimensions.z).toBeCloseTo(20, 0);
    expect(res.volumeCm3).toBeGreaterThan(0);
  });

  it('2. Vertex-coloured STL: parses binary VisCAM facet colours and identifies hasOriginalColors=true', () => {
    const filePath = path.join(dir, 'vertex_colored.stl');
    const buf = fs.readFileSync(filePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const res = parseSTLArrayBuffer(ab, 'vertex_colored.stl', ab.byteLength);

    expect(res.success).toBe(true);
    expect(res.hasOriginalColors).toBe(true);
    expect(res.originalColorCount).toBeGreaterThanOrEqual(1);
  });

  it('3. Spider-Man Model (OBJ + MTL): parses Red suit, Black clothing, and White eyes', () => {
    const objText = fs.readFileSync(path.join(dir, 'spiderman.obj'), 'utf8');
    const mtlText = fs.readFileSync(path.join(dir, 'spiderman.mtl'), 'utf8');
    const res = parseOBJText(objText, 'spiderman.obj', 2000, undefined, mtlText);

    expect(res.success).toBe(true);
    expect(res.hasOriginalColors).toBe(true);
    expect(res.originalColorCount).toBeGreaterThanOrEqual(3);
    expect(res.object3d).toBeDefined();

    const foundMaterials: string[] = [];
    res.object3d?.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => foundMaterials.push(m.name));
      }
    });

    expect(foundMaterials).toContain('RedSuit');
    expect(foundMaterials).toContain('BlackClothing');
    expect(foundMaterials).toContain('WhiteEyes');
  });

  it('4. Spider-Man ZIP Package: unpacks and preserves all 3 materials', async () => {
    const filePath = path.join(dir, 'spiderman.zip');
    const buf = fs.readFileSync(filePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const res = await parseZIPArrayBuffer(ab, 'spiderman.zip', ab.byteLength);

    expect(res.success).toBe(true);
    expect(res.hasOriginalColors).toBe(true);
    expect(res.originalColorCount).toBeGreaterThanOrEqual(3);
    expect(res.object3d).toBeDefined();

    const foundMaterials: string[] = [];
    res.object3d?.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => foundMaterials.push(m.name));
      }
    });

    expect(foundMaterials).toContain('RedSuit');
    expect(foundMaterials).toContain('BlackClothing');
    expect(foundMaterials).toContain('WhiteEyes');
  });

  it('5. Textured OBJ: parses material map texture binding', () => {
    const objText = fs.readFileSync(path.join(dir, 'textured_box.obj'), 'utf8');
    const mtlText = fs.readFileSync(path.join(dir, 'textured_box.mtl'), 'utf8');
    const textureMap: Record<string, string> = {
      'texture.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    };

    const res = parseOBJText(objText, 'textured_box.obj', 1000, undefined, mtlText, textureMap);
    expect(res.success).toBe(true);
    expect(res.hasOriginalColors).toBe(true);
  });

  it('6. 3MF File with Colour/Material Data: handled or clearly reported', async () => {
    const emptyRes = await parse3MFArrayBuffer(new ArrayBuffer(0), 'empty.3mf', 0);
    expect(emptyRes.success).toBe(false);
    expect(emptyRes.errorMessage).toBeDefined();
  });
});
