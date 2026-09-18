/**
 * Typed Client for Shilp Studio Slicing Service
 * Interfaces with the backend slicing service to provide reliable slicer-backed quotes.
 */

import type { DetectedColor, ColorAnalysis } from '../model/modelTypes';
import type { ProductionPrinterProfile } from '../pricing/pricingTypes';
export type { DetectedColor, ColorAnalysis };

export interface FilamentUsageDetail {
  index: number;
  colorHex: string;
  colorName?: string;
  materialType: string;
  modelGrams: number;
  totalGrams: number;
  purgeGrams: number;
  supportGrams?: number;
  towerGrams?: number;
}

export interface PlateProductionResult {
  plateId: number;
  dimensions: { x: number; y: number; z: number };
  printTimeSeconds: number;
  filamentGrams: number;
  modelFilamentGrams?: number;
  supportFilamentGrams?: number;
  purgeFilamentGrams?: number;
  towerFilamentGrams?: number;
  toolChangeCount: number;
  perFilament: FilamentUsageDetail[];
  metricSources?: Record<string, string>;
}

export interface MulticolorSummary {
  mode: 'single_material' | 'multicolor';
  isMulticolor: boolean;
  totalFilamentGrams: number;
  modelFilamentGrams: number;
  purgeFilamentGrams: number;
  printTimeSeconds: number;
  toolChangeCount?: number;
  slicerAdapter?: string;
  filaments: FilamentUsageDetail[];
}

export interface SlicingStatistics {
  filament_grams: number;
  filament_mm: number;
  print_time_seconds: number;
  print_time_minutes: number;
  print_time_hours: number;
  raw_time_string: string;
  tool_change_count?: number;
  model_filament_grams?: number;
  purge_filament_grams?: number;
  support_filament_grams?: number;
  tower_filament_grams?: number;
  plates?: PlateProductionResult[];
  metric_sources?: Record<string, string>;
  diagnostics?: Record<string, unknown>;
  per_filament?: Array<{
    filamentIndex: number;
    color?: string;
    colorHex?: string;
    materialType?: string;
    modelGrams?: number;
    totalGrams?: number;
    purgeGrams?: number;
  }>;
}

export interface InternalPricingBreakdown {
  materialCost: number;
  electricityCost: number;
  machineWearCost: number;
  failureBufferCost: number;
  labourCost: number;
  baseServiceFee: number;
  unitProductionCost: number;
  unitMarkupAmount: number;
  productionCost?: number;
  markupAmount?: number;
}

export interface AuthoritativeQuote {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  packagingAmount: number;
  subtotalBeforeGst: number;
  minimumOrderChargeApplied: boolean;
  gstAmount: number;
  totalPrice: number;
  exceedsBuildVolume: boolean;
  weightSource?: 'slicer_grams' | 'unavailable';
  timeSource?: 'slicer_toolpath';
  quoteStatus: 'production_verified' | 'manual_review';
  requiresManualReview?: boolean;
  reviewReason?: string;
  pricingBreakdown: InternalPricingBreakdown;
}

export interface SlicingSuccessResult {
  status: 'completed';
  slicing_status: 'completed';
  dimensions: { x: number; y: number; z: number };
  filament_grams: number;
  filament_mm?: number;
  print_time_seconds: number;
  raw_time_string: string;
  profile_id: string;
  profile_version?: string;
  printer_id?: string;
  active_envelope?: { x: number; y: number; z: number } | null;
  classification?: string;
  weight_source: 'slicer_grams' | 'unavailable';
  time_source: 'slicer_toolpath';
  quoteStatus: 'production_verified' | 'manual_review';
  statistics: SlicingStatistics;
  quote: AuthoritativeQuote;
  plates?: PlateProductionResult[];
  metricSources?: Record<string, string>;
  diagnostics?: Record<string, unknown>;
  slicerVersion: string;
  profileApplied: string;
  pricingVersion?: string;
  pricingSourceIsLiveAdminConfig?: boolean;
  pricingSource?: string;
  pricingUpdatedAt?: string | null;
  activeEnvelope?: { x: number; y: number; z: number } | null;
  quoteId?: string;
  fileSha256?: string;
  jobConfigHash?: string;
  meshRepairStatus?: string;
  calculationTrace?: Record<string, unknown>;
  colorAnalysis?: ColorAnalysis | null;
  color_analysis?: ColorAnalysis | null;
  modelAnalysis?: UniversalModelAnalysis | null;
  model_analysis?: UniversalModelAnalysis | null;
  multicolorSummary?: MulticolorSummary;
  adapter?: string;
  slicerAdapter?: string;
  colourMode?: string;
  sourceProject?: Record<string, unknown> | null;
  /** The automatically-selected production printer profile for this job (internal, not customer-facing). */
  productionPrinterProfile?: ProductionPrinterProfile | Record<string, unknown>;
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
    triangleCount?: number;
    vertexCount?: number;
  };
  objects?: Array<Record<string, unknown>>;
  colors?: Array<Record<string, unknown>>;
  materials?: Array<Record<string, unknown>>;
  materialAssignments?: Array<Record<string, unknown>>;
  textures?: string[];
  meshHealth?: Record<string, unknown>;
  project?: Record<string, unknown>;
  capabilities?: Record<string, boolean>;
  missingInformation?: string[];
  assumptions?: string[];
  processing?: Record<string, unknown>;
  colorAnalysis?: ColorAnalysis | null;
}

