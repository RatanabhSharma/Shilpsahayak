import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FileBox,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  getCartItemId,
  useStore,
} from '../../store';
import {
  Button,
  Badge,
} from '../../components/ui';
import { useSettings } from '../../hooks/useSettings';

export function Cart() {
  const cart = useStore((state) => state.cart);
  const updateQuantity = useStore((state) => state.updateCartQuantity);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const navigate = useNavigate();
  const { data: settings } = useSettings();

  const getItemPrice = (item: (typeof cart)[number]) =>
    item.customPrint?.customPrice ?? item.product.price;

  const subtotal = cart.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0
  );

  const shippingRate = settings?.shippingFlatRate ?? 150;
  const freeShippingThreshold = settings?.freeShippingThreshold ?? 499;

  const shipping =
    subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : shippingRate;

  const total = subtotal + shipping;
  const amountForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotal / freeShippingThreshold) * 100)
  );

  if (cart.length === 0) {
    return (
      <div className="min-h-[75vh] bg-[#f4f2ef] flex items-center justify-center px-5 py-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 sm:p-10 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <ShoppingBag className="h-8 w-8" />
          </div>

          <span className="mt-5 font-mono text-xs font-bold uppercase tracking-wider text-brand-500 block">
            Your Cart is Empty
          </span>

          <h1 className="mt-2 font-serif text-3xl font-bold text-charcoal">
            No prints added yet.
          </h1>

          <p className="mt-3 text-sm text-charcoal-light leading-relaxed">
            Browse our catalogue of finished functional prints, or upload your own 3D CAD model for a custom studio quote.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center">
            <Link to="/catalog" className="w-full sm:w-auto">
              <Button className="w-full font-bold">
                Browse 3D Catalogue
              </Button>
            </Link>

            <Link to="/custom-service" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full font-semibold">
                Upload Custom 3D Model
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f2ef] text-charcoal">
      {/* Header */}
      <section className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-brand-500">
                Shopping Cart
              </span>
              <h1 className="mt-1 font-serif text-3xl font-bold text-charcoal sm:text-4xl">
                {cart.length} {cart.length === 1 ? 'Piece' : 'Pieces'} Ready for Fabrication
              </h1>
            </div>

            <Link
              to="/catalog"
              className="font-mono text-xs font-bold text-brand-600 hover:text-brand-700 underline"
            >
              ← Continue Browsing
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Cart Items List */}
          <section className="lg:col-span-8 space-y-4">
            {/* Free shipping progress bar */}
            <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-charcoal">
                  <Truck className="h-4 w-4 text-brand-500" />
                  {amountForFreeShipping > 0
                    ? `Add ₹${amountForFreeShipping.toLocaleString('en-IN')} more for FREE Pan-India Shipping!`
                    : '🎉 You have qualified for FREE Pan-India Shipping!'}
                </span>
                <span className="font-mono text-brand-600">
                  {freeShippingProgress}%
                </span>
              </div>

              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full bg-brand-500 transition-all duration-500"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4">
              {cart.map((item) => {
                const cartItemId = getCartItemId(item);
                const selectedVariant = item.variantId
                  ? item.product.variants?.find((v) => v.id === item.variantId)
                  : undefined;
                const availableStock = selectedVariant?.stock ?? item.product.stock;
                const isCustomPrint = Boolean(item.customPrint);
                const itemPrice = getItemPrice(item);
                const maxQuantity = availableStock > 0 ? availableStock : 999;
                const lineTotal = itemPrice * item.quantity;

                return (
                  <div
                    key={cartItemId}
                    className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      {/* Image / Icon */}
                      <Link
                        to={
                          isCustomPrint
                            ? '/custom-service'
                            : `/product/${item.product.id}`
                        }
                        className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-100"
                      >
                        {isCustomPrint ? (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-brand-50 text-brand-600">
                            <FileBox className="h-8 w-8" />
                            <span className="font-mono text-[9px] font-bold uppercase mt-1">
                              3D STL
                            </span>
                          </div>
                        ) : (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </Link>

                      {/* Details */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isCustomPrint ? (
                            <Badge variant="brand">Custom 3D Print</Badge>
                          ) : item.product.category ? (
                            <Badge variant="default">{item.product.category}</Badge>
                          ) : null}

                          {item.variantLabel && (
                            <span className="font-mono text-xs font-bold text-charcoal-lighter">
                              • {item.variantLabel}
                            </span>
                          )}
                        </div>

                        <Link
                          to={
                            isCustomPrint
                              ? '/custom-service'
                              : `/product/${item.product.id}`
                          }
                          className="font-serif text-lg font-bold text-charcoal hover:text-brand-600 transition-colors block line-clamp-1"
                        >
                          {item.product.name}
                        </Link>

                        <p className="font-serif text-sm font-bold text-brand-600">
                          ₹{itemPrice.toLocaleString('en-IN')}{' '}
                          <span className="text-xs font-normal text-charcoal-lighter font-sans">
                            each
                          </span>
                        </p>

                        {/* Custom print metadata breakdown */}
                        {isCustomPrint && item.customPrint && (
                          <div className="mt-2 rounded-xl bg-zinc-50 border border-zinc-100 p-2.5 text-xs text-charcoal-light">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                              <span>File: <strong>{item.customPrint.fileName}</strong></span>
                              <span>Mat: <strong>{item.customPrint.material}</strong></span>
                              <span>Infill: <strong>{item.customPrint.infill}%</strong></span>
                              {item.customPrint.volume && (
                                <span>Vol: <strong>{item.customPrint.volume.toFixed(1)} cm³</strong></span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Custom Inscription Note */}
                        {item.customNotes && (
                          <p className="mt-1 text-xs italic text-charcoal-lighter">
                            “{item.customNotes}”
                          </p>
                        )}
                      </div>

                      {/* Quantity & Controls */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                        <div className="flex h-9 items-center rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(cartItemId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-charcoal hover:bg-white disabled:opacity-30 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>

                          <span className="flex w-8 justify-center font-mono text-xs font-bold">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(cartItemId, Math.min(item.quantity + 1, maxQuantity))
                            }
                            disabled={item.quantity >= maxQuantity}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-charcoal hover:bg-white disabled:opacity-30 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-serif text-base font-bold text-charcoal">
                            ₹{lineTotal.toLocaleString('en-IN')}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeFromCart(cartItemId)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom fabrication note */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-brand-500" />
                <span className="text-xs text-charcoal-light">
                  Need a custom variant with specific engineering tolerances or brass inserts?
                </span>
              </div>
              <Link
                to="/custom-service"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 whitespace-nowrap ml-4"
              >
                Open Studio →
              </Link>
            </div>
          </section>

          {/* Order Summary Sidebar */}
          <aside className="lg:col-span-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-md lg:sticky lg:top-28 space-y-6">
              <h2 className="font-serif text-xl font-bold text-charcoal">
                Order Summary
              </h2>

              <div className="divide-y divide-zinc-100 text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-charcoal-lighter">Subtotal</span>
                  <span className="font-mono font-bold text-charcoal">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between py-2.5">
                  <span className="text-charcoal-lighter">Pan-India Shipping</span>
                  <span className="font-mono font-bold text-charcoal">
                    {shipping === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      `₹${shipping.toLocaleString('en-IN')}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between py-2.5">
                  <span className="text-charcoal-lighter">Taxes (GST)</span>
                  <span className="text-charcoal-lighter">Included</span>
                </div>

                <div className="flex items-baseline justify-between pt-4">
                  <span className="font-serif text-base font-bold text-charcoal">Total Amount</span>
                  <span className="font-serif text-3xl font-bold text-charcoal">
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => navigate('/checkout')}
                className="w-full font-bold shadow-lg shadow-brand-500/20"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="space-y-3 pt-2 text-center">
                <p className="font-mono text-[10px] uppercase tracking-wider text-charcoal-lighter">
                  Secure Pan-India Checkout · UPI / Cards / NetBanking
                </p>

                <div className="flex items-center justify-center gap-1.5 text-xs text-charcoal-light">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Quality Inspected before dispatch</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}