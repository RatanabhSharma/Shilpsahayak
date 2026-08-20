import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, ShieldCheck, Truck, Minus, Plus, Loader2 } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { Button, Textarea } from '../../components/ui';
import { useStore } from '../../store'; // temporary for cart (we'll improve later)

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: products = [], isLoading, isError } = useProducts();
  const product = products.find((p) => p.id === id);

  const addToCart = useStore((state) => state.addToCart);

  const [quantity, setQuantity] = useState(1);
  const [customNotes, setCustomNotes] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  const [mainImage, setMainImage] = useState<string | undefined>(undefined);
  const [selectedVariant, setSelectedVariant] = useState({
    size: 'Standard',
    color: 'White',
    material: 'PLA'
  });

  // Set main image when product loads
  React.useEffect(() => {
    if (product) {
      setMainImage(product.image);
      setQuantity(1);
      setCustomNotes('');
    }
  }, [product]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-serif text-charcoal mb-4">
          Product not found
        </h2>
        <Link to="/catalog">
          <Button>Return to Catalog</Button>
        </Link>
      </div>
    );
  }

const handleAddToCart = () => {
  if (!product) return;

  const variantLabel = `Size: ${selectedVariant.size}, Color: ${selectedVariant.color}, Material: ${selectedVariant.material}`;

  // Cast to any temporarily to avoid type conflict with old Zustand store
  addToCart(product as any, quantity, customNotes, variantLabel);
  
  setIsAdded(true);
  setTimeout(() => setIsAdded(false), 2000);
};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-sm text-charcoal-light hover:text-brand-500 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-dark border border-brand-100">
            <img
              src={mainImage || product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-opacity duration-300"
              onError={(e) => {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=800';
              }}
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-8">
            <p className="text-sm text-brand-600 font-medium uppercase tracking-wider mb-3">
              {product.category}
            </p>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal mb-4 leading-tight">
              {product.name}
            </h1>
            <p className="text-2xl text-charcoal font-medium mb-6">
              ₹{product.price.toLocaleString('en-IN')}
            </p>
            <p className="text-charcoal-light leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="space-y-6 mb-8">
            {/* Variants */}
            <div className="space-y-4 pt-4 border-t border-brand-100">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Size
                </label>
                <div className="flex gap-3">
                  {['Small', 'Standard', 'Large'].map((size) => (
                    <button
                      key={size}
                      onClick={() =>
                        setSelectedVariant((prev) => ({ ...prev, size }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedVariant.size === size
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-brand-200 text-charcoal-light hover:border-brand-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Color
                  </label>
                  <select
                    value={selectedVariant.color}
                    onChange={(e) =>
                      setSelectedVariant((prev) => ({
                        ...prev,
                        color: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option>White</option>
                    <option>Black</option>
                    <option>Marble</option>
                    <option>Wood</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Material
                  </label>
                  <select
                    value={selectedVariant.material}
                    onChange={(e) =>
                      setSelectedVariant((prev) => ({
                        ...prev,
                        material: e.target.value
                      }))
                    }
                    className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option>PLA</option>
                    <option>PETG</option>
                    <option>Resin</option>
                  </select>
                </div>
              </div>
            </div>

            {product.isCustomizable && (
              <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100">
                <h3 className="font-serif font-semibold text-charcoal mb-2 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-brand-500 mr-2"></span>
                  Personalisation Details
                </h3>
                <p className="text-sm text-charcoal-light mb-4">
                  Add names, dates, or specific instructions for your custom piece.
                </p>
                <Textarea
                  placeholder="E.g., 'Happy Anniversary Rahul & Priya - 14.02.2024'"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-charcoal mb-3">
                Quantity
              </label>
              <div className="flex items-center inline-flex bg-white border border-brand-200 rounded-xl">
                <button
                  className="p-3 text-charcoal hover:text-brand-500 transition-colors disabled:opacity-50"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium text-charcoal">
                  {quantity}
                </span>
                <button
                  className="p-3 text-charcoal hover:text-brand-500 transition-colors disabled:opacity-50"
                  onClick={() =>
                    setQuantity(Math.min(product.stock || 99, quantity + 1))
                  }
                  disabled={quantity >= (product.stock || 99)}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-charcoal-lighter mt-2">
                {product.stock} items available in stock
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-auto">
            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={isAdded || product.stock === 0}
            >
              {isAdded ? (
                <>
                  <Check className="w-5 h-5 mr-2" /> Added to Cart
                </>
              ) : product.stock === 0 ? (
                'Out of Stock'
              ) : (
                'Add to Cart'
              )}
            </Button>
            {isAdded && (
              <Link
                to="/cart"
                className="text-center text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                View Cart &amp; Checkout &rarr;
              </Link>
            )}
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-2 gap-4 mt-10 pt-8 border-t border-brand-100">
            <div className="flex items-start">
              <ShieldCheck className="w-5 h-5 text-brand-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-charcoal">
                  Quality Assured
                </h4>
                <p className="text-xs text-charcoal-lighter mt-1">
                  Rigorous pre-shipment checks
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Truck className="w-5 h-5 text-brand-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-charcoal">
                  Secure Shipping
                </h4>
                <p className="text-xs text-charcoal-lighter mt-1">
                  Carefully packaged for transit
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}