import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* -------------------------------------------------------------------------- */
/* Product Types                                                              */
/* -------------------------------------------------------------------------- */

export type ProductMaterial =
  | 'PLA'
  | 'PETG'
  | 'Resin'
  | 'Wood PLA'
  | 'Silk PLA';

export type Occasion =
  | 'Personalised'
  | 'Couples'
  | 'Home & Interior'
  | null;

export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  stock: number;
  image?: string;
  theme?: string;
  color?: string;
  size?: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images?: string[];
  stock: number;
  material?: ProductMaterial | string;
  occasion?: Occasion | string;
  isCustomizable?: boolean;
  featured?: boolean;
  active?: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
};

/* -------------------------------------------------------------------------- */
/* Custom Print Types                                                         */
/* -------------------------------------------------------------------------- */

export type CustomPrintData = {
  fileName?: string;
  fileUrl?: string;

  material?: string;
  color?: string;

  infill?: number;
  layerHeight?: number;

  volume?: number;
  estimatedWeight?: number;

  /**
   * Price calculated specifically
   * for this custom print.
   */
  customPrice: number;
};

/* -------------------------------------------------------------------------- */
/* Cart Types                                                                 */
/* -------------------------------------------------------------------------- */

export type CartItem = {
  product: Product;
  quantity: number;

  customNotes?: string;

  variantId?: string;
  variantLabel?: string;

  /**
   * Present only when the cart item
   * represents a custom 3D print.
   */
  customPrint?: CustomPrintData;
};

/* -------------------------------------------------------------------------- */
/* Order Types                                                                */
/* -------------------------------------------------------------------------- */

export type OrderStatus =
  | 'Pending'
  | 'Printing'
  | 'Quality Check'
  | 'Shipped'
  | 'Delivered';

export type Order = {
  id: string;
  date: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;

  items: CartItem[];

  total: number;

  status: OrderStatus;
};

/* -------------------------------------------------------------------------- */
/* Quote Types                                                                */
/* -------------------------------------------------------------------------- */

export type QuoteRequest = {
  id: string;
  date: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  fileName?: string;
  filePreviewUrl?: string;

  material?: string;
  color?: string;

  quantity: number;

  notes?: string;

  status:
    | 'Pending'
    | 'Approved'
    | 'Rejected';

  estimatedPrice?: number;
};

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export type Settings = {
  businessName: string;
  whatsappNumber: string;
  email: string;
  phone: string;
  address: string;

  shippingFlatRate: number;
  freeShippingThreshold: number;

  upiId: string;
};

const INITIAL_SETTINGS: Settings = {
  businessName: 'Shilp Sahayak',
  whatsappNumber: '',
  email: '',
  phone: '',
  address:
    'Patiala, Punjab',

  shippingFlatRate: 150,
  freeShippingThreshold: 499,

  upiId: 'shilpsahayak@okhdfcbank'
};

/* -------------------------------------------------------------------------- */
/* Store State                                                                */
/* -------------------------------------------------------------------------- */

interface StoreState {
  products: Product[];

  cart: CartItem[];

  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  orders: Order[];

  quotes: QuoteRequest[];

  settings: Settings;

  /* Cart */
  addToCart: (
    product: Product,
    quantity: number,
    customNotes?: string,
    variantLabel?: string,
    variantId?: string,
    customPrint?: CustomPrintData
  ) => void;

  removeFromCart: (
    cartItemId: string
  ) => void;

  updateCartQuantity: (
    cartItemId: string,
    quantity: number
  ) => void;

  clearCart: () => void;

  /* Orders */
  placeOrder: (
    orderData: Omit<
      Order,
      'id' | 'date' | 'status'
    >
  ) => void;

  updateOrderStatus: (
    orderId: string,
    status: OrderStatus
  ) => void;

  /* Quotes */
  submitQuote: (
    quoteData: Omit<
      QuoteRequest,
      'id' | 'date' | 'status'
    >
  ) => void;

  updateQuoteStatus: (
    quoteId: string,
    status: QuoteRequest['status'],
    price?: number
  ) => void;

  /* Products */
  addProduct: (
    product: Omit<Product, 'id'>
  ) => void;

