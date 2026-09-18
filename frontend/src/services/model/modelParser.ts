import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { unzipSync, strFromU8 } from 'three/examples/jsm/libs/fflate.module.js';
import { ParsedModelResult, PreviewMode, PreviewObject, PreviewPlate } from './modelTypes';
import { checkBuildVolume } from '../pricing/calculateQuote';
import { DEFAULT_PRICING_CONFIG } from '../pricing/pricingConfig';
import { getModelLocally } from '../../utils/uploadFile';
import { parseBambu3MF, applyBambuProjectMaterials } from './bambu3mfParser';
import { bufferGeometryToParsedGeometry, buildMeshForObject } from './sceneBuilder';


function signedVolumeOfTriangle(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3
): number {
  return p1.dot(p2.cross(p3)) / 6.0;
}

/**
 * Detects whether an uploaded model contains original color information:
 * - STL binary vertex/facet colors
 * - OBJ vertex colors (v x y z r g b)
 * - OBJ MTL material assignments
 * - Texture maps (diffuse maps)
 * - 3MF color groups, materials, and textures
 */
export function detectOriginalColors(
  geometry?: THREE.BufferGeometry | null,
  object3d?: THREE.Object3D | null
): { hasColors: boolean; colorCount: number; hasTextures: boolean; detectedColors: string[] } {
  let hasColors = false;
  let hasTextures = false;
  const uniqueColors = new Set<string>();
  const hexColorsSet = new Set<string>();

  const toHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('').toUpperCase();

  // 1. Check BufferGeometry vertex colors (STL & single mesh OBJ/3MF)
  if (geometry && geometry.hasAttribute('color')) {
    const colorAttr = geometry.getAttribute('color');
    if (colorAttr && colorAttr.count > 0) {
      const step = Math.max(1, Math.floor(colorAttr.count / 300));
      for (let i = 0; i < colorAttr.count; i += step) {
        const r = Math.round(colorAttr.getX(i) * 255);
        const g = Math.round(colorAttr.getY(i) * 255);
        const b = Math.round(colorAttr.getZ(i) * 255);
        uniqueColors.add(`${r},${g},${b}`);
        hexColorsSet.add(toHex(r, g, b));
      }
      if (
        uniqueColors.size > 1 ||
        (uniqueColors.size === 1 &&
          !uniqueColors.has('255,255,255') &&
          !uniqueColors.has('0,0,0'))
      ) {
        hasColors = true;
      }
    }
  }

  // 2. Check Object3D hierarchy (meshes, materials, textures, vertex colors)
  if (object3d) {
    object3d.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry && mesh.geometry.hasAttribute('color')) {
          const colorAttr = mesh.geometry.getAttribute('color');
          if (colorAttr && colorAttr.count > 0) {
            const step = Math.max(1, Math.floor(colorAttr.count / 300));
            for (let i = 0; i < colorAttr.count; i += step) {
              const r = Math.round(colorAttr.getX(i) * 255);
              const g = Math.round(colorAttr.getY(i) * 255);
              const b = Math.round(colorAttr.getZ(i) * 255);
              uniqueColors.add(`${r},${g},${b}`);
              hexColorsSet.add(toHex(r, g, b));
            }
            if (
              uniqueColors.size > 1 ||
              (uniqueColors.size === 1 &&
                !uniqueColors.has('255,255,255') &&
                !uniqueColors.has('0,0,0'))
            ) {
              hasColors = true;
            }
          }
        }

        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const mat of materials) {
          if (!mat) continue;
          const m = mat as THREE.MeshStandardMaterial;
          // A texture map means UV-mapped image colours —
          // primary colour source for 3MF from Bambu Studio / PrusaSlicer.
          if (m.map || (m as any).alphaMap || (m as any).aoMap) {
            hasTextures = true;
            hasColors = true; // immediately set — no further checks needed
          }
          if (m.color instanceof THREE.Color) {
            const hex = m.color.getHexString();
            uniqueColors.add(hex);
            hexColorsSet.add('#' + hex.toUpperCase());
            if (
              hex !== 'ffffff' &&
              hex !== 'cccccc' &&
              hex !== '808080' &&
              hex !== 'eeeeee' &&
              hex !== '000000'
            ) {
              hasColors = true;
            }
          }
          if ((m as any).vertexColors) {
            hasColors = true;
          }
        }
      }
    });

    if (uniqueColors.size > 1 || hasTextures) {
      hasColors = true;
    }
  }

  return {
    hasColors,
    colorCount: uniqueColors.size,
    hasTextures,
    detectedColors: Array.from(hexColorsSet),
  };
}

/**
 * Common geometry analysis for STL, OBJ, and 3MF models:
 * - Computes bounding box dimensions (X, Y, Z in mm)
 * - Normalizes and centers geometry
 * - Calculates accurate signed tetrahedron volume (cm³)
 * - Counts triangles / polygons
 * - Verifies printer build envelope limits
 */
