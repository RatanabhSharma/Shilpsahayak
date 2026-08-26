import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  CheckCircle2,
} from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import { useHomepage } from '../../hooks/useHomepage';
import { useSettings } from '../../hooks/useSettings';
import { Button, Card } from '../../components/ui';
import { FeaturedProductSkeleton } from '../../components/loading/ProductSkeleton';

const CUSTOMER_REVIEWS = [
  {
    id: 'rev-1',
    name: 'Aarav Mehta',
    location: 'Bangalore, KA',
    rating: 5,
    date: 'Verified Buyer',
    productName: 'Custom Lithophane Ambient Lamp',
    text: 'The detail on the lithophane lamp is astonishing! When you turn the light on, my family photo shines with so much depth. Arrived safely bubble-wrapped within 3 days.',
  },
  {
    id: 'rev-2',
    name: 'Pooja Sundaram',
    location: 'Mumbai, MH',
    rating: 5,
    date: 'Verified Buyer',
    productName: 'DOOM RGB Gaming Lightbox',
    text: 'Super high quality finish! No visible layer flaws, the colors are rich, and the RGB lighting is bright. Looks phenomenal on my desk setup.',
  },
  {
    id: 'rev-3',
    name: 'Vikramjit Singh',
    location: 'Chandigarh, PB',
    rating: 5,
    date: 'Verified Buyer',
    productName: 'Desktop Cable & Pen Organizer',
    text: 'Sturdy PETG material with clean geometric lines. Holds my stationeries and phone perfectly. Direct studio pricing made it a no-brainer.',
  },
];

const WHY_US_STATS = [
  { label: 'Base Print Rate', value: '₹4.5/g', note: 'vs. ₹10–15/g industry avg.' },
  { label: 'Layer Precision', value: '±0.1 mm', note: 'Micron-grade FDM calibration' },
  { label: 'Dispatch Time', value: '24–48 h', note: 'After order confirmation' },
  { label: 'Free Shipping', value: '₹499+', note: 'Pan-India courier included' },
];

