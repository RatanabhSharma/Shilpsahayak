import { create } from 'zustand';

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
'Pending' |
'Printing' |
'Quality Check' |
'Shipped' |
'Delivered';

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

export type Filament = {
  id: string;
  name: string;
  material: string;
  color: string;
  colorHex: string;
  stockKg: number;
  lowStockThresholdKg: number;
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
  filaments: Filament[];
  settings: Settings;

  // Cart
  addToCart: (
  product: Product,
  quantity: number,
  customNotes?: string,
  variantLabel?: string)
  => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Orders
  placeOrder: (orderData: Omit<Order, 'id' | 'date' | 'status'>) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Quotes
  submitQuote: (quoteData: Omit<QuoteRequest, 'id' | 'date' | 'status'>) => void;
  updateQuoteStatus: (
  quoteId: string,
  status: QuoteRequest['status'],
  price?: number)
  => void;

  // Products
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductActive: (id: string) => void;

  // Inventory
  updateFilamentStock: (id: string, stockKg: number) => void;

  // Settings
  updateSettings: (partial: Partial<Settings>) => void;
}

const INITIAL_PRODUCTS: Product[] = [
{
  id: 'p1',
  name: 'Personalized Lithophane Lamp',
  description:
  'A beautiful 3D printed lamp that reveals your favorite photo when illuminated. Perfect for anniversaries and birthdays.',
  price: 1499,
  category: 'Lithophanes',
  image:
  'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=800',
  stock: 15,
  material: 'PLA',
  occasion: 'Personalised',
  isCustomizable: true,
  featured: true,
  active: true
},
{
  id: 'p2',
  name: 'Geometric Desk Vase',
  description:
  'Modern, minimalist vase printed in premium matte PLA. Ideal for dried flowers or pampas grass.',
  price: 699,
  category: 'Vases',
  image:
  'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&q=80&w=800',
  stock: 24,
  material: 'PLA',
  occasion: 'Home & Interior',
  featured: true,
  active: true
},
{
  id: 'p3',
  name: 'Custom Name Keychain',
  description:
  'Durable, dual-color 3D printed keychain with your name or initials.',
  price: 299,
  category: 'Keychains',
  image:
  'https://images.unsplash.com/photo-1611078696377-622919921677?auto=format&fit=crop&q=80&w=800',
  stock: 100,
  material: 'PETG',
  occasion: 'Personalised',
  isCustomizable: true,
  active: true
},
{
  id: 'p4',
  name: 'Ganesha Idol (Marble Finish)',
  description:
  'Intricately detailed 3D printed Lord Ganesha idol in a premium marble-like finish.',
  price: 1299,
  category: 'Idols',
  image:
  'https://images.unsplash.com/photo-1580130379624-3a06943c6462?auto=format&fit=crop&q=80&w=800',
  stock: 8,
  material: 'Resin',
  occasion: 'Home & Interior',
  featured: true,
  active: true
},
{
  id: 'p5',
  name: 'Moon Lamp (15cm)',
  description:
  'Highly detailed 3D printed moon lamp based on NASA topographical data. Includes wooden stand.',
  price: 1899,
  category: 'Lamps',
  image:
  'https://images.unsplash.com/photo-1516589178581-6cd7853d1152?auto=format&fit=crop&q=80&w=800',
  stock: 12,
  material: 'PLA',
  occasion: 'Home & Interior',
  active: true
},
{
  id: 'p6',
  name: 'Couple Silhouette Art',
  description:
  'Custom 3D printed silhouette art from your photo. A unique wedding or anniversary gift.',
  price: 999,
  category: 'Custom & Personalised',
  image:
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=800',
  stock: 20,
  material: 'PLA',
  occasion: 'Couples',
  isCustomizable: true,
  featured: true,
  active: true
},
{
  id: 'p7',
  name: 'Heart Photo Lithophane',
  description:
  'A heart-shaped lithophane that glows with your cherished memory. The perfect couple keepsake.',
  price: 1199,
  category: 'Lithophanes',
  image:
  'https://images.unsplash.com/photo-1526318472351-c75fcf070305?auto=format&fit=crop&q=80&w=800',
  stock: 18,
  material: 'PLA',
  occasion: 'Couples',
  isCustomizable: true,
  featured: true,
  active: true
},
{
  id: 'p8',
  name: 'Spiral Bud Vase (Set of 2)',
  description:
  'A pair of elegant spiral bud vases in warm terracotta-toned PLA. Modern Indian decor.',
  price: 849,
  category: 'Vases',
  image:
  'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&q=80&w=800',
  stock: 30,
  material: 'Silk PLA',
  occasion: 'Home & Interior',
  active: true
},
{
  id: 'p9',
  name: 'Diya Tealight Holder Set',
  description:
  'A set of 4 intricately patterned diya tealight holders. Beautiful for Diwali and festive decor.',
  price: 599,
  category: 'Decor',
  image:
  'https://images.unsplash.com/photo-1605447964516-98c4a2f1b6d3?auto=format&fit=crop&q=80&w=800',
  stock: 40,
  material: 'PLA',
  occasion: 'Home & Interior',
  featured: true,
  active: true
},
{
  id: 'p10',
  name: 'Name Plate — Modern Script',
  description:
  'A personalised door name plate in a clean modern script, dual-color printed for contrast.',
  price: 749,
  category: 'Custom & Personalised',
  image:
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=800',
  stock: 25,
  material: 'PETG',
  occasion: 'Personalised',
  isCustomizable: true,
  active: true
},
{
  id: 'p11',
  name: 'Krishna Miniature Idol',
  description:
  'A detailed Lord Krishna miniature idol, hand-finished with a soft matte texture.',
  price: 1099,
  category: 'Idols',
  image:
  'https://images.unsplash.com/photo-1609619385002-f40f1df9b7eb?auto=format&fit=crop&q=80&w=800',
  stock: 6,
  material: 'Resin',
  occasion: 'Home & Interior',
  active: true
},
{
  id: 'p12',
  name: 'Initial Letter Keychain',
  description:
  'A minimalist single-initial keychain in silk-finish filament. Great small gift or return favour.',
  price: 199,
  category: 'Keychains',
  image:
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&q=80&w=800',
  stock: 120,
  material: 'Silk PLA',
  occasion: 'Personalised',
  isCustomizable: true,
  active: true
},
{
  id: 'p13',
  name: 'Sunset Lithophane Nightlamp',
  description:
  'A soft warm nightlamp that reveals a sunset landscape when lit. USB powered base included.',
  price: 1649,
  category: 'Lamps',
  image:
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=800',
  stock: 10,
  material: 'PLA',
  occasion: 'Home & Interior',
  featured: true,
  active: true
},
{
  id: 'p14',
  name: 'Geometric Wall Planter',
  description:
  'A faceted wall-mounted planter for succulents and small plants. Warm sand-toned finish.',
  price: 549,
  category: 'Decor',
  image:
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&q=80&w=800',
  stock: 35,
  material: 'PLA',
  occasion: 'Home & Interior',
  active: true
}];


