import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
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
} from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import { useHomepage } from '../../hooks/useHomepage';
import { useSettings } from '../../hooks/useSettings';
import { useReviews } from '../../hooks/useReviews';
import { buttonVariants } from '../../components/ui';
import { ProductCard } from '../../components/product/ProductCard';
import { FeaturedProductSkeleton } from '../../components/loading/ProductSkeleton';
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
  { icon: Zap, text: 'Same-Day Dispatch on In-Stock Items' },
  { icon: ShieldCheck, text: 'Carefully Packaged & Shock-Proof Delivery' },
  { icon: Box, text: 'Pan-India Express Tracked Dispatch' },
  { icon: Flame, text: 'Hand-Inspected & Deburred in Patiala' },
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
  const { data: homepageSettings } = useHomepage();
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /* Scroll-Linked Hero Parallax & Depth Transitions */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // Pure vertical translation for desktop only; no GPU texture rescaling (scale) during scroll
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);

  /* Hero Media & Content (Video / GIF with Poster fallback) */
  const heroMediaUrl = useMemo(() => {
    const custom = homepageSettings?.heroVideoUrl?.trim();
    if (
      custom &&
      !custom.includes('mixkit.co') &&
      custom !== '/hero-print.webm' &&
      !custom.startsWith('/videos/demo_video')
    ) {
      return custom;
    }
    return demoVideo;
  }, [homepageSettings?.heroVideoUrl]);

  const isHeroVideo = useMemo(() => {
    return (
      heroMediaUrl === demoVideo ||
      /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(heroMediaUrl) ||
      heroMediaUrl.includes('video') ||
      heroMediaUrl.endsWith('.webm') ||
      heroMediaUrl.startsWith('data:video')
    );
  }, [heroMediaUrl]);

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

  const heroPosterImage =
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=2000&q=80';

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

  return (
    <div className="bg-[#F0F4F8] text-ink selection:bg-accent-soft selection:text-accent w-full min-h-screen overflow-x-hidden">
      {/* =====================================================
          1. CINEMATIC FULL-BLEED VIDEO HERO WITH PARALLAX SCROLL
      ====================================================== */}
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-[#0d0d0f] aspect-video sm:aspect-auto sm:h-[580px] lg:h-[680px] w-full"
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
              preload="auto"
              poster={heroPosterImage}
              className="w-full h-full object-cover object-center pointer-events-none"
            >
              <source src={heroMediaUrl} type="video/webm" />
              <source src={heroMediaUrl} type="video/mp4" />
              <img
                src={heroPosterImage}
                alt="Shilp Sahayak 3D Fabrication Studio"
                className="w-full h-full object-cover object-center"
              />
            </video>
          ) : (
            <img
              src={heroMediaUrl || heroPosterImage}
              alt="Shilp Sahayak 3D Fabrication Studio"
              className="w-full h-full object-cover object-center"
            />
          )}
        </motion.div>

        {/* Multi-Stop Cinematic Scrim Overlays for Depth Transition */}
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-t from-[#0d0d0f] via-[#0d0d0f]/50 to-transparent pointer-events-none"
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0d0d0f]/60 to-transparent z-[1] pointer-events-none" />
      </section>

      {/* =====================================================
          2. INFINITE TICKER TRUST STRIP
      ====================================================== */}
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

      {/* =====================================================
          3. FEATURED PRODUCTS (FEATURED 3D CREATIONS)
      ====================================================== */}
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="bg-[#F0F4F8] py-12 sm:py-14"
      >
        {/* Section Header */}
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10 mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              FEATURED PRODUCTS
            </span>
            <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-ink">
              {homepageSettings?.featuredTitle || 'Featured Products'}
            </h2>
            <p className="mt-1 font-sans text-xs sm:text-sm text-muted">
              {homepageSettings?.featuredSubtitle || 'Handcrafted 3D lighting, workspace decor, and custom creations.'}
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
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xs active:scale-95 transition-all"
                aria-label="Previous products"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={featuredCarousel.stepNext}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xs active:scale-95 transition-all"
                aria-label="Next products"
              >
                <ChevronRight className="h-4 w-4" />
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

          {isLoading ? (
            <FeaturedProductSkeleton />
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
                  className="w-[240px] xs:w-[260px] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] shrink-0"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* =====================================================
          4. SHOP BY COLLECTION (CURATED CATEGORIES)
      ====================================================== */}
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
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xs active:scale-95 transition-all"
                  aria-label="Previous categories"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={categoryCarousel.stepNext}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xs active:scale-95 transition-all"
                  aria-label="Next categories"
                >
                  <ChevronRight className="h-4 w-4" />
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
                  className="w-[220px] xs:w-[240px] sm:w-[280px] lg:w-[320px] shrink-0"
                >
                  <Link
                    to={`/shop?category=${encodeURIComponent(cat.name)}`}
                    className="group/cat relative block w-full overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-1.5 hover:border-accent/40"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-shell shine-sweep-container">
                      <img
                        src={cat.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'}
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
          </div>
        </div>
      </motion.section>

      {/* =====================================================
          6. SOCIAL PROOF (REVIEWS)
      ====================================================== */}
      {reviews.length > 0 && (
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
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 border border-line font-mono text-[11px] font-bold uppercase tracking-widest text-muted">
                • COMMUNITY VOICES
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
                Stories from <span className="italic text-accent">Indian Homes.</span>
              </h2>
              <p className="font-sans text-xs sm:text-sm text-muted leading-relaxed">
                Real feedback from creators, designers, and customers across India.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r, idx) => (
                <div
                  key={r.id || idx}
                  className="rounded-2xl bg-white p-6 border border-line shadow-2xs space-y-4 flex flex-col justify-between hover:shadow-card hover:-translate-y-1 transition-all duration-300"
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
                    <div className="w-8 h-8 rounded-full bg-ink text-white font-mono text-xs font-bold flex items-center justify-center">
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
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 350px' }}
        className="py-20 bg-white border-t border-line text-center"
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
              Explore our ready-to-ship 3D printed catalog or contact our studio for custom fabrication projects.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/shop"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                <span>Shop Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}


