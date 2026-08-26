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

export const DEFAULT_HERO_SLIDES: HomepageHeroSlide[] = [
  {
    id: 'hero-1',
    enabled: true,
    eyebrow: 'Bespoke Craftsmanship',
    title: 'Luminous Memories & Custom Lithophane Lamps',
    description:
      'Transform cherished photos and personal moments into glowing 3D-fabricated art pieces, personalized anniversary trophies, and desk decor.',
    image:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    buttonText: 'Explore Workshop Pieces',
    buttonLink: '/catalog',
  },
  {
    id: 'hero-2',
    enabled: true,
    eyebrow: 'Precision Engineering',
    title: 'Rapid Prototypes & Robotics Enclosures',
    description:
      'Industrial-grade PETG, ABS, and high-detail SLA resin fabrication with 50µm dimensional tolerances for makers, IoT startups, and engineering teams.',
    image:
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=80',
    buttonText: 'Upload CAD for Quote',
    buttonLink: '/custom-service',
  },
  {
    id: 'hero-3',
    enabled: true,
    eyebrow: 'Zero Setup Delays',
    title: 'If You Can Imagine It, We Can Print It.',
    description:
      'Turn concept sketches, CAD models, or replacement part ideas into finished, production-grade physical objects in 24–48 hours.',
    image:
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
    buttonText: 'Get Instant 3D Quote',
    buttonLink: '/custom-service',
  },
];

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  heroSlides: DEFAULT_HERO_SLIDES,
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
  if (!Array.isArray(value)) return DEFAULT_HERO_SLIDES;

  const slides = value
    .filter(
      (slide): slide is Record<string, unknown> =>
        !!slide && typeof slide === 'object'
    )
    .map((slide, index) => ({
      id:
        typeof slide.id === 'string' && slide.id
          ? slide.id
          : `hero-${index + 1}`,

      enabled: slide.enabled !== false,

      eyebrow:
        typeof slide.eyebrow === 'string'
          ? slide.eyebrow
          : '',

      title:
        typeof slide.title === 'string'
          ? slide.title
          : '',

      description:
        typeof slide.description === 'string'
          ? slide.description
          : '',

      image:
        typeof slide.image === 'string'
          ? slide.image
          : '',

      buttonText:
        typeof slide.buttonText === 'string'
          ? slide.buttonText
          : '',

      buttonLink:
        typeof slide.buttonLink === 'string'
          ? slide.buttonLink
          : '',
    }));

  return slides.length > 0 ? slides : DEFAULT_HERO_SLIDES;
}

function normaliseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string =>
      typeof item === 'string'
  );
}

function normaliseAnnouncementMessages(
  value: unknown,
  legacyText: string
): string[] {
  if (Array.isArray(value)) {
    const messages = value
      .filter(
        (message): message is string =>
          typeof message === 'string'
      )
      .map((message) => message.trim())
      .filter(Boolean);

    /*
     * If announcementMessages exists but is empty,
     * fall back to the older announcementText field.
     */
    if (messages.length > 0) {
      return messages;
    }
  }

  if (legacyText) {
    return [legacyText];
  }

  return [];
}

export function useHomepage() {
  return useQuery({
    queryKey: homepageKey,

    queryFn: async (): Promise<HomepageSettings> => {
      const ref = doc(
        db,
        'settings',
        HOMEPAGE_DOCUMENT_ID
      );

      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        return DEFAULT_HOMEPAGE_SETTINGS;
      }

      const data =
        snapshot.data() as Record<string, unknown>;

      const legacyText =
        typeof data.announcementText === 'string'
          ? data.announcementText.trim()
          : '';

      const announcementMessages =
        normaliseAnnouncementMessages(
          data.announcementMessages,
          legacyText
        );

      const rawAnnouncementDuration =
        Number(data.announcementDuration);

      const announcementDuration =
        Number.isFinite(rawAnnouncementDuration)
          ? Math.min(
              Math.max(
                Math.round(rawAnnouncementDuration),
                12
              ),
              40
            )
          : DEFAULT_HOMEPAGE_SETTINGS.announcementDuration;

      const rawHeroInterval =
        Number(data.heroInterval);

      const heroInterval =
        Number.isFinite(rawHeroInterval)
          ? Math.min(
              Math.max(
                Math.round(rawHeroInterval),
                2500
              ),
              15000
            )
          : DEFAULT_HOMEPAGE_SETTINGS.heroInterval;

      return {
        ...DEFAULT_HOMEPAGE_SETTINGS,

        heroSlides: normaliseHeroSlides(
          data.heroSlides
        ),

        heroAutoplay:
          typeof data.heroAutoplay === 'boolean'
            ? data.heroAutoplay
            : DEFAULT_HOMEPAGE_SETTINGS.heroAutoplay,

        heroInterval,

        featuredProductIds:
          normaliseStringArray(
            data.featuredProductIds
          ),

        selectedProductIds:
          normaliseStringArray(
            data.selectedProductIds
          ),

        categoryNames:
          normaliseStringArray(
            data.categoryNames
          ),

        announcementEnabled:
          typeof data.announcementEnabled === 'boolean'
            ? data.announcementEnabled
            : DEFAULT_HOMEPAGE_SETTINGS.announcementEnabled,

        announcementText:
          announcementMessages[0] || '',

        announcementMessages,

        announcementDuration,
      };
    },

    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateHomepage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      settings: HomepageSettings
    ) => {
      const ref = doc(
        db,
        'settings',
        HOMEPAGE_DOCUMENT_ID
      );

      await setDoc(
        ref,
        {
          ...settings,

          /*
           * Keep announcementText synchronized with
           * the first active message for backwards
           * compatibility.
           */
          announcementText:
            settings.announcementMessages[0] || '',
        },
        { merge: true }
      );

      return settings;
    },

    onSuccess: (settings) => {
      queryClient.setQueryData(
        homepageKey,
        settings
      );
    },
  });
}