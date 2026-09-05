import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ParsedModelResult } from './modelTypes';
import { checkBuildVolume } from '../pricing/calculateQuote';
import { DEFAULT_PRICING_CONFIG } from '../pricing/pricingConfig';
import { getModelLocally } from '../../utils/uploadFile';

function signedVolumeOfTriangle(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3
): number {
  return p1.dot(p2.cross(p3)) / 6.0;
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
  fileType: 'stl' | 'obj' | '3mf' = 'stl',
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): ParsedModelResult {
  try {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;

    if (!bbox) {
      throw new Error('Unable to compute bounding box from geometry.');
    }

    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Dimensions in mm
    const dimensions = {
      x: Math.round(Math.abs(size.x) * 10) / 10,
      y: Math.round(Math.abs(size.y) * 10) / 10,
      z: Math.round(Math.abs(size.z) * 10) / 10,
    };

    // Center geometry for viewer and rotation pivots
    geometry.center();
    geometry.computeVertexNormals();

    // Calculate signed tetrahedron volume
    const position = geometry.attributes.position;
    let volume = 0;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();

    if (geometry.index) {
      const index = geometry.index;
      for (let i = 0; i < index.count; i += 3) {
        p1.fromBufferAttribute(position, index.getX(i));
        p2.fromBufferAttribute(position, index.getX(i + 1));
        p3.fromBufferAttribute(position, index.getX(i + 2));
        volume += signedVolumeOfTriangle(p1, p2, p3);
      }
    } else if (position) {
      for (let i = 0; i < position.count; i += 3) {
        p1.fromBufferAttribute(position, i);
        p2.fromBufferAttribute(position, i + 1);
        p3.fromBufferAttribute(position, i + 2);
        volume += signedVolumeOfTriangle(p1, p2, p3);
      }
    }

    // Convert from mm³ to cm³
    let volumeCm3 = Math.abs(volume) / 1000.0;
    volumeCm3 = Math.round(volumeCm3 * 100) / 100;

    const triangleCount = geometry.index
      ? geometry.index.count / 3
      : (position?.count || 0) / 3;

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

    // Check if dimensions exceed build envelope
    const exceedsBuildVolume = checkBuildVolume(dimensions, maxBuildVolume);
    if (exceedsBuildVolume) {
      requiresManualReview = true;
      reviewReason = `Dimensions (${dimensions.x} × ${dimensions.y} × ${dimensions.z} mm) exceed the printer maximum build envelope (${maxBuildVolume.x} × ${maxBuildVolume.y} × ${maxBuildVolume.z} mm).`;
    }

    return {
      success: true,
      geometry,
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
    return analyzeGeometry(geometry, fileName, fileSizeBytes, 'stl', maxBuildVolume);
  } catch (err: any) {
    console.error('Failed to parse STL buffer:', err);
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: 'stl',
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
 * Parses an OBJ string / text content.
 */
export function parseOBJText(
  text: string,
  fileName = 'model.obj',
  fileSizeBytes = 0,
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): ParsedModelResult {
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      fileName,
      fileSizeBytes: 0,
      fileType: 'obj',
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: 'The OBJ model file is empty.',
    };
  }

  try {
    const loader = new OBJLoader();
    const objGroup = loader.parse(text);

    const geometries: THREE.BufferGeometry[] = [];
    objGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          const geom = mesh.geometry.clone();
          mesh.updateMatrix();
          geom.applyMatrix4(mesh.matrix);
          geometries.push(geom);
        }
      }
    });

    if (geometries.length === 0) {
      throw new Error('No valid 3D mesh geometry found inside the OBJ file.');
    }

    const unifiedGeometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    if (!unifiedGeometry) {
      throw new Error('Failed to merge sub-meshes in OBJ file.');
    }

    return analyzeGeometry(unifiedGeometry, fileName, fileSizeBytes, 'obj', maxBuildVolume);
  } catch (err: any) {
    console.error('Failed to parse OBJ text:', err);
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: 'obj',
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
 * Parses a 3MF ArrayBuffer container.
 */
export function parse3MFArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName = 'model.3mf',
  fileSizeBytes = 0,
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): ParsedModelResult {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return {
      success: false,
      fileName,
      fileSizeBytes: 0,
      fileType: '3mf',
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: 'The 3MF file buffer is empty.',
    };
  }

  try {
    const loader = new ThreeMFLoader();
    const group = loader.parse(arrayBuffer);

    const geometries: THREE.BufferGeometry[] = [];
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          const geom = mesh.geometry.clone();
          mesh.updateMatrix();
          geom.applyMatrix4(mesh.matrix);
          geometries.push(geom);
        }
      }
    });

    if (geometries.length === 0) {
      throw new Error('No valid 3D mesh geometry found inside the 3MF package.');
    }

    const unifiedGeometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    if (!unifiedGeometry) {
      throw new Error('Failed to extract geometry from 3MF package.');
    }

    return analyzeGeometry(unifiedGeometry, fileName, fileSizeBytes, '3mf', maxBuildVolume);
  } catch (err: any) {
    console.error('Failed to parse 3MF buffer:', err);
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: '3mf',
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
 * Parses an uploaded 3D file object (STL, OBJ, or 3MF).
 */
export async function parse3DModel(
  file: File,
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): Promise<ParsedModelResult> {
  const fileName = file.name;
  const fileSizeBytes = file.size;

  if (!file || fileSizeBytes === 0) {
    return {
      success: false,
      fileName,
      fileSizeBytes: 0,
      fileType: 'unknown',
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: 'The selected file is empty or corrupted.',
    };
  }

  const lowerName = fileName.toLowerCase();

  try {
    if (lowerName.endsWith('.stl')) {
      const arrayBuffer = await file.arrayBuffer();
      return parseSTLArrayBuffer(arrayBuffer, fileName, fileSizeBytes, maxBuildVolume);
    } else if (lowerName.endsWith('.obj')) {
      const text = await file.text();
      return parseOBJText(text, fileName, fileSizeBytes, maxBuildVolume);
    } else if (lowerName.endsWith('.3mf')) {
      const arrayBuffer = await file.arrayBuffer();
      return parse3MFArrayBuffer(arrayBuffer, fileName, fileSizeBytes, maxBuildVolume);
    } else {
      return {
        success: false,
        fileName,
        fileSizeBytes,
        fileType: 'unknown',
        dimensions: { x: 0, y: 0, z: 0 },
        volumeCm3: 0,
        triangleCount: 0,
        exceedsBuildVolume: false,
        requiresManualReview: true,
        errorMessage: 'Unsupported file format. Please upload an STL (.stl), OBJ (.obj), or 3MF (.3mf) model.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: 'unknown',
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
 * Downloads and parses a 3D model (STL, OBJ, or 3MF) from a remote URL.
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

    if (lowerName.endsWith('.3mf')) {
      return parse3MFArrayBuffer(arrayBuffer, fileName, arrayBuffer.byteLength, maxBuildVolume);
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



