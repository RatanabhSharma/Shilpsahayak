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
      <section className="relative overflow-hidden bg-surface-dark py-20 sm:py-28">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#c98a1e 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        ></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {slideCount > 0 && currentSlide ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Text side */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-xs uppercase tracking-widest text-brand-500 font-semibold mb-4">
                    Featured &middot; {currentSlide.category}
                  </p>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-charcoal leading-tight mb-6">
                    {currentSlide.name}
                  </h1>
                  <p className="text-lg text-charcoal-light mb-8 max-w-xl leading-relaxed">
                    {currentSlide.description ||
                      'Studio-crafted precision 3D printing, made to order.'}
                  </p>
                  <div className="flex items-center gap-4 mb-8">
                    <span className="text-2xl font-semibold text-brand-600">
                      ₹{currentSlide.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to={`/product/${currentSlide.id}`}>
                      <Button size="lg" className="w-full sm:w-auto">
                        Shop This Piece
                      </Button>
                    </Link>
                    <Link to="/catalog">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto bg-white/50 backdrop-blur-sm"
                      >
                        Explore Catalog
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Image side */}
              <div className="relative">
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xl">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentSlide.id}
                      src={currentSlide.image}
                      alt={currentSlide.name}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </AnimatePresence>
                </div>

                {/* Nav arrows */}
                {slideCount > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      aria-label="Previous slide"
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-charcoal" />
                    </button>
                    <button
                      onClick={nextSlide}
                      aria-label="Next slide"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 text-charcoal" />
                    </button>
                  </>
                )}

                {/* Dots */}
                {slideCount > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    {featuredProducts.map((p, i) => (
                      <button
                        key={p.id}
                        onClick={() => goToSlide(i)}
                        aria-label={`Go to slide ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          i === slideIndex
                            ? 'w-6 bg-brand-500'
                            : 'w-1.5 bg-charcoal/20'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-charcoal leading-tight mb-6">
                Memories, Illuminated. <br />
                <span className="text-brand-500 italic">Gifts, Re-imagined.</span>
              </h1>
              <p className="text-lg sm:text-xl text-charcoal-light mb-10 max-w-2xl leading-relaxed">
                Studio-crafted precision 3D printing. From personalized lithophane
                lamps to bespoke decor, we turn your ideas into heirloom-quality
                physical objects.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/catalog">
                  <Button size="lg" className="w-full sm:w-auto">
                    Explore Catalog
                  </Button>
                </Link>
                <Link to="/custom-service">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto bg-white/50 backdrop-blur-sm"
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