const INITIAL_ORDERS: Order[] = [
{
  id: 'ORD-1001',
  date: new Date(Date.now() - 86400000 * 2).toISOString(),
  customerName: 'Rahul Sharma',
  customerEmail: 'rahul.s@example.com',
  customerPhone: '+91 98765 43210',
  address: '123, Palm Grove, Bandra West, Mumbai 400050',
  items: [
  {
    product: INITIAL_PRODUCTS[0],
    quantity: 1,
    customNotes: 'Use the attached wedding photo'
  }],

  total: 1499,
  status: 'Printing'
},
{
  id: 'ORD-1002',
  date: new Date(Date.now() - 86400000 * 5).toISOString(),
  customerName: 'Priya Patel',
  customerEmail: 'priya.p@example.com',
  customerPhone: '+91 98765 43211',
  address: '45, Tech Park Road, Whitefield, Bangalore 560066',
  items: [{ product: INITIAL_PRODUCTS[1], quantity: 2 }],
  total: 1398,
  status: 'Shipped'
},
{
  id: 'ORD-1003',
  date: new Date(Date.now() - 86400000 * 8).toISOString(),
  customerName: 'Ananya Reddy',
  customerEmail: 'ananya.r@example.com',
  customerPhone: '+91 98765 43213',
  address: '78, Jubilee Hills, Hyderabad 500033',
  items: [
  { product: INITIAL_PRODUCTS[3], quantity: 1 },
  { product: INITIAL_PRODUCTS[8], quantity: 1 }],

  total: 1898,
  status: 'Delivered'
},
{
  id: 'ORD-1004',
  date: new Date(Date.now() - 86400000 * 1).toISOString(),
  customerName: 'Vikram Nair',
  customerEmail: 'vikram.n@example.com',
  customerPhone: '+91 98765 43214',
  address: '12, Marine Drive, Kochi 682031',
  items: [{ product: INITIAL_PRODUCTS[6], quantity: 1 }],
  total: 1199,
  status: 'Pending'
},
{
  id: 'ORD-1005',
  date: new Date(Date.now() - 86400000 * 3).toISOString(),
  customerName: 'Sneha Iyer',
  customerEmail: 'sneha.i@example.com',
  customerPhone: '+91 98765 43215',
  address: '203, Anna Nagar, Chennai 600040',
  items: [{ product: INITIAL_PRODUCTS[12], quantity: 1 }],
  total: 1649,
  status: 'Quality Check'
},
{
  id: 'ORD-1006',
  date: new Date(Date.now() - 86400000 * 12).toISOString(),
  customerName: 'Rahul Sharma',
  customerEmail: 'rahul.s@example.com',
  customerPhone: '+91 98765 43210',
  address: '123, Palm Grove, Bandra West, Mumbai 400050',
  items: [{ product: INITIAL_PRODUCTS[8], quantity: 2 }],
  total: 1198,
  status: 'Delivered'
}];


