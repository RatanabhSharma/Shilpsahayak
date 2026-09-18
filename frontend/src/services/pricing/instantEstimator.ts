/**
 * Shilp Studio — Instant Estimator
 *
 * Produces a FAST, GEOMETRY-BASED customer estimate immediately after model
 * upload and configuration — WITHOUT requiring a real slicer (Bambu / PrusaSlicer).
 *
 * Accuracy contract:
 *   ±20–35% vs actual slicer output. Suitable for customer-facing instant pricing.
 *   NEVER claim production-level accuracy. Always label output as "Instant Estimate".
 *
 * Separation of concerns:
 *   - This module handles INSTANT CUSTOMER ESTIMATES only.
 *   - Production-Verified Quotes are produced by the slicer service backend
 *     (slicingClient.ts → executeSlicingJob()) and must pass the slicer result
 *     validator before being shown as "Production-Verified".
 *   - Do NOT call executeSlicingJob() from this module.
 *   - Do NOT use this module's output as authoritative production metrics.
 */

import { calculateCustomerQuote } from './calculateQuote';
import { DEFAULT_QUANTITY_DISCOUNTS } from './pricingConfig';
import type {
  MachinePricingConfig,
  MaterialConfig,
  PrintProfile,
  QuantityDiscountTier,
  CustomerQuoteBreakdown,
} from './pricingTypes';

// ─── Estimator Constants ────────────────────────────────────────────────────

/**
 * Fraction of model volume (in cm³) that becomes material after accounting for
 * the shell/perimeter walls, which are always solid regardless of infill.
 * Empirically: wall shells ≈ 15% of total filament volume for average objects.
 */
const WALL_VOLUME_FRACTION = 0.15;

/**
 * Base extrusion throughput for a standard 0.4mm nozzle at typical print
 * speeds. Used to derive estimated print duration from material weight.
 * Calibrated at ~15 g/h for standard FDM printing.
 */
const BASE_EXTRUSION_GRAMS_PER_HOUR = 15.0;

/**
 * Minimum printer warm-up time (bed mesh levelling, purge line, etc.)
 * in hours. Added to every job estimate.
 */
const MIN_WARMUP_HOURS = 0.2;

/**
 * Print-time multiplier applied per additional color channel to account for
 * AMS/toolchange purge time and deceleration overheads.
 * Each additional color adds roughly 8% to print time.
 */
const MULTICOLOR_TIME_FACTOR_PER_CHANNEL = 0.08;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InstantEstimateInput {
  /** Model geometric volume in cm³ (from model parser) */
  volumeCm3: number;
  /** Whether the model is a multicolor project */
  isMulticolor: boolean;
  /** Number of detected color channels (1 for single-color) */
  colorChannelCount: number;
  /** Selected production material config from admin pricing */
  material: MaterialConfig;
  /** Active print profile (quality selection) from admin pricing */
  profile: PrintProfile;
  /** Resolved infill percentage (0–100) from strength/custom selection */
  infillPercent: number;
  /** Number of pieces */
  quantity: number;
  /** Whether protective packaging is included */
  packagingIncluded: boolean;
  /** Admin machine pricing configuration from Firestore */
  pricingConfig: MachinePricingConfig;
  /** Quantity discount tiers from admin pricing (optional, uses defaults) */
  quantityDiscounts?: QuantityDiscountTier[];
  /** Current model dimensions for build volume check */
  dimensions?: { x: number; y: number; z: number };
}

export interface InstantEstimateResult {
  /** True — identifies this as a geometry-based estimate, not a slicer output */
  isInstantEstimate: true;
  /** Estimated filament weight in grams (geometry-based heuristic) */
  estimatedWeightGrams: number;
  /** Estimated print duration in hours (geometry-based heuristic) */
  estimatedPrintHours: number;
  /** Customer-facing price breakdown (uses same formula as production quotes) */
  quote: CustomerQuoteBreakdown;
  /** Whether the model exceeds the configured build volume */
  exceedsBuildVolume: boolean;
}

export type InstantEstimateOutcome =
  | { success: true; result: InstantEstimateResult }
  | { success: false; reason: string };

// ─── Geometry Estimator ─────────────────────────────────────────────────────

/**
 * Estimate filament weight in grams from model geometry.
 *
 * Formula:
 *   effectiveInfill = infillFraction × (1 - WALL_VOLUME_FRACTION)  [interior volume]
 *   totalFraction   = effectiveInfill + WALL_VOLUME_FRACTION        [interior + shell]
 *   weightGrams     = volumeCm3 × density × totalFraction
 *
 * This does NOT use slicer toolpaths. It is a geometry heuristic.
 * Accuracy: typically ±20–35% vs actual slicer output.
 */
function estimateWeightGrams(
  volumeCm3: number,
  density: number,
  infillPercent: number
): number {
  if (volumeCm3 <= 0 || density <= 0) return 0;
  const infillFraction = Math.min(Math.max(infillPercent / 100, 0), 1);
  const interiorFraction = infillFraction * (1 - WALL_VOLUME_FRACTION);
  const totalFraction = interiorFraction + WALL_VOLUME_FRACTION;
  return Math.round(volumeCm3 * density * totalFraction * 10) / 10;
}

