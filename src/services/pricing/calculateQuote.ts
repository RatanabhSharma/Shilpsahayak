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
 * Calculate the complete internal cost breakdown for 1 unit of a 3D print.
 *
 * This function calculates real-world production physics:
 * Plastic + Power + Machine Amortization + Failure Buffer + Finishing Labour + Base Fee.
 * Internal parameters are strictly kept private for shop analytics and admin use.
 */
export function calculateInternalCost(
  input: QuoteCalculationInput,
  config: MachinePricingConfig
): InternalCostBreakdown {
  const {
    materialWeightGrams,
    printTimeHours,
    material,
    packagingIncluded,
    customMarkupMultiplier,
  } = input;

  const validWeight = Math.max(0, materialWeightGrams || 0);
  const validHours = Math.max(0, printTimeHours || 0);
  const pricePerGram = material?.pricePerGram || 4.5;

  // 1. Material Cost
  const materialCost = validWeight * pricePerGram;

  // 2. Electricity Cost: kWh × rate
  const electricityKwh = (validHours * (config.printerPowerWatts || 100)) / 1000;
  const electricityCost = electricityKwh * (config.electricityRatePerKwh || 8.0);

  // 3. Machine Depreciation / Wear: hours × (printerCost / lifespanHours)
  const lifespan = Math.max(1, config.printerLifespanHours || 5000);
  const machineCostPerHour = (config.printerCost || 25000) / lifespan;
  const machineWearCost = validHours * machineCostPerHour;

  // 4. Failure Buffer: applied on machine production subtotal
  const failurePercent = (config.failureBufferPercent || 10) / 100;
  const failureBufferCost =
    (materialCost + electricityCost + machineWearCost) * failurePercent;

  // 5. Finishing Labour: minutes ÷ 60 × labour rate
  const finishingMins = config.finishingMinutes || 5;
  const labourCost = (finishingMins / 60) * (config.labourRatePerHour || 200);

  // 6. Packaging (if included)
  const packagingCost = packagingIncluded ? (config.packagingPrice || 20) : 0;

  // 7. Base Service / Setup Fee
  const baseServiceFee = config.baseServiceFee || 30;

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
  const markupMultiplier = customMarkupMultiplier || config.markupMultiplier || 2.2;
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
 * Follows the exact formula pipeline:
 * Production cost -> Base fee -> Markup -> Unit selling price ->
 * Quantity × unit price -> Quantity discount -> Optional packaging ->
 * Minimum order value check (on order subtotal) -> GST -> Final estimated price.
 */
export function calculateCustomerQuote(
  input: QuoteCalculationInput,
  config: MachinePricingConfig,
  discountTiers: QuantityDiscountTier[] = DEFAULT_QUANTITY_DISCOUNTS
): CustomerQuoteBreakdown {
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
  const minOrder = config.minimumOrderValue || 149;
  const minimumOrderChargeApplied = discountedSubtotal < minOrder;
  const printSubtotalAfterMinOrder = Math.max(discountedSubtotal, minOrder);

  // 6. Optional packaging: add-on calculated per piece as configured
  const packagingAmount = input.packagingIncluded
    ? (config.packagingPrice || 20) * quantity
    : 0;

  // 7. Subtotal before GST (Print subtotal + optional packaging add-on)
  const subtotalBeforeGst = printSubtotalAfterMinOrder + packagingAmount;

  // 8. GST (if enabled)
  const gstRate = (config.gstRate || 18) / 100;
  const gstAmount = config.gstEnabled
    ? Math.round(subtotalBeforeGst * gstRate)
    : 0;

  // 9. Final Total Price
  const totalPrice = subtotalBeforeGst + gstAmount;

  // 10. Safety check flags
  const requiresManualReview = Boolean(
    input.exceedsBuildVolume ||
      input.materialWeightGrams <= 0 ||
      input.printTimeHours <= 0
  );

  let reviewReason: string | undefined;
  if (input.exceedsBuildVolume) {
    reviewReason =
      'Model exceeds printer build volume (256 × 256 × 256 mm). Requires manual review.';
  } else if (input.materialWeightGrams <= 0) {
    reviewReason =
      'Invalid model geometry or volume calculation. Requires manual review.';
  }

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
    isEstimate: true,
    requiresManualReview,
    reviewReason,
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

