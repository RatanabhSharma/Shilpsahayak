import { describe, it, expect } from 'vitest';
import { computeInstantEstimate } from '../instantEstimator';
import {
  DEFAULT_PRICING_CONFIG,
  DEFAULT_MATERIALS,
  DEFAULT_PRINT_PROFILES,
} from '../pricingConfig';

describe('Instant Estimator Service', () => {
  const pla = DEFAULT_MATERIALS.find((m) => m.id === 'pla')!;
  const petg = DEFAULT_MATERIALS.find((m) => m.id === 'petg')!;
  const standardProfile = DEFAULT_PRINT_PROFILES.find((p) => p.id === 'standard')!;

  describe('1. Geometry-Based Estimation for Standard Models (STL / OBJ)', () => {
    it('computes fast instant estimate from volume and infill for single-color models', () => {
      // 50 cm³ model, PLA, 20% infill
      const outcome = computeInstantEstimate({
        volumeCm3: 50,
        isMulticolor: false,
        colorChannelCount: 1,
        material: pla,
        profile: standardProfile,
        infillPercent: 20,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: DEFAULT_PRICING_CONFIG,
        dimensions: { x: 50, y: 50, z: 20 },
      });

      expect(outcome.success).toBe(true);
      if (outcome.success) {
        expect(outcome.result.isInstantEstimate).toBe(true);
        expect(outcome.result.estimatedWeightGrams).toBeGreaterThan(0);
        expect(outcome.result.estimatedPrintHours).toBeGreaterThan(0);
        expect(outcome.result.quote.totalPrice).toBeGreaterThan(0);
        expect(outcome.result.exceedsBuildVolume).toBe(false);
      }
    });

    it('adjusts weight with material density differences (PETG vs PLA)', () => {
      const plaOutcome = computeInstantEstimate({
        volumeCm3: 100,
        isMulticolor: false,
        colorChannelCount: 1,
        material: pla,
        profile: standardProfile,
        infillPercent: 15,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: DEFAULT_PRICING_CONFIG,
      });

      const petgOutcome = computeInstantEstimate({
        volumeCm3: 100,
        isMulticolor: false,
        colorChannelCount: 1,
        material: petg,
        profile: standardProfile,
        infillPercent: 15,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: DEFAULT_PRICING_CONFIG,
      });

      expect(plaOutcome.success).toBe(true);
      expect(petgOutcome.success).toBe(true);
      if (plaOutcome.success && petgOutcome.success) {
        // PETG (density 1.27) should be heavier than PLA (density 1.24)
        expect(petgOutcome.result.estimatedWeightGrams).toBeGreaterThan(
          plaOutcome.result.estimatedWeightGrams
        );
      }
    });
  });

  describe('2. Multicolor Estimation (3MF with N colors)', () => {
    it('handles single-color 3MF without multicolor overhead', () => {
      const outcome = computeInstantEstimate({
        volumeCm3: 60,
        isMulticolor: false,
        colorChannelCount: 1,
        material: pla,
        profile: standardProfile,
        infillPercent: 20,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: DEFAULT_PRICING_CONFIG,
      });

      expect(outcome.success).toBe(true);
      if (outcome.success) {
        expect(outcome.result.estimatedWeightGrams).toBeGreaterThan(0);
      }
    });

    it('handles 3-color 3MF with AMS purge/switch time overhead', () => {
      const singleColor = computeInstantEstimate({
        volumeCm3: 60,
        isMulticolor: false,
        colorChannelCount: 1,
        material: pla,
        profile: standardProfile,
        infillPercent: 20,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: DEFAULT_PRICING_CONFIG,
      });

      const threeColor = computeInstantEstimate({
        volumeCm3: 60,
        isMulticolor: true,
        colorChannelCount: 3,
        material: pla,
        profile: standardProfile,
        infillPercent: 20,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: DEFAULT_PRICING_CONFIG,
      });

      expect(singleColor.success).toBe(true);
      expect(threeColor.success).toBe(true);
      if (singleColor.success && threeColor.success) {
        // 3-color should have higher estimated print time due to toolchange overhead
        expect(threeColor.result.estimatedPrintHours).toBeGreaterThan(
          singleColor.result.estimatedPrintHours
        );
      }
    });

    it('handles 8-color 3MF correctly', () => {
      const outcome = computeInstantEstimate({
        volumeCm3: 80,
        isMulticolor: true,
        colorChannelCount: 8,
        material: pla,
        profile: standardProfile,
        infillPercent: 20,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: DEFAULT_PRICING_CONFIG,
      });

      expect(outcome.success).toBe(true);
      if (outcome.success) {
        expect(outcome.result.isInstantEstimate).toBe(true);
        expect(outcome.result.quote.totalPrice).toBeGreaterThan(0);
      }
    });

    it('dynamically supports arbitrary high color counts (20, 50, 100 colors) with no hardcoded limits', () => {
      for (const colorCount of [20, 50, 100]) {
        const outcome = computeInstantEstimate({
          volumeCm3: 100,
          isMulticolor: true,
          colorChannelCount: colorCount,
          material: pla,
          profile: standardProfile,
          infillPercent: 20,
          quantity: 1,
          packagingIncluded: false,
          pricingConfig: DEFAULT_PRICING_CONFIG,
        });

        expect(outcome.success).toBe(true);
        if (outcome.success) {
          expect(outcome.result.estimatedPrintHours).toBeGreaterThan(0);
          expect(Number.isFinite(outcome.result.quote.totalPrice)).toBe(true);
        }
      }
    });
  });

  describe('3. Build Envelope and Safe Fallback Rules', () => {
    it('detects when model dimensions exceed build volume', () => {
      const outcome = computeInstantEstimate({
        volumeCm3: 500,
        isMulticolor: false,
        colorChannelCount: 1,
        material: pla,
        profile: standardProfile,
        infillPercent: 20,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: DEFAULT_PRICING_CONFIG,
        dimensions: { x: 300, y: 100, z: 100 }, // exceeds standard 256x256x200
      });

      expect(outcome.success).toBe(true);
      if (outcome.success) {
        expect(outcome.result.exceedsBuildVolume).toBe(true);
      }
    });

    it('returns success: false when model volume is 0 or negative', () => {
      const outcome = computeInstantEstimate({
        volumeCm3: 0,
        isMulticolor: false,
        colorChannelCount: 1,
        material: pla,
        profile: standardProfile,
        infillPercent: 20,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: DEFAULT_PRICING_CONFIG,
      });

      expect(outcome.success).toBe(false);
      if (!outcome.success) {
        expect(outcome.reason).toContain('Volume is zero or unavailable');
      }
    });

    it('returns success: false when pricingConfig is missing', () => {
      const outcome = computeInstantEstimate({
        volumeCm3: 50,
        isMulticolor: false,
        colorChannelCount: 1,
        material: pla,
        profile: standardProfile,
        infillPercent: 20,
        quantity: 1,
        packagingIncluded: false,
        pricingConfig: null as any,
      });

      expect(outcome.success).toBe(false);
      if (!outcome.success) {
        expect(outcome.reason).toContain('pricing configuration is unavailable');
      }
    });
  });
});

