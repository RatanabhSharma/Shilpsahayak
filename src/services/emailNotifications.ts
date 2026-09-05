import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Quote } from '../hooks/useQuotes';
import { Order } from '../hooks/useOrders';

/* -------------------------------------------------------------------------- */
/* Core Dispatcher: Writes to Firestore 'mail' queue                          */
/* -------------------------------------------------------------------------- */

export interface EmailJob {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  type: 'quote_ready' | 'order_confirmed' | 'order_status' | 'order_cancelled';
  metadata?: Record<string, unknown>;
}

export async function queueEmailNotification(job: EmailJob): Promise<string> {
  const recipients = Array.isArray(job.to) ? job.to : [job.to];
  const validRecipients = recipients.filter((email) => email && email.includes('@'));

  if (validRecipients.length === 0) {
    console.warn('[EmailNotification] No valid recipient email provided:', job.to);
    return '';
  }

  const payload = {
    to: validRecipients,
    message: {
      subject: job.subject,
      html: job.html,
      text: job.text || job.subject,
    },
    type: job.type,
    metadata: job.metadata || {},
    createdAt: new Date().toISOString(),
    status: 'queued',
  };

  try {
    const docRef = await addDoc(collection(db, 'mail'), payload);
    console.log(`[EmailNotification] Queued ${job.type} email to ${validRecipients.join(', ')} (Doc ID: ${docRef.id})`);
    return docRef.id;
  } catch (error) {
    console.error('[EmailNotification] Failed to write email document to Firestore:', error);
    return '';
  }
}

/* -------------------------------------------------------------------------- */
/* HTML Templates                                                             */
/* -------------------------------------------------------------------------- */

const EMAIL_HEADER = `
  <div style="background-color: #0c0a09; padding: 24px; text-align: center; border-top-left-radius: 12px; border-top-right-radius: 12px;">
    <h1 style="color: #ff4d00; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
      SHILP SAHAYAK
    </h1>
    <p style="color: #a8a29e; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-family: monospace;">
      3D Fabrication & Precision Prototyping Studio
    </p>
  </div>
`;

const EMAIL_FOOTER = `
  <div style="background-color: #fafaf9; border-top: 1px solid #e7e5e4; padding: 20px; text-align: center; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <p style="color: #78716c; font-size: 12px; margin: 0 0 8px 0;">
      Have questions about slicing, materials, or your custom fabrication order?
    </p>
    <p style="margin: 0; font-size: 12px;">
      <a href="mailto:support@shilpsahayak.in" style="color: #ff4d00; text-decoration: none; font-weight: 600;">support@shilpsahayak.in</a>
      &nbsp;•&nbsp;
      <a href="https://shilpsahayak.in/account" style="color: #ff4d00; text-decoration: none; font-weight: 600;">Studio Dashboard</a>
    </p>
    <p style="color: #a8a29e; font-size: 10px; margin: 12px 0 0 0; font-family: monospace;">
      © ${new Date().getFullYear()} Shilp Sahayak Studio. Patiala, Punjab, India.
    </p>
  </div>
`;

/* 1. Quote Ready Email */
export async function sendQuoteReadyNotification(params: {
  quote: Quote;
  price: number;
  expiresAt?: string;
  acceptUrl?: string;
}): Promise<string> {
  const { quote, price, expiresAt } = params;
  if (!quote.customerEmail) return '';

  const siteUrl = window.location.origin;
  const quoteUrl = `${siteUrl}/account`;
  const expiryFormatted = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '7 Days';

  const html = `
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
      ${EMAIL_HEADER}

      <div style="padding: 32px 24px;">
        <div style="display: inline-block; background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase;">
          CAD Quotation Ready
        </div>

        <h2 style="font-size: 20px; font-weight: 700; margin: 12px 0 8px 0; color: #0c0a09;">
          Hello ${quote.customerName || 'Creator'}, your custom 3D quote is ready!
        </h2>
        <p style="font-size: 14px; line-height: 1.5; color: #57534e; margin: 0 0 24px 0;">
          Our workshop engineers have inspected your 3D CAD model <strong>"${quote.fileName || 'Uploaded Model'}"</strong> and prepared your official quotation.
        </p>

        <!-- Pricing Card -->
        <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 11px; font-family: monospace; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
            Quoted Fabrication Price
          </span>
          <div style="font-size: 32px; font-weight: 800; color: #ea580c; margin: 6px 0;">
            ₹${price.toLocaleString('en-IN')}
          </div>
          <div style="font-size: 12px; color: #b45309; font-weight: 600;">
            ⏳ Offer valid until: <strong>${expiryFormatted}</strong>
          </div>
        </div>

        <!-- Specifications Breakdown -->
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 28px;">
          <tr style="border-bottom: 1px solid #f5f5f4;">
            <td style="padding: 8px 0; color: #78716c; font-family: monospace;">Model File:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0c0a09;">${quote.fileName || '3D Model'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f5f5f4;">
            <td style="padding: 8px 0; color: #78716c; font-family: monospace;">Material & Color:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0c0a09;">${quote.material || 'PLA'} (${quote.color || 'Standard'})</td>
          </tr>
          <tr style="border-bottom: 1px solid #f5f5f4;">
            <td style="padding: 8px 0; color: #78716c; font-family: monospace;">Infill Density:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0c0a09;">${quote.infill ? `${quote.infill}%` : '20%'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f5f5f4;">
            <td style="padding: 8px 0; color: #78716c; font-family: monospace;">Quantity:</td>
            <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0c0a09;">${quote.quantity || 1} unit(s)</td>
          </tr>
        </table>

        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${quoteUrl}" style="display: inline-block; background-color: #ff4d00; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(255, 77, 0, 0.2);">
            Review & Accept Quote ➔
          </a>
        </div>

        <p style="font-size: 12px; color: #a8a29e; text-align: center; margin: 0;">
          Or log in to your account at <a href="${quoteUrl}" style="color: #ff4d00;">shilpsahayak.in/account</a> to start production.
        </p>
      </div>

      ${EMAIL_FOOTER}
    </div>
  `;

  return queueEmailNotification({
    to: quote.customerEmail,
    subject: `Your 3D Print Quote #${quote.id.slice(0, 8).toUpperCase()} is Ready — ₹${price.toLocaleString('en-IN')}`,
    html,
    text: `Hello ${quote.customerName}, your custom 3D quote for ${quote.fileName} is ready: ₹${price.toLocaleString('en-IN')}. Offer valid until ${expiryFormatted}. View your quote: ${quoteUrl}`,
    type: 'quote_ready',
    metadata: {
      quoteId: quote.id,
      price,
      expiresAt,
    },
  });
}

