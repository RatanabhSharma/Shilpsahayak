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
  whatsappNumber: '',
  email: '',
  phone: '',
  address: '',
  shippingFlatRate: 150,
  freeShippingThreshold: 499,
  upiId: ''
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


