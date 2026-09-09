/**
 * Typed Client for Shilp Studio Slicing Service
 * Interfaces with the backend slicing service to provide reliable slicer-backed quotes.
 */

export interface SlicingStatistics {
  filament_grams: number;
  filament_mm: number;
  print_time_seconds: number;
  print_time_minutes: number;
  print_time_hours: number;
  raw_time_string: string;
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
  weightSource?: 'slicer_grams' | 'slicer_length_density';
  timeSource?: 'slicer_toolpath';
  quoteStatus: 'production_verified' | 'manual_review';
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
  weight_source: 'slicer_grams' | 'slicer_length_density';
  time_source: 'slicer_toolpath';
  quoteStatus: 'production_verified' | 'manual_review';
  statistics: SlicingStatistics;
  quote: AuthoritativeQuote;
  slicerVersion: string;
  profileApplied: string;
  pricingVersion?: string;
  pricingSourceIsLiveAdminConfig?: boolean;
  pricingSource?: string;
  pricingUpdatedAt?: string | null;
  activeEnvelope?: { x: number; y: number; z: number } | null;
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

    // 2. Poll job status until complete or failed (max 120 seconds)
    const maxPolls = 60;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const pollResp = await fetch(`${SLICER_SERVICE_URL}/api/slice/jobs/${jobId}`);
      if (!pollResp.ok) {
        continue;
      }

      const pollData = await pollResp.json();
      if (pollData.stage_message) {
        params.onProgress?.(pollData.stage_message);
      }

      if (pollData.status === 'completed') {
        const res = pollData.result;
        return {
          status: 'completed',
          slicing_status: 'completed',
          dimensions: res.dimensions || { x: 0, y: 0, z: 0 },
          filament_grams: res.filament_grams ?? res.statistics?.filament_grams ?? 0,
          filament_mm: res.filament_mm ?? res.statistics?.filament_mm,
          print_time_seconds: res.print_time_seconds ?? res.statistics?.print_time_seconds ?? 0,
          raw_time_string: res.raw_time_string ?? res.statistics?.raw_time_string ?? '',
          profile_id: res.profile_id || res.profileApplied || 'standard',
          profile_version: res.profile_version || res.profileVersion,
          printer_id: res.printer_id || 'bambu_production',
          active_envelope: res.active_envelope || res.activeEnvelope || null,
          classification: res.classification,
          weight_source: res.weight_source || res.quote?.weightSource || 'slicer_grams',
          time_source: res.time_source || 'slicer_toolpath',
          quoteStatus: res.quote?.quoteStatus || 'production_verified',
          statistics: res.statistics,
          quote: res.quote,
          slicerVersion: res.slicerVersion || '2.9.0',
          profileApplied: res.profileApplied || 'standard',
          pricingVersion: res.pricingVersion,
          pricingSourceIsLiveAdminConfig: res.pricingSourceIsLiveAdminConfig,
          pricingSource: res.pricingSource,
          pricingUpdatedAt: res.pricingUpdatedAt ?? null,
          activeEnvelope: res.activeEnvelope ?? res.active_envelope ?? null,
        };
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

