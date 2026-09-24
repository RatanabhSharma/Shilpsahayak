import { auth } from '../lib/firebase';

const rawWorkerUrl =
  import.meta.env.VITE_CLOUDFLARE_WORKER_URL ||
  'https://shilp-sahayak-r2.shilpsahayaktech.workers.dev';
const CLOUDFLARE_WORKER_URL = rawWorkerUrl.replace(/\/+$/, '');

export interface ShippingAddressInput {
  fullName: string;
  email: string;
  phone: string;
  houseNo: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface PaymentOrderItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
  customNotes?: string;
  customPrint?: any;
}

export interface CreatePaymentOrderInput {
  items: PaymentOrderItemInput[];
  shippingAddress: ShippingAddressInput;
  purchaseMode: 'cart' | 'buy_now';
  notes?: string;
  clientCalculatedTotal?: number;
}

export interface CreatePaymentOrderResult {
  success: boolean;
  orderId: string;
  razorpayOrderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  pricing?: {
    subtotal: number;
    shipping: number;
    total: number;
  };
  error?: string;
}

export interface VerifyPaymentInput {
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  orderId: string;
  paymentId: string;
  status: string;
  paymentStatus: string;
  error?: string;
}

/**
 * Dynamically loads the Razorpay Standard Checkout SDK if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }
    if ((window as any).Razorpay) {
      return resolve(true);
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Requests the Cloudflare Worker to create a trusted order and Razorpay order.
 * Strictly requires an authenticated customer.
 */
export async function createPaymentOrder(
  input: CreatePaymentOrderInput
): Promise<CreatePaymentOrderResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to create a payment order');
  }

  const endpoint = `${CLOUDFLARE_WORKER_URL}/api/payment/create-order`;
  const idToken = await user.getIdToken();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Payment session creation failed (HTTP ${response.status})`);
  }

  return data as CreatePaymentOrderResult;
}

/**
 * Sends the Razorpay payment response to the Cloudflare Worker for cryptographic verification.
 * Strictly requires an authenticated customer.
 */
export async function verifyPaymentSignature(
  input: VerifyPaymentInput
): Promise<VerifyPaymentResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to verify payment');
  }

  const endpoint = `${CLOUDFLARE_WORKER_URL}/api/payment/verify`;
  const idToken = await user.getIdToken();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Payment verification failed (HTTP ${response.status})`);
  }

  return data as VerifyPaymentResult;
}

export interface CancelOrderInput {
  orderId: string;
  reason?: string;
}

export interface CancelOrderResult {
  success: boolean;
  orderId: string;
  status: string;
  cancelledAt?: string;
  error?: string;
}

/**
 * Requests the Cloudflare Worker to securely and authoritatively cancel an order.
 * Strictly requires an authenticated customer (or admin).
 */
export async function cancelOrderRequest(
  input: CancelOrderInput
): Promise<CancelOrderResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required to cancel an order');
  }

  const endpoint = `${CLOUDFLARE_WORKER_URL}/api/orders/cancel`;
  const idToken = await user.getIdToken();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Order cancellation failed (HTTP ${response.status})`);
  }

  return data as CancelOrderResult;
}

