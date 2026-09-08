/**
 * Bambu Studio 3MF Parser
 *
 * Bambu Studio (and its forks like OrcaSlicer) exports 3MF files with a
 * proprietary per-face painting system:
 *   - Triangles have a `paint_color` attribute, e.g. paint_color="0C", "8", or deep subdivision trees
 *   - The encoding is a nibble-packed recursive triangle-subdivision tree read right-to-left
 *   - Each leaf or subtree resolves to an extruder state:
 *       0 = inherit default extruder from model_settings.config
 *       1 = Extruder 1
 *       2 = Extruder 2
 *       3+ = Extruder 3+ (extended nibble encoding)
 *   - The colour palette is stored in Metadata/project_settings.config as "filament_colour"
 *
 * This parser decodes the subdivision trees, computes the area-dominant extruder
 * for each triangle, and builds a per-vertex colored THREE.BufferGeometry.
 */

import * as THREE from 'three';
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';

export type BambuParseResult =
  | { success: true; geometry: THREE.BufferGeometry; colors: string[]; hasColors: boolean }
  | { success: false; reason: string };

interface PaintTreeNode {
  splitSides: number;
  specialSide: number;
  state: number;
  children: PaintTreeNode[] | null;
  uniform: number | null;
}

/**
 * Decode a Bambu paint_color attribute into a subdivision tree.
 * BambuStudio/PrusaSlicer TriangleSelector encoding:
 * - Read RIGHT-TO-LEFT (rightmost char = tree root)
 * - Lower 2 bits = splitSides (0=leaf, 1=2 children, 2=3 children, 3=4 children)
 * - Upper 2 bits = state (leaf) or specialSide (split)
 * - Leaf state 3 is extended: reads following nibble(s)
 */
function decodePaintTree(hex: string): PaintTreeNode | null {
  if (!hex) return null;
  const reversed = hex.split('').reverse().join('');
  const reader = { pos: 0 };
  return decodePaintNode(reversed, reader);
}

function decodePaintNode(hex: string, reader: { pos: number }): PaintTreeNode {
  const leaf = (state: number): PaintTreeNode => ({
    splitSides: 0,
    specialSide: 0,
    state,
    children: null,
    uniform: state,
  });

  if (reader.pos >= hex.length) return leaf(0);

  const nibble = parseInt(hex[reader.pos++], 16);
  if (isNaN(nibble)) return leaf(0);

  const splitSides = nibble & 3;
  const upper = (nibble >> 2) & 3;

  // Leaf node
  if (splitSides === 0) {
    if (upper < 3) return leaf(upper); // 0=inherit, 1=Ext1, 2=Ext2

    // Extended state: accumulate extension nibbles
    let extState = 0;
    while (reader.pos < hex.length) {
      const ext = parseInt(hex[reader.pos++], 16);
      if (isNaN(ext)) return leaf(0);
      if (ext === 0xf) {
        extState += 15;
      } else {
        extState += ext;
        break;
      }
    }
    return leaf(3 + extState);
  }

  // Split node: children serialized in reverse order
  const numChildren = splitSides + 1;
  const children: PaintTreeNode[] = new Array(numChildren);
  for (let i = numChildren - 1; i >= 0; i--) {
    children[i] = decodePaintNode(hex, reader);
  }

  let uniform: number | null = children[0].uniform;
  for (let i = 1; i < numChildren && uniform !== null; i++) {
    if (children[i].uniform !== uniform) uniform = null;
  }

  return { splitSides, specialSide: upper, state: 0, children, uniform };
}

const SPLIT_AREA_WEIGHTS: readonly number[][] = [
  [],
  [0.5, 0.5],
  [0.25, 0.25, 0.5],
  [0.25, 0.25, 0.25, 0.25],
];

/**
 * Computes the area-weighted dominant extruder state of a paint subdivision tree.
 */
