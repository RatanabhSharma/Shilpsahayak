import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Sparkles,
  ArrowRight,
  Star,
  Box,
  Flame,
  Zap,
  UploadCloud,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import { useHomepage, DEFAULT_HOMEPAGE_SETTINGS } from '../../hooks/useHomepage';
import { useSettings } from '../../hooks/useSettings';
import { useReviews } from '../../hooks/useReviews';
import { buttonVariants } from '../../components/ui';
import { lazy, Suspense } from 'react';
import { ProductCard } from '../../components/product/ProductCard';
import { ProductCardSkeleton } from '../../components/loading/ProductSkeleton';
const Hero3DCanvas = lazy(() => import('../../components/3d/Hero3DCanvas').then(m => ({ default: m.Hero3DCanvas })));
import demoVideo from '../../assets/videos/demo_video2.mp4';

/* ============================================================
   MOTION VARIANTS FOR REFINED SCROLL & HOVER INTERACTIONS
   ============================================================ */
const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ============================================================
   TRUST STRIP MARQUEE ITEMS
   ============================================================ */
const MARQUEE_ITEMS = [
  { icon: Cpu, text: 'Up to ±50µm Precision Calibration' },
  { icon: Sparkles, text: '100% Eco-Plant PLA+ & Bio-Resin' },
  { icon: Zap, text: 'Instant CAD Slicing & Price Estimator' },
  { icon: ShieldCheck, text: 'Industry-Standard Encrypted CAD Vault' },
  { icon: Box, text: 'Pan-India Express Tracked Dispatch' },
  { icon: Flame, text: 'Hand-Inspected & Deburred in Patiala' },
];

/* ============================================================
   INTERACTIVE MATERIAL SHOWCASE DATA
   ============================================================ */
const MATERIALS_PREVIEW = [
  {
    id: 'pla',
    name: 'PLA+',
    tag: 'Aesthetic & Decor',
    density: '1.24 g/cm³',
    finish: 'Smooth Matte / Satin',
    bestFor: 'Lithophanes, Lamps & Desk Art',
    badgeClass: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  },
  {
    id: 'petg',
    name: 'PETG',
    tag: 'Tough & Functional',
    density: '1.27 g/cm³',
    finish: 'Impact & Heat Resistant',
    bestFor: 'Enclosures, Mounts & Drone Parts',
    badgeClass: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  },
  {
    id: 'abs',
    name: 'ABS',
    tag: 'Engineering Grade',
    density: '1.04 g/cm³',
    finish: 'High Temperature Tolerance',
    bestFor: 'Automotive & Mechanical Brackets',
    badgeClass: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  },
  {
    id: 'resin',
    name: 'UV Resin',
    tag: 'Ultra-High Detail',
    density: '1.18 g/cm³',
    finish: '50µm Injection-Like Finish',
    bestFor: 'Intricate Miniatures & Jewelry',
    badgeClass: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  },
];

/* ============================================================
   TRUE INFINITE SEAMLESS LOOPING CAROUSEL HOOK
   ============================================================ */
interface UseInfiniteLoopCarouselProps {
  itemCount: number;
  autoplayInterval?: number;
  enableAutoplay?: boolean;
  resumeDelay?: number;
}

