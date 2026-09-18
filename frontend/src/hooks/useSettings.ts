import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';

import {
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import {
  Settings,
  useStore
} from '../store';

const SETTINGS_DOCUMENT_ID = 'business';

const DEFAULT_SETTINGS: Settings = {
  businessName: 'Shilp Sahayak',
  logoUrl: '',
  whatsappNumber: '+91 98765 43210',
  email: 'hello@shilpsahayak.in',
  phone: '+91 98765 43210',
  address: 'Urban Estate Phase 2, Patiala, Punjab 147002, India',
  gstin: '03AAAAA0000A1Z5',
  cin: 'U72900PB2024PTC123456',
  supportHours: 'Mon - Sat: 9:00 AM - 7:00 PM IST',

  baseFee: 100,
  minimumOrderValue: 299,
  defaultGSTRate: 18,

  shippingFlatRate: 99,
  freeShippingThreshold: 999,
  expressShippingRate: 199,
  defaultCourierPartner: 'Delhivery',
  deliveryZones: ['All India (Domestic)', 'Metro Tier-1 Express', 'Punjab Local Studio Delivery'],

  upiId: 'shilpsahayak@okaxis',
  codEnabled: true,
  maxCodOrderValue: 5000,
  bankAccountDetails: {
    accountName: 'Shilp Sahayak 3D Technologies Pvt Ltd',
    accountNumber: '924020012345678',
    ifscCode: 'UTIB0000123',
    bankName: 'Axis Bank Ltd',
  },

  notifications: {
    newOrderAlerts: true,
    quoteAlerts: true,
    lowStockAlerts: true,
    alertEmailRecipient: 'orders@shilpsahayak.in',
  },

  adminUsers: [
    { email: 'admin@shilpsahayak.in', role: 'Super Admin', addedAt: '2025-01-01' },
    { email: 'workshop@shilpsahayak.in', role: 'Workshop Manager', addedAt: '2025-02-15' },
  ],
};

/**
 * Get business settings from Firestore.
 *
 * Firestore document:
 * /settings/business
 */
export function useSettings() {
  const localSettings = useStore(
    (state) => state.settings
  );

  return useQuery({
    queryKey: ['settings', SETTINGS_DOCUMENT_ID],

    queryFn: async (): Promise<Settings> => {
      const settingsRef = doc(
        db,
        'settings',
        SETTINGS_DOCUMENT_ID
      );

      const snapshot = await getDoc(settingsRef);

      if (!snapshot.exists()) {
        return {
          ...DEFAULT_SETTINGS,
          ...localSettings
        };
      }

      return {
        ...DEFAULT_SETTINGS,
        ...snapshot.data()
      } as Settings;
    },

    staleTime: 5 * 60 * 1000,

    initialData: localSettings
  });
}

/**
 * Save business settings to Firestore.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      settings: Settings
    ) => {
      const settingsRef = doc(
        db,
        'settings',
        SETTINGS_DOCUMENT_ID
      );

      await setDoc(
        settingsRef,
        settings,
        {
          merge: true
        }
      );

      return settings;
    },

    onSuccess: (settings) => {
      queryClient.setQueryData(
        ['settings', SETTINGS_DOCUMENT_ID],
        settings
      );

      // Keep the existing Zustand store in sync.
      useStore
        .getState()
        .updateSettings(settings);
    }
  });
}


