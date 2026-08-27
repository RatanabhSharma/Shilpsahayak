import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sliders,
  Package,
  Building2,
  Star,
} from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import { useHomepage } from '../../hooks/useHomepage';
import { useSettings } from '../../hooks/useSettings';
import { useReviews, useAddReview } from '../../hooks/useReviews';
import { Card } from '../../components/ui';
import { ProductCard } from '../../components/product/ProductCard';
import { FeaturedProductSkeleton } from '../../components/loading/ProductSkeleton';

/* ============================================================
   4 VERIFIED STUDIO ADVANTAGES (NO FABRICATED NUMBERS/CLAIMS)
   ============================================================ */
const STUDIO_ADVANTAGES = [
  {
    icon: Cpu,
    title: 'High-Detail 3D Fabrication',
    description: 'Precision FDM and SLA additive manufacturing delivering clean layer resolution and geometric accuracy.',
  },
  {
    icon: Layers,
    title: 'Versatile Material Range',
    description: 'A comprehensive selection of polymers including rigid PLA, impact-resistant PETG, engineering ABS, and ultra-fine UV resin.',
  },
  {
    icon: ShieldCheck,
    title: 'Manual Quality Inspection',
    description: 'Every printed piece undergoes individual surface tolerance checks and careful hand finishing before packaging.',
  },
  {
    icon: UploadCloud,
    title: 'Custom On-Demand Production',
    description: 'Upload your own CAD STL/OBJ files or collaborate on bespoke ideas for single prototypes and batch production.',
  },
];

/* ============================================================
   4-STEP PROCESS (HOW IT WORKS)
   ============================================================ */
const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Choose or Upload',
    description: 'Select an artisan piece from our curated catalog or upload your custom 3D model (STL, OBJ, 3MF).',
    icon: UploadCloud,
  },
  {
    step: '02',
    title: 'Customize & Configure',
    description: 'Select your preferred material, color finish, layer resolution, and infill density for your application.',
    icon: Sliders,
  },
  {
    step: '03',
    title: 'Precision Fabrication',
    description: 'Our workshop machines fabricate your object layer by layer with continuous monitoring.',
    icon: Cpu,
  },
  {
    step: '04',
    title: 'Inspection & Delivery',
    description: 'Each piece is hand-inspected, packed with protective padding, and dispatched via tracked express courier.',
    icon: Package,
  },
];

const FAQ_ITEMS = [
  {
    q: 'What file formats do you accept for custom 3D printing?',
    a: 'We accept standard 3D CAD files including STL, OBJ, and 3MF formats. If you have a reference photograph, technical drawing, or concept idea, our workshop team can assist with 3D modeling.',
  },
  {
    q: 'How is the custom print estimate calculated?',
    a: 'Pricing is based transparently on calculated model volume, material density, chosen infill factor, material rate per gram, and a base setup fee. Our instant slicer provides an estimate the moment you upload your file.',
  },
  {
    q: 'Which materials are available and when should I choose each?',
    a: 'PLA is ideal for detailed aesthetic display objects, lithophanes, and home decor. PETG provides superior impact and heat resistance for functional components. UV photopolymer resin delivers smooth injection-mold quality detail for intricate miniatures.',
  },
  {
    q: 'Do you deliver across India?',
    a: 'Yes, we ship to all serviceable pin codes across India via tracked courier partners. Orders qualifying for our configured threshold receive free shipping, and tracking details are provided upon dispatch.',
  },
  {
    q: 'Are custom CAD files kept confidential?',
    a: 'Yes. Customer designs and 3D files are treated with strict confidentiality, processed on secure servers, and are never shared or manufactured for others without explicit consent.',
  },
  {
    q: 'Do you offer bulk corporate and event solutions?',
    a: 'Yes. We cater to corporate welcome kits, custom merchandise, branded desk items, and commemorative trophies with volume pricing tiers.',
  },
];

