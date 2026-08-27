import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Sparkles, Star, Zap } from 'lucide-react';
import { Product, useStore } from '../../store';
import { Card } from '../ui';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className = '' }: ProductCardProps) {
  const addToCart = useStore((state) => state.addToCart);
  const openCart = useStore((state) => state.openCart);
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const regularPrice = Number(product.price) || 0;
  const compareAtPrice = Number(product.originalPrice) || 0;
  const discountPercent =
    compareAtPrice > regularPrice && compareAtPrice > 0
      ? Math.round(((compareAtPrice - regularPrice) / compareAtPrice) * 100)
      : 0;

  const primaryImage =
    product.image ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
  const secondaryImage =
    product.images && product.images.length > 0
      ? product.images[0] !== primaryImage
        ? product.images[0]
        : product.images[1] || primaryImage
      : primaryImage;

  const displayImage = isHovered ? secondaryImage : primaryImage;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    openCart();
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    navigate('/checkout');
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className={`group flex flex-col h-full touch-manipulation select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="flex h-full flex-col justify-between overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-card group-hover:border-accent/40 border-line bg-white rounded-2xl">
        {/* Image Container */}
        <div className="relative aspect-square w-full overflow-hidden bg-shell">
          <img
            src={displayImage}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'true';
                target.src =
                  'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=600';
              }
            }}
          />

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex flex-col gap-1 z-10">
            {product.isCustomizable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-dark/85 backdrop-blur-sm px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-accent" />
                Custom
              </span>
            )}
            {product.featured && (
              <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                Featured
              </span>
            )}
          </div>

          {discountPercent > 0 && (
            <span className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white shadow-xs z-10">
              Save {discountPercent}%
            </span>
          )}
        </div>

        {/* Content Details */}
        <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="font-mono text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted truncate">
                {product.category || 'Workshop Item'}
              </span>
              <div className="flex items-center gap-0.5 shrink-0 text-amber-500 font-mono text-[10px] sm:text-xs font-semibold">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>4.9</span>
              </div>
            </div>

            <h3 className="line-clamp-2 font-display text-xs sm:text-sm font-bold text-ink group-hover:text-accent transition-colors leading-snug min-h-[2.4em]">
              {product.name}
            </h3>
          </div>

          {/* Price & Action Strip */}
          <div className="mt-2.5 sm:mt-3 border-t border-line pt-2.5 sm:pt-3">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xs sm:text-sm md:text-base font-bold text-ink">
                  ₹{regularPrice.toLocaleString('en-IN')}
                </span>
                {compareAtPrice > regularPrice && (
                  <span className="font-mono text-[10px] sm:text-xs text-muted line-through">
                    ₹{compareAtPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <span className="font-mono text-[9px] sm:text-[10px] text-accent font-semibold hidden xs:inline">
                In Stock
              </span>
            </div>

            {/* Dual action buttons */}
            <div className="grid grid-cols-2 gap-1 sm:gap-2">
              <button
                type="button"
                onClick={handleQuickAdd}
                className="py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl border border-line bg-shell hover:bg-white hover:border-ink text-ink font-sans text-[10px] sm:text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs"
                title="Add to cart"
              >
                <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Add</span>
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl bg-accent hover:bg-accent-dark text-white font-sans text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs shadow-accent/20"
                title="Buy now"
              >
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white text-white shrink-0" />
                <span>Buy</span>
              </button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