  updateProduct: (
    id: string,
    product: Partial<Product>
  ) => void;

  deleteProduct: (
    id: string
  ) => void;

  toggleProductActive: (
    id: string
  ) => void;

  /* Settings */
  updateSettings: (
    partial: Partial<Settings>
  ) => void;
}

/* -------------------------------------------------------------------------- */
/* Cart Item Identity                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Creates a unique identity for a cart line.
 *
 * Normal products:
 *
 * product + variant + custom notes
 *
 * Custom prints:
 *
 * product + variant + custom notes + custom model
 *
 * This prevents two different custom models
 * from being merged into the same cart item.
 */
export const getCartItemId = (item: {
  product: Product;
  variantId?: string;
  variantLabel?: string;
  customNotes?: string;
  customPrint?: CustomPrintData;
}) => {
  const customPrintId =
    item.customPrint?.fileUrl ||
    item.customPrint?.fileName ||
    '';

  return [
    item.product.id,
    item.variantId ||
      item.variantLabel ||
      'default',
    item.customNotes || '',
    customPrintId
  ].join('::');
};

/* -------------------------------------------------------------------------- */
/* Zustand Store                                                              */
/* -------------------------------------------------------------------------- */

export const useStore =
  create<StoreState>()(
    persist(
      (set) => ({
        /* ------------------------------------------------------------------ */
        /* Initial State                                                       */
        /* ------------------------------------------------------------------ */

        products: [],

        cart: [],

        isCartOpen: false,
        openCart: () => set({ isCartOpen: true }),
        closeCart: () => set({ isCartOpen: false }),

        orders: [],

        quotes: [],

        settings: INITIAL_SETTINGS,

        /* ------------------------------------------------------------------ */
        /* Add To Cart                                                         */
        /* ------------------------------------------------------------------ */

        addToCart: (
          product,
          quantity,
          customNotes,
          variantLabel,
          variantId,
          customPrint
        ) =>
          set((state) => {
            const newCartItemId =
              getCartItemId({
                product,
                variantId,
                variantLabel,
                customNotes,
                customPrint
              });

            const existingItemIndex =
              state.cart.findIndex(
                (item) =>
                  getCartItemId(item) ===
                  newCartItemId
              );

            if (existingItemIndex > -1) {
              const updatedCart = [...state.cart];
              updatedCart[existingItemIndex].quantity += quantity;
              return { cart: updatedCart, isCartOpen: true };
            }

            return {
              cart: [
                ...state.cart,
                {
                  product,
                  quantity,
                  customNotes,
                  variantLabel,
                  variantId,
                  customPrint
                }
              ],
              isCartOpen: true
            };
          }),

        /* ------------------------------------------------------------------ */
        /* Remove From Cart                                                    */
        /* ------------------------------------------------------------------ */

        removeFromCart: (
          cartItemId
        ) =>
          set((state) => ({
            cart: state.cart.filter(
              (item) =>
                getCartItemId(item) !==
                cartItemId
            )
          })),

        /* ------------------------------------------------------------------ */
        /* Update Cart Quantity                                                */
        /* ------------------------------------------------------------------ */

        updateCartQuantity: (
          cartItemId,
          quantity
        ) =>
          set((state) => ({
            cart:
              quantity <= 0
                ? state.cart.filter(
                    (item) =>
                      getCartItemId(item) !==
                      cartItemId
                  )
                : state.cart.map(
                    (item) =>
                      getCartItemId(item) ===
                      cartItemId
                        ? {
                            ...item,
                            quantity
                          }
                        : item
                  )
          })),

        /* ------------------------------------------------------------------ */
        /* Clear Cart                                                          */
        /* ------------------------------------------------------------------ */

        clearCart: () =>
          set({
            cart: []
          }),

        /* ------------------------------------------------------------------ */
        /* Place Order                                                         */
        /* ------------------------------------------------------------------ */

        placeOrder: (
          orderData
        ) =>
          set((state) => ({
            orders: [
              {
                ...orderData,

                id: `ORD-${
                  1000 +
                  state.orders.length +
                  1
                }`,

                date:
                  new Date().toISOString(),

                status: 'Pending'
              },

              ...state.orders
            ],

            cart: []
          })),

        /* ------------------------------------------------------------------ */
        /* Update Order Status                                                 */
        /* ------------------------------------------------------------------ */

        updateOrderStatus: (
          orderId,
          status
        ) =>
          set((state) => ({
            orders:
              state.orders.map(
                (order) =>
                  order.id === orderId
                    ? {
                        ...order,
                        status
                      }
                    : order
              )
          })),

        /* ------------------------------------------------------------------ */
        /* Submit Quote                                                        */
        /* ------------------------------------------------------------------ */

        submitQuote: (
          quoteData
        ) =>
          set((state) => ({
            quotes: [
              {
                ...quoteData,

                id: `QT-${
                  2000 +
                  state.quotes.length +
                  1
                }`,

                date:
                  new Date().toISOString(),

                status: 'Pending'
              },

              ...state.quotes
            ]
          })),

        /* ------------------------------------------------------------------ */
        /* Update Quote Status                                                 */
        /* ------------------------------------------------------------------ */

        updateQuoteStatus: (
          quoteId,
          status,
          price
        ) =>
          set((state) => ({
            quotes:
              state.quotes.map(
                (quote) =>
                  quote.id === quoteId
                    ? {
                        ...quote,

                        status,

                        estimatedPrice:
                          price ??
                          quote.estimatedPrice
                      }
                    : quote
              )
          })),

        /* ------------------------------------------------------------------ */
        /* Add Product                                                         */
        /* ------------------------------------------------------------------ */

        addProduct: (
          product
        ) =>
          set((state) => ({
            products: [
              ...state.products,

              {
                ...product,

                id: `p${Date.now()}`,

                active:
                  product.active ??
                  true
              }
            ]
          })),

        /* ------------------------------------------------------------------ */
        /* Update Product                                                      */
        /* ------------------------------------------------------------------ */

        updateProduct: (
          id,
          productUpdate
        ) =>
          set((state) => ({
            products:
              state.products.map(
                (product) =>
                  product.id === id
                    ? {
                        ...product,
                        ...productUpdate
                      }
                    : product
              )
          })),

        /* ------------------------------------------------------------------ */
        /* Delete Product                                                      */
        /* ------------------------------------------------------------------ */

        deleteProduct: (
          id
        ) =>
          set((state) => ({
            products:
              state.products.filter(
                (product) =>
                  product.id !== id
              )
          })),

        /* ------------------------------------------------------------------ */
        /* Toggle Product Active                                                */
        /* ------------------------------------------------------------------ */

        toggleProductActive: (
          id
        ) =>
          set((state) => ({
            products:
              state.products.map(
                (product) =>
                  product.id === id
                    ? {
                        ...product,

                        active:
                          !(
                            product.active !==
                            false
                          )
                      }
                    : product
              )
          })),

        /* ------------------------------------------------------------------ */
        /* Update Settings                                                     */
        /* ------------------------------------------------------------------ */

        updateSettings: (
          partial
        ) =>
          set((state) => ({
            settings: {
              ...state.settings,
              ...partial
            }
          }))
      }),

      /* -------------------------------------------------------------------- */
      /* Persistence                                                           */
      /* -------------------------------------------------------------------- */

      {
        name:
          'shilp-sahayak-store',

        /*
         * Bumped from the implicit default (0) to 1.
         *
         * This clears out any cart AND settings data that was
         * persisted to a browser's localStorage during earlier
         * development/testing - including an old default studio
         * address ("Mumbai, Maharashtra") that no longer applies.
         * Without this, browsers that visited before this fix would
         * keep showing that stale cached value forever, since persist
         * rehydrates from localStorage and overrides the current
         * source-code default. Runs once per browser; harmless after.
         */
        version: 1,
        migrate: () => ({
          cart: [],
          settings: INITIAL_SETTINGS
        }),

        /*
         * Only persist cart and settings.
         *
         * Custom print specifications are
         * automatically persisted because they
         * are part of each CartItem.
         */
        partialize: (state) => ({
          cart: state.cart,
          settings: state.settings
        })
      }
    )
  );