/**
 * Estimate print time in hours from material weight.
 *
 * Applies multicolor overhead for AMS tool changes and purge time.
 * Adds a fixed warm-up allowance for every job.
 */
function estimatePrintHours(
  weightGrams: number,
  colorChannelCount: number,
  profile?: PrintProfile
): number {
  if (weightGrams <= 0) return MIN_WARMUP_HOURS;
  const timeFactor = profile?.printTimeFactor ?? 1.0;
  const baseHours = (weightGrams / BASE_EXTRUSION_GRAMS_PER_HOUR) * timeFactor;
  const extraChannels = Math.max(0, colorChannelCount - 1);
  const multicolorOverhead = baseHours * extraChannels * MULTICOLOR_TIME_FACTOR_PER_CHANNEL;
  return Math.round((baseHours + multicolorOverhead + MIN_WARMUP_HOURS) * 100) / 100;
}

// ─── Build Volume Check ─────────────────────────────────────────────────────

function checkBuildVolume(
  dims: { x: number; y: number; z: number } | undefined,
  maxVol: { x: number; y: number; z: number }
): boolean {
  if (!dims) return false;
  return dims.x > maxVol.x || dims.y > maxVol.y || dims.z > maxVol.z;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Compute an instant customer-facing estimate from model geometry and admin
 * pricing configuration.
 *
 * IMPORTANT: This function does NOT call any slicer. The result must be
 * clearly labeled "Instant Estimate" in the UI. It must never be labeled
 * "Production-Verified Quote".
 *
 * Returns { success: false } when:
 *   - volumeCm3 is zero or negative (model analysis failed)
 *   - admin pricing config is not available
 *   - material pricing is missing
 *
 * In those cases, show "Instant estimate unavailable" and offer Workshop Review.
 */
export function computeInstantEstimate(
  input: InstantEstimateInput
): InstantEstimateOutcome {
  const {
    volumeCm3,
    isMulticolor,
    colorChannelCount,
    material,
    profile,
    infillPercent,
    quantity,
    packagingIncluded,
    pricingConfig,
    quantityDiscounts,
    dimensions,
  } = input;

  // Guard: geometry must be analyzable
  if (!volumeCm3 || volumeCm3 <= 0) {
    return {
      success: false,
      reason: 'Model geometry could not be analyzed. Volume is zero or unavailable.',
    };
  }

  // Guard: pricing config required
  if (!pricingConfig) {
    return {
      success: false,
      reason: 'Admin pricing configuration is unavailable.',
    };
  }

  // Guard: material pricing required
  if (!material || typeof material.pricePerGram !== 'number' || material.pricePerGram <= 0) {
    return {
      success: false,
      reason: 'Material pricing is unavailable.',
    };
  }

  // Guard: density required
  if (!material.density || material.density <= 0) {
    return {
      success: false,
      reason: 'Material density is unavailable.',
    };
  }

  // Effective color channels for time estimation
  const channels = isMulticolor ? Math.max(1, colorChannelCount) : 1;

  // Geometry-based weight and time estimates
  const estimatedWeightGrams = estimateWeightGrams(
    volumeCm3,
    material.density,
    infillPercent
  );
  const estimatedPrintHours = estimatePrintHours(estimatedWeightGrams, channels, profile);

  // Guard: estimated weight must be meaningful
  if (estimatedWeightGrams <= 0) {
    return {
      success: false,
      reason: 'Estimated material weight is zero. Model may be empty or too small.',
    };
  }

  // Build volume check
  const maxVol = pricingConfig.maxBuildVolume || { x: 256, y: 256, z: 200 };
  const exceedsBuildVolume = checkBuildVolume(dimensions, maxVol);

  // Use the same calculateCustomerQuote formula as production quotes.
  // The ONLY difference: inputs come from geometry heuristics instead of slicer toolpaths.
  let quote: CustomerQuoteBreakdown;
  try {
    quote = calculateCustomerQuote(
      {
        materialWeightGrams: estimatedWeightGrams,
        printTimeHours: estimatedPrintHours,
        material,
        quantity,
        packagingIncluded,
        exceedsBuildVolume,
        activeEnvelope: maxVol,
        dimensions,
      },
      pricingConfig,
      quantityDiscounts || DEFAULT_QUANTITY_DISCOUNTS
    );
  } catch (err: any) {
    return {
      success: false,
      reason: err?.message === 'PRICING_CONFIG_UNAVAILABLE'
        ? 'Pricing configuration is incomplete. Please contact the workshop.'
        : 'Could not calculate estimate. Please try again.',
    };
  }

  return {
    success: true,
    result: {
      isInstantEstimate: true,
      estimatedWeightGrams,
      estimatedPrintHours,
      quote,
      exceedsBuildVolume,
    },
  };
}

