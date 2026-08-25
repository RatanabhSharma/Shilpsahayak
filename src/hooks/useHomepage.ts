import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type HomepageHeroSlide = {
  id: string;
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
};

export type HomepageSettings = {
  heroSlides: HomepageHeroSlide[];
  heroAutoplay: boolean;
  heroInterval: number;
  featuredProductIds: string[];
  selectedProductIds: string[];
  categoryNames: string[];
  announcementEnabled: boolean;
  announcementText: string;
};

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  heroSlides: [],
  heroAutoplay: true,
  heroInterval: 5000,
  featuredProductIds: [],
  selectedProductIds: [],
  categoryNames: [],
  announcementEnabled: true,
  announcementText:
    'Free Pan-India shipping on orders over ₹499. Crafted with precision.',
};

const HOMEPAGE_DOCUMENT_ID = 'homepage';
const homepageKey = ['settings', HOMEPAGE_DOCUMENT_ID] as const;

function normaliseHeroSlides(value: unknown): HomepageHeroSlide[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((slide): slide is Record<string, unknown> => !!slide && typeof slide === 'object')
    .map((slide, index) => ({
      id: typeof slide.id === 'string' && slide.id ? slide.id : `hero-${index + 1}`,
      enabled: slide.enabled !== false,
      eyebrow: typeof slide.eyebrow === 'string' ? slide.eyebrow : '',
      title: typeof slide.title === 'string' ? slide.title : '',
      description: typeof slide.description === 'string' ? slide.description : '',
      image: typeof slide.image === 'string' ? slide.image : '',
      buttonText: typeof slide.buttonText === 'string' ? slide.buttonText : '',
      buttonLink: typeof slide.buttonLink === 'string' ? slide.buttonLink : '',
    }));
}

function normaliseProductIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normaliseCategories(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
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

      const data = snapshot.data();

      return {
        ...DEFAULT_HOMEPAGE_SETTINGS,
        ...data,
        heroSlides: normaliseHeroSlides(data.heroSlides),
        heroAutoplay:
          typeof data.heroAutoplay === 'boolean'
            ? data.heroAutoplay
            : DEFAULT_HOMEPAGE_SETTINGS.heroAutoplay,
        heroInterval:
          typeof data.heroInterval === 'number' && data.heroInterval >= 2500
            ? Math.min(data.heroInterval, 15000)
            : DEFAULT_HOMEPAGE_SETTINGS.heroInterval,
        featuredProductIds: normaliseProductIds(data.featuredProductIds),
        selectedProductIds: normaliseProductIds(data.selectedProductIds),
        categoryNames: normaliseCategories(data.categoryNames),
        announcementEnabled:
          typeof data.announcementEnabled === 'boolean'
            ? data.announcementEnabled
            : DEFAULT_HOMEPAGE_SETTINGS.announcementEnabled,
        announcementText:
          typeof data.announcementText === 'string'
            ? data.announcementText
            : DEFAULT_HOMEPAGE_SETTINGS.announcementText,
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
      await setDoc(ref, settings);
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(homepageKey, settings);
    },
  });
}