/* Helper Organic Wave Divider Component */
function OrganicWaveDivider({ fill = '#FAF9F6', flip = false }: { fill?: string; flip?: boolean }) {
  return (
    <div className={`w-full overflow-hidden leading-none select-none -mb-1 ${flip ? 'rotate-180' : ''}`}>
      <svg
        className="relative block w-full h-[40px] sm:h-[70px] lg:h-[90px]"
        viewBox="0 0 1440 180"
        preserveAspectRatio="none"
      >
        <path
          d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,85.3C672,75,768,85,864,106.7C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,180L1392,180C1344,180,1248,180,1152,180C1056,180,960,180,864,180C768,180,672,180,576,180C480,180,384,180,288,180C192,180,96,180,48,180L0,180Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

export function Home() {
  const { data: products = [], isLoading } = useProducts();
  const { data: homepageSettings } = useHomepage();
  const { data: settings } = useSettings();
  const { data: reviews = [] } = useReviews();
  const addReviewMutation = useAddReview();

  const whatsappNumber = settings?.whatsappNumber || '';
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
    : '#';

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  /* Dynamic Hero Slides from Firestore Settings (Max 3 slides) */
  const heroSlides = useMemo(() => {
    const configuredSlides = (homepageSettings?.heroSlides || []).filter((s) => s.enabled).slice(0, 3);
    if (configuredSlides.length > 0) {
      return configuredSlides;
    }
    return activeProducts.slice(0, 3).map((product, idx) => ({
      id: product.id || `slide-${idx}`,
      eyebrow: 'CUSTOM 3D FABRICATION & STUDIO GOODS',
      title: product.name,
      description: product.description,
      image: product.image,
      buttonText: 'EXPLORE CATALOG',
      buttonLink: `/product/${product.id}`,
    }));
  }, [homepageSettings?.heroSlides, activeProducts]);

  /* Hero Slideshow State & Accessible Timer */
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!homepageSettings?.heroAutoplay || heroSlides.length <= 1 || isPaused) return;
    const intervalTime = Math.max(5000, Math.min(homepageSettings?.heroInterval || 6000, 8000));
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, intervalTime);
    return () => clearInterval(interval);
  }, [heroSlides.length, homepageSettings?.heroAutoplay, homepageSettings?.heroInterval, isPaused]);

  const currentSlide = heroSlides[currentSlideIndex] || heroSlides[0] || {
    eyebrow: 'CUSTOM 3D FABRICATION & STUDIO GOODS',
    title: 'Turn Ideas Into Something Real.',
    description: 'Precision custom 3D printing, bespoke interior accents, and made-to-order physical goods designed and fabricated in India.',
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=2000&q=80',
    buttonText: 'EXPLORE CATALOG',
    buttonLink: '/catalog',
  };

  const bestSellers = useMemo(() => {
    const configuredIds = homepageSettings?.featuredProductIds ?? [];
    if (configuredIds.length === 0) {
      return activeProducts.filter((product) => product.featured).slice(0, 8);
    }
    const matched = configuredIds
      .map((id) => activeProducts.find((product) => product.id === id))
      .filter(Boolean) as typeof activeProducts;
    return matched.length > 0 ? matched : activeProducts.slice(0, 8);
  }, [activeProducts, homepageSettings?.featuredProductIds]);

  const categories = useMemo(() => {
    const categoryMap = new Map<string, { image: string; count: number }>();
    for (const product of activeProducts) {
      if (product.category) {
        const existing = categoryMap.get(product.category);
        if (!existing) {
          categoryMap.set(product.category, { image: product.image, count: 1 });
        } else {
          existing.count += 1;
        }
      }
    }
    const configuredNames = homepageSettings?.categoryNames ?? [];
    if (configuredNames.length > 0) {
      const result = configuredNames
        .map((name) => {
          const data = categoryMap.get(name);
          return data ? { name, image: data.image, productCount: data.count } : null;
        })
        .filter(Boolean) as { name: string; image: string; productCount: number }[];
      if (result.length > 0) return result;
    }
    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      image: data.image,
      productCount: data.count,
    }));
  }, [activeProducts, homepageSettings?.categoryNames]);

  /* Category Carousel Navigation & Scroll State */
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scrollCategories = (direction: -1 | 1) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  };

  useEffect(() => {
    checkScrollButtons();
  }, [categories]);

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

  /* Touch Swipe Handling for Hero Slides */
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || heroSlides.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
      } else {
        setCurrentSlideIndex((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));
      }
    }
    setTouchStartX(null);
  };

  /* Animation variants */
  const staggerContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
  };

  return (
    <div className="bg-[#FAF9F6] text-ink selection:bg-accent-soft selection:text-accent overflow-x-hidden">
      {/* =====================================================
          1. HERO SECTION (STATIC-FIRST WITH CONTROLLED SLIDESHOW)
      ====================================================== */}
      <section
        className="relative overflow-hidden bg-[#121212] min-h-[540px] sm:min-h-[640px] lg:min-h-[700px] flex flex-col justify-between text-white touch-pan-y select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dynamic Background Image with Smooth Crossfade */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id || currentSlideIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute inset-0 z-0"
          >
            <img
              src={currentSlide.image}
              alt={currentSlide.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121212]/95 via-[#121212]/60 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#121212]/80 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Hero Copy Content */}
        <div className="relative z-10 mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16 pt-20 sm:pt-32 pb-12 w-full flex-1 flex flex-col justify-center">
          <div className="max-w-2xl space-y-4 sm:space-y-5">
            {/* Verified Trust Badges Strip */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 font-mono text-[10px] sm:text-[11px] font-semibold text-zinc-200 border border-white/15">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Modern 3D Fabrication Studio
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 backdrop-blur-md px-3 py-1 font-mono text-[10px] sm:text-[11px] font-semibold text-accent-light border border-accent/30">
                Pan-India Delivery
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id || currentSlideIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-3 sm:space-y-4"
              >
                {currentSlide.eyebrow && (
                  <span className="font-mono text-[11px] sm:text-xs font-semibold tracking-wider text-accent uppercase block">
                    {currentSlide.eyebrow}
                  </span>
                )}
                <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
                  {currentSlide.title || 'Turn Ideas Into Something Real.'}
                </h1>
                <p className="font-sans text-xs sm:text-base text-zinc-300 max-w-lg leading-relaxed">
                  {currentSlide.description ||
                    'Precision custom 3D printing, bespoke interior lighting, and made-to-order physical goods crafted in our dedicated Indian makerspace.'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Dual CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2 w-full sm:w-auto">
              <Link
                to={currentSlide.buttonLink || '/catalog'}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 sm:px-7 py-3 sm:py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-dark hover:scale-[1.02] text-center"
              >
                <span>{currentSlide.buttonText || 'Explore Products'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/custom-service"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-6 sm:px-7 py-3 sm:py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black text-center"
              >
                <span>Get Custom Print</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Slideshow Controls (If Multiple Slides Configured) */}
        {heroSlides.length > 1 && (
          <div className="relative z-20 mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-16 w-full flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    currentSlideIndex === idx ? 'w-8 bg-accent' : 'w-2 bg-white/40 hover:bg-white'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCurrentSlideIndex((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))
                }
                className="w-9 h-9 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-accent transition-colors"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length)}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-accent transition-colors"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Seamless Organic Wave Divider to Base Paper (#FAF9F6) */}
        <OrganicWaveDivider fill="#FAF9F6" />
      </section>

      {/* =====================================================
          2. 4-STEP "HOW IT WORKS" PROCESS SECTION
      ====================================================== */}
      <section className="bg-[#FAF9F6] py-14 border-b border-line">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              Streamlined Production
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl text-ink">
              How Shilp Sahayak Works
            </h2>
            <p className="mt-2 font-sans text-xs sm:text-sm text-muted">
              From digital CAD concept to precision physical object delivered to your doorstep.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS_STEPS.map((stepItem) => {
              const Icon = stepItem.icon;
              return (
                <div
                  key={stepItem.step}
                  className="relative rounded-2xl bg-white p-6 border border-line shadow-soft flex flex-col justify-between hover:shadow-card hover:-translate-y-1 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-mono text-xl font-extrabold text-line">
                        {stepItem.step}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-ink">
                      {stepItem.title}
                    </h3>
                    <p className="font-sans text-xs text-muted leading-relaxed">
                      {stepItem.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          3. FEATURED PRODUCTS & BEST SELLERS CATALOG
      ====================================================== */}
      <section className="bg-[#FAF9F6] py-14">
        {/* Dynamic Announcement Ticker Strip */}
        {homepageSettings?.announcementMessages && homepageSettings.announcementMessages.length > 0 && (
          <div className="border-y border-line bg-white py-3 overflow-hidden select-none mb-12">
            <div className="animate-marquee space-x-8 font-mono text-xs font-bold tracking-wider uppercase text-ink">
              {homepageSettings.announcementMessages.map((msg, idx) => (
                <span key={idx} className="inline-flex items-center gap-4">
                  <span>{msg}</span>
                  <span className="text-accent">•</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              Flagship Collection
            </span>
            <h2 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl text-ink">
              {homepageSettings?.featuredTitle || 'Featured 3D Creations'}
            </h2>
            <p className="mt-1 font-sans text-xs sm:text-sm text-muted">
              {homepageSettings?.featuredSubtitle || 'Handcrafted 3D printed lighting, desk accessories, and customized keepsakes.'}
            </p>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-accent hover:underline"
          >
            <span>View Complete Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10 pb-6">
          {isLoading ? (
            <FeaturedProductSkeleton />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="grid gap-3.5 sm:gap-6 grid-cols-2 lg:grid-cols-4"
            >
              {bestSellers.map((product) => (
                <motion.div key={product.id} variants={fadeInUp}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* =====================================================
          4. SHOP BY COLLECTION (CAROUSEL WITH ROTATION EFFECT & BUTTONS)
      ====================================================== */}
      <section className="bg-[#FAF9F6] py-12 sm:py-14 border-t border-line">
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

            {/* Navigation Buttons & View All */}
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
              <Link to="/catalog" className="font-display text-xs sm:text-sm font-bold text-accent hover:underline">
                View All Categories →
              </Link>

              {categories.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollCategories(-1)}
                    disabled={!canScrollLeft}
                    className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft transition-all hover:bg-accent hover:text-white hover:border-accent disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-ink disabled:hover:border-line cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Previous categories"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCategories(1)}
                    disabled={!canScrollRight}
                    className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft transition-all hover:bg-accent hover:text-white hover:border-accent disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-ink disabled:hover:border-line cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Next categories"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            ref={categoryScrollRef}
            onScroll={checkScrollButtons}
            className="-mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth"
          >
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                className="group relative block w-[230px] sm:w-[280px] lg:w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-1.5 hover:rotate-[0.8deg] hover:border-accent/40"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-shell">
                  <img
                    src={cat.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:-rotate-1"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121212]/85 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent bg-black/60 px-2 py-0.5 rounded">
                      {cat.productCount} {cat.productCount === 1 ? 'Item' : 'Items'}
                    </span>
                    <h3 className="mt-1 font-display text-lg font-bold text-white group-hover:text-accent transition-colors">
                      {cat.name}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 sm:hidden text-center">
            <Link to="/catalog" className="font-display text-xs font-bold text-accent hover:underline">
              View All Categories →
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          5. CUSTOM 3D PRINTING SPOTLIGHT (CORE CAPABILITY)
      ====================================================== */}
      <section className="bg-[#FAF9F6] py-14">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-[#121212] p-8 sm:p-12 lg:p-16 text-white shadow-xl">
            <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 border border-accent/30 px-3.5 py-1 font-mono text-xs font-bold text-accent-light">
                  <Sparkles className="w-3.5 h-3.5" />
                  Instant STL Slicer & Estimator
                </span>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                  {homepageSettings?.customPromoTitle || 'Have a 3D Model? Upload your STL & get an instant quote.'}
                </h2>
                <p className="font-sans text-xs sm:text-sm text-zinc-300 max-w-lg leading-relaxed">
                  {homepageSettings?.customPromoSubtitle || 'Our interactive custom printing pipeline computes volume, estimates material weight, and generates transparent pricing in real time for PLA, PETG, ABS, and Resin.'}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    to={homepageSettings?.customPromoButtonLink || '/custom-service'}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-accent/25 hover:bg-accent-dark transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{homepageSettings?.customPromoButtonText || 'Upload 3D File'}</span>
                  </Link>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-6 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-zinc-200 hover:border-accent hover:text-white transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Consult on WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Supported Formats</span>
                  <span className="text-white font-bold">.STL / .OBJ / .3MF</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Available Materials</span>
                  <span className="text-white font-bold">PLA, PETG, ABS, Resin</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Quality Calibration</span>
                  <span className="text-white font-bold">0.12mm to 0.28mm</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400">Data Privacy</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> 100% Confidential
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          6. CORPORATE & BULK MANUFACTURING SOLUTIONS
      ====================================================== */}
      <section id="corporate" className="bg-[#FAF9F6] py-14 border-t border-line">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="rounded-3xl border border-line bg-white p-8 sm:p-12 shadow-soft grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-shell border border-line px-3.5 py-1 font-mono text-xs font-bold text-muted">
                <Building2 className="w-3.5 h-3.5 text-accent" />
                B2B & Bulk Production
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
                Corporate Merchandise & Custom Solutions
              </h2>
              <p className="font-sans text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
                We manufacture bespoke welcome kits, personalized branded desk accessories, commemorative trophies, and small-batch production runs for Indian startups, institutions, and creative agencies.
              </p>
              <div className="pt-2 flex flex-wrap gap-4">
                <Link
                  to="/contact?type=corporate"
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white hover:bg-accent transition-colors shadow-md"
                >
                  <span>Request Corporate Quote</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-shell px-6 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-ink hover:border-accent hover:text-accent transition-colors"
                >
                  <span>Discuss Project on WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-line bg-shell p-4 space-y-1">
                <span className="font-mono text-xs font-bold text-accent">01. Welcome Kits</span>
                <p className="font-sans text-xs text-muted">Custom branded desktop items & employee gifts</p>
              </div>
              <div className="rounded-2xl border border-line bg-shell p-4 space-y-1">
                <span className="font-mono text-xs font-bold text-accent">02. Trophies & Awards</span>
                <p className="font-sans text-xs text-muted">Bespoke geometric & 3D fabricated awards</p>
              </div>
              <div className="rounded-2xl border border-line bg-shell p-4 space-y-1">
                <span className="font-mono text-xs font-bold text-accent">03. Event Merch</span>
                <p className="font-sans text-xs text-muted">High-volume personalized keychains & badges</p>
              </div>
              <div className="rounded-2xl border border-line bg-shell p-4 space-y-1">
                <span className="font-mono text-xs font-bold text-accent">04. Prototyping</span>
                <p className="font-sans text-xs text-muted">Rapid functional iterations for engineering teams</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          7. 4 VERIFIED STUDIO ADVANTAGES
      ====================================================== */}
      <section className="bg-[#FAF9F6] py-16 border-t border-line">
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
                  className="p-6 h-full flex flex-col justify-between hover:-translate-y-1 hover:shadow-card transition-all border-line bg-white rounded-2xl"
                >
                  <div className="space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-base font-bold text-ink">
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
      </section>

      {/* =====================================================
          8. LIVE FIRESTORE REVIEWS & COMMUNITY FEEDBACK
      ====================================================== */}
      <section className="bg-[#FAF9F6] text-ink py-16 border-t border-line">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-start">
            {/* Left: Testimonials from Firestore */}
            <div className="space-y-8">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 border border-line font-mono text-[11px] font-bold uppercase tracking-widest text-muted">
                  • COMMUNITY VOICES
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
                  Stories from <span className="font-serif italic text-accent">Indian Homes.</span>
                </h2>
                <p className="font-sans text-xs sm:text-sm text-muted max-w-md leading-relaxed">
                  Discover how our 3D printed pieces are transforming spaces across the country.
                </p>
              </div>

              {/* Dynamic Testimonials List */}
              {reviews.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {reviews.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      className="rounded-2xl bg-white p-5 border border-line shadow-2xs space-y-4 flex flex-col justify-between"
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
                <h3 className="font-serif text-2xl font-bold text-ink">Share your thought</h3>
                <p className="font-sans text-xs text-muted mt-1">We truly value your feedback.</p>
              </div>

              {reviewSubmitted ? (
                <div className="p-6 rounded-xl bg-emerald-50 text-emerald-800 text-center space-y-2">
                  <p className="font-display font-bold text-base">Thank you for your feedback! 🎉</p>
                  <p className="font-sans text-xs">Your review has been saved to our database.</p>
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
                      placeholder="Full Name"
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
                      placeholder="Describe your experience with our 3D printed products..."
                      value={reviewForm.text}
                      onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                      className="w-full rounded-xl border border-line bg-[#FAF9F6] p-3.5 font-sans text-xs text-ink outline-none focus:border-accent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addReviewMutation.isPending}
                    className="w-full py-3.5 rounded-xl bg-ink hover:bg-accent text-white font-mono text-xs font-bold tracking-widest uppercase transition-colors shadow-md disabled:opacity-50"
                  >
                    {addReviewMutation.isPending ? 'POSTING...' : 'POST REVIEW'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          9. FAQ ACCORDION
      ====================================================== */}
      <section className="bg-[#FAF9F6] py-16 border-t border-line">
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
                className="inline-flex items-center gap-2 font-display font-bold text-sm text-accent hover:underline transition-colors pt-2"
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
                      <span className={`font-display text-base font-bold transition-colors ${isOpen ? 'text-accent' : 'text-ink group-hover:text-accent'}`}>
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <p className="pb-5 font-sans text-sm text-muted leading-relaxed max-w-2xl">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          10. FINAL MEMORABLE CTA SECTION
      ====================================================== */}
      <section className="py-20 bg-white border-t border-line text-center">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl mx-auto space-y-6">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              Let's Create Together
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
              Have an idea?<br />Let's make it real.
            </h2>
            <p className="font-sans text-sm text-muted max-w-md mx-auto leading-relaxed">
              Explore our ready-to-ship 3D printed catalog or upload your CAD file for custom fabrication.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-accent/25 hover:bg-accent-dark transition-all"
              >
                <span>Shop Products</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/custom-service"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 transition-all"
              >
                <span>Start a Custom Print</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}