export function analyzeGeometry(
  geometry: THREE.BufferGeometry,
  fileName = 'model.stl',
  fileSizeBytes = 0,
  fileType: 'stl' | 'obj' | '3mf' | 'zip' = 'stl',
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume,
  object3d?: THREE.Object3D,
  hasOriginalColors = false,
  originalColorCount = 0,
  detectedColors?: string[],
  previewMode: PreviewMode = 'single_model',
  objects: PreviewObject[] = [],
  plates?: PreviewPlate[],
  activePlateId?: string
): ParsedModelResult {
  try {
    let dimensions = { x: 0, y: 0, z: 0 };
    let volume = 0;
    let triangleCount = 0;

    // Ensure objects array has at least one item
    if (objects.length === 0 && geometry) {
      objects = [
        {
          id: 'obj_1',
          name: fileName,
          geometry: bufferGeometryToParsedGeometry(geometry),
          color: detectedColors && detectedColors.length > 0 ? detectedColors[0] : undefined,
        },
      ];
    }

    if (object3d) {
      object3d.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(object3d);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      dimensions = {
        x: Math.round(Math.abs(size.x) * 10) / 10,
        y: Math.round(Math.abs(size.y) * 10) / 10,
        z: Math.round(Math.abs(size.z) * 10) / 10,
      };

      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      const p3 = new THREE.Vector3();
      object3d.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const geom = mesh.geometry;
          if (!geom) return;
          mesh.updateWorldMatrix(true, false);
          const mat = mesh.matrixWorld;
          const pos = geom.attributes.position;
          if (!pos) return;

          let meshVol = 0;
          if (geom.index) {
            const idx = geom.index;
            triangleCount += idx.count / 3;
            for (let i = 0; i < idx.count; i += 3) {
              p1.fromBufferAttribute(pos, idx.getX(i)).applyMatrix4(mat);
              p2.fromBufferAttribute(pos, idx.getX(i + 1)).applyMatrix4(mat);
              p3.fromBufferAttribute(pos, idx.getX(i + 2)).applyMatrix4(mat);
              meshVol += signedVolumeOfTriangle(p1, p2, p3);
            }
          } else {
            triangleCount += pos.count / 3;
            for (let i = 0; i < pos.count; i += 3) {
              p1.fromBufferAttribute(pos, i).applyMatrix4(mat);
              p2.fromBufferAttribute(pos, i + 1).applyMatrix4(mat);
              p3.fromBufferAttribute(pos, i + 2).applyMatrix4(mat);
              meshVol += signedVolumeOfTriangle(p1, p2, p3);
            }
          }
          volume += meshVol;
        }
      });
    } else {
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      if (!bbox) {
        throw new Error('Unable to compute bounding box from geometry.');
      }
      const size = new THREE.Vector3();
      bbox.getSize(size);
      dimensions = {
        x: Math.round(Math.abs(size.x) * 10) / 10,
        y: Math.round(Math.abs(size.y) * 10) / 10,
        z: Math.round(Math.abs(size.z) * 10) / 10,
      };

      geometry.center();
      geometry.computeVertexNormals();

      const position = geometry.attributes.position;
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      const p3 = new THREE.Vector3();

      if (geometry.index) {
        const index = geometry.index;
        triangleCount = index.count / 3;
        for (let i = 0; i < index.count; i += 3) {
          p1.fromBufferAttribute(position, index.getX(i));
          p2.fromBufferAttribute(position, index.getX(i + 1));
          p3.fromBufferAttribute(position, index.getX(i + 2));
          volume += signedVolumeOfTriangle(p1, p2, p3);
        }
      } else if (position) {
        triangleCount = position.count / 3;
        for (let i = 0; i < position.count; i += 3) {
          p1.fromBufferAttribute(position, i);
          p2.fromBufferAttribute(position, i + 1);
          p3.fromBufferAttribute(position, i + 2);
          volume += signedVolumeOfTriangle(p1, p2, p3);
        }
      }
    }

    // Convert from mm³ to cm³
    let volumeCm3 = Math.abs(volume) / 1000.0;
    volumeCm3 = Math.round(volumeCm3 * 100) / 100;

    // Fallback: If volume is 0 or non-manifold, estimate volume from bounding box (approx 30% bounding fill)
    let requiresManualReview = false;
    let reviewReason: string | undefined;

    if (volumeCm3 <= 0.01) {
      const bboxVolumeCm3 = (dimensions.x * dimensions.y * dimensions.z) / 1000.0;
      volumeCm3 = Math.max(0.1, Math.round(bboxVolumeCm3 * 0.3 * 100) / 100);
      requiresManualReview = true;
      reviewReason =
        'Non-manifold or open mesh geometry detected. Volume estimated; requires manual slicer verification.';
    }

    // If multi_plate, use active plate's stats for initial view if available
    if (previewMode === 'multi_plate' && plates && plates.length > 0) {
      const activePlate = plates.find((p) => p.id === activePlateId) || plates[0];
      if (activePlate) {
        dimensions = activePlate.dimensions;
        volumeCm3 = activePlate.volumeCm3;
        triangleCount = activePlate.triangleCount;
        if (activePlate.detectedColors && activePlate.detectedColors.length > 0) {
          detectedColors = activePlate.detectedColors;
          hasOriginalColors =
            detectedColors.length > 1 ||
            (detectedColors.length === 1 &&
              detectedColors[0] !== '#AAAAAA' &&
              detectedColors[0] !== '#FFFFFF');
          originalColorCount = detectedColors.length;
        }
      }
    }

    // Check if dimensions exceed build envelope
    const exceedsBuildVolume = checkBuildVolume(dimensions, maxBuildVolume);
    if (exceedsBuildVolume) {
      requiresManualReview = true;
      reviewReason = `Dimensions (${dimensions.x} × ${dimensions.y} × ${dimensions.z} mm) exceed the printer maximum build envelope (${maxBuildVolume.x} × ${maxBuildVolume.y} × ${maxBuildVolume.z} mm).`;
    }

    return {
      success: true,
      geometry,
      object3d,
      previewMode,
      objects,
      plates: plates && plates.length > 0 ? plates : undefined,
      activePlateId: activePlateId || (plates && plates.length > 0 ? plates[0].id : undefined),
      hasOriginalColors,
      originalColorCount,
      detectedColors: detectedColors && detectedColors.length > 0 ? detectedColors : undefined,
      fileName,
      fileSizeBytes,
      fileType,
      dimensions,
      volumeCm3,
      triangleCount: Math.round(triangleCount),
      exceedsBuildVolume,
      requiresManualReview,
      reviewReason,
    };
  } catch (err: any) {
    console.error('Failed to analyze 3D geometry:', err);
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType,
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: err?.message || 'Failed to process 3D model geometry.',
    };
  }
}

