import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadRazorpayScript,
  createPaymentOrder,
  verifyPaymentSignature,
  type CreatePaymentOrderInput,
  type VerifyPaymentInput,
} from '../paymentService';
import { auth } from '../../lib/firebase';

// Mock auth from ../lib/firebase
vi.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      getIdToken: vi.fn().mockResolvedValue('mock-id-token-xyz'),
    },
  },
}));

describe('Payment Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).currentUser = {
      uid: 'test-user-123',
      getIdToken: vi.fn().mockResolvedValue('mock-id-token-xyz'),
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('loadRazorpayScript', () => {
    let mockElement: any;

    beforeEach(() => {
      mockElement = {
        src: '',
        async: false,
        onload: null,
        onerror: null,
      };
      (globalThis as any).window = {};
      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue(mockElement),
        body: {
          appendChild: vi.fn().mockImplementation((el) => {
            // Trigger onload asynchronously
            setTimeout(() => el.onload && el.onload(), 5);
          }),
        },
      };
    });

    afterEach(() => {
      delete (globalThis as any).window;
      delete (globalThis as any).document;
    });

    it('resolves immediately if window.Razorpay already exists', async () => {
      (globalThis as any).window.Razorpay = function () {};
      const loaded = await loadRazorpayScript();
      expect(loaded).toBe(true);
    });

    it('creates a script tag when window.Razorpay is absent', async () => {
      const loaded = await loadRazorpayScript();
      expect((globalThis as any).document.createElement).toHaveBeenCalledWith('script');
      expect(mockElement.src).toBe('https://checkout.razorpay.com/v1/checkout.js');
      expect((globalThis as any).document.body.appendChild).toHaveBeenCalledWith(mockElement);
      expect(loaded).toBe(true);
    });
  });

  describe('createPaymentOrder', () => {
    it('sends order items and shipping details with auth token to Cloudflare Worker', async () => {
      const mockResult = {
        success: true,
        orderId: 'SS-ORD-99999',
        razorpayOrderId: 'order_test_99999',
        amount: 150000,
        currency: 'INR',
        keyId: 'rzp_test_placeholder',
        pricing: { subtotal: 1500, shipping: 0, total: 1500 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      const input: CreatePaymentOrderInput = {
        items: [{ productId: 'prod-1', quantity: 2 }],
        shippingAddress: {
          fullName: 'Rahul Sharma',
          email: 'rahul@example.com',
          phone: '9876543210',
          houseNo: '42',
          street: 'MG Road',
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: '302001',
        },
        purchaseMode: 'cart',
      };

      const result = await createPaymentOrder(input);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as any).mock.calls[0];
      expect(url).toContain('/api/payment/create-order');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer mock-id-token-xyz');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(options.body)).toEqual(input);
      expect(result).toEqual(mockResult);
    });

    it('throws an error if user is not authenticated', async () => {
      (auth as any).currentUser = null;

      const input: CreatePaymentOrderInput = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        shippingAddress: {
          fullName: 'Guest Buyer',
          email: 'guest@example.com',
          phone: '9876543210',
          houseNo: '10',
          street: 'Mall Road',
          city: 'Patiala',
          state: 'Punjab',
          pincode: '147001',
        },
        purchaseMode: 'cart',
      };

      await expect(createPaymentOrder(input)).rejects.toThrow(
        'Authentication required to create a payment order'
      );
    });

    it('throws an error if worker returns failure status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Product prod-missing not found' }),
      });

      const input: CreatePaymentOrderInput = {
        items: [{ productId: 'prod-missing', quantity: 1 }],
        shippingAddress: {
          fullName: 'Rahul Sharma',
          email: 'rahul@example.com',
          phone: '9876543210',
          houseNo: '42',
          street: 'MG Road',
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: '302001',
        },
        purchaseMode: 'buy_now',
      };

      await expect(createPaymentOrder(input)).rejects.toThrow('Product prod-missing not found');
    });
  });

  describe('verifyPaymentSignature', () => {
    it('sends payment signature payload to Cloudflare Worker for cryptographic verification', async () => {
      const mockResult = {
        success: true,
        orderId: 'SS-ORD-99999',
        paymentId: 'pay_test_123',
        status: 'Confirmed',
        paymentStatus: 'Paid',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      const input: VerifyPaymentInput = {
        orderId: 'SS-ORD-99999',
        razorpayOrderId: 'order_test_99999',
        razorpayPaymentId: 'pay_test_123',
        razorpaySignature: 'valid_hmac_sha256_signature_hex',
      };

      const result = await verifyPaymentSignature(input);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as any).mock.calls[0];
      expect(url).toContain('/api/payment/verify');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer mock-id-token-xyz');
      expect(JSON.parse(options.body)).toEqual(input);
      expect(result).toEqual(mockResult);
    });

    it('throws an error if user is not authenticated', async () => {
      (auth as any).currentUser = null;

      const input: VerifyPaymentInput = {
        orderId: 'SS-ORD-12345',
        razorpayOrderId: 'order_12345',
        razorpayPaymentId: 'pay_123',
        razorpaySignature: 'sig_123',
      };

      await expect(verifyPaymentSignature(input)).rejects.toThrow(
        'Authentication required to verify payment'
      );
    });

    it('throws an error when signature is invalid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Invalid payment signature' }),
      });

      const input: VerifyPaymentInput = {
        orderId: 'SS-ORD-99999',
        razorpayOrderId: 'order_test_99999',
        razorpayPaymentId: 'pay_test_123',
        razorpaySignature: 'tampered_signature',
      };

      await expect(verifyPaymentSignature(input)).rejects.toThrow('Invalid payment signature');
    });
  });
});
