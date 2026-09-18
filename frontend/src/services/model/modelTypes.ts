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
  originalColor?: Float32Array;
  uv?: Float32Array;
  index?: Uint32Array | Uint16Array;
  filamentSlots?: Uint8Array;
}

export interface ProductionColorMapping {
  /** 1-based filament slot index from 3MF metadata (or extruder number) */
  sourceFilament: number;
  /** Original color hex code extracted from model */
  originalHex: string;
  /** Production color hex selected for manufacturing / 3D preview */
  productionHex: string;
  /** Production material identifier (e.g. 'petg', 'pla') */
  materialId?: string;
  /** Production material display name (e.g. 'PETG', 'PLA') */
  materialType?: string;
  /** Assigned physical AMS slot number (1..N), or null if unassigned */
  amsSlot?: number | null;
}

/** Backward-compatible alias for 3D viewer vertex color updates */
export type ColorReplacement = ProductionColorMapping;

export interface PreviewObject {
  id: string;
  name?: string;
  geometry: ParsedGeometry;
  transform?: number[]; // 16-element column-major matrix or 12-element affine transform
  color?: string;
  sourceFilament?: number;
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

export interface DetectedColor {
  index: number;
  hex: string;
  sourceFilament: number;
  colorName?: string;
  materialType?: string;
  density?: number;
  materialName?: string;
  vendor?: string;
}

export interface ColorAnalysis {
  success: boolean;
  isMultiColor: boolean;
  colors: DetectedColor[];
  objectExtruders?: Record<string, number>;
  paletteSize?: number;
  error?: string;
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
  colorAnalysis?: ColorAnalysis | null;

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