/**
 * Parses an STL ArrayBuffer (binary or ASCII).
 */
export function parseSTLArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName = 'model.stl',
  fileSizeBytes = 0,
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): ParsedModelResult {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      success: false,
      fileName,
      fileSizeBytes: 0,
      fileType: 'stl',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: 'The STL model buffer is empty or corrupted.',
    };
  }

  try {
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer);
    const colorInfo = detectOriginalColors(geometry, null);
    const parsedGeom = bufferGeometryToParsedGeometry(geometry);
    const previewObj: PreviewObject = {
      id: 'stl_object_1',
      name: fileName,
      geometry: parsedGeom,
      color: colorInfo.detectedColors?.[0],
    };

    return analyzeGeometry(
      geometry,
      fileName,
      fileSizeBytes,
      'stl',
      maxBuildVolume,
      undefined,
      colorInfo.hasColors,
      colorInfo.colorCount,
      colorInfo.detectedColors,
      'single_model',
      [previewObj]
    );
  } catch (err: any) {
    console.error('Failed to parse STL buffer:', err);
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: 'stl',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: err?.message || 'We could not read this STL file. Please verify it is a valid 3D model.',
    };
  }
}

/**
 * Parses an OBJ string / text content, optionally with MTL and texture assets.
 */
export function parseOBJText(
  text: string,
  fileName = 'model.obj',
  fileSizeBytes = 0,
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume,
  mtlText?: string,
  textureMap?: Record<string, string>
): ParsedModelResult {
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      fileName,
      fileSizeBytes: 0,
      fileType: 'obj',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: 'The OBJ model file is empty.',
    };
  }

  try {
    const objLoader = new OBJLoader();

    // If MTL materials text was provided, parse and attach materials
    if (mtlText && mtlText.trim().length > 0) {
      try {
        const manager = new THREE.LoadingManager();
        if (textureMap) {
          manager.setURLModifier((url) => {
            const clean = url.split('/').pop()?.toLowerCase() || '';
            return textureMap[clean] || url;
          });
        }
        const mtlLoader = new MTLLoader(manager);
        const materials = mtlLoader.parse(mtlText, '');
        materials.preload();
        objLoader.setMaterials(materials);
      } catch (mtlErr) {
        console.warn('Failed to parse accompanying MTL materials:', mtlErr);
      }
    }

    const objGroup = objLoader.parse(text);

    const geometries: THREE.BufferGeometry[] = [];
    const previewObjects: PreviewObject[] = [];

    objGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          const geom = mesh.geometry.clone();
          mesh.updateMatrix();
          geom.applyMatrix4(mesh.matrix);
          geometries.push(geom);

          const parsedGeom = bufferGeometryToParsedGeometry(mesh.geometry);
          let col: string | undefined;
          const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          if (m && 'color' in m && m.color instanceof THREE.Color) {
            col = '#' + m.color.getHexString().toUpperCase();
          }

          previewObjects.push({
            id: mesh.name || `obj_part_${previewObjects.length + 1}`,
            name: mesh.name || `Part ${previewObjects.length + 1}`,
            geometry: parsedGeom,
            transform: Array.from(mesh.matrix.elements),
            color: col,
            originalMaterial: mesh.material,
          });
        }
      }
    });

    if (geometries.length === 0) {
      throw new Error('No valid 3D mesh geometry found inside the OBJ file.');
    }

    const unifiedGeometry =
      geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    if (!unifiedGeometry) {
      throw new Error('Failed to merge sub-meshes in OBJ file.');
    }

    const colorInfo = detectOriginalColors(unifiedGeometry, objGroup);
    const previewMode: PreviewMode = previewObjects.length > 1 ? 'multi_object' : 'single_model';

    return analyzeGeometry(
      unifiedGeometry,
      fileName,
      fileSizeBytes,
      'obj',
      maxBuildVolume,
      objGroup,
      colorInfo.hasColors,
      colorInfo.colorCount,
      colorInfo.detectedColors,
      previewMode,
      previewObjects
    );
  } catch (err: any) {
    console.error('Failed to parse OBJ text:', err);
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: 'obj',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: err?.message || 'We could not parse this OBJ file.',
    };
  }
}

