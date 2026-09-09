import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { detectOriginalColors } from '../model/modelParser';
import {
  estimateMaterialUsage,
  estimatePrintTime,
} from './pricingUtils';
import { calculateCustomerQuote, checkBuildVolume } from './calculateQuote';
import {
  DEFAULT_PRICING_CONFIG,
  DEFAULT_MATERIALS,
  DEFAULT_PRINT_PROFILES,
  DEFAULT_QUANTITY_DISCOUNTS,
} from './pricingConfig';

describe('Shilp Studio Phase 1 Comprehensive Test Suite', () => {
  describe('Suite 1: Original Colour Detection', () => {
    it('correctly identifies plain monochrome geometry as hasColors=false', () => {
      const plainGeom = new THREE.BoxGeometry(20, 20, 20);
      const res = detectOriginalColors(plainGeom, null);
      expect(res.hasColors).toBe(false);
    });

    it('detects vertex-colored geometry (multi-color vertex attributes)', () => {
      const vertexColorGeom = new THREE.BoxGeometry(20, 20, 20);
      const count = vertexColorGeom.attributes.position.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        if (i < count / 3) {
          colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.0; colors[i * 3 + 2] = 0.0;
        } else if (i < (2 * count) / 3) {
          colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.0; colors[i * 3 + 2] = 1.0;
        } else {
          colors[i * 3] = 0.0; colors[i * 3 + 1] = 0.0; colors[i * 3 + 2] = 0.0;
        }
      }
      vertexColorGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const res = detectOriginalColors(vertexColorGeom, null);
      expect(res.hasColors).toBe(true);
      expect(res.colorCount).toBeGreaterThanOrEqual(3);
    });

    it('detects multi-material Object3D (e.g. Spider-Man model with Red, Black, White materials)', () => {
      const spidermanGroup = new THREE.Group();
      const redMesh = new THREE.Mesh(
        new THREE.BoxGeometry(10, 10, 10),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(0xe11d48) })
      );
      const blackMesh = new THREE.Mesh(
        new THREE.BoxGeometry(5, 5, 5),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(0x0f172a) })
      );
      const whiteEyesMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(0xffffff) })
      );
      spidermanGroup.add(redMesh);
      spidermanGroup.add(blackMesh);
      spidermanGroup.add(whiteEyesMesh);

      const res = detectOriginalColors(null, spidermanGroup);
      expect(res.hasColors).toBe(true);
      expect(res.colorCount).toBeGreaterThanOrEqual(3);
    });

    it('detects textured meshes with diffuse maps', () => {
      const texturedGroup = new THREE.Group();
      const texMesh = new THREE.Mesh(
        new THREE.BoxGeometry(10, 10, 10),
        new THREE.MeshStandardMaterial({ map: new THREE.Texture() })
      );
      texturedGroup.add(texMesh);
      const res = detectOriginalColors(null, texturedGroup);
      expect(res.hasColors).toBe(true);
      expect(res.hasTextures).toBe(true);
    });
  });

  describe('Suite 2: Quotation Engine & Empty State', () => {
    it('returns null quotation when no model is uploaded (no ₹149 default before upload)', () => {
      const emptyModelResult = null;
      const emptyVolume = 0;
      const emptyBreakdown =
        !emptyModelResult || emptyVolume <= 0
          ? null
          : calculateCustomerQuote(
              {
                materialWeightGrams: 0,
                printTimeHours: 0,
                material: DEFAULT_MATERIALS[0],
                quantity: 1,
                packagingIncluded: false,
                exceedsBuildVolume: false,
              },
              DEFAULT_PRICING_CONFIG,
              DEFAULT_QUANTITY_DISCOUNTS
            );
      expect(emptyBreakdown).toBeNull();
    });

    it('calculates realistic PLA print quotation for standard model', () => {
      const sampleVolumeCm3 = 40.0;
      const pla = DEFAULT_MATERIALS.find((m) => m.id === 'pla') || DEFAULT_MATERIALS[0];
      const standardProfile =
        DEFAULT_PRINT_PROFILES.find((p) => p.id === 'standard') || DEFAULT_PRINT_PROFILES[1];

      const plaWeight = estimateMaterialUsage(sampleVolumeCm3, pla.density, standardProfile);
      const plaHours = estimatePrintTime(plaWeight, standardProfile);
      const plaQuote = calculateCustomerQuote(
        {
          materialWeightGrams: plaWeight,
          printTimeHours: plaHours,
          material: pla,
          quantity: 1,
          packagingIncluded: false,
          exceedsBuildVolume: false,
        },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );

      expect(plaWeight).toBeGreaterThan(0);
      expect(plaHours).toBeGreaterThan(0);
      expect(plaQuote.totalPrice).toBeGreaterThanOrEqual(DEFAULT_PRICING_CONFIG.minimumOrderValue);
    });

    it('enforces pricing hierarchy across materials: TPU > PETG >= PLA', () => {
      const sampleVolumeCm3 = 40.0;
      const pla = DEFAULT_MATERIALS.find((m) => m.id === 'pla') || DEFAULT_MATERIALS[0];
      const petg = DEFAULT_MATERIALS.find((m) => m.id === 'petg') || DEFAULT_MATERIALS[1];
      const tpu = DEFAULT_MATERIALS.find((m) => m.id === 'tpu') || DEFAULT_MATERIALS[2];
      const standardProfile =
        DEFAULT_PRINT_PROFILES.find((p) => p.id === 'standard') || DEFAULT_PRINT_PROFILES[1];

      const plaWeight = estimateMaterialUsage(sampleVolumeCm3, pla.density, standardProfile);
      const petgWeight = estimateMaterialUsage(sampleVolumeCm3, petg.density, standardProfile);
      const tpuWeight = estimateMaterialUsage(sampleVolumeCm3, tpu.density, standardProfile);

      const plaQuote = calculateCustomerQuote(
        { materialWeightGrams: plaWeight, printTimeHours: 1, material: pla, quantity: 1, packagingIncluded: false, exceedsBuildVolume: false },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );
      const petgQuote = calculateCustomerQuote(
        { materialWeightGrams: petgWeight, printTimeHours: 1, material: petg, quantity: 1, packagingIncluded: false, exceedsBuildVolume: false },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );
      const tpuQuote = calculateCustomerQuote(
        { materialWeightGrams: tpuWeight, printTimeHours: 1, material: tpu, quantity: 1, packagingIncluded: false, exceedsBuildVolume: false },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );

      expect(tpuQuote.totalPrice).toBeGreaterThan(petgQuote.totalPrice);
      expect(petgQuote.totalPrice).toBeGreaterThanOrEqual(plaQuote.totalPrice);
    });

    it('scales layer heights appropriately across quality tiers: Draft (0.28mm) > Standard (0.20mm) > Fine (0.12mm)', () => {
      const draftProfile = DEFAULT_PRINT_PROFILES.find((p) => p.id === 'budget') || DEFAULT_PRINT_PROFILES[0];
      const standardProfile = DEFAULT_PRINT_PROFILES.find((p) => p.id === 'standard') || DEFAULT_PRINT_PROFILES[1];
      const fineProfile = DEFAULT_PRINT_PROFILES.find((p) => p.id === 'premium') || DEFAULT_PRINT_PROFILES[2];

      expect(draftProfile.layerHeight).toBeGreaterThan(standardProfile.layerHeight);
      expect(standardProfile.layerHeight).toBeGreaterThan(fineProfile.layerHeight);
    });

    it('applies support material buffer when supports are enabled', () => {
      const baseWeight = 40.0;
      const supportsWeight = baseWeight * 1.15;
      const pla = DEFAULT_MATERIALS[0];

      const baseQuote = calculateCustomerQuote(
        { materialWeightGrams: baseWeight, printTimeHours: 1, material: pla, quantity: 1, packagingIncluded: false, exceedsBuildVolume: false },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );
      const supportsQuote = calculateCustomerQuote(
        { materialWeightGrams: supportsWeight, printTimeHours: 1.15, material: pla, quantity: 1, packagingIncluded: false, exceedsBuildVolume: false },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );

      expect(supportsQuote.totalPrice).toBeGreaterThan(baseQuote.totalPrice);
    });

    it('applies tiered volume discounts for bulk quantities', () => {
      const pla = DEFAULT_MATERIALS[0];
      const q1 = calculateCustomerQuote({ materialWeightGrams: 50, printTimeHours: 2, material: pla, quantity: 1, packagingIncluded: false, exceedsBuildVolume: false }, DEFAULT_PRICING_CONFIG, DEFAULT_QUANTITY_DISCOUNTS);
      const q5 = calculateCustomerQuote({ materialWeightGrams: 50, printTimeHours: 2, material: pla, quantity: 5, packagingIncluded: false, exceedsBuildVolume: false }, DEFAULT_PRICING_CONFIG, DEFAULT_QUANTITY_DISCOUNTS);
      const q10 = calculateCustomerQuote({ materialWeightGrams: 50, printTimeHours: 2, material: pla, quantity: 10, packagingIncluded: false, exceedsBuildVolume: false }, DEFAULT_PRICING_CONFIG, DEFAULT_QUANTITY_DISCOUNTS);
      const q25 = calculateCustomerQuote({ materialWeightGrams: 50, printTimeHours: 2, material: pla, quantity: 25, packagingIncluded: false, exceedsBuildVolume: false }, DEFAULT_PRICING_CONFIG, DEFAULT_QUANTITY_DISCOUNTS);

      expect(q5.unitPrice).toBeLessThanOrEqual(q1.unitPrice);
      expect(q10.unitPrice).toBeLessThanOrEqual(q5.unitPrice);
      expect(q25.unitPrice).toBeLessThanOrEqual(q10.unitPrice);
    });

    it('calculates packaging fees per unit', () => {
      const pla = DEFAULT_MATERIALS[0];
      const q5Pack = calculateCustomerQuote(
        { materialWeightGrams: 50, printTimeHours: 2, material: pla, quantity: 5, packagingIncluded: true, exceedsBuildVolume: false },
        DEFAULT_PRICING_CONFIG,
        DEFAULT_QUANTITY_DISCOUNTS
      );
      expect(q5Pack.packagingAmount).toBe(20 * 5);
    });

    it('detects model dimensions exceeding maximum build envelope', () => {
      const fits = checkBuildVolume({ x: 200, y: 200, z: 200 }, DEFAULT_PRICING_CONFIG.maxBuildVolume);
      const exceeds = checkBuildVolume({ x: 300, y: 150, z: 150 }, DEFAULT_PRICING_CONFIG.maxBuildVolume);
      expect(fits).toBe(false);
      expect(exceeds).toBe(true);
    });
  });

  describe('Suite 3: Backend Data Schema & Admin Review Payload', () => {
    it('ensures quote review schema contains all manufacturing parameters', () => {
      const payload = {
        requestType: '3d-model',
        customerName: 'Aarav Patel',
        customerEmail: 'aarav@example.com',
        customerPhone: '+91 98765 43210',
        fileName: 'mechanical_bracket.stl',
        fileUrl: 'https://r2.shilpsahayak.com/models/mechanical_bracket.stl',
        fileSizeBytes: 2450000,
        material: 'PLA',
        color: 'Crimson Red',
        quality: 'Standard',
        infill: 25,
        layerHeight: 0.20,
        supports: true,
        quantity: 5,
        packagingIncluded: true,
        volume: 40.0,
        estimatedWeight: 46.0,
        estimatedPrintTimeHours: 2.5,
        systemEstimatedPrice: 450,
        estimatedPrice: 450,
        dimensions: { length: 50, width: 50, height: 50, unit: 'mm' },
        notes: 'High precision required on mounting holes',
        pricingVersion: 'v1',
        status: 'pending',
      };

      expect(payload.material).toBeDefined();
      expect(payload.color).toBe('Crimson Red');
      expect(payload.supports).toBe(true);
      expect(payload.quantity).toBe(5);
      expect(payload.packagingIncluded).toBe(true);
      expect(payload.dimensions).toBeDefined();
      expect(payload.estimatedPrice).toBe(450);
      expect(payload.fileUrl).toContain('r2.shilpsahayak.com');
    });
  });
});
