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
  /** @deprecated Removed from authoritative quote path. Slicer generates toolpath directly. */
  materialUsageFactor?: number;
  /** @deprecated Removed from authoritative quote path. Slicer generates toolpath directly. */
  printTimeFactor?: number;
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

  /** Authoritative quote verification status */
  quoteStatus: 'production_verified' | 'manual_review';
  /** @deprecated Kept for transition backward compatibility, false for verified quotes */
  isEstimate?: boolean;
  requiresManualReview: boolean;
  reviewReason?: string;
  weightSource?: 'slicer_grams' | 'slicer_length_density';
  pricingBreakdown?: InternalCostBreakdown;
};

export type QuoteCalculationInput = {
  materialWeightGrams: number;
  printTimeHours: number;
  material: MaterialConfig;
  quantity: number;
  packagingIncluded: boolean;
  exceedsBuildVolume?: boolean;
  customMarkupMultiplier?: number;
  activeEnvelope?: { x: number; y: number; z: number };
  dimensions?: { x: number; y: number; z: number };
};

export type AuthoritativeSliceResult = {
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  filamentGrams: number;
  filamentMm?: number;
  printTimeSeconds: number;
  rawTimeString: string;
  profileId: string;
  profileVersion?: string;
  printerId?: string;
  activeEnvelope: {
    x: number;
    y: number;
    z: number;
  };
  classification: string;
  weightSource: 'slicer_grams' | 'slicer_length_density';
  timeSource: 'slicer_toolpath';
  slicingStatus: 'completed' | 'failed';
  quoteStatus?: 'production_verified' | 'manual_review';
};

export type QuoteSnapshot = {
  quoteId: string;
  fileReference: {
    fileKey?: string;
    fileName: string;
    fileSizeBytes?: number;
    modelHash?: string;
  };
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  scale: {
    scaleFactor: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
  };
  rotation?: {
    x: number;
    y: number;
    z: number;
  };
  filamentGrams: number;
  filamentMm?: number;
  printTimeSeconds: number;
  rawTimeString: string;
  weightSource: 'slicer_grams' | 'slicer_length_density';
  timeSource: 'slicer_toolpath';
  printerId?: string;
  profileId: string;
  profileName?: string;
  profileVersion?: string;
  nozzleDiameterMm?: number;
  activeEnvelope: {
    x: number;
    y: number;
    z: number;
  };
  material: {
    id: string;
    name: string;
    pricePerGram: number;
    density: number;
    color?: string;
    colorHex?: string;
  };
  qualityPreset?: string;
  layerHeight: number;
  infillPercent: number;
  wallCount?: number;
  supportMode: string;
  quantity: number;
  packagingIncluded: boolean;
  pricingVersion: string;
  pricingUpdatedAt?: string;
  costBreakdown: {
    materialCost: number;
    electricityCost: number;
    machineWearCost: number;
    failureBufferCost: number;
    labourCost: number;
    packagingCost: number;
    baseServiceFee: number;
    productionCost: number;
    markupAmount: number;
    subtotal: number;
    discountAmount: number;
    discountedSubtotal: number;
    minimumOrderChargeApplied: boolean;
    gstAmount: number;
    totalPrice: number;
    unitPrice: number;
  };
  quoteStatus: 'production_verified' | 'manual_review';
  createdAt: string;
};

