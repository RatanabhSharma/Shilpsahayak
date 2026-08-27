import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useStore, getCartItemId } from '../store';

export function CartDrawer() {
  const { isCartOpen, closeCart, cart, removeFromCart, updateCartQuantity, settings } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCartOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, closeCart]);

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((sum, item) => {
    const itemPrice = item.customPrint?.customPrice ?? item.product.price;
    return sum + itemPrice * item.quantity;
  }, 0);

  const freeThreshold = settings.freeShippingThreshold || 499;
  const freeProgress = Math.min(100, (subtotal / freeThreshold) * 100);
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Shopping Cart">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-md bg-paper shadow-2xl flex flex-col border-l border-line cart-drawer-enter">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-white">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-accent" />
              <h2 className="font-display font-bold text-lg text-ink uppercase tracking-tight">Your Cart</h2>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} items
              </span>
            </div>

            <button
              type="button"
              onClick={closeCart}
              aria-label="Close cart"
              className="p-2 text-muted hover:text-ink rounded-lg hover:bg-shell transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="px-6 py-3 bg-shell border-b border-line">
            <div className="flex items-center justify-between text-xs font-sans mb-1.5">
              {remainingForFree > 0 ? (
                <span>Add <strong className="font-mono font-semibold text-accent">₹{remainingForFree.toFixed(0)}</strong> more for FREE shipping</span>
              ) : (
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  🎉 FREE Pan-India Shipping Unlocked!
                </span>
              )}
              <span className="font-mono text-2xs text-muted">{freeProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300 rounded-full"
                style={{ width: `${freeProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-shell flex items-center justify-center text-muted mb-4">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="font-display font-bold text-lg text-ink">Your cart is empty</h3>
                <p className="text-xs text-muted max-w-xs mt-1.5 leading-relaxed">
                  Discover our 3D printed collection or request a custom CAD quote.
                </p>
                <button
                  type="button"
                  onClick={closeCart}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-ink text-white font-sans text-xs font-semibold hover:bg-accent transition-colors"
                >
                  Browse Storefront
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {cart.map((item) => {
                  const itemId = getCartItemId(item);
                  const price = item.customPrint?.customPrice ?? item.product.price;
                  const itemImage = item.product.image || item.product.images?.[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80';

                  return (
                    <li key={itemId} className="py-4 flex gap-4">
                      <div className="w-20 h-20 rounded-xl border border-line bg-shell overflow-hidden shrink-0">
                        <img
                          src={itemImage}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display font-semibold text-sm text-ink truncate leading-snug">
                              {item.product.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeFromCart(itemId)}
                              aria-label={`Remove ${item.product.name}`}
                              className="text-muted hover:text-accent p-1 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {item.variantLabel && (
                            <span className="inline-block font-sans text-2xs text-muted bg-shell px-2 py-0.5 rounded mt-1">
                              Variant: {item.variantLabel}
                            </span>
                          )}

                          {item.customPrint && (
                            <span className="inline-block font-mono text-2xs text-accent font-semibold bg-accent-soft px-2 py-0.5 rounded mt-1">
                              Custom CAD Model
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          {/* Quantity stepper */}
                          <div className="flex items-center border border-line rounded-lg bg-white">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(itemId, Math.max(1, item.quantity - 1))}
                              aria-label="Decrease quantity"
                              className="w-7 h-7 flex items-center justify-center text-muted hover:text-ink transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center font-mono text-xs font-semibold text-ink">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(itemId, item.quantity + 1)}
                              aria-label="Increase quantity"
                              className="w-7 h-7 flex items-center justify-center text-muted hover:text-ink transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="font-mono font-bold text-sm text-ink">
                            ₹{(price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer / Summary */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-line bg-white space-y-4">
              <div className="space-y-2 font-sans text-xs">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold text-ink">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Estimated Shipping</span>
                  <span className="font-mono font-semibold text-ink">
                    {subtotal >= freeThreshold ? 'FREE' : `₹${settings.shippingFlatRate || 150}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-ink pt-2 border-t border-line">
                  <span className="font-display">Total</span>
                  <span className="font-mono text-accent text-base">
                    ₹{(subtotal + (subtotal >= freeThreshold ? 0 : (settings.shippingFlatRate || 150))).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className="w-full py-3.5 px-6 rounded-xl bg-accent text-white font-sans text-sm font-bold shadow-md shadow-accent/20 hover:bg-accent-dark transition-all flex items-center justify-center gap-2 group"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="flex items-center justify-center gap-4 text-2xs text-muted pt-1">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-accent" /> Safe & Secure UPI / Card</span>
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-accent" /> Pan-India Dispatch</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