const INITIAL_QUOTES: QuoteRequest[] = [
{
  id: 'QT-2001',
  date: new Date(Date.now() - 86400000).toISOString(),
  customerName: 'Amit Kumar',
  customerEmail: 'amit.k@example.com',
  customerPhone: '+91 98765 43212',
  fileName: 'custom_gear_assembly.stl',
  material: 'PETG',
  color: 'Black',
  quantity: 5,
  notes: 'Need this for a robotics project. High infill required.',
  status: 'Pending'
},
{
  id: 'QT-2002',
  date: new Date(Date.now() - 86400000 * 4).toISOString(),
  customerName: 'Meera Joshi',
  customerEmail: 'meera.j@example.com',
  customerPhone: '+91 98765 43216',
  fileName: 'baby_footprint.jpg',
  filePreviewUrl:
  'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=400',
  material: 'PLA',
  color: 'White',
  quantity: 2,
  notes:
  'Would love a lithophane from my baby’s footprint photo. Two copies for grandparents.',
  status: 'Pending'
}];


const INITIAL_FILAMENTS: Filament[] = [
{
  id: 'f1',
  name: 'Warm White PLA',
  material: 'PLA',
  color: 'Warm White',
  colorHex: '#f4ede0',
  stockKg: 4.2,
  lowStockThresholdKg: 1.5
},
{
  id: 'f2',
  name: 'Charcoal PETG',
  material: 'PETG',
  color: 'Charcoal',
  colorHex: '#2b2724',
  stockKg: 0.8,
  lowStockThresholdKg: 1.0
},
{
  id: 'f3',
  name: 'Terracotta Silk PLA',
  material: 'Silk PLA',
  color: 'Terracotta',
  colorHex: '#c15f3c',
  stockKg: 2.6,
  lowStockThresholdKg: 1.0
},
{
  id: 'f4',
  name: 'Marble Resin',
  material: 'Resin',
  color: 'Marble',
  colorHex: '#e8e2d6',
  stockKg: 1.1,
  lowStockThresholdKg: 0.75
},
{
  id: 'f5',
  name: 'Deep Amber Silk PLA',
  material: 'Silk PLA',
  color: 'Deep Amber',
  colorHex: '#c98a1e',
  stockKg: 3.4,
  lowStockThresholdKg: 1.0
},
{
  id: 'f6',
  name: 'Natural Wood PLA',
  material: 'Wood PLA',
  color: 'Natural Wood',
  colorHex: '#a9773f',
  stockKg: 0.5,
  lowStockThresholdKg: 0.8
},
{
  id: 'f7',
  name: 'Forest Green PLA',
  material: 'PLA',
  color: 'Forest Green',
  colorHex: '#3f6a4e',
  stockKg: 2.0,
  lowStockThresholdKg: 1.0
},
{
  id: 'f8',
  name: 'Clear Resin',
  material: 'Resin',
  color: 'Clear',
  colorHex: '#dfe6e9',
  stockKg: 1.9,
  lowStockThresholdKg: 0.75
}];


