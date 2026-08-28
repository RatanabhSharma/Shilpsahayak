import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  MessageSquare,
  ShieldCheck,
  Cpu,
  Sparkles,
  ArrowRight,
  UploadCloud,
  Building2,
  Star,
  CheckCircle2,
  Box,
  Flame,
  Zap,
} from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import { useHomepage } from '../../hooks/useHomepage';
import { useSettings } from '../../hooks/useSettings';
import { useReviews, useAddReview } from '../../hooks/useReviews';
import { Card, Button, buttonVariants } from '../../components/ui';
import { ProductCard } from '../../components/product/ProductCard';
import { FeaturedProductSkeleton } from '../../components/loading/ProductSkeleton';
import { Hero3DCanvas } from '../../components/3d/Hero3DCanvas';
import demoVideo from '../../assets/videos/demo_video.mp4';

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
  { icon: Cpu, text: '±50µm Precision Calibration' },
  { icon: Sparkles, text: '100% Eco-Plant PLA+ & Bio-Resin' },
  { icon: Zap, text: 'Instant CAD Slicing & Price Estimator' },
  { icon: ShieldCheck, text: '100% Encrypted & Confidential CAD Vault' },
  { icon: Box, text: 'Pan-India Express Tracked Dispatch' },
  { icon: Flame, text: 'Hand-Inspected & Deburred in Patiala' },
];

/* ============================================================
   VERIFIED STUDIO CRAFTSMANSHIP SPECS
   ============================================================ */
const STUDIO_ADVANTAGES = [
  {
    icon: Cpu,
    title: 'High-Precision 3D Fabrication',
    tag: '±50µm Tolerance',
    description: 'Clean layer resolution and dimensional accuracy across every custom piece.',
  },
  {
    icon: Layers,
    title: 'Versatile Engineering Materials',
    tag: 'PLA · PETG · ABS · Resin',
    description: 'Industrial-grade polymers tuned for aesthetic brilliance or structural strength.',
  },
  {
    icon: ShieldCheck,
    title: 'Hand-Inspected Quality',
    tag: '100% Quality Checked',
    description: 'Individual surface inspection, hand deburring, and protective packaging.',
  },
  {
    icon: UploadCloud,
    title: 'Instant CAD Slicing',
    tag: 'Real-Time Pricing',
    description: 'Upload your STL/OBJ file for immediate volume computation and custom fabrication.',
  },
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
    density: '1.15 g/cm³',
    finish: '50µm Injection-Like Finish',
    bestFor: 'Intricate Miniatures & Jewelry',
    badgeClass: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  },
];

/* ============================================================
   INFILL DENSITY SIMULATOR PRESETS
   ============================================================ */
const INFILL_PRESETS = [
  { density: 15, label: '15% Lightweight', pattern: 'Honeycomb', weight: '38g', time: '1h 45m', best: 'Display pieces & decorative figurines' },
  { density: 40, label: '40% Structural', pattern: 'Gyroid', weight: '65g', time: '2h 50m', best: 'Desk accessories, lamps & brackets' },
  { density: 80, label: '80% Heavy Duty', pattern: 'Grid Lattice', weight: '105g', time: '4h 15m', best: 'Robotic mounts & impact tools' },
  { density: 100, label: '100% Solidified', pattern: 'Concentric Solid', weight: '135g', time: '5h 30m', best: 'Threaded fixtures & industrial fittings' },
];

/* ============================================================
   STREAMLINED FAQs
   ============================================================ */
