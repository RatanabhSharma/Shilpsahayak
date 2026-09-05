import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  MachinePricingConfig,
  MaterialConfig,
  PrintProfile,
  QuantityDiscountTier,
} from '../services/pricing/pricingTypes';
import {
  DEFAULT_PRICING_CONFIG,
  DEFAULT_MATERIALS,
  DEFAULT_PRINT_PROFILES,
  DEFAULT_QUANTITY_DISCOUNTS,
  PRICING_VERSION,
} from '../services/pricing/pricingConfig';

export type StoredPricingData = {
  pricingConfig: MachinePricingConfig;
  materials: MaterialConfig[];
  printProfiles: PrintProfile[];
  quantityDiscounts: QuantityDiscountTier[];
  pricingVersion: string;
  updatedAt?: string;
};

const DEFAULT_STORED_DATA: StoredPricingData = {
  pricingConfig: DEFAULT_PRICING_CONFIG,
  materials: DEFAULT_MATERIALS,
  printProfiles: DEFAULT_PRINT_PROFILES,
  quantityDiscounts: DEFAULT_QUANTITY_DISCOUNTS,
  pricingVersion: PRICING_VERSION,
};

const PRICING_SETTINGS_DOC = 'pricing';

/**
 * Hook to retrieve active 3D printing pricing configuration from Firestore.
 * Document: /settings/pricing
 */
export function usePricingSettings() {
  return useQuery({
    queryKey: ['pricing-settings'],
    queryFn: async (): Promise<StoredPricingData> => {
      try {
        const docRef = doc(db, 'settings', PRICING_SETTINGS_DOC);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) {
          return DEFAULT_STORED_DATA;
        }

        const data = snapshot.data();
        return {
          pricingConfig: {
            ...DEFAULT_PRICING_CONFIG,
            ...(data.pricingConfig || {}),
            maxBuildVolume: {
              ...DEFAULT_PRICING_CONFIG.maxBuildVolume,
              ...(data.pricingConfig?.maxBuildVolume || {}),
            },
          },
          materials:
            Array.isArray(data.materials) && data.materials.length > 0
              ? data.materials
              : DEFAULT_MATERIALS,
          printProfiles:
            Array.isArray(data.printProfiles) && data.printProfiles.length > 0
              ? data.printProfiles
              : DEFAULT_PRINT_PROFILES,
          quantityDiscounts:
            Array.isArray(data.quantityDiscounts) && data.quantityDiscounts.length > 0
              ? data.quantityDiscounts
              : DEFAULT_QUANTITY_DISCOUNTS,
          pricingVersion: data.pricingVersion || PRICING_VERSION,
          updatedAt: data.updatedAt,
        };
      } catch (error) {
        console.warn('Failed to load pricing settings from Firestore, using default config:', error);
        return DEFAULT_STORED_DATA;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 mins
    initialData: DEFAULT_STORED_DATA,
  });
}

/**
 * Hook to update 3D printing pricing configuration in Firestore.
 */
export function useUpdatePricingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedData: Partial<StoredPricingData>) => {
      const docRef = doc(db, 'settings', PRICING_SETTINGS_DOC);
      const payload: StoredPricingData = {
        pricingConfig: updatedData.pricingConfig || DEFAULT_PRICING_CONFIG,
        materials: updatedData.materials || DEFAULT_MATERIALS,
        printProfiles: updatedData.printProfiles || DEFAULT_PRINT_PROFILES,
        quantityDiscounts: updatedData.quantityDiscounts || DEFAULT_QUANTITY_DISCOUNTS,
        pricingVersion: updatedData.pricingVersion || PRICING_VERSION,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, payload, { merge: true });
      return payload;
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(['pricing-settings'], newData);
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
    },
  });
}

