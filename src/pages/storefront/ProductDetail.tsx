import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  CheckCircle2,
  Layers,
  Box,
} from 'lucide-react';
import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  ProductVariant,
  useProducts,
} from '../../hooks/useProducts';
import { useStore } from '../../store';
import { useSettings } from '../../hooks/useSettings';
import {
  Button,
  Card,
  Badge,
  Textarea,
} from '../../components/ui';
import { ProductDetailSkeleton } from '../../components/loading/ProductSkeleton';

export function ProductDetail() {
  const { id } = useParams<{
    id: string;
  }>();

  const {
    data: products = [],
    isLoading,
    isError,
  } = useProducts();

  const { data: settings } = useSettings();
  const whatsappNumber = settings?.whatsappNumber || '919876543210';

  const addToCart = useStore((state) => state.addToCart);

  const product = products.find((item) => item.id === id);

  const hasVariants = Boolean(
    product?.hasVariants &&
      product.variants &&
      product.variants.length > 0
  );

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [customMode, setCustomMode] = useState<'text' | 'quote'>('text');
  const [added, setAdded] = useState(false);

  /* ----------------------------------------------------------
     Initialize Variant & Image
     ---------------------------------------------------------- */

  useEffect(() => {
    if (!product) return;

    if (hasVariants && product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      setSelectedVariant(firstVariant);
      setActiveImage(firstVariant.image || product.image);
      setQuantity(1);
      return;
    }

    setSelectedVariant(null);
    setActiveImage(product.image);
    setQuantity(1);
  }, [product, hasVariants]);

  /* ----------------------------------------------------------
     Gallery Images
     ---------------------------------------------------------- */

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const images = new Set<string>();

    if (product.image) images.add(product.image);
    product.images?.forEach((img) => img && images.add(img));
    product.variants?.forEach((v) => v.image && images.add(v.image));

    return Array.from(images);
  }, [product]);

  /* ----------------------------------------------------------
     Current State
     ---------------------------------------------------------- */

  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const outOfStock = currentStock <= 0;

  const whatsappInquiryLink = useMemo(() => {
    const text = encodeURIComponent(
      `Hello Shilp Sahayak! I have a question regarding "${product?.name || 'this piece'}" (₹${currentPrice}). Can you help?`
    );
    return `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${text}`;
  }, [product?.name, currentPrice, whatsappNumber]);

  /* ----------------------------------------------------------
     Related Products
     ---------------------------------------------------------- */

  const relatedProducts = useMemo(() => {
    if (!product) return [];

    const sameCategory = products.filter(
      (item) =>
        item.id !== product.id &&
        item.active !== false &&
        item.category === product.category
    );

    const otherProducts = products.filter(
      (item) =>
        item.id !== product.id &&
        item.active !== false &&
        item.category !== product.category
    );

    return [...sameCategory, ...otherProducts].slice(0, 3);
  }, [product, products]);

  /* ----------------------------------------------------------
     Handlers
     ---------------------------------------------------------- */

  const handleVariantSelect = (variant: ProductVariant) => {
    if (variant.stock <= 0) return;
    setSelectedVariant(variant);
    if (variant.image) {
      setActiveImage(variant.image);
    } else if (product?.image) {
      setActiveImage(product.image);
    }
    setQuantity(1);
    setAdded(false);
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(currentStock || 1, current + 1));
  };

  const handleAddToCart = () => {
    if (!product || outOfStock) return;

    addToCart(
      {
        ...product,
        price: currentPrice,
        stock: currentStock,
        image: activeImage || product.image,
      },
      quantity,
      customNotes || undefined,
      selectedVariant?.label,
      selectedVariant?.id
    );

    setAdded(true);
    window.setTimeout(() => setAdded(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-[#f4f2ef] dark:bg-[#0f172a] transition-colors duration-200">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <ProductDetailSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-[60vh] bg-[#f4f2ef] dark:bg-[#0f172a] text-charcoal dark:text-slate-100 flex items-center justify-center px-5 py-20 transition-colors duration-200">
        <div className="max-w-md text-center">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
            Product Not Found
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold text-charcoal dark:text-slate-100">
            Piece is unavailable.
          </h1>
          <p className="mt-3 text-sm text-charcoal-light dark:text-slate-400">
            This design might have been updated, archived, or moved.
          </p>
          <Link to="/catalog" className="mt-6 inline-block">
            <Button className="font-bold">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f2ef] dark:bg-[#0f172a] text-charcoal dark:text-slate-100 transition-colors duration-200">
      {/* Breadcrumbs */}
      <div className="border-b border-zinc-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="mx-auto max-w-[1440px] px-5 py-3.5 sm:px-8 lg:px-10">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-xs text-charcoal-lighter dark:text-slate-400">
              <li>
                <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Home
                </Link>
              </li>
              <ChevronRight className="h-3 w-3" />
              <li>
                <Link to="/catalog" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  Catalog
                </Link>
              </li>
              <ChevronRight className="h-3 w-3" />
              <li className="max-w-[200px] sm:max-w-none truncate font-bold text-charcoal dark:text-slate-100">
                {product.name}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Product Container */}
      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <Link
          to="/catalog"
          className="mb-8 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-charcoal-light dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalog</span>
        </Link>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Gallery & Details */}
          <section className="lg:col-span-7 space-y-8">
            {/* Main Featured Image Card */}
            <div className="overflow-hidden rounded-3xl border border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-md">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-slate-800">
                <img
                  src={activeImage || product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallbackApplied) return;
                    img.dataset.fallbackApplied = 'true';
                    img.src =
                      'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=1200';
                  }}
                />

                {product.isCustomizable && (
                  <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-charcoal/90 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm shadow-md">
                    <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                    Customizable Piece
                  </span>
                )}
              </div>
            </div>

            {/* Gallery Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {galleryImages.map((img, index) => {
                  const isSelected = activeImage === img;
                  return (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all shadow-sm ${
                        isSelected
                          ? 'border-brand-500 ring-2 ring-brand-500/20'
                          : 'border-zinc-200 dark:border-slate-700 hover:border-brand-300'
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Product Story & Specs Tabs */}
            <div className="rounded-3xl border border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-6">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
                  Crafting & Design Notes
                </span>
                <h3 className="mt-1 font-serif text-xl font-bold text-charcoal dark:text-slate-100">
                  About this Piece
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-charcoal-light dark:text-slate-400">
                  {product.description || 'No description available for this workshop piece.'}
                </p>
              </div>

              <div className="border-t border-zinc-100 dark:border-slate-800 pt-6">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
                  Engineering Specifications
                </span>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-100 dark:border-slate-800 bg-zinc-50/60 dark:bg-slate-800/80 p-3.5">
                    <div className="flex items-center gap-1.5 text-charcoal-lighter dark:text-slate-400">
                      <Layers className="h-3.5 w-3.5 text-brand-500" />
                      <span className="font-mono text-[11px] uppercase">Material</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-charcoal dark:text-slate-100">
                      {product.material || 'PLA / PETG'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-100 dark:border-slate-800 bg-zinc-50/60 dark:bg-slate-800/80 p-3.5">
                    <div className="flex items-center gap-1.5 text-charcoal-lighter dark:text-slate-400">
                      <Box className="h-3.5 w-3.5 text-brand-500" />
                      <span className="font-mono text-[11px] uppercase">Category</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-charcoal dark:text-slate-100">
                      {product.category || 'Standard Print'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-100 dark:border-slate-800 bg-zinc-50/60 dark:bg-slate-800/80 p-3.5">
                    <div className="flex items-center gap-1.5 text-charcoal-lighter dark:text-slate-400">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
                      <span className="font-mono text-[11px] uppercase">Quality</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-charcoal dark:text-slate-100">
                      100% Inspected
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Pricing, Options & Cart Action */}
          <section className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 space-y-6">
              {/* Product Header Card */}
              <div className="rounded-3xl border border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {product.category && (
                    <Badge variant="default">
                      {product.category}
                    </Badge>
                  )}
                  {product.isCustomizable && (
                    <Badge variant="brand">
                      Customizable
                    </Badge>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                      outOfStock
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        outOfStock ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    {outOfStock ? 'Out of Stock' : `${currentStock} In Stock`}
                  </span>
                </div>

                <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl text-charcoal dark:text-slate-100">
                  {product.name}
                </h1>

                {/* Price Display */}
                <div className="mt-5 flex items-baseline justify-between border-y border-zinc-100 dark:border-slate-800 py-4">
                  <div>
                    <span className="text-xs text-charcoal-lighter dark:text-slate-400 block font-mono uppercase">Price</span>
                    <span className="font-serif text-3xl font-bold text-charcoal dark:text-slate-100">
                      ₹{currentPrice.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <span className="font-mono text-xs text-brand-600 dark:text-brand-400 font-semibold">
                    Free shipping over ₹499
                  </span>
                </div>

                {/* Variant Options */}
                {hasVariants && product.variants && (
                  <div className="mt-6">
                    <label className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-lighter dark:text-slate-400 block mb-2.5">
                      Select Variant
                    </label>

                    <div className="flex flex-wrap gap-2.5">
                      {product.variants.map((variant) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        const isDisabled = variant.stock <= 0;

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleVariantSelect(variant)}
                            className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                              isSelected
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                                : isDisabled
                                ? 'border-zinc-200 dark:border-slate-800 bg-zinc-100 dark:bg-slate-800/40 text-zinc-400 dark:text-slate-600 line-through cursor-not-allowed'
                                : 'border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-charcoal dark:text-slate-200 hover:border-charcoal dark:hover:border-slate-500'
                            }`}
                          >
                            <span>{variant.label}</span>
                            {variant.price !== product.price && (
                              <span className="ml-1.5 text-brand-600 dark:text-brand-400">
                                ₹{variant.price.toLocaleString('en-IN')}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity Adjuster */}
                <div className="mt-6 flex items-center gap-4">
                  <div>
                    <label className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-lighter dark:text-slate-400 block mb-2">
                      Quantity
                    </label>

                    <div className="flex h-11 items-center rounded-xl border border-zinc-200 dark:border-slate-700 bg-zinc-50/50 dark:bg-slate-800 p-1">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        disabled={quantity <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-charcoal dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <span className="flex w-10 justify-center font-mono text-sm font-bold text-charcoal dark:text-slate-100">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={increaseQuantity}
                        disabled={outOfStock || quantity >= currentStock}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-charcoal dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customization Options Box */}
                {product.isCustomizable && (
                  <div className="mt-6 rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/40 dark:bg-brand-500/10 p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand-500" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        Personalization Available
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-charcoal-light dark:text-slate-400">
                      Choose how you would like to customize this piece:
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomMode('text')}
                        className={`rounded-xl border p-2.5 text-left text-xs font-bold transition-all ${
                          customMode === 'text'
                            ? 'border-brand-500 bg-white dark:bg-slate-800 text-brand-700 dark:text-brand-300 shadow-sm'
                            : 'border-zinc-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-charcoal-light dark:text-slate-300 hover:border-zinc-300 dark:hover:border-slate-600'
                        }`}
                      >
                        1. Inscription / Name
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomMode('quote')}
                        className={`rounded-xl border p-2.5 text-left text-xs font-bold transition-all ${
                          customMode === 'quote'
                            ? 'border-brand-500 bg-white dark:bg-slate-800 text-brand-700 dark:text-brand-300 shadow-sm'
                            : 'border-zinc-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-charcoal-light dark:text-slate-300 hover:border-zinc-300 dark:hover:border-slate-600'
                        }`}
                      >
                        2. Custom 3D CAD
                      </button>
                    </div>

                    {customMode === 'text' && (
                      <div className="mt-3.5">
                        <label
                          htmlFor="custom-notes"
                          className="font-mono text-[10px] font-bold uppercase tracking-wider text-charcoal-lighter dark:text-slate-400 block mb-1"
                        >
                          Custom Text / Inscription
                        </label>
                        <Textarea
                          id="custom-notes"
                          value={customNotes}
                          onChange={(e) => setCustomNotes(e.target.value)}
                          placeholder="e.g. Engrave 'Rahul & Priya · 2026' on bottom, matte dark grey finish..."
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    )}

                    {customMode === 'quote' && (
                      <div className="mt-3.5 rounded-xl border border-brand-200 dark:border-brand-500/30 bg-white dark:bg-slate-800 p-3 space-y-2">
                        <p className="text-xs text-charcoal-light dark:text-slate-300 leading-relaxed">
                          Need custom dimensions, mounting holes, or unique 3D features? Open our Instant Quote builder with this design as a base.
                        </p>
                        <Link
                          to={`/custom-service?productId=${product.id}${
                            selectedVariant ? `&variantId=${selectedVariant.id}` : ''
                          }`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                        >
                          <span>Open Custom 3D Studio →</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Primary CTA Buttons */}
                <div className="mt-7 space-y-3">
                  <Button
                    size="lg"
                    disabled={outOfStock}
                    onClick={handleAddToCart}
                    className={`w-full font-bold shadow-lg shadow-brand-500/20 ${
                      added ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                    }`}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {added
                      ? 'Added to Cart ✓'
                      : outOfStock
                      ? 'Currently Out of Stock'
                      : `Add to Cart • ₹${(currentPrice * quantity).toLocaleString('en-IN')}`}
                  </Button>

                  <a
                    href={whatsappInquiryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full font-bold border-zinc-200 hover:border-emerald-500 hover:text-emerald-700"
                    >
                      Ask about this piece on WhatsApp
                    </Button>
                  </a>
                </div>

                {/* Added Toast */}
                {added && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 animate-in zoom-in-95">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{product.name} has been added to your cart!</span>
                  </div>
                )}
              </div>

              {/* Trust Badge Strip */}
              <div className="rounded-3xl border border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <Truck className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-charcoal dark:text-slate-100">Pan-India Tracked Delivery</h4>
                    <p className="text-[11px] text-charcoal-lighter dark:text-slate-400">
                      Securely packed in bubble wrap and dispatched via express courier.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-charcoal dark:text-slate-100">100% Quality Inspected</h4>
                    <p className="text-[11px] text-charcoal-lighter dark:text-slate-400">
                      Every piece is dimensionally measured and hand-checked before shipping.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-zinc-200 dark:border-slate-800 bg-[#f4f2ef] dark:bg-[#0f172a] py-16 transition-colors">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
            <div className="flex items-end justify-between gap-5">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
                  Recommended For You
                </span>
                <h3 className="mt-1 font-serif text-2xl font-bold text-charcoal dark:text-slate-100 sm:text-3xl">
                  Related Workshop Pieces
                </h3>
              </div>

              <Link
                to="/catalog"
                className="text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                <span>View Full Catalog</span>
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  to={`/product/${related.id}`}
                  className="group"
                >
                  <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-brand-300">
                    <div className="aspect-square overflow-hidden bg-zinc-100">
                      <img
                        src={related.image}
                        alt={related.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="p-5">
                      <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-charcoal-lighter">
                        {related.category}
                      </span>
                      <h4 className="mt-1 line-clamp-1 font-serif text-base font-bold text-charcoal group-hover:text-brand-600 transition-colors">
                        {related.name}
                      </h4>
                      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                        <span className="font-serif text-base font-bold text-charcoal">
                          ₹{Number(related.price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-bold text-brand-600">
                          View Piece →
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}