/**
 * Parses a 3MF ArrayBuffer, with two strategies:
 *
 * 1. Bambu Studio format — if the file contains `paint_color` attributes on triangles
 *    (Bambu's proprietary multi-colour face-painting system), we parse the colours
 *    ourselves and create a vertex-coloured geometry. This handles the majority of
 *    multi-colour models downloaded from Bambu Makerworld / Printables.
 *
 * 2. Standard 3MF — all other 3MF files (colour groups, base materials, textures)
 *    are handled by Three.js ThreeMFLoader.
 */
export async function parse3MFArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName = 'model.3mf',
  fileSizeBytes = 0,
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): Promise<ParsedModelResult> {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      success: false,
      fileName,
      fileSizeBytes: 0,
      fileType: '3mf',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: 'The 3MF file buffer is empty.',
    };
  }

  try {
    const zip = unzipSync(new Uint8Array(arrayBuffer));

    // 1. Read build items from 3D/3dmodel.model
    const buildItems: {
      index: number;
      objectId: string;
      transform?: number[];
      printable: boolean;
    }[] = [];

    const modelKey = Object.keys(zip).find((k) => k.toLowerCase().endsWith('3dmodel.model'));
    if (modelKey && zip[modelKey]) {
      const modelXml = strFromU8(zip[modelKey]);
      const itemRegex = /<item\s+([^>]+)(?:\/>|>[\s\S]*?<\/item>)/gi;
      let im: RegExpExecArray | null;
      while ((im = itemRegex.exec(modelXml)) !== null) {
        const attrs = im[1];
        const oidMatch = attrs.match(/objectid="([^"]+)"/i);
        const transMatch = attrs.match(/transform="([^"]+)"/i);
        const printableMatch = attrs.match(/printable="([^"]+)"/i);
        if (oidMatch) {
          buildItems.push({
            index: buildItems.length,
            objectId: oidMatch[1],
            transform: transMatch ? transMatch[1].trim().split(/\s+/).map(Number) : undefined,
            printable: printableMatch ? printableMatch[1] !== '0' : true,
          });
        }
      }
    }

    // 2. Read plate definitions from Metadata/model_settings.config
    const settingsKey = Object.keys(zip).find((k) =>
      k.toLowerCase().includes('model_settings.config')
    );
    const rawPlates: { id: string; name: string; objectIds: string[] }[] = [];

    if (settingsKey && zip[settingsKey]) {
      const settingsXml = strFromU8(zip[settingsKey]);
      const plateRegex = /<plate>([\s\S]*?)<\/plate>/gi;
      let pm: RegExpExecArray | null;
      while ((pm = plateRegex.exec(settingsXml)) !== null) {
        const plateBody = pm[1];
        const pidMatch = plateBody.match(/<metadata\s+key="plater_id"\s+value="([^"]+)"/i);
        const pnameMatch = plateBody.match(/<metadata\s+key="plater_name"\s+value="([^"]*)"/i);
        const pid = pidMatch ? pidMatch[1] : String(rawPlates.length + 1);
        const pname =
          pnameMatch && pnameMatch[1].trim() ? pnameMatch[1].trim() : `Plate ${pid}`;

        const objIds: string[] = [];
        const instRegex = /<model_instance>([\s\S]*?)<\/model_instance>/gi;
        let mim: RegExpExecArray | null;
        while ((mim = instRegex.exec(plateBody)) !== null) {
          const instBody = mim[1];
          const oMatch = instBody.match(/<metadata\s+key="object_id"\s+value="([^"]+)"/i);
          if (oMatch) {
            objIds.push(oMatch[1]);
          }
        }
        rawPlates.push({ id: pid, name: pname, objectIds: objIds });
      }
    }

    // 3. Classify previewMode and strictly validate plate mapping
    let previewMode: PreviewMode = 'single_model';
    let requiresPlateReview = false;
    let plateReviewReason: string | undefined;

    if (rawPlates.length > 1) {
      const buildObjIdSet = new Set(buildItems.map((b) => b.objectId));
      const allAssignedObjIds = new Set<string>();
      let hasInvalidRef = false;

      for (const p of rawPlates) {
        for (const oid of p.objectIds) {
          allAssignedObjIds.add(oid);
          if (!buildObjIdSet.has(oid)) {
            hasInvalidRef = true;
          }
        }
      }

      const unassignedCount = buildItems.filter((b) => !allAssignedObjIds.has(b.objectId)).length;

      if (!hasInvalidRef && unassignedCount === 0 && allAssignedObjIds.size > 0) {
        previewMode = 'multi_plate';
      } else {
        previewMode = 'multi_object';
        requiresPlateReview = true;
        plateReviewReason =
          'Plate metadata found, but object-instance mapping could not be resolved confidently.';
      }
    } else if (buildItems.length > 1) {
      previewMode = 'multi_object';
    } else {
      previewMode = 'single_model';
    }

    // 4. Single model Bambu painted format check
    if (previewMode === 'single_model') {
      try {
        const bambu = await parseBambu3MF(arrayBuffer);
        if (bambu.success && bambu.hasColors) {
          const parsedGeom = bufferGeometryToParsedGeometry(bambu.geometry);
          const previewObj: PreviewObject = {
            id: 'bambu_painted_1',
            name: fileName,
            geometry: parsedGeom,
            color: bambu.colors[0],
          };
          return analyzeGeometry(
            bambu.geometry,
            fileName,
            fileSizeBytes,
            '3mf',
            maxBuildVolume,
            undefined,
            true,
            bambu.colors.length,
            bambu.colors,
            'single_model',
            [previewObj]
          );
        }
        if (bambu.success && !bambu.hasColors) {
          const parsedGeom = bufferGeometryToParsedGeometry(bambu.geometry);
          const previewObj: PreviewObject = {
            id: 'bambu_single_1',
            name: fileName,
            geometry: parsedGeom,
            color: bambu.colors && bambu.colors.length > 0 ? bambu.colors[0] : undefined,
          };
          return analyzeGeometry(
            bambu.geometry,
            fileName,
            fileSizeBytes,
            '3mf',
            maxBuildVolume,
            undefined,
            false,
            1,
            bambu.colors && bambu.colors.length > 0 ? bambu.colors : undefined,
            'single_model',
            [previewObj]
          );
        }
      } catch (bambuErr) {
        console.warn('Bambu 3MF single model parse skipped/failed:', bambuErr);
      }
    }

    // 5. Standard ThreeMFLoader parse (Original transforms preserved!)
    const loader = new ThreeMFLoader();
    const group = loader.parse(arrayBuffer);
    group.updateMatrixWorld(true);

    let bambuResult: { hasColors: boolean; detectedColors: string[] } | null = null;
    try {
      bambuResult = applyBambuProjectMaterials(zip, group);
    } catch (bambuMatErr) {
      console.warn('Could not inspect 3MF package for Bambu project materials:', bambuMatErr);
    }

    // Fix texture colour spaces and material properties
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (!mat) return;
          const m = mat as THREE.MeshStandardMaterial;
          if (m.map) {
            m.map.colorSpace = THREE.SRGBColorSpace;
            m.map.needsUpdate = true;
          }
          if (m.emissiveMap) {
            m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            m.emissiveMap.needsUpdate = true;
          }
          if (m.roughness === undefined || m.roughness === 1) m.roughness = 0.55;
          if (m.metalness === undefined) m.metalness = 0.0;
          m.side = THREE.DoubleSide;
          m.needsUpdate = true;
        });
      }
    });

    // 6. Extract PreviewObject[] from group children
    const previewObjects: PreviewObject[] = [];
    const objectIdToPreviewObjIds = new Map<string, string[]>();

    group.children.forEach((child, childIdx) => {
      const bItem = buildItems[childIdx];
      const objId = bItem ? bItem.objectId : String(childIdx + 1);

      child.traverse((sub) => {
        if ((sub as THREE.Mesh).isMesh) {
          const mesh = sub as THREE.Mesh;
          if (mesh.geometry) {
            const parsedGeom = bufferGeometryToParsedGeometry(mesh.geometry);
            const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            let col: string | undefined;
            if (m && 'color' in m && m.color instanceof THREE.Color) {
              col = '#' + m.color.getHexString().toUpperCase();
            }

            mesh.updateWorldMatrix(true, false);
            const meshMat = mesh.matrixWorld.clone();
            const invGroup = group.matrixWorld.clone().invert();
            meshMat.premultiply(invGroup);

            const pObjId = `item_${childIdx}_mesh_${previewObjects.length + 1}`;
            const pObj: PreviewObject = {
              id: pObjId,
              name: mesh.name || `Object ${objId}`,
              geometry: parsedGeom,
              transform: Array.from(meshMat.elements),
              color: col,
              originalMaterial: mesh.material,
            };
            previewObjects.push(pObj);

            if (!objectIdToPreviewObjIds.has(objId)) {
              objectIdToPreviewObjIds.set(objId, []);
            }
            objectIdToPreviewObjIds.get(objId)!.push(pObjId);
          }
        }
      });
    });

    // 7. Construct PreviewPlate[] if multi_plate mode
    const plates: PreviewPlate[] = [];
    if (previewMode === 'multi_plate') {
      for (const p of rawPlates) {
        const plateObjIds: string[] = [];
        for (const oid of p.objectIds) {
          const mapped = objectIdToPreviewObjIds.get(oid);
          if (mapped) {
            plateObjIds.push(...mapped);
          }
        }

        const plateObjs = previewObjects.filter((o) => plateObjIds.includes(o.id));
        let pVolume = 0;
        let pTriangles = 0;
        const pColorsSet = new Set<string>();
        const plateGroup = new THREE.Group();

        for (const pObj of plateObjs) {
          const mesh = buildMeshForObject(pObj);
          plateGroup.add(mesh);
          if (pObj.color) pColorsSet.add(pObj.color);
        }

        plateGroup.updateMatrixWorld(true);
        const pBox = new THREE.Box3().setFromObject(plateGroup);
        const pSize = new THREE.Vector3();
        pBox.getSize(pSize);

        const p1 = new THREE.Vector3();
        const p2 = new THREE.Vector3();
        const p3 = new THREE.Vector3();
        plateGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            const g = m.geometry;
            const pos = g.attributes.position;
            if (!pos) return;
            const mat = m.matrixWorld;
            let mVol = 0;
            if (g.index) {
              const idx = g.index;
              pTriangles += idx.count / 3;
              for (let i = 0; i < idx.count; i += 3) {
                p1.fromBufferAttribute(pos, idx.getX(i)).applyMatrix4(mat);
                p2.fromBufferAttribute(pos, idx.getX(i + 1)).applyMatrix4(mat);
                p3.fromBufferAttribute(pos, idx.getX(i + 2)).applyMatrix4(mat);
                mVol += signedVolumeOfTriangle(p1, p2, p3);
              }
            } else {
              pTriangles += pos.count / 3;
              for (let i = 0; i < pos.count; i += 3) {
                p1.fromBufferAttribute(pos, i).applyMatrix4(mat);
                p2.fromBufferAttribute(pos, i + 1).applyMatrix4(mat);
                p3.fromBufferAttribute(pos, i + 2).applyMatrix4(mat);
                mVol += signedVolumeOfTriangle(p1, p2, p3);
              }
            }
            pVolume += mVol;
          }
        });

        let pVolCm3 = Math.round((Math.abs(pVolume) / 1000.0) * 100) / 100;
        if (pVolCm3 <= 0.01) {
          pVolCm3 = Math.max(
            0.1,
            Math.round(((pSize.x * pSize.y * pSize.z) / 1000.0) * 0.3 * 100) / 100
          );
        }

        plates.push({
          id: p.id,
          name: p.name,
          objectIds: plateObjIds,
          dimensions: {
            x: Math.round(Math.abs(pSize.x) * 10) / 10,
            y: Math.round(Math.abs(pSize.y) * 10) / 10,
            z: Math.round(Math.abs(pSize.z) * 10) / 10,
          },
          volumeCm3: pVolCm3,
          triangleCount: Math.round(pTriangles),
          detectedColors: Array.from(pColorsSet),
        });
      }
    }

    let representativeGeometry: THREE.BufferGeometry | undefined;
    group.traverse((child) => {
      if (!representativeGeometry && (child as THREE.Mesh).isMesh) {
        representativeGeometry = (child as THREE.Mesh).geometry;
      }
    });

    if (!representativeGeometry && previewObjects.length > 0) {
      representativeGeometry = new THREE.BufferGeometry();
      representativeGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(previewObjects[0].geometry.position, 3)
      );
    }

    if (!representativeGeometry) {
      throw new Error('No valid 3D mesh geometry found inside the 3MF package.');
    }

    const colorInfo = detectOriginalColors(representativeGeometry, group);
    const finalHasColors = (bambuResult && bambuResult.hasColors) || colorInfo.hasColors;
    const finalDetectedColors =
      bambuResult && bambuResult.detectedColors && bambuResult.detectedColors.length > 0
        ? bambuResult.detectedColors
        : colorInfo.detectedColors;

    const result = analyzeGeometry(
      representativeGeometry,
      fileName,
      fileSizeBytes,
      '3mf',
      maxBuildVolume,
      group,
      finalHasColors,
      finalDetectedColors.length,
      finalDetectedColors,
      previewMode,
      previewObjects,
      plates,
      plates.length > 0 ? plates[0].id : undefined
    );

    if (requiresPlateReview) {
      result.requiresManualReview = true;
      result.reviewReason = plateReviewReason;
    }

    return result;
  } catch (err: any) {
    console.error('Failed to parse 3MF buffer:', err);
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: '3mf',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: err?.message || 'We could not parse this 3MF file.',
    };
  }
}


