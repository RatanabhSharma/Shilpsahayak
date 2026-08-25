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
  announcementMessages: string[];
  announcementDuration: number;
};

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  heroSlides: [],
  heroAutoplay: true,
  heroInterval: 6000,

  featuredProductIds: [],
  selectedProductIds: [],
  categoryNames: [],

  announcementEnabled: false,
  announcementText: '',
  announcementMessages: [],
  announcementDuration: 24,
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

function normaliseStringArray(value: unknown): string[] {
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

      const data = snapshot.data() as Record<string, unknown>;
      const legacyText = typeof data.announcementText === 'string'
        ? data.announcementText.trim()
        : '';

      const announcementMessages = Array.isArray(data.announcementMessages)
        ? data.announcementMessages
            .filter((message): message is string => typeof message === 'string')
            .map((message) => message.trim())
            .filter(Boolean)
        : legacyText
          ? [legacyText]
          : DEFAULT_HOMEPAGE_SETTINGS.announcementMessages;

      const rawAnnouncementDuration = Number(data.announcementDuration);
      const announcementDuration = Number.isFinite(rawAnnouncementDuration)
        ? Math.min(Math.max(Math.round(rawAnnouncementDuration), 12), 40)
        : DEFAULT_HOMEPAGE_SETTINGS.announcementDuration;

      const rawHeroInterval = Number(data.heroInterval);
      const heroInterval = Number.isFinite(rawHeroInterval)
        ? Math.min(Math.max(Math.round(rawHeroInterval), 2500), 15000)
        : DEFAULT_HOMEPAGE_SETTINGS.heroInterval;

      return {
        ...DEFAULT_HOMEPAGE_SETTINGS,
        ...data,
        heroSlides: normaliseHeroSlides(data.heroSlides),
        heroAutoplay: typeof data.heroAutoplay === 'boolean'
          ? data.heroAutoplay
          : DEFAULT_HOMEPAGE_SETTINGS.heroAutoplay,
        heroInterval,
        featuredProductIds: normaliseStringArray(data.featuredProductIds),
        selectedProductIds: normaliseStringArray(data.selectedProductIds),
        categoryNames: normaliseStringArray(data.categoryNames),
        announcementEnabled: typeof data.announcementEnabled === 'boolean'
          ? data.announcementEnabled
          : DEFAULT_HOMEPAGE_SETTINGS.announcementEnabled,
        announcementMessages,
        announcementDuration,
        announcementText: announcementMessages[0] || DEFAULT_HOMEPAGE_SETTINGS.announcementText,
      } as HomepageSettings;
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
