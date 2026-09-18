/**
 * Shilp Sahayak — Workshop Filament Catalog & AMS Production Mapping Helpers
 * Pure TypeScript functions decoupled from React, DOM, and browser APIs.
 */

import { MaterialConfig, AmsSlotConfig } from '../pricing/pricingTypes';
import { DetectedColor, ProductionColorMapping } from '../model/modelTypes';

export interface WorkshopFilament {
  id: string;
  materialId: string;
  materialType: string;
  colorName: string;
  colorHex: string;
}

/**
 * Derives the active workshop filament catalog from enabled materials and their color swatches.
 */
export function getWorkshopFilamentCatalog(materials: MaterialConfig[]): WorkshopFilament[] {
  const filaments: WorkshopFilament[] = [];
  materials.forEach((mat) => {
    if (!mat.enabled) return;
    mat.colors.forEach((col) => {
      filaments.push({
        id: `${mat.id}-${col.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        materialId: mat.id,
        materialType: mat.name,
        colorName: col.name,
        colorHex: col.hex,
      });
    });
  });
  return filaments;
}

/**
 * Initializes default production color mappings for detected model colors.
 * - Production Color defaults to original detected color
 * - Production Material defaults to the globally chosen production material or standard workshop material
 * - AMS Slot defaults to null (Unassigned)
 */
export function createDefaultProductionMapping(
  detectedColors: DetectedColor[],
  materials: MaterialConfig[],
  overrideMaterial?: MaterialConfig
): Record<number, ProductionColorMapping> {
  const mapping: Record<number, ProductionColorMapping> = {};
  const defaultMat = overrideMaterial || materials.find((m) => m.enabled) || materials[0];

  detectedColors.forEach((col) => {
    const slot = col.sourceFilament ?? col.index;
    const chosenMat = overrideMaterial || defaultMat;

    mapping[slot] = {
      sourceFilament: slot,
      originalHex: col.hex,
      productionHex: col.hex,
      materialId: chosenMat?.id || 'pla',
      materialType: chosenMat?.name || 'PLA',
      amsSlot: null, // Default to Unassigned
    };
  });

  return mapping;
}

/**
 * Formats an AMS slot label for display in UI dropdowns.
 */
export function formatAmsSlotLabel(slot: AmsSlotConfig): string {
  return `Slot ${slot.slotNumber}: ${slot.materialType} · ${slot.colorName} (${slot.colorHex})`;
}

export interface ColorMatchResult {
  isMatch: boolean;
  distance: number;
  reason: string;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

/**
 * Calculates perceptual color distance using the standard redmean metric.
 * 0 indicates identical color. Lower is closer.
 */
export function calculateColorDistance(hex1: string, hex2: string): number {
  if (hex1.trim().toLowerCase() === hex2.trim().toLowerCase()) return 0;
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return 999;
  const rmean = (c1.r + c2.r) / 2;
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(
    (2 + rmean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db
  );
}

/**
 * Evaluates whether a requested production color reasonably matches the loaded AMS filament color.
 * Default threshold of 105 allows close shades while flagging distinct color differences.
 */
export function checkAmsColorMatch(
  productionHex: string,
  amsHex: string,
  threshold: number = 105
): ColorMatchResult {
  const distance = calculateColorDistance(productionHex, amsHex);
  const isMatch = distance <= threshold;
  return {
    isMatch,
    distance,
    reason: isMatch ? 'Color Match' : 'Production color differs from loaded AMS filament.',
  };
}

/**
 * Updates the AMS slot assignment for a specific filament in a production color mapping table.
 */
export function updateProductionAmsSlot(
  mapping: Record<number, ProductionColorMapping>,
  filamentSlot: number,
  amsSlot: number | null
): Record<number, ProductionColorMapping> {
  const existing = mapping[filamentSlot];
  if (!existing) return mapping;
  return {
    ...mapping,
    [filamentSlot]: {
      ...existing,
      amsSlot,
    },
  };
}


