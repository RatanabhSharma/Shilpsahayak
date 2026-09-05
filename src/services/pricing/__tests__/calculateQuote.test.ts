import { describe, it, expect } from 'vitest';
import {
  calculateInternalCost,
  calculateCustomerQuote,
  checkBuildVolume,
} from '../calculateQuote';
import {
  DEFAULT_PRICING_CONFIG,
  DEFAULT_MATERIALS,
  DEFAULT_PRINT_PROFILES,
  DEFAULT_QUANTITY_DISCOUNTS,
} from '../pricingConfig';
import { estimateMaterialUsage, estimatePrintTime } from '../pricingUtils';

describe('Centralized Pricing Engine', () => {
  const plaMaterial = DEFAULT_MATERIALS.find((m) => m.id === 'pla')!;
  const petgMaterial = DEFAULT_MATERIALS.find((m) => m.id === 'petg')!;
  const standardProfile = DEFAULT_PRINT_PROFILES.find((p) => p.id === 'standard')!;

  describe('1. Material Usage & Print Time Estimation', () => {
    it('estimates material usage from volume and density correctly', () => {
      // 100 cm³ cube in PLA (density 1.24, factor 0.45 for standard)
      // solid weight = 100 * 1.24 = 124g
      // estimated usage = 124 * 0.45 = 55.8g
      const usage = estimateMaterialUsage(100, plaMaterial.density, standardProfile);
      expect(usage).toBeCloseTo(55.8, 1);
    });

    it('estimates print time with warmup buffer', () => {
      // 30g material on standard profile
      // raw = (30 / 15) * 1.0 = 2.0 hrs
      // total = 2.0 + 0.2 warmup = 2.2 hrs
      const time = estimatePrintTime(30, standardProfile);
      expect(time).toBeCloseTo(2.2, 1);
    });
  });

  describe('2. Internal Cost Breakdown', () => {
    it('calculates exact manufacturing costs including electricity, machine wear, failure and labour', () => {
      // 50g PLA, 4 hours print time, no packaging
      const input = {
        materialWeightGrams: 50,
        printTimeHours: 4,
        material: plaMaterial,
        quantity: 1,
        packagingIncluded: false,
      };

      const result = calculateInternalCost(input, DEFAULT_PRICING_CONFIG);

      // Material: 50g * ₹4.50 = ₹225.00
      expect(result.materialCost).toBe(225);

      // Electricity: 4 hrs * (100W / 1000) * ₹8.00/kWh = 0.4 kWh * ₹8 = ₹3.20
      expect(result.electricityCost).toBeCloseTo(3.2, 1);

      // Machine wear: 4 hrs * (₹25,000 / 5,000 hrs) = 4 * ₹5/hr = ₹20.00
      expect(result.machineWearCost).toBe(20);

      // Failure buffer: 10% of (225 + 3.2 + 20) = 10% of 248.2 = ₹24.82
      expect(result.failureBufferCost).toBeCloseTo(24.82, 1);

      // Labour: (5 mins / 60) * ₹200/hr = ₹16.67
      expect(result.labourCost).toBeCloseTo(16.67, 1);

      // Packaging: ₹0
      expect(result.packagingCost).toBe(0);

      // Base fee: ₹30.00
      expect(result.baseServiceFee).toBe(30);

      // Total Production: 225 + 3.2 + 20 + 24.82 + 16.67 + 0 + 30 = 319.69
      expect(result.productionCost).toBeCloseTo(319.69, 1);

      // Selling price with 2.2x markup = 319.69 * 2.2 = 703.32 -> rounded 703
      expect(result.sellingPriceBeforeDiscount).toBe(Math.round(319.69 * 2.2));
    });

    it('adds packaging cost when packaging is enabled', () => {
      const withPackaging = calculateInternalCost(
        {
          materialWeightGrams: 20,
          printTimeHours: 1,
          material: petgMaterial,
          quantity: 1,
          packagingIncluded: true,
        },
        DEFAULT_PRICING_CONFIG
      );

      expect(withPackaging.packagingCost).toBe(20);
    });
  });

  describe('3. Customer Quote Calculations & Order Rules', () => {
    it('applies minimum order value on order subtotal', () => {
      // Small piece that would calculate to less than ₹149
      const smallInput = {
        materialWeightGrams: 2,
        printTimeHours: 0.3,
        material: plaMaterial,
        quantity: 1,
        packagingIncluded: false,
      };

      const quote = calculateCustomerQuote(smallInput, DEFAULT_PRICING_CONFIG);

      // Minimum order threshold ₹149 should be enforced
      expect(quote.minimumOrderChargeApplied).toBe(true);
      expect(quote.totalPrice).toBeGreaterThanOrEqual(149);
      expect(quote.subtotalBeforeGst).toBe(149);
    });

    it('adds packaging price on top of minimum order value', () => {
      // Small piece under ₹149 with packaging requested
      const withPackagingInput = {
        materialWeightGrams: 2,
        printTimeHours: 0.3,
        material: plaMaterial,
        quantity: 1,
        packagingIncluded: true,
      };

      const quote = calculateCustomerQuote(withPackagingInput, DEFAULT_PRICING_CONFIG);
      // Base minimum print order (₹149) + Packaging (₹20) = ₹169
      expect(quote.minimumOrderChargeApplied).toBe(true);
      expect(quote.packagingAmount).toBe(20);
      expect(quote.subtotalBeforeGst).toBe(169);
      expect(quote.totalPrice).toBe(169);
    });

    it('applies bulk quantity discounts correctly across tiers', () => {
      const input = {
        materialWeightGrams: 50,
        printTimeHours: 3,
        material: plaMaterial,
        quantity: 1,
        packagingIncluded: false,
      };

      const quoteSingle = calculateCustomerQuote(input, DEFAULT_PRICING_CONFIG);
      expect(quoteSingle.discountAmount).toBe(0);

      // 5 units: 5% discount
      const quoteFive = calculateCustomerQuote(
        { ...input, quantity: 5 },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );
      const expectedSubtotal = quoteFive.unitPrice * 5;
      expect(quoteFive.discountAmount).toBe(Math.round(expectedSubtotal * 0.05));
      expect(quoteFive.discountedSubtotal).toBe(expectedSubtotal - quoteFive.discountAmount);

      // 10 units: 10% discount
      const quoteTen = calculateCustomerQuote(
        { ...input, quantity: 10 },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );
      expect(quoteTen.discountAmount).toBe(Math.round(quoteTen.unitPrice * 10 * 0.10));

      // 25 units: 15% discount
      const quoteTwentyFive = calculateCustomerQuote(
        { ...input, quantity: 25 },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );
      expect(quoteTwentyFive.discountAmount).toBe(Math.round(quoteTwentyFive.unitPrice * 25 * 0.15));
    });

    it('calculates GST only when enabled', () => {
      const input = {
        materialWeightGrams: 40,
        printTimeHours: 2,
        material: plaMaterial,
        quantity: 2,
        packagingIncluded: false,
      };

      // GST Disabled
      const noGstConfig = { ...DEFAULT_PRICING_CONFIG, gstEnabled: false };
      const quoteNoGst = calculateCustomerQuote(input, noGstConfig);
      expect(quoteNoGst.gstAmount).toBe(0);
      expect(quoteNoGst.totalPrice).toBe(quoteNoGst.subtotalBeforeGst);

      // GST Enabled at 18%
      const gstConfig = { ...DEFAULT_PRICING_CONFIG, gstEnabled: true, gstRate: 18 };
      const quoteWithGst = calculateCustomerQuote(input, gstConfig);
      expect(quoteWithGst.gstAmount).toBe(Math.round(quoteWithGst.subtotalBeforeGst * 0.18));
      expect(quoteWithGst.totalPrice).toBe(quoteWithGst.subtotalBeforeGst + quoteWithGst.gstAmount);
    });

    it('flags models exceeding build volume for manual review', () => {
      const dimensions = { x: 300, y: 150, z: 100 };
      const maxVolume = { x: 256, y: 256, z: 256 };

      const exceeds = checkBuildVolume(dimensions, maxVolume);
      expect(exceeds).toBe(true);

      const quote = calculateCustomerQuote(
        {
          materialWeightGrams: 80,
          printTimeHours: 5,
          material: plaMaterial,
          quantity: 1,
          packagingIncluded: false,
          exceedsBuildVolume: exceeds,
        },
        DEFAULT_PRICING_CONFIG
      );

      expect(quote.requiresManualReview).toBe(true);
      expect(quote.reviewReason).toContain('exceeds printer build volume');
    });
  });
});

