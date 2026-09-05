import * as THREE from 'three';

export type ParsedModelResult = {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  fileName: string;
  fileSizeBytes: number;
  fileType: 'stl' | 'obj' | '3mf' | 'unknown';

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

