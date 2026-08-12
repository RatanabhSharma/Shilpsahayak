import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
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

  const featuredProducts = products
    .filter((p) => p.featured && p.active !== false)
    .slice(0, 4);

  const categories = [
    {
      name: 'Lamps',
      image:
        'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=400'
    },
    {
      name: 'Vases',
      image:
        'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=400'
    },
    {
      name: 'Decor',
      image:
        'https://images.unsplash.com/photo-1584589167171-541ce45f1eea?auto=format&fit=crop&q=80&w=400'
    },
    {
      name: 'Keychains',
      image:
        'https://5.imimg.com/data5/SELLER/Default/2024/4/409600524/VJ/WW/OL/83399193/3d-silicone-keychain-stylish-one-piece-anime-keychain-collection.jpeg'
    },
    {
      name: 'Idols',
      image:
        'https://images.unsplash.com/photo-1580130379624-3a06943c6462?auto=format&fit=crop&q=80&w=400'
    },
    {
      name: 'Custom & Personalised',
      image:
        'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=400'
    },
    {
      name: 'Lithophanes',
      image:
        'https://images.unsplash.com/photo-1516589178581-6cd7853d1152?auto=format&fit=crop&q=80&w=400'
    }
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-surface-dark py-20 sm:py-32">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#c98a1e 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        ></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-charcoal leading-tight mb-6"
            >
              Memories, Illuminated. <br />
              <span className="text-brand-500 italic">Gifts, Re-imagined.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg sm:text-xl text-charcoal-light mb-10 max-w-2xl leading-relaxed"
            >
              Studio-crafted precision 3D printing. From personalized lithophane
              lamps to bespoke decor, we turn your ideas into heirloom-quality
              physical objects.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4"
            >
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
            </motion.div>
          </div>
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

      {/* Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-4">
              Choose your piece
            </h2>
            <p className="text-charcoal-light">
              Explore our collection of studio-crafted items
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((cat, i) => (
              <Link
                key={i}
                to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                className="group block"
              >
                <div className="relative rounded-2xl overflow-hidden aspect-[4/5] mb-4">
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
        </div>
      </section>

      {/* Gift For Collections */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-4">
              Gift For
            </h2>
            <p className="text-charcoal-light">
              Find the perfect crafted piece for every occasion
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Personalised',
                img: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=600',
                link: '/catalog?category=Custom+%26+Personalised'
              },
              {
                name: 'Couples',
                img: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=600',
                link: '/catalog?occasion=Couples'
              },
              {
                name: 'Home & Interior',
                img: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=600',
                link: '/catalog?category=Decor'
              }
            ].map((col, i) => (
              <Link
                key={i}
                to={col.link}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3]"
              >
                <img
                  src={col.img}
                  alt={col.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-charcoal/30 group-hover:bg-charcoal/40 transition-colors flex items-center justify-center">
                  <h3 className="font-serif text-2xl font-bold text-white">
                    {col.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
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
              No featured products yet. Mark some products as “Featured” in Admin.
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

      {/* Custom Order Teaser + Testimonials remain the same */}
      {/* You can keep the rest of the original sections as they are */}
    </div>
  );
}