export interface SlicingFailureResult {
  status: 'failed';
  error: string;
  error_code?: string;
  classification?: string;
}

export type SlicingResult = SlicingSuccessResult | SlicingFailureResult;

const SLICER_SERVICE_URL = import.meta.env.VITE_SLICER_SERVICE_URL || 'http://127.0.0.1:8000';

export interface SliceJobParams {
  file: File | Blob;
  fileName: string;
  material: string;
  qualityProfile: string;
  infillPercent: number;
  scaleFactor: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  requestedDimensions?: { x: number; y: number; z: number };
  quantity: number;
  supportMode?: string;
  packagingIncluded: boolean;
  idempotencyKey?: string;
  forceReslice?: boolean;
  onProgress?: (stageMessage: string) => void;
  /**
   * Live admin-configured pricing data from Firestore (settings/pricing, via
   * usePricingSettings()). MUST be supplied on every real customer request -
   * the backend falls back to its own hardcoded defaults if omitted, which
   * will silently drift from whatever the admin has actually configured.
   */
  pricingConfig?: unknown;
  materials?: { id: string; pricePerGram: number; density: number }[];
  quantityDiscounts?: { minQuantity: number; maxQuantity?: number; discountPercent: number }[];
  pricingVersion?: string;
  /**
   * The currently active production printer profile from Admin settings.
   * Kept for backward compatibility — the backend prefers `productionPrinterProfiles` (list).
   */
  productionPrinterProfile?: ProductionPrinterProfile;
  /**
   * Full list of admin-configured production printer profiles (enabled and disabled).
   * When present, the backend automatically selects the most eligible printer
   * based on model dimensions and required capabilities (e.g. multicolor).
   * The customer never sees printer names — this is entirely an internal
   * Shilp responsibility.
   */
  productionPrinterProfiles?: ProductionPrinterProfile[];
}

/**
 * Normalizes raw slicer statistics and production metadata into a standardized MulticolorSummary.
 * Handles both single-material and multicolor jobs defensively with safe fallbacks.
 */
export function normalizeMulticolorSummary(
  slice: any,
  production?: any
): MulticolorSummary {
  const rawStats = slice?.statistics || {};
  const isMulticolor = Boolean(
    production?.colourMode === 'multicolour' ||
    production?.colourMode === 'multicolor' ||
    (Array.isArray(rawStats.per_filament) && rawStats.per_filament.length > 1)
  );

  const totalFilamentGrams = Number(
    slice?.filamentGrams ?? rawStats.filament_grams ?? 0
  );

  const rawPerFilament = Array.isArray(rawStats.per_filament) ? rawStats.per_filament : [];
  const filaments: FilamentUsageDetail[] = rawPerFilament.map((f: any, idx: number) => {
    const mG = Number(f.modelGrams ?? f.main_used_g ?? 0);
    const tG = Number(f.totalGrams ?? f.total_used_g ?? mG);
    const pG = Number(f.purgeGrams ?? Math.max(0, tG - mG));
    return {
      index: Number(f.filamentIndex ?? f.id ?? idx + 1),
      colorHex: f.colorHex || f.color || f.hex || '#161616',
      colorName: f.colorName,
      materialType: f.materialType || f.material || (production?.material ? String(production.material).toUpperCase() : 'PLA'),
      modelGrams: Math.round(mG * 100) / 100,
      totalGrams: Math.round(tG * 100) / 100,
      purgeGrams: Math.round(pG * 100) / 100,
    };
  });

  const calculatedModelG = filaments.length > 0
    ? Math.round(filaments.reduce((acc, f) => acc + f.modelGrams, 0) * 100) / 100
    : Number(rawStats.model_filament_grams ?? totalFilamentGrams);

  const calculatedPurgeG = filaments.length > 0
    ? Math.round(filaments.reduce((acc, f) => acc + f.purgeGrams, 0) * 100) / 100
    : Number(rawStats.purge_filament_grams ?? 0);

  return {
    mode: isMulticolor ? 'multicolor' : 'single_material',
    isMulticolor,
    totalFilamentGrams: Math.round(totalFilamentGrams * 100) / 100,
    modelFilamentGrams: calculatedModelG,
    purgeFilamentGrams: calculatedPurgeG,
    printTimeSeconds: Number(slice?.printTimeSeconds ?? rawStats.print_time_seconds ?? 0),
    toolChangeCount: rawStats.tool_change_count,
    slicerAdapter: slice?.adapter ?? production?.slicerAdapter,
    filaments,
  };
}

