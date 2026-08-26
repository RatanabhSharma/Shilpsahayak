import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Layers,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import { useHomepage } from '../../hooks/useHomepage';
import { useSettings } from '../../hooks/useSettings';
import { Button, Card, Badge } from '../../components/ui';
import {
  CategoryGridSkeleton,
  FeaturedProductSkeleton,
} from '../../components/loading/ProductSkeleton';

export function Home() {
  const { data: products = [], isLoading } = useProducts();
  const { data: homepageSettings } = useHomepage();
  const { data: settings } = useSettings();

  const whatsappNumber = settings?.whatsappNumber || '919876543210';
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;

  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  const featuredProducts = useMemo(() => {
    const configuredIds = homepageSettings?.featuredProductIds ?? [];

    if (configuredIds.length === 0) {
      return activeProducts.filter((product) => product.featured).slice(0, 4);
    }

    return configuredIds
      .map((id) => activeProducts.find((product) => product.id === id))
      .filter(Boolean) as typeof activeProducts;
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

    if (configuredNames.length === 0) {
      return Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        image: data.image,
        productCount: data.count,
      }));
    }

    return configuredNames
      .map((name) => {
        const data = categoryMap.get(name);
        return data ? { name, image: data.image, productCount: data.count } : null;
      })
      .filter(Boolean) as { name: string; image: string; productCount: number }[];
  }, [activeProducts, homepageSettings?.categoryNames]);

  const heroSlides = useMemo(
    () => (homepageSettings?.heroSlides ?? []).filter((slide) => slide.enabled),
    [homepageSettings?.heroSlides]
  );

  const [slideIndex, setSlideIndex] = useState(0);
  const slideCount = heroSlides.length;

  useEffect(() => {
    if (slideCount === 0 || slideIndex >= slideCount) {
      setSlideIndex(0);
    }
  }, [slideCount, slideIndex]);

  useEffect(() => {
    if (!homepageSettings?.heroAutoplay || slideCount <= 1) return;

    const timer = window.setInterval(() => {
      setSlideIndex((currentIndex) => (currentIndex + 1) % slideCount);
    }, homepageSettings.heroInterval || 5000);

    return () => window.clearInterval(timer);
  }, [homepageSettings?.heroAutoplay, homepageSettings?.heroInterval, slideCount]);

  const currentSlide = heroSlides[slideIndex];

  const nextSlide = () => {
    if (slideCount <= 1) return;
    setSlideIndex((currentIndex) => (currentIndex + 1) % slideCount);
  };

  const previousSlide = () => {
    if (slideCount <= 1) return;
    setSlideIndex((currentIndex) => (currentIndex - 1 + slideCount) % slideCount);
  };

  const goToSlide = (index: number) => setSlideIndex(index);

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const renderHeroButton = (slide: NonNullable<typeof currentSlide>) => {
    if (!slide.buttonText || !slide.buttonLink) return null;

    if (/^https?:\/\//i.test(slide.buttonLink)) {
      return (
        <a
          href={slide.buttonLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex"
        >
          <Button
            size="lg"
            className="group w-full px-8 font-bold sm:w-auto"
          >
            {slide.buttonText}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </a>
      );
    }

    return (
      <Link to={slide.buttonLink} className="inline-flex">
        <Button
          size="lg"
          className="group w-full px-8 font-bold sm:w-auto"
        >
          {slide.buttonText}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    );
  };

  return (
    <div className="bg-[#f4f2ef] dark:bg-[#0f172a] text-charcoal dark:text-slate-100 transition-colors duration-200">
      {/* =====================================================
          1. DARK HERO SECTION
      ====================================================== */}
      <section className="relative overflow-hidden bg-[#0b0f17] text-white">
        {/* Subtle engineering grid background texture */}
        <div className="absolute inset-0 grid-plate opacity-20 pointer-events-none" />

        {/* Ambient atmospheric orange glows */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-brand-500/15 blur-[140px]" />

        <div className="relative mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          {currentSlide ? (
            /* Configured Dynamic Hero Slideshow */
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="order-2 lg:order-1"
                >
                  {/* Eyebrow badge */}
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1.5 backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400">
                      {currentSlide.eyebrow || 'Shilp Sahayak Studio'}
                    </span>
                  </div>

                  <h1 className="max-w-2xl font-serif text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl text-white">
                    {currentSlide.title}
                  </h1>

                  {currentSlide.description && (
                    <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                      {currentSlide.description}
                    </p>
                  )}

                  <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                    {renderHeroButton(currentSlide)}
                    <Link to="/custom-service" className="inline-flex">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full border-slate-700 bg-slate-900/60 text-white hover:border-brand-500 hover:bg-slate-800 sm:w-auto"
                      >
                        <Sparkles className="mr-2 h-4 w-4 text-brand-400" />
                        Custom 3D Print
                      </Button>
                    </Link>
                  </div>

                  {slideCount > 1 && (
                    <div className="mt-10 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={previousSlide}
                        aria-label="Previous slide"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 transition-colors hover:border-brand-500 hover:text-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-2">
                        {heroSlides.map((slide, index) => (
                          <button
                            key={slide.id}
                            type="button"
                            onClick={() => goToSlide(index)}
                            aria-label={`Slide ${index + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              index === slideIndex
                                ? 'w-8 bg-brand-500'
                                : 'w-2 bg-slate-700 hover:bg-slate-500'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={nextSlide}
                        aria-label="Next slide"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 transition-colors hover:border-brand-500 hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="order-1 lg:order-2">
                <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#121824] shadow-2xl p-3 sm:p-4 group">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-950">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.04 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="relative h-full w-full"
                      >
                        <img
                          src={
                            currentSlide.image ||
                            'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80'
                          }
                          alt={currentSlide.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/30 to-transparent" />

                        {/* Top glassmorphic badge */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-black/60 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-brand-300 backdrop-blur-md">
                            <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                            <span>Live Workshop Fab</span>
                          </div>

                          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-black/50 px-3 py-1 text-[10px] font-mono text-slate-300 backdrop-blur-md">
                            <span>50µm Precision</span>
                          </div>
                        </div>

                        {/* Bottom Slide Info Overlay */}
                        <div className="absolute bottom-4 left-4 right-4 space-y-2 pointer-events-none">
                          <p className="font-serif text-lg sm:text-xl font-bold text-white drop-shadow-md">
                            {currentSlide.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-[10px] font-mono text-slate-200 backdrop-blur-md">
                              FDM & SLA
                            </span>
                            <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-[10px] font-mono text-slate-200 backdrop-blur-md">
                              PLA · PETG · Resin
                            </span>
                            <span className="rounded-lg bg-brand-500/20 border border-brand-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-brand-300 backdrop-blur-md">
                              From ₹4.5/g
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Default Studio Hero */
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-xs font-bold text-brand-400">
                  <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                  <span>Precision FDM & SLA Fabrication</span>
                </div>

                <h1 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
                  If you can imagine it,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-orange-400 to-amber-300">
                    we can print it.
                  </span>
                </h1>

                <p className="max-w-xl text-base text-slate-300 sm:text-lg leading-relaxed">
                  Turn bespoke 3D CAD files, concept photos, and custom product ideas into tangible, production-grade physical objects. Crafted with care in Patiala, Punjab.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link to="/custom-service">
                    <Button
                      size="lg"
                      className="bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-lg shadow-brand-500/25 gap-2 h-12 px-6"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Start Custom Print</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>

                  <Link to="/catalog">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-zinc-700 bg-zinc-900/80 text-white hover:bg-zinc-800 hover:border-zinc-600 font-semibold h-12 px-6"
                    >
                      <span>Explore Catalog</span>
                    </Button>
                  </Link>
                </div>

                {/* Micro trust indicators */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-800 text-slate-300">
                  <div>
                    <p className="font-mono text-xl font-bold text-white">50µm</p>
                    <p className="text-xs text-slate-400">Layer Precision</p>
                  </div>
                  <div>
                    <p className="font-mono text-xl font-bold text-white">100%</p>
                    <p className="text-xs text-slate-400">Quality Checked</p>
                  </div>
                  <div>
                    <p className="font-mono text-xl font-bold text-white">₹4.5/g</p>
                    <p className="text-xs text-slate-400">Transparent Rates</p>
                  </div>
                </div>
              </div>

              {/* Right Hero Visual Showcase */}
              <div className="relative">
                <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#121824] shadow-2xl p-6 sm:p-8">
                  <div className="aspect-square w-full rounded-2xl bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
                    <img
                      src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
                      alt="3D Printing in action"
                      className="absolute inset-0 h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/40 to-transparent" />

                    <div className="relative z-10 mt-auto text-left w-full space-y-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-400 bg-brand-500/20 px-2.5 py-1 rounded-full border border-brand-500/30">
                        Live Studio
                      </span>
                      <h3 className="font-serif text-xl font-bold text-white">
                        Precision Layer-by-Layer Fabrication
                      </h3>
                      <p className="text-xs text-slate-300">
                        High-grade PLA, PETG & Resin with calibrated dimensional tolerances.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          2. VALUE PROPOSITIONS STRIP
      ====================================================== */}
      <section className="border-b border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="mx-auto max-w-[1440px] grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/80 dark:divide-slate-800">
          {[
            {
              icon: Sparkles,
              title: 'Personalized Gifts',
              description: 'Lithophanes & custom decor',
            },
            {
              icon: Cpu,
              title: 'Startup & Robotics',
              description: 'Custom enclosures & mounts',
            },
            {
              icon: Layers,
              title: 'Multi-Material Range',
              description: 'PLA, PETG, ABS, Resin, Wood',
            },
            {
              icon: Truck,
              title: 'Pan-India Tracked',
              description: 'Free delivery above ₹499',
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex items-center gap-3.5 px-5 py-6 sm:px-8"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <div>
                  <p className="font-serif text-sm font-bold text-charcoal dark:text-slate-100">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal-lighter dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          3. ABOUT SHILP SAHAYAK (3 CORE PILLARS)
      ====================================================== */}
      <section className="py-20 lg:py-24 bg-[#f4f2ef] dark:bg-[#0f172a] transition-colors">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
              Meet Your Makers
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-charcoal dark:text-slate-100">
              A studio built around your creativity.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-charcoal-light dark:text-slate-400">
              We aren't a generic factory — we are a passionate team of 3D printing enthusiasts and engineers based in Patiala. We help you choose the right material, optimize your tolerances, and deliver high-finish physical objects.
            </p>
          </div>

          {/* 3 Core Focus Pillars */}
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Pillar 1 */}
            <Card className="p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-500/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100/70 dark:bg-orange-500/15 text-brand-600 dark:text-brand-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold text-charcoal dark:text-slate-100">
                1. Personalization & Bespoke Creations
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-charcoal-light dark:text-slate-400">
                Turn memories into tangible art. Customized lithophane lamps, anniversary trophies, custom nameplates, personalized phone holders, and decorative collectibles.
              </p>
              <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">Great for gifts & decor</span>
              </div>
            </Card>

            {/* Pillar 2 */}
            <Card className="p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-500/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/70 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold text-charcoal dark:text-slate-100">
                2. Startup & Maker Branding
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-charcoal-light dark:text-slate-400">
                Short-run hardware manufacturing without expensive injection molds. Custom IoT enclosures, drone arm mounts, action camera brackets, and branded event badges.
              </p>
              <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Small batch production</span>
              </div>
            </Card>

            {/* Pillar 3 */}
            <Card className="p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-500/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100/70 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <Wrench className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold text-charcoal dark:text-slate-100">
                3. Prototyping & Engineering
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-charcoal-light dark:text-slate-400">
                Rapid turnaround for college projects, robotics clubs, and mechanical R&D. High-strength PETG and heat-resistant ABS fabricated with tight mechanical clearances.
              </p>
              <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Functional test prototypes</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* =====================================================
          4. "WHAT IS 3D PRINTING?" 3-STEP EXPLAINER (Dark Theme)
      ====================================================== */}
      <section className="bg-[#121824] py-20 text-white relative overflow-hidden border-y border-slate-800">
        <div className="absolute inset-0 grid-plate opacity-15 pointer-events-none" />

        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400">
                How It Works
              </span>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-white">
                How 3D printing turns your idea into reality.
              </h2>
            </div>
            <p className="text-base leading-relaxed text-slate-300">
              3D printing (additive manufacturing) builds objects by depositing material layer by microscopic layer directly from digital geometry — eliminating tooling costs and enabling endless customization.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Share File or Idea',
                description:
                  'Upload an STL, OBJ, or 3MF file from CAD, share reference images, or tell us your concept for 3D modeling assistance.',
                badge: 'Instant File Review',
              },
              {
                step: '02',
                title: 'Precision Slicing & Printing',
                description:
                  'We slice your model with optimized infill and layer height, then fabricate on calibrated FDM or high-detail SLA resin machines.',
                badge: 'Sub-Millimeter Accuracy',
              },
              {
                step: '03',
                title: 'Quality Check & Delivery',
                description:
                  'Every print undergoes hand-finishing, dimensional inspection, and safe multi-layer bubble packaging before tracked Pan-India dispatch.',
                badge: 'Pan-India Delivery',
              },
            ].map((card) => (
              <div
                key={card.step}
                className="relative rounded-2xl border border-slate-800 bg-slate-900/70 p-7 backdrop-blur-sm hover:border-brand-500/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-extrabold text-brand-400">
                    {card.step}
                  </span>
                  <Badge variant="brand" className="border-brand-500/30 bg-brand-500/15 text-brand-300">
                    {card.badge}
                  </Badge>
                </div>

                <h3 className="mt-5 font-serif text-xl font-bold text-white">
                  {card.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  {card.description}
                </p>
              </div>
            ))}
          </div>

          {/* Quick CTA to Custom Service */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-950/60 via-slate-900 to-slate-900 p-6 sm:p-8">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-serif text-xl font-bold text-white">
                Have a 3D model ready right now?
              </h3>
              <p className="text-sm text-slate-300">
                Get an instant volume and weight calculation in under 30 seconds.
              </p>
            </div>

            <Link to="/custom-service" className="mt-4 sm:mt-0">
              <Button size="lg" className="font-bold px-7">
                Upload & Calculate Quote
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          5. FEATURED PRODUCTS ("PIECES WE KEEP STOCKED")
      ====================================================== */}
      <section className="py-20 lg:py-24 bg-[#f4f2ef] dark:bg-[#0f172a] border-b border-zinc-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
                Workshop Stock
              </span>
              <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl text-charcoal dark:text-slate-100">
                Pieces we keep stocked.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-charcoal-light dark:text-slate-400">
                Ready-to-dispatch 3D printed items, crafted with care and ready for your home or desk.
              </p>
            </div>

            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
            >
              <span>View All Collection</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-10">
              <FeaturedProductSkeleton />
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-zinc-200 dark:border-slate-800 p-12 text-center text-charcoal-lighter dark:text-slate-400">
              No featured products yet. Add products from the Admin catalog.
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group flex flex-col"
                >
                  <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl group-hover:border-brand-300">
                    <div className="relative overflow-hidden bg-zinc-100 dark:bg-slate-800">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {product.isCustomizable && (
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-charcoal/85 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                          <Sparkles className="h-3 w-3 text-brand-400" />
                          Personalize
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-charcoal-lighter dark:text-slate-400">
                          {product.category || 'Workshop Piece'}
                        </span>
                        <h3 className="mt-1.5 line-clamp-2 font-serif text-lg font-bold text-charcoal dark:text-slate-100 group-hover:text-brand-600 transition-colors">
                          {product.name}
                        </h3>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 dark:border-slate-700/60 pt-3.5">
                        <span className="text-xs font-semibold text-charcoal-light dark:text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          View details
                        </span>

                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          6. SHOP BY CATEGORY CAROUSEL
      ====================================================== */}
      <section className="py-20 lg:py-24 bg-[#f4f2ef] dark:bg-[#0f172a] transition-colors">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
                Browse Styles
              </span>
              <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl text-charcoal dark:text-slate-100">
                Shop by category.
              </h2>
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollCategories('left')}
                  aria-label="Scroll categories left"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-charcoal dark:text-slate-200 hover:border-brand-500 hover:text-brand-600 transition-colors shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategories('right')}
                  aria-label="Scroll categories right"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-charcoal dark:text-slate-200 hover:border-brand-500 hover:text-brand-600 transition-colors shadow-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="mt-9">
              <CategoryGridSkeleton />
            </div>
          ) : categories.length === 0 ? (
            <div className="mt-9 rounded-2xl border border-dashed border-zinc-200 dark:border-slate-800 p-10 text-center text-charcoal-lighter dark:text-slate-400">
              No categories found.
            </div>
          ) : (
            <div
              ref={categoryScrollRef}
              className="mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                  className="group w-[60%] shrink-0 snap-start sm:w-[36%] lg:w-[23%]"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-zinc-200 dark:bg-slate-800 shadow-md">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="font-serif text-lg font-bold text-white group-hover:text-brand-400 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-slate-300">
                        {cat.productCount} {cat.productCount === 1 ? 'Design' : 'Designs'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          7. "WHY CHOOSE US" 4-PILLAR SECTION (Dark Theme)
      ====================================================== */}
      <section className="bg-[#0b0f17] py-20 text-white border-t border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 grid-plate opacity-15 pointer-events-none" />

        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400">
              The Shilp Sahayak Difference
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-white">
              Why makers & teams choose us.
            </h2>
            <p className="mt-4 text-base text-slate-300">
              We treat every print like our own project — ensuring dimensional accuracy, clean layer bonding, and personal maker support.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ShieldCheck,
                title: 'Hand-Inspected Quality',
                desc: 'Every completed part is visually inspected and measured before being approved for packaging.',
              },
              {
                icon: Layers,
                title: 'Engineering Materials',
                desc: 'Premium PLA, impact-resistant PETG, heat-resistant ABS, ultra-fine SLA Resin, Silk & Wood.',
              },
              {
                icon: MessageSquare,
                title: 'Direct Maker WhatsApp',
                desc: 'Need advice on wall thickness or print orientation? Chat directly with our printing engineers.',
              },
              {
                icon: Zap,
                title: 'Transparent Pricing',
                desc: 'Honest rates from ₹4.5/g with volume discounts for batch orders and zero hidden setup surcharges.',
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm hover:border-brand-500/50 transition-colors"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          8. FINAL CTA SECTION (Dark Theme)
      ====================================================== */}
      <section className="relative overflow-hidden bg-[#0b0f17] px-5 py-24 text-center text-white sm:px-8 sm:py-28">
        <div className="absolute inset-0 grid-plate opacity-20 pointer-events-none" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[600px] rounded-full bg-brand-500/10 blur-[130px]" />

        <div className="relative mx-auto max-w-3xl">
          <Badge variant="brand" className="mb-4">
            Start Your Print Today
          </Badge>

          <h2 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-white">
            Have a custom idea in mind?
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            Send us your 3D CAD model, sketches, or project requirements. Our makers will review your design and prepare an exact quote within a few hours.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/custom-service">
              <Button size="lg" className="w-full font-bold px-9 shadow-lg shadow-brand-500/25 sm:w-auto">
                <Sparkles className="mr-2 h-4 w-4" />
                Get Instant 3D Quote
              </Button>
            </Link>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button
                size="lg"
                variant="whatsapp"
                className="w-full font-bold px-8 sm:w-auto"
              >
                Chat with Maker on WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}