function useInfiniteLoopCarousel({
  itemCount,
  autoplayInterval = 5500,
  enableAutoplay = true,
  resumeDelay = 4000,
}: UseInfiniteLoopCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isNormalizingRef = useRef(false);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSingleSetWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return 0;
    return el.scrollWidth / 3;
  }, [itemCount]);

  // Position container in the center set (Set 1 of 3: indices 0, 1, 2) on mount & resize
  const initializePosition = useCallback(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return;
    const singleSetWidth = getSingleSetWidth();
    if (singleSetWidth > 50) {
      el.scrollLeft = singleSetWidth;
    }
  }, [itemCount, getSingleSetWidth]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return;

    initializePosition();
    const t = setTimeout(initializePosition, 120);

    window.addEventListener('resize', initializePosition);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', initializePosition);
    };
  }, [itemCount, initializePosition]);

  // Viewport visibility check: do not run carousel autoplay when offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pause carousel autoplay while the user is actively scrolling vertically (via Ref to avoid React re-renders)
  const isWindowScrollingRef = useRef(false);
  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    const onWindowScroll = () => {
      isWindowScrollingRef.current = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isWindowScrollingRef.current = false;
      }, 600);
    };
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', onWindowScroll);
    };
  }, []);

  // Seamless infinite wrap without resetting to start (3 sets)
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isNormalizingRef.current || itemCount === 0) return;

    const singleSetWidth = getSingleSetWidth();
    if (singleSetWidth <= 50) return;

    // Past Set 1 into Set 2 -> shift back by 1 set
    if (el.scrollLeft >= singleSetWidth * 1.95) {
      isNormalizingRef.current = true;
      el.scrollLeft -= singleSetWidth;
      setTimeout(() => {
        isNormalizingRef.current = false;
      }, 50);
    }
    // Before Set 1 into Set 0 -> shift forward by 1 set
    else if (el.scrollLeft <= singleSetWidth * 0.05 && el.scrollLeft > 0) {
      isNormalizingRef.current = true;
      el.scrollLeft += singleSetWidth;
      setTimeout(() => {
        isNormalizingRef.current = false;
      }, 50);
    }
  }, [itemCount, getSingleSetWidth]);

  const getStepWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 300;
    const firstChild = el.firstElementChild as HTMLElement | null;
    if (firstChild && firstChild.offsetWidth > 0) {
      const style = window.getComputedStyle(el);
      const gap = parseFloat(style.columnGap || style.gap || '24') || 24;
      return firstChild.offsetWidth + gap;
    }
    return 300;
  }, []);

  const step = useCallback(
    (direction: -1 | 1) => {
      const el = containerRef.current;
      if (!el || itemCount === 0) return;
      const stepWidth = getStepWidth();
      el.scrollBy({ left: direction * stepWidth, behavior: 'smooth' });
    },
    [itemCount, getStepWidth]
  );

  const handleUserAction = useCallback(() => {
    setIsInteracting(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, resumeDelay);
  }, [resumeDelay]);

  const stepNext = useCallback(() => {
    step(1);
    handleUserAction();
  }, [step, handleUserAction]);

  const stepPrev = useCallback(() => {
    step(-1);
    handleUserAction();
  }, [step, handleUserAction]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartXRef.current !== null && touchStartYRef.current !== null) {
        const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
        const diffY = touchStartYRef.current - e.changedTouches[0].clientY;
        // Only trigger horizontal swipe if movement is predominantly horizontal
        if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
          if (diffX > 0) {
            step(1);
          } else {
            step(-1);
          }
          handleUserAction();
        }
      }
      touchStartXRef.current = null;
      touchStartYRef.current = null;
    },
    [step, handleUserAction]
  );

  useEffect(() => {
    if (!enableAutoplay || itemCount <= 1 || isHovered || isInteracting || !isInView) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      return;
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      if (isWindowScrollingRef.current) return;
      step(1);
    }, autoplayInterval);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [enableAutoplay, itemCount, isHovered, isInteracting, isInView, autoplayInterval, step]);

  return {
    containerRef,
    stepNext,
    stepPrev,
    handleScroll,
    handleTouchStart,
    handleTouchEnd,
    setIsHovered,
  };
}