const INITIAL_SETTINGS: Settings = {
  businessName: 'Shilp Sahayak',
  whatsappNumber: '+91 98765 43210',
  email: 'hello@shilpsahayak.in',
  phone: '+91 98765 43210',
  address: '123, Maker’s Lane, Andheri West, Mumbai, Maharashtra 400053',
  shippingFlatRate: 150,
  freeShippingThreshold: 2000,
  upiId: 'shilpsahayak@okhdfcbank'
};

export const useStore = create<StoreState>((set) => ({
  products: INITIAL_PRODUCTS,
  cart: [],
  orders: INITIAL_ORDERS,
  quotes: INITIAL_QUOTES,
  filaments: INITIAL_FILAMENTS,
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
        item === existingItem ?
        { ...item, quantity: item.quantity + quantity } :
        item
        )
      };
    }
    return {
      cart: [...state.cart, { product, quantity, customNotes, variantLabel }]
    };
  }),

  removeFromCart: (productId) =>
  set((state) => ({
    cart: state.cart.filter((item) => item.product.id !== productId)
  })),

  updateCartQuantity: (productId, quantity) =>
  set((state) => ({
    cart: state.cart.map((item) =>
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
    ...state.orders],

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
    ...state.quotes]

  })),

  updateQuoteStatus: (quoteId, status, price) =>
  set((state) => ({
    quotes: state.quotes.map((quote) =>
    quote.id === quoteId ?
    { ...quote, status, estimatedPrice: price ?? quote.estimatedPrice } :
    quote
    )
  })),

  addProduct: (product) =>
  set((state) => ({
    products: [
    ...state.products,
    { active: true, ...product, id: `p${Date.now()}` }]

  })),

  updateProduct: (id, productUpdate) =>
  set((state) => ({
    products: state.products.map((p) =>
    p.id === id ? { ...p, ...productUpdate } : p
    )
  })),

  deleteProduct: (id) =>
  set((state) => ({
    products: state.products.filter((p) => p.id !== id)
  })),

  toggleProductActive: (id) =>
  set((state) => ({
    products: state.products.map((p) =>
    p.id === id ? { ...p, active: p.active === false ? true : false } : p
    )
  })),

  updateFilamentStock: (id, stockKg) =>
  set((state) => ({
    filaments: state.filaments.map((f) =>
    f.id === id ? { ...f, stockKg: Math.max(0, stockKg) } : f
    )
  })),

  updateSettings: (partial) =>
  set((state) => ({
    settings: { ...state.settings, ...partial }
  }))
}));