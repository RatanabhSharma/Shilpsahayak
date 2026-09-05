import {
  MachinePricingConfig,
  MaterialConfig,
  PrintProfile,
  QuantityDiscountTier,
} from './pricingTypes';

export const PRICING_VERSION = '2026-09-05-v1';

/**
 * Default machine & business settings.
 * Clearly marked development baseline values.
 * Fully configurable from the Shilp Sahayak Admin Panel without code updates.
 */
export const DEFAULT_PRICING_CONFIG: MachinePricingConfig = {
  printerCost: 25000, // ₹25,000 purchase price
  printerLifespanHours: 5000, // 5,000 hours expected service life
  printerPowerWatts: 100, // 100 Watts average print bed/hotend load
  electricityRatePerKwh: 8.0, // ₹8 per kWh / commercial unit

  failureBufferPercent: 10, // 10% failure & purge buffer
  labourRatePerHour: 200, // ₹200 / hour operator rate
  finishingMinutes: 5, // 5 minutes standard post-processing/cleanup

  baseServiceFee: 30, // ₹30 prep & slicer queue fee
  minimumOrderValue: 149, // ₹149 minimum checkout threshold

  markupMultiplier: 2.2, // 2.2x retail multiplier on production cost

  gstEnabled: false, // Default disabled, toggleable in admin
  gstRate: 18, // 18% standard GST rate for manufacturing services

  packagingPrice: 20, // ₹20 optional corrugated box & bubble wrap

  maxBuildVolume: {
    x: 256,
    y: 256,
    z: 256,
  },
};

/**
 * Initial supported materials: PLA, PETG, TPU.
 * Note: Material pricing is pricing configuration only, NOT raw inventory.
 */
export const DEFAULT_MATERIALS: MaterialConfig[] = [
  {
    id: 'pla',
    name: 'PLA',
    pricePerGram: 4.5,
    density: 1.24,
    enabled: true,
    tagline: 'Standard, crisp & rigid thermoplastic',
    description:
      'Ideal for everyday models, display pieces, architectural maquettes, and visual prototypes.',
    colors: [
      { name: 'Matte Black', hex: '#1C1917' },
      { name: 'Pure White', hex: '#F8FAFC' },
      { name: 'Crimson Red', hex: '#EF4444' },
      { name: 'Royal Blue', hex: '#2563EB' },
      { name: 'Forest Green', hex: '#15803D' },
      { name: 'Steel Grey', hex: '#64748B' },
      { name: 'Bright Orange', hex: '#F97316' },
      { name: 'Sunshine Yellow', hex: '#EAB308' },
      { name: 'Silk Gold', hex: '#D4AF37' },
      { name: 'Silk Silver', hex: '#CBD5E1' },
      { name: 'Lavender Violet', hex: '#8B5CF6' },
      { name: 'Mint Cyan', hex: '#06B6D4' },
    ],
  },
  {
    id: 'petg',
    name: 'PETG',
    pricePerGram: 5.5,
    density: 1.27,
    enabled: true,
    tagline: 'Impact-resistant & outdoor durable',
    description:
      'High mechanical strength and temperature resistance. Best for mechanical brackets, enclosures, and functional parts.',
    colors: [
      { name: 'Carbon Black', hex: '#0F172A' },
      { name: 'Clear White', hex: '#F1F5F9' },
      { name: 'Industrial Grey', hex: '#475569' },
      { name: 'Ocean Blue', hex: '#0284C7' },
      { name: 'Signal Orange', hex: '#EA580C' },
      { name: 'Fire Red', hex: '#DC2626' },
      { name: 'Army Green', hex: '#166534' },
      { name: 'Translucent Clear', hex: '#E2E8F0' },
    ],
  },
  {
    id: 'tpu',
    name: 'TPU (Flexible)',
    pricePerGram: 7.0,
    density: 1.21,
    enabled: true,
    tagline: 'Rubber-like flexible & shock-absorbing',
    description:
      'High elasticity, impact dampening, and abrasion resistance. Best for gaskets, phone bumpers, and protective covers.',
    colors: [
      { name: 'Jet Black', hex: '#18181B' },
      { name: 'Natural White', hex: '#E2E8F0' },
      { name: 'Safety Red', hex: '#DC2626' },
      { name: 'Vibrant Blue', hex: '#3B82F6' },
      { name: 'Neon Yellow', hex: '#FACC15' },
      { name: 'Olive Green', hex: '#3F6212' },
    ],
  },
];

/**
 * Standard Customer Print Profiles.
 * Maps customer-facing quality choices to internal estimation parameters.
 */
export const DEFAULT_PRINT_PROFILES: PrintProfile[] = [
  {
    id: 'budget',
    name: 'Budget',
    layerHeight: 0.28,
    infillPercent: 15,
    wallCount: 2,
    materialUsageFactor: 0.35,
    printTimeFactor: 0.8,
    enabled: true,
    tagline: 'Fast print & economical for rough drafts',
  },
  {
    id: 'standard',
    name: 'Standard',
    layerHeight: 0.2,
    infillPercent: 20,
    wallCount: 3,
    materialUsageFactor: 0.45,
    printTimeFactor: 1.0,
    enabled: true,
    tagline: 'Recommended balance of surface finish and strength',
  },
  {
    id: 'premium',
    name: 'Premium',
    layerHeight: 0.12,
    infillPercent: 25,
    wallCount: 4,
    materialUsageFactor: 0.55,
    printTimeFactor: 1.3,
    enabled: true,
    tagline: 'Ultra-fine layer lines & maximum surface detail',
  },
];

/**
 * Volume quantity discount tiers.
 */
export const DEFAULT_QUANTITY_DISCOUNTS: QuantityDiscountTier[] = [
  { minQuantity: 1, maxQuantity: 4, discountPercent: 0 },
  { minQuantity: 5, maxQuantity: 9, discountPercent: 5 },
  { minQuantity: 10, maxQuantity: 24, discountPercent: 10 },
  { minQuantity: 25, discountPercent: 15 },
];