/**
 * Normalizes completed job payload into authoritative SlicingSuccessResult.
 * Handles both fresh slicer outputs and cached completions.
 */
export function parseSuccessfulJobResult(pollData: any): SlicingSuccessResult {
  const res = pollData.result || {};
  const slice = res.slice || {};
  const pricing = res.pricing || {};

  const quote = {
    unitPrice: pricing.unitPrice ?? 0,
    quantity: pricing.quantity ?? 1,
    subtotal: pricing.subtotal ?? 0,
    discountAmount: pricing.discountAmount ?? 0,
    discountedSubtotal: pricing.discountedSubtotal ?? 0,
    packagingAmount: pricing.packagingAmount ?? 0,
    subtotalBeforeGst:
      pricing.subtotalBeforeGst ?? pricing.subtotalBeforeTax ?? 0,
    minimumOrderChargeApplied:
      pricing.minimumOrderChargeApplied ?? false,
    gstAmount: pricing.gstAmount ?? pricing.taxAmount ?? 0,
    totalPrice: pricing.totalPrice ?? 0,
    quoteStatus:
      pricing.quoteStatus ??
      (pricing.exceedsBuildVolume
        ? 'manual_review'
        : 'production_verified'),
    exceedsBuildVolume: pricing.exceedsBuildVolume ?? false,
    pricingBreakdown: pricing.pricingBreakdown ?? {},
  };

  const rawStats = slice.statistics || {};
  const totalFilamentGrams = Number(
    slice.filamentGrams ?? rawStats.filament_grams ?? 0
  );
  const multicolorSummary = normalizeMulticolorSummary(slice, res.production);

  return {
    status: 'completed',
    slicing_status: 'completed',
    dimensions: slice.dimensions || { x: 0, y: 0, z: 0 },
    filament_grams: totalFilamentGrams,
    filament_mm:
      slice.filamentMm ??
      rawStats.filament_mm,
    print_time_seconds:
      slice.printTimeSeconds ??
      rawStats.print_time_seconds ??
      0,
    raw_time_string:
      slice.rawTimeString ??
      rawStats.raw_time_string ??
      '',
    profile_id:
      res.profile_id ||
      res.profileApplied ||
      res.production?.printerProfile ||
      'standard',
    profile_version:
      res.profile_version ||
      res.profileVersion ||
      res.production?.profileVersion,
    printer_id:
      res.printer_id ||
      res.production?.printerId ||
      'bambu_production',
    active_envelope:
      res.active_envelope ||
      res.activeEnvelope ||
      res.production?.activeEnvelope ||
      null,
    classification: res.classification,
    weight_source:
      res.weight_source ||
      'slicer_grams',
    time_source:
      res.time_source ||
      'slicer_toolpath',
    quoteStatus: quote.quoteStatus,
    statistics: slice.statistics,
    plates: slice.plates || rawStats.plates,
    metricSources: slice.metricSources || rawStats.metric_sources,
    diagnostics: slice.diagnostics || rawStats.diagnostics,
    quote,
    slicerVersion:
      res.slicerVersion ||
      slice.slicerVersion ||
      '2.9.0',
    profileApplied:
      res.profileApplied ||
      res.production?.profileApplied ||
      'standard',
    pricingVersion: res.pricingVersion,
    pricingSourceIsLiveAdminConfig:
      res.pricingSourceIsLiveAdminConfig,
    pricingSource: res.pricingSource,
    pricingUpdatedAt:
      res.pricingUpdatedAt ?? null,
    activeEnvelope:
      res.activeEnvelope ??
      res.active_envelope ??
      res.production?.activeEnvelope ??
      null,
    quoteId:
      pollData.quoteId ||
      res.quoteId,
    fileSha256:
      pollData.fileSha256 ||
      res.fileSha256,
    jobConfigHash:
      pollData.jobConfigHash ||
      res.jobConfigHash,
    meshRepairStatus:
      pollData.meshRepairStatus ||
      res.meshRepairStatus,
    calculationTrace:
      res.calculationTrace ||
      pricing.calculationTrace,
    colorAnalysis:
      res.colorAnalysis ||
      res.color_analysis ||
      res.model?.colorAnalysis ||
      res.model?.color_analysis ||
      pollData.color_analysis ||
      pollData.colorAnalysis ||
      null,
    color_analysis:
      res.color_analysis ||
      res.colorAnalysis ||
      res.model?.color_analysis ||
      res.model?.colorAnalysis ||
      pollData.color_analysis ||
      pollData.colorAnalysis ||
      null,
    modelAnalysis:
      res.modelAnalysis ||
      res.model_analysis ||
      res.model?.modelAnalysis ||
      res.model?.model_analysis ||
      pollData.model_analysis ||
      pollData.modelAnalysis ||
      null,
    model_analysis:
      res.model_analysis ||
      res.modelAnalysis ||
      res.model?.model_analysis ||
      res.model?.modelAnalysis ||
      pollData.model_analysis ||
      pollData.modelAnalysis ||
      null,
    multicolorSummary,
    adapter: slice.adapter ?? res.production?.slicerAdapter,
    slicerAdapter: slice.adapter ?? res.production?.slicerAdapter,
    colourMode: res.production?.colourMode,
    sourceProject: res.production?.sourceProject || null,
    productionPrinterProfile: res.production,
  };
}

