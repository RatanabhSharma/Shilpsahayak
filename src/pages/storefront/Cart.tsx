import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ShoppingBag,
  FileBox,
} from 'lucide-react';

import { getCartItemId, useStore } from '../../store';
import { Button, Card } from '../../components/ui';
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
    subtotal >= freeShippingThreshold ? 0 : shippingRate;

  const total = subtotal + shipping;

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
          <Button size="lg">Explore Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-10">
        Your Cart
      </h1>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-6">
          {cart.map((item) => {
            const cartItemId = getCartItemId(item);

            const selectedVariant = item.variantId
              ? item.product.variants?.find(
                  (variant) => variant.id === item.variantId
                )
              : undefined;

            const availableStock =
              selectedVariant?.stock ?? item.product.stock;

            const isCustomPrint = !!item.customPrint;
            const itemPrice = getItemPrice(item);

            const maxQuantity =
              availableStock > 0 ? availableStock : 999;

            return (
              <Card
                key={cartItemId}
                className="p-4 sm:p-6 flex flex-col sm:flex-row gap-6"
              >
                <div className="w-full sm:w-32 aspect-square rounded-xl overflow-hidden bg-surface-dark flex-shrink-0">
                  {isCustomPrint ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-brand-50 text-brand-500">
                      <FileBox className="w-10 h-10 mb-2" />

                      <span className="text-xs font-medium">
                        Custom Print
                      </span>
                    </div>
                  ) : (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-serif font-semibold text-lg text-charcoal mb-1">
                        {item.product.name}
                      </h3>

                      <p className="text-sm text-brand-600 font-medium">
                        ₹{itemPrice.toLocaleString('en-IN')}

                        {isCustomPrint && (
                          <span className="text-xs text-charcoal-lighter ml-2">
                            estimated
                          </span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(cartItemId)}
                      className="text-charcoal-lighter hover:text-red-500 transition-colors p-2"
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {(item.variantLabel ||
                    item.customNotes ||
                    item.customPrint) && (
                    <div className="bg-surface p-3 rounded-xl mt-2 mb-4 space-y-3">
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

                      {item.customPrint && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <FileBox className="w-4 h-4 text-brand-500" />

                            <p className="text-xs font-medium text-charcoal">
                              Custom Print
                            </p>
                          </div>

                          {item.customPrint.fileName && (
                            <p className="text-sm text-charcoal-light break-all">
                              Model:{' '}

                              <span className="text-charcoal font-medium">
                                {item.customPrint.fileName}
                              </span>
                            </p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            {item.customPrint.material && (
                              <p className="text-charcoal-light">
                                Material:{' '}

                                <span className="text-charcoal">
                                  {item.customPrint.material}
                                </span>
                              </p>
                            )}

                            {item.customPrint.color && (
                              <p className="text-charcoal-light">
                                Color:{' '}

                                <span className="text-charcoal">
                                  {item.customPrint.color}
                                </span>
                              </p>
                            )}

                            {item.customPrint.infill !== undefined && (
                              <p className="text-charcoal-light">
                                Infill:{' '}

                                <span className="text-charcoal">
                                  {item.customPrint.infill}%
                                </span>
                              </p>
                            )}

                            {item.customPrint.layerHeight !== undefined && (
                              <p className="text-charcoal-light">
                                Layer:{' '}

                                <span className="text-charcoal">
                                  {item.customPrint.layerHeight} mm
                                </span>
                              </p>
                            )}

                            {item.customPrint.estimatedWeight !==
                              undefined && (
                              <p className="text-charcoal-light">
                                Weight:{' '}

                                <span className="text-charcoal">
                                  {item.customPrint.estimatedWeight} g
                                </span>
                              </p>
                            )}

                            {item.customPrint.volume !== undefined && (
                              <p className="text-charcoal-light">
                                Volume:{' '}

                                <span className="text-charcoal">
                                  {item.customPrint.volume.toFixed(2)} cm³
                                </span>
                              </p>
                            )}
                          </div>
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

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center border border-brand-100 rounded-full overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            cartItemId,
                            item.quantity - 1
                          )
                        }
                        disabled={item.quantity <= 1}
                        className="w-9 h-9 flex items-center justify-center text-charcoal-light hover:bg-brand-50 disabled:opacity-40 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="min-w-10 text-center text-sm font-medium text-charcoal">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            cartItemId,
                            Math.min(
                              item.quantity + 1,
                              maxQuantity
                            )
                          )
                        }
                        disabled={item.quantity >= maxQuantity}
                        className="w-9 h-9 flex items-center justify-center text-charcoal-light hover:bg-brand-50 disabled:opacity-40 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="font-semibold text-charcoal">
                      ₹
                      {(itemPrice * item.quantity).toLocaleString(
                        'en-IN'
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="lg:w-96">
          <Card className="p-6 sticky top-28">
            <h2 className="text-xl font-serif font-semibold text-charcoal mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-charcoal-light">
                  Subtotal
                </span>

                <span className="font-medium text-charcoal">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-charcoal-light">
                  Shipping
                </span>

                <span className="font-medium text-charcoal">
                  {shipping === 0
                    ? 'Free'
                    : `₹${shipping.toLocaleString('en-IN')}`}
                </span>
              </div>

              {subtotal > 0 &&
                subtotal < freeShippingThreshold && (
                  <p className="text-xs text-brand-600 bg-brand-50 rounded-xl px-3 py-2">
                    Add ₹
                    {(
                      freeShippingThreshold - subtotal
                    ).toLocaleString('en-IN')}{' '}
                    more for free shipping.
                  </p>
                )}

              <div className="border-t border-brand-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-charcoal">
                    Total
                  </span>

                  <span className="text-2xl font-bold text-brand-600">
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full mt-6"
              onClick={() => navigate('/checkout')}
            >
              Proceed to Checkout

              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Link
              to="/catalog"
              className="block text-center text-sm text-charcoal-light hover:text-brand-600 mt-4 transition-colors"
            >
              Continue Shopping
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}