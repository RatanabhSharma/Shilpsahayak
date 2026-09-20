import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type HomepageSettings = {
  heroVideoUrl?: string;
  featuredTitle?: string;
  featuredSubtitle?: string;
  featuredProductIds: string[];
  customPromoTitle?: string;
  customPromoButtonText?: string;
  customPromoButtonLink?: string;
};

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  heroVideoUrl: '/videos/demo_video2.mp4',
  featuredTitle: 'Featured 3D Creations',
  featuredSubtitle: 'Handcrafted 3D printed lighting, desk accessories, and customized keepsakes.',
  featuredProductIds: [],
  customPromoTitle: 'Have a 3D Model? Upload your STL & get an instant quote.',
  customPromoButtonText: 'Explore Collection',
  customPromoButtonLink: '/shop',
};

const HOMEPAGE_DOCUMENT_ID = 'homepage';
const homepageKey = ['settings', HOMEPAGE_DOCUMENT_ID] as const;

function normaliseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function useHomepage() {
  return useQuery({
    queryKey: homepageKey,
    queryFn: async (): Promise<HomepageSettings> => {
      const ref = doc(db, 'settings', HOMEPAGE_DOCUMENT_ID);
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return DEFAULT_HOMEPAGE_SETTINGS;
      }

      const data = snapshot.data() as Record<string, unknown>;

      return {
        ...DEFAULT_HOMEPAGE_SETTINGS,
        heroVideoUrl: typeof data.heroVideoUrl === 'string' ? data.heroVideoUrl : DEFAULT_HOMEPAGE_SETTINGS.heroVideoUrl,
        featuredTitle: typeof data.featuredTitle === 'string' ? data.featuredTitle : DEFAULT_HOMEPAGE_SETTINGS.featuredTitle,
        featuredSubtitle: typeof data.featuredSubtitle === 'string' ? data.featuredSubtitle : DEFAULT_HOMEPAGE_SETTINGS.featuredSubtitle,
        featuredProductIds: normaliseStringArray(data.featuredProductIds),
        customPromoTitle: typeof data.customPromoTitle === 'string' ? data.customPromoTitle : DEFAULT_HOMEPAGE_SETTINGS.customPromoTitle,
        customPromoButtonText: typeof data.customPromoButtonText === 'string' ? data.customPromoButtonText : DEFAULT_HOMEPAGE_SETTINGS.customPromoButtonText,
        customPromoButtonLink: typeof data.customPromoButtonLink === 'string' ? data.customPromoButtonLink : DEFAULT_HOMEPAGE_SETTINGS.customPromoButtonLink,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateHomepage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: HomepageSettings) => {
      const ref = doc(db, 'settings', HOMEPAGE_DOCUMENT_ID);
      await setDoc(ref, settings, { merge: true });
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(homepageKey, settings);
    },
  });
}
