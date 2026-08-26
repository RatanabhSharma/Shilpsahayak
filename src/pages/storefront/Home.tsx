import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  PenTool,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';

import { useProducts } from '../../hooks/useProducts';
import { useHomepage } from '../../hooks/useHomepage';
import { Button, Card } from '../../components/ui';
import {
  CategoryGridSkeleton,
  FeaturedProductSkeleton,
  WorkshopProductSkeleton,
} from '../../components/loading/ProductSkeleton';

export function Home() {
  const { data: products = [], isLoading } = useProducts();
  const { data: homepageSettings } = useHomepage();

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

  const selectedProducts = useMemo(() => {
    const configuredIds = homepageSettings?.selectedProductIds ?? [];

    if (configuredIds.length === 0) {
      return activeProducts.slice(0, 4);
    }

    return configuredIds
      .map((id) => activeProducts.find((product) => product.id === id))
      .filter(Boolean) as typeof activeProducts;
  }, [activeProducts, homepageSettings?.selectedProductIds]);

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();

    for (const product of activeProducts) {
      if (product.category && !categoryMap.has(product.category)) {
        categoryMap.set(product.category, product.image);
      }
    }

    const configuredNames = homepageSettings?.categoryNames ?? [];

    if (configuredNames.length === 0) {
      return Array.from(categoryMap.entries()).map(([name, image]) => ({
        name,
        image,
      }));
    }

    return configuredNames
      .map((name) => {
        const image = categoryMap.get(name);
        return image ? { name, image } : null;
      })
      .filter(Boolean) as { name: string; image: string }[];
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
    }, homepageSettings.heroInterval);

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
            className="group w-full bg-[#b4491e] px-7 hover:bg-[#963c18] sm:w-auto"
          >
            {slide.buttonText}
            <ArrowRight
              className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Button>
        </a>
      );
    }

    return (
      <Link to={slide.buttonLink} className="inline-flex">
        <Button
          size="lg"
          className="group w-full bg-[#b4491e] px-7 hover:bg-[#963c18] sm:w-auto"
        >
          {slide.buttonText}
          <ArrowRight
            className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Button>
      </Link>
    );
  };

  return (
    <div className="bg-[#f7f4ee] text-[#171512]">

      {/* =====================================================
          HERO PROMOTIONS
      ====================================================== */}
      <section className="relative overflow-hidden border-b border-[#ded8ce] bg-[#171512] text-[#f7f4ee]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full border border-[#f7f4ee]/10"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -bottom-48 -left-40 h-[480px] w-[480px] rounded-full border border-[#b4491e]/20"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          {currentSlide ? (
            <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="order-2 lg:order-1"
                >
                  <div className="mb-7 flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d9784b]">
                      {currentSlide.eyebrow || 'Shilp Sahayak'}
                    </span>
                    <span className="h-px w-10 bg-[#b4491e]" aria-hidden="true" />
                  </div>

                  <h1 className="max-w-2xl font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                    {currentSlide.title}
                  </h1>

                  {currentSlide.description && (
                    <p className="mt-7 max-w-xl text-base leading-7 text-[#f7f4ee]/60 sm:text-lg">
                      {currentSlide.description}
                    </p>
                  )}

                  <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                    {renderHeroButton(currentSlide)}
                    <Link to="/catalog" className="inline-flex">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full border-[#f7f4ee]/25 bg-transparent px-7 text-[#f7f4ee] hover:bg-[#f7f4ee] hover:text-[#171512] sm:w-auto"
                      >
                        Browse collection
                      </Button>
                    </Link>
                  </div>

                  {slideCount > 1 && (
                    <div className="mt-10 flex items-center gap-5">
                      <button
                        type="button"
                        onClick={previousSlide}
                        aria-label="Previous promotion"
                        className="flex h-9 w-9 items-center justify-center border border-[#f7f4ee]/20 text-[#f7f4ee]/60 transition-colors hover:border-[#f7f4ee]/60 hover:text-[#f7f4ee]"
                      >
                        <span aria-hidden="true">←</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {heroSlides.map((slide, index) => (
                          <button
                            key={slide.id}
                            type="button"
                            onClick={() => goToSlide(index)}
                            aria-label={`Show promotion ${index + 1}`}
                            aria-current={index === slideIndex ? 'true' : undefined}
                            className={`h-1 transition-all duration-300 ${
                              index === slideIndex
                                ? 'w-10 bg-[#d9784b]'
                                : 'w-4 bg-[#f7f4ee]/20 hover:bg-[#f7f4ee]/40'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={nextSlide}
                        aria-label="Next promotion"
                        className="flex h-9 w-9 items-center justify-center border border-[#f7f4ee]/20 text-[#f7f4ee]/60 transition-colors hover:border-[#f7f4ee]/60 hover:text-[#f7f4ee]"
                      >
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="order-1 lg:order-2">
                <div className="relative">
                  <div
                    className="absolute -inset-3 border border-[#f7f4ee]/10"
                    aria-hidden="true"
                  />

                  <div className="relative overflow-hidden bg-[#24211d]">
                    <AnimatePresence mode="wait">
                      {currentSlide.image ? (
                        <motion.img
                          key={currentSlide.id}
                          src={currentSlide.image}
                          alt={currentSlide.title}
                          initial={{ opacity: 0, scale: 1.03 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.99 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ) : (
                        <motion.div
                          key={`${currentSlide.id}-placeholder`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex aspect-[4/3] w-full items-center justify-center bg-[#24211d] p-8 text-center"
                        >
                          <span className="max-w-md font-serif text-3xl font-semibold text-[#f7f4ee]/80 sm:text-4xl">
                            {currentSlide.title}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl">
              <h1 className="font-serif text-6xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
                Objects
                <br />
                <span className="text-[#d9784b]">worth keeping.</span>
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-[#f7f4ee]/55 sm:text-xl">
                Studio-crafted precision 3D printing. From personalized pieces to functional objects, we turn ideas into things worth keeping.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link to="/catalog" className="inline-flex">
                  <Button
                    size="lg"
                    className="w-full rounded-2xl bg-[#b4491e] px-10 py-4 text-sm hover:bg-[#963c18] sm:w-auto"
                  >
                    Explore collection
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>

                <Link to="/custom-service" className="inline-flex">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-2xl border-[#f7f4ee]/25 bg-transparent px-10 py-4 text-sm text-[#f7f4ee] hover:bg-[#f7f4ee] hover:text-[#171512] sm:w-auto"
                  >
                    Start a custom print
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          TRUST STRIP
      ====================================================== */}
      <section className="border-b border-[#ded8ce] bg-[#f7f4ee]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#ded8ce] md:grid-cols-4">
          {[
            {
              icon: PenTool,
              title: 'Studio Crafted',
              description: 'Attention to every detail',
            },
            {
              icon: ShieldCheck,
              title: 'Quality Assured',
              description: 'Checked before dispatch',
            },
            {
              icon: Star,
              title: 'Premium PLA',
              description: 'Reliable, durable materials',
            },
            {
              icon: Truck,
              title: 'Pan-India',
              description: 'Safe delivery across India',
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex items-center gap-3 px-5 py-6 sm:px-8 lg:px-10"
              >
                <Icon
                  className="h-5 w-5 shrink-0 text-[#b4491e]"
                  aria-hidden="true"
                />

                <div>
                  <p className="font-serif text-sm font-semibold">
                    {item.title}
                  </p>

                  <p className="mt-0.5 text-[11px] text-[#7d756c]">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          FEATURED PRODUCTS
      ====================================================== */}
      <section
        className="border-b border-[#ded8ce] py-16 lg:py-24"
        aria-labelledby="featured-products-heading"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b4491e]">
                From the shelf
              </p>

              <h2
                id="featured-products-heading"
                className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl"
              >
                Pieces we keep stocked.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-[#746c63]">
                Designed, printed and packed with care.
                Explore pieces currently available from
                the Shilp Sahayak collection.
              </p>
            </div>

            <Link
              to="/catalog"
              className="inline-flex shrink-0 items-center gap-2 self-start border-b border-[#171512] pb-1 text-sm font-medium transition-colors hover:border-[#b4491e] hover:text-[#b4491e] sm:self-auto"
            >
              View collection
              <ArrowRight
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-10" role="status" aria-label="Loading featured products">
              <FeaturedProductSkeleton />
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="mt-10 border border-dashed border-[#d5cec3] py-16 text-center">
              <p className="text-sm text-[#746c63]">
                No featured products yet.
              </p>

              <p className="mt-2 text-xs text-[#968d83]">
                Mark products as Featured in Admin to
                display them here.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">

              {/* Large featured piece */}
              {featuredProducts[0] && (
                <Link
                  to={`/product/${featuredProducts[0].id}`}
                  className="group"
                >
                  <div className="relative overflow-hidden bg-[#e9e3d9]">
                    <img
                      src={featuredProducts[0].image}
                      alt={featuredProducts[0].name}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/55">
                        Featured
                      </p>

                      <h3 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">
                        {featuredProducts[0].name}
                      </h3>

                      <div className="mt-3 flex items-center justify-end">
                        <span className="flex items-center gap-2 text-sm">
                          View piece
                          <ArrowRight
                            className="h-4 w-4 transition-transform group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Supporting pieces */}
              <div className="grid grid-cols-2 gap-5">
                {featuredProducts
                  .slice(1, 3)
                  .map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="group"
                    >
                      <Card className="h-full overflow-hidden rounded-none border-[#ded8ce] bg-white shadow-none">
                        <div className="overflow-hidden bg-[#e9e3d9]">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                          />
                        </div>

                        <div className="p-4 sm:p-5">
                          <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#958c81]">
                            {product.category}
                          </p>

                          <h3 className="mt-2 line-clamp-2 font-serif text-lg font-semibold">
                            {product.name}
                          </h3>

                          <p className="mt-3 text-sm font-medium text-[#b4491e]">
                            ₹
                            {product.price.toLocaleString(
                              'en-IN'
                            )}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          PROCESS
      ====================================================== */}
      <section className="bg-[#171512] py-16 text-[#f7f4ee] lg:py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">

          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d9784b]">
                How it works
              </p>

              <h2 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl">
                From digital model
                <br />
                to physical object.
              </h2>
            </div>

            <p className="max-w-xl text-sm leading-7 text-[#f7f4ee]/50">
              Every piece moves through a controlled
              workflow designed around precision, material
              quality and careful finishing.
            </p>
          </div>

          <div className="mt-12 grid border-y border-[#f7f4ee]/10 md:grid-cols-3">
            {[
              {
                number: '01',
                title: 'Choose',
                text: 'Pick a design from the collection or start with your own idea.',
              },
              {
                number: '02',
                title: 'Print',
                text: 'Your piece is produced using calibrated 3D printing equipment.',
              },
              {
                number: '03',
                title: 'Deliver',
                text: 'We inspect, pack and ship the finished object safely.',
              },
            ].map((step, index) => (
              <div
                key={step.number}
                className={`py-8 md:px-8 ${
                  index !== 0
                    ? 'border-t border-[#f7f4ee]/10 md:border-l md:border-t-0'
                    : ''
                }`}
              >
                <span className="font-mono text-[10px] text-[#d9784b]">
                  {step.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl font-semibold">
                  {step.title}
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-[#f7f4ee]/45">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          MATERIALS
      ====================================================== */}
      <section className="border-b border-[#ded8ce] py-16 lg:py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b4491e]">
                Material matters
              </p>

              <h2 className="mt-3 max-w-xl font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                Built around reliable materials.
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-[#746c63]">
                We focus on practical materials and
                controlled printing parameters so the
                finished object looks good and holds up to
                everyday use.
              </p>
            </div>

            <div className="grid gap-px border border-[#ded8ce] bg-[#ded8ce] sm:grid-cols-2">
              {[
                'Consistent print quality',
                'Reliable layer adhesion',
                'Clean surface finish',
                'Practical material selection',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 bg-[#f7f4ee] p-5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#171512] text-[#d9784b]">
                    <Check
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </span>

                  <span className="text-sm font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CATEGORIES
      ====================================================== */}
      <section
        className="py-16 lg:py-20"
        aria-labelledby="categories-heading"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b4491e]">
                Explore
              </p>

              <h2
                id="categories-heading"
                className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl"
              >
                Shop by category.
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {categories.length > 0 && (
                <div className="hidden items-center gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => scrollCategories('left')}
                    aria-label="Scroll categories left"
                    className="flex h-9 w-9 items-center justify-center border border-[#ded8ce] text-[#746c63] transition-colors hover:border-[#b4491e] hover:text-[#b4491e]"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCategories('right')}
                    aria-label="Scroll categories right"
                    className="flex h-9 w-9 items-center justify-center border border-[#ded8ce] text-[#746c63] transition-colors hover:border-[#b4491e] hover:text-[#b4491e]"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#746c63] hover:text-[#b4491e]"
              >
                Browse everything
                <ChevronRight
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-9" role="status" aria-label="Loading categories">
              <CategoryGridSkeleton />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#746c63]">
              No categories available yet.
            </div>
          ) : (
            <div
              ref={categoryScrollRef}
              className="mt-9 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {categories.map((category) => (
                <Link
                  key={category.name}
                  to={`/catalog?category=${encodeURIComponent(
                    category.name
                  )}`}
                  className="group w-[45%] shrink-0 snap-start sm:w-[31%] lg:w-[23%]"
                >
                  <div className="relative overflow-hidden bg-[#ded8ce]">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                      <p className="font-serif text-lg font-semibold text-white sm:text-xl">
                        {category.name}
                      </p>

                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/60 transition-colors group-hover:text-white">
                        Explore
                        <ArrowRight
                          className="h-3 w-3 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          CUSTOM PRINT CTA
      ====================================================== */}
      <section className="border-y border-[#ded8ce] bg-[#ebe5db]">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-2">

          <div className="px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b4491e]">
              Have something else in mind?
            </p>

            <h2 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
              Bring your own model to life.
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-[#746c63]">
              Upload your 3D model and tell us what you
              need. We'll review the requirements and
              prepare a quote for your custom print.
            </p>

            <Link
              to="/custom-service"
              className="mt-8 inline-flex"
            >
              <Button
                size="lg"
                className="group bg-[#171512] px-7 hover:bg-[#2b2824]"
              >
                Start a custom print
                <ArrowRight
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Button>
            </Link>
          </div>

          <div className="relative min-h-[320px] overflow-hidden bg-[#171512]">
            <div
              className="absolute inset-0 opacity-[0.08]"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, #f7f4ee 1px, transparent 1px), linear-gradient(#f7f4ee 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />

            <div className="relative flex h-full items-center justify-center p-10">
              <div className="max-w-sm border border-[#f7f4ee]/15 p-7">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#d9784b]">
                  Custom service
                </p>

                <p className="mt-4 font-serif text-2xl font-semibold text-[#f7f4ee]">
                  Your file.
                  <br />
                  Our printer.
                  <br />
                  One finished piece.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SELECTED PRODUCTS
      ====================================================== */}
      <section
        className="border-b border-[#ded8ce] py-16 lg:py-20"
        aria-labelledby="selected-products-heading"
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">

          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b4491e]">
                Also worth a look
              </p>

              <h2
                id="selected-products-heading"
                className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl"
              >
                More from the workshop.
              </h2>
            </div>

            <Link
              to="/catalog"
              className="hidden items-center gap-2 text-sm font-medium hover:text-[#b4491e] sm:inline-flex"
            >
              All products
              <ArrowRight
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-9" role="status" aria-label="Loading workshop products">
              <WorkshopProductSkeleton />
            </div>
          ) : selectedProducts.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#746c63]">
              No products available yet.
            </div>
          ) : (
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {selectedProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group"
                >
                  <Card className="h-full overflow-hidden rounded-none border-[#ded8ce] bg-white shadow-none transition-shadow duration-300 hover:shadow-[0_12px_35px_rgba(23,21,18,0.08)]">
                    <div className="relative overflow-hidden bg-[#e9e3d9]">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                      />

                      {product.isCustomizable && (
                        <span className="absolute left-3 top-3 flex items-center gap-1.5 border border-white/20 bg-[#171512]/85 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                          <Sparkles
                            className="h-3 w-3 text-[#d9784b]"
                            aria-hidden="true"
                          />
                          Personalise
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#958c81]">
                        {product.category}
                      </p>

                      <h3 className="mt-2 line-clamp-2 font-serif text-lg font-semibold leading-snug">
                        {product.name}
                      </h3>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-medium text-[#b4491e]">
                          ₹
                          {product.price.toLocaleString(
                            'en-IN'
                          )}
                        </span>

                        <ArrowRight
                          className="h-4 w-4 text-[#958c81] transition-all group-hover:translate-x-1 group-hover:text-[#b4491e]"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 sm:hidden">
            <Link to="/catalog">
              <Button
                variant="outline"
                className="w-full border-[#cfc7bb]"
              >
                View all products
                <ArrowRight
                  className="ml-2 h-4 w-4"
                  aria-hidden="true"
                />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          FINAL CTA
      ====================================================== */}
      <section className="bg-[#171512] px-5 py-16 text-center text-[#f7f4ee] sm:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d9784b]">
            Start creating
          </p>

          <h2 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Made for your idea.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#f7f4ee]/50">
            Browse the collection or send us your model
            for a custom print.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/catalog">
              <Button
                size="lg"
                className="w-full bg-[#b4491e] px-8 hover:bg-[#963c18] sm:w-auto"
              >
                Shop the collection
              </Button>
            </Link>

            <Link to="/custom-service">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-[#f7f4ee]/25 bg-transparent px-8 text-[#f7f4ee] hover:bg-[#f7f4ee] hover:text-[#171512] sm:w-auto"
              >
                Request a custom print
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}