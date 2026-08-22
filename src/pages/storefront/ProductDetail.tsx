import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingCart, Loader2 } from 'lucide-react';
import { useProducts, ProductVariant } from '../../hooks/useProducts';
import { useStore } from '../../store';
import { Button, Card } from '../../components/ui';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: products = [], isLoading, isError } = useProducts();
  const addToCart = useStore((state) => state.addToCart);

  const product = products.find((p) => p.id === id);

  const hasVariants = !!(product?.hasVariants && product.variants && product.variants.length > 0);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>('');
  const [customNotes, setCustomNotes] = useState('');
  const [added, setAdded] = useState(false);

  // Initialize selected variant + image
  useEffect(() => {
    if (!product) return;

    if (hasVariants && product.variants) {
      const first = product.variants[0];
      setSelectedVariant(first);
      setActiveImage(first.image || product.image);
    } else {
      setSelectedVariant(null);
      setActiveImage(product.image);
    }
  }, [product, hasVariants]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const imgs = new Set<string>();
    if (product.image) imgs.add(product.image);
    product.images?.forEach((img) => imgs.add(img));
    product.variants?.forEach((v) => {
      if (v.image) imgs.add(v.image);
    });
    return Array.from(imgs);
  }, [product]);

  const currentPrice = selectedVariant?.price ?? product?.price ?? 0;
  const currentStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const outOfStock = currentStock <= 0;

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    if (variant.image) setActiveImage(variant.image);
    setQuantity(1);
  };

 const handleAddToCart = () => {
  if (!product || outOfStock) return;

  addToCart(
    {
      ...product,
      price: currentPrice,
      stock: currentStock,
      image: activeImage || product.image
    },
    quantity,
    customNotes || undefined,
    selectedVariant?.label,
    selectedVariant?.id
  );

  setAdded(true);
  setTimeout(() => setAdded(false), 2000);
};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-serif font-bold text-charcoal mb-4">
          Product not found
        </h1>
        <Link to="/catalog">
          <Button>Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/catalog"
        className="inline-flex items-center text-sm text-charcoal-light hover:text-brand-600 mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: Images */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface mb-4">
            <img
              src={activeImage || product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=800';
              }}
            />
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {galleryImages.map((img) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 ${
                    activeImage === img
                      ? 'border-brand-500'
                      : 'border-transparent'
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div>
          <p className="text-xs uppercase tracking-wider text-charcoal-lighter mb-2">
            {product.category}
          </p>
          <h1 className="text-3xl font-serif font-bold text-charcoal mb-3">
            {product.name}
          </h1>

          <p className="text-2xl font-semibold text-brand-600 mb-6">
            ₹{currentPrice.toLocaleString('en-IN')}
          </p>

          {product.material && (
            <p className="text-sm text-charcoal-light mb-4">
              Material: <span className="font-medium text-charcoal">{product.material}</span>
            </p>
          )}

          {/* Variants */}
          {hasVariants && product.variants && (
            <div className="mb-6">
              <p className="text-sm font-medium text-charcoal mb-3">
                Select Option
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const disabled = variant.stock <= 0;
                  return (
                    <button
                      key={variant.id}
                      disabled={disabled}
                      onClick={() => handleVariantSelect(variant)}
                      className={`px-4 py-2.5 rounded-xl text-sm border transition-colors ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                          : disabled
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-brand-200 text-charcoal hover:border-brand-400'
                      }`}
                    >
                      {variant.label}
                      {disabled ? ' (Out of stock)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <p className="text-sm font-medium text-charcoal mb-3">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl border border-brand-200 flex items-center justify-center hover:bg-brand-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-medium">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity((q) => Math.min(currentStock || 1, q + 1))
                }
                className="w-10 h-10 rounded-xl border border-brand-200 flex items-center justify-center hover:bg-brand-50"
                disabled={quantity >= currentStock}
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-xs text-charcoal-lighter ml-2">
                {currentStock} available
              </span>
            </div>
          </div>

          {/* Custom notes */}
          {product.isCustomizable && (
            <div className="mb-6">
              <label className="text-sm font-medium text-charcoal mb-2 block">
                Custom Notes (optional)
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Name, date, special request..."
                className="w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                rows={3}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Button
              size="lg"
              className="flex-1"
              disabled={outOfStock}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {added ? 'Added!' : outOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            <Link to="/custom-service" className="flex-1">
              <Button size="lg" variant="outline" className="w-full">
                Request Custom Print
              </Button>
            </Link>
          </div>

          {/* Description */}
          <Card className="p-5 border-none shadow-sm">
            <h2 className="font-serif font-semibold text-charcoal mb-2">
              Description
            </h2>
            <p className="text-sm text-charcoal-light leading-relaxed whitespace-pre-line">
              {product.description || 'No description available.'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}