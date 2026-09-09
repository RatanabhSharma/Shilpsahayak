import {
  CustomerQuoteBreakdown,
  InternalCostBreakdown,
  MachinePricingConfig,
  QuantityDiscountTier,
  QuoteCalculationInput,
} from './pricingTypes';
import { getQuantityDiscount } from './pricingUtils';
import { DEFAULT_QUANTITY_DISCOUNTS } from './pricingConfig';

/**
 * Validates that an administrative pricing configuration contains all required
 * non-negative and non-null numeric properties without relying on silent fallbacks.
 */
export function isPricingConfigValid(config?: MachinePricingConfig | null): boolean {
  if (!config) return false;
  return (
    typeof config.printerCost === 'number' && config.printerCost >= 0 &&
    typeof config.printerLifespanHours === 'number' && config.printerLifespanHours > 0 &&
    typeof config.printerPowerWatts === 'number' && config.printerPowerWatts >= 0 &&
    typeof config.electricityRatePerKwh === 'number' && config.electricityRatePerKwh >= 0 &&
    typeof config.failureBufferPercent === 'number' && config.failureBufferPercent >= 0 &&
    typeof config.labourRatePerHour === 'number' && config.labourRatePerHour >= 0 &&
    typeof config.finishingMinutes === 'number' && config.finishingMinutes >= 0 &&
    typeof config.baseServiceFee === 'number' && config.baseServiceFee >= 0 &&
    typeof config.minimumOrderValue === 'number' && config.minimumOrderValue >= 0 &&
    typeof config.markupMultiplier === 'number' && config.markupMultiplier > 0 &&
    typeof config.packagingPrice === 'number' && config.packagingPrice >= 0
  );
}

/**
 * Calculate the complete internal cost breakdown for 1 unit of a 3D print.
 *
 * This function calculates real-world production physics:
 * Plastic + Power + Machine Amortization + Failure/Waste Buffer + Finishing Labour + Base Fee.
 * Internal parameters are strictly kept private for shop analytics and admin use.
 *
 * Enforces NO silent fallback defaults. If config or material pricing is missing/invalid,
 * throws PRICING_CONFIG_UNAVAILABLE.
 */
export function calculateInternalCost(
  input: QuoteCalculationInput,
  config: MachinePricingConfig
): InternalCostBreakdown {
  if (!isPricingConfigValid(config)) {
    throw new Error('PRICING_CONFIG_UNAVAILABLE');
  }

  const {
    materialWeightGrams,
    printTimeHours,
    material,
    packagingIncluded,
    customMarkupMultiplier,
  } = input;

  if (!material || typeof material.pricePerGram !== 'number' || material.pricePerGram < 0) {
    throw new Error('PRICING_CONFIG_UNAVAILABLE');
  }

  const validWeight = Math.max(0, materialWeightGrams || 0);
  const validHours = Math.max(0, printTimeHours || 0);
  const pricePerGram = material.pricePerGram;

  // 1. Material Cost: exact weight (g) × price per gram
  const materialCost = validWeight * pricePerGram;

  // 2. Electricity Cost: kWh × rate
  const electricityKwh = (validHours * config.printerPowerWatts) / 1000;
  const electricityCost = electricityKwh * config.electricityRatePerKwh;

  // 3. Machine Depreciation / Wear: hours × (printerCost / lifespanHours)
  const machineCostPerHour = config.printerCost / config.printerLifespanHours;
  const machineWearCost = validHours * machineCostPerHour;

  // 4. Failure & Waste Buffer: applied on raw machine production subtotal
  const failurePercent = config.failureBufferPercent / 100;
  const failureBufferCost =
    (materialCost + electricityCost + machineWearCost) * failurePercent;

  // 5. Finishing Labour: minutes ÷ 60 × labour rate
  const labourCost = (config.finishingMinutes / 60) * config.labourRatePerHour;

  // 6. Packaging (if included in unit cost)
  const packagingCost = packagingIncluded ? config.packagingPrice : 0;

  // 7. Base Service / Setup Fee
  const baseServiceFee = config.baseServiceFee;

  // 8. Total Production Cost
  const productionCost =
    materialCost +
    electricityCost +
    machineWearCost +
    failureBufferCost +
    labourCost +
    packagingCost +
    baseServiceFee;

  // 9. Selling Price with Business Markup
  const markupMultiplier = customMarkupMultiplier || config.markupMultiplier;
  const sellingPriceBeforeDiscount = productionCost * markupMultiplier;
  const markupAmount = sellingPriceBeforeDiscount - productionCost;

  // 10. Breakeven prints analysis
  const breakevenPieces =
    markupAmount > 0 && config.printerCost > 0
      ? Math.ceil(config.printerCost / markupAmount)
      : undefined;

  return {
    materialCost: Math.round(materialCost * 100) / 100,
    electricityCost: Math.round(electricityCost * 100) / 100,
    machineWearCost: Math.round(machineWearCost * 100) / 100,
    failureBufferCost: Math.round(failureBufferCost * 100) / 100,
    labourCost: Math.round(labourCost * 100) / 100,
    packagingCost: Math.round(packagingCost * 100) / 100,
    baseServiceFee: Math.round(baseServiceFee * 100) / 100,
    productionCost: Math.round(productionCost * 100) / 100,
    markupAmount: Math.round(markupAmount * 100) / 100,
    sellingPriceBeforeDiscount: Math.round(sellingPriceBeforeDiscount),
    breakevenPieces,
  };
}

