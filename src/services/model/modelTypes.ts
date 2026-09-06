import * as THREE from 'three';

export type ParsedModelResult = {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  object3d?: THREE.Object3D;
  hasOriginalColors?: boolean;
  originalColorCount?: number;
  fileName: string;
  fileSizeBytes: number;
  fileType: 'stl' | 'obj' | '3mf' | 'zip' | 'unknown';

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

