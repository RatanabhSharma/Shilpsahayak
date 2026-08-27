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
  Zap,
} from 'lucide-react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  ProductVariant,
  useProducts,
} from '../../hooks/useProducts';
import { useStore } from '../../store';
import { useSettings } from '../../hooks/useSettings';
import { usePincodeLookup } from '../../hooks/usePincodeLookup';
import {
  Button,
  Badge,
  Textarea,
  Input,
} from '../../components/ui';
import { ProductCard } from '../../components/product/ProductCard';
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
  const navigate = useNavigate();

  const addToCart = useStore((state) => state.addToCart);
  const openCart = useStore((state) => state.openCart);

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
  const [added, setAdded] = useState(false);
  const [pincodeCheck, setPincodeCheck] = useState('');

  const {
    location: deliveryLocation,
    isLookingUp: isCheckingPincode,
    error: pincodeError,
  } = usePincodeLookup(pincodeCheck, true);

  /* Initialize Variant & Image */
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

  /* Gallery Images */
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const images = new Set<string>();

    if (product.image) images.add(product.image);
    product.images?.forEach((img) => img && images.add(img));
    product.variants?.forEach((v) => v.image && images.add(v.image));

    return Array.from(images);
  }, [product]);

  /* Current State */
  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const outOfStock = currentStock <= 0;

  const whatsappInquiryLink = useMemo(() => {
    const text = encodeURIComponent(
      `Hello Shilp Sahayak! I have a question regarding "${product?.name || 'this piece'}" (₹${currentPrice}). Can you help?`
    );
    return `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${text}`;
  }, [product?.name, currentPrice, whatsappNumber]);

  /* Related Products */
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

  /* Handlers */
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
    openCart();
    window.setTimeout(() => setAdded(false), 3000);
  };

  const handleBuyNow = () => {
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

    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-paper">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <ProductDetailSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-[60vh] bg-paper text-ink flex items-center justify-center px-5 py-20">
        <div className="max-w-md text-center">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
            Product Not Found
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold text-ink">
            Piece is unavailable.
          </h1>
          <p className="mt-3 text-sm text-muted font-sans">
            This design might have been updated, archived, or moved.
          </p>
          <Link to="/catalog" className="mt-6 inline-block">
            <Button className="font-display font-bold">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Breadcrumbs */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-3.5 sm:px-8 lg:px-10">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
              <li>
                <Link to="/" className="hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <ChevronRight className="h-3 w-3" />
              <li>
                <Link to="/catalog" className="hover:text-accent transition-colors">
                  Catalog
                </Link>
              </li>
              <ChevronRight className="h-3 w-3" />
              <li className="max-w-[200px] sm:max-w-none truncate font-bold text-ink">
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
          className="mb-8 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalog</span>
        </Link>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Gallery & Details */}
          <section className="lg:col-span-7 space-y-8">
            {/* Main Featured Image */}
            <div className="overflow-hidden rounded-3xl border border-line bg-white p-3 shadow-soft">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-shell">
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
                  <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-dark/90 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm shadow-md">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    Personalizable Piece
                  </span>
                )}
              </div>
            </div>

            {/* Gallery Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {galleryImages.map((img, index) => {
                  const isSelected = activeImage === img;
                  return (
                    <button
                      key={`${img}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all shadow-sm ${
                        isSelected
                          ? 'border-accent ring-2 ring-accent/20'
                          : 'border-line hover:border-accent/50'
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Product Details & Specs */}
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft space-y-6">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  Design & Crafting Notes
                </span>
                <h3 className="mt-1 font-display text-xl font-bold text-ink">
                  About this Piece
                </h3>
                <p className="mt-3 whitespace-pre-line font-sans text-sm leading-relaxed text-muted">
                  {product.description || 'No description available for this workshop piece.'}
                </p>
              </div>

              <div className="border-t border-line pt-6">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  Engineering Specifications
                </span>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-line bg-shell p-3.5">
                    <div className="flex items-center gap-1.5 text-muted">
                      <Layers className="h-3.5 w-3.5 text-accent" />
                      <span className="font-mono text-[11px] uppercase">Material</span>
                    </div>
                    <p className="mt-1 font-mono text-xs font-bold text-ink">
                      {product.material || 'PLA / PETG'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-line bg-shell p-3.5">
                    <div className="flex items-center gap-1.5 text-muted">
                      <Box className="h-3.5 w-3.5 text-accent" />
                      <span className="font-mono text-[11px] uppercase">Category</span>
                    </div>
                    <p className="mt-1 font-mono text-xs font-bold text-ink">
                      {product.category || 'Standard Print'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-line bg-shell p-3.5">
                    <div className="flex items-center gap-1.5 text-muted">
                      <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                      <span className="font-mono text-[11px] uppercase">Quality</span>
                    </div>
                    <p className="mt-1 font-mono text-xs font-bold text-ink">
                      Precision Inspected
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Pricing, Options & Cart Action */}
          <section className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 space-y-6">
              <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
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
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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

                <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl text-ink">
                  {product.name}
                </h1>

                {/* Price Display */}
                <div className="mt-5 flex flex-col gap-2 border-y border-line py-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-mono text-xs text-muted block uppercase">Price</span>
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono text-3xl font-bold text-ink">
                          ₹{currentPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="font-mono text-sm text-muted line-through">
                          ₹{Math.round(currentPrice * 1.35).toLocaleString('en-IN')}
                        </span>
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white shadow-sm">
                          Save 26%
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-xs text-accent font-semibold">
                      {settings?.freeShippingThreshold ? `Free shipping > ₹${settings.freeShippingThreshold}` : 'Free shipping on qualified orders'}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold font-mono">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Fabricated & carefully hand-inspected in Patiala workshop</span>
                  </div>
                </div>

                {/* Variants */}
                {hasVariants && product.variants && (
                  <div className="mt-6">
                    <label className="font-mono text-xs font-bold uppercase tracking-wider text-muted block mb-2.5">
                      Select Option / Variant
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
                            className={`rounded-xl border px-4 py-2 font-mono text-xs font-bold transition-all ${
                              isSelected
                                ? 'border-accent bg-accent-soft text-accent ring-1 ring-accent'
                                : isDisabled
                                ? 'border-line bg-shell text-muted line-through cursor-not-allowed'
                                : 'border-line bg-white text-ink hover:border-accent'
                            }`}
                          >
                            <span>{variant.label}</span>
                            {variant.price !== product.price && (
                              <span className="ml-1.5 text-accent">
                                ₹{variant.price.toLocaleString('en-IN')}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity Stepper */}
                <div className="mt-6 flex items-center gap-4">
                  <div>
                    <label className="font-mono text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                      Quantity
                    </label>

                    <div className="flex h-11 items-center rounded-xl border border-line bg-shell p-1">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        disabled={quantity <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-white disabled:opacity-30 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <span className="flex w-10 justify-center font-mono text-sm font-bold text-ink">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={increaseQuantity}
                        disabled={outOfStock || quantity >= currentStock}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-white disabled:opacity-30 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customization Options Box */}
                {product.isCustomizable && (
                  <div className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                        Personalization Available
                      </span>
                    </div>

                    <p className="mt-1 font-sans text-xs text-muted">
                      Specify custom text, name engraving, or color notes below:
                    </p>

                    <div className="mt-3.5">
                      <label
                        htmlFor="custom-notes"
                        className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted block mb-1"
                      >
                        Custom Text / Inscription Note
                      </label>
                      <Textarea
                        id="custom-notes"
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="e.g. Inscribe 'Rahul & Priya · 2026' on bottom..."
                        rows={2}
                        className="text-xs bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="mt-7 space-y-3">
                  <Button
                    size="lg"
                    disabled={outOfStock}
                    onClick={handleAddToCart}
                    className={`w-full font-display font-bold shadow-lg shadow-accent/20 bg-accent hover:bg-accent-dark text-white border-accent ${
                      added ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600' : ''
                    }`}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {added
                      ? 'Added to Cart ✓'
                      : outOfStock
                      ? 'Out of Stock'
                      : `Add to Cart • ₹${(currentPrice * quantity).toLocaleString('en-IN')}`}
                  </Button>

                  <Button
                    size="lg"
                    variant="secondary"
                    disabled={outOfStock}
                    onClick={handleBuyNow}
                    className="w-full font-display font-bold bg-dark text-white hover:bg-zinc-800"
                  >
                    <Zap className="mr-2 h-4 w-4 text-accent" />
                    Buy Now
                  </Button>

                  <a
                    href={whatsappInquiryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      size="md"
                      variant="outline"
                      className="w-full font-sans font-semibold border-line hover:border-emerald-500 hover:text-emerald-700"
                    >
                      Ask about this piece on WhatsApp
                    </Button>
                  </a>
                </div>

                {/* Pincode Delivery Estimator Widget */}
                <div className="mt-6 rounded-2xl border border-line bg-shell p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-accent" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                      Check Delivery to Your Pincode
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter 6-digit PIN (e.g. 147001)"
                      maxLength={6}
                      value={pincodeCheck}
                      onChange={(e) => setPincodeCheck(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-10 text-xs bg-white font-mono"
                    />
                  </div>

                  {pincodeCheck.length === 6 && (
                    <div className="text-xs pt-1 font-sans">
                      {isCheckingPincode ? (
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                          Checking courier network...
                        </span>
                      ) : pincodeError ? (
                        <span className="text-rose-600 font-medium">
                          {pincodeError}
                        </span>
                      ) : deliveryLocation ? (
                        <div className="space-y-1">
                          <p className="text-emerald-700 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Delivery Available to {deliveryLocation.city}, {deliveryLocation.state}!
                          </p>
                          <p className="text-[11px] text-muted">
                            Dispatched in 24–48h · Tracked express courier delivery in 3–5 days.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Trust Badge Strip */}
              <div className="rounded-3xl border border-line bg-white p-6 shadow-soft space-y-4">
                <div className="flex items-start gap-3">
                  <Truck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-ink font-display">Pan-India Express Delivery</h4>
                    <p className="text-[11px] text-muted font-sans">
                      Multi-layer bubble wrapping and tracked courier dispatch.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-ink font-display">100% Quality Inspected</h4>
                    <p className="text-[11px] text-muted font-sans">
                      Every print is dimensionally verified before packing.
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
        <section className="border-t border-line bg-shell py-16">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
            <div className="flex items-end justify-between gap-5">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  Recommended For You
                </span>
                <h3 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
                  Related Workshop Pieces
                </h3>
              </div>

              <Link
                to="/catalog"
                className="text-xs font-bold text-accent hover:underline font-mono"
              >
                <span>View Catalog →</span>
              </Link>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}