import * as THREE from 'three';

export type PreviewMode = 'single_model' | 'multi_object' | 'multi_plate';

/**
 * Pure geometry buffer representation returned by parsers.
 * Decoupled from THREE.BufferGeometry and the rendering layer.
 */
export interface ParsedGeometry {
  position: Float32Array;
  normal?: Float32Array;
  color?: Float32Array;
  uv?: Float32Array;
  index?: Uint32Array | Uint16Array;
}

export interface PreviewObject {
  id: string;
  name?: string;
  geometry: ParsedGeometry;
  transform?: number[]; // 16-element column-major matrix or 12-element affine transform
  color?: string;
  materialIndex?: number;
  originalMaterial?: THREE.Material | THREE.Material[];
}

export interface PreviewPlate {
  id: string;
  name: string;
  objectIds: string[];
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  volumeCm3: number;
  triangleCount: number;
  detectedColors?: string[];
}

export type ParsedModelResult = {
  success: boolean;
  fileName: string;
  fileSizeBytes: number;
  fileType: 'stl' | 'obj' | '3mf' | 'zip' | 'unknown';
  previewMode: PreviewMode;

  // Pure data: objects and plate definitions
  objects: PreviewObject[];
  plates?: PreviewPlate[];
  activePlateId?: string;

  // Bridge fields during scene construction
  geometry?: THREE.BufferGeometry;
  object3d?: THREE.Object3D;

  // Colors & Attributes
  hasOriginalColors?: boolean;
  originalColorCount?: number;
  detectedColors?: string[];

  // Dimensions & Metrics (reflecting active plate or model)
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  volumeCm3: number;
  triangleCount: number;

  exceedsBuildVolume: boolean;
  requiresManualReview: boolean;
  reviewReason?: string;
  errorMessage?: string;
};

