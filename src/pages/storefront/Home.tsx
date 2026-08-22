import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Star,
  ShieldCheck,
  Truck,
  PenTool,
  Loader2
} from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { Button, Card } from '../../components/ui';

export function Home() {
  const { data: products = [], isLoading } = useProducts();

  const activeProducts = useMemo(
    () => products.filter((p) => p.active !== false),
    [products]
  );

  const featuredProducts = useMemo(
    () => activeProducts.filter((p) => p.featured).slice(0, 4),
    [activeProducts]
  );

  // Categories are derived live from real products - never hardcoded.
  // Each category tile shows a real photo from a real product in that category,
  // so updating the Shop automatically updates the Home page too.
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of activeProducts) {
      if (product.category && !map.has(product.category)) {
        map.set(product.category, product.image);
      }
    }
    return Array.from(map.entries()).map(([name, image]) => ({ name, image }));
  }, [activeProducts]);

  const [slideIndex, setSlideIndex] = useState(0);
  const slideCount = featuredProducts.length;

  useEffect(() => {
    if (slideCount === 0) return;
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slideCount);
    }, 5000);
    return () => clearInterval(timer);
  }, [slideCount]);

  useEffect(() => {
    if (slideIndex >= slideCount) setSlideIndex(0);
  }, [slideCount, slideIndex]);

  const goToSlide = (i: number) => setSlideIndex(i);
  const nextSlide = () => setSlideIndex((i) => (i + 1) % slideCount);
  const prevSlide = () => setSlideIndex((i) => (i - 1 + slideCount) % slideCount);

  const currentSlide = featuredProducts[slideIndex];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
     {/* Hero Section */}
<section className="relative overflow-hidden bg-surface-dark min-h-[680px] flex items-center">

  {/* Background Pattern */}
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.08]"
    style={{
      backgroundImage:
        'radial-gradient(#c98a1e 1px, transparent 1px)',
      backgroundSize: '28px 28px'
    }}
  />

  {/* Decorative Glow */}
  <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
  <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-3xl pointer-events-none" />

  <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10 py-16 lg:py-20">

    {slideCount > 0 && currentSlide ? (

      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center">

        {/* =========================
            LEFT — PRODUCT CONTENT
        ========================== */}
        <AnimatePresence mode="wait">

          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{
              duration: 0.45,
              ease: 'easeOut'
            }}
            className="order-2 lg:order-1"
          >

            {/* Category */}
            <div className="flex items-center gap-3 mb-6">

              <span className="inline-flex items-center rounded-full bg-brand-500/10 border border-brand-500/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">
                Featured
              </span>

              <span className="h-px w-8 bg-brand-300" />

              <span className="text-xs uppercase tracking-[0.16em] text-charcoal-lighter">
                {currentSlide.category}
              </span>

            </div>

            {/* Product Name */}
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-charcoal leading-[0.95] tracking-tight mb-6 max-w-xl">
              {currentSlide.name}
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-charcoal-light leading-relaxed max-w-lg mb-8">
              {currentSlide.description ||
                'Studio-crafted precision 3D printing, made to order.'}
            </p>

            {/* Price */}
            <div className="mb-9">

              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-lighter mb-2">
                Starting from
              </p>

              <span className="font-serif text-3xl sm:text-4xl font-semibold text-brand-600">
                ₹{currentSlide.price.toLocaleString('en-IN')}
              </span>

            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">

              <Link
                to={`/product/${currentSlide.id}`}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-8 group"
                >
                  Shop This Piece
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link
                to="/catalog"
                className="w-full sm:w-auto"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-8 bg-white/60 backdrop-blur-sm"
                >
                  Explore Catalog
                </Button>
              </Link>

            </div>

            {/* Slide Counter */}
            {slideCount > 1 && (
              <div className="flex items-center gap-4 mt-10">

                <span className="text-xs font-medium text-charcoal-light">
                  {String(slideIndex + 1).padStart(2, '0')}
                </span>

                <div className="w-20 h-px bg-charcoal/15 relative overflow-hidden">
                  <motion.div
                    key={currentSlide.id}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{
                      duration: 5,
                      ease: 'linear'
                    }}
                    className="absolute inset-y-0 left-0 bg-brand-500"
                  />
                </div>

                <span className="text-xs text-charcoal-lighter">
                  {String(slideCount).padStart(2, '0')}
                </span>

              </div>
            )}

          </motion.div>

        </AnimatePresence>


        {/* =========================
            RIGHT — PRODUCT IMAGE
        ========================== */}
        <div className="relative order-1 lg:order-2">

          {/* Decorative Frame */}
          <div className="absolute -inset-3 rounded-[2rem] border border-brand-200/50 pointer-events-none" />

          <div className="relative">

            {/* Image */}
            <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] rounded-[1.75rem] overflow-hidden bg-white shadow-2xl">

              <AnimatePresence mode="wait">

                <motion.img
                  key={currentSlide.id}
                  src={currentSlide.image}
                  alt={currentSlide.name}
                  initial={{
                    opacity: 0,
                    scale: 1.08
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.98
                  }}
                  transition={{
                    duration: 0.55,
                    ease: 'easeOut'
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />

              </AnimatePresence>

              {/* Image Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

              {/* Price Badge */}
              <motion.div
                key={`price-${currentSlide.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg"
              >

                <p className="text-[10px] uppercase tracking-[0.15em] text-charcoal-lighter">
                  From
                </p>

                <p className="font-serif text-lg font-semibold text-brand-600">
                  ₹{currentSlide.price.toLocaleString('en-IN')}
                </p>

              </motion.div>

            </div>


            {/* Previous */}
            {slideCount > 1 && (
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous featured product"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm shadow-lg flex items-center justify-center text-charcoal hover:bg-brand-500 hover:text-white transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {/* Next */}
            {slideCount > 1 && (
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next featured product"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 backdrop-blur-sm shadow-lg flex items-center justify-center text-charcoal hover:bg-brand-500 hover:text-white transition-all duration-200"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

          </div>


          {/* Slide Indicators */}
          {slideCount > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">

              {featuredProducts.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to featured product ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === slideIndex
                      ? 'w-10 bg-brand-500'
                      : 'w-2 bg-charcoal/20 hover:bg-charcoal/40'
                  }`}
                />
              ))}

            </div>
          )}

        </div>

      </div>

    ) : (

      /* =========================
         FALLBACK HERO
      ========================== */
      <div className="max-w-3xl">

        <div className="inline-flex items-center gap-3 mb-6">

          <span className="h-px w-8 bg-brand-500" />

          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-brand-600">
            Made in India
          </span>

        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-charcoal leading-[0.95] mb-7">
          Memories,
          <br />
          <span className="text-brand-500 italic">
            Illuminated.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-charcoal-light mb-10 max-w-2xl leading-relaxed">
          Studio-crafted precision 3D printing.
          From personalized lithophane lamps to
          bespoke decor, we turn your ideas into
          physical objects worth keeping.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">

          <Link to="/catalog">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8"
            >
              Explore Catalog
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>

          <Link to="/custom-service">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 bg-white/50 backdrop-blur-sm"
            >
              Request Custom Piece
            </Button>
          </Link>

        </div>

      </div>

    )}

  </div>