/* 2. Order Confirmation Email */
export async function sendOrderConfirmationNotification(order: Order): Promise<string> {
  if (!order.customerEmail) return '';

  const siteUrl = window.location.origin;
  const orderUrl = `${siteUrl}/account`;
  const itemsHtml = (order.items || [])
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f5f5f4;">
        <td style="padding: 10px 0;">
          <strong style="color: #0c0a09;">${item.productName}</strong>
          ${item.variantLabel ? `<div style="font-size: 11px; color: #78716c; font-family: monospace;">Variant: ${item.variantLabel}</div>` : ''}
          ${item.customNotes ? `<div style="font-size: 11px; color: #a8a29e; font-style: italic;">Note: "${item.customNotes}"</div>` : ''}
        </td>
        <td style="padding: 10px 0; text-align: center; font-family: monospace;">x${item.quantity}</td>
        <td style="padding: 10px 0; text-align: right; font-family: monospace; font-weight: 700; color: #0c0a09;">
          ₹${(item.price * item.quantity).toLocaleString('en-IN')}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
      ${EMAIL_HEADER}

      <div style="padding: 32px 24px;">
        <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase;">
          Order Confirmed ✓
        </div>

        <h2 style="font-size: 20px; font-weight: 700; margin: 12px 0 8px 0; color: #0c0a09;">
          Thank you for your order, ${order.customerName}!
        </h2>
        <p style="font-size: 14px; line-height: 1.5; color: #57534e; margin: 0 0 20px 0;">
          Your order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> has been received by the Shilp Sahayak workshop. Slicing and preparation have begun.
        </p>

        <!-- Order Items Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid #e7e5e4; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #78716c;">
              <th style="padding: 8px 0; text-align: left;">Item</th>
              <th style="padding: 8px 0; text-align: center;">Qty</th>
              <th style="padding: 8px 0; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 0 4px 0; font-weight: 700; font-size: 14px; color: #0c0a09;">Grand Total:</td>
              <td style="padding: 12px 0 4px 0; font-weight: 800; font-size: 18px; color: #ff4d00; text-align: right; font-family: monospace;">
                ₹${Number(order.total || 0).toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- Shipping Address Card -->
        <div style="background-color: #f5f5f4; border-radius: 8px; padding: 14px 18px; font-size: 12px; margin-bottom: 24px;">
          <strong style="color: #0c0a09; display: block; margin-bottom: 4px; font-family: monospace; text-transform: uppercase;">
            Delivery Address:
          </strong>
          <span style="color: #57534e; line-height: 1.4;">${order.address}</span>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${orderUrl}" style="display: inline-block; background-color: #ff4d00; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
            Track Order Status ➔
          </a>
        </div>
      </div>

      ${EMAIL_FOOTER}
    </div>
  `;

  return queueEmailNotification({
    to: order.customerEmail,
    subject: `Order Confirmed #${order.id.slice(0, 8).toUpperCase()} — Shilp Sahayak Studio`,
    html,
    text: `Thank you for your order #${order.id.slice(0, 8).toUpperCase()} for ₹${Number(order.total || 0).toLocaleString('en-IN')}. Track status: ${orderUrl}`,
    type: 'order_confirmed',
    metadata: { orderId: order.id, total: order.total },
  });
}

