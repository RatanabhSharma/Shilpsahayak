export type MaterialType = 'PLA' | 'PETG' | 'ABS' | 'Resin' | 'Silk PLA' | 'Wood PLA';

export const MATERIAL_CONFIG: Record<
  MaterialType,
  {
    pricePerGram: number;
    density: number; // g/cm³
    label: string;
  }
> = {
  PLA: {
    pricePerGram: 4.5,
    density: 1.24,
    label: 'PLA'
  },
  PETG: {
    pricePerGram: 5.5,
    density: 1.27,
    label: 'PETG'
  },
  ABS: {
    pricePerGram: 5.0,
    density: 1.04,
    label: 'ABS'
  },
  Resin: {
    pricePerGram: 12.0,
    density: 1.15,
    label: 'Resin'
  },
  'Silk PLA': {
    pricePerGram: 6.0,
    density: 1.24,
    label: 'Silk PLA'
  },
  'Wood PLA': {
    pricePerGram: 7.0,
    density: 1.28,
    label: 'Wood PLA'
  }
};

export const BASE_FEE = 100; // ₹100 setup fee
export const INFILL_MULTIPLIER = {
  low: 0.9,    // < 20%
  medium: 1.0, // 20-50%
  high: 1.25   // > 50%
};