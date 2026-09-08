import { describe, it, expect } from 'vitest';
import { cleanFirestorePayload } from '../cleanFirestorePayload';

describe('cleanFirestorePayload', () => {
  it('should remove undefined properties from root object', () => {
    const input = {
      name: 'Artisan Vase',
      price: 1200,
      costPrice: undefined,
      description: 'Handcrafted PLA vase',
    };

    const result = cleanFirestorePayload(input);

    expect(result).toEqual({
      name: 'Artisan Vase',
      price: 1200,
      description: 'Handcrafted PLA vase',
    });
    expect('costPrice' in result).toBe(false);
  });

  it('should preserve falsy values like null, 0, false, and empty string', () => {
    const input = {
      price: 0,
      inStock: false,
      sku: '',
      discount: null,
      notes: undefined,
    };

    const result = cleanFirestorePayload(input);

    expect(result).toEqual({
      price: 0,
      inStock: false,
      sku: '',
      discount: null,
    });
    expect('notes' in result).toBe(false);
  });

  it('should clean nested objects recursively', () => {
    const input = {
      title: 'Custom Lamp',
      seo: {
        metaTitle: 'Custom Lamp',
        metaDescription: undefined,
        keywords: ['lamp', '3d print'],
        nested: {
          tag: 'living-room',
          unusedField: undefined,
        },
      },
    };

    const result = cleanFirestorePayload(input);

    expect(result).toEqual({
      title: 'Custom Lamp',
      seo: {
        metaTitle: 'Custom Lamp',
        keywords: ['lamp', '3d print'],
        nested: {
          tag: 'living-room',
        },
      },
    });
  });

  it('should filter undefined items from arrays and clean nested objects within arrays', () => {
    const input = {
      tags: ['decor', undefined, 'artisan'],
      variants: [
        { id: 'v1', name: 'Terracotta', costPrice: 450, sku: undefined },
        { id: 'v2', name: 'Marble', costPrice: undefined, sku: 'SKU-MARBLE' },
      ],
    };

    const result = cleanFirestorePayload(input);

    expect(result).toEqual({
      tags: ['decor', 'artisan'],
      variants: [
        { id: 'v1', name: 'Terracotta', costPrice: 450 },
        { id: 'v2', name: 'Marble', sku: 'SKU-MARBLE' },
      ],
    });
    expect('costPrice' in result.variants[1]).toBe(false);
  });

  it('should preserve Date instances', () => {
    const now = new Date();
    const input = {
      createdAt: now,
      deletedAt: undefined,
    };

    const result = cleanFirestorePayload(input);

    expect(result.createdAt).toBe(now);
    expect(result.createdAt instanceof Date).toBe(true);
    expect('deletedAt' in result).toBe(false);
  });

  it('should handle primitives and null/undefined root gracefully', () => {
    expect(cleanFirestorePayload(null)).toBe(null);
    expect(cleanFirestorePayload(undefined)).toBe(undefined);
    expect(cleanFirestorePayload(42)).toBe(42);
    expect(cleanFirestorePayload('hello')).toBe('hello');
  });

  it('verifies costPrice is never silently coerced to 0 when omitted', () => {
    const productPayload = {
      name: 'Voronoi Lamp',
      sellingPrice: 1500,
      costPrice: undefined,
    };

    const cleaned = cleanFirestorePayload(productPayload);
    expect(cleaned.costPrice).toBeUndefined();
    expect(cleaned).not.toHaveProperty('costPrice');
    expect(cleaned.costPrice).not.toBe(0);
  });
});

