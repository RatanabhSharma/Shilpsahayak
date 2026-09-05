import {
  PrintProfile,
  QuantityDiscountTier,
} from './pricingTypes';

/**
 * Standard baseline material extrusion throughput:
 * ~15 grams per hour for standard 0.4mm nozzle at 50mm/s.
 */
const BASE_EXTRUSION_GRAMS_PER_HOUR = 15.0;

/**
 * Minimal printer warm-up, bed mesh levelling, and purge line duration:
 * 0.2 hours (12 minutes).
 */
const MIN_WARMUP_HOURS = 0.2;

/**
 * Estimate material usage from geometric volume, density, and print profile.
 *
 * Formula:
 * Estimated Solid Weight = volumeCm3 × material density
 * Estimated Material Usage = Estimated Solid Weight × profile.materialUsageFactor
 */
export function estimateMaterialUsage(
  volumeCm3: number,
  density: number,
  profile: PrintProfile
): number {
  if (volumeCm3 <= 0 || density <= 0) {
    return 0;
  }
  const solidWeight = volumeCm3 * density;
  const usage = solidWeight * (profile.materialUsageFactor || 0.45);
  return Math.round(usage * 10) / 10; // 1 decimal place
}

/**
 * Estimate print duration in hours based on material usage and print profile speed factor.
 *
 * Formula:
 * Raw Hours = (materialUsageGrams / baseExtrusionRate) × profile.printTimeFactor
 * Total Hours = Raw Hours + Warmup Duration
 */
export function estimatePrintTime(
  materialUsageGrams: number,
  profile: PrintProfile
): number {
  if (materialUsageGrams <= 0) {
    return 0;
  }
  const rawHours =
    (materialUsageGrams / BASE_EXTRUSION_GRAMS_PER_HOUR) *
    (profile.printTimeFactor || 1.0);
  const total = rawHours + MIN_WARMUP_HOURS;
  return Math.round(total * 100) / 100; // 2 decimal places
}

/**
 * Find the applicable quantity discount percentage.
 */
export function getQuantityDiscount(
  quantity: number,
  tiers: QuantityDiscountTier[]
): number {
  if (quantity <= 1 || !tiers || tiers.length === 0) {
    return 0;
  }

  for (const tier of tiers) {
    if (quantity >= tier.minQuantity) {
      if (tier.maxQuantity === undefined || quantity <= tier.maxQuantity) {
        return tier.discountPercent;
      }
    }
  }

  return 0;
}

/**
 * Format currency in Indian standard (e.g. ₹1,249).
 */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  return `₹${rounded.toLocaleString('en-IN')}`;
}

/**
 * Format hours into a human-readable string (e.g. "5h 42m", "45m").
 */
export function formatPrintTime(hours: number): string {
  if (hours <= 0) return '0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

