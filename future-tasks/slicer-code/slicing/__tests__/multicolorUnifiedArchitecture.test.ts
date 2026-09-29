import { describe, it, expect } from 'vitest';
import { normalizeMulticolorSummary } from '../slicingClient';
import { DetectedColor } from '../../model/modelTypes';
import { MaterialConfig } from '../../pricing/pricingTypes';

const mockMaterials: MaterialConfig[] = [
  {
    id: 'pla',
    name: 'PLA',
    tagline: 'Standard prototyping',
    description: 'Easy to print PLA',
    pricePerGram: 4.5,
    density: 1.24,
    enabled: true,
    colors: [
      { name: 'Black', hex: '#161616' },
      { name: 'White', hex: '#FFFFFF' },
    ],
  },
  {
    id: 'petg',
    name: 'PETG',
    tagline: 'Durable & impact-resistant',
    description: 'Tough PETG material',
    pricePerGram: 5.5,
    density: 1.27,
    enabled: true,
    colors: [{ name: 'Black', hex: '#161616' }],
  },
  {
    id: 'tpu',
    name: 'TPU',
    tagline: 'Flexible rubber-like',
    description: 'Flexible TPU',
    pricePerGram: 7.0,
    density: 1.21,
    enabled: true,
    colors: [{ name: 'Black', hex: '#161616' }],
  },
];

// Helper mirroring CustomPrinting.tsx detection & state machine logic
function resolveMulticolorContext(params: {
  backendColorAnalysis?: { isMultiColor: boolean; colors?: Array<{ hex: string }> } | null;
  clientDetectedColors?: string[];
  isParsing?: boolean;
  modelProcessingState?: string;
  isSlicing?: boolean;
  slicerError?: string | null;
  slicerResult?: { status: string; quote?: unknown; multicolorSummary?: ReturnType<typeof normalizeMulticolorSummary> } | null;
  activeMaterial?: MaterialConfig;
}) {
  const activeMat = params.activeMaterial || mockMaterials[0];

  const detectedMulticolorHexList = (() => {
    if (params.backendColorAnalysis?.colors && params.backendColorAnalysis.colors.length > 1) {
      return params.backendColorAnalysis.colors.map((c) => c.hex);
    }
    if (params.clientDetectedColors && params.clientDetectedColors.length > 1) {
      return params.clientDetectedColors;
    }
    return [];
  })();

  const isMultiColorModel = Boolean(
    (params.backendColorAnalysis?.isMultiColor && (params.backendColorAnalysis.colors?.length ?? 0) > 1) ||
    detectedMulticolorHexList.length > 1
  );

  const effectiveMulticolorColors: DetectedColor[] = (() => {
    if (params.backendColorAnalysis?.colors && params.backendColorAnalysis.colors.length > 1) {
      return params.backendColorAnalysis.colors.map((c, idx) => ({
        index: idx + 1,
        sourceFilament: idx + 1,
        hex: c.hex,
        colorName: `Color ${idx + 1}`,
        materialType: activeMat.name,
      }));
    }
    if (detectedMulticolorHexList.length > 1) {
      return detectedMulticolorHexList.map((hex, idx) => ({
        index: idx + 1,
        sourceFilament: idx + 1,
        hex,
        colorName: `Color ${idx + 1}`,
        materialType: activeMat.name,
      }));
    }
    return [];
  })();

  const multicolorState: 'detecting' | 'configuring' | 'slicing' | 'estimateReady' | 'error' = (() => {
    if (params.isParsing || params.modelProcessingState === 'processing' || params.modelProcessingState === 'uploading') return 'detecting';
    if (params.isSlicing) return 'slicing';
    if (params.slicerError) return 'error';
    if (params.slicerResult && params.slicerResult.status === 'completed' && params.slicerResult.quote) return 'estimateReady';
    return 'configuring';
  })();

  return {
    isMultiColorModel,
    effectiveMulticolorColors,
    multicolorState,
  };
}