/**
 * Unpacks and parses a ZIP archive containing 3D model files (STL, OBJ with MTL/textures, or 3MF).
 */
export async function parseZIPArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName = 'model.zip',
  fileSizeBytes = 0,
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): Promise<ParsedModelResult> {
  try {
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));
    const entries = Object.keys(unzipped);

    // 1. Look for 3MF model first
    const threeMFPath = entries.find((e) => e.toLowerCase().endsWith('.3mf'));
    if (threeMFPath) {
      const fileData = unzipped[threeMFPath];
      const buffer = fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      );
      return await parse3MFArrayBuffer(buffer, threeMFPath, fileData.byteLength, maxBuildVolume);
    }

    // 2. Look for OBJ model
    const objPath = entries.find((e) => e.toLowerCase().endsWith('.obj'));
    if (objPath) {
      const objData = unzipped[objPath];
      const objText = new TextDecoder().decode(objData);

      // Check for companion MTL in the same zip
      const mtlPath = entries.find((e) => e.toLowerCase().endsWith('.mtl'));
      let mtlText: string | undefined;
      if (mtlPath) {
        mtlText = new TextDecoder().decode(unzipped[mtlPath]);
      }

      // Map any texture images in the zip to object URLs
      const textureMap: Record<string, string> = {};
      for (const entry of entries) {
        const lower = entry.toLowerCase();
        if (
          lower.endsWith('.png') ||
          lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.webp')
        ) {
          const imgData = unzipped[entry];
          const mime = lower.endsWith('.png') ? 'image/png' : 'image/jpeg';
          const blob = new Blob([imgData], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          const baseName = entry.split('/').pop()?.toLowerCase() || '';
          textureMap[baseName] = blobUrl;
        }
      }

      return parseOBJText(
        objText,
        objPath,
        objData.byteLength,
        maxBuildVolume,
        mtlText,
        textureMap
      );
    }

    // 3. Look for STL model
    const stlPath = entries.find((e) => e.toLowerCase().endsWith('.stl'));
    if (stlPath) {
      const fileData = unzipped[stlPath];
      const buffer = fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      );
      return parseSTLArrayBuffer(buffer, stlPath, fileData.byteLength, maxBuildVolume);
    }

    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: 'zip',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: 'No STL, OBJ, or 3MF model file found inside the ZIP archive.',
    };
  } catch (err: any) {
    console.error('Failed to unpack ZIP file:', err);
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: 'zip',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: err?.message || 'Failed to extract 3D model from ZIP archive.',
    };
  }
}

