import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ParsedModelResult } from './modelTypes';
import { checkBuildVolume } from '../pricing/calculateQuote';
import { DEFAULT_PRICING_CONFIG } from '../pricing/pricingConfig';

function signedVolumeOfTriangle(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3
): number {
  return p1.dot(p2.cross(p3)) / 6.0;
}

/**
 * Parses an STL ArrayBuffer (binary or ASCII) and performs geometric analysis:
 * - Extracts bounding box dimensions (X, Y, Z in mm)
 * - Calculates accurate signed tetrahedron volume (cm³)
 * - Counts triangles / polygons
 * - Verifies build envelope limits
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
      errorMessage: 'The model buffer is empty or corrupted.',
    };
  }

  try {
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer);

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

    // Center geometry for viewer
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
    } else {
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
      : position.count / 3;

    // Fallback: If volume is 0 or non-manifold, estimate volume from bounding box (approx 30% bounding fill)
    let requiresManualReview = false;
    let reviewReason: string | undefined;

    if (volumeCm3 <= 0.01) {
      // Geometry might have inverted normals or holes
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
      fileType: 'stl',
      dimensions,
      volumeCm3,
      triangleCount: Math.round(triangleCount),
      exceedsBuildVolume,
      requiresManualReview,
      reviewReason,
    };
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
      errorMessage:
        err?.message ||
        'We could not read this 3D model. Please verify the STL format and try again.',
    };
  }
}

/**
 * Downloads and parses an STL model from a remote URL (e.g. Cloudflare R2).
 */
export async function parseSTLFromUrl(
  url: string,
  fileName = 'model.stl',
  maxBuildVolume = DEFAULT_PRICING_CONFIG.maxBuildVolume
): Promise<ParsedModelResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load file from storage (HTTP ${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return parseSTLArrayBuffer(arrayBuffer, fileName, arrayBuffer.byteLength, maxBuildVolume);
  } catch (err: any) {
    console.error('Failed to fetch/parse STL from URL:', err);
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
      errorMessage: err?.message || 'Unable to download 3D model from storage URL.',
    };
  }
}

/**
 * Parses an uploaded STL File object from disk.
 */
export async function parseSTLModel(
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
      fileType: 'stl',
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      triangleCount: 0,
      exceedsBuildVolume: false,
      requiresManualReview: true,
      errorMessage: 'The selected file is empty or corrupted.',
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    return parseSTLArrayBuffer(arrayBuffer, fileName, fileSizeBytes, maxBuildVolume);
  } catch (err: any) {
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
      errorMessage: err?.message || 'Failed to read file from disk.',
    };
  }
}