const FAQ_ITEMS = [
  {
    q: 'What 3D file formats do you accept?',
    a: 'We accept standard 3D CAD files (.STL, .OBJ, .3MF). Our instant slicer computes material weight and price the moment you upload.',
  },
  {
    q: 'How is the custom 3D print quote calculated?',
    a: 'Pricing is computed in real time from model volume, chosen infill factor, material density, and base setup fee.',
  },
  {
    q: 'Which material should I choose?',
    a: 'PLA+ is ideal for decor and lighting, PETG for functional mechanical strength, and UV Resin for ultra-fine miniatures.',
  },
  {
    q: 'Do you deliver across India?',
    a: 'Yes. We provide tracked courier delivery to all pin codes across India, with free shipping for qualifying orders.',
  },
  {
    q: 'Are custom CAD files kept confidential?',
    a: '100% confidential. Your designs are processed securely on encrypted servers and are never shared or reproduced.',
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
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isNormalizingRef = useRef(false);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSingleSetWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return 0;
    return el.scrollWidth / 6;
  }, [itemCount]);

  // Position container in the middle set (Set 2 of 6) on mount & resize
  const initializePosition = useCallback(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return;
    const singleSetWidth = getSingleSetWidth();
    if (singleSetWidth > 50) {
      el.scrollLeft = singleSetWidth * 2;
    }
  }, [itemCount, getSingleSetWidth]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || itemCount === 0) return;

    initializePosition();
    const t = setTimeout(initializePosition, 120);
    const t2 = setTimeout(initializePosition, 400);

    window.addEventListener('resize', initializePosition);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener('resize', initializePosition);
    };
  }, [itemCount, initializePosition]);

  // Seamless infinite wrap without resetting to start
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || isNormalizingRef.current || itemCount === 0) return;

    const singleSetWidth = getSingleSetWidth();
    if (singleSetWidth <= 50) return;

    // Past Set 3 into Set 4 -> shift back by 2 sets
    if (el.scrollLeft >= singleSetWidth * 3.8) {
      isNormalizingRef.current = true;
      el.scrollLeft -= singleSetWidth * 2;
      setTimeout(() => {
        isNormalizingRef.current = false;
      }, 50);
    }
    // Before Set 2 into Set 1 -> shift forward by 2 sets
    else if (el.scrollLeft <= singleSetWidth * 1.2 && el.scrollLeft > 0) {
      isNormalizingRef.current = true;
      el.scrollLeft += singleSetWidth * 2;
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
    if (!enableAutoplay || itemCount <= 1 || isHovered || isInteracting) {
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
      step(1);
    }, autoplayInterval);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [enableAutoplay, itemCount, isHovered, isInteracting, autoplayInterval, step]);

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
  const addReviewMutation = useAddReview();
  const prefersReducedMotion = useReducedMotion();

  const [selectedMaterial, setSelectedMaterial] = useState('pla');
  const [selectedInfill, setSelectedInfill] = useState(40);

  const whatsappNumber = settings?.whatsappNumber || '';
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
    : '#';

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  /* Scroll-Linked Hero Parallax & Depth Transitions */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroParallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '32%']);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1.0, 1.15]);
  const heroScrimOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [0.55, 0.8, 0.98]);

  /* Hero Media & Content (Video / GIF with Poster fallback) */
  const heroMediaUrl = useMemo(() => {
    const custom = homepageSettings?.heroVideoUrl?.trim();
    if (custom && !custom.includes('mixkit.co') && custom !== '/hero-print.webm') {
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

  /* Cloned 6-Set Extended Arrays for True Infinite Seamless Looping */
  const extendedFeaturedProducts = useMemo(() => {
    if (featuredProducts.length === 0) return [];
    return Array.from({ length: 6 }, (_, setIdx) =>
      featuredProducts.map((p, idx) => ({
        ...p,
        _carouselKey: `feat-${p.id || idx}-set-${setIdx}`,
      }))
    ).flat();
  }, [featuredProducts]);

  const extendedCategories = useMemo(() => {
    if (categories.length === 0) return [];
    return Array.from({ length: 6 }, (_, setIdx) =>
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

  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  /* Live Review Form state connected to Firestore */
  const [reviewForm, setReviewForm] = useState({ name: '', experience: '🤩', text: '' });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name.trim() || !reviewForm.text.trim()) return;

    addReviewMutation.mutate({
      name: reviewForm.name.trim(),
      rating: 5,
      experience: reviewForm.experience,
      quote: reviewForm.text.trim(),
    });
    setReviewSubmitted(true);
  };

  const activeMaterialData = useMemo(
    () => MATERIALS_PREVIEW.find((m) => m.id === selectedMaterial) || MATERIALS_PREVIEW[0],
    [selectedMaterial]
  );

  const activeInfillData = useMemo(
    () => INFILL_PRESETS.find((inf) => inf.density === selectedInfill) || INFILL_PRESETS[1],
    [selectedInfill]
  );

  return (
    <div className="bg-[#FAF9F6] text-ink selection:bg-accent-soft selection:text-accent w-full min-h-screen">
      {/* =====================================================
          1. CINEMATIC FULL-BLEED VIDEO HERO WITH PARALLAX SCROLL
      ====================================================== */}
      <section
        ref={heroRef}
        style={{ touchAction: 'pan-y' }}
        className="relative overflow-hidden bg-[#0d0d0f] h-[480px] sm:h-[580px] lg:h-[680px] w-full touch-pan-y"
      >
        {/* Parallax Background Stage (Video / GIF / High-Res Poster) */}
        <motion.div
          style={{
            y: prefersReducedMotion ? '0%' : heroParallaxY,
            scale: prefersReducedMotion ? 1 : heroScale,
          }}
          className="absolute inset-0 z-0 h-[126%] -top-[13%] w-full overflow-hidden pointer-events-none"
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
        <motion.div
          style={{ opacity: heroScrimOpacity }}
          className="absolute inset-0 z-[1] bg-gradient-to-t from-[#0d0d0f] via-transparent to-transparent pointer-events-none"
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
          3. FEATURED PRODUCTS (SIDE-POSITIONED FLOATING ARROWS & INFINITE LOOP)
      ====================================================== */}
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="bg-[#FAF9F6] py-14"
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

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 font-display text-xs sm:text-sm font-bold text-accent hover:underline"
            >
              <span>View Complete Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Product Cards Infinite Carousel with Centered Side Arrows */}
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10 pb-4">
          {/* Side Floating Left Arrow */}
          <button
            type="button"
            onClick={featuredCarousel.stepPrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:text-white hover:border-accent active:scale-95 cursor-pointer focus:outline-none"
            aria-label="Previous featured products"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Side Floating Right Arrow */}
          <button
            type="button"
            onClick={featuredCarousel.stepNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:text-white hover:border-accent active:scale-95 cursor-pointer focus:outline-none"
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
              className="-mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
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
          4. SHOP BY COLLECTION (SIDE-POSITIONED FLOATING ARROWS & INFINITE LOOP)
      ====================================================== */}
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="bg-[#FAF9F6] py-12 sm:py-14 border-t border-line"
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

            {/* View All Categories Link */}
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
              <Link to="/catalog" className="font-display text-xs sm:text-sm font-bold text-accent hover:underline">
                View All Categories →
              </Link>
            </div>
          </div>

          {/* Category Cards Infinite Carousel with Centered Side Arrows */}
          <div className="relative">
            {/* Side Floating Left Arrow */}
            <button
              type="button"
              onClick={categoryCarousel.stepPrev}
              className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:text-white hover:border-accent active:scale-95 cursor-pointer focus:outline-none"
              aria-label="Previous categories"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Side Floating Right Arrow */}
            <button
              type="button"
              onClick={categoryCarousel.stepNext}
              className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-line bg-white text-ink shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-accent hover:text-white hover:border-accent active:scale-95 cursor-pointer focus:outline-none"
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
              className="-mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            >
              {extendedCategories.map((cat) => (
                <div
                  key={cat._carouselKey}
                  className="w-[230px] sm:w-[280px] lg:w-[320px] shrink-0"
                >
                  <Link
                    to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                    className="group/cat relative block w-full overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-1.5 hover:border-accent/40"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-shell shine-sweep-container">
                      <img
                        src={cat.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'}
                        alt={cat.name}
                        className="h-full w-full object-cover transition-all duration-700 group-hover/cat:scale-108"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121212]/85 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent bg-black/60 px-2 py-0.5 rounded">
                          {cat.productCount} {cat.productCount === 1 ? 'Piece' : 'Pieces'}
                        </span>
                        <h3 className="mt-1 font-display text-lg font-bold text-white group-hover/cat:text-accent transition-colors">
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
          5. CUSTOM 3D PRINTING + THREE.JS INTERACTIVE 3D CAD ENGINE
      ====================================================== */}
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="bg-[#FAF9F6] py-14"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-[#0e0e11] grid-plate p-6 sm:p-10 lg:p-14 text-white shadow-2xl">
            <div className="relative z-10 grid gap-10 lg:grid-cols-2 lg:items-center">
              {/* Left Column: Interactive Three.js 3D Viewport */}
              <div className="space-y-4">
                <Hero3DCanvas className="h-[360px] sm:h-[420px] w-full" />
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> WebGL Hardware Accelerated
                  </span>
                  <span>Drag model to inspect surfaces</span>
                </div>
              </div>

              {/* Right Column: Instant Slicer Pitch & Material Matrix */}
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 border border-accent/30 px-3.5 py-1 font-mono text-xs font-bold text-accent-light">
                  <Sparkles className="w-3.5 h-3.5" />
                  Instant STL Slicer & Estimator
                </span>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                  {homepageSettings?.customPromoTitle || 'Have a 3D CAD model? Get an instant quote.'}
                </h2>
                <p className="font-sans text-xs sm:text-sm text-zinc-300 max-w-lg leading-relaxed">
                  Upload your STL/OBJ file for real-time model slicing, weight computation, and live pricing across industrial-grade materials.
                </p>

                {/* 3-Step Visual CAD Pipeline */}
                <div className="grid grid-cols-3 gap-2.5 pt-1 font-mono text-[11px]">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-center space-y-1 group/step hover:border-accent/40 transition-colors">
                    <span className="text-accent font-bold block text-xs group-hover/step:scale-105 transition-transform">01. Upload</span>
                    <span className="text-zinc-400 text-[10px]">STL / OBJ / 3MF</span>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-center space-y-1 group/step hover:border-accent/40 transition-colors">
                    <span className="text-accent font-bold block text-xs group-hover/step:scale-105 transition-transform">02. Configure</span>
                    <span className="text-zinc-400 text-[10px]">Material & Infill</span>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-center space-y-1 group/step hover:border-accent/40 transition-colors">
                    <span className="text-accent font-bold block text-xs group-hover/step:scale-105 transition-transform">03. Fabricate</span>
                    <span className="text-zinc-400 text-[10px]">Fast Dispatch</span>
                  </div>
                </div>

                {/* Interactive Material Selector Tabs */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Material Matrix
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">Tap to switch</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {MATERIALS_PREVIEW.map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setSelectedMaterial(mat.id)}
                        className={`py-1.5 px-1 rounded-xl font-mono text-xs font-bold transition-all ${
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
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-2 gap-2 text-[11px] font-mono"
                    >
                      <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                        <span className="text-zinc-500 block text-[9px]">DENSITY</span>
                        <span className="text-white font-bold">{activeMaterialData.density}</span>
                      </div>
                      <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                        <span className="text-zinc-500 block text-[9px]">TEXTURE</span>
                        <span className="text-white font-bold truncate block">{activeMaterialData.finish}</span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Link
                    to={homepageSettings?.customPromoButtonLink || '/custom-service'}
                    className={buttonVariants({ variant: 'primary', size: 'md' })}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{homepageSettings?.customPromoButtonText || 'Launch 3D Slicer'}</span>
                  </Link>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: 'whatsapp', size: 'md' })}
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

      {/* =====================================================
          6. INTERACTIVE INFILL & INTERNAL STRUCTURE SLICER DEMO
      ====================================================== */}
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="bg-[#FAF9F6] py-14 border-t border-line"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="rounded-3xl border border-line bg-white p-8 sm:p-12 shadow-soft grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                Internal Geometry Calibration
              </span>
              <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-ink">
                Tune your Infill Density & Strength
              </h2>
              <p className="font-sans text-xs sm:text-sm text-muted leading-relaxed max-w-lg">
                Choose the exact balance of weight, structural rigidity, and print speed. Our slicer calculates volume dynamically.
              </p>

              {/* Infill Density Slider Selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {INFILL_PRESETS.map((preset) => (
                  <button
                    key={preset.density}
                    type="button"
                    onClick={() => setSelectedInfill(preset.density)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedInfill === preset.density
                        ? 'border-accent bg-accent-soft/30 shadow-xs'
                        : 'border-line bg-shell/50 hover:border-ink/20'
                    }`}
                  >
                    <span className={`font-mono text-xs font-bold block ${selectedInfill === preset.density ? 'text-accent' : 'text-ink'}`}>
                      {preset.density}% Infill
                    </span>
                    <span className="font-sans text-[10px] text-muted block mt-0.5">{preset.pattern}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <Link to="/custom-service" className={buttonVariants({ variant: 'secondary', size: 'md' })}>
                  <span>Test on your 3D CAD file →</span>
                </Link>
              </div>
            </div>

            {/* Infill Dynamic Stats Card with Animated Progress */}
            <div className="rounded-2xl border border-line bg-shell/80 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">CALCULATED CONFIG</span>
                  <h3 className="font-display text-xl font-bold text-ink">{activeInfillData.label}</h3>
                </div>
                <span className="font-mono text-sm font-bold text-accent px-3 py-1 bg-white rounded-full border border-line shadow-2xs">
                  {activeInfillData.pattern}
                </span>
              </div>

              {/* Animated Infill Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-[11px] text-muted">
                  <span>Internal Lattice Density</span>
                  <span className="font-bold text-ink">{selectedInfill}%</span>
                </div>
                <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-line p-0.5">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedInfill}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-line shadow-2xs">
                  <span className="text-muted block text-[10px]">ESTIMATED WEIGHT</span>
                  <strong className="text-ink text-sm">{activeInfillData.weight}</strong>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-line shadow-2xs">
                  <span className="text-muted block text-[10px]">ESTIMATED PRINT TIME</span>
                  <strong className="text-ink text-sm">{activeInfillData.time}</strong>
                </div>
              </div>

              <div className="p-3 bg-white/70 rounded-xl border border-line text-xs font-sans text-muted">
                <strong className="text-ink font-semibold">Recommended for: </strong>
                {activeInfillData.best}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================
          7. B2B & CORPORATE SOLUTIONS (VISUAL 4-TIER GRID)
      ====================================================== */}
      <motion.section
        id="corporate"
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="bg-[#FAF9F6] py-14 border-t border-line"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="rounded-3xl border border-line bg-white p-8 sm:p-12 shadow-soft grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-shell border border-line px-3.5 py-1 font-mono text-xs font-bold text-muted">
                <Building2 className="w-3.5 h-3.5 text-accent" />
                B2B & Bulk Fabrication
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
                Corporate Merchandise & Custom Solutions
              </h2>
              <p className="font-sans text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
                Bespoke welcome kits, branded desk accessories, commemorative trophies, and small-batch production runs for modern Indian brands.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/contact?type=corporate"
                  className={buttonVariants({ variant: 'primary', size: 'md' })}
                >
                  <span>Request Corporate Quote</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: 'secondary', size: 'md' })}
                >
                  <span>Discuss on WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="rounded-2xl border border-line bg-shell/70 p-4 space-y-1 hover:border-accent/40 hover:bg-white hover:-translate-y-1 transition-all">
                <span className="font-mono text-xs font-bold text-accent">01. Welcome Kits</span>
                <p className="font-sans text-xs text-muted">Branded desk items & employee onboarding sets</p>
              </div>
              <div className="rounded-2xl border border-line bg-shell/70 p-4 space-y-1 hover:border-accent/40 hover:bg-white hover:-translate-y-1 transition-all">
                <span className="font-mono text-xs font-bold text-accent">02. Trophies & Awards</span>
                <p className="font-sans text-xs text-muted">Bespoke geometric 3D commemorative awards</p>
              </div>
              <div className="rounded-2xl border border-line bg-shell/70 p-4 space-y-1 hover:border-accent/40 hover:bg-white hover:-translate-y-1 transition-all">
                <span className="font-mono text-xs font-bold text-accent">03. Event Merch</span>
                <p className="font-sans text-xs text-muted">High-volume personalized keychains & badges</p>
              </div>
              <div className="rounded-2xl border border-line bg-shell/70 p-4 space-y-1 hover:border-accent/40 hover:bg-white hover:-translate-y-1 transition-all">
                <span className="font-mono text-xs font-bold text-accent">04. Rapid Prototyping</span>
                <p className="font-sans text-xs text-muted">Fast functional iterations for engineering teams</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================
          8. STUDIO ADVANTAGES (CRAFTSMANSHIP & CALIBRATION)
      ====================================================== */}
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="bg-[#FAF9F6] py-16 border-t border-line"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              The Studio Advantage
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl text-ink">
              Why Shilp Sahayak
            </h2>
            <p className="mt-2 font-sans text-xs sm:text-sm text-muted">
              Engineered for precision, material flexibility, and commercial reliability.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STUDIO_ADVANTAGES.map((spec) => {
              const Icon = spec.icon;
              return (
                <Card
                  key={spec.title}
                  className="p-6 h-full flex flex-col justify-between hover:-translate-y-2 hover:shadow-card hover:border-accent/40 transition-all border-line bg-white rounded-2xl group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent group-hover:scale-110 group-hover:rotate-6 transition-transform">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-muted bg-shell px-2 py-0.5 rounded border border-line">
                        {spec.tag}
                      </span>
                    </div>
                    <h3 className="font-display text-base font-bold text-ink group-hover:text-accent transition-colors">
                      {spec.title}
                    </h3>
                    <p className="font-sans text-xs leading-relaxed text-muted">
                      {spec.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* =====================================================
          9. COMMUNITY FEEDBACK & LIVE FIRESTORE REVIEWS
      ====================================================== */}
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="bg-[#FAF9F6] text-ink py-16 border-t border-line"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-start">
            {/* Left: Testimonials from Firestore */}
            <div className="space-y-8">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 border border-line font-mono text-[11px] font-bold uppercase tracking-widest text-muted">
                  • COMMUNITY VOICES
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
                  Stories from <span className="italic text-accent">Indian Homes.</span>
                </h2>
                <p className="font-sans text-xs sm:text-sm text-muted max-w-md leading-relaxed">
                  Real feedback from customers and makers across the country.
                </p>
              </div>

              {/* Dynamic Testimonials List */}
              {reviews.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {reviews.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      className="rounded-2xl bg-white p-5 border border-line shadow-2xs space-y-4 flex flex-col justify-between hover:shadow-card hover:-translate-y-1 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-amber-400">
                          {[...Array(r.rating || 5)].map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="font-sans text-xs text-ink leading-relaxed italic">
                          "{r.quote}"
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
              ) : (
                <div className="p-8 rounded-2xl bg-white border border-line text-center space-y-3">
                  <Star className="w-8 h-8 text-amber-400 mx-auto fill-amber-400" />
                  <p className="font-display font-bold text-base text-ink">Be the first to share your story!</p>
                  <p className="font-sans text-xs text-muted">Submit your feedback using the form to have your review featured here.</p>
                </div>
              )}
            </div>

            {/* Right: Live Share your thought Form */}
            <div className="rounded-2xl bg-white p-6 sm:p-8 border border-line shadow-card space-y-6">
              <div>
                <h3 className="font-display text-xl font-bold text-ink">Share your experience</h3>
                <p className="font-sans text-xs text-muted mt-1">We value honest feedback from our community.</p>
              </div>

              {reviewSubmitted ? (
                <div className="p-6 rounded-xl bg-emerald-50 text-emerald-800 text-center space-y-2">
                  <p className="font-display font-bold text-base">Thank you for your feedback! 🎉</p>
                  <p className="font-sans text-xs">Your review has been saved and will appear shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                      NAME *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name"
                      value={reviewForm.name}
                      onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                      className="w-full h-11 rounded-xl border border-line bg-[#FAF9F6] px-4 font-sans text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                        EXPERIENCE
                      </label>
                      <span className="font-mono text-[10px] font-bold text-accent">AMAZING</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#FAF9F6] p-2 rounded-xl border border-line">
                      {['😠', '🙁', '😐', '😊', '🤩'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, experience: emoji })}
                          className={`w-9 h-9 rounded-lg text-base flex items-center justify-center transition-transform ${
                            reviewForm.experience === emoji ? 'bg-white shadow-sm scale-110 border border-line' : 'hover:scale-105'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                      YOUR REVIEW *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Tell us about the print quality, finish, or design..."
                      value={reviewForm.text}
                      onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                      className="w-full rounded-xl border border-line bg-[#FAF9F6] p-3.5 font-sans text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={addReviewMutation.isPending}
                    isLoading={addReviewMutation.isPending}
                    variant="primary"
                    size="md"
                    className="w-full font-semibold uppercase tracking-wider text-xs"
                  >
                    Submit Review
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================
          10. FAQ ACCORDION (INTERACTIVE SPRING ANIMATIONS)
      ====================================================== */}
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="bg-[#FAF9F6] py-16 border-t border-line"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:items-start">
            <div className="space-y-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent block">
                Common Questions
              </span>
              <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl leading-tight">
                Everything you need to know.
              </h2>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold text-sm text-accent hover:underline transition-colors pt-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Ask Maker on WhatsApp →</span>
              </a>
            </div>

            <div className="divide-y divide-line">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = faqOpen === index;
                return (
                  <div key={index}>
                    <button
                      type="button"
                      onClick={() => setFaqOpen(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 py-5 text-left group"
                    >
                      <span className={`text-base font-bold transition-colors ${isOpen ? 'text-accent' : 'text-ink group-hover:text-accent'}`}>
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : ''}`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pb-5 font-sans text-xs sm:text-sm text-muted leading-relaxed max-w-2xl overflow-hidden"
                        >
                          {item.a}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================
          11. FINAL MEMORABLE CTA SECTION
      ====================================================== */}
      <motion.section
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
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
              Explore our ready-to-ship 3D printed catalog or upload your CAD file for custom fabrication.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/catalog"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                <span>Shop Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/custom-service"
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                <span>Start a Custom Print</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}