/**
 * Parses an uploaded 3D file object or collection of files (STL, OBJ, 3MF, or ZIP).
 */
export async function parse3DModel(
  fileOrFiles: File | File[] | FileList,
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): Promise<ParsedModelResult> {
  let files: File[] = [];
  if (fileOrFiles instanceof File) {
    files = [fileOrFiles];
  } else if (fileOrFiles && 'length' in fileOrFiles) {
    files = Array.from(fileOrFiles);
  }

  if (files.length === 0) {
    return {
      success: false,
      fileName: 'model',
      fileSizeBytes: 0,
      fileType: 'unknown',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: 'The selected file is empty or missing.',
    };
  }

  // If multiple files uploaded (e.g. OBJ + MTL + PNG texture maps)
  if (files.length > 1) {
    const objFile = files.find((f) => f.name.toLowerCase().endsWith('.obj'));
    if (objFile) {
      const mtlFile = files.find((f) => f.name.toLowerCase().endsWith('.mtl'));
      const imageFiles = files.filter((f) => {
        const n = f.name.toLowerCase();
        return (
          n.endsWith('.png') ||
          n.endsWith('.jpg') ||
          n.endsWith('.jpeg') ||
          n.endsWith('.webp')
        );
      });

      let mtlText: string | undefined;
      if (mtlFile) {
        mtlText = await mtlFile.text();
      }

      const textureMap: Record<string, string> = {};
      for (const img of imageFiles) {
        textureMap[img.name.toLowerCase()] = URL.createObjectURL(img);
      }

      const objText = await objFile.text();
      return parseOBJText(
        objText,
        objFile.name,
        objFile.size,
        maxBuildVolume,
        mtlText,
        textureMap
      );
    }

    const threeMFFile = files.find((f) => f.name.toLowerCase().endsWith('.3mf'));
    if (threeMFFile) {
      const buffer = await threeMFFile.arrayBuffer();
      return await parse3MFArrayBuffer(buffer, threeMFFile.name, threeMFFile.size, maxBuildVolume);
    }

    const stlFile = files.find((f) => f.name.toLowerCase().endsWith('.stl'));
    if (stlFile) {
      const buffer = await stlFile.arrayBuffer();
      return parseSTLArrayBuffer(buffer, stlFile.name, stlFile.size, maxBuildVolume);
    }
  }

  // Single file handling
  const file = files[0];
  const fileName = file.name;
  const fileSizeBytes = file.size;
  const lowerName = fileName.toLowerCase();

  try {
    if (lowerName.endsWith('.zip')) {
      const arrayBuffer = await file.arrayBuffer();
      return await parseZIPArrayBuffer(arrayBuffer, fileName, fileSizeBytes, maxBuildVolume);
    } else if (lowerName.endsWith('.stl')) {
      const arrayBuffer = await file.arrayBuffer();
      return parseSTLArrayBuffer(arrayBuffer, fileName, fileSizeBytes, maxBuildVolume);
    } else if (lowerName.endsWith('.obj')) {
      const text = await file.text();
      return parseOBJText(text, fileName, fileSizeBytes, maxBuildVolume);
    } else if (lowerName.endsWith('.3mf')) {
      const arrayBuffer = await file.arrayBuffer();
      return await parse3MFArrayBuffer(arrayBuffer, fileName, fileSizeBytes, maxBuildVolume);
    } else {
      return {
        success: false,
        fileName,
        fileSizeBytes,
        fileType: 'unknown',
        previewMode: 'single_model',
        objects: [],
        dimensions: { x: 0, y: 0, z: 0 },
        volumeCm3: 0,
        triangleCount: 0,
        exceedsBuildVolume: false,
        requiresManualReview: true,
        errorMessage:
          'Unsupported file format. Please upload an STL (.stl), OBJ (.obj), 3MF (.3mf), or ZIP package.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: 'unknown',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: err?.message || 'Failed to read 3D model file from disk.',
    };
  }
}

/**
 * Downloads and parses a 3D model (STL, OBJ, 3MF, or ZIP) from a remote URL.
 */
export async function parse3DFromUrl(
  url: string,
  fileName = 'model.stl',
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): Promise<ParsedModelResult> {
  try {
    const lowerName = fileName.toLowerCase();
    let arrayBuffer: ArrayBuffer;
    let text = '';

    if (url.startsWith('local:')) {
      const blob = await getModelLocally(url);
      if (!blob) {
        throw new Error('Local model not found in storage cache.');
      }
      if (lowerName.endsWith('.obj')) {
        text = await blob.text();
        return parseOBJText(text, fileName, text.length, maxBuildVolume);
      } else {
        arrayBuffer = await blob.arrayBuffer();
      }
    } else {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load file from storage (HTTP ${response.status})`);
      }
      if (lowerName.endsWith('.obj')) {
        text = await response.text();
        return parseOBJText(text, fileName, text.length, maxBuildVolume);
      } else {
        arrayBuffer = await response.arrayBuffer();
      }
    }

    if (lowerName.endsWith('.zip')) {
      return await parseZIPArrayBuffer(arrayBuffer, fileName, arrayBuffer.byteLength, maxBuildVolume);
    } else if (lowerName.endsWith('.3mf')) {
      return await parse3MFArrayBuffer(arrayBuffer, fileName, arrayBuffer.byteLength, maxBuildVolume);
    } else {
      return parseSTLArrayBuffer(arrayBuffer, fileName, arrayBuffer.byteLength, maxBuildVolume);
    }
  } catch (err: any) {
    console.error('Failed to fetch/parse 3D model from URL:', err);
    return {
      success: false,
      fileName,
      fileSizeBytes: 0,
      fileType: 'unknown',
      previewMode: 'single_model',
      objects: [],
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: err?.message || 'Unable to download 3D model from storage URL.',
    };
  }
}

/** Backward compatibility alias */
export const parseSTLFromUrl = parse3DFromUrl;

/** Backward compatibility alias */
export const parseSTLModel = parse3DModel;



