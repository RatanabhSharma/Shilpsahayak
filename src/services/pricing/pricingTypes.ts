/**
 * Shilp Sahayak — 3D Printing Pricing Engine Types
 * Pure TypeScript definitions decoupled from UI, DOM, and browser APIs.
 */

export type MachinePricingConfig = {
  /** Machine purchase price in INR (e.g. ₹25,000) */
  printerCost: number;
  /** Estimated operational lifespan in hours (e.g. 5,000 hrs) */
  printerLifespanHours: number;
  /** Average power consumption while printing in Watts (e.g. 100 W) */
  printerPowerWatts: number;
  /** Cost per unit/kWh of electricity in INR (e.g. ₹8 / kWh) */
  electricityRatePerKwh: number;

  /** Percentage buffer added for print failures & wastage (e.g. 10%) */
  failureBufferPercent: number;
  /** Labour/finishing rate in INR per hour (e.g. ₹200 / hr) */
  labourRatePerHour: number;
  /** Standard finishing time required per piece in minutes (e.g. 5 mins) */
  finishingMinutes: number;

  /** Base preparation/service setup fee in INR (e.g. ₹30) */
  baseServiceFee: number;
  /** Minimum order value in INR (e.g. ₹149) */
  minimumOrderValue: number;

  /** Markup multiplier on total production cost (e.g. 2.2x) */
  markupMultiplier: number;

  /** Whether GST is applied */
  gstEnabled: boolean;
  /** GST rate percentage (e.g. 18%) */
  gstRate: number;

  /** Standard packaging cost per piece in INR (e.g. ₹20) */
  packagingPrice: number;

  /** Maximum build dimensions for the printer in mm */
  maxBuildVolume: {
    x: number;
    y: number;
    z: number;
  };
};

export type MaterialConfig = {
  id: string;
  name: string;
  /** Selling rate per gram in INR */
  pricePerGram: number;
  /** Density in g/cm³ (e.g. PLA 1.24, PETG 1.27, TPU 1.21) */
  density: number;
  enabled: boolean;
  /** Available color names / hex swatches */
  colors: {
    name: string;
    hex: string;
  }[];
  tagline?: string;
  description?: string;
};

export type PrintProfile = {
  id: 'budget' | 'standard' | 'premium' | string;
  name: string;
  /** Layer height in mm (e.g. 0.28, 0.20, 0.12) */
  layerHeight: number;
  /** Default infill percentage (e.g. 15, 20, 25) */
  infillPercent: number;
  wallCount: number;
  /** Fraction of solid volume consumed (e.g. 0.35, 0.45, 0.55) */
  materialUsageFactor: number;
  /** Multiplier affecting print duration (e.g. 0.8, 1.0, 1.3) */
  printTimeFactor: number;
  enabled: boolean;
  tagline?: string;
};

export type QuantityDiscountTier = {
  minQuantity: number;
  maxQuantity?: number;
  discountPercent: number; // e.g. 5 for 5%
};

export type GeometryAnalysisResult = {
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  volumeCm3: number;
  triangleCount: number;

  estimatedWeightGrams: number;
  estimatedPrintTimeHours: number;

  exceedsBuildVolume: boolean;
  requiresManualReview: boolean;
  reviewReason?: string;
};

export type InternalCostBreakdown = {
  materialCost: number;
  electricityCost: number;
  machineWearCost: number;
  failureBufferCost: number;
  labourCost: number;
  packagingCost: number;
  baseServiceFee: number;

  /** Sum of material + electricity + machineWear + failureBuffer + labour + packaging + baseServiceFee */
  productionCost: number;
  /** Profit margin per piece before bulk discount */
  markupAmount: number;
  /** Unit price before bulk discount */
  sellingPriceBeforeDiscount: number;

  /** Estimated number of prints to break even on printer cost */
  breakevenPieces?: number;
};

export type CustomerQuoteBreakdown = {
  /** Selling price per unit (after profile/markup) */
  unitPrice: number;
  quantity: number;

  /** Raw subtotal before discount: unitPrice × quantity */
  subtotal: number;
  /** Applied bulk quantity discount in INR */
  discountAmount: number;
  /** Subtotal after quantity discount */
  discountedSubtotal: number;

  /** Packaging cost in INR (if enabled) */
  packagingAmount: number;
  /** Subtotal with packaging before GST, clamped to minimumOrderValue */
  subtotalBeforeGst: number;
  /** Whether the minimum order value was enforced */
  minimumOrderChargeApplied: boolean;

  /** GST amount in INR */
  gstAmount: number;
  /** Final total amount to be charged */
  totalPrice: number;

  isEstimate: boolean;
  requiresManualReview: boolean;
  reviewReason?: string;
};

export type QuoteCalculationInput = {
  materialWeightGrams: number;
  printTimeHours: number;
  material: MaterialConfig;
  quantity: number;
  packagingIncluded: boolean;
  exceedsBuildVolume?: boolean;
  customMarkupMultiplier?: number;
};

