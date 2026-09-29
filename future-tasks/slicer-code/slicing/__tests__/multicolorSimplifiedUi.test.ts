import { describe, it, expect } from 'vitest';
import { createDefaultProductionMapping } from '../../filament/filamentCatalog';
import { normalizeMulticolorSummary } from '../slicingClient';
import { DetectedColor } from '../../model/modelTypes';
import { MaterialConfig } from '../../pricing/pricingTypes';

const mockMaterials: MaterialConfig[] = [
  {
    id: 'pla',
    name: 'PLA',
    tagline: 'Standard prototyping',
    description: 'Easy to print PLA',
    pricePerGram: 4.5,
    density: 1.24,
    enabled: true,
    colors: [
      { name: 'Black', hex: '#161616' },
      { name: 'White', hex: '#FFFFFF' },
    ],
  },
  {
    id: 'petg',
    name: 'PETG',
    tagline: 'Durable & impact-resistant',
    description: 'Tough PETG material',
    pricePerGram: 5.5,
    density: 1.27,
    enabled: true,
    colors: [
      { name: 'Black', hex: '#161616' },
    ],
  },
  {
    id: 'tpu',
    name: 'TPU',
    tagline: 'Flexible rubber-like',
    description: 'Flexible TPU',
    pricePerGram: 7.0,
    density: 1.21,
    enabled: true,
    colors: [
      { name: 'Black', hex: '#161616' },
    ],
  },
];

const mock8ColorDetected: DetectedColor[] = [
  { index: 1, sourceFilament: 1, hex: '#161616', colorName: 'Black', materialType: 'PETG' },
  { index: 2, sourceFilament: 2, hex: '#FFFFFF', colorName: 'White', materialType: 'PETG' },
  { index: 3, sourceFilament: 3, hex: '#FF80C0', colorName: 'Pink', materialType: 'PETG' },
  { index: 4, sourceFilament: 4, hex: '#FF1C1C', colorName: 'Red', materialType: 'PETG' },
  { index: 5, sourceFilament: 5, hex: '#FFFF00', colorName: 'Yellow', materialType: 'PETG' },
  { index: 6, sourceFilament: 6, hex: '#00B9FF', colorName: 'Light Blue', materialType: 'PETG' },
  { index: 7, sourceFilament: 7, hex: '#1C10B1', colorName: 'Dark Blue', materialType: 'PETG' },
  { index: 8, sourceFilament: 8, hex: '#0393FC', colorName: 'Blue', materialType: 'PETG' },
];

describe('Multicolor Simplified Customer UI Contract', () => {
  it('Case A: PETG-source 8-color 3MF + Production Material PLA uses PLA for all 8 channels', () => {
    const activeMaterial = mockMaterials[0]; // PLA
    const mapping = createDefaultProductionMapping(mock8ColorDetected, mockMaterials, activeMaterial);

    const slots = Object.keys(mapping);
    expect(slots.length).toBe(8);

    // Verify all 8 colors remain and use PLA
    for (const slot of slots) {
      const entry = mapping[Number(slot)];
      expect(entry.materialId).toBe('pla');
      expect(entry.materialType).toBe('PLA');
      expect(entry.productionHex).toBe(entry.originalHex);
      expect(entry.amsSlot).toBeNull();
    }
  });

  it('Case B: PETG-source 8-color 3MF + Production Material PETG uses PETG for all 8 channels', () => {
    const activeMaterial = mockMaterials[1]; // PETG
    const mapping = createDefaultProductionMapping(mock8ColorDetected, mockMaterials, activeMaterial);

    const slots = Object.keys(mapping);
    expect(slots.length).toBe(8);

    for (const slot of slots) {
      const entry = mapping[Number(slot)];
      expect(entry.materialId).toBe('petg');
      expect(entry.materialType).toBe('PETG');
    }
  });

  it('Case C: Single-material STL remains single-material without multicolor breakdown', () => {
    const singleSlice = {
      filamentGrams: 35.0,
      printTimeSeconds: 2400,
      adapter: 'prusa_slicer_cli',
      statistics: {
        filament_grams: 35.0,
        print_time_seconds: 2400,
        tool_change_count: 0,
        per_filament: [],
      },
    };

    const summary = normalizeMulticolorSummary(singleSlice, { colourMode: 'single' });
    expect(summary.isMulticolor).toBe(false);
    expect(summary.mode).toBe('single_material');
    expect(summary.filaments.length).toBe(0);
    expect(summary.totalFilamentGrams).toBe(35.0);
  });

  it('preserves color customization while keeping global material aligned', () => {
    const plaMat = mockMaterials[0];
    const mapping = createDefaultProductionMapping(mock8ColorDetected, mockMaterials, plaMat);

    // User customizes color on slot 5
    mapping[5] = {
      ...mapping[5],
      productionHex: '#FF0000',
    };

    expect(mapping[5].productionHex).toBe('#FF0000');
    expect(mapping[5].originalHex).toBe('#FFFF00');
    expect(mapping[5].materialType).toBe('PLA');

    // If user switches global material to TPU
    const tpuMat = mockMaterials[2];
    for (const key of Object.keys(mapping)) {
      mapping[Number(key)] = {
        ...mapping[Number(key)],
        materialId: tpuMat.id,
        materialType: tpuMat.name,
      };
    }

    // Customized color remains #FF0000, material is now TPU
    expect(mapping[5].productionHex).toBe('#FF0000');
    expect(mapping[5].materialType).toBe('TPU');
    expect(mapping[1].materialType).toBe('TPU');
  });
});