/**
 * Calculate the customer-facing quote breakdown.
 *
 * Follows the exact deterministic formula pipeline:
 * Production cost -> Base fee -> Markup -> Unit selling price ->
 * Quantity × unit price -> Quantity discount -> Optional packaging ->
 * Minimum order value check (on order subtotal) -> GST -> Final customer price.
 *
 * Returns quoteStatus = 'production_verified' only when slicing metrics exist,
 * build volume is valid, and pricing config is valid.
 */
export function calculateCustomerQuote(
  input: QuoteCalculationInput,
  config: MachinePricingConfig,
  discountTiers: QuantityDiscountTier[] = DEFAULT_QUANTITY_DISCOUNTS
): CustomerQuoteBreakdown {
  if (!isPricingConfigValid(config) || !input.material || typeof input.material.pricePerGram !== 'number') {
    throw new Error('PRICING_CONFIG_UNAVAILABLE');
  }

  const quantity = Math.max(1, input.quantity || 1);

  // 1. Calculate internal base unit cost without packaging
  const baseInternal = calculateInternalCost(
    { ...input, packagingIncluded: false },
    config
  );

  // 2. Unit selling price (rounded to whole rupee)
  const unitPrice = Math.max(1, Math.round(baseInternal.sellingPriceBeforeDiscount));

  // 3. Raw subtotal
  const subtotal = unitPrice * quantity;

  // 4. Quantity discount
  const discountPercent = getQuantityDiscount(quantity, discountTiers);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const discountedSubtotal = subtotal - discountAmount;

  // 5. Minimum Order Value Check (applies to base print order)
  const minOrder = config.minimumOrderValue;
  const minimumOrderChargeApplied = discountedSubtotal < minOrder;
  const printSubtotalAfterMinOrder = Math.max(discountedSubtotal, minOrder);

  // 6. Optional packaging: add-on calculated per piece as configured
  const packagingAmount = input.packagingIncluded
    ? config.packagingPrice * quantity
    : 0;

  // 7. Subtotal before GST (Print subtotal + optional packaging add-on)
  const subtotalBeforeGst = printSubtotalAfterMinOrder + packagingAmount;

  // 8. GST (if enabled)
  const gstRate = config.gstRate / 100;
  const gstAmount = config.gstEnabled
    ? Math.round(subtotalBeforeGst * gstRate)
    : 0;

  // 9. Final Total Price
  const totalPrice = subtotalBeforeGst + gstAmount;

  // 10. Dynamic Build Envelope Validation
  const activeEnv = input.activeEnvelope || config.maxBuildVolume || { x: 256, y: 256, z: 200 };
  const exceedsBuildVolume = Boolean(
    input.exceedsBuildVolume ||
    (input.dimensions && checkBuildVolume(input.dimensions, activeEnv))
  );

  // 11. Verification & Safety Flags
  const hasZeroWeight = !input.materialWeightGrams || input.materialWeightGrams <= 0;
  const hasZeroTime = !input.printTimeHours || input.printTimeHours <= 0;
  const requiresManualReview = Boolean(exceedsBuildVolume || hasZeroWeight || hasZeroTime);

  let reviewReason: string | undefined;
  if (exceedsBuildVolume) {
    const dimStr = input.dimensions
      ? ` (${input.dimensions.x.toFixed(1)} × ${input.dimensions.y.toFixed(1)} × ${input.dimensions.z.toFixed(1)} mm)`
      : '';
    const envStr = ` (${activeEnv.x} × ${activeEnv.y} × ${activeEnv.z} mm)`;
    reviewReason = `Model dimensions${dimStr} exceed the active printer build envelope${envStr}. Requires manual review.`;
  } else if (hasZeroWeight) {
    reviewReason = 'Invalid model geometry or missing filament statistics. Requires manual review.';
  } else if (hasZeroTime) {
    reviewReason = 'Invalid print duration or missing toolpath statistics. Requires manual review.';
  }

  const quoteStatus: 'production_verified' | 'manual_review' =
    !requiresManualReview && !exceedsBuildVolume && !hasZeroWeight && !hasZeroTime
      ? 'production_verified'
      : 'manual_review';

  return {
    unitPrice,
    quantity,
    subtotal,
    discountAmount,
    discountedSubtotal,
    packagingAmount,
    subtotalBeforeGst,
    minimumOrderChargeApplied,
    gstAmount,
    totalPrice,
    quoteStatus,
    isEstimate: quoteStatus !== 'production_verified',
    requiresManualReview,
    reviewReason,
    pricingBreakdown: baseInternal,
  };
}

/**
 * Check if bounding box dimensions exceed maximum build envelope.
 */
export function checkBuildVolume(
  dimensions: { x: number; y: number; z: number },
  maxBuildVolume: { x: number; y: number; z: number }
): boolean {
  if (!dimensions || !maxBuildVolume) return false;
  return (
    dimensions.x > maxBuildVolume.x ||
    dimensions.y > maxBuildVolume.y ||
    dimensions.z > maxBuildVolume.z
  );
}

