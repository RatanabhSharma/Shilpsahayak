import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProductMaterial = 'PLA' | 'PETG' | 'Resin' | 'Wood PLA' | 'Silk PLA';
export type Occasion = 'Personalised' | 'Couples' | 'Home & Interior' | null;

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  material?: ProductMaterial;
  occasion?: Occasion;
  isCustomizable?: boolean;
  featured?: boolean;
  active?: boolean;
};

export type CartItem = {
  product: Product;
  quantity: number;
  customNotes?: string;
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
    variantLabel?: string
  ) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
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

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      products: [],
      cart: [],
      orders: [],
      quotes: [],
      settings: INITIAL_SETTINGS,

      addToCart: (product, quantity, customNotes, variantLabel) =>
        set((state) => {
          const existingItem = state.cart.find(
            (item) =>
              item.product.id === product.id &&
              item.customNotes === customNotes &&
              item.variantLabel === variantLabel
          );

          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                item === existingItem
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            };
          }

          return {
            cart: [
              ...state.cart,
              { product, quantity, customNotes, variantLabel }
            ]
          };
        }),

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.product.id !== productId)
        })),

      updateCartQuantity: (productId, quantity) =>
        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter((item) => item.product.id !== productId)
              : state.cart.map((item) =>
                  item.product.id === productId ? { ...item, quantity } : item
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
            order.id === orderId ? { ...order, status } : order
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
              ? { ...quote, status, estimatedPrice: price ?? quote.estimatedPrice }
              : quote
          )
        })),

      addProduct: (product) =>
        set((state) => ({
          products: [
            ...state.products,
            { ...product, id: `p${Date.now()}`, active: product.active ?? true }
          ]
        })),

      updateProduct: (id, productUpdate) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id ? { ...product, ...productUpdate } : product
          )
        })),

      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((product) => product.id !== id)
        })),

      toggleProductActive: (id) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? { ...product, active: !(product.active !== false) }
              : product
          )
        })),

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial }
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