import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Sparkles, Star, Zap } from 'lucide-react';
import { CartItem, Product, useStore } from '../../store';
import { Card } from '../ui';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className = '' }: ProductCardProps) {
  const addToCart = useStore((state) => state.addToCart);
  const setPurchaseMode = useStore((state) => state.setPurchaseMode);
  const setBuyNowItem = useStore((state) => state.setBuyNowItem);
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const getProductPrices = () => {
    let price = Number(product.price) || 0;
    let originalPrice = Number(product.originalPrice) || 0;
    let hasVariantPrices = false;

    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const activeVariants = product.variants.filter((v) => Number(v.price) > 0);
      if (activeVariants.length > 0) {
        const sortedVariants = [...activeVariants].sort((a, b) => a.price - b.price);
        price = sortedVariants[0].price;
        originalPrice = sortedVariants[0].originalPrice || price;
        hasVariantPrices = true;
      }
    }

    return { price, originalPrice, hasVariantPrices };
  };

  const { price: regularPrice, originalPrice: compareAtPrice, hasVariantPrices } = getProductPrices();

  const discountPercent =
    compareAtPrice > regularPrice && compareAtPrice > 0
      ? Math.round(((compareAtPrice - regularPrice) / compareAtPrice) * 100)
      : 0;

  const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1581291518655-9523c932deda?auto=format&fit=crop&w=800&q=80';

  const getCleanImage = (url?: string | null) => {
    if (!url || typeof url !== 'string') return FALLBACK_IMAGE;
    const trimmed = url.trim();
    if (trimmed.startsWith('blob:') || trimmed.startsWith('local:')) return FALLBACK_IMAGE;
    return trimmed;
  };

  const primaryImage = getCleanImage(product.image);
  const secondaryImage =
    product.images && product.images.length > 0
      ? getCleanImage(
          product.images[0] !== product.image ? product.images[0] : product.images[1]
        )
      : primaryImage;

  const displayImage = isHovered ? secondaryImage : primaryImage;

  const cart = useStore((state) => state.cart);
  const cartItem = cart.find((item) => item.product.id === product.id);
  const cartQuantity = cartItem ? cartItem.quantity : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const activeVariants = product.hasVariants && product.variants ? product.variants.filter((v) => Number(v.price) > 0) : [];
    const firstVariant = activeVariants.length > 0 ? [...activeVariants].sort((a, b) => a.price - b.price)[0] : product.variants?.[0];

    const buyNowItem: CartItem = {
      product: {
        ...product,
        price: regularPrice,
        image: primaryImage,
      },
      quantity: 1,
      variantId: firstVariant?.id,
      variantLabel: firstVariant?.label,
    };
    
    setPurchaseMode('buy_now');
    setBuyNowItem(buyNowItem);
    navigate('/checkout', { state: { buyNowItem } });
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className={`group/card flex flex-col h-full touch-manipulation select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="flex h-full flex-col justify-between overflow-hidden transition-transform transition-shadow duration-300 group-hover/card:-translate-y-1.5 group-hover/card:shadow-solid-lg group-hover/card:border-accent/40 border border-ink/80 sm:border-2 sm:border-ink bg-white rounded-xl sm:rounded-2xl shadow-solid-sm hover:will-change-transform">
          {/* Image Container with Shimmer Sweep */}
          <div className="relative aspect-square w-full overflow-hidden bg-shell shine-sweep-container">
            <img
              src={displayImage}
              alt={product.name}
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallbackApplied) return;
                img.dataset.fallbackApplied = 'true';
                img.src = FALLBACK_IMAGE;
              }}
              className="h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105"
            />

            {/* Badges Overlay */}
            <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 flex flex-wrap gap-1 items-start z-10 max-w-[calc(100%-48px)]">
              {product.isCustomizable && (
                <span className="inline-flex items-center gap-0.5 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm shadow-xs border border-white/10">
                  <Sparkles className="w-2.5 h-2.5 text-accent" />
                  Custom
                </span>
              )}
              {product.featured && (
                <span className="inline-flex items-center rounded bg-accent px-2 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                  Featured
                </span>
              )}
            </div>

            {/* Discount Badge */}
            {discountPercent > 0 && (
              <span className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 rounded bg-emerald-600 px-2 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-white shadow-xs">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Product Details Content */}
          <div className="flex flex-1 flex-col justify-between p-3 sm:p-4 space-y-2 sm:space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-mono text-[11px] sm:text-xs uppercase tracking-wider text-muted truncate font-medium">
                  {product.category || 'Precision 3D'}
                </span>
                <div className="flex items-center gap-1 text-amber-500 shrink-0">
                  {product.reviewCount ? (
                    <>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-mono text-[11px] sm:text-xs font-bold text-ink">{product.averageRating?.toFixed(1) || '0.0'} ({product.reviewCount})</span>
                    </>
                  ) : null}
                </div>
              </div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-ink line-clamp-2 min-h-[2.2rem] sm:min-h-[2.5rem] group-hover/card:text-accent transition-colors leading-snug">
                {product.name}
              </h3>
            </div>

            {/* Price & Action Row */}
            <div className="mt-auto space-y-2.5 sm:space-y-3 pt-2 sm:pt-3 border-t border-line/60">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono">
                <span className="text-sm sm:text-base font-bold text-ink whitespace-nowrap">
                  {hasVariantPrices && <span className="text-xs text-muted font-normal mr-1">From</span>}
                  ₹{regularPrice.toLocaleString('en-IN')}
                </span>
                {compareAtPrice > regularPrice && (
                  <span className="text-xs sm:text-[13px] text-muted line-through whitespace-nowrap">
                    ₹{compareAtPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 sm:mt-3">
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className="flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[38px] w-full rounded-xl border border-line bg-white font-sans text-xs font-bold text-ink hover:bg-shell active:scale-95 transition-all duration-150 cursor-pointer shadow-solid-sm px-2"
                  title={cartQuantity > 0 ? 'Increase quantity' : 'Add to cart'}
                >
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{cartQuantity > 0 ? `IN (${cartQuantity})` : 'ADD'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[38px] w-full rounded-xl bg-accent text-white font-sans text-xs font-bold shadow-solid-sm hover:bg-accent-hover active:scale-95 transition-all duration-150 cursor-pointer px-2"
                  title="Buy now"
                >
                  <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>BUY</span>
                </button>
              </div>
            </div>
          </div>
        </Card>
    </Link>
  );
}



