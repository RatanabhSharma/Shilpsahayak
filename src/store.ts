import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProductMaterial = 'PLA' | 'PETG' | 'Resin' | 'Wood PLA' | 'Silk PLA';
export type Occasion = 'Personalised' | 'Couples' | 'Home & Interior' | null;

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

export type CartItem = {
  product: Product;
  quantity: number;
  customNotes?: string;
  variantId?: string;
  variantLabel?: string;
};

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

export type QuoteRequest = {
  id: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fileName: string;
  filePreviewUrl?: string;
  material: string;
  color: string;
  quantity: number;
  notes: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  estimatedPrice?: number;
};

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

interface StoreState {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  quotes: QuoteRequest[];
  settings: Settings;

  addToCart: (
    product: Product,
    quantity: number,
    customNotes?: string,
    variantLabel?: string,
    variantId?: string
  ) => void;

  removeFromCart: (cartItemId: string) => void;

  updateCartQuantity: (
    cartItemId: string,
    quantity: number
  ) => void;

  clearCart: () => void;

  placeOrder: (orderData: Omit<Order, 'id' | 'date' | 'status'>) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  submitQuote: (quoteData: Omit<QuoteRequest, 'id' | 'date' | 'status'>) => void;
  updateQuoteStatus: (
    quoteId: string,
    status: QuoteRequest['status'],
    price?: number
  ) => void;

  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductActive: (id: string) => void;

  updateSettings: (partial: Partial<Settings>) => void;
}

const INITIAL_SETTINGS: Settings = {
  businessName: 'Shilp Sahayak',
  whatsappNumber: '+91 98765 43210',
  email: 'hello@shilpsahayak.in',
  phone: '+91 98765 43210',
  address: '123, Maker’s Lane, Andheri West, Mumbai, Maharashtra 400053',
  shippingFlatRate: 150,
  freeShippingThreshold: 499,
  upiId: 'shilpsahayak@okhdfcbank'
};

/**
 * Creates a unique identity for one specific cart line.
 *
 * Same product + different variant = different cart item.
 * Same product + same variant + different custom note = different cart item.
 */
export const getCartItemId = (item: {
  product: Product;
  variantId?: string;
  variantLabel?: string;
  customNotes?: string;
}) => {
  return [
    item.product.id,
    item.variantId || item.variantLabel || 'default',
    item.customNotes || ''
  ].join('::');
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      products: [],
      cart: [],
      orders: [],
      quotes: [],
      settings: INITIAL_SETTINGS,

      addToCart: (
        product,
        quantity,
        customNotes,
        variantLabel,
        variantId
      ) =>
        set((state) => {
          const newCartItemId = getCartItemId({
            product,
            variantId,
            variantLabel,
            customNotes
          });

          const existingItemIndex = state.cart.findIndex(
            (item) =>
              getCartItemId(item) === newCartItemId
          );

          if (existingItemIndex !== -1) {
            return {
              cart: state.cart.map((item, index) =>
                index === existingItemIndex
                  ? {
                      ...item,
                      quantity: item.quantity + quantity
                    }
                  : item
              )
            };
          }

          return {
            cart: [
              ...state.cart,
              {
                product,
                quantity,
                customNotes,
                variantId,
                variantLabel
              }
            ]
          };
        }),

      removeFromCart: (cartItemId) =>
        set((state) => ({
          cart: state.cart.filter(
            (item) => getCartItemId(item) !== cartItemId
          )
        })),

      updateCartQuantity: (cartItemId, quantity) =>
        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter(
                  (item) => getCartItemId(item) !== cartItemId
                )
              : state.cart.map((item) =>
                  getCartItemId(item) === cartItemId
                    ? { ...item, quantity }
                    : item
                )
        })),

      clearCart: () => set({ cart: [] }),

      placeOrder: (orderData) =>
        set((state) => ({
          orders: [
            {
              ...orderData,
              id: `ORD-${1000 + state.orders.length + 1}`,
              date: new Date().toISOString(),
              status: 'Pending'
            },
            ...state.orders
          ],
          cart: []
        })),

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, status }
              : order
          )
        })),

      submitQuote: (quoteData) =>
        set((state) => ({
          quotes: [
            {
              ...quoteData,
              id: `QT-${2000 + state.quotes.length + 1}`,
              date: new Date().toISOString(),
              status: 'Pending'
            },
            ...state.quotes
          ]
        })),

      updateQuoteStatus: (quoteId, status, price) =>
        set((state) => ({
          quotes: state.quotes.map((quote) =>
            quote.id === quoteId
              ? {
                  ...quote,
                  status,
                  estimatedPrice:
                    price ?? quote.estimatedPrice
                }
              : quote
          )
        })),

      addProduct: (product) =>
        set((state) => ({
          products: [
            ...state.products,
            {
              ...product,
              id: `p${Date.now()}`,
              active: product.active ?? true
            }
          ]
        })),

      updateProduct: (id, productUpdate) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? { ...product, ...productUpdate }
              : product
          )
        })),

      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter(
            (product) => product.id !== id
          )
        })),

      toggleProductActive: (id) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? {
                  ...product,
                  active: !(product.active !== false)
                }
              : product
          )
        })),

      updateSettings: (partial) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...partial
          }
        }))
    }),

    {
      name: 'shilp-sahayak-store',

      partialize: (state) => ({
        cart: state.cart,
        settings: state.settings
      })
    }
  )
);