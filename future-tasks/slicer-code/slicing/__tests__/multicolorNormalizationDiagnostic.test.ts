import { describe, it, expect } from 'vitest';
import { normalizeMulticolorSummary } from '../slicingClient';

function createMockSlice(numFilaments: number) {
  const per_filament = [];
  for (let i = 1; i <= numFilaments; i++) {
    per_filament.push({
      filamentIndex: i,
      colorHex: `#${i}${i}${i}000`,
      materialType: 'PETG',
      modelGrams: 10 * i,
      totalGrams: 20 * i,
      purgeGrams: 10 * i,
    });
  }

  const totalGrams = per_filament.reduce((acc, f) => acc + f.totalGrams, 0);
  const modelGrams = per_filament.reduce((acc, f) => acc + f.modelGrams, 0);
  const purgeGrams = per_filament.reduce((acc, f) => acc + f.purgeGrams, 0);

  return {
    filamentGrams: totalGrams,
    printTimeSeconds: 3600 * numFilaments,
    adapter: 'bambu_studio_cli',
    statistics: {
      filament_grams: totalGrams,
      print_time_seconds: 3600 * numFilaments,
      tool_change_count: 50 * numFilaments,
      model_filament_grams: modelGrams,
      purge_filament_grams: purgeGrams,
      per_filament,
    },
  };
}

describe('Multicolor Normalization Diagnostic for 3, 4, 5, 8 colors', () => {
  for (const n of [3, 4, 5, 8]) {
    it(`correctly normalizes ${n}-color model without dropping any filament entries`, () => {
      const mockSlice = createMockSlice(n);
      const prod = { colourMode: 'multicolour', slicerAdapter: 'bambu_studio_cli' };

      const normalized = normalizeMulticolorSummary(mockSlice, prod);

      // Verify B: slicingClient.ts
      expect(normalized.filaments).toHaveLength(n);
      expect(normalized.isMulticolor).toBe(true);
      expect(normalized.mode).toBe('multicolor');
      expect(normalized.totalFilamentGrams).toBe(mockSlice.filamentGrams);

      // Verify C: CustomPrinting.tsx isMulticolorQuote calculation
      const isMulticolorQuote = Boolean(
        normalized.isMulticolor &&
        normalized.filaments &&
        normalized.filaments.length > 1
      );
      expect(isMulticolorQuote).toBe(true);
    });
  }
});

