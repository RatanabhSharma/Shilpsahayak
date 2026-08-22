import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';

import {
  getCartItemId,
  useStore
} from '../../store';

import {
  Button,
  Card
} from '../../components/ui';

export function Cart() {
  const cart = useStore((state) => state.cart);
  const updateQuantity = useStore(
    (state) => state.updateCartQuantity
  );
  const removeFromCart = useStore(
    (state) => state.removeFromCart
  );

  const navigate = useNavigate();

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + item.product.price * item.quantity,
    0
  );

  const shipping = subtotal >= 499 ? 0 : 150;
  const total = subtotal + shipping;

  /*
   * Empty Cart
   */
  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-500">
          <ShoppingBag className="w-10 h-10" />
        </div>

        <h2 className="text-3xl font-serif font-bold text-charcoal mb-4">
          Your cart is empty
        </h2>

        <p className="text-charcoal-light mb-8">
          Looks like you haven't added any crafted pieces yet.
        </p>

        <Link to="/catalog">
          <Button size="lg">
            Explore Catalog
          </Button>
        </Link>
      </div>
    );
  }

  /*
   * Cart
   */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-10">
        Your Cart
      </h1>

      <div className="flex flex-col lg:flex-row gap-12">

        {/* Cart Items */}
        <div className="flex-1 space-y-6">

          {cart.map((item) => {
            /*
             * Each product variant now gets its own cart identity.
             *
             * Example:
             * One Piece + Luffy
             * One Piece + ACE
             *
             * will have different cartItemId values.
             */
            const cartItemId = getCartItemId(item);

            /*
             * Use variant stock when the cart item has a variant.
             * Otherwise use the main product stock.
             */
            const selectedVariant = item.variantId
              ? item.product.variants?.find(
                  (variant) =>
                    variant.id === item.variantId
                )
              : undefined;

            const availableStock =
              selectedVariant?.stock ??
              item.product.stock;

            return (
              <Card
                key={cartItemId}
                className="p-4 sm:p-6 flex flex-col sm:flex-row gap-6"
              >

                {/* Product Image */}
                <div className="w-full sm:w-32 aspect-square rounded-xl overflow-hidden bg-surface-dark flex-shrink-0">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Information */}
                <div className="flex-1 flex flex-col">

                  {/* Name + Delete */}
                  <div className="flex justify-between items-start mb-2">

                    <div>
                      <h3 className="font-serif font-semibold text-lg text-charcoal mb-1">
                        {item.product.name}
                      </h3>

                      <p className="text-sm text-brand-600 font-medium">
                        ₹
                        {item.product.price.toLocaleString(
                          'en-IN'
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(cartItemId)
                      }
                      className="text-charcoal-lighter hover:text-red-500 transition-colors p-2"
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                  </div>

                  {/* Variant / Custom Notes */}
                  {(item.variantLabel ||
                    item.customNotes) && (
                    <div className="bg-surface p-3 rounded-lg mt-2 mb-4 space-y-2">

                      {item.variantLabel && (
                        <div>
                          <p className="text-xs font-medium text-charcoal mb-1">
                            Options:
                          </p>

                          <p className="text-sm text-charcoal-light">
                            {item.variantLabel}
                          </p>
                        </div>
                      )}

                      {item.customNotes && (
                        <div>
                          <p className="text-xs font-medium text-charcoal mb-1">
                            Personalisation Notes:
                          </p>

                          <p className="text-sm text-charcoal-light italic">
                            "{item.customNotes}"
                          </p>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Quantity + Price */}
                  <div className="mt-auto flex items-center justify-between pt-4">

                    {/* Quantity Controls */}
                    <div className="inline-flex items-center bg-surface border border-brand-200 rounded-lg">

                      {/* Minus */}
                      <button
                        type="button"
                        className="p-2 text-charcoal hover:text-brand-500 transition-colors disabled:opacity-50"
                        onClick={() =>
                          updateQuantity(
                            cartItemId,
                            Math.max(
                              1,
                              item.quantity - 1
                            )
                          )
                        }
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      {/* Quantity */}
                      <span className="w-10 text-center text-sm font-medium text-charcoal">
                        {item.quantity}
                      </span>

                      {/* Plus */}
                      <button
                        type="button"
                        className="p-2 text-charcoal hover:text-brand-500 transition-colors disabled:opacity-50"
                        onClick={() =>
                          updateQuantity(
                            cartItemId,
                            Math.min(
                              availableStock,
                              item.quantity + 1
                            )
                          )
                        }
                        disabled={
                          item.quantity >=
                          availableStock
                        }
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                    </div>

                    {/* Item Total */}
                    <p className="font-semibold text-charcoal">
                      ₹
                      {(
                        item.product.price *
                        item.quantity
                      ).toLocaleString('en-IN')}
                    </p>

                  </div>

                </div>
              </Card>
            );
          })}

        </div>

        {/* Order Summary */}
        <div className="lg:w-96 flex-shrink-0">

          <Card className="p-6 sticky top-28">

            <h2 className="font-serif font-bold text-xl text-charcoal mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 text-sm mb-6">

              {/* Subtotal */}
              <div className="flex justify-between text-charcoal-light">

                <span>
                  Subtotal ({cart.length}{' '}
                  {cart.length === 1
                    ? 'item'
                    : 'items'})
                </span>

                <span className="text-charcoal font-medium">
                  ₹
                  {subtotal.toLocaleString(
                    'en-IN'
                  )}
                </span>

              </div>

              {/* Shipping */}
              <div className="flex justify-between text-charcoal-light">

                <span>
                  Shipping
                </span>

                <span className="text-charcoal font-medium">
                  {shipping === 0 ? (
                    <span className="text-green-600">
                      Free
                    </span>
                  ) : (
                    `₹${shipping}`
                  )}
                </span>

              </div>

              {/* Free Shipping Message */}
              {shipping > 0 && (
                <p className="text-xs text-brand-600 bg-brand-50 p-2 rounded text-center">
                  Add ₹
                  {(499 - subtotal).toLocaleString(
                    'en-IN'
                  )}{' '}
                  more for free shipping!
                </p>
              )}

            </div>

            {/* Total */}
            <div className="border-t border-brand-100 pt-4 mb-8">

              <div className="flex justify-between items-center">

                <span className="font-serif font-bold text-lg text-charcoal">
                  Total
                </span>

                <span className="font-bold text-xl text-brand-600">
                  ₹
                  {total.toLocaleString(
                    'en-IN'
                  )}
                </span>

              </div>

              <p className="text-xs text-charcoal-lighter text-right mt-1">
                Inclusive of all taxes
              </p>

            </div>

            {/* Checkout */}
            <Button
              className="w-full"
              size="lg"
              onClick={() =>
                navigate('/checkout')
              }
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

          </Card>

        </div>

      </div>
    </div>
  );
}