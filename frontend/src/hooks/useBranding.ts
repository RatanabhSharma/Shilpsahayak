import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { BrandingConfig } from '../types/settingsConfig';

const BRANDING_DOCUMENT_ID = 'branding';

export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  primaryLogoUrl: '',
  darkLogoUrl: '',
  faviconUrl: '',
  symbolIconUrl: '',
  primaryColorHex: '#6d28d9',
  accentColorHex: '#a855f7',
  brandTagline: 'If you can imagine it, we can print it.',
  socialLinks: {
    instagram: '',
    whatsapp: '',
    youtube: '',
    linkedin: '',
    twitter: '',
    github: '',
  },
};

export const brandingKey = ['settings', BRANDING_DOCUMENT_ID] as const;

export function useBrandingConfig() {
  return useQuery({
    queryKey: brandingKey,
    queryFn: async (): Promise<BrandingConfig> => {
      const brandingRef = doc(db, 'settings', BRANDING_DOCUMENT_ID);
      const brandingSnap = await getDoc(brandingRef);
      
      if (!brandingSnap.exists()) {
        return DEFAULT_BRANDING_CONFIG;
      }
      
      const data = brandingSnap.data();
      return {
        ...DEFAULT_BRANDING_CONFIG,
        ...data,
        socialLinks: {
          ...DEFAULT_BRANDING_CONFIG.socialLinks,
          ...(data.socialLinks || {}),
        }
      } as BrandingConfig;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateBrandingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BrandingConfig) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to update branding settings.');
      }

      const brandingRef = doc(db, 'settings', BRANDING_DOCUMENT_ID);
      
      // Sanitize payload to avoid undefined values
      const sanitizedPayload = JSON.parse(JSON.stringify({
        ...payload,
        updatedBy: currentUser.uid,
        updatedAt: new Date().toISOString(),
      }));

      await setDoc(brandingRef, sanitizedPayload, { merge: true });
      return sanitizedPayload as BrandingConfig;
    },
    onSuccess: (newConfig) => {
      queryClient.setQueryData(brandingKey, newConfig);
    },
  });
}
