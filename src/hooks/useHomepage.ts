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
  videoUrl?: string;
  buttonText: string;
  buttonLink: string;
};

export type HomepageTestimonial = {
  id: string;
  author: string;
  location?: string;
  rating: number;
  comment: string;
  verified?: boolean;
  enabled: boolean;
};

export type HomepageFaq = {
  id: string;
  question: string;
  answer: string;
  category?: string;
  enabled: boolean;
};

export type HomepageSettings = {
  heroSlides: HomepageHeroSlide[];
  heroAutoplay: boolean;
  heroInterval: number;
  heroVideoUrl?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroButtonText?: string;
  heroButtonLink?: string;
  featuredProductIds: string[];
  selectedProductIds: string[];
  categoryNames: string[];
  announcementEnabled: boolean;
  announcementText: string;
  announcementMessages: string[];
  announcementDuration: number;
  featuredTitle?: string;
  featuredSubtitle?: string;
  customPromoTitle?: string;
  customPromoSubtitle?: string;
  customPromoButtonText?: string;
  customPromoButtonLink?: string;
  testimonials?: HomepageTestimonial[];
  faqs?: HomepageFaq[];
  isPublished?: boolean;
  footerNote?: string;
};

export const DEFAULT_HERO_SLIDES: HomepageHeroSlide[] = [
  {
    id: 'hero-1',
    enabled: true,
    eyebrow: 'Bespoke Craftsmanship',
    title: 'Turn Ideas Into Something Real.',
    description:
      'Precision custom 3D printing, bespoke interior lighting, and made-to-order physical goods crafted in our dedicated Indian makerspace.',
    image:
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=2000&q=80',
    buttonText: 'Explore Products',
    buttonLink: '/shop',
  },
  {
    id: 'hero-2',
    enabled: true,
    eyebrow: 'Precision Engineering',
    title: 'Rapid Prototypes & Custom Enclosures',
    description:
      'High-detail FDM and SLA additive manufacturing across PLA, PETG, ABS, and UV resins for creators, startups, and engineering teams.',
    image:
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=80',
    buttonText: 'Upload CAD for Quote',
    buttonLink: '/shilp-studio',
  },
  {
    id: 'hero-3',
    enabled: true,
    eyebrow: 'Makerspace Fabrication',
    title: 'If You Can Imagine It, We Can Print It.',
    description:
      'Turn concept sketches, CAD models, or replacement part ideas into finished, production-grade physical objects.',
    image:
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
    buttonText: 'Get Custom 3D Quote',
    buttonLink: '/shilp-studio',
  },
];

export const DEFAULT_HOMEPAGE_TESTIMONIALS: HomepageTestimonial[] = [
  {
    id: 'test-1',
    author: 'Aarav Patel',
    location: 'Bengaluru, KA',
    rating: 5,
    comment: 'The surface finish on the custom PLA enclosure was stellar. Dimensional accuracy was within 0.15mm.',
    verified: true,
    enabled: true,
  },
  {
    id: 'test-2',
    author: 'Pooja Sharma',
    location: 'Mumbai, MH',
    rating: 5,
    comment: 'Ordered the moonlight lamp as an anniversary gift. Beautiful ambient warm diffusion and rock-solid build.',
    verified: true,
    enabled: true,
  },
  {
    id: 'test-3',
    author: 'Vikram Mehta',
    location: 'Gurugram, HR',
    rating: 5,
    comment: 'Turnaround for our drone prototype parts was under 48 hours. Excellent engineering service.',
    verified: true,
    enabled: true,
  },
];

export const DEFAULT_HOMEPAGE_FAQS: HomepageFaq[] = [
  {
    id: 'faq-1',
    question: 'What 3D printing materials do you support?',
    answer: 'We fabricate with Plant-based PLA+, Engineering PETG, Heat-resistant ABS, Flexible TPU (95A), and Ultra-high-detail UV Resin.',
    category: 'Materials',
    enabled: true,
  },
  {
    id: 'faq-2',
    question: 'How long does custom 3D printing take?',
    answer: 'Most custom orders are printed within 24–48 hours and shipped across India via express courier with real-time tracking.',
    category: 'Turnaround',
    enabled: true,
  },
  {
    id: 'faq-3',
    question: 'Can I upload files other than STL?',
    answer: 'Yes! Our studio slicer accepts STL, OBJ, and 3MF files. For STEP/CAD or design idea sketches, submit a quote request and our engineers will inspect it.',
    category: 'Files',
    enabled: true,
  },
];

