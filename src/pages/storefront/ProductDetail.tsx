import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
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
import {
  Button,
  Card,
} from '../../components/ui';

export function ProductDetail() {
  const { id } = useParams<{
    id: string;
  }>();

  const {
    data: products = [],
    isLoading,
    isError,
  } = useProducts();

  const addToCart = useStore(
    (state) => state.addToCart
  );

  const product = products.find(
    (item) => item.id === id
  );

  const hasVariants = Boolean(
    product?.hasVariants &&
      product.variants &&
      product.variants.length > 0
  );

  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariant | null>(null);

  const [quantity, setQuantity] = useState(1);

  const [activeImage, setActiveImage] =
    useState('');

  const [customNotes, setCustomNotes] =
    useState('');

  const [added, setAdded] =
    useState(false);

  /*
   * =========================================================
   * INITIALIZE VARIANT + IMAGE
   * =========================================================
   */

  useEffect(() => {
    if (!product) {
      return;
    }

    if (
      hasVariants &&
      product.variants &&
      product.variants.length > 0
    ) {
      const firstVariant =
        product.variants[0];

      setSelectedVariant(firstVariant);

      setActiveImage(
        firstVariant.image ||
          product.image
      );

      setQuantity(1);

      return;
    }

    setSelectedVariant(null);
    setActiveImage(product.image);
    setQuantity(1);
  }, [
    product,
    hasVariants,
  ]);

  /*
   * =========================================================
   * PRODUCT GALLERY
   * =========================================================
   */

  const galleryImages = useMemo(() => {
    if (!product) {
      return [];
    }

    const images = new Set<string>();

    if (product.image) {
      images.add(product.image);
    }

    product.images?.forEach(
      (image) => {
        if (image) {
          images.add(image);
        }
      }
    );

    product.variants?.forEach(
      (variant) => {
        if (variant.image) {
          images.add(variant.image);
        }
      }
    );

    return Array.from(images);
  }, [product]);

  /*
   * =========================================================
   * CURRENT PRODUCT STATE
   * =========================================================
   */

  const currentPrice =
    selectedVariant?.price ??
    product?.price ??
    0;

  const currentStock =
    selectedVariant?.stock ??
    product?.stock ??
    0;

  const outOfStock =
    currentStock <= 0;

  /*
   * =========================================================
   * RELATED PRODUCTS
   * =========================================================
   */

  const relatedProducts = useMemo(() => {
    if (!product) {
      return [];
    }

    const sameCategory =
      products.filter(
        (item) =>
          item.id !== product.id &&
          item.active !== false &&
          item.category ===
            product.category
      );

    const otherProducts =
      products.filter(
        (item) =>
          item.id !== product.id &&
          item.active !== false &&
          item.category !==
            product.category
      );

    return [
      ...sameCategory,
      ...otherProducts,
    ].slice(0, 3);
  }, [
    product,
    products,
  ]);

  /*
   * =========================================================
   * VARIANT SELECT
   * =========================================================
   */

  const handleVariantSelect = (
    variant: ProductVariant
  ) => {
    if (variant.stock <= 0) {
      return;
    }

    setSelectedVariant(variant);

    if (variant.image) {
      setActiveImage(
        variant.image
      );
    } else if (product?.image) {
      setActiveImage(
        product.image
      );
    }

    setQuantity(1);
    setAdded(false);
  };

  /*
   * =========================================================
   * QUANTITY
   * =========================================================
   */

  const decreaseQuantity = () => {
    setQuantity(
      (current) =>
        Math.max(1, current - 1)
    );
  };

  const increaseQuantity = () => {
    setQuantity(
      (current) =>
        Math.min(
          currentStock || 1,
          current + 1
        )
    );
  };

  /*
   * =========================================================
   * ADD TO CART
   * =========================================================
   */

  const handleAddToCart = () => {
    if (
      !product ||
      outOfStock
    ) {
      return;
    }

    addToCart(
      {
        ...product,
        price: currentPrice,
        stock: currentStock,
        image:
          activeImage ||
          product.image,
      },
      quantity,
      customNotes || undefined,
      selectedVariant?.label,
      selectedVariant?.id
    );

    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 2000);
  };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (isLoading) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ee]">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2
              className="h-7 w-7 animate-spin text-[#b4491e]"
              aria-hidden="true"
            />

            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8d847a]">
              Loading product
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * ERROR / NOT FOUND
   * =========================================================
   */

  if (isError || !product) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ee]">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-5 py-20 text-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#b4491e]">
              Product unavailable
            </p>

            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] text-[#171512]">
              Product not found
            </h1>

            <p className="mt-4 text-sm leading-6 text-[#746c63]">
              This product may have been
              removed or is no longer
              available.
            </p>

            <Link
              to="/catalog"
              className="mt-7 inline-block"
            >
              <Button className="bg-[#171512] hover:bg-[#2b2824]">
                Back to Catalogue
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#171512]">

      {/* =====================================================
          BREADCRUMB
      ====================================================== */}

      <div className="border-b border-[#ded8ce] bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-4 sm:px-8 lg:px-10">
          <nav
            aria-label="Breadcrumb"
          >
            <ol className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8d847a]">
              <li>
                <Link
                  to="/"
                  className="transition-colors hover:text-[#171512]"
                >
                  Home
                </Link>
              </li>

              <ChevronRight
                className="h-3 w-3"
                aria-hidden="true"
              />

              <li>
                <Link
                  to="/catalog"
                  className="transition-colors hover:text-[#171512]"
                >
                  Catalogue
                </Link>
              </li>

              <ChevronRight
                className="h-3 w-3"
                aria-hidden="true"
              />

              <li
                className="max-w-[220px] truncate text-[#171512]"
                title={product.name}
              >
                {product.name}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* =====================================================
          MAIN PRODUCT AREA
      ====================================================== */}

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">

        <Link
          to="/catalog"
          className="mb-8 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#746c63] transition-colors hover:text-[#171512]"
        >
          <ArrowLeft
            className="h-3.5 w-3.5"
            aria-hidden="true"
          />

          Back to catalogue
        </Link>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">

          {/* =================================================
              LEFT — PRODUCT GALLERY
          ================================================== */}

          <section className="lg:col-span-7">

            <div className="overflow-hidden border border-[#ded8ce] bg-white">
              <div className="aspect-square overflow-hidden bg-[#e8e2d8]">

                <img
                  src={
                    activeImage ||
                    product.image
                  }
                  alt={product.name}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    const image =
                      event.currentTarget;

                    if (
                      image.dataset.fallbackApplied
                    ) {
                      return;
                    }

                    image.dataset.fallbackApplied =
                      'true';

                    image.src =
                      'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=1200';
                  }}
                />
              </div>
            </div>

            {/* Gallery thumbnails */}
            {galleryImages.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {galleryImages.map(
                  (image) => {
                    const selected =
                      activeImage ===
                      image;

                    return (
                      <button
                        key={image}
                        type="button"
                        onClick={() =>
                          setActiveImage(
                            image
                          )
                        }
                        aria-label={`View ${product.name} image`}
                        aria-pressed={
                          selected
                        }
                        className={`h-20 w-20 shrink-0 overflow-hidden border bg-white transition-colors ${
                          selected
                            ? 'border-[#171512]'
                            : 'border-[#ded8ce] hover:border-[#8d847a]'
                        }`}
                      >
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  }
                )}
              </div>
            )}

            {/* =================================================
                DESCRIPTION + SPECIFICATIONS
            ================================================== */}

            <div className="mt-10 grid gap-10 border-t border-[#ded8ce] pt-8 sm:grid-cols-2">

              <div>
                <h2 className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8d847a]">
                  About this print
                </h2>

                <p className="mt-3 whitespace-pre-line text-[14px] leading-7 text-[#625b53]">
                  {product.description ||
                    'No description available.'}
                </p>
              </div>

              <div>
                <h2 className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8d847a]">
                  Specifications
                </h2>

                <div className="mt-3 divide-y divide-[#e7e1d8] border-y border-[#e7e1d8]">

                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-xs text-[#8d847a]">
                      Category
                    </span>

                    <span className="text-right text-xs font-medium text-[#171512]">
                      {product.category ||
                        '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-xs text-[#8d847a]">
                      Material
                    </span>

                    <span className="text-right text-xs font-medium text-[#171512]">
                      {product.material ||
                        '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-3">
                    <span className="text-xs text-[#8d847a]">
                      Availability
                    </span>

                    <span className="text-right text-xs font-medium text-[#171512]">
                      {outOfStock
                        ? 'Out of stock'
                        : `${currentStock} available`}
                    </span>
                  </div>

                  {product.isCustomizable && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <span className="text-xs text-[#8d847a]">
                        Personalisation
                      </span>

                      <span className="text-right text-xs font-medium text-[#b4491e]">
                        Available
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              RIGHT — PRODUCT INFORMATION
          ================================================== */}

          <section className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">

              {/* Category / status */}
              <div className="flex flex-wrap items-center gap-2">
                {product.category && (
                  <span className="border border-[#d4cdc2] bg-white px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#625b53]">
                    {product.category}
                  </span>
                )}

                {product.isCustomizable && (
                  <span className="border border-[#e2b8a5] bg-[#f7e5dd] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#9b3d17]">
                    Customisable
                  </span>
                )}

                {outOfStock && (
                  <span className="border border-[#e1d0c8] bg-[#f3ece8] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8b4a35]">
                    Out of stock
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#171512] sm:text-5xl">
                {product.name}
              </h1>

              {/* Material */}
              {product.material && (
                <p className="mt-3 text-sm text-[#746c63]">
                  Printed in{' '}
                  <span className="font-medium text-[#171512]">
                    {product.material}
                  </span>
                </p>
              )}

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-3 border-y border-[#ded8ce] py-5">
                <span className="font-serif text-3xl font-semibold tracking-[-0.025em] text-[#171512]">
                  ₹
                  {currentPrice.toLocaleString(
                    'en-IN'
                  )}
                </span>

                <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.1em] text-[#8d847a]">
                  Final price shown
                </span>
              </div>

              {/* =================================================
                  VARIANTS
              ================================================== */}

              {hasVariants &&
                product.variants && (
                  <fieldset className="mt-6">
                    <legend className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8d847a]">
                      Select option
                    </legend>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.variants.map(
                        (variant) => {
                          const selected =
                            selectedVariant?.id ===
                            variant.id;

                          const disabled =
                            variant.stock <= 0;

                          return (
                            <button
                              key={
                                variant.id
                              }
                              type="button"
                              disabled={
                                disabled
                              }
                              onClick={() =>
                                handleVariantSelect(
                                  variant
                                )
                              }
                              aria-pressed={
                                selected
                              }
                              className={`inline-flex items-center gap-2 border px-3 py-2.5 text-[13px] transition-colors ${
                                selected
                                  ? 'border-[#171512] bg-[#171512] text-white'
                                  : disabled
                                  ? 'cursor-not-allowed border-[#ded8ce] bg-[#f4f1eb] text-[#aaa197] line-through'
                                  : 'border-[#d4cdc2] bg-white text-[#171512] hover:border-[#171512]'
                              }`}
                            >
                              {variant.label}

                              {disabled && (
                                <span className="font-mono text-[8px] no-underline">
                                  OUT
                                </span>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </fieldset>
                )}

              {/* =================================================
                  QUANTITY
              ================================================== */}

              <div className="mt-6 flex items-center gap-4">
                <div>
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8d847a]">
                    Quantity
                  </p>

                  <div className="flex h-11 items-center border border-[#d4cdc2] bg-white">

                    <button
                      type="button"
                      onClick={
                        decreaseQuantity
                      }
                      disabled={
                        quantity <= 1
                      }
                      aria-label="Decrease quantity"
                      className="flex h-full w-11 items-center justify-center text-[#625b53] transition-colors hover:bg-[#f7f4ee] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>

                    <span
                      aria-live="polite"
                      className="flex w-12 justify-center text-sm font-medium"
                    >
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={
                        increaseQuantity
                      }
                      disabled={
                        outOfStock ||
                        quantity >=
                          currentStock
                      }
                      aria-label="Increase quantity"
                      className="flex h-full w-11 items-center justify-center text-[#625b53] transition-colors hover:bg-[#f7f4ee] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                <div className="pt-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#746c63]">
                    {outOfStock
                      ? 'Currently unavailable'
                      : `${currentStock} in stock`}
                  </p>
                </div>
              </div>

              {/* =================================================
                  CUSTOM NOTES
              ================================================== */}

              {product.isCustomizable && (
                <div className="mt-6">
                  <label
                    htmlFor="custom-notes"
                    className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8d847a]"
                  >
                    Personalisation notes
                    <span className="ml-2 text-[#aaa197]">
                      Optional
                    </span>
                  </label>

                  <textarea
                    id="custom-notes"
                    value={customNotes}
                    onChange={(event) =>
                      setCustomNotes(
                        event.target.value
                      )
                    }
                    placeholder="Name, date, special request..."
                    rows={4}
                    className="mt-3 w-full resize-y border border-[#d4cdc2] bg-white px-3.5 py-3 text-sm leading-6 text-[#171512] outline-none transition-colors placeholder:text-[#aaa197] focus:border-[#171512]"
                  />
                </div>
              )}

              {/* =================================================
                  ACTIONS
              ================================================== */}

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">

                <Button
                  size="lg"
                  disabled={outOfStock}
                  onClick={
                    handleAddToCart
                  }
                  className="flex-1 bg-[#171512] hover:bg-[#2b2824]"
                >
                  <ShoppingCart
                    className="mr-2 h-4 w-4"
                    aria-hidden="true"
                  />

                  {added
                    ? 'Added to cart'
                    : outOfStock
                    ? 'Out of stock'
                    : 'Add to cart'}
                </Button>

                <Link
                  to="/custom-service"
                  className="flex-1"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-[#bdb5aa] bg-white"
                  >
                    Request custom print
                  </Button>
                </Link>
              </div>

              {/* =================================================
                  TRUST / SERVICE INFORMATION
              ================================================== */}

              <ul className="mt-7 space-y-4 border-t border-[#ded8ce] pt-6">

                <li className="flex gap-3">
                  <Truck
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#8d847a]"
                    aria-hidden="true"
                  />

                  <div>
                    <p className="text-[13px] font-medium text-[#171512]">
                      Pan-India shipping
                    </p>

                    <p className="text-[12px] leading-5 text-[#746c63]">
                      Carefully packed and
                      shipped with tracked
                      delivery.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#8d847a]"
                    aria-hidden="true"
                  />

                  <div>
                    <p className="text-[13px] font-medium text-[#171512]">
                      Checked before packing
                    </p>

                    <p className="text-[12px] leading-5 text-[#746c63]">
                      Every print is inspected
                      before it leaves the
                      workspace.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <div className="mt-0.5 h-4 w-4 shrink-0 border border-[#8d847a] text-center font-mono text-[8px] leading-[14px] text-[#746c63]">
                    SS
                  </div>

                  <div>
                    <p className="text-[13px] font-medium text-[#171512]">
                      Made by Shilp Sahayak
                    </p>

                    <p className="text-[12px] leading-5 text-[#746c63]">
                      Designed, printed and
                      quality-checked with care.
                    </p>
                  </div>
                </li>
              </ul>

              {/* Added confirmation */}
              {added && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-5 border border-[#b9d8c2] bg-[#edf7f0] px-4 py-3 text-sm text-[#2f6b40]"
                >
                  {product.name} has been
                  added to your cart.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* =====================================================
          RELATED PRODUCTS
      ====================================================== */}

      {relatedProducts.length > 0 && (
        <section className="border-t border-[#ded8ce] bg-white py-14">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">

            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#b4491e]">
                  You might also need
                </p>

                <h2 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.035em]">
                  Related prints
                </h2>
              </div>

              <Link
                to="/catalog"
                className="hidden font-mono text-[9px] uppercase tracking-[0.1em] text-[#746c63] underline underline-offset-4 transition-colors hover:text-[#171512] sm:block"
              >
                View all
              </Link>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map(
                (relatedProduct) => (
                  <Link
                    key={
                      relatedProduct.id
                    }
                    to={`/product/${relatedProduct.id}`}
                    className="group"
                  >
                    <Card className="h-full overflow-hidden rounded-none border-[#ded8ce] bg-[#f7f4ee] shadow-none transition-shadow duration-300 hover:shadow-[0_12px_35px_rgba(23,21,18,0.08)]">

                      <div className="aspect-square overflow-hidden bg-[#e8e2d8]">
                        <img
                          src={
                            relatedProduct.image
                          }
                          alt={
                            relatedProduct.name
                          }
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                        />
                      </div>

                      <div className="p-5">
                        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#958c81]">
                          {
                            relatedProduct.category
                          }
                        </p>

                        <h3 className="mt-2 line-clamp-2 font-serif text-lg font-semibold leading-snug transition-colors group-hover:text-[#b4491e]">
                          {
                            relatedProduct.name
                          }
                        </h3>

                        <div className="mt-4 flex items-center justify-between border-t border-[#ded8ce] pt-4">
                          <span className="font-medium text-[#b4491e]">
                            ₹
                            {Number(
                              relatedProduct.price
                            ).toLocaleString(
                              'en-IN'
                            )}
                          </span>

                          <span className="text-xs text-[#746c63] transition-colors group-hover:text-[#b4491e]">
                            View →
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                )
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}