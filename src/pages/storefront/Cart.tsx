import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FileBox,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';

import {
  getCartItemId,
  useStore,
} from '../../store';
import {
  Button,
} from '../../components/ui';
import { useSettings } from '../../hooks/useSettings';

export function Cart() {
  const cart = useStore(
    (state) => state.cart
  );

  const updateQuantity = useStore(
    (state) => state.updateCartQuantity
  );

  const removeFromCart = useStore(
    (state) => state.removeFromCart
  );

  const navigate = useNavigate();

  const { data: settings } =
    useSettings();

  /*
   * =========================================================
   * PRICING
   * =========================================================
   */

  const getItemPrice = (
    item: (typeof cart)[number]
  ) =>
    item.customPrint?.customPrice ??
    item.product.price;

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      getItemPrice(item) *
        item.quantity,
    0
  );

  /*
   * Keep the existing application settings.
   * Do not hardcode Magic Patterns' shipping values.
   */

  const shippingRate =
    settings?.shippingFlatRate ?? 150;

  const freeShippingThreshold =
    settings?.freeShippingThreshold ?? 499;

  const shipping =
    subtotal >=
      freeShippingThreshold ||
    subtotal === 0
      ? 0
      : shippingRate;

  const total =
    subtotal + shipping;

  const amountForFreeShipping =
    Math.max(
      0,
      freeShippingThreshold -
        subtotal
    );

  /*
   * =========================================================
   * EMPTY CART
   * =========================================================
   */

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#f7f4ee]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">

          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ded8ce] pb-6">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#b4491e]">
                Your cart
              </p>

              <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-[-0.035em] text-[#171512] sm:text-4xl">
                Nothing in the cart yet
              </h1>
            </div>

            <Link
              to="/catalog"
              className="border-b border-[#171512] pb-0.5 text-sm font-medium text-[#171512] transition-colors hover:border-[#b4491e] hover:text-[#b4491e]"
            >
              Continue shopping
            </Link>
          </div>

          <div className="mt-10 flex min-h-[420px] items-center justify-center">
            <div className="w-full max-w-xl border border-[#ded8ce] bg-white px-6 py-14 text-center sm:px-10">

              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[#d4cdc2] bg-[#f7f4ee] text-[#b4491e]">
                <ShoppingBag
                  className="h-6 w-6"
                  aria-hidden="true"
                />
              </div>

              <h2 className="mt-6 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#171512]">
                Your cart is empty
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#746c63]">
                Browse finished prints from
                the collection, or upload your
                own model and request a custom
                quote.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-2.5">
                <Link to="/catalog">
                  <Button
                    size="lg"
                    className="bg-[#171512] hover:bg-[#2b2824]"
                  >
                    Shop 3D prints
                  </Button>
                </Link>

                <Link to="/custom-service">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-[#bdb5aa] bg-white"
                  >
                    Custom print your model
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * CART
   * =========================================================
   */

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#171512]">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <section className="border-b border-[#ded8ce] bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#b4491e]">
                Your cart
              </p>

              <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-[-0.035em] text-[#171512] sm:text-4xl">
                {cart.length}{' '}
                {cart.length === 1
                  ? 'item'
                  : 'items'}{' '}
                ready
              </h1>
            </div>

            <Link
              to="/catalog"
              className="border-b border-[#171512] pb-0.5 text-sm font-medium text-[#171512] transition-colors hover:border-[#b4491e] hover:text-[#b4491e]"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">

          {/* =================================================
              CART ITEMS
          ================================================== */}

          <section className="lg:col-span-8">

            {/* Desktop table heading */}
            <div className="hidden grid-cols-[1fr_120px_120px_40px] gap-4 border-b border-[#171512] pb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8d847a] sm:grid">
              <span>Item</span>

              <span>Quantity</span>

              <span className="text-right">
                Line total
              </span>

              <span
                className="sr-only"
                aria-hidden="true"
              >
                Remove
              </span>
            </div>

            <div>
              {cart.map((item) => {
                const cartItemId =
                  getCartItemId(item);

                const selectedVariant =
                  item.variantId
                    ? item.product.variants?.find(
                        (variant) =>
                          variant.id ===
                          item.variantId
                      )
                    : undefined;

                const availableStock =
                  selectedVariant?.stock ??
                  item.product.stock;

                const isCustomPrint =
                  Boolean(
                    item.customPrint
                  );

                const itemPrice =
                  getItemPrice(item);

                /*
                 * Existing behavior:
                 * If stock is unavailable, preserve
                 * the current 999 fallback for cart
                 * quantity controls.
                 */
                const maxQuantity =
                  availableStock > 0
                    ? availableStock
                    : 999;

                const lineTotal =
                  itemPrice *
                  item.quantity;

                return (
                  <article
                    key={cartItemId}
                    className="grid grid-cols-[88px_1fr] items-start gap-4 border-b border-[#ded8ce] py-5 sm:grid-cols-[1fr_120px_120px_40px] sm:items-center"
                  >

                    {/* =================================================
                        PRODUCT
                    ================================================== */}

                    <div className="col-span-2 flex min-w-0 gap-4 sm:col-span-1">

                      <Link
                        to={
                          isCustomPrint
                            ? '/custom-service'
                            : `/product/${item.product.id}`
                        }
                        className="h-20 w-20 shrink-0 overflow-hidden border border-[#ded8ce] bg-[#e8e2d8]"
                      >
                        {isCustomPrint ? (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-[#f7e5dd] text-[#b4491e]">
                            <FileBox
                              className="h-7 w-7"
                              aria-hidden="true"
                            />

                            <span className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em]">
                              Custom
                            </span>
                          </div>
                        ) : (
                          <img
                            src={
                              item.product.image
                            }
                            alt={
                              item.product.name
                            }
                            className="h-full w-full object-cover"
                          />
                        )}
                      </Link>

                      <div className="min-w-0">

                        <Link
                          to={
                            isCustomPrint
                              ? '/custom-service'
                              : `/product/${item.product.id}`
                          }
                          className="font-serif text-base font-semibold leading-snug text-[#171512] transition-colors hover:text-[#b4491e]"
                        >
                          {
                            item.product.name
                          }
                        </Link>

                        {item.variantLabel && (
                          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[#8d847a]">
                            Option:{' '}
                            {
                              item.variantLabel
                            }
                          </p>
                        )}

                        <p className="mt-1.5 text-[13px] text-[#746c63]">
                          ₹
                          {itemPrice.toLocaleString(
                            'en-IN'
                          )}{' '}
                          each

                          {isCustomPrint && (
                            <span className="ml-1 font-mono text-[8px] uppercase tracking-[0.05em] text-[#9a8e82]">
                              estimated
                            </span>
                          )}
                        </p>

                        {/* =================================================
                            CUSTOM PRINT DETAILS
                        ================================================== */}

                        {isCustomPrint && (
                          <div className="mt-3 border-l-2 border-[#b4491e] bg-[#f7f1e9] px-3 py-2.5">

                            <div className="flex items-center gap-2">
                              <FileBox
                                className="h-3.5 w-3.5 shrink-0 text-[#b4491e]"
                                aria-hidden="true"
                              />

                              <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#625b53]">
                                Custom print
                              </span>
                            </div>

                            {item.customPrint
                              ?.fileName && (
                              <p className="mt-1.5 break-all text-[12px] text-[#746c63]">
                                Model:{' '}
                                <span className="font-medium text-[#171512]">
                                  {
                                    item.customPrint
                                      .fileName
                                  }
                                </span>
                              </p>
                            )}

                            <div className="mt-2 grid gap-x-4 gap-y-1 text-[11px] text-[#746c63] sm:grid-cols-2">

                              {item
                                .customPrint
                                ?.material && (
                                <p>
                                  Material:{' '}
                                  <span className="text-[#171512]">
                                    {
                                      item
                                        .customPrint
                                        .material
                                    }
                                  </span>
                                </p>
                              )}

                              {item
                                .customPrint
                                ?.color && (
                                <p>
                                  Color:{' '}
                                  <span className="text-[#171512]">
                                    {
                                      item
                                        .customPrint
                                        .color
                                    }
                                  </span>
                                </p>
                              )}

                              {item
                                .customPrint
                                ?.infill !==
                                undefined && (
                                <p>
                                  Infill:{' '}
                                  <span className="text-[#171512]">
                                    {
                                      item
                                        .customPrint
                                        .infill
                                    }
                                    %
                                  </span>
                                </p>
                              )}

                              {item
                                .customPrint
                                ?.layerHeight !==
                                undefined && (
                                <p>
                                  Layer:{' '}
                                  <span className="text-[#171512]">
                                    {
                                      item
                                        .customPrint
                                        .layerHeight
                                    }{' '}
                                    mm
                                  </span>
                                </p>
                              )}

                              {item
                                .customPrint
                                ?.estimatedWeight !==
                                undefined && (
                                <p>
                                  Weight:{' '}
                                  <span className="text-[#171512]">
                                    {
                                      item
                                        .customPrint
                                        .estimatedWeight
                                    }{' '}
                                    g
                                  </span>
                                </p>
                              )}

                              {item
                                .customPrint
                                ?.volume !==
                                undefined && (
                                <p>
                                  Volume:{' '}
                                  <span className="text-[#171512]">
                                    {item.customPrint.volume.toFixed(
                                      2
                                    )}{' '}
                                    cm³
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* =================================================
                            PERSONALISATION
                        ================================================== */}

                        {item.customNotes && (
                          <div className="mt-3 border-l border-[#bdb5aa] pl-3">
                            <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#8d847a]">
                              Personalisation
                            </p>

                            <p className="mt-1 text-[12px] italic leading-5 text-[#746c63]">
                              "{item.customNotes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* =================================================
                        QUANTITY
                    ================================================== */}

                    <div className="col-start-2 sm:col-start-auto">

                      <div className="flex h-9 items-center border border-[#d4cdc2] bg-white">

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              cartItemId,
                              item.quantity -
                                1
                            )
                          }
                          disabled={
                            item.quantity <=
                            1
                          }
                          aria-label={`Decrease quantity of ${item.product.name}`}
                          className="flex h-full w-9 items-center justify-center text-[#746c63] transition-colors hover:bg-[#f7f4ee] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>

                        <span
                          aria-live="polite"
                          className="flex min-w-9 justify-center text-xs font-medium text-[#171512]"
                        >
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              cartItemId,
                              Math.min(
                                item.quantity +
                                  1,
                                maxQuantity
                              )
                            )
                          }
                          disabled={
                            item.quantity >=
                            maxQuantity
                          }
                          aria-label={`Increase quantity of ${item.product.name}`}
                          className="flex h-full w-9 items-center justify-center text-[#746c63] transition-colors hover:bg-[#f7f4ee] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      {availableStock >
                        0 && (
                        <p className="mt-1.5 font-mono text-[7px] uppercase tracking-[0.06em] text-[#9a8e82]">
                          {availableStock}{' '}
                          available
                        </p>
                      )}
                    </div>

                    {/* =================================================
                        LINE TOTAL
                    ================================================== */}

                    <p className="col-start-2 font-mono text-[14px] text-[#171512] sm:col-start-auto sm:text-right">
                      ₹
                      {lineTotal.toLocaleString(
                        'en-IN'
                      )}
                    </p>

                    {/* =================================================
                        REMOVE
                    ================================================== */}

                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(
                          cartItemId
                        )
                      }
                      aria-label={`Remove ${item.product.name} from cart`}
                      className="col-start-2 flex h-8 w-8 items-center justify-center text-[#8d847a] transition-colors hover:bg-[#eee6df] hover:text-[#a23c20] sm:col-start-auto sm:justify-self-end"
                    >
                      <Trash2
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>
                  </article>
                );
              })}
            </div>

            {/* =================================================
                CUSTOM PRINT CTA
            ================================================== */}

            <p className="mt-5 text-[13px] leading-6 text-[#746c63]">
              Need a variation of one of
              these — a different size,
              colour or material?{' '}

              <Link
                to="/custom-service"
                className="border-b border-[#8d847a] text-[#171512] transition-colors hover:border-[#b4491e] hover:text-[#b4491e]"
              >
                Send us the change
              </Link>{' '}
              and we can print it to
              your requirements.
            </p>
          </section>

          {/* =================================================
              ORDER SUMMARY
          ================================================== */}

          <aside className="lg:col-span-4">
            <div className="border border-[#d4cdc2] bg-white p-5 lg:sticky lg:top-28">

              <h2 className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8d847a]">
                Order summary
              </h2>

              <dl className="mt-4 space-y-3 border-b border-[#ded8ce] pb-5 text-sm">

                <div className="flex justify-between gap-4">
                  <dt className="text-[#746c63]">
                    Subtotal
                  </dt>

                  <dd className="font-mono text-[#171512]">
                    ₹
                    {subtotal.toLocaleString(
                      'en-IN'
                    )}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-[#746c63]">
                    Shipping
                  </dt>

                  <dd className="font-mono text-[#171512]">
                    {shipping === 0
                      ? 'Free'
                      : `₹${shipping.toLocaleString(
                          'en-IN'
                        )}`}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-[#746c63]">
                    GST
                  </dt>

                  <dd className="font-mono text-[12px] text-[#8d847a]">
                    Included where applicable
                  </dd>
                </div>
              </dl>

              {/* =================================================
                  FREE SHIPPING MESSAGE
              ================================================== */}

              {shipping > 0 &&
                amountForFreeShipping >
                  0 && (
                  <p className="mt-4 border-l-2 border-[#b4491e] bg-[#f7f1e9] px-3 py-2.5 text-[12px] leading-5 text-[#625b53]">
                    Add{' '}
                    <span className="font-medium text-[#171512]">
                      ₹
                      {amountForFreeShipping.toLocaleString(
                        'en-IN'
                      )}
                    </span>{' '}
                    more for free
                    shipping.
                  </p>
                )}

              {/* =================================================
                  TOTAL
              ================================================== */}

              <div className="flex items-baseline justify-between py-5">
                <span className="text-sm font-medium text-[#171512]">
                  Total
                </span>

                <span className="font-serif text-2xl font-semibold tracking-[-0.02em] text-[#171512]">
                  ₹
                  {total.toLocaleString(
                    'en-IN'
                  )}
                </span>
              </div>

              {/* =================================================
                  CHECKOUT
              ================================================== */}

              <Button
                size="lg"
                className="w-full bg-[#171512] hover:bg-[#2b2824]"
                onClick={() =>
                  navigate('/checkout')
                }
              >
                Proceed to checkout

                <ArrowRight
                  className="ml-2 h-4 w-4"
                  aria-hidden="true"
                />
              </Button>

              <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.08em] text-[#8d847a]">
                Secure checkout · UPI · Cards
              </p>

              <Link
                to="/catalog"
                className="mt-4 block text-center text-sm text-[#746c63] transition-colors hover:text-[#b4491e]"
              >
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}