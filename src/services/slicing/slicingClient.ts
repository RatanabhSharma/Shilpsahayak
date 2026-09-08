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
  pricingBreakdown: InternalPricingBreakdown;
}

export interface SlicingSuccessResult {
  status: 'completed';
  statistics: SlicingStatistics;
  quote: AuthoritativeQuote;
  slicerVersion: string;
  profileApplied: string;
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
  quantity: number;
  supportMode?: string;
  packagingIncluded: boolean;
  onProgress?: (stageMessage: string) => void;
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
    formData.append('quantity', String(params.quantity));
    formData.append('supportMode', params.supportMode || 'auto');
    formData.append('packagingIncluded', String(params.packagingIncluded));

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
        return {
          status: 'completed',
          statistics: pollData.result.statistics,
          quote: pollData.result.quote,
          slicerVersion: pollData.result.slicerVersion,
          profileApplied: pollData.result.profileApplied,
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
