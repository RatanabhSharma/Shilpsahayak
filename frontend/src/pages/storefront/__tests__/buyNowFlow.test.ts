import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { useStore, type CartItem, type Product } from '../../../store';

beforeAll(() => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: store.size,
  } as Storage;
});

// Helper simulating Checkout.tsx item resolution logic
function resolveCheckoutItems(state: {
  purchaseMode: 'cart' | 'buy_now';
  buyNowItem: CartItem | null;
  storeCart: CartItem[];
  locationState?: { buyNowItem?: CartItem } | null;
}) {
  const effectivePurchaseMode =
    state.purchaseMode === 'buy_now' || Boolean(state.locationState?.buyNowItem)
      ? 'buy_now'
      : 'cart';

  const effectiveBuyNowItem =
    effectivePurchaseMode === 'buy_now'
      ? state.buyNowItem || state.locationState?.buyNowItem || null
      : null;

  const items =
    effectivePurchaseMode === 'buy_now'
      ? effectiveBuyNowItem
        ? [effectiveBuyNowItem]
        : []
      : state.storeCart;

  return {
    effectivePurchaseMode,
    effectiveBuyNowItem,
    items,
    isCartEmpty: items.length === 0,
  };
}

describe('BUY NOW Flow & Cart Isolation Test Matrix', () => {
  const mockProductA: Product = {
    id: 'prod-A',
    name: 'Precision Gear A',
    description: 'Precision 3D printed mechanical gear',
    image: '/gear.png',
    stock: 10,
    price: 499,
    category: 'Mechanical',
    featured: true,
    active: true,
  };

  const mockProductB: Product = {
    id: 'prod-B',
    name: 'Artisan Vase B',
    description: 'Artisan spiral vase',
    image: '/vase.png',
    stock: 5,
    price: 899,
    category: 'Home Decor',
    featured: false,
    active: true,
  };

  const mockItemA: CartItem = {
    product: mockProductA,
    quantity: 2,
  };

  const mockItemB: CartItem = {
    product: mockProductB,
    quantity: 1,
  };

  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      cart: [],
      purchaseMode: 'cart',
      buyNowItem: null,
    });
  });

  describe('Scenario A: Empty cart + BUY NOW product A', () => {
    it('resolves Product A in Checkout without empty cart error, and payment clears buyNowItem only', () => {
      // 1. Initial condition: Cart is empty
      expect(useStore.getState().cart).toHaveLength(0);

      // 2. User clicks BUY NOW on Product A (from ProductCard or ProductDetail)
      useStore.getState().setPurchaseMode('buy_now');
      useStore.getState().setBuyNowItem(mockItemA);

      const storeState = useStore.getState();
      expect(storeState.purchaseMode).toBe('buy_now');
      expect(storeState.buyNowItem?.product.id).toBe('prod-A');

      // 3. Checkout resolves effective items
      const checkout = resolveCheckoutItems({
        purchaseMode: storeState.purchaseMode,
        buyNowItem: storeState.buyNowItem,
        storeCart: storeState.cart,
      });

      expect(checkout.effectivePurchaseMode).toBe('buy_now');
      expect(checkout.items).toHaveLength(1);
      expect(checkout.items[0].product.id).toBe('prod-A');
      expect(checkout.isCartEmpty).toBe(false);

      // 4. On payment success, clear buyNowItem and reset purchaseMode to 'cart'
      if (checkout.effectivePurchaseMode === 'buy_now') {
        useStore.getState().clearBuyNowItem();
        useStore.getState().setPurchaseMode('cart');
      } else {
        useStore.getState().clearCart();
      }

      const finalState = useStore.getState();
      expect(finalState.buyNowItem).toBeNull();
      expect(finalState.purchaseMode).toBe('cart');
      expect(finalState.cart).toHaveLength(0);
    });
  });

  describe('Scenario B: Cart contains Product A + BUY NOW Product B', () => {
    it('resolves Product B only in Checkout, and payment preserves Product A in cart', () => {
      // 1. Initial condition: Cart contains Product A
      useStore.getState().addToCart(mockProductA, 2);
      expect(useStore.getState().cart).toHaveLength(1);
      expect(useStore.getState().cart[0].product.id).toBe('prod-A');

      // 2. User clicks BUY NOW on Product B
      useStore.getState().setPurchaseMode('buy_now');
      useStore.getState().setBuyNowItem(mockItemB);

      const storeState = useStore.getState();
      expect(storeState.purchaseMode).toBe('buy_now');
      expect(storeState.buyNowItem?.product.id).toBe('prod-B');
      expect(storeState.cart).toHaveLength(1);

      // 3. Checkout resolves effective items
      const checkout = resolveCheckoutItems({
        purchaseMode: storeState.purchaseMode,
        buyNowItem: storeState.buyNowItem,
        storeCart: storeState.cart,
      });

      expect(checkout.effectivePurchaseMode).toBe('buy_now');
      expect(checkout.items).toHaveLength(1);
      expect(checkout.items[0].product.id).toBe('prod-B');
      expect(checkout.items.some((item) => item.product.id === 'prod-A')).toBe(false);

      // 4. On payment success, clear buyNowItem only
      if (checkout.effectivePurchaseMode === 'buy_now') {
        useStore.getState().clearBuyNowItem();
        useStore.getState().setPurchaseMode('cart');
      } else {
        useStore.getState().clearCart();
      }

      const finalState = useStore.getState();
      expect(finalState.buyNowItem).toBeNull();
      expect(finalState.purchaseMode).toBe('cart');
      // Crucial requirement: Cart still contains Product A!
      expect(finalState.cart).toHaveLength(1);
      expect(finalState.cart[0].product.id).toBe('prod-A');
      expect(finalState.cart[0].quantity).toBe(2);
    });
  });

  describe('Scenario C: Cart contains Product A -> Normal Cart Checkout', () => {
    it('resolves cart items and clears regular cart upon payment', () => {
      // 1. Initial condition: Cart contains Product A
      useStore.getState().addToCart(mockProductA, 1);
      useStore.getState().setPurchaseMode('cart');

      const storeState = useStore.getState();
      expect(storeState.purchaseMode).toBe('cart');
      expect(storeState.cart).toHaveLength(1);

      // 2. Checkout resolves effective items
      const checkout = resolveCheckoutItems({
        purchaseMode: storeState.purchaseMode,
        buyNowItem: storeState.buyNowItem,
        storeCart: storeState.cart,
      });

      expect(checkout.effectivePurchaseMode).toBe('cart');
      expect(checkout.items).toHaveLength(1);
      expect(checkout.items[0].product.id).toBe('prod-A');
      expect(checkout.isCartEmpty).toBe(false);

      // 3. On payment success, clear normal cart
      if (checkout.effectivePurchaseMode === 'buy_now') {
        useStore.getState().clearBuyNowItem();
        useStore.getState().setPurchaseMode('cart');
      } else {
        useStore.getState().clearCart();
      }

      const finalState = useStore.getState();
      expect(finalState.cart).toHaveLength(0);
      expect(finalState.purchaseMode).toBe('cart');
    });
  });

  describe('Scenario D: Empty cart + direct /checkout', () => {
    it('correctly triggers empty-cart state when cart is empty and no buyNowItem exists', () => {
      // 1. User visits /checkout directly with empty cart
      const storeState = useStore.getState();
      expect(storeState.cart).toHaveLength(0);
      expect(storeState.buyNowItem).toBeNull();
      expect(storeState.purchaseMode).toBe('cart');

      const checkout = resolveCheckoutItems({
        purchaseMode: storeState.purchaseMode,
        buyNowItem: storeState.buyNowItem,
        storeCart: storeState.cart,
      });

      expect(checkout.items).toHaveLength(0);
      expect(checkout.isCartEmpty).toBe(true);
    });
  });

  describe('Scenario E: Route state synchronization & Fallback isolation', () => {
    it('synchronizes locationState.buyNowItem into effective checkout even before store hydration', () => {
      // Route state passed during navigation: navigate('/checkout', { state: { buyNowItem } })
      const checkout = resolveCheckoutItems({
        purchaseMode: 'cart', // Store might not have updated yet
        buyNowItem: null,
        storeCart: [],
        locationState: { buyNowItem: mockItemB },
      });

      expect(checkout.effectivePurchaseMode).toBe('buy_now');
      expect(checkout.items).toHaveLength(1);
      expect(checkout.items[0].product.id).toBe('prod-B');
      expect(checkout.isCartEmpty).toBe(false);
    });

    it('never leaks existing cart items if purchaseMode is buy_now but buyNowItem is missing', () => {
      // Defensive test: If purchaseMode is 'buy_now' but item is null,
      // Checkout MUST NOT fall back to storeCart (which could charge the user for cart items unintentionally)
      useStore.getState().addToCart(mockProductA, 3);

      const checkout = resolveCheckoutItems({
        purchaseMode: 'buy_now',
        buyNowItem: null,
        storeCart: useStore.getState().cart,
        locationState: null,
      });

      expect(checkout.effectivePurchaseMode).toBe('buy_now');
      expect(checkout.items).toHaveLength(0);
      expect(checkout.isCartEmpty).toBe(true);
    });

    it('Cart "Proceed to Checkout" resets purchaseMode to cart even if buy_now mode was lingering', () => {
      // Suppose user clicked BUY NOW earlier
      useStore.getState().setPurchaseMode('buy_now');
      useStore.getState().setBuyNowItem(mockItemB);
      useStore.getState().addToCart(mockProductA, 1);

      // Now user opens cart and clicks "Proceed to Checkout"
      // Cart.tsx explicitly calls setPurchaseMode('cart')
      useStore.getState().setPurchaseMode('cart');

      const storeState = useStore.getState();
      const checkout = resolveCheckoutItems({
        purchaseMode: storeState.purchaseMode,
        buyNowItem: storeState.buyNowItem,
        storeCart: storeState.cart,
      });

      expect(checkout.effectivePurchaseMode).toBe('cart');
      expect(checkout.items).toHaveLength(1);
      expect(checkout.items[0].product.id).toBe('prod-A');
    });
  });
});
