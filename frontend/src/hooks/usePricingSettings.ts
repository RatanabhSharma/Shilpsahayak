import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  MachinePricingConfig,
  MaterialConfig,
  PrintProfile,
  QuantityDiscountTier,
  AmsSlotConfig,
  ProductionPrinterProfile,
} from '../services/pricing/pricingTypes';
import {
  DEFAULT_PRICING_CONFIG,
  DEFAULT_MATERIALS,
  DEFAULT_PRINT_PROFILES,
  DEFAULT_QUANTITY_DISCOUNTS,
  DEFAULT_AMS_SLOTS,
  PRICING_VERSION,
  DEFAULT_PRODUCTION_PRINTER_PROFILE,
  DEFAULT_A1_MINI_PRODUCTION_PRINTER_PROFILE,
  DEFAULT_A1_PRODUCTION_PRINTER_PROFILE,
  DEFAULT_PRODUCTION_PRINTER_PROFILES,
} from '../services/pricing/pricingConfig';

export type StoredPricingData = {
  pricingConfig: MachinePricingConfig;
  materials: MaterialConfig[];
  printProfiles: PrintProfile[];
  quantityDiscounts: QuantityDiscountTier[];
  amsSlots?: AmsSlotConfig[];
  productionPrinterProfile: ProductionPrinterProfile;
  productionPrinterProfiles: ProductionPrinterProfile[];
  pricingVersion: string;
  updatedAt?: string;
};

const DEFAULT_STORED_DATA: StoredPricingData = {
  pricingConfig: DEFAULT_PRICING_CONFIG,
  materials: DEFAULT_MATERIALS,
  printProfiles: DEFAULT_PRINT_PROFILES,
  quantityDiscounts: DEFAULT_QUANTITY_DISCOUNTS,
  amsSlots: DEFAULT_AMS_SLOTS,
  pricingVersion: PRICING_VERSION,
  productionPrinterProfile: DEFAULT_PRODUCTION_PRINTER_PROFILE,
  productionPrinterProfiles: DEFAULT_PRODUCTION_PRINTER_PROFILES,
};

function getBaselineProfile(legacy: Record<string, unknown>): ProductionPrinterProfile {
  const id = String(legacy.id || '').toUpperCase();
  const model = String(legacy.model || legacy.printerModel || '').toUpperCase();
  if (id.includes('MINI') || model.includes('MINI')) {
    return DEFAULT_A1_MINI_PRODUCTION_PRINTER_PROFILE;
  }
  if (id.includes('A1') || model.includes('A1')) {
    return DEFAULT_A1_PRODUCTION_PRINTER_PROFILE;
  }
  return DEFAULT_PRODUCTION_PRINTER_PROFILE;
}