/* 3. Order Status Update Email (e.g. Printing, Shipped, Delivered) */
export async function sendOrderStatusUpdateNotification(params: {
  order: Order;
  status: string;
  trackingNumber?: string;
  courierPartner?: string;
}): Promise<string> {
  const { order, status, trackingNumber, courierPartner } = params;
  if (!order.customerEmail) return '';

  const siteUrl = window.location.origin;
  const orderUrl = `${siteUrl}/account`;

  let statusTitle = `Order Status: ${status}`;
  let statusMessage = `Your order status has been updated to "${status}".`;

  if (status === 'Printing') {
    statusTitle = '🖨️ 3D Printing In Progress!';
    statusMessage = 'Your custom items are actively being 3D printed on our high-precision workshop machines.';
  } else if (status === 'Quality Check') {
    statusTitle = '🔍 Quality Assurance Inspection';
    statusMessage = 'Your 3D prints are finished and currently undergoing dimensional QC and post-processing.';
  } else if (status === 'Shipped') {
    statusTitle = '📦 Your Order Has Been Dispatched!';
    statusMessage = courierPartner && trackingNumber
      ? `Dispatched via ${courierPartner} (Tracking / AWB: ${trackingNumber}).`
      : 'Your order is on its way to your delivery address.';
  } else if (status === 'Delivered') {
    statusTitle = '✨ Order Delivered!';
    statusMessage = 'Your package has been delivered. We hope you love your 3D prints!';
  }

  const html = `
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
      ${EMAIL_HEADER}

      <div style="padding: 32px 24px;">
        <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 10px 0; color: #0c0a09;">
          ${statusTitle}
        </h2>
        <p style="font-size: 14px; line-height: 1.5; color: #57534e; margin: 0 0 20px 0;">
          Hello ${order.customerName}, ${statusMessage}
        </p>

        <div style="background-color: #f5f5f4; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
          <div style="margin-bottom: 6px;"><strong>Order ID:</strong> #${order.id.slice(0, 8).toUpperCase()}</div>
          <div><strong>Current Status:</strong> <span style="color: #ff4d00; font-weight: 700;">${status}</span></div>
          ${trackingNumber ? `<div style="margin-top: 6px;"><strong>Tracking AWB:</strong> <span style="font-family: monospace;">${trackingNumber} (${courierPartner || 'Courier'})</span></div>` : ''}
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${orderUrl}" style="display: inline-block; background-color: #ff4d00; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
            View Order in Account ➔
          </a>
        </div>
      </div>

      ${EMAIL_FOOTER}
    </div>
  `;

  return queueEmailNotification({
    to: order.customerEmail,
    subject: `Update on Order #${order.id.slice(0, 8).toUpperCase()}: ${status} — Shilp Sahayak`,
    html,
    text: `Update on Order #${order.id.slice(0, 8).toUpperCase()}: ${statusMessage}. Track online: ${orderUrl}`,
    type: 'order_status',
    metadata: { orderId: order.id, status, trackingNumber },
  });
}

/* 4. Order Cancelled & Refund Email */
export async function sendOrderCancelledNotification(params: {
  order: Order;
  reason?: string;
}): Promise<string> {
  const { order, reason } = params;
  if (!order.customerEmail) return '';

  const html = `
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
      ${EMAIL_HEADER}

      <div style="padding: 32px 24px;">
        <div style="display: inline-block; background-color: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase;">
          Order Cancelled & Refund Initiated
        </div>

        <h2 style="font-size: 20px; font-weight: 700; margin: 12px 0 8px 0; color: #0c0a09;">
          Order #${order.id.slice(0, 8).toUpperCase()} has been cancelled
        </h2>
        <p style="font-size: 14px; line-height: 1.5; color: #57534e; margin: 0 0 20px 0;">
          Hello ${order.customerName}, as requested, your order has been cancelled prior to 3D production.
        </p>

        <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 11px; font-family: monospace; color: #9a3412; font-weight: 700; text-transform: uppercase;">
            100% Refund Amount
          </span>
          <div style="font-size: 28px; font-weight: 800; color: #ea580c; margin: 4px 0;">
            ₹${Number(order.total || 0).toLocaleString('en-IN')}
          </div>
          <p style="font-size: 12px; color: #78716c; margin: 4px 0 0 0;">
            Your refund will be credited to your original payment method / UPI within <strong>2–3 business days</strong>.
          </p>
        </div>

        ${reason ? `<p style="font-size: 12px; color: #78716c;"><strong>Cancellation Reason:</strong> ${reason}</p>` : ''}
      </div>

      ${EMAIL_FOOTER}
    </div>
  `;

  return queueEmailNotification({
    to: order.customerEmail,
    subject: `Order Cancelled & Refund Initiated #${order.id.slice(0, 8).toUpperCase()} — Shilp Sahayak`,
    html,
    text: `Your order #${order.id.slice(0, 8).toUpperCase()} has been cancelled. A 100% refund of ₹${Number(order.total || 0).toLocaleString('en-IN')} will be credited within 2-3 business days.`,
    type: 'order_cancelled',
    metadata: { orderId: order.id, total: order.total },
  });
}

