import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { StorefrontConfig, StorefrontHero, StorefrontSectionVisibility } from '../types/settingsConfig';

// Re-export type so consumers don't break if they import it from here
export type HomepageSettings = StorefrontConfig;

const DEFAULT_HERO: StorefrontHero = {
  badgeText: 'Shilp Sahayak - 3D Printing',
  headline: 'Bring Your Ideas to Life in 3D',
  subheadline: 'Upload your custom models for instant pricing and professional fabrication.',
  primaryCtaText: 'Upload 3D Model',
  primaryCtaLink: '/shilp-studio',
  enablePrimaryCta: true,
  secondaryCtaText: 'Shop Collection',
  secondaryCtaLink: '/shop',
  enableSecondaryCta: true,
  heroVideoUrl: '/videos/demo_video2.mp4',
  heroPosterUrl: '',
  heroImageUrl: '/images/logo.jpg',
  heroImageMode: 'image',
  heroSlideshowImageUrls: [],
  enableVideo: true,
  showVideoTextOverlay: true,
};

const DEFAULT_VISIBILITY: StorefrontSectionVisibility = {
  announcement: true,
  hero: true,
  trustMarquee: true,
  featuredProducts: true,
  shilpStudioPromo: true,
  categories: true,
  reviews: true,
  finalCta: true,
};

export const DEFAULT_HOMEPAGE_SETTINGS: StorefrontConfig = {
  hero: DEFAULT_HERO,
  featuredTitle: 'Featured 3D Creations',
  featuredSubtitle: 'Handcrafted 3D printed lighting, desk accessories, and customized keepsakes.',
  featuredProductIds: [],
  customPromoTitle: 'Have a 3D Model? Upload your STL & get an instant quote.',
  customPromoButtonText: 'Explore Collection',
  customPromoButtonLink: '/shop',
  customPromoButtonEnabled: true,
  sectionVisibility: DEFAULT_VISIBILITY,
};

const HOMEPAGE_DOCUMENT_ID = 'storefront';
const homepageKey = ['settings', HOMEPAGE_DOCUMENT_ID] as const;

function normaliseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function useHomepage() {
  return useQuery({
    queryKey: homepageKey,
    queryFn: async (): Promise<StorefrontConfig> => {
      const ref = doc(db, 'settings', HOMEPAGE_DOCUMENT_ID);
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return DEFAULT_HOMEPAGE_SETTINGS;
      }

      const data = snapshot.data() as Partial<StorefrontConfig>;

      return {
        hero: {
          ...DEFAULT_HERO,
          ...data.hero,
          heroSlideshowImageUrls: normaliseStringArray(data.hero?.heroSlideshowImageUrls),
        },
        featuredTitle: typeof data.featuredTitle === 'string' ? data.featuredTitle : DEFAULT_HOMEPAGE_SETTINGS.featuredTitle,
        featuredSubtitle: typeof data.featuredSubtitle === 'string' ? data.featuredSubtitle : DEFAULT_HOMEPAGE_SETTINGS.featuredSubtitle,
        featuredProductIds: normaliseStringArray(data.featuredProductIds),
        customPromoTitle: typeof data.customPromoTitle === 'string' ? data.customPromoTitle : DEFAULT_HOMEPAGE_SETTINGS.customPromoTitle,
        customPromoButtonText: typeof data.customPromoButtonText === 'string' ? data.customPromoButtonText : DEFAULT_HOMEPAGE_SETTINGS.customPromoButtonText,
        customPromoButtonLink: typeof data.customPromoButtonLink === 'string' ? data.customPromoButtonLink : DEFAULT_HOMEPAGE_SETTINGS.customPromoButtonLink,
        customPromoButtonEnabled: typeof data.customPromoButtonEnabled === 'boolean' ? data.customPromoButtonEnabled : DEFAULT_HOMEPAGE_SETTINGS.customPromoButtonEnabled,
        sectionVisibility: {
          ...DEFAULT_VISIBILITY,
          ...data.sectionVisibility,
        },
        announcement: data.announcement, // Keep optional
      };
    },
    initialData: DEFAULT_HOMEPAGE_SETTINGS,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateHomepage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: StorefrontConfig) => {
      const ref = doc(db, 'settings', HOMEPAGE_DOCUMENT_ID);
      await setDoc(ref, settings, { merge: true });
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(homepageKey, settings);
    },
  });
}
