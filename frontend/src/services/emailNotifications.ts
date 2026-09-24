import { auth } from '../lib/firebase';
import { Quote } from '../hooks/useQuotes';
import { Order } from '../hooks/useOrders';

const rawWorkerUrl =
  import.meta.env.VITE_CLOUDFLARE_WORKER_URL ||
  'https://shilp-sahayak-r2.shilpsahayaktech.workers.dev';
const CLOUDFLARE_WORKER_URL = rawWorkerUrl.replace(/\/+$/, '');

/* -------------------------------------------------------------------------- */
/* Core Dispatcher: Proxies email requests through trusted Cloudflare Worker   */
/* -------------------------------------------------------------------------- */

export interface EmailDispatchPayload {
  targetId: string;
  eventType: 'quote_ready' | 'order_status' | 'order_cancelled' | 'quote_received';
  data?: Record<string, unknown>;
}

/**
 * Dispatches an email notification via the authenticated Cloudflare Worker endpoint.
 * The server enforces document ownership/admin checks and fetches recipient
 * email addresses directly from Firestore, preventing arbitrary email relay abuse.
 */
export async function sendEmailNotification(payload: EmailDispatchPayload): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    console.warn('[EmailNotification] Cannot send notification: User is not authenticated.');
    return '';
  }

  try {
    const idToken = await user.getIdToken();
    const endpoint = `${CLOUDFLARE_WORKER_URL}/api/mail/send`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      console.error('[EmailNotification] Worker rejected email dispatch:', data.error || response.statusText);
      return '';
    }

    console.log(`[EmailNotification] Queued ${payload.eventType} email for target ${payload.targetId} (Mail ID: ${data.mailId})`);
    return data.mailId || '';
  } catch (error) {
    console.error('[EmailNotification] Failed to dispatch email via Worker:', error);
    return '';
  }
}

/* -------------------------------------------------------------------------- */
/* High-Level Notification Helpers                                            */
/* -------------------------------------------------------------------------- */

/* 1. Quote Ready Email (Admin Only) */
export async function sendQuoteReadyNotification(params: {
  quote: Quote;
  price: number;
  expiresAt?: string;
  acceptUrl?: string;
}): Promise<string> {
  const { quote, price, expiresAt } = params;
  if (!quote.id) return '';

  return sendEmailNotification({
    targetId: quote.id,
    eventType: 'quote_ready',
    data: {
      price,
      expiresAt,
    },
  });
}

/* 2. Order Status Update Email (Admin Only) */
export async function sendOrderStatusUpdateNotification(params: {
  order: Order;
  status: string;
  trackingNumber?: string;
  courierPartner?: string;
}): Promise<string> {
  const { order, status, trackingNumber, courierPartner } = params;
  if (!order.id) return '';

  return sendEmailNotification({
    targetId: order.id,
    eventType: 'order_status',
    data: {
      status,
      trackingNumber,
      courierPartner,
    },
  });
}

/* 3. Order Cancelled & Refund Email (Customer or Admin) */
export async function sendOrderCancelledNotification(params: {
  order: Order;
  reason?: string;
}): Promise<string> {
  const { order, reason } = params;
  if (!order.id) return '';

  return sendEmailNotification({
    targetId: order.id,
    eventType: 'order_cancelled',
    data: {
      reason,
    },
  });
}

/* 4. Manual Quote Request Received (Customer Confirmation) */
export async function sendManualQuoteReceivedNotification(params: {
  requestId: string;
  customerEmail?: string;
  customerName?: string;
  fileName?: string;
  notes?: string;
}): Promise<string> {
  const { requestId, notes } = params;
  if (!requestId) return '';

  try {
    return await sendEmailNotification({
      targetId: requestId,
      eventType: 'quote_received',
      data: {
        notes,
      },
    });
  } catch (err) {
    console.warn('[EmailNotification] Manual quote confirmation email failed (non-fatal):', err);
    return '';
  }
}
