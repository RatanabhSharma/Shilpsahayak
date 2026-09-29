export interface SlicingSuccessResult {
  status: 'completed';
  quoteId?: string;
  fileSha256?: string;
  weight_source?: string;
  printer_id?: string;
  profile_id?: string;
  profileApplied?: string;
  profile_version?: string;
  activeEnvelope?: { x: number; y: number; z: number };
  multicolorSummary?: any;
  quote?: any;
}
export interface ColorAnalysis {
  hex: string;
  percentage: number;
}
export interface UniversalModelAnalysis {
  success: boolean;
  format?: string;
  fileName?: string;
  fileSizeBytes?: number;
  analysisVersion?: string;
  units?: { linear?: string; source?: string; declaredUnit?: string; note?: string };
  geometry?: {
    dimensions?: { x: number; y: number; z: number };
    boundingBox?: unknown;
    volumeCm3?: number;
    surfaceAreaCm2?: number;
  };
  textures?: { count: number; resolutionInfo?: string };
  colors?: string[];
  materials?: string[];
  project?: { slicerOrigin?: string };
  warnings?: string[];
  error?: string;
}