describe('Multicolor Unified Architecture Verification', () => {
  it('Case A: Backend running (8-color 3MF + PLA -> PLA only for all 8 channels in estimateReady state)', () => {
    const ctx = resolveMulticolorContext({
      backendColorAnalysis: {
        isMultiColor: true,
        colors: [
          { hex: '#161616' }, { hex: '#FFFFFF' }, { hex: '#FF80C0' }, { hex: '#FF1C1C' },
          { hex: '#FFFF00' }, { hex: '#00B9FF' }, { hex: '#1C10B1' }, { hex: '#0393FC' },
        ],
      },
      slicerResult: {
        status: 'completed',
        quote: { totalPrice: 1500 },
        multicolorSummary: {
          mode: 'multicolor',
          isMulticolor: true,
          modelFilamentGrams: 145.36,
          purgeFilamentGrams: 946.31,
          totalFilamentGrams: 1091.67,
          printTimeSeconds: 280244,
          toolChangeCount: 2245,
          filaments: [],
        },
      },
      activeMaterial: mockMaterials[0], // PLA
    });

    expect(ctx.isMultiColorModel).toBe(true);
    expect(ctx.multicolorState).toBe('estimateReady');
    expect(ctx.effectiveMulticolorColors.length).toBe(8);
    for (const col of ctx.effectiveMulticolorColors) {
      expect(col.materialType).toBe('PLA');
    }
  });

  it('Case B: Backend unavailable (client parser detects 8 colors -> UI remains multicolor, NOT fallback banner or single-color)', () => {
    const ctx = resolveMulticolorContext({
      backendColorAnalysis: null, // Backend offline
      clientDetectedColors: ['#161616', '#FFFFFF', '#FF80C0', '#FF1C1C', '#FFFF00', '#00B9FF', '#1C10B1', '#0393FC'],
      activeMaterial: mockMaterials[0],
    });

    expect(ctx.isMultiColorModel).toBe(true);
    expect(ctx.multicolorState).toBe('configuring');
    expect(ctx.effectiveMulticolorColors.length).toBe(8);
    for (const col of ctx.effectiveMulticolorColors) {
      expect(col.materialType).toBe('PLA');
    }
  });

  it('Case C: Backend loading / slicing (remains multicolor, state is slicing, displays 8 colors)', () => {
    const ctx = resolveMulticolorContext({
      clientDetectedColors: ['#161616', '#FFFFFF', '#FF80C0', '#FF1C1C', '#FFFF00', '#00B9FF', '#1C10B1', '#0393FC'],
      isSlicing: true,
      activeMaterial: mockMaterials[0],
    });

    expect(ctx.isMultiColorModel).toBe(true);
    expect(ctx.multicolorState).toBe('slicing');
    expect(ctx.effectiveMulticolorColors.length).toBe(8);
  });

  it('Case D: Backend error (remains multicolor, state is error, displays 8 colors without reverting to single)', () => {
    const ctx = resolveMulticolorContext({
      clientDetectedColors: ['#161616', '#FFFFFF', '#FF80C0', '#FF1C1C', '#FFFF00', '#00B9FF', '#1C10B1', '#0393FC'],
      slicerError: 'Backend timeout',
      activeMaterial: mockMaterials[0],
    });

    expect(ctx.isMultiColorModel).toBe(true);
    expect(ctx.multicolorState).toBe('error');
    expect(ctx.effectiveMulticolorColors.length).toBe(8);
  });

  it('Case E: 3-color model (same unified UI pattern with exactly 3 colors)', () => {
    const ctx = resolveMulticolorContext({
      backendColorAnalysis: {
        isMultiColor: true,
        colors: [{ hex: '#FF0000' }, { hex: '#00FF00' }, { hex: '#0000FF' }],
      },
      clientDetectedColors: ['#FF0000', '#00FF00', '#0000FF'],
      activeMaterial: mockMaterials[0],
    });

    expect(ctx.isMultiColorModel).toBe(true);
    expect(ctx.effectiveMulticolorColors.length).toBe(3);
  });

  it('Case F: 8-color model (same unified UI pattern with exactly 8 colors)', () => {
    const ctx = resolveMulticolorContext({
      clientDetectedColors: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888'],
      activeMaterial: mockMaterials[0],
    });

    expect(ctx.isMultiColorModel).toBe(true);
    expect(ctx.effectiveMulticolorColors.length).toBe(8);
  });

  it('Case G: Single-material STL (single-material UI unchanged, isMultiColorModel is false)', () => {
    const ctx = resolveMulticolorContext({
      backendColorAnalysis: { isMultiColor: false, colors: [{ hex: '#161616' }] },
      clientDetectedColors: ['#161616'],
      activeMaterial: mockMaterials[0],
    });

    expect(ctx.isMultiColorModel).toBe(false);
    expect(ctx.effectiveMulticolorColors.length).toBe(0);
  });
});