</section>
      {/* Trust Badges */}
      <section className="border-y border-brand-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                icon: PenTool,
                title: 'Studio-Crafted',
                desc: 'Artisan attention to detail'
              },
              {
                icon: ShieldCheck,
                title: 'Premium PLA',
                desc: 'Eco-friendly & durable'
              },
              {
                icon: Star,
                title: 'Quality Assured',
                desc: 'Rigorous print checks'
              },
              {
                icon: Truck,
                title: 'Pan-India Shipping',
                desc: 'Safe & secure delivery'
              }
            ].map((badge, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 mb-4">
                  <badge.icon className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-semibold text-charcoal mb-1">
                  {badge.title}
                </h3>
                <p className="text-xs text-charcoal-lighter">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories - derived live from real products, always in sync with the Shop */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-4">
              Shop by category
            </h2>
            <p className="text-charcoal-light">
              Explore our collection of studio-crafted items
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16 text-charcoal-light">
              No products yet. Add products in Admin to see categories here.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                  className="group block"
                >
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/5] mb-4 bg-surface-dark">
                    <div className="absolute inset-0 bg-charcoal/20 group-hover:bg-transparent transition-colors duration-300 z-10" />
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <h3 className="font-serif font-medium text-lg text-charcoal text-center group-hover:text-brand-500 transition-colors">
                    {cat.name}
                  </h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-4">
                Studio Favorites
              </h2>
              <p className="text-charcoal-light">
                Our most loved crafted pieces
              </p>
            </div>
            <Link
              to="/catalog"
              className="hidden sm:flex items-center text-brand-600 hover:text-brand-700 font-medium"
            >
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-16 text-charcoal-light">
              No featured products yet. Mark some products as "Featured" in Admin.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group block"
                >
                  <Card className="h-full border-transparent hover:border-brand-200 transition-all duration-300 hover:shadow-xl">
                    <div className="relative aspect-square overflow-hidden bg-surface-dark">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.isCustomizable && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                          Personalise
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <p className="text-xs text-charcoal-lighter mb-2 uppercase tracking-wider">
                        {product.category}
                      </p>
                      <h3 className="font-serif font-semibold text-charcoal text-lg mb-2 line-clamp-1 group-hover:text-brand-500 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <p className="text-brand-600 font-medium">
                          ₹{product.price.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link to="/catalog">
              <Button variant="outline" className="w-full">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}