function dominantState(node: PaintTreeNode): number {
  if (node.uniform !== null) return node.uniform;

  const areas = new Map<number, number>();
  const walk = (n: PaintTreeNode, weight: number): void => {
    if (n.uniform !== null || !n.children) {
      const s = n.uniform ?? n.state;
      areas.set(s, (areas.get(s) ?? 0) + weight);
      return;
    }
    const weights = SPLIT_AREA_WEIGHTS[n.splitSides];
    for (let i = 0; i < n.children.length; i++) {
      walk(n.children[i], weight * (weights ? weights[i] || 0.25 : 0.25));
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

/**
 * Parses a 12-element 3MF affine transform string into a THREE.Matrix4.
 * 3MF transform order: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32
 */
function parse3MFTransformMatrix(transformStr?: string | null): THREE.Matrix4 {
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

/**
 * Resolves the effective 3MF transformation matrix for a model/component entry
 * by traversing <build><item> and <resources><object><components><component>
 * in the root 3D/3dmodel.model file.
 */
function resolve3MFTransform(
  zip: Record<string, Uint8Array>,
  modelEntry: string
): THREE.Matrix4 {
  try {
    const rootKey = Object.keys(zip).find((k) =>
      k.toLowerCase().endsWith('3dmodel.model')
    );
    if (!rootKey) return new THREE.Matrix4();

    const rootXml = new TextDecoder().decode(zip[rootKey]);
    const normalizedTarget = modelEntry.replace(/^\//, '').toLowerCase();

    // 1. Search for <component ... p:path="..." ... /> referencing this model file
    const compRegex = /<component\s+([\s\S]*?)(?:\/>|>[\s\S]*?<\/component>)/gi;
    const objRegex = /<object\s+([^>]*)>([\s\S]*?)<\/object>/gi;

    let parentObjectId: string | null = null;
    let compTransform = new THREE.Matrix4();

    let om: RegExpExecArray | null;
    while ((om = objRegex.exec(rootXml)) !== null) {
      const objAttrs = om[1];
      const objBody = om[2];
      const idMatch = objAttrs.match(/id="([^"]+)"/i);
      if (!idMatch) continue;

      let cm: RegExpExecArray | null;
      while ((cm = compRegex.exec(objBody)) !== null) {
        const cAttrs = cm[1];
        const pathMatch = cAttrs.match(/(?:p:)?path="([^"]+)"/i);
        if (pathMatch) {
          const cPath = pathMatch[1].replace(/^\//, '').toLowerCase();
          if (
            cPath === normalizedTarget ||
            normalizedTarget.endsWith(cPath) ||
            cPath.endsWith(normalizedTarget)
          ) {
            parentObjectId = idMatch[1];
            const transMatch = cAttrs.match(/transform="([^"]+)"/i);
            if (transMatch) {
              compTransform = parse3MFTransformMatrix(transMatch[1]);
            }
            break;
          }
        }
      }
      if (parentObjectId) break;
    }

    // 2. Find <item> in <build> referencing parentObjectId (or modelEntry if no components)
    let itemTransform = new THREE.Matrix4();
    const buildMatch = rootXml.match(/<build[^>]*>([\s\S]*?)<\/build>/i);
    if (buildMatch) {
      const itemRegex = /<item\s+([\s\S]*?)(?:\/>|>[\s\S]*?<\/item>)/gi;
      let im: RegExpExecArray | null;
      while ((im = itemRegex.exec(buildMatch[1])) !== null) {
        const iAttrs = im[1];
        const oIdMatch = iAttrs.match(/objectid="([^"]+)"/i);
        if (oIdMatch && (!parentObjectId || oIdMatch[1] === parentObjectId)) {
          const transMatch = iAttrs.match(/transform="([^"]+)"/i);
          if (transMatch) {
            itemTransform = parse3MFTransformMatrix(transMatch[1]);
          }
          break;
        }
      }
    }

    return itemTransform.clone().multiply(compTransform);
  } catch (err) {
    console.warn('Failed to resolve 3MF transform matrix:', err);
    return new THREE.Matrix4();
  }
}

/**
 * Parse a Bambu Studio 3MF ArrayBuffer and reconstruct vertex colours
 * from the proprietary paint_color face attributes.
 */
export async function parseBambu3MF(
  arrayBuffer: ArrayBuffer
): Promise<BambuParseResult> {
  try {
    const zip = unzipSync(new Uint8Array(arrayBuffer));

    // ── 1. Read filament colours from project_settings.config ─────────────
    let filamentColors: string[] = ['#AAAAAA'];
    const projEntry = Object.keys(zip).find((k) =>
      k.toLowerCase().includes('project_settings.config')
    );
    if (projEntry) {
      const projText = new TextDecoder().decode(zip[projEntry]);
      const colorMatch = projText.match(/"filament_colour"\s*:\s*\[([\s\S]*?)\]/);
      if (colorMatch) {
        const extracted =
          colorMatch[1]
            .match(/"(#[0-9A-Fa-f]{3,8})"/g)
            ?.map((s) => s.replace(/"/g, '')) ?? [];
        if (extracted.length > 0) {
          filamentColors = extracted;
        }
      }
    }

    // ── 2. Find the geometry object file ──────────────────────────────────
    const objectEntry = Object.keys(zip).find(
      (k) =>
        k.toLowerCase().startsWith('3d/objects/') && k.toLowerCase().endsWith('.model')
    );
    const modelEntry =
      objectEntry ||
      Object.keys(zip).find(
        (k) =>
          k.toLowerCase().endsWith('3dmodel.model') || k.toLowerCase().endsWith('.model')
      );
    if (!modelEntry) {
      return { success: false, reason: 'No geometry model file found inside 3MF.' };
    }

    const xmlText = new TextDecoder().decode(zip[modelEntry]);

    // Check if there is paint_color in the model
    if (!xmlText.includes('paint_color')) {
      return { success: false, reason: 'No Bambu paint_color attributes found.' };
    }

    // ── 3. Read default extruder from model_settings.config ──────────────
    let defaultExtruder = 1; // 1-based
    const settingsEntry = Object.keys(zip).find((k) =>
      k.toLowerCase().includes('model_settings.config')
    );
    if (settingsEntry) {
      const settings = new TextDecoder().decode(zip[settingsEntry]);
      const extMatch = settings.match(/key="extruder"\s+value="(\d+)"/);
      if (extMatch) defaultExtruder = parseInt(extMatch[1]) || 1;
    }

    // ── 4. Parse vertices and apply 3MF transformations ───────────────────
    const transformMatrix = resolve3MFTransform(zip, modelEntry);
    const vertexRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
    const positions: number[] = [];
    let vm: RegExpExecArray | null;
    const tempVec = new THREE.Vector3();
    while ((vm = vertexRegex.exec(xmlText)) !== null) {
      tempVec.set(parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3]));
      tempVec.applyMatrix4(transformMatrix);
      positions.push(tempVec.x, tempVec.y, tempVec.z);
    }

    if (positions.length === 0) {
      return { success: false, reason: 'No vertex data found in 3MF geometry.' };
    }

    // ── 5. Parse triangles + paint_color ─────────────────────────────────
    const triRegex = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"([^/]*)\/>/g;
    const indices: number[] = [];
    const faceColors: number[] = []; // 0-based filament slot index

    let tm: RegExpExecArray | null;
    while ((tm = triRegex.exec(xmlText)) !== null) {
      indices.push(parseInt(tm[1], 10), parseInt(tm[2], 10), parseInt(tm[3], 10));
      const attrStr = tm[4];
      const paintMatch = attrStr.match(/paint_color="([^"]+)"/);
      if (paintMatch) {
        const tree = decodePaintTree(paintMatch[1]);
        const state = tree ? dominantState(tree) : 0;
        // state 0 = inherit default extruder (1-based), state 1..N = extruder 1..N
        const extruder1Based = state > 0 ? state : defaultExtruder;
        faceColors.push(extruder1Based - 1);
      } else {
        faceColors.push(defaultExtruder - 1);
      }
    }

    if (indices.length === 0) {
      return { success: false, reason: 'No triangle data found in 3MF geometry.' };
    }

    // ── 6. Convert slot indices to RGB vertex colours ─────────────────────
    const flatPositions: number[] = [];
    const flatColors: number[] = [];

    for (let f = 0; f < faceColors.length; f++) {
      const slot = Math.max(0, Math.min(faceColors[f], filamentColors.length - 1));
      const hex = filamentColors[slot] || '#AAAAAA';
      const c = new THREE.Color(hex);

      for (let v = 0; v < 3; v++) {
        const vi = indices[f * 3 + v];
        flatPositions.push(
          positions[vi * 3],
          positions[vi * 3 + 1],
          positions[vi * 3 + 2]
        );
        flatColors.push(c.r, c.g, c.b);
      }
    }

    // ── 7. Build BufferGeometry ───────────────────────────────────────────
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(flatPositions, 3)
    );
    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(flatColors, 3)
    );
    geometry.computeVertexNormals();

    const uniqueSlots = [...new Set(faceColors)];
    const hasColors =
      uniqueSlots.length > 1 ||
      (uniqueSlots.length === 1 && filamentColors[uniqueSlots[0]] !== '#AAAAAA');

    return {
      success: true,
      geometry,
      colors: filamentColors,
      hasColors,
    };
  } catch (err: any) {
    return { success: false, reason: err?.message || 'Failed to parse Bambu 3MF.' };
  }
}