const FAQ_ITEMS = [
  {
    q: 'What file formats do you accept for custom 3D printing?',
    a: 'We accept STL, OBJ, and 3MF formats. STL is the most common export from any CAD software (Fusion 360, SolidWorks, TinkerCAD). If you only have a reference image or idea, our studio can handle ideation-to-print as well.',
  },
  {
    q: 'How is the custom print price calculated?',
    a: 'Pricing is transparent and weight-based: (Volume × Density × Infill Factor × Material Rate) + ₹100 base fee. For PLA at ₹4.5/g with 20% infill, our calculator gives you an exact figure the moment your STL is uploaded — no hidden surcharges.',
  },
  {
    q: 'Which materials are available and when should I use each?',
    a: 'PLA is best for display pieces and gifts. PETG for food-safe containers and moderate heat. ABS for high-temperature and impact parts. Silk PLA for premium aesthetic finishes. UV Resin for ultra-fine detail miniatures. Wood PLA for an organic, wood-grain effect.',
  },
  {
    q: 'Do you ship pan-India? How long does delivery take?',
    a: 'Yes — we ship to all 29 states and 7 UTs via tracked courier. Standard prints dispatch in 24–48 hours of order confirmation. Delivery is typically 3–7 business days depending on your pin code. Shipping is free on all orders above ₹499.',
  },
  {
    q: 'Is my CAD file kept confidential?',
    a: 'Absolutely. All STL files and design files shared with us are handled with complete confidentiality. We do not share, publish, or reproduce your designs without written permission. NDA-protected service available for enterprise clients.',
  },
  {
    q: 'Can I order in bulk for events, colleges, or businesses?',
    a: 'Yes! We specialize in small-to-medium production batches (10–500+ pieces). College projects, robotics teams, corporate gifting, retail brand merchandise — reach out via WhatsApp or the contact form for custom bulk pricing.',
  },
];

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

  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div className="bg-[#f4f2ef] dark:bg-[#0f172a] text-charcoal dark:text-slate-100 transition-colors duration-200">
      {/* =====================================================
          1. PRODUCT-FOCUSED E-COMMERCE HERO SECTION
      ====================================================== */}
      <section className="relative overflow-hidden bg-[#0b0f17] text-white">
        {/* Engineering grid background texture */}
        <div className="absolute inset-0 grid-plate opacity-20 pointer-events-none" />

        {/* Ambient atmospheric orange glows */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-brand-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-brand-500/20 blur-[140px]" />

        <div className="relative mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            {/* Left Content Column */}
            <div className="order-2 lg:order-1 space-y-6">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1.5 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-400">
                  {currentSlide?.eyebrow || 'Studio 3D Creations'}
                </span>
              </div>

              <h1 className="max-w-2xl font-serif text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl text-white">
                {currentSlide?.title || 'Crafted by Layer. Designed for Living.'}
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                {currentSlide?.description ||
                  'Explore our curated collection of 3D printed lamps, bespoke gifts, desk essentials and pop-culture collectibles — precision-made and dispatched Pan-India.'}
              </p>

              {/* Shopping CTAs */}
              <div className="flex flex-col gap-3.5 sm:flex-row pt-2">
                <Link to="/catalog" className="inline-flex">
                  <Button
                    size="lg"
                    className="group w-full px-8 font-bold sm:w-auto shadow-lg shadow-brand-500/25 h-12"
                  >
                    <span>Shop Best Sellers</span>
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>

                <Link to="/custom-service" className="inline-flex">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-slate-700 bg-slate-900/70 text-white hover:border-brand-500 hover:bg-slate-800 sm:w-auto font-semibold h-12"
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-brand-400" />
                    <span>Get Custom Quote</span>
                  </Button>
                </Link>
              </div>

              {/* Micro Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800 text-slate-300">
                <div>
                  <p className="font-mono text-lg sm:text-xl font-bold text-white">Free</p>
                  <p className="text-xs text-slate-400">Shipping over ₹499</p>
                </div>
                <div>
                  <p className="font-mono text-lg sm:text-xl font-bold text-white">50µm</p>
                  <p className="text-xs text-slate-400">Layer Precision</p>
                </div>
                <div>
                  <p className="font-mono text-lg sm:text-xl font-bold text-white">100%</p>
                  <p className="text-xs text-slate-400">Quality Checked</p>
                </div>
              </div>

              {/* Slide controls if multiple slides exist */}
              {slideCount > 1 && (
                <div className="pt-2 flex items-center gap-4">
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
            </div>

            {/* Right Product Showcase Frame */}
            <div className="order-1 lg:order-2">
              <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#121824] shadow-2xl p-3 sm:p-4 group">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-950">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide?.id || 'default-hero'}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.04 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="relative h-full w-full"
                    >
                      <img
                        src={
                          currentSlide?.image ||
                          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80'
                        }
                        alt={currentSlide?.title || '3D Printed Product'}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/25 to-transparent" />

                      {/* Top Glassmorphic Tag */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                        <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/40 bg-black/60 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-brand-300 backdrop-blur-md">
                          <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                          <span>Featured Studio Piece</span>
                        </div>

                        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-black/50 px-3 py-1 text-[10px] font-mono text-slate-300 backdrop-blur-md">
                          <span>Pan-India Delivery</span>
                        </div>
                      </div>

                      {/* Bottom Slide Info Overlay */}
                      <div className="absolute bottom-4 left-4 right-4 space-y-1.5 pointer-events-none">
                        <p className="font-serif text-lg sm:text-xl font-bold text-white drop-shadow-md">
                          {currentSlide?.title || 'Custom 3D Printing & Fabrication'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-white/15 px-2.5 py-0.5 text-[10px] font-mono text-slate-200 backdrop-blur-md">
                            PLA · PETG · Resin
                          </span>
                          <span className="rounded-lg bg-brand-500/25 border border-brand-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-brand-300 backdrop-blur-md">
                            Ready to Ship
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MARQUEE BRAND TICKER (LIKE ZOOMORA / 3LAYERED / NOZAYA)
      ====================================================== */}
      <div className="border-y border-zinc-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 py-3.5 overflow-hidden select-none backdrop-blur-sm shadow-sm">
        <div className="animate-marquee space-x-8 text-xs font-mono font-bold tracking-wider uppercase text-charcoal-light dark:text-slate-300">
          <span className="flex items-center gap-2">✨ 100% Plant-Based Biopolymer PLA</span>
          <span className="text-brand-500">•</span>
          <span className="flex items-center gap-2">⚡ 50µm Precision Micro-Layering</span>
          <span className="text-brand-500">•</span>
          <span className="flex items-center gap-2">🎁 Custom Lithophanes & Lightboxes</span>
          <span className="text-brand-500">•</span>
          <span className="flex items-center gap-2">🚚 Free Pan-India Delivery on Orders &gt; ₹499</span>
          <span className="text-brand-500">•</span>
          <span className="flex items-center gap-2">🇮🇳 Handcrafted in Punjab</span>
          <span className="text-brand-500">•</span>
          <span className="flex items-center gap-2">📦 Safe Multi-Layer Packaging</span>
          <span className="text-brand-500">•</span>
          <span className="flex items-center gap-2">✨ 100% Plant-Based Biopolymer PLA</span>
          <span className="text-brand-500">•</span>
          <span className="flex items-center gap-2">⚡ 50µm Precision Micro-Layering</span>
          <span className="text-brand-500">•</span>
          <span className="flex items-center gap-2">🎁 Custom Lithophanes & Lightboxes</span>
          <span className="text-brand-500">•</span>
          <span className="flex items-center gap-2">🚚 Free Pan-India Delivery on Orders &gt; ₹499</span>
          <span className="text-brand-500">•</span>
        </div>
      </div>

      {/* =====================================================
          2. FEATURED & BEST SELLING PRODUCTS (SHOPPING CARDS)
      ====================================================== */}
      <section className="py-20 lg:py-24 bg-[#f4f2ef] dark:bg-[#0f172a] border-b border-zinc-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
                Trending Drops
              </span>
              <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl text-charcoal dark:text-slate-100">
                Best Selling Pieces
              </h2>
              <p className="mt-2 max-w-xl text-sm text-charcoal-light dark:text-slate-400">
                Functional decor, illuminated lamps, and personalized favorites crafted with care and ready to ship.
              </p>
            </div>

            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors"
            >
              <span>Explore All Products</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-10">
              <FeaturedProductSkeleton />
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-zinc-200 dark:border-slate-800 p-12 text-center text-charcoal-lighter dark:text-slate-400">
              No products found in catalog yet.
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => {
                const regularPrice = Number(product.price) || 0;
                const compareAtPrice = Math.round(regularPrice * 1.35);
                const discountPercent = regularPrice > 0 ? Math.round(((compareAtPrice - regularPrice) / compareAtPrice) * 100) : 0;

                return (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group flex flex-col"
                  >
                    <Card className="flex h-full flex-col justify-between overflow-hidden transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl group-hover:border-brand-300">
                      <div className="relative overflow-hidden bg-zinc-100 dark:bg-slate-800">
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {product.isCustomizable && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-charcoal/85 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                              <Sparkles className="h-3 w-3 text-brand-400" />
                              Personalize
                            </span>
                          )}
                          {product.featured && (
                            <span className="inline-flex items-center rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-white shadow-sm">
                              Best Seller
                            </span>
                          )}
                        </div>

                        {discountPercent > 0 && (
                          <span className="absolute top-3 right-3 rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                            Save {discountPercent}%
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-5">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-charcoal-lighter dark:text-slate-400 truncate">
                              {product.category || 'Workshop Item'}
                            </span>
                            {/* Star ratings */}
                            <div className="flex items-center gap-1 shrink-0 text-amber-500 text-xs font-bold">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span>4.9</span>
                            </div>
                          </div>

                          <h3 className="mt-1.5 line-clamp-2 font-serif text-lg font-bold text-charcoal dark:text-slate-100 group-hover:text-brand-600 transition-colors">
                            {product.name}
                          </h3>
                        </div>

                        {/* Price & Action Strip */}
                        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 dark:border-slate-700/60 pt-3.5">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-serif text-lg font-bold text-charcoal dark:text-slate-100">
                                ₹{regularPrice.toLocaleString('en-IN')}
                              </span>
                              {compareAtPrice > regularPrice && (
                                <span className="font-mono text-xs text-charcoal-lighter dark:text-slate-500 line-through">
                                  ₹{compareAtPrice.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-brand-600 dark:text-brand-400 font-semibold block">
                              Free Shipping over ₹499
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 dark:bg-brand-500/15 px-3 py-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors shadow-sm">
                            <span>View Piece</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          3. SHOP BY CATEGORY (VISUAL TILES)
      ====================================================== */}
      <section className="py-20 lg:py-24 bg-[#f4f2ef] dark:bg-[#0f172a] border-b border-zinc-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
                Curated Collections
              </span>
              <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl text-charcoal dark:text-slate-100">
                Shop by Category
              </h2>
              <p className="mt-2 text-sm text-charcoal-light dark:text-slate-400">
                Browse our specialized lines of lamps, desktop gear, customized gifts, and engineering parts.
              </p>
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollCategories('left')}
                  aria-label="Scroll categories left"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-charcoal dark:text-slate-200 shadow-sm transition-colors hover:border-brand-500 hover:text-brand-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategories('right')}
                  aria-label="Scroll categories right"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-charcoal dark:text-slate-200 shadow-sm transition-colors hover:border-brand-500 hover:text-brand-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          <div
            ref={categoryScrollRef}
            className="mt-10 flex gap-6 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none"
          >
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/catalog?category=${encodeURIComponent(category.name)}`}
                className="group flex-none w-[260px] sm:w-[290px] snap-start"
              >
                <Card className="overflow-hidden transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl group-hover:border-brand-300">
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-slate-800">
                    <img
                      src={
                        category.image ||
                        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
                      }
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-300">
                        {category.productCount} {category.productCount === 1 ? 'Design' : 'Designs'}
                      </span>
                      <h3 className="mt-1 font-serif text-lg font-bold text-white group-hover:text-brand-300 transition-colors">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          4. SOCIAL PROOF & CUSTOMER REVIEWS
      ====================================================== */}
      <section className="py-20 lg:py-24 bg-white dark:bg-slate-900 border-b border-zinc-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
              Customer Love
            </span>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl text-charcoal dark:text-slate-100">
              Loved by 1000+ Makers & Creators
            </h2>
            <p className="mt-2 text-sm text-charcoal-light dark:text-slate-400">
              Real reviews from customers who personalized their spaces and prototyped their ideas with us.
            </p>
          </div>

          {/* Review Cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {CUSTOMER_REVIEWS.map((review) => (
              <Card
                key={review.id}
                className="flex flex-col justify-between p-7 transition-all duration-300 hover:shadow-lg border-zinc-200 dark:border-slate-800"
              >
                <div className="space-y-4">
                  {/* Stars */}
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-sm leading-relaxed text-charcoal dark:text-slate-300">
                    "{review.text}"
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-serif text-sm font-bold text-charcoal dark:text-slate-100">
                        {review.name}
                      </p>
                      <p className="text-xs text-charcoal-lighter dark:text-slate-400">
                        {review.location}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] font-mono text-brand-600 dark:text-brand-400 truncate">
                    {review.productName}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Social Stats Strip */}
          <div className="mt-14 rounded-2xl border border-zinc-200 dark:border-slate-800 bg-[#f4f2ef] dark:bg-[#0f172a] p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="font-mono text-3xl font-bold text-charcoal dark:text-slate-100">4.9 ★</p>
              <p className="text-xs text-charcoal-lighter dark:text-slate-400 mt-1">Average Store Rating</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-charcoal dark:text-slate-100">10k+</p>
              <p className="text-xs text-charcoal-lighter dark:text-slate-400 mt-1">Hours 3D Printed</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-charcoal dark:text-slate-100">50µm</p>
              <p className="text-xs text-charcoal-lighter dark:text-slate-400 mt-1">Calibrated Resolution</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-charcoal dark:text-slate-100">100%</p>
              <p className="text-xs text-charcoal-lighter dark:text-slate-400 mt-1">Inspected & Safe Packed</p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          5. WHY SHOP WITH US (THE STUDIO ADVANTAGE)
      ====================================================== */}
      <section className="py-20 lg:py-24 bg-[#f4f2ef] dark:bg-[#0f172a] border-b border-zinc-200 dark:border-slate-800 transition-colors">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
              The Shilp Sahayak Difference
            </span>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl text-charcoal dark:text-slate-100">
              Why Shop With Us
            </h2>
            <p className="mt-2 text-sm text-charcoal-light dark:text-slate-400">
              Every design is fabricated in-house with engineering precision and passion.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Sparkles,
                title: 'Direct-from-Studio Value',
                description:
                  'No middleman retail markups. You get studio-grade fabrication directly from our Patiala makerspace.',
              },
              {
                icon: Layers,
                title: 'Industrial Tough Polymers',
                description:
                  'High-grade PLA+, heat-resistant PETG, and ultra-high-detail SLA resin built for daily longevity.',
              },
              {
                icon: ShieldCheck,
                title: 'Hand-Inspected Finish',
                description:
                  'Every piece is measured for dimensional tolerances and post-processed by hand before shipping.',
              },
              {
                icon: Truck,
                title: 'Pan-India Express Tracked',
                description:
                  'Bubble-wrapped multi-layer packaging dispatched via trusted express couriers with live tracking.',
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-brand-300"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-serif text-lg font-bold text-charcoal dark:text-slate-100">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-charcoal-light dark:text-slate-400">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          6. CUSTOM 3D PRINTING BANNER (SECONDARY ORDER)
      ====================================================== */}
      <section className="relative overflow-hidden bg-[#0b0f17] py-20 lg:py-24 text-white">
        <div className="absolute inset-0 grid-plate opacity-20 pointer-events-none" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[600px] rounded-full bg-brand-500/15 blur-[130px]" />

        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 sm:p-12 lg:p-16 backdrop-blur-md shadow-2xl">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1 text-xs font-bold text-brand-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Custom Fabrication Service</span>
                </div>

                <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-white">
                  Have your own 3D CAD model or custom idea?
                </h2>

                <p className="text-sm sm:text-base leading-relaxed text-slate-300 max-w-xl">
                  Upload STL, OBJ, or 3MF files to calculate material volume, configure infill tolerances, and get instant pricing within minutes.
                </p>

                {/* 3 Step Visual */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <span className="font-mono text-sm font-bold text-brand-400">01</span>
                    <p className="text-xs font-bold text-white mt-0.5">Upload CAD</p>
                    <p className="text-[11px] text-slate-400">STL, OBJ or 3MF</p>
                  </div>
                  <div>
                    <span className="font-mono text-sm font-bold text-brand-400">02</span>
                    <p className="text-xs font-bold text-white mt-0.5">Instant Slicing</p>
                    <p className="text-[11px] text-slate-400">Live volume & quote</p>
                  </div>
                  <div>
                    <span className="font-mono text-sm font-bold text-brand-400">03</span>
                    <p className="text-xs font-bold text-white mt-0.5">Fast Dispatch</p>
                    <p className="text-[11px] text-slate-400">Shipped in 24-48h</p>
                  </div>
                </div>
              </div>

              {/* Action Box */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-[#0b0f17]/90 p-8 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-brand-500/15 text-brand-400 flex items-center justify-center">
                  <Sparkles className="h-7 w-7" />
                </div>

                <div>
                  <h3 className="font-serif text-xl font-bold text-white">
                    Start Custom Print
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Transparent rates starting from ₹4.5/g
                  </p>
                </div>

                <Link to="/custom-service" className="w-full">
                  <Button size="lg" className="w-full font-bold shadow-md shadow-brand-500/20">
                    <span>Upload 3D File & Quote</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Discuss design on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          7. WHY CHOOSE US — TRANSPARENT PRICING & TRUST
      ====================================================== */}
      <section className="border-y border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors py-16 lg:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20 lg:items-center">
            {/* Left: Headline */}
            <div className="space-y-5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
                Why Shilp Sahayak
              </span>
              <h2 className="font-serif text-3xl font-bold leading-tight text-charcoal dark:text-slate-100 sm:text-4xl">
                Studio-Grade Quality.<br />
                <span className="text-brand-500">No Middleman Markup.</span>
              </h2>
              <p className="text-sm text-charcoal-light dark:text-slate-400 leading-relaxed max-w-md">
                We print in-house at our Patiala facility, so you pay exactly what the material, machine, and craft is worth — nothing more. Every order is manually QA-checked before packaging.
              </p>

              {/* Trust Pillars */}
              <div className="space-y-3 pt-2">
                {[
                  { icon: ShieldCheck, text: 'Dimensional QA verification on every print before dispatch' },
                  { icon: Truck, text: 'Free tracked shipping pan-India on orders ₹499 and above' },
                  { icon: Layers, text: 'Application-specific material matching for each project' },
                  { icon: CheckCircle2, text: '100% CAD confidentiality — your files, your IP, always' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs text-charcoal-light dark:text-slate-300 font-medium leading-snug">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Stat Grid */}
            <div className="grid grid-cols-2 gap-4">
              {WHY_US_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-zinc-200 dark:border-slate-800 bg-[#f4f2ef] dark:bg-slate-800/60 p-6 space-y-1 hover:border-brand-300 dark:hover:border-brand-500/50 transition-colors"
                >
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-charcoal dark:text-slate-100">
                    {stat.value}
                  </span>
                  <p className="font-bold text-xs text-charcoal dark:text-slate-200">{stat.label}</p>
                  <p className="text-[11px] text-charcoal-lighter dark:text-slate-400">{stat.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          8. FAQ ACCORDION
      ====================================================== */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:items-start">
            {/* Left: Header */}
            <div className="lg:sticky lg:top-24 space-y-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
                Common Questions
              </span>
              <h2 className="font-serif text-3xl font-bold text-charcoal dark:text-slate-100 sm:text-4xl leading-tight">
                Everything you need to know.
              </h2>
              <p className="text-sm text-charcoal-light dark:text-slate-400 leading-relaxed">
                Can't find the answer here? Our studio team responds to WhatsApp queries within 30 minutes during business hours.
              </p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 underline underline-offset-4 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Ask on WhatsApp</span>
              </a>
            </div>

            {/* Right: FAQ list */}
            <div className="divide-y divide-zinc-200 dark:divide-slate-800">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = faqOpen === index;
                return (
                  <div key={index}>
                    <button
                      type="button"
                      onClick={() => setFaqOpen(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 py-5 text-left group"
                    >
                      <span className={`font-serif text-sm font-bold sm:text-base transition-colors ${isOpen ? 'text-brand-600 dark:text-brand-400' : 'text-charcoal dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400'}`}>
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-charcoal-lighter dark:text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="faq-answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <p className="pb-5 text-sm text-charcoal-light dark:text-slate-400 leading-relaxed max-w-2xl">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          9. COMMUNITY / NEWSLETTER STRIP
      ====================================================== */}
      <section className="border-t border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors py-14">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-3.5 py-1 text-xs font-bold text-brand-700 dark:text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Shilp Studio Community</span>
            </div>

            <h2 className="font-serif text-2xl font-bold text-charcoal dark:text-slate-100 sm:text-3xl max-w-xl">
              Join the community. Get new drops,<br className="hidden sm:block" /> behind-the-print stories, and exclusive deals.
            </h2>

            <p className="text-xs text-charcoal-light dark:text-slate-400 max-w-sm">
              No spam. Just curated updates from our Patiala studio — new product launches, print tips, and early-access sales.
            </p>

            <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email address"
                className="h-12 flex-1 rounded-2xl border border-zinc-200 dark:border-slate-700 bg-[#f4f2ef] dark:bg-slate-800 px-4 text-sm text-charcoal dark:text-slate-100 placeholder:text-charcoal-lighter dark:placeholder:text-slate-500 outline-none focus:border-brand-500 dark:focus:border-brand-400 transition-colors"
              />
              <button
                type="button"
                className="h-12 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-6 transition-colors shadow-md shadow-brand-500/20 shrink-0"
              >
                Subscribe
              </button>
            </div>

            <p className="text-[11px] text-charcoal-lighter dark:text-slate-500">
              By subscribing you agree to our privacy policy. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