/**
 * Execute real slicing and retrieve an authoritative quote.
 * Polls the async job queue through:
 * queued -> processing -> completed | failed
 */
export async function executeSlicingJob(params: SliceJobParams): Promise<SlicingResult> {
  try {
    const formData = new FormData();
    formData.append('file', params.file, params.fileName);
    formData.append('material', params.material);
    formData.append('qualityProfile', params.qualityProfile);
    formData.append('infillPercent', String(params.infillPercent));
    formData.append('scaleFactor', String(params.scaleFactor));
    if (params.scaleX !== undefined) formData.append('scaleX', String(params.scaleX));
    if (params.scaleY !== undefined) formData.append('scaleY', String(params.scaleY));
    if (params.scaleZ !== undefined) formData.append('scaleZ', String(params.scaleZ));
    if (params.requestedDimensions) {
      formData.append('requestedDimensionsJson', JSON.stringify(params.requestedDimensions));
    }
    formData.append('quantity', String(params.quantity));
    formData.append('supportMode', params.supportMode || 'auto');
    formData.append('packagingIncluded', String(params.packagingIncluded));

    const idempotencyKey = params.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    formData.append('idempotencyKey', idempotencyKey);

    if (params.forceReslice !== undefined) {
      formData.append('forceReslice', String(params.forceReslice));
    }

    // Forward the live admin pricing config so the backend prices this job
    // using today's actual settings, not its own hardcoded fallback numbers.
    if (params.pricingConfig) {
      formData.append('pricingConfigJson', JSON.stringify(params.pricingConfig));
    }
    if (params.materials) {
      formData.append('materialsJson', JSON.stringify(params.materials));
    }
    if (params.quantityDiscounts) {
      formData.append('quantityDiscountsJson', JSON.stringify(params.quantityDiscounts));
    }
    if (params.pricingVersion) {
      formData.append('pricingVersion', params.pricingVersion);
    }
    if (params.productionPrinterProfile) {
      formData.append('productionPrinterProfileJson', JSON.stringify(params.productionPrinterProfile));
    }
    // Send the full Admin profiles list for automatic printer eligibility resolution.
    // The backend selects the best eligible printer internally — the customer
    // never sees printer names or selection controls.
    if (params.productionPrinterProfiles?.length) {
      formData.append('productionPrinterProfilesJson', JSON.stringify(params.productionPrinterProfiles));
    }

    // 1. Submit job to queue
    params.onProgress?.('Preparing model for slicing engine...');
    const createResp = await fetch(`${SLICER_SERVICE_URL}/api/slice/jobs`, {
      method: 'POST',
      body: formData,
    });

    if (!createResp.ok) {
      const errData = await createResp.json().catch(() => ({}));
      return {
        status: 'failed',
        error: errData.detail || 'Failed to submit slicing request to engine.',
        error_code: 'SUBMISSION_FAILED',
      };
    }

    const job = await createResp.json();
    const jobId = job.jobId;

    // Check if initial submission is already completed (e.g., instant cache or idempotency replay)
    if (job.status === 'completed' && job.result) {
      if (job.stage_message) {
        params.onProgress?.(job.stage_message);
      }
      return parseSuccessfulJobResult(job);
    }

    // 2. Poll job status until complete or failed (max 120 seconds)
    const maxPolls = 80;
    for (let i = 0; i < maxPolls; i++) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const pollResp = await fetch(`${SLICER_SERVICE_URL}/api/slice/jobs/${jobId}`);
      if (!pollResp.ok) {
        if (pollResp.status === 404) {
          return {
            status: 'failed',
            error: 'Slicing job could not be found or was interrupted on the server.',
            error_code: 'JOB_NOT_FOUND',
          };
        }
        continue;
      }

      const pollData = await pollResp.json();
      if (pollData.stage_message) {
        params.onProgress?.(pollData.stage_message);
      }

      // When status is completed, regardless of whether stage_message is
      // "Estimate ready" or "Estimate ready (cached)":
      // - stop polling
      // - clear loading state
      // - normalize/display the returned result
      // - show Estimate
      // - do not wait for another polling cycle
      // - do not treat "cached" as processing
      if (pollData.status === 'completed') {
        return parseSuccessfulJobResult(pollData);
      }

      if (pollData.status === 'failed') {
        return {
          status: 'failed',
          error: pollData.error || 'Slicing could not be completed.',
          error_code: pollData.error_code,
          classification: pollData.classification,
        };
      }
    }

    return {
      status: 'failed',
      error: 'Slicing process timed out. Please retry or contact the workshop.',
      error_code: 'TIMEOUT',
    };
  } catch (err: any) {
    return {
      status: 'failed',
      error: err.message || 'Could not reach the slicing service. Please verify the service is running.',
      error_code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Fetch the active printer profile envelope directly from the slicing backend.
 */
export async function fetchActiveProfileEnvelope(): Promise<{ x: number; y: number; z: number } | null> {
  try {
    const res = await fetch(`${SLICER_SERVICE_URL}/api/health`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.active_envelope && data.active_envelope.x && data.active_envelope.y && data.active_envelope.z) {
      return {
        x: Number(data.active_envelope.x),
        y: Number(data.active_envelope.y),
        z: Number(data.active_envelope.z),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export interface ModelInspectionResult {
  success: boolean;
  classification?: string;
  detected_format?: string;
  can_slice?: boolean;
  can_retry?: boolean;
  workshop_review_available?: boolean;
  color_analysis?: ColorAnalysis | null;
  colorAnalysis?: ColorAnalysis | null;
  model_analysis?: UniversalModelAnalysis | null;
  modelAnalysis?: UniversalModelAnalysis | null;
  message?: string;
  error?: string;
  error_code?: string;
}

/**
 * Direct model inspection via canonical backend /api/inspect.
 * Fast inspection of 3D models (3MF, STL, OBJ, ZIP) returning
 * content classification and color_analysis metadata.
 */
export async function inspectModelFile(
  file: File | Blob,
  fileName: string
): Promise<ModelInspectionResult> {
  try {
    const formData = new FormData();
    formData.append('file', file, fileName);

    const res = await fetch(`${SLICER_SERVICE_URL}/api/inspect`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.detail || `Inspection failed (${res.status})`,
      };
    }

    const data = await res.json();
    const ca = data.color_analysis || data.colorAnalysis || null;
    const ma = data.model_analysis || data.modelAnalysis || null;
    return {
      ...data,
      colorAnalysis: ca,
      modelAnalysis: ma,
      model_analysis: ma,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to inspect model file.',
    };
  }
}

