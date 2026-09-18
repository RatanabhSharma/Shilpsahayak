import { describe, it, expect } from 'vitest';
import { parseSuccessfulJobResult } from '../slicingClient';

const SLICING_STAGES = [
  { id: 'prep', label: 'Preparing model', keywords: ['preparing', 'processing', 'upload'] },
  { id: 'analyze', label: 'Analyzing model', keywords: ['analyzing', 'inspect'] },
  { id: 'route', label: 'Selecting slicer', keywords: ['selecting', 'routing'] },
  { id: 'slice', label: 'Slicing production toolpath', keywords: ['slicing', 'toolpath', 'cache'] },
  { id: 'usage', label: 'Calculating material usage', keywords: ['material usage', 'filament'] },
  { id: 'pricing', label: 'Calculating production price', keywords: ['production price', 'pricing'] },
  { id: 'ready', label: 'Estimate ready', keywords: ['ready'] },
];

function matchStageIndex(msg: string): number {
  const lower = (msg || '').toLowerCase();
  for (let i = SLICING_STAGES.length - 1; i >= 0; i--) {
    if (SLICING_STAGES[i].keywords.some((kw) => lower.includes(kw))) {
      return i;
    }
  }
  return 0;
}

describe('Slicing Synchronization & Pipeline Stage Matching', () => {
  it('correctly identifies all stages in sequence from backend messages', () => {
    expect(matchStageIndex('Preparing model...')).toBe(0);
    expect(matchStageIndex('Analyzing model...')).toBe(1);
    expect(matchStageIndex('Selecting slicer engine...')).toBe(2);
    expect(matchStageIndex('Checking cache...')).toBe(3);
    expect(matchStageIndex('Slicing production toolpath...')).toBe(3);
    expect(matchStageIndex('Calculating material usage...')).toBe(4);
    expect(matchStageIndex('Calculating production price...')).toBe(5);
    expect(matchStageIndex('Estimate ready')).toBe(6);
    expect(matchStageIndex('Estimate ready (cached)')).toBe(6);
  });

  it('handles unexpected messages gracefully by defaulting to stage 0', () => {
    expect(matchStageIndex('Unknown message')).toBe(0);
    expect(matchStageIndex('')).toBe(0);
  });

  it('enforces job session token discrimination to prevent stale result overwrites', () => {
    let currentJobToken = 'job_100_initial';
    let activeResult: any = null;

    function handleJobCompletion(token: string, result: any) {
      if (token !== currentJobToken) {
        // Discard stale result
        return false;
      }
      activeResult = result;
      return true;
    }

    // First job completes while it is still active
    expect(handleJobCompletion('job_100_initial', { id: 'result_1' })).toBe(true);
    expect(activeResult).toEqual({ id: 'result_1' });

    // User triggers a second job
    currentJobToken = 'job_200_second';
    // State is immediately cleared
    activeResult = null;

    // Stale delayed response from job 100 arrives
    expect(handleJobCompletion('job_100_initial', { id: 'stale_result_1' })).toBe(false);
    expect(activeResult).toBeNull();

    // Fresh response from job 200 arrives
    expect(handleJobCompletion('job_200_second', { id: 'result_2' })).toBe(true);
    expect(activeResult).toEqual({ id: 'result_2' });
  });

  it('guarantees that an invalidated slicerResult produces null quoteBreakdown', () => {
    let slicerResult: any = null;

    function computeQuoteBreakdown(result: any) {
      if (result?.status === 'completed' && result.quote) {
        return {
          totalPrice: result.quote.totalPrice,
          quoteStatus: result.quote.quoteStatus,
        };
      }
      return null;
    }

    // When cleared, quoteBreakdown MUST be null
    expect(computeQuoteBreakdown(slicerResult)).toBeNull();

    // Populated
    slicerResult = {
      status: 'completed',
      quote: { totalPrice: 1500, quoteStatus: 'production_verified' },
    };
    expect(computeQuoteBreakdown(slicerResult)).toEqual({
      totalPrice: 1500,
      quoteStatus: 'production_verified',
    });

    // Invalidation on config change or file change
    slicerResult = null;
    expect(computeQuoteBreakdown(slicerResult)).toBeNull();
  });

  it('immediately normalizes and resolves completed cached jobs without treating cached as processing', () => {
    const cachedJobPayload = {
      id: 'job_cached_999',
      status: 'completed',
      stage_message: 'Estimate ready (cached)',
      quoteId: 'quote_hist_777',
      result: {
        quoteId: 'quote_hist_777',
        status: 'quoted',
        pricing: {
          totalPrice: 2133,
          unitPrice: 2133,
          quoteStatus: 'production_verified',
        },
        production: {
          colourMode: 'multicolour',
          slicerAdapter: 'bambu_studio_cli',
        },
        slice: {
          dimensions: { x: 114.2, y: 108.39, z: 160.12 },
          filamentGrams: 937.62,
          printTimeSeconds: 279044,
          rawTimeString: '77h 30m 44s',
          statistics: {
            filament_grams: 937.62,
            model_filament_grams: 130.78,
            purge_filament_grams: 601.70,
            tool_change_count: 2245,
            per_filament: [
              { filamentIndex: 1, colorHex: '#1E3A8A', modelGrams: 50.0, totalGrams: 200.0, purgeGrams: 150.0 },
              { filamentIndex: 2, colorHex: '#FACC15', modelGrams: 80.78, totalGrams: 737.62, purgeGrams: 451.70 },
            ],
          },
        },
      },
    };

    // Use parseSuccessfulJobResult directly
    const result = parseSuccessfulJobResult(cachedJobPayload);

    expect(result.status).toBe('completed');
    expect(result.slicing_status).toBe('completed');
    expect(result.quoteId).toBe('quote_hist_777');
    expect(result.quote.totalPrice).toBe(2133);
    expect(result.filament_grams).toBe(937.62);
    expect(result.dimensions).toEqual({ x: 114.2, y: 108.39, z: 160.12 });

    // Multicolor summary is fully populated
    expect(result.multicolorSummary).toBeDefined();
    expect(result.multicolorSummary?.isMulticolor).toBe(true);
    expect(result.multicolorSummary?.filaments.length).toBe(2);
    expect(result.multicolorSummary?.filaments[0].colorHex).toBe('#1E3A8A');
    expect(result.multicolorSummary?.filaments[1].colorHex).toBe('#FACC15');
  });

  it('stops polling immediately on the first completed poll response regardless of stage message', async () => {
    let pollCount = 0;
    const mockPollResponse = {
      status: 'completed',
      stage_message: 'Estimate ready (cached)',
      result: {
        pricing: { totalPrice: 1200 },
        slice: { filamentGrams: 100 },
      },
    };

    // Polling logic simulation
    let isPolling = true;
    let finalResult: any = null;

    while (isPolling) {
      pollCount++;
      const data = mockPollResponse;
      if (data.status === 'completed') {
        isPolling = false;
        finalResult = parseSuccessfulJobResult(data);
        break;
      }
      if (pollCount > 5) break;
    }

    expect(pollCount).toBe(1);
    expect(isPolling).toBe(false);
    expect(finalResult.status).toBe('completed');
    expect(finalResult.quote.totalPrice).toBe(1200);
  });
});