export function Home() {
  const { data: products = [], isLoading } = useProducts();
  const {
    data: homepageSettings,
    isLoading: isHomepageLoading,
    isError: isHomepageError,
    refetch: refetchHomepage,
  } = useHomepage();
  const { data: settings } = useSettings();
  const { data: reviews = [] } = useReviews();
  const prefersReducedMotion = useReducedMotion();

  const whatsappNumber = settings?.whatsappNumber || '';
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
    : '#';

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  const [selectedMaterial, setSelectedMaterial] = useState('pla');
  const activeMaterialData = useMemo(
    () => MATERIALS_PREVIEW.find((m) => m.id === selectedMaterial) || MATERIALS_PREVIEW[0],
    [selectedMaterial]
  );

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /* Lazy Mount Three.js CAD Viewport when near viewport */
  const cadViewportRef = useRef<HTMLDivElement>(null);
  const [isCadInView, setIsCadInView] = useState(false);
  useEffect(() => {
    const el = cadViewportRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsCadInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Scroll-Linked Hero Parallax & Depth Transitions */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // Pure vertical translation for desktop only; no GPU texture rescaling (scale) during scroll
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);

  /* Hero Content & Media Resolution from Storefront CMS */
  const rawHero = homepageSettings?.hero;
  const defaultHero = DEFAULT_HOMEPAGE_SETTINGS.hero;
  const heroConfig = useMemo(() => ({
    badgeText: rawHero?.badgeText?.trim() || defaultHero.badgeText,
    headline: rawHero?.headline?.trim() || defaultHero.headline,
    subheadline: rawHero?.subheadline?.trim() || defaultHero.subheadline,
    primaryCtaText: rawHero?.primaryCtaText?.trim() || defaultHero.primaryCtaText,
    primaryCtaLink: rawHero?.primaryCtaLink?.trim() || defaultHero.primaryCtaLink,
    enablePrimaryCta: rawHero?.enablePrimaryCta ?? defaultHero.enablePrimaryCta,
    secondaryCtaText: rawHero?.secondaryCtaText?.trim() || defaultHero.secondaryCtaText,
    secondaryCtaLink: rawHero?.secondaryCtaLink?.trim() || defaultHero.secondaryCtaLink,
    enableSecondaryCta: rawHero?.enableSecondaryCta ?? defaultHero.enableSecondaryCta,
    heroVideoUrl: rawHero?.heroVideoUrl?.trim() || defaultHero.heroVideoUrl,
    heroPosterUrl: rawHero?.heroPosterUrl?.trim() || defaultHero.heroPosterUrl || '',
    heroImageUrl: rawHero?.heroImageUrl !== undefined ? (rawHero.heroImageUrl?.trim() || '') : (rawHero?.heroPosterUrl?.trim() || defaultHero.heroImageUrl || ''),
    heroImageMode: rawHero?.heroImageMode ?? defaultHero.heroImageMode,
    heroSlideshowImageUrls: rawHero?.heroSlideshowImageUrls || defaultHero.heroSlideshowImageUrls || [],
    enableVideo: rawHero?.enableVideo ?? defaultHero.enableVideo,
    showVideoTextOverlay: rawHero?.showVideoTextOverlay ?? defaultHero.showVideoTextOverlay,
  }), [rawHero, defaultHero]);

  const isVideoEnabled = heroConfig.enableVideo !== false;
  const showHeroText = !isVideoEnabled || heroConfig.showVideoTextOverlay !== false;
  const heroSlides = useMemo(
    () => heroConfig.heroSlideshowImageUrls.filter((url) => url.trim()),
    [heroConfig.heroSlideshowImageUrls]
  );
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);

  useEffect(() => {
    setActiveHeroSlide(0);
    if (isVideoEnabled || heroConfig.heroImageMode !== 'slideshow' || heroSlides.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [heroConfig.heroImageMode, heroSlides, isVideoEnabled]);

  const staticHeroImage = heroConfig.heroImageMode === 'slideshow' && heroSlides.length > 0
    ? heroSlides[activeHeroSlide % heroSlides.length]
    : heroConfig.heroImageUrl || '';

  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  useEffect(() => {
    // If video is disabled in CMS or user prefers reduced motion, do not load or schedule video
    if (!isVideoEnabled || prefersReducedMotion) return;

    // Do not download video automatically if saveData is enabled
    if (typeof navigator !== 'undefined' && (navigator as any).connection?.saveData) {
      return;
    }

    // Trigger video load on first user interaction or when main thread is idle after first paint
    const activateVideo = () => {
      setShouldLoadVideo(true);
      window.removeEventListener('scroll', activateVideo);
      window.removeEventListener('mousemove', activateVideo);
      window.removeEventListener('touchstart', activateVideo);
    };

    window.addEventListener('scroll', activateVideo, { passive: true, once: true });
    window.addEventListener('mousemove', activateVideo, { passive: true, once: true });
    window.addEventListener('touchstart', activateVideo, { passive: true, once: true });

    // Idle fallback after critical paint (3.5 seconds)
    const t = setTimeout(() => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => setShouldLoadVideo(true));
      } else {
        setShouldLoadVideo(true);
      }
    }, 3500);

    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', activateVideo);
      window.removeEventListener('mousemove', activateVideo);
      window.removeEventListener('touchstart', activateVideo);
    };
  }, [isVideoEnabled, prefersReducedMotion]);

  const heroMediaUrl = useMemo(() => {
    if (!isVideoEnabled || prefersReducedMotion) return '';
    const custom = heroConfig?.heroVideoUrl?.trim();
    if (
      custom &&
      !custom.includes('mixkit.co') &&
      custom !== '/videos/hero-print.webm' &&
      !custom.startsWith('/videos/demo_video')
    ) {
      return shouldLoadVideo ? custom : '';
    }
    // Defer demo video loading until after initial critical render
    if (!shouldLoadVideo) return '';
    return demoVideo;
  }, [heroConfig?.heroVideoUrl, isVideoEnabled, prefersReducedMotion, shouldLoadVideo]);

  const isHeroVideo = useMemo(() => {
    if (!isVideoEnabled || !heroMediaUrl || prefersReducedMotion) return false;
    return (
      heroMediaUrl === demoVideo ||
      /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(heroMediaUrl) ||
      heroMediaUrl.includes('video') ||
      heroMediaUrl.endsWith('.webm') ||
      heroMediaUrl.startsWith('data:video')
    );
  }, [heroMediaUrl, isVideoEnabled, prefersReducedMotion]);

  // Section visibility is synchronously available from default settings and hydrated by Firestore CMS
  const sectionVisibility = homepageSettings?.sectionVisibility ?? DEFAULT_HOMEPAGE_SETTINGS.sectionVisibility;

  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [heroMediaUrl]);

  // Pause video decoding when hero section is not visible to free GPU & CPU during scroll
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!videoRef.current) return;
        if (entry.isIntersecting) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);


  const featuredProducts = useMemo(() => {
    const configuredIds = homepageSettings?.featuredProductIds ?? [];
    if (configuredIds.length > 0) {
      const matched = configuredIds
        .map((id) => activeProducts.find((product) => product.id === id))
        .filter(Boolean) as typeof activeProducts;
      if (matched.length > 0) return matched;
    }
    const featured = activeProducts.filter((product) => product.featured);
    return featured.length >= 4 ? featured : activeProducts.slice(0, 12);
  }, [activeProducts, homepageSettings?.featuredProductIds]);

  const categories = useMemo(() => {
    const categoryMap = new Map<string, { image: string; count: number }>();
    for (const product of activeProducts) {
      if (product.category) {
        const existing = categoryMap.get(product.category);
        if (existing) {
          existing.count += 1;
        } else {
          categoryMap.set(product.category, {
            image: product.image || '',
            count: 1,
          });
        }
      }
    }

    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      image: data.image,
      productCount: data.count,
    }));
  }, [activeProducts]);

  /* Cloned 3-Set Extended Arrays for True Infinite Seamless Looping (50% lighter DOM) */
  const extendedFeaturedProducts = useMemo(() => {
    if (featuredProducts.length === 0) return [];
    return Array.from({ length: 3 }, (_, setIdx) =>
      featuredProducts.map((p, idx) => ({
        ...p,
        _carouselKey: `feat-${p.id || idx}-set-${setIdx}`,
        _isLcpCandidate: idx === 0 && setIdx === 1,
      }))
    ).flat();
  }, [featuredProducts]);

  const extendedCategories = useMemo(() => {
    if (categories.length === 0) return [];
    return Array.from({ length: 3 }, (_, setIdx) =>
      categories.map((c, idx) => ({
        ...c,
        _carouselKey: `cat-${c.name || idx}-set-${setIdx}`,
      }))
    ).flat();
  }, [categories]);

  /* Unified Infinite Looping Carousels */
  const featuredCarousel = useInfiniteLoopCarousel({
    itemCount: featuredProducts.length,
    autoplayInterval: 5500,
    enableAutoplay: true,
  });

  const categoryCarousel = useInfiniteLoopCarousel({
    itemCount: categories.length,
    autoplayInterval: 8000,
    enableAutoplay: true,
  });

  if (isHomepageError && !homepageSettings) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#F0F4F8] px-6 text-center"
        role="alert"
      >
        <p className="font-sans text-sm text-muted">
          Homepage settings could not be loaded. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => void refetchHomepage()}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#F0F4F8] text-ink selection:bg-accent-soft selection:text-accent w-full min-h-screen overflow-x-clip">
      {/* =====================================================
          1. CINEMATIC FULL-BLEED VIDEO HERO WITH PARALLAX SCROLL
      ====================================================== */}
      {sectionVisibility?.hero === true && (
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-[#0d0d0f] min-h-[420px] sm:min-h-0 sm:h-[580px] lg:h-[680px] w-full flex items-end justify-center pb-8 pt-20 sm:pb-24 sm:pt-32"
      >
        {/* Parallax Background Stage (Video / GIF / High-Res Poster) */}
        <motion.div
          style={{
            y: prefersReducedMotion || isMobile ? '0%' : heroParallaxY,
          }}
          className="absolute inset-0 z-0 w-full h-full overflow-hidden pointer-events-none"
        >
          {isHeroVideo ? (
            <video
              ref={videoRef}
              key={heroMediaUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              poster={
                heroConfig?.heroPosterUrl && !heroConfig.heroPosterUrl.includes('logo')
                  ? heroConfig.heroPosterUrl
                  : staticHeroImage && !staticHeroImage.includes('logo')
                    ? staticHeroImage
                    : undefined
              }
              className="w-full h-full object-cover object-center pointer-events-none"
            >
              <source src={heroMediaUrl} />
            </video>
          ) : isVideoEnabled && heroConfig?.heroPosterUrl && !heroConfig.heroPosterUrl.includes('logo') ? (
            <img
              src={heroConfig.heroPosterUrl}
              alt="Shilp Sahayak 3D Fabrication Studio"
              className="w-full h-full object-cover object-center"
            />
          ) : !isVideoEnabled && staticHeroImage && !staticHeroImage.includes('logo') ? (
            <img
              src={staticHeroImage}
              alt="Shilp Sahayak 3D Fabrication Studio"
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#19191d] via-[#0d0d0f] to-black" />
          )}
        </motion.div>

        {/* Multi-Stop Cinematic Scrim Overlays for Depth Transition */}
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-t from-[#0d0d0f] via-[#0d0d0f]/80 to-transparent pointer-events-none"
        />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0d0d0f]/80 to-transparent z-[1] pointer-events-none" />

        {/* Dynamic CMS Hero Content Overlay */}
        {(heroConfig?.headline || heroConfig?.badgeText || heroConfig?.primaryCtaText) && (
          <div className="relative z-10 max-w-[900px] mx-auto px-5 sm:px-8 lg:px-10 text-center flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-4 sm:space-y-5"
            >
              {showHeroText && (
                <>
                  {heroConfig?.badgeText && (
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 sm:px-4 sm:py-1.5 font-mono text-[10px] sm:text-xs font-bold text-white backdrop-blur-md shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        <span className="tracking-wide uppercase">
                          {heroConfig.badgeText}
                        </span>
                      </span>
                    </div>
                  )}

                  {heroConfig?.headline && (
                    <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                      {heroConfig.headline}
                    </h1>
                  )}

                  {heroConfig?.subheadline && (
                    <p className="font-sans text-xs sm:text-base text-zinc-300 max-w-xl mx-auto leading-relaxed">
                      {heroConfig.subheadline}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
                    {heroConfig?.enablePrimaryCta !== false && heroConfig?.primaryCtaText && (
                      <Link
                        to={heroConfig?.primaryCtaLink || '/shilp-studio'}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-dark text-white font-mono text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{heroConfig.primaryCtaText}</span>
                      </Link>
                    )}

                    {heroConfig?.enableSecondaryCta !== false && heroConfig?.secondaryCtaText && (
                      <Link
                        to={heroConfig?.secondaryCtaLink || '/shop'}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-mono text-xs sm:text-sm font-bold transition-all active:scale-95"
                      >
                        <Box className="w-4 h-4" />
                        <span>{heroConfig.secondaryCtaText}</span>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </section>
      )}

      {/* =====================================================
          2. INFINITE TICKER TRUST STRIP
      ====================================================== */}
      {sectionVisibility?.trustMarquee === true && (
      <div className="relative overflow-hidden bg-dark text-white border-y border-white/10 py-3 select-none">
        <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-2 font-mono text-xs text-zinc-300 px-4">
                <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="tracking-wide uppercase font-semibold text-[11px]">{item.text}</span>
                <span className="text-white/20 ml-6">✦</span>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* =====================================================
          3. FEATURED PRODUCTS (FEATURED 3D CREATIONS)
      ====================================================== */}
      {sectionVisibility?.featuredProducts === true && (
      <section
        className="bg-[#F0F4F8] py-12 sm:py-14"
      >
        {/* Section Header */}
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10 mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              FEATURED PRODUCTS
            </span>
            <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-ink">
              {homepageSettings?.featuredTitle || DEFAULT_HOMEPAGE_SETTINGS.featuredTitle}
            </h2>
            <p className="mt-1 font-sans text-xs sm:text-sm text-muted">
              {homepageSettings?.featuredSubtitle || DEFAULT_HOMEPAGE_SETTINGS.featuredSubtitle}
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 font-display text-xs sm:text-sm font-bold text-accent hover:underline"
            >
              <span>View Complete Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={featuredCarousel.stepPrev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xs active:scale-95 transition-all"
                aria-label="Previous products"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={featuredCarousel.stepNext}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xs active:scale-95 transition-all"
                aria-label="Next products"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Cards Infinite Carousel with Centered Side Arrows */}
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10 pb-4">
          {/* Desktop Floating Left Arrow */}
          <button
            type="button"
            onClick={featuredCarousel.stepPrev}
            className="hidden sm:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:text-white hover:border-accent active:scale-95 cursor-pointer focus:outline-none"
            aria-label="Previous featured products"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Desktop Floating Right Arrow */}
          <button
            type="button"
            onClick={featuredCarousel.stepNext}
            className="hidden sm:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:text-white hover:border-accent active:scale-95 cursor-pointer focus:outline-none"
            aria-label="Next featured products"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {extendedFeaturedProducts.length === 0 ? (
            <div className="-mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 flex gap-4 sm:gap-6 overflow-hidden pb-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="w-[min(260px,85vw)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] shrink-0"
                  aria-hidden="true"
                >
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={featuredCarousel.containerRef}
              onScroll={featuredCarousel.handleScroll}
              onMouseEnter={() => featuredCarousel.setIsHovered(true)}
              onMouseLeave={() => featuredCarousel.setIsHovered(false)}
              onTouchStart={featuredCarousel.handleTouchStart}
              onTouchEnd={featuredCarousel.handleTouchEnd}
              onFocusCapture={() => featuredCarousel.setIsHovered(true)}
              onBlurCapture={() => featuredCarousel.setIsHovered(false)}
              className="-mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none overscroll-x-contain"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
            >
              {extendedFeaturedProducts.map((product) => (
                <div
                  key={product._carouselKey}
                  className="w-[min(260px,85vw)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] shrink-0"
                >
                  <ProductCard product={product} priority={(product as any)._isLcpCandidate} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* =====================================================
          4. CUSTOM 3D PRINTING + THREE.JS INTERACTIVE 3D CAD ENGINE
      ====================================================== */}
      {sectionVisibility?.shilpStudioPromo === true && (
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 650px' }}
        className="bg-[#F0F4F8] py-8 sm:py-14 border-t border-line"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-ink bg-[#0e0e11] grid-plate p-4 sm:p-8 lg:p-12 text-white shadow-solid-md sm:shadow-solid-xl">
            <div className="relative z-10 grid gap-6 lg:gap-10 lg:grid-cols-2 lg:items-center">
              {/* Left Column: Interactive Three.js 3D Viewport */}
              <div className="space-y-4">
                <div ref={cadViewportRef}>
                  {isCadInView ? (
                    <Suspense
                      fallback={
                        <div className="w-full aspect-[4/3] xs:aspect-[16/10] sm:aspect-auto sm:h-[380px] lg:h-[420px] rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        </div>
                      }
                    >
                      <Hero3DCanvas className="w-full aspect-[4/3] xs:aspect-[16/10] sm:aspect-auto sm:h-[380px] lg:h-[420px]" />
                    </Suspense>
                  ) : (
                    <div className="w-full aspect-[4/3] xs:aspect-[16/10] sm:aspect-auto sm:h-[380px] lg:h-[420px] rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-500 font-mono text-xs">
                        <Box className="w-6 h-6 animate-pulse text-accent" />
                        <span>Interactive 3D Viewport</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-zinc-400 px-1 sm:px-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> WebGL Hardware Accelerated
                  </span>
                  <span>Drag model to inspect surfaces</span>
                </div>
              </div>

              {/* Right Column: Instant Slicer Pitch & Material Matrix */}
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-md bg-accent/20 border border-accent/30 px-3.5 py-1 font-mono text-xs font-bold text-accent-light">
                  <Sparkles className="w-3.5 h-3.5" />
                  Instant STL Slicer &amp; Estimator
                </span>
                {isHomepageLoading ? (
                  <div className="space-y-3" aria-hidden="true">
                    <div className="h-9 sm:h-11 w-4/5 rounded-md bg-white/10 animate-pulse" />
                    <div className="h-8 w-3/5 rounded-md bg-white/10 animate-pulse" />
                  </div>
                ) : (
                  <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                    {homepageSettings?.customPromoTitle || (
                      <>
                        Have a 3D Model?
                        <br />
                        <span className="text-zinc-300 text-2xl sm:text-3xl lg:text-4xl font-normal block mt-1">
                          Upload your CAD file &amp; get an instant quote.
                        </span>
                      </>
                    )}
                  </h2>
                )}
                <p className="font-sans text-xs sm:text-sm text-zinc-300 max-w-lg leading-relaxed">
                  Upload your 3D CAD file for instant geometric volume analysis, theoretical weight calculation, and workshop pricing.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 font-mono text-[11px]">
                  <div className="rounded-xl border-2 border-ink bg-zinc-900/80 p-3 text-center space-y-1 group/step hover:border-accent/40 transition-colors">
                    <span className="text-accent font-bold block text-xs group-hover/step:scale-105 transition-transform">01. Upload</span>
                    <span className="text-zinc-400 text-[10px]">STL / OBJ / 3MF</span>
                  </div>
                  <div className="rounded-xl border-2 border-ink bg-zinc-900/80 p-3 text-center space-y-1 group/step hover:border-accent/40 transition-colors">
                    <span className="text-accent font-bold block text-xs group-hover/step:scale-105 transition-transform">02. Configure</span>
                    <span className="text-zinc-400 text-[10px]">Material &amp; Infill</span>
                  </div>
                  <div className="rounded-xl border-2 border-ink bg-zinc-900/80 p-3 text-center space-y-1 group/step hover:border-accent/40 transition-colors">
                    <span className="text-accent font-bold block text-xs group-hover/step:scale-105 transition-transform">03. Fabricate</span>
                    <span className="text-zinc-400 text-[10px]">Fast Dispatch</span>
                  </div>
                </div>

                {/* Interactive Material Selector Tabs */}
                <div className="rounded-xl sm:rounded-2xl border border-ink/80 sm:border-2 sm:border-ink bg-zinc-900/80 p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Material Matrix
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">Tap to switch</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {MATERIALS_PREVIEW.map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setSelectedMaterial(mat.id)}
                        aria-pressed={selectedMaterial === mat.id}
                        aria-label={`Select ${mat.name} material`}
                        className={`py-1 px-0.5 sm:py-1.5 sm:px-1 rounded-lg sm:rounded-xl font-mono text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                          selectedMaterial === mat.id
                            ? 'bg-white text-ink shadow-md scale-105'
                            : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mat.name}
                      </button>
                    ))}
                  </div>

                  {/* Active Material Specs */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeMaterialData.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono"
                    >
                      <div className="bg-zinc-950/60 p-2.5 rounded-xl border-2 border-ink">
                        <span className="text-zinc-500 block text-[9px]">DENSITY</span>
                        <span className="text-white font-bold">{activeMaterialData.density}</span>
                      </div>
                      <div className="bg-zinc-950/60 p-2.5 rounded-xl border-2 border-ink">
                        <span className="text-zinc-500 block text-[9px]">TEXTURE</span>
                        <span className="text-white font-bold truncate block">{activeMaterialData.finish}</span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
                  {isHomepageLoading ? (
                    <span className="h-11 w-44 rounded-xl bg-white/10 animate-pulse" aria-hidden="true" />
                  ) : homepageSettings?.customPromoButtonEnabled !== false ? (
                    <Link
                      to={homepageSettings?.customPromoButtonLink || '/shilp-studio'}
                      className={`w-full sm:w-auto ${buttonVariants({ variant: 'primary', size: 'md' })}`}
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{homepageSettings?.customPromoButtonText || 'Launch Shilp Studio'}</span>
                    </Link>
                  ) : null}
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full sm:w-auto ${buttonVariants({ variant: 'whatsapp', size: 'md' })}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Consult on WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      )}

      {/* =====================================================
          5. SHOP BY COLLECTION (CURATED CATEGORIES)
      ====================================================== */}
      {sectionVisibility?.categories === true && (
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 500px' }}
        className="bg-[#F0F4F8] py-12 sm:py-14 border-t border-line"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end mb-6 sm:mb-8">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                Curated Collections
              </span>
              <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-ink">
                Shop by Category
              </h2>
            </div>

            {/* View All Categories Link & Mobile Navigation Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <Link to="/shop" className="font-display text-xs sm:text-sm font-bold text-accent hover:underline">
                View All Categories →
              </Link>
              <div className="flex sm:hidden items-center gap-1.5">
                <button
                  type="button"
                  onClick={categoryCarousel.stepPrev}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xs active:scale-95 transition-all"
                  aria-label="Previous categories"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={categoryCarousel.stepNext}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xs active:scale-95 transition-all"
                  aria-label="Next categories"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Cards Infinite Carousel */}
          <div className="relative">
            {/* Desktop Floating Left Arrow */}
            <button
              type="button"
              onClick={categoryCarousel.stepPrev}
              className="hidden sm:flex absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:text-white hover:border-accent active:scale-95 cursor-pointer focus:outline-none"
              aria-label="Previous categories"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Desktop Floating Right Arrow */}
            <button
              type="button"
              onClick={categoryCarousel.stepNext}
              className="hidden sm:flex absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:text-white hover:border-accent active:scale-95 cursor-pointer focus:outline-none"
              aria-label="Next categories"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {isLoading ? (
              <div
                className="-mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 flex gap-4 sm:gap-6 overflow-hidden pb-4"
                aria-hidden="true"
              >
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="w-[min(260px,85vw)] sm:w-[280px] lg:w-[320px] shrink-0">
                    <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-zinc-200/80" />
                  </div>
                ))}
              </div>
            ) : (
              <div
                ref={categoryCarousel.containerRef}
                onScroll={categoryCarousel.handleScroll}
                onMouseEnter={() => categoryCarousel.setIsHovered(true)}
                onMouseLeave={() => categoryCarousel.setIsHovered(false)}
                onTouchStart={categoryCarousel.handleTouchStart}
                onTouchEnd={categoryCarousel.handleTouchEnd}
                onFocusCapture={() => categoryCarousel.setIsHovered(true)}
                onBlurCapture={() => categoryCarousel.setIsHovered(false)}
                className="-mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none overscroll-x-contain"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
              >
                {extendedCategories.map((cat) => (
                  <div
                    key={cat._carouselKey}
                    className="w-[min(260px,85vw)] sm:w-[280px] lg:w-[320px] shrink-0"
                  >
                  <Link
                    to={`/shop?category=${encodeURIComponent(cat.name)}`}
                    className="group/cat relative block w-full overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-1.5 hover:border-accent/40"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-shell shine-sweep-container">
                      <img
                        src={cat.image || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}
                        alt={cat.name}
                        className="h-full w-full object-cover transition-all duration-700 group-hover/cat:scale-108"
                      />
                      {/* Dark Gradient Overlay for Readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                      {/* Top-Left Piece Count Badge */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent border border-white/10 shadow-xs backdrop-blur-xs">
                          {cat.productCount} {cat.productCount === 1 ? 'Piece' : 'Pieces'}
                        </span>
                      </div>

                      {/* Bottom Title */}
                      <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 text-white z-10">
                        <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover/cat:text-accent transition-colors truncate">
                          {cat.name}
                        </h3>
                      </div>
                    </div>
                  </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.section>
      )}

      {/* =====================================================
          6. SOCIAL PROOF (REVIEWS)
      ====================================================== */}
      {sectionVisibility?.reviews === true && reviews.length > 0 && (
        <motion.section
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 400px' }}
          className="bg-[#F0F4F8] text-ink py-16 border-t border-line"
        >
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
              <span className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-1 border border-line font-mono text-[11px] font-bold uppercase tracking-widest text-muted">
                • COMMUNITY VOICES
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
                Stories from <span className="italic text-accent">Indian Homes.</span>
              </h2>
              <p className="font-sans text-xs sm:text-sm text-muted leading-relaxed">
                Real feedback from creators, designers, and customers across India.
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r, idx) => (
                <div
                  key={r.id || idx}
                  className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 border border-line shadow-2xs space-y-3 sm:space-y-4 flex flex-col justify-between hover:shadow-card hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(r.rating || 5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="font-sans text-xs sm:text-sm text-ink leading-relaxed italic">
                      &ldquo;{r.quote}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-line">
                    <div className="w-8 h-8 rounded-md bg-ink text-white font-mono text-xs font-bold flex items-center justify-center">
                      {r.name?.[0] || 'U'}
                    </div>
                    <span className="font-sans text-xs font-bold text-ink">{r.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* =====================================================
          7. FINAL MEMORABLE CTA SECTION
      ====================================================== */}
      {sectionVisibility?.finalCta === true && (
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 350px' }}
        className="py-10 sm:py-20 bg-white border-t border-line text-center"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl mx-auto space-y-6">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              Let's Create Together
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
              Have an idea?<br />Let's make it real.
            </h2>
            <p className="font-sans text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
              Explore our ready-to-ship 3D printed catalog or upload your CAD file for custom fabrication.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/shop"
                className={`w-full sm:w-auto ${buttonVariants({ variant: 'primary', size: 'lg' })}`}
              >
                <span>Shop Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/shilp-studio"
                className={`w-full sm:w-auto ${buttonVariants({ variant: 'secondary', size: 'lg' })}`}
              >
                <span>Start a Custom Print</span>
              </Link>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full sm:w-auto ${buttonVariants({ variant: 'outline', size: 'lg' })}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </motion.section>
      )}
    </div>
  );
}
