export type MaterialType = 'PLA' | 'PETG' | 'ABS' | 'Resin' | 'Silk PLA' | 'Wood PLA';

export type MaterialMetadata = {
  pricePerGram: number;
  density: number; // g/cm³
  label: string;
  enabled?: boolean;
  tagline: string;
  description: string;
  strength: string;
  heatResistance: string;
  finish: string;
  bestFor: string;
};

export const MATERIAL_CONFIG: Record<MaterialType, MaterialMetadata> = {
  PLA: {
    pricePerGram: 4.5,
    density: 1.24,
    label: 'PLA',
    enabled: true,
    tagline: 'Standard, crisp & rigid thermoplastic',
    description:
      'The most popular 3D printing polymer. Delivers sharp corners, clean overhangs, and high dimensional accuracy for visual prototypes and everyday parts.',
    strength: 'Medium · High Rigidity',
    heatResistance: 'Up to 55°C',
    finish: 'Smooth Matte / Semi-Gloss',
    bestFor: 'Rapid prototypes, architectural models, figurines, decorative items',
  },
  PETG: {
    pricePerGram: 5.5,
    density: 1.27,
    label: 'PETG',
    enabled: true,
    tagline: 'High impact resistance & outdoor durability',
    description:
      'Combines the precision of PLA with the toughness of ABS. Water-resistant, UV-tolerant, and handles mechanical shock without shattering.',
    strength: 'High · Flexible & Impact Resistant',
    heatResistance: 'Up to 75°C',
    finish: 'Glossy / Translucent Options',
    bestFor: 'Mechanical brackets, robotics parts, drone mounts, snap-fit enclosures',
  },
  ABS: {
    pricePerGram: 5.0,
    density: 1.04,
    label: 'ABS',
    enabled: true,
    tagline: 'High temperature resistance & engineering toughness',
    description:
      'Industrial engineering plastic designed for high thermal resistance and mechanical abuse. Suitable for automotive and machine components.',
    strength: 'High · Good Ductility',
    heatResistance: 'Up to 90°C',
    finish: 'Matte / Sandable / Smoothable',
    bestFor: 'Electronic housings, under-hood fixtures, functional mechanisms',
  },
  Resin: {
    pricePerGram: 12.0,
    density: 1.15,
    label: 'Resin',
    enabled: true,
    tagline: 'Ultra-fine resolution with zero layer lines',
    description:
      'Photopolymer resin cured with UV lasers. Produces jewelry-grade surface finish and microscopic details impossible with FDM printers.',
    strength: 'Medium · Rigid',
    heatResistance: 'Up to 60°C',
    finish: 'Injection-Mold Quality Smooth',
    bestFor: 'Miniatures, jewelry masters, precision medical models, intricate art',
  },
  'Silk PLA': {
    pricePerGram: 6.0,
    density: 1.24,
    label: 'Silk PLA',
    enabled: true,
    tagline: 'Lustrous satin finish with metallic reflection',
    description:
      'PLA infused with light-diffracting elastomers. Produces a stunning silk-like shimmer that hides layer seams without any post-processing.',
    strength: 'Medium',
    heatResistance: 'Up to 55°C',
    finish: 'High-Gloss Metallic Satin',
    bestFor: 'Bespoke gifts, trophies, luxury decor, showcase models',
  },
  'Wood PLA': {
    pricePerGram: 7.0,
    density: 1.28,
    label: 'Wood PLA',
    enabled: true,
    tagline: 'Real organic wood composite',
    description:
      'Thermoplastic matrix blended with authentic recycled wood fibers. Can be sanded, carved, and stained just like real timber.',
    strength: 'Medium-Low · Organic Feel',
    heatResistance: 'Up to 55°C',
    finish: 'Textured Natural Wood Grain',
    bestFor: 'Architectural dioramas, artisan decor, tactile homeware',
  },
};

export const BASE_FEE = 100; // ₹100 setup fee
export const INFILL_MULTIPLIER = {
  low: 0.9, // < 20%
  medium: 1.0, // 20-50%
  high: 1.25, // > 50%
};