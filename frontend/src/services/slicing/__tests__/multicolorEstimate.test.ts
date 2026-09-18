import { describe, it, expect } from 'vitest';
import { normalizeMulticolorSummary } from '../slicingClient';

describe('Multicolor Estimate Normalization Contract', () => {
  describe('Single-material slicing jobs', () => {
    it('normalizes single-material result correctly with isMulticolor: false', () => {
      const slice = {
        filamentGrams: 42.5,
        printTimeSeconds: 3600,
        adapter: 'prusa_slicer_cli',
        statistics: {
          filament_grams: 42.5,
          filament_mm: 14200,
          print_time_seconds: 3600,
          raw_time_string: '1h 0m',
        },
      };
      const production = {
        colourMode: 'single',
        slicerAdapter: 'prusa_slicer_cli',
      };

      const result = normalizeMulticolorSummary(slice, production);

      expect(result.mode).toBe('single_material');
      expect(result.isMulticolor).toBe(false);
      expect(result.totalFilamentGrams).toBe(42.5);
      expect(result.modelFilamentGrams).toBe(42.5);
      expect(result.purgeFilamentGrams).toBe(0);
      expect(result.printTimeSeconds).toBe(3600);
      expect(result.filaments).toEqual([]);
      expect(result.slicerAdapter).toBe('prusa_slicer_cli');
    });
  });

  describe('Multicolor slicing jobs', () => {
    it('normalizes genuine multicolor result with per-filament details and purge separation', () => {
      const slice = {
        filamentGrams: 168.65,
        printTimeSeconds: 15456,
        adapter: 'bambu_studio_cli',
        statistics: {
          filament_grams: 168.65,
          print_time_seconds: 15456,
          tool_change_count: 532,
          model_filament_grams: 57.06,
          purge_filament_grams: 111.59,
          per_filament: [
            {
              filamentIndex: 1,
              colorHex: '#161616',
              materialType: 'PETG',
              modelGrams: 10.25,
              totalGrams: 30.50,
              purgeGrams: 20.25,
            },
            {
              filamentIndex: 2,
              colorHex: '#FFFFFF',
              materialType: 'PLA',
              modelGrams: 25.10,
              totalGrams: 60.30,
              purgeGrams: 35.20,
            },
            {
              filamentIndex: 3,
              colorHex: '#EF4444',
              materialType: 'PETG',
              modelGrams: 21.71,
              totalGrams: 77.85,
              purgeGrams: 56.14,
            },
          ],
        },
      };
      const production = {
        colourMode: 'multicolour',
        slicerAdapter: 'bambu_studio_cli',
      };

      const result = normalizeMulticolorSummary(slice, production);

      expect(result.mode).toBe('multicolor');
      expect(result.isMulticolor).toBe(true);
      expect(result.totalFilamentGrams).toBe(168.65);
      // Aggregated model grams = 10.25 + 25.10 + 21.71 = 57.06
      expect(result.modelFilamentGrams).toBe(57.06);
      // Aggregated purge grams = 20.25 + 35.20 + 56.14 = 111.59
      expect(result.purgeFilamentGrams).toBe(111.59);
      expect(result.printTimeSeconds).toBe(15456);
      expect(result.toolChangeCount).toBe(532);
      expect(result.slicerAdapter).toBe('bambu_studio_cli');

      expect(result.filaments).toHaveLength(3);
      expect(result.filaments[0]).toEqual({
        index: 1,
        colorHex: '#161616',
        colorName: undefined,
        materialType: 'PETG',
        modelGrams: 10.25,
        totalGrams: 30.50,
        purgeGrams: 20.25,
      });
      expect(result.filaments[1].materialType).toBe('PLA');
      expect(result.filaments[2].colorHex).toBe('#EF4444');
    });

    it('calculates purge grams accurately as (total - model) if purgeGrams is omitted', () => {
      const slice = {
        filamentGrams: 50.0,
        printTimeSeconds: 7200,
        adapter: 'bambu_studio_cli',
        statistics: {
          per_filament: [
            {
              filamentIndex: 1,
              colorHex: '#000000',
              materialType: 'PLA',
              modelGrams: 15.0,
              totalGrams: 25.0,
              // purgeGrams omitted
            },
            {
              filamentIndex: 2,
              colorHex: '#FFFFFF',
              materialType: 'PLA',
              modelGrams: 10.0,
              totalGrams: 25.0,
              // purgeGrams omitted
            },
          ],
        },
      };

      const result = normalizeMulticolorSummary(slice);

      expect(result.isMulticolor).toBe(true);
      expect(result.filaments[0].purgeGrams).toBe(10.0);
      expect(result.filaments[1].purgeGrams).toBe(15.0);
      expect(result.modelFilamentGrams).toBe(25.0);
      expect(result.purgeFilamentGrams).toBe(25.0);
    });

    it('safely handles missing or empty statistics without throwing exceptions', () => {
      const resultEmpty = normalizeMulticolorSummary(null, null);
      expect(resultEmpty.mode).toBe('single_material');
      expect(resultEmpty.isMulticolor).toBe(false);
      expect(resultEmpty.totalFilamentGrams).toBe(0);
      expect(resultEmpty.modelFilamentGrams).toBe(0);
      expect(resultEmpty.purgeFilamentGrams).toBe(0);
      expect(resultEmpty.filaments).toEqual([]);

      const resultSparse = normalizeMulticolorSummary({ filamentGrams: 12.3 });
      expect(resultSparse.mode).toBe('single_material');
      expect(resultSparse.totalFilamentGrams).toBe(12.3);
      expect(resultSparse.modelFilamentGrams).toBe(12.3);
    });

    it('safely falls back for legacy field names like main_used_g and total_used_g', () => {
      const slice = {
        filamentGrams: 30.0,
        statistics: {
          per_filament: [
            {
              id: 1,
              color: '#3B82F6',
              material: 'PETG',
              main_used_g: 8.5,
              total_used_g: 15.0,
            },
            {
              id: 2,
              color: '#FACC15',
              material: 'PETG',
              main_used_g: 6.5,
              total_used_g: 15.0,
            },
          ],
        },
      };

      const result = normalizeMulticolorSummary(slice);

      expect(result.isMulticolor).toBe(true);
      expect(result.filaments[0].index).toBe(1);
      expect(result.filaments[0].colorHex).toBe('#3B82F6');
      expect(result.filaments[0].materialType).toBe('PETG');
      expect(result.filaments[0].modelGrams).toBe(8.5);
      expect(result.filaments[0].totalGrams).toBe(15.0);
      expect(result.filaments[0].purgeGrams).toBe(6.5);
      expect(result.modelFilamentGrams).toBe(15.0);
      expect(result.purgeFilamentGrams).toBe(15.0);
    });
  });
});