export const DEFAULT_HOMEPAGE_SETTINGS: HomepageSettings = {
  heroSlides: DEFAULT_HERO_SLIDES,
  heroAutoplay: true,
  heroInterval: 6000,
  heroVideoUrl: '/videos/demo_video2.mp4',
  heroEyebrow: 'BESPOKE 3D FABRICATION STUDIO',
  heroTitle: 'Turn Ideas Into Something Real.',
  heroSubtitle: 'Precision 3D printed lighting, mechanical components, and bespoke goods crafted in India.',
  heroButtonText: 'Explore Collection',
  heroButtonLink: '/shop',

  featuredProductIds: [],
  selectedProductIds: [],
  categoryNames: [],

  announcementEnabled: false,
  announcementText: '',
  announcementMessages: [],
  announcementDuration: 24,

  featuredTitle: 'Featured 3D Creations',
  featuredSubtitle: 'Handcrafted 3D printed lighting, desk accessories, and customized keepsakes.',
  customPromoTitle: 'Have a 3D Model? Upload your STL & get an instant quote.',
  customPromoSubtitle: 'Our interactive custom printing pipeline computes volume, estimates material weight, and generates transparent pricing in real time for PLA, PETG, ABS, and Resin.',
  customPromoButtonText: 'Upload 3D File',
  customPromoButtonLink: '/shilp-studio',

  testimonials: DEFAULT_HOMEPAGE_TESTIMONIALS,
  faqs: DEFAULT_HOMEPAGE_FAQS,
  isPublished: true,
  footerNote: 'Crafted with pride in India · Precision additive manufacturing',
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

      videoUrl:
        typeof slide.videoUrl === 'string'
          ? slide.videoUrl
          : undefined,

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

        heroVideoUrl:
          typeof data.heroVideoUrl === 'string'
            ? data.heroVideoUrl
            : DEFAULT_HOMEPAGE_SETTINGS.heroVideoUrl,

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

        announcementMessages,

        announcementDuration,

        featuredTitle:
          typeof data.featuredTitle === 'string'
            ? data.featuredTitle
            : DEFAULT_HOMEPAGE_SETTINGS.featuredTitle,

        featuredSubtitle:
          typeof data.featuredSubtitle === 'string'
            ? data.featuredSubtitle
            : DEFAULT_HOMEPAGE_SETTINGS.featuredSubtitle,

        customPromoTitle:
          typeof data.customPromoTitle === 'string'
            ? data.customPromoTitle
            : DEFAULT_HOMEPAGE_SETTINGS.customPromoTitle,

        customPromoSubtitle:
          typeof data.customPromoSubtitle === 'string'
            ? data.customPromoSubtitle
            : DEFAULT_HOMEPAGE_SETTINGS.customPromoSubtitle,

        customPromoButtonText:
          typeof data.customPromoButtonText === 'string'
            ? data.customPromoButtonText
            : DEFAULT_HOMEPAGE_SETTINGS.customPromoButtonText,

        customPromoButtonLink:
          typeof data.customPromoButtonLink === 'string'
            ? data.customPromoButtonLink
            : DEFAULT_HOMEPAGE_SETTINGS.customPromoButtonLink,

        testimonials: Array.isArray(data.testimonials)
          ? (data.testimonials as HomepageTestimonial[])
          : DEFAULT_HOMEPAGE_TESTIMONIALS,

        faqs: Array.isArray(data.faqs)
          ? (data.faqs as HomepageFaq[])
          : DEFAULT_HOMEPAGE_FAQS,

        isPublished:
          typeof data.isPublished === 'boolean'
            ? data.isPublished
            : DEFAULT_HOMEPAGE_SETTINGS.isPublished,

        footerNote:
          typeof data.footerNote === 'string'
            ? data.footerNote
            : DEFAULT_HOMEPAGE_SETTINGS.footerNote,
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