function normalizeProductionPrinterProfile(value: unknown): ProductionPrinterProfile {
  const legacy = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const base = getBaselineProfile(legacy);
  return {
    ...base,
    id: typeof legacy.id === 'string' && legacy.id.trim() ? legacy.id : base.id,
    manufacturer: typeof legacy.manufacturer === 'string' && legacy.manufacturer.trim() ? legacy.manufacturer : base.manufacturer,
    model: typeof legacy.model === 'string' && legacy.model.trim()
      ? legacy.model
      : (typeof legacy.printerModel === 'string' && legacy.printerModel.trim() ? legacy.printerModel : base.model),
    displayName: typeof legacy.displayName === 'string' && legacy.displayName.trim()
      ? legacy.displayName
      : (typeof legacy.name === 'string' && legacy.name.trim() ? legacy.name : base.displayName),
    profileVersion: typeof legacy.profileVersion === 'string' && legacy.profileVersion.trim()
      ? legacy.profileVersion
      : (typeof legacy.version === 'string' && legacy.version.trim() ? legacy.version : base.profileVersion),
    printerProfileFile: typeof legacy.printerProfileFile === 'string' && legacy.printerProfileFile.trim()
      ? legacy.printerProfileFile
      : base.printerProfileFile,
    machineProfileFile: typeof legacy.machineProfileFile === 'string' && legacy.machineProfileFile.trim()
      ? legacy.machineProfileFile
      : (typeof legacy.machineSettingsFile === 'string' && legacy.machineSettingsFile.trim() ? legacy.machineSettingsFile : base.machineProfileFile),
    processProfileFile: typeof legacy.processProfileFile === 'string' && legacy.processProfileFile.trim()
      ? legacy.processProfileFile
      : (typeof legacy.processSettingsFile === 'string' && legacy.processSettingsFile.trim() ? legacy.processSettingsFile : base.processProfileFile),
    materialProfileIds: Array.isArray(legacy.materialProfileIds) && legacy.materialProfileIds.length > 0
      ? (legacy.materialProfileIds as string[])
      : base.materialProfileIds,
    machineParameters: (legacy.machineParameters && typeof legacy.machineParameters === 'object')
      ? (legacy.machineParameters as ProductionPrinterProfile['machineParameters'])
      : base.machineParameters,
    buildVolumeX: Number(legacy.buildVolumeX ?? (legacy.buildVolume as any)?.x ?? base.buildVolumeX),
    buildVolumeY: Number(legacy.buildVolumeY ?? (legacy.buildVolume as any)?.y ?? base.buildVolumeY),
    buildVolumeZ: Number(legacy.buildVolumeZ ?? (legacy.buildVolume as any)?.z ?? base.buildVolumeZ),
    enabled: typeof legacy.enabled === 'boolean' ? legacy.enabled : base.enabled,
    defaultForProduction: typeof legacy.defaultForProduction === 'boolean' ? legacy.defaultForProduction : base.defaultForProduction,
    updatedAt: typeof legacy.updatedAt === 'string' ? legacy.updatedAt : base.updatedAt,
  };
}

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
          amsSlots:
            Array.isArray(data.amsSlots) && data.amsSlots.length > 0
              ? data.amsSlots
              : DEFAULT_AMS_SLOTS,
          productionPrinterProfiles: (Array.isArray(data.productionPrinterProfiles) && data.productionPrinterProfiles.length > 0
            ? data.productionPrinterProfiles
            : (data.productionPrinterProfile ? [data.productionPrinterProfile] : DEFAULT_PRODUCTION_PRINTER_PROFILES)).map(normalizeProductionPrinterProfile),
          productionPrinterProfile: normalizeProductionPrinterProfile(data.productionPrinterProfile || data.productionPrinterProfiles?.[0]),
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
initialDataUpdatedAt: 0,
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

  // Read the currently persisted pricing version so each save increments
  // the actual Firestore version rather than relying on client state.
  const currentSnapshot = await getDoc(docRef);
  const currentData = currentSnapshot.exists() ? currentSnapshot.data() : {};

  const currentVersion =
    typeof currentData.pricingVersion === 'string'
      ? currentData.pricingVersion
      : PRICING_VERSION;

  const versionMatch = currentVersion.match(/^(.*)-v(\d+)$/);

  const nextVersion = versionMatch
    ? `${versionMatch[1]}-v${Number(versionMatch[2]) + 1}`
    : `${new Date().toISOString().slice(0, 10)}-v1`;

  const payload: StoredPricingData = {
    pricingConfig: updatedData.pricingConfig || DEFAULT_PRICING_CONFIG,
    materials: updatedData.materials || DEFAULT_MATERIALS,
    printProfiles: updatedData.printProfiles || DEFAULT_PRINT_PROFILES,
    quantityDiscounts:
      updatedData.quantityDiscounts || DEFAULT_QUANTITY_DISCOUNTS,
    amsSlots: updatedData.amsSlots || DEFAULT_AMS_SLOTS,
    productionPrinterProfile: updatedData.productionPrinterProfile || DEFAULT_PRODUCTION_PRINTER_PROFILE,
    productionPrinterProfiles: updatedData.productionPrinterProfiles || DEFAULT_PRODUCTION_PRINTER_PROFILES,
    pricingVersion: nextVersion,
    updatedAt: new Date().toISOString(),
  };

  if (updatedData.productionPrinterProfile) {
    payload.productionPrinterProfile = updatedData.productionPrinterProfile || DEFAULT_PRODUCTION_PRINTER_PROFILE;
  }
  if (updatedData.productionPrinterProfiles) {
    payload.productionPrinterProfiles = updatedData.productionPrinterProfiles;
    const selected = updatedData.productionPrinterProfiles.find((profile) => profile.defaultForProduction && profile.enabled)
      || updatedData.productionPrinterProfiles.find((profile) => profile.enabled);
    if (selected) payload.productionPrinterProfile = selected;
  }

  await setDoc(docRef, payload, { merge: true });
  return payload;
},
    onSuccess: (newData) => {
      queryClient.setQueryData(['pricing-settings'], newData);
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] });
    },
  });
}

