import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
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
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  /* 3D Tilt Values */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 260 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

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
      className={`group/card flex flex-col h-full touch-manipulation select-none perspective-1000 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        ref={cardRef}
        style={{
          rotateX: prefersReducedMotion ? 0 : rotateX,
          rotateY: prefersReducedMotion ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="h-full"
      >
        <Card className="flex h-full flex-col justify-between overflow-hidden transition-all duration-300 group-hover/card:-translate-y-2 group-hover/card:shadow-2xl group-hover/card:border-accent/40 border-line bg-white rounded-2xl">
          {/* Image Container with Shimmer Sweep */}
          <div className="relative aspect-square w-full overflow-hidden bg-shell shine-sweep-container">
            <img
              src={displayImage}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105"
            />

            {/* Badges Overlay */}
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
              {product.isCustomizable && (
                <span className="inline-flex items-center gap-1 rounded-md bg-black/80 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm shadow-xs border border-white/10">
                  <Sparkles className="w-2.5 h-2.5 text-accent" />
                  Custom
                </span>
              )}
              {product.featured && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white shadow-xs">
                  Featured
                </span>
              )}
            </div>

            {/* Discount Badge */}
            {discountPercent > 0 && (
              <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[9px] font-bold text-white shadow-xs">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Product Details Content */}
          <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted truncate">
                  {product.category || 'Precision 3D'}
                </span>
                <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="font-mono text-[10px] font-bold">4.9</span>
                </div>
              </div>
              <h3 className="font-display text-sm font-bold text-ink line-clamp-1 group-hover/card:text-accent transition-colors">
                {product.name}
              </h3>
            </div>

            {/* Price & Action Row */}
            <div className="space-y-2.5 pt-1 border-t border-line/60">
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-sm sm:text-base font-bold text-ink">
                  ₹{regularPrice.toLocaleString('en-IN')}
                </span>
                {compareAtPrice > regularPrice && (
                  <span className="text-[11px] text-muted line-through">
                    ₹{compareAtPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {/* Action Buttons: Add & Buy */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className="flex items-center justify-center gap-1 h-8 rounded-lg border border-line bg-shell/80 font-sans text-xs font-semibold text-ink hover:bg-ink hover:text-white hover:border-ink active:scale-95 transition-all duration-150 cursor-pointer"
                  title="Add to cart"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex items-center justify-center gap-1 h-8 rounded-lg bg-accent text-white font-sans text-xs font-semibold shadow-xs hover:bg-accent-hover active:scale-95 transition-all duration-150 cursor-pointer"
                  title="Buy now"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Buy</span>
                </button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  );
}
