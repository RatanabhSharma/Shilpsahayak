import { createRemoteJWKSet, jwtVerify, importPKCS8, SignJWT } from "jose";

export interface Env {
  STORAGE: R2Bucket;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}

const DEFAULT_FIREBASE_PROJECT_ID = "shilp-sahayak";
const DEFAULT_FIREBASE_API_KEY = "AIzaSyDrxZOj-n32PZtVI1g3N2v8t3efNafuH0E";

const FIREBASE_ISSUER =
  `https://securetoken.google.com/${DEFAULT_FIREBASE_PROJECT_ID}`;

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const ALLOWED_EXTENSIONS = [
  ".stl",
  ".obj",
  ".3mf",
  ".zip",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

const STRICT_ALLOWED_ORIGINS = new Set([
  "https://shilpsahayak.com",
  "https://www.shilpsahayak.com",
  "https://shilpsahayak.in",
  "https://www.shilpsahayak.in",
  "https://shilpsahayak.vercel.app",
  "https://shilp-sahayak.web.app",
  "https://shilp-sahayak.firebaseapp.com",
]);

function isAllowedOrigin(origin: string | null, requestUrl?: string): boolean {
  if (!origin) return true;
  // Only allow localhost if the request itself is targeting localhost / local development
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) {
    if (requestUrl) {
      try {
        const u = new URL(requestUrl);
        if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
          return true;
        }
      } catch {}
    }
    return false;
  }
  return STRICT_ALLOWED_ORIGINS.has(origin);
}

function getCorsHeaders(request: Request): Headers {
  const origin = request.headers.get("Origin");

  const allowed = isAllowedOrigin(origin, request.url);
  const allowedOrigin = allowed && origin ? origin : "https://shilpsahayak.com";

  return new Headers({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-File-Name, X-Razorpay-Signature",
    "Access-Control-Max-Age": "86400",
  });
}

function jsonResponse(
  request: Request,
  data: unknown,
  status = 200
): Response {
  const headers = getCorsHeaders(request);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

/**
 * Verify Firebase ID token and return Firebase user identity.
 */
export async function authenticateUser(request: Request): Promise<string> {
  const user = await authenticateFirebaseUser(request);
  return user.uid;
}

export async function authenticateFirebaseUser(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("Authorization");

  if (!authorization) {
    throw new Error("Missing Authorization header.");
  }

  if (!authorization.startsWith("Bearer ")) {
    throw new Error("Authorization header must use Bearer token.");
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    throw new Error("Missing Firebase ID token.");
  }

  const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
    algorithms: ["RS256"],
    issuer: FIREBASE_ISSUER,
    audience: DEFAULT_FIREBASE_PROJECT_ID,
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Invalid Firebase UID.");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    emailVerified: Boolean(payload.email_verified),
  };
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }
  return fileName.substring(lastDot).toLowerCase();
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

/* ========================================================================== */
/* Cryptographic Helpers (HMAC SHA-256 using Web Crypto API)                 */
/* ========================================================================== */

export async function computeHmacSha256(
  secret: string,
  data: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(data)
  );
  return Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time comparison between two strings or byte arrays to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

export async function verifyHmacSha256(
  secret: string,
  data: string,
  expectedHexSignature: string
): Promise<boolean> {
  if (!secret || !expectedHexSignature) return false;
  try {
    const computed = await computeHmacSha256(secret, data);
    return timingSafeEqual(
      computed.toLowerCase(),
      expectedHexSignature.toLowerCase().trim()
    );
  } catch (err) {
    console.error("HMAC verification error:", err);
    return false;
  }
}

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ========================================================================== */
/* Firestore REST API Conversion Helpers                                      */
/* ========================================================================== */

export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue),
      },
    };
  }
  if (typeof val === "object") {
    return {
      mapValue: {
        fields: toFirestoreFields(val),
      },
    };
  }
  return { stringValue: String(val) };
}

export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      fields[key] = toFirestoreValue(value);
    }
  }
  return fields;
}

export function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("booleanValue" in val) return val.booleanValue;
  if ("nullValue" in val) return null;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ("mapValue" in val) {
    return fromFirestoreFields(val.mapValue.fields || {});
  }
  return null;
}

export function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields || {})) {
    obj[key] = fromFirestoreValue(val);
  }
  return obj;
}

/**
 * Mint a Google OAuth2 Service Account access token for privileged Firestore access.
 */
export async function getServiceAccountAccessToken(
  clientEmail: string,
  privateKeyPem: string
): Promise<string | null> {
  try {
    const formattedKey = privateKeyPem.replace(/\\n/g, "\n");
    const privateKey = await importPKCS8(formattedKey, "RS256");
    const jwt = await new SignJWT({
      scope: "https://www.googleapis.com/auth/datastore",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(clientEmail)
      .setSubject(clientEmail)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      // Log status + body; never log the JWT assertion or access tokens.
      console.error(
        `[payment] getServiceAccountAccessToken: Google token exchange failed (HTTP ${tokenRes.status}):`,
        errBody
      );
      return null;
    }

    const data: any = await tokenRes.json();
    return data.access_token || null;
  } catch (err) {
    console.error("[payment] getServiceAccountAccessToken: unexpected error:", err);
    return null;
  }
}

export async function getPrivilegedFirestoreAccessToken(
  env: Pick<Env, "FIREBASE_CLIENT_EMAIL" | "FIREBASE_PRIVATE_KEY">
): Promise<string> {
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    throw new Error(
      "Firestore service-account credentials are not configured. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }

  const accessToken = await getServiceAccountAccessToken(
    env.FIREBASE_CLIENT_EMAIL,
    env.FIREBASE_PRIVATE_KEY
  );
  if (!accessToken) {
    throw new Error("Could not obtain a Firestore service-account access token.");
  }
  return accessToken;
}

export class FirestoreRequestError extends Error {
  constructor(
    public readonly operation: string,
    public readonly status: number,
    message: string
  ) {
    super(`${operation} failed with HTTP ${status}: ${message}`);
    this.name = "FirestoreRequestError";
  }
}

/**
 * Read a document from Firestore REST API.
 */
export async function getFirestoreDoc(
  projectId: string,
  collectionName: string,
  docId: string,
  apiKey?: string,
  authToken?: string
): Promise<any | null> {
  if (!authToken) {
    throw new Error("A privileged Firestore access token is required.");
  }
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}`;
  const url = apiKey ? `${baseUrl}?key=${apiKey}` : baseUrl;

  const headers: Record<string, string> = {};
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new FirestoreRequestError("Firestore read", res.status, await res.text());
  }

  const json: any = await res.json();
  return {
    id: docId,
    ...fromFirestoreFields(json.fields || {}),
  };
}

/**
 * Write/create a document in Firestore REST API.
 */
export async function setFirestoreDoc(
  projectId: string,
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  apiKey?: string,
  authToken?: string
): Promise<boolean> {
  if (!authToken) {
    throw new Error("A privileged Firestore access token is required.");
  }
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?documentId=${encodeURIComponent(
    docId
  )}`;
  const url = apiKey ? `${baseUrl}&key=${apiKey}` : baseUrl;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fields: toFirestoreFields(data),
    }),
  });

  if (!res.ok) {
    throw new FirestoreRequestError("Firestore write", res.status, await res.text());
  }
  return true;
}

/**
 * Patch/update specific fields in a Firestore document.
 */
export async function patchFirestoreDoc(
  projectId: string,
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  fieldPaths: string[],
  apiKey?: string,
  authToken?: string
): Promise<boolean> {
  if (!authToken) {
    throw new Error("A privileged Firestore access token is required.");
  }
  const queryParams = fieldPaths
    .map((fp) => `updateMask.fieldPaths=${encodeURIComponent(fp)}`)
    .join("&");
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}?${queryParams}`;
  const url = apiKey ? `${baseUrl}&key=${apiKey}` : baseUrl;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      fields: toFirestoreFields(data),
    }),
  });

  if (!res.ok) {
    throw new FirestoreRequestError("Firestore patch", res.status, await res.text());
  }
  return true;
}

/**
 * Perform atomic multi-document writes/transforms via the Firestore commit API.
 */
export async function commitFirestoreWrites(
  projectId: string,
  writes: any[],
  apiKey?: string,
  authToken?: string
): Promise<any> {
  if (!authToken) {
    throw new Error("A privileged Firestore access token is required.");
  }
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
  const url = apiKey ? `${baseUrl}?key=${apiKey}` : baseUrl;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ writes }),
  });

  if (!res.ok) {
    throw new FirestoreRequestError("Firestore commit", res.status, await res.text());
  }
  return await res.json();
}

/**
 * Helper to queue an email in the Firestore 'mail' collection.
 */
export async function queueConfirmationEmail(
  projectId: string,
  order: any,
  authToken?: string,
  apiKey?: string
): Promise<boolean> {
  if (!order.customerEmail) return false;

  const mailDocId = `mail_${order.id}_paid`;
  const mailPayload = {
    to: [order.customerEmail],
    message: {
      subject: `Payment Confirmed & Order Placed #${order.id.slice(0, 8).toUpperCase()} — Shilp Sahayak Studio`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden;">
          <div style="background: #0c0a09; padding: 24px; text-align: center;">
            <h1 style="color: #ff4d00; margin: 0; font-size: 24px; font-weight: 800;">SHILP SAHAYAK</h1>
            <p style="color: #a8a29e; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">3D Fabrication & Precision Prototyping Studio</p>
          </div>
          <div style="padding: 32px 24px;">
            <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: monospace;">
              Payment Verified ✓ Order Confirmed
            </div>
            <h2 style="font-size: 20px; font-weight: 700; margin: 12px 0 8px 0; color: #0c0a09;">
              Thank you for your payment, ${order.customerName}!
            </h2>
            <p style="font-size: 14px; line-height: 1.5; color: #57534e; margin: 0 0 20px 0;">
              Your order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> has been authoritatively verified via Razorpay. Production and slicing preparation have begun.
            </p>
            <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
              <div style="margin-bottom: 6px;"><strong>Order Reference:</strong> #${order.id.slice(0, 8).toUpperCase()}</div>
              <div style="margin-bottom: 6px;"><strong>Razorpay Payment ID:</strong> ${order.paymentId || "Verified"}</div>
              <div style="margin-bottom: 6px;"><strong>Total Paid:</strong> ₹${Number(order.total).toLocaleString("en-IN")}</div>
              <div><strong>Delivery Address:</strong> ${order.address}</div>
            </div>
          </div>
        </div>
      `,
      text: `Your payment for order #${order.id.slice(0, 8).toUpperCase()} (₹${order.total}) has been verified. Production has begun.`,
    },
    type: "order_confirmed",
    metadata: {
      orderId: order.id,
      paymentId: order.paymentId,
      total: order.total,
    },
    createdAt: new Date().toISOString(),
    status: "queued",
  };

  return await setFirestoreDoc(
    projectId,
    "mail",
    mailDocId,
    mailPayload,
    apiKey,
    authToken
  );
}

/* ========================================================================== */
/* Pricing & Calculation Logic                                                */
/* ========================================================================== */

export interface OrderItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
  customNotes?: string;
  customPrint?: any;
}

export interface CalculatedPricing {
  subtotal: number;
  shipping: number;
  total: number;
  verifiedItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    variantId?: string;
    variantLabel?: string;
    customNotes?: string;
    customPrint?: any;
  }>;
}

/**
 * Authoritatively calculates subtotal, shipping, and total for given items.
 */
export async function calculateOrderPricing(
  items: OrderItemInput[],
  projectId: string,
  apiKey?: string,
  authToken?: string
): Promise<CalculatedPricing> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order must contain at least one item.");
  }

  // 1. Fetch platform settings for shipping rules
  let shippingFlatRate = 150;
  let freeShippingThreshold = 499;

  try {
    const settings = await getFirestoreDoc(
      projectId,
      "settings",
      "settings",
      apiKey,
      authToken
    );
    if (settings) {
      if (typeof settings.shippingFlatRate === "number") {
        shippingFlatRate = settings.shippingFlatRate;
      }
      if (typeof settings.freeShippingThreshold === "number") {
        freeShippingThreshold = settings.freeShippingThreshold;
      }
    }
  } catch (e) {
    console.warn("Could not load settings, using standard shipping defaults:", e);
  }

  // 2. Validate items and compute subtotal
  let subtotal = 0;
  const verifiedItems: CalculatedPricing["verifiedItems"] = [];

  for (const item of items) {
    const qty = Math.floor(Number(item.quantity));
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid quantity for item ${item.productId}.`);
    }

    const product = await getFirestoreDoc(
      projectId,
      "products",
      item.productId,
      apiKey,
      authToken
    );

    if (!product) {
      throw new Error(`Product ${item.productId} was not found.`);
    }

    if (product.active === false) {
      throw new Error(`Product "${product.name}" is not currently available.`);
    }

    // Check available finished inventory stock (if managed)
    if (typeof product.stock === "number" && product.stock < qty) {
      throw new Error(`Insufficient stock for "${product.name}". Only ${product.stock} units available.`);
    }

    let unitPrice = Number(product.price);

    // If item specifies a variant, resolve authoritative variant price
    if (item.variantId && Array.isArray(product.variants)) {
      const variant = product.variants.find((v: any) => v.id === item.variantId);
      if (variant && typeof variant.price === "number") {
        unitPrice = variant.price;
      }
    }

    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid price configuration for product "${product.name}".`);
    }

    subtotal += unitPrice * qty;

    verifiedItems.push({
      productId: item.productId,
      productName: product.name || "3D Printed Item",
      quantity: qty,
      price: unitPrice,
      variantId: item.variantId,
      variantLabel: item.variantLabel,
      customNotes: item.customNotes,
      customPrint: item.customPrint,
    });
  }

  // 3. Authoritative shipping calculation
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const total = subtotal + shipping;

  return {
    subtotal,
    shipping,
    total,
    verifiedItems,
  };
}

/**
 * Validates with Razorpay API that a payment is genuinely captured and matches expected order parameters.
 */
export async function verifyRazorpayPaymentCapture(
  keyId: string,
  keySecret: string,
  paymentId: string,
  expectedOrderId: string,
  expectedAmountInPaise: number,
  expectedCurrency: string = "INR"
): Promise<{ valid: boolean; error?: string; payment?: any }> {
  // Fail closed if credentials are missing, empty, or placeholder
  if (
    !keyId ||
    !keySecret ||
    keyId.trim().length === 0 ||
    keySecret.trim().length === 0 ||
    keySecret.includes("placeholder") ||
    keyId.includes("placeholder")
  ) {
    console.error("[payment] verifyRazorpayPaymentCapture: Razorpay credentials missing or placeholder. Failing closed.");
    return {
      valid: false,
      error: "Payment gateway credentials are not properly configured on server.",
    };
  }

  try {
    const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Razorpay payment fetch failed (${res.status}):`, errText);
      return { valid: false, error: `Gateway rejected payment lookup (HTTP ${res.status}).` };
    }

    const payment: any = await res.json();

    if (payment.order_id !== expectedOrderId) {
      return {
        valid: false,
        error: `Payment order ID mismatch. Expected ${expectedOrderId}, got ${payment.order_id}.`,
      };
    }

    if (Number(payment.amount) !== expectedAmountInPaise) {
      return {
        valid: false,
        error: `Payment amount mismatch. Expected ${expectedAmountInPaise} paise, got ${payment.amount} paise.`,
      };
    }

    if (payment.currency !== expectedCurrency) {
      return {
        valid: false,
        error: `Payment currency mismatch. Expected ${expectedCurrency}, got ${payment.currency}.`,
      };
    }

    if (payment.status !== "captured") {
      return {
        valid: false,
        error: `Payment is not in captured state. Current status: "${payment.status}".`,
      };
    }

    return { valid: true, payment };
  } catch (err: any) {
    console.error("Error verifying payment capture with Razorpay:", err);
    return { valid: false, error: err?.message || "Failed to reach Razorpay API." };
  }
}

/**
 * Validates and retrieves a Razorpay order from the Razorpay API.
 */
export async function fetchRazorpayOrder(
  keyId: string,
  keySecret: string,
  razorpayOrderId: string
): Promise<{ success: boolean; error?: string; order?: any }> {
  if (
    !keyId ||
    !keySecret ||
    keyId.trim().length === 0 ||
    keySecret.trim().length === 0 ||
    keySecret.includes("placeholder") ||
    keyId.includes("placeholder")
  ) {
    console.error("[payment] fetchRazorpayOrder: Razorpay credentials missing or placeholder. Failing closed.");
    return {
      success: false,
      error: "Payment gateway credentials are not properly configured on server.",
    };
  }

  try {
    const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
    const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpayOrderId)}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Razorpay order fetch failed (${res.status}):`, errText);
      return { success: false, error: `Gateway rejected order lookup (HTTP ${res.status}).` };
    }

    const order: any = await res.json();
    return { success: true, order };
  } catch (err: any) {
    console.error("Error fetching order from Razorpay API:", err);
    return { success: false, error: err?.message || "Failed to reach Razorpay API." };
  }
}

/* ========================================================================== */
/* Main Worker Fetch Handler                                                  */
/* ========================================================================== */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ------------------------------------------------------------------------
    // CORS Preflight
    // ------------------------------------------------------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request),
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const projectId = env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
    const apiKey = env.FIREBASE_API_KEY || DEFAULT_FIREBASE_API_KEY;

    // ------------------------------------------------------------------------
    // HEALTH CHECK
    // ------------------------------------------------------------------------
    if (request.method === "GET" && pathname === "/health") {
      return jsonResponse(request, {
        success: true,
        service: "shilp-sahayak-r2",
        storage: "connected",
        paymentGateway: "razorpay-test",
      });
    }

    // ------------------------------------------------------------------------
    // PAYMENT: CREATE TRUSTED ORDER (POST /api/payment/create-order)
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // PAYMENT: CREATE TRUSTED ORDER (POST /api/payment/create-order)
    // ------------------------------------------------------------------------
    if (
      request.method === "POST" &&
      pathname === "/api/payment/create-order"
    ) {
      let uid: string;
      let firestoreToken: string;
      try {
        uid = await authenticateUser(request);
      } catch (authErr: any) {
        return jsonResponse(
          request,
          {
            success: false,
            error: `Authentication required: ${authErr?.message || "Missing or invalid token."}`,
          },
          401
        );
      }

      try {
        firestoreToken = await getPrivilegedFirestoreAccessToken(env);
        // TASK 2-B/C diagnostics: log token source and project ID.
        // getPrivilegedFirestoreAccessToken throws if credentials are missing or token acquisition fails,
        // so reaching this line confirms a service-account token was obtained.
        console.log("[payment] Firestore write token source: service-account");
        console.log(`[payment] Firestore project: ${env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID}`);
      } catch (tokenErr: any) {
        console.error("[payment] Service account credentials error in create-order:", tokenErr?.message);
        return jsonResponse(
          request,
          { success: false, error: "Server configuration error." },
          500
        );
      }

      try {
        const body: any = await request.json();
        const {
          items,
          shippingAddress,
          purchaseMode = "cart",
          notes = "",
          clientCalculatedTotal,
        } = body || {};

        if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.email) {
          return jsonResponse(
            request,
            { success: false, error: "Complete contact information (name, email, phone) and shipping address are required." },
            400
          );
        }

        const email = String(shippingAddress.email || "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return jsonResponse(
            request,
            { success: false, error: "A valid email address is required." },
            400
          );
        }

        const phoneDigits = String(shippingAddress.phone || "").replace(/\D/g, "");
        if (phoneDigits.length < 10) {
          return jsonResponse(
            request,
            { success: false, error: "A valid 10-digit mobile number is required." },
            400
          );
        }

        // Authoritative server calculation
        const pricing = await calculateOrderPricing(
          items,
          projectId,
          apiKey,
          firestoreToken
        );

        // Reject client price manipulation attempts
        if (
          clientCalculatedTotal !== undefined &&
          Math.abs(Number(clientCalculatedTotal) - pricing.total) > 0.01
        ) {
          return jsonResponse(
            request,
            {
              success: false,
              error: `Calculated total mismatch. Browser submitted ₹${clientCalculatedTotal}, authoritative total is ₹${pricing.total}.`,
            },
            400
          );
        }

        // Create unique internal order ID
        const dateNow = new Date().toISOString();
        const orderId = `ORD_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase()}`;

        const formattedAddress = [
          shippingAddress.houseNo,
          shippingAddress.street,
          shippingAddress.landmark,
          shippingAddress.city,
          shippingAddress.state,
          shippingAddress.pincode,
        ]
          .filter(Boolean)
          .join(", ");

        const amountInPaise = Math.round(pricing.total * 100);

        // Razorpay credentials
        const keyId = env.RAZORPAY_KEY_ID;
        const keySecret = env.RAZORPAY_KEY_SECRET;

        if (
          !keyId ||
          !keySecret ||
          keyId.trim().length === 0 ||
          keySecret.trim().length === 0 ||
          keySecret.includes("placeholder") ||
          keyId.includes("placeholder")
        ) {
          console.error("[payment] create-order: Razorpay credentials missing or placeholder. Failing closed.");
          return jsonResponse(
            request,
            {
              success: false,
              error: "Payment gateway credentials are not properly configured on server.",
            },
            500
          );
        }

        const authString = btoa(`${keyId}:${keySecret}`);
        const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${authString}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: orderId,
            payment_capture: 1,
            notes: {
              internalOrderId: orderId,
              customerId: uid,
              purchaseMode,
            },
          }),
        });

        if (!rzpResponse.ok) {
          const rzpError = await rzpResponse.text();
          console.error("Razorpay order creation failed:", rzpError);
          return jsonResponse(
            request,
            {
              success: false,
              error: "Failed to initiate payment session with gateway.",
              details: rzpError,
            },
            502
          );
        }

        const rzpData: any = await rzpResponse.json();
        const razorpayOrderId = rzpData.id;


        // Write internal order to Firestore
        const internalOrderData: Record<string, any> = {
          id: orderId,
          customerId: uid,
          customerName: shippingAddress.fullName,
          customerEmail: email,
          customerPhone: shippingAddress.phone,
          address: formattedAddress,
          shippingAddress: {
            ...shippingAddress,
            email,
          },
          items: pricing.verifiedItems,
          productIds: pricing.verifiedItems.map((i) => i.productId),
          subtotal: pricing.subtotal,
          shipping: pricing.shipping,
          total: pricing.total,
          purchaseMode,
          notes,
          date: dateNow,
          status: "Pending",
          paymentStatus: "Pending",
          fulfillmentType: "Standard Shipping",
          razorpayOrderId,
          timeline: [
            {
              id: `tl_${Date.now()}`,
              status: "Pending",
              note: "Order placed, awaiting Razorpay payment",
              timestamp: dateNow,
              updatedBy: "System",
            },
          ],
          internalNotes: [],
        };

        await setFirestoreDoc(
          projectId,
          "orders",
          orderId,
          internalOrderData,
          apiKey,
          firestoreToken
        );

        return jsonResponse(request, {
          success: true,
          orderId,
          razorpayOrderId,
          amount: amountInPaise,
          currency: "INR",
          keyId,
          pricing: {
            subtotal: pricing.subtotal,
            shipping: pricing.shipping,
            total: pricing.total,
          },
        });
      } catch (error: any) {
        console.error("Create order error:", error);
        return jsonResponse(
          request,
          {
            success: false,
            error: error?.message || "Failed to create payment order.",
          },
          400
        );
      }
    }

    // ------------------------------------------------------------------------
    // PAYMENT: VERIFY PAYMENT & CAPTURE (POST /api/payment/verify)
    // ------------------------------------------------------------------------
    if (
      request.method === "POST" &&
      pathname === "/api/payment/verify"
    ) {
      let uid: string;
      try {
        uid = await authenticateUser(request);
      } catch (authErr: any) {
        return jsonResponse(
          request,
          {
            success: false,
            error: `Authentication required: ${authErr?.message || "Missing or invalid token."}`,
          },
          401
        );
      }

      let firestoreToken: string;
      try {
        firestoreToken = await getPrivilegedFirestoreAccessToken(env);
        // TASK 2-B/C diagnostics: log token source and project ID.
        // getPrivilegedFirestoreAccessToken throws if credentials are missing or token acquisition fails,
        // so reaching this line confirms a service-account token was obtained.
        console.log("[payment] Firestore write token source: service-account");
        console.log(`[payment] Firestore project: ${env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID}`);
      } catch (tokenErr: any) {
        console.error("[payment] Service account credentials error in verify:", tokenErr?.message);
        return jsonResponse(
          request,
          { success: false, error: "Server configuration error." },
          500
        );
      }

      try {
        const body: any = await request.json();
        const {
          orderId,
          razorpayPaymentId,
          razorpayOrderId,
          razorpaySignature,
        } = body || {};

        if (!orderId || !razorpayPaymentId || !razorpayOrderId) {
          return jsonResponse(
            request,
            { success: false, error: "Missing required payment identifiers." },
            400
          );
        }

        // 2. Retrieve internal order from trusted server-side data
        const existingOrder = await getFirestoreDoc(
          projectId,
          "orders",
          orderId,
          apiKey,
          firestoreToken
        );

        if (!existingOrder) {
          return jsonResponse(
            request,
            { success: false, error: "Order not found." },
            404
          );
        }

        // 3. Ensure internal order belongs to the requester
        if (!existingOrder.customerId || existingOrder.customerId !== uid) {
          return jsonResponse(
            request,
            { success: false, error: "Unauthorized access to this order." },
            403
          );
        }

        // 4. Ensure Razorpay order ID belongs to that internal order
        if (
          !existingOrder.razorpayOrderId ||
          existingOrder.razorpayOrderId !== razorpayOrderId
        ) {
          console.warn("Mismatched Razorpay order identifier:", {
            expected: existingOrder.razorpayOrderId,
            received: razorpayOrderId,
          });
          return jsonResponse(
            request,
            { success: false, error: "Mismatched Razorpay order identifier." },
            400
          );
        }

        // 5. STEP A: Verify Razorpay checkout signature FIRST (before any idempotency or status checks)
        const keySecret = env.RAZORPAY_KEY_SECRET;
        const keyId = env.RAZORPAY_KEY_ID;

        if (
          !keySecret ||
          keySecret.trim().length === 0 ||
          keySecret.includes("placeholder")
        ) {
          console.error("[payment] verify: RAZORPAY_KEY_SECRET missing or placeholder. Failing closed.");
          return jsonResponse(
            request,
            { success: false, error: "Payment verification credentials are not configured on server." },
            500
          );
        }

        const dataToSign = `${existingOrder.razorpayOrderId}|${razorpayPaymentId}`;
        const isValidSignature = await verifyHmacSha256(keySecret, dataToSign, razorpaySignature);

        if (!isValidSignature) {
          console.warn("Invalid payment signature received for order:", orderId);
          return jsonResponse(
            request,
            { success: false, error: "Invalid payment signature verification failed." },
            400
          );
        }

        // 5b. Re-marking protection: if order is already Paid, verify it's the exact same paymentId or reject
        if (existingOrder.paymentStatus === "Paid") {
          if (existingOrder.paymentId === razorpayPaymentId || existingOrder.razorpayPaymentId === razorpayPaymentId) {
            console.log(`Order ${orderId} already marked Paid with matching payment ID ${razorpayPaymentId}. Idempotent return.`);
            return jsonResponse(request, {
              success: true,
              orderId,
              paymentId: razorpayPaymentId,
              status: existingOrder.status || "Confirmed",
              paymentStatus: "Paid",
            });
          } else {
            console.warn(`Order ${orderId} already paid with different payment ID: ${existingOrder.paymentId} vs ${razorpayPaymentId}`);
            return jsonResponse(
              request,
              { success: false, error: "Order is already paid with a different payment reference." },
              400
            );
          }
        }

        // 6. Verify payment/order amount and currency
        const expectedAmountInPaise = Math.round(Number(existingOrder.total) * 100);
        const expectedCurrency = "INR";

        // 7. Verify payment is actually captured and valid before marking it Paid
        if (!keyId || keyId.trim().length === 0 || keyId.includes("placeholder")) {
          console.error("[payment] verify: RAZORPAY_KEY_ID missing or placeholder. Failing closed.");
          return jsonResponse(
            request,
            { success: false, error: "Payment gateway key ID is not configured on server." },
            500
          );
        }

        const captureVerification = await verifyRazorpayPaymentCapture(
          keyId,
          keySecret,
          razorpayPaymentId,
          existingOrder.razorpayOrderId,
          expectedAmountInPaise,
          expectedCurrency
        );


        if (!captureVerification.valid) {
          return jsonResponse(
            request,
            {
              success: false,
              error: captureVerification.error || "Payment is not verified as captured.",
            },
            400
          );
        }

        // Fetch the Razorpay ORDER from Razorpay API to verify receipt / notes
        const rzpOrderLookup = await fetchRazorpayOrder(
          keyId,
          keySecret,
          existingOrder.razorpayOrderId
        );

        if (!rzpOrderLookup.success || !rzpOrderLookup.order) {
          return jsonResponse(
            request,
            {
              success: false,
              error: rzpOrderLookup.error || "Failed to retrieve Razorpay order details for verification.",
            },
            400
          );
        }

        const rzpOrder = rzpOrderLookup.order;
        const rzpOrderReceipt = rzpOrder.receipt || rzpOrder.notes?.internalOrderId;

        if (!rzpOrderReceipt) {
          console.warn("Razorpay order missing receipt and internalOrderId notes:", rzpOrder.id);
          return jsonResponse(
            request,
            { success: false, error: "Razorpay order is missing receipt identifier." },
            400
          );
        }

        if (rzpOrderReceipt !== orderId) {
          console.warn("Razorpay order receipt mismatch:", {
            expected: orderId,
            received: rzpOrderReceipt,
          });
          return jsonResponse(
            request,
            { success: false, error: "Razorpay order receipt does not match this internal order." },
            400
          );
        }

        // Verify that the Razorpay payment's receipt or notes matches the internal order ID (if present)
        const paymentData = captureVerification.payment;
        if (
          paymentData?.notes?.internalOrderId &&
          paymentData.notes.internalOrderId !== orderId
        ) {
          console.warn("Razorpay payment notes internalOrderId mismatch:", {
            expected: orderId,
            received: paymentData.notes.internalOrderId,
          });
          return jsonResponse(
            request,
            { success: false, error: "Razorpay payment receipt does not match this internal order." },
            400
          );
        }

        // 8. Only then: mark paymentStatus = Paid, orderStatus = Confirmed
        const paidAt = new Date().toISOString();
        const timeline = Array.isArray(existingOrder.timeline)
          ? existingOrder.timeline
          : [];

        // 8. If order is already Cancelled: do not set it to Confirmed!
        // Record paymentStatus = Paid, paymentId, needsRefund = true, and append a timeline note for admin refund.
        const isCancelled = existingOrder.status === "Cancelled";
        const targetStatus = isCancelled ? "Cancelled" : "Confirmed";

        // Check email deduplication guard: only send confirmation once per non-cancelled order
        const shouldSendEmail =
          !isCancelled &&
          !existingOrder.confirmationEmailSent &&
          existingOrder.paymentStatus !== "Paid";

        const updateData: Record<string, any> = {
          paymentStatus: "Paid",
          status: targetStatus,
          paymentId: razorpayPaymentId,
          razorpayPaymentId,
          razorpayOrderId: existingOrder.razorpayOrderId,
          paidAt,
          confirmationEmailSent: !isCancelled,
          timeline: [
            ...timeline,
            {
              id: `tl_${Date.now()}`,
              status: targetStatus,
              note: isCancelled
                ? `Payment received after order was cancelled (Ref: ${razorpayPaymentId}). Marked for refund.`
                : `Payment verified & captured via Razorpay (Ref: ${razorpayPaymentId})`,
              timestamp: paidAt,
              updatedBy: "Razorpay Gateway",
            },
          ],
        };

        const patchFields = [
          "paymentStatus",
          "status",
          "paymentId",
          "razorpayPaymentId",
          "razorpayOrderId",
          "paidAt",
          "confirmationEmailSent",
          "timeline",
        ];

        if (isCancelled) {
          updateData.needsRefund = true;
          patchFields.push("needsRefund");
        }

        // TASK 2.5: capture and log patchFirestoreDoc result.
        // patchFirestoreDoc throws a FirestoreRequestError on failure (it never silently returns false),
        // so patchOk will be true when execution reaches this line; the throw propagates to the outer catch.
        // This log makes the success/failure observable in Worker tail logs.
        let patchOk = false;
        try {
          patchOk = await patchFirestoreDoc(
            projectId,
            "orders",
            orderId,
            updateData,
            patchFields,
            apiKey,
            firestoreToken
          );
        } finally {
          console.log(`[payment] Firestore patch result: ${patchOk ? "OK" : "FAILED"} (order ${orderId})`);
        }

        // Queue order confirmation email if not already sent and not cancelled
        if (shouldSendEmail) {
          await queueConfirmationEmail(
            projectId,
            { ...existingOrder, ...updateData },
            firestoreToken,
            apiKey
          );
        }

        return jsonResponse(request, {
          success: true,
          orderId,
          paymentId: razorpayPaymentId,
          status: targetStatus,
          paymentStatus: "Paid",
          ...(isCancelled ? { needsRefund: true } : {}),
        });
      } catch (error: any) {
        console.error("Payment verification error:", error);
        return jsonResponse(
          request,
          {
            success: false,
            error: error?.message || "Payment verification failed.",
          },
          error instanceof FirestoreRequestError ? 500 : 400
        );
      }
    }

    // ------------------------------------------------------------------------
    // PAYMENT: CANONICAL RAZORPAY WEBHOOK (POST /api/payment/webhook)
    // ------------------------------------------------------------------------
    if (request.method === "POST" && pathname === "/api/payment/webhook") {
      try {
        const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
        const signature = request.headers.get("X-Razorpay-Signature") || "";

        // Fail closed if webhook secret is missing, empty, or placeholder
        if (
          !webhookSecret ||
          webhookSecret.trim().length === 0 ||
          webhookSecret.includes("placeholder")
        ) {
          console.error("[webhook] RAZORPAY_WEBHOOK_SECRET missing or placeholder. Failing closed.");
          return jsonResponse(
            request,
            { success: false, error: "Webhook verification secret is not configured on server." },
            500
          );
        }

        // Raw body preserved for cryptographic HMAC SHA-256 verification
        const rawBody = await request.text();
        const isValidSignature = await verifyHmacSha256(webhookSecret, rawBody, signature);

        if (!isValidSignature) {
          console.warn("Invalid webhook signature rejected.");
          return jsonResponse(
            request,
            { success: false, error: "Invalid webhook signature." },
            400
          );
        }

        const event: any = JSON.parse(rawBody);
        const eventId = event?.id;

        if (!eventId) {
          return jsonResponse(
            request,
            { success: false, error: "Missing Razorpay webhook event ID." },
            400
          );
        }

        // Webhooks have no browser token; use only the service-account credential.
        let adminToken: string;
        try {
          adminToken = await getPrivilegedFirestoreAccessToken(env);
        } catch (tokenErr: any) {
          console.error("[webhook] Service account credentials error in webhook:", tokenErr?.message);
          return jsonResponse(
            request,
            { success: false, error: "Server configuration error." },
            500
          );
        }

        // Webhook Idempotency Check
        const existingEvent = await getFirestoreDoc(
          projectId,
          "webhook_events",
          eventId,
          apiKey,
          adminToken
        );

        if (existingEvent) {
          // If already successfully processed, acknowledge immediately
          if (existingEvent.status === "processed") {
            console.log(`Webhook event ${eventId} already processed. Acknowledging.`);
            return jsonResponse(request, {
              received: true,
              status: "already_processed",
              eventId,
            });
          }

          // If currently in processing and started recently (< 30 seconds ago), acknowledge duplicate
          if (existingEvent.status === "processing") {
            const startedAt = new Date(existingEvent.startedAt || 0).getTime();
            if (Date.now() - startedAt < 30000) {
              console.log(`Webhook event ${eventId} is currently processing.`);
              return jsonResponse(request, {
                received: true,
                status: "currently_processing",
                eventId,
              });
            }
          }
          // If status is 'failed' or processing timed out, allow retry!
        }

        // Mark event state as 'processing'
        const processingData = {
          eventId,
          event: event.event,
          status: "processing",
          startedAt: new Date().toISOString(),
        };
        if (existingEvent) {
          await patchFirestoreDoc(
            projectId,
            "webhook_events",
            eventId,
            processingData,
            ["eventId", "event", "status", "startedAt"],
            apiKey,
            adminToken
          );
        } else {
          await setFirestoreDoc(
            projectId,
            "webhook_events",
            eventId,
            processingData,
            apiKey,
            adminToken
          );
        }

        let affectedOrderId: string | null = null;

        try {
          // Handle payment.captured event
          if (event.event === "payment.captured") {
            const paymentEntity = event.payload?.payment?.entity;
            const orderEntity = event.payload?.order?.entity;

            const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
            const paymentId = paymentEntity?.id;
            const internalOrderId =
              paymentEntity?.notes?.internalOrderId ||
              orderEntity?.notes?.internalOrderId ||
              orderEntity?.receipt;

            if (internalOrderId) {
              affectedOrderId = internalOrderId;
              const orderDoc = await getFirestoreDoc(
                projectId,
                "orders",
                internalOrderId,
                apiKey,
                adminToken
              );

              if (orderDoc) {
                // Reject if either razorpayOrderId is missing or they differ
                if (
                  !razorpayOrderId ||
                  !orderDoc.razorpayOrderId ||
                  orderDoc.razorpayOrderId !== razorpayOrderId
                ) {
                  console.warn(
                    `Webhook order_id verification failed for order ${internalOrderId}: event order_id="${razorpayOrderId}", stored razorpayOrderId="${orderDoc.razorpayOrderId}"`
                  );
                  return jsonResponse(
                    request,
                    { success: false, error: "Mismatched or missing Razorpay order ID for order." },
                    400
                  );
                }

                // Verify the Razorpay payment/order receipt or notes matches this internal order ID
                let eventReceipt = orderEntity?.receipt || orderEntity?.notes?.internalOrderId || paymentEntity?.notes?.internalOrderId;

                // If receipt/notes is not present in the webhook payload, fetch the Razorpay ORDER from Razorpay API
                if (!eventReceipt && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
                  const rzpOrderLookup = await fetchRazorpayOrder(
                    env.RAZORPAY_KEY_ID,
                    env.RAZORPAY_KEY_SECRET,
                    razorpayOrderId
                  );
                  if (rzpOrderLookup.success && rzpOrderLookup.order) {
                    eventReceipt = rzpOrderLookup.order.receipt || rzpOrderLookup.order.notes?.internalOrderId;
                  }
                }

                if (!eventReceipt) {
                  console.warn("Webhook order missing receipt/notes identifier for order:", internalOrderId);
                  return jsonResponse(
                    request,
                    { success: false, error: "Razorpay order is missing receipt identifier in webhook." },
                    400
                  );
                }

                if (eventReceipt !== internalOrderId) {
                  console.warn(
                    `Webhook internalOrderId mismatch: event receipt/note="${eventReceipt}", internalOrderId="${internalOrderId}"`
                  );
                  return jsonResponse(
                    request,
                    { success: false, error: "Mismatched internal order receipt in webhook." },
                    400
                  );
                }

                // Out-of-order check: do not double-process if already Paid
                if (orderDoc.paymentStatus === "Paid") {
                  console.log(`Order ${internalOrderId} is already marked Paid.`);
                } else {
                  const paidAt = new Date().toISOString();
                  const isCancelled = orderDoc.status === "Cancelled";
                  const targetStatus = isCancelled ? "Cancelled" : "Confirmed";

                  const shouldSendEmail =
                    !isCancelled &&
                    !orderDoc.confirmationEmailSent &&
                    orderDoc.paymentStatus !== "Paid";

                  const updateData: Record<string, any> = {
                    paymentStatus: "Paid",
                    status: targetStatus,
                    paymentId,
                    razorpayOrderId,
                    paidAt,
                    confirmationEmailSent: !isCancelled,
                    timeline: [
                      ...(orderDoc.timeline || []),
                      {
                        id: `tl_${Date.now()}`,
                        status: targetStatus,
                        note: isCancelled
                          ? `Payment captured via Razorpay Webhook for cancelled order (Ref: ${paymentId}). Marked for refund.`
                          : `Payment captured via Razorpay Webhook (Ref: ${paymentId})`,
                        timestamp: paidAt,
                        updatedBy: "Razorpay Webhook",
                      },
                    ],
                  };

                  const patchFields = [
                    "paymentStatus",
                    "status",
                    "paymentId",
                    "razorpayOrderId",
                    "paidAt",
                    "confirmationEmailSent",
                    "timeline",
                  ];

                  if (isCancelled) {
                    updateData.needsRefund = true;
                    patchFields.push("needsRefund");
                  }

                  // TASK 2.5: capture and log patchFirestoreDoc result for webhook path.
                  let webhookPatchOk = false;
                  try {
                    webhookPatchOk = await patchFirestoreDoc(
                      projectId,
                      "orders",
                      internalOrderId,
                      updateData,
                      patchFields,
                      apiKey,
                      adminToken
                    );
                  } finally {
                    console.log(`[payment] Firestore patch result: ${webhookPatchOk ? "OK" : "FAILED"} (order ${internalOrderId}) [webhook]`);
                  }

                  // Dispatch deduplicated confirmation email only if not cancelled
                  if (shouldSendEmail) {
                    await queueConfirmationEmail(
                      projectId,
                      { ...orderDoc, ...updateData },
                      adminToken,
                      apiKey
                    );
                  }
                }
              }
            }
          } else if (event.event === "payment.failed") {
            const paymentEntity = event.payload?.payment?.entity;
            const internalOrderId = paymentEntity?.notes?.internalOrderId;

            if (internalOrderId) {
              affectedOrderId = internalOrderId;
              const orderDoc = await getFirestoreDoc(
                projectId,
                "orders",
                internalOrderId,
                apiKey,
                adminToken
              );

              // Out-of-order safe check: never overwrite an order that is already Paid!
              if (orderDoc && orderDoc.paymentStatus !== "Paid") {
                const failedAt = new Date().toISOString();
                await patchFirestoreDoc(
                  projectId,
                  "orders",
                  internalOrderId,
                  {
                    paymentStatus: "Failed",
                    // orderStatus remains 'Pending' unless explicit cancellation policy
                    timeline: [
                      ...(orderDoc.timeline || []),
                      {
                        id: `tl_${Date.now()}`,
                        status: "Payment Failed",
                        note: `Payment attempt declined (${
                          paymentEntity?.error_description || "Card/Bank declined"
                        })`,
                        timestamp: failedAt,
                        updatedBy: "Razorpay Webhook",
                      },
                    ],
                  },
                  ["paymentStatus", "timeline"],
                  apiKey,
                  adminToken
                );
              } else if (orderDoc && orderDoc.paymentStatus === "Paid") {
                console.log(
                  `Ignoring payment.failed for order ${internalOrderId} because order is already Paid.`
                );
              }
            }
          }

          // Mark event state as 'processed' upon complete success
          await patchFirestoreDoc(
            projectId,
            "webhook_events",
            eventId,
            {
              status: "processed",
              completedAt: new Date().toISOString(),
              orderId: affectedOrderId,
            },
            ["status", "completedAt", "orderId"],
            apiKey,
            adminToken
          );

          return jsonResponse(request, {
            received: true,
            eventId,
            status: "processed",
          });
        } catch (innerErr: any) {
          console.error(`Webhook processing failure for event ${eventId}:`, innerErr);
          // Update status to 'failed' so it remains retryable by Razorpay
          await patchFirestoreDoc(
            projectId,
            "webhook_events",
            eventId,
            {
              status: "failed",
              failedAt: new Date().toISOString(),
              error: innerErr?.message || String(innerErr),
            },
            ["status", "failedAt", "error"],
            apiKey,
            adminToken
          );

          return jsonResponse(
            request,
            {
              success: false,
              error: innerErr?.message || "Webhook processing failed.",
            },
            500
          );
        }
      } catch (webhookErr: any) {
        console.error("Webhook outer error:", webhookErr);
        return jsonResponse(
          request,
          { success: false, error: webhookErr?.message || "Webhook error" },
          500
        );
      }
    }

    // ------------------------------------------------------------------------
    // STORAGE: UPLOAD 3D FILE / IMAGE (POST /upload)
    // ------------------------------------------------------------------------
    if (request.method === "POST" && pathname === "/upload") {
      try {
        let uid = "guest";
        const authHeader = request.headers.get("Authorization");
        if (authHeader && authHeader.trim().startsWith("Bearer ")) {
          uid = await authenticateUser(request);
        }
        const fileName = request.headers.get("X-File-Name");

        if (!fileName) {
          return jsonResponse(
            request,
            { success: false, error: "File name is required." },
            400
          );
        }

        const extension = getFileExtension(fileName);

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
          return jsonResponse(
            request,
            {
              success: false,
              error: "Unsupported file type. Allowed files: STL, OBJ and 3MF.",
            },
            400
          );
        }

        const contentLength = request.headers.get("Content-Length");

        if (contentLength && Number(contentLength) > MAX_FILE_SIZE) {
          return jsonResponse(
            request,
            { success: false, error: "File exceeds the 100 MB limit." },
            413
          );
        }

        if (!request.body) {
          return jsonResponse(
            request,
            { success: false, error: "No file received." },
            400
          );
        }

        const safeFileName = sanitizeFileName(fileName);
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const objectKey = `quotes/${uid}/${Date.now()}_${randomSuffix}_${safeFileName}`;

        await env.STORAGE.put(objectKey, request.body, {
          httpMetadata: {
            contentType:
              request.headers.get("Content-Type") ||
              "application/octet-stream",
          },
          customMetadata: {
            userId: uid,
            originalFileName: fileName,
            uploadedAt: new Date().toISOString(),
          },
        });

        return jsonResponse(request, {
          success: true,
          key: objectKey,
          fileName,
          size: contentLength ? Number(contentLength) : null,
        });
      } catch (error) {
        console.error("Upload error:", error);
        return jsonResponse(
          request,
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Authentication or upload failed.",
          },
          401
        );
      }
    }

    // ------------------------------------------------------------------------
    // STORAGE: GET FILE (GET /file)
    // ------------------------------------------------------------------------
    if (request.method === "GET" && pathname === "/file") {
      try {
        const key = url.searchParams.get("key");
        if (!key) {
          return jsonResponse(
            request,
            { success: false, error: "File key is required." },
            400
          );
        }

        const object = await env.STORAGE.get(key);

        if (!object) {
          return jsonResponse(
            request,
            { success: false, error: "File not found." },
            404
          );
        }

        const headers = getCorsHeaders(request);
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000");
        headers.set("X-Content-Type-Options", "nosniff");

        const ext = getFileExtension(key);
        if ([".stl", ".obj", ".3mf", ".zip"].includes(ext)) {
          const rawName = key.split("/").pop() || "model";
          headers.set("Content-Disposition", `attachment; filename="${sanitizeFileName(rawName)}"`);
        }

        return new Response(object.body, {
          headers,
        });
      } catch (error) {
        return jsonResponse(
          request,
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to retrieve file.",
          },
          500
        );
      }
    }

    // ------------------------------------------------------------------------
    // STORAGE: DELETE FILE (DELETE /file)
    // ------------------------------------------------------------------------
    if (request.method === "DELETE" && pathname === "/file") {
      try {
        const uid = await authenticateUser(request);
        const key = url.searchParams.get("key");

        if (!key) {
          return jsonResponse(
            request,
            { success: false, error: "File key is required." },
            400
          );
        }

        let isAdmin = false;
        try {
          const adminToken = await getPrivilegedFirestoreAccessToken(env);
          const userDoc = await getFirestoreDoc(projectId, "users", uid, apiKey, adminToken);
          if (userDoc?.role === "admin") {
            isAdmin = true;
          }
        } catch {
          // Non-admin or service account unavailable
        }

        if (!isAdmin && !key.startsWith(`quotes/${uid}/`)) {
          return jsonResponse(
            request,
            { success: false, error: "Access denied." },
            403
          );
        }

        await env.STORAGE.delete(key);

        return jsonResponse(request, { success: true });
      } catch (error) {
        console.error("Delete error:", error);
        return jsonResponse(
          request,
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Authentication or delete failed.",
          },
          401
        );
      }
    }

    // ------------------------------------------------------------------------
    // ORDERS: AUTHORITATIVE CANCELLATION (POST /api/orders/cancel)
    // ------------------------------------------------------------------------
    if (request.method === "POST" && pathname === "/api/orders/cancel") {
      let uid: string;
      try {
        uid = await authenticateUser(request);
      } catch (authErr: any) {
        return jsonResponse(
          request,
          {
            success: false,
            error: `Authentication required: ${authErr?.message || "Missing or invalid token."}`,
          },
          401
        );
      }

      let firestoreToken: string;
      try {
        firestoreToken = await getPrivilegedFirestoreAccessToken(env);
      } catch (tokenErr: any) {
        console.error("[orders] Service account token error in cancel:", tokenErr?.message);
        return jsonResponse(
          request,
          { success: false, error: "Server configuration error." },
          500
        );
      }

      try {
        const body: any = await request.json();
        const { orderId, reason } = body || {};

        if (!orderId || typeof orderId !== "string") {
          return jsonResponse(
            request,
            { success: false, error: "orderId is required." },
            400
          );
        }

        const existingOrder = await getFirestoreDoc(
          projectId,
          "orders",
          orderId,
          apiKey,
          firestoreToken
        );

        if (!existingOrder) {
          return jsonResponse(
            request,
            { success: false, error: "Order not found." },
            404
          );
        }

        // Check if user is owner or admin
        let isAdmin = false;
        try {
          const userDoc = await getFirestoreDoc(projectId, "users", uid, apiKey, firestoreToken);
          if (userDoc?.role === "admin") {
            isAdmin = true;
          }
        } catch {}

        if (!isAdmin && existingOrder.customerId !== uid) {
          return jsonResponse(
            request,
            { success: false, error: "Unauthorized access to this order." },
            403
          );
        }

        // Check cancellable status (only Pending or Confirmed allowed)
        const currentStatus = existingOrder.status;
        if (currentStatus === "Cancelled") {
          return jsonResponse(request, {
            success: true,
            orderId,
            status: "Cancelled",
            message: "Order is already cancelled.",
          });
        }

        // Option C for paid orders: non-admin customers cannot cancel already Paid orders.
        // They must contact studio support for verification & refund handling.
        const isPaid = existingOrder.paymentStatus === "Paid";
        if (!isAdmin && isPaid) {
          return jsonResponse(
            request,
            {
              success: false,
              error: "Order is already paid. Please contact studio support (hello@shilpsahayak.in) to request cancellation and refund.",
            },
            400
          );
        }

        // Non-admin customers can only cancel unpaid Pending orders
        if (!isAdmin && currentStatus !== "Pending") {
          return jsonResponse(
            request,
            {
              success: false,
              error: `Cannot cancel order. The current status is "${currentStatus}". 3D print fabrication or dispatch has already commenced.`,
            },
            400
          );
        }

        // Admin can cancel Pending or Confirmed orders
        if (isAdmin && currentStatus !== "Pending" && currentStatus !== "Confirmed") {
          return jsonResponse(
            request,
            {
              success: false,
              error: `Cannot cancel order. The current status is "${currentStatus}". 3D print fabrication or dispatch has already commenced.`,
            },
            400
          );
        }

        const cancelledAt = new Date().toISOString();
        const finalReason = String(reason || "Customer requested cancellation before production").trim();
        const timeline = Array.isArray(existingOrder.timeline) ? existingOrder.timeline : [];

        const updateData: Record<string, any> = {
          status: "Cancelled",
          cancelledAt,
          cancellationReason: finalReason,
          timeline: [
            ...timeline,
            {
              id: `tl_${Date.now()}`,
              status: "Cancelled",
              note: `Order cancelled (${finalReason})`,
              timestamp: cancelledAt,
              updatedBy: isAdmin ? "Admin" : "Customer",
            },
          ],
        };

        // Prepare atomic commit writes (order update + atomic stock restoration)
        const commitWrites: any[] = [];

        // 1. Order status update write with precondition (document must exist)
        const orderDocPath = `projects/${projectId}/databases/(default)/documents/orders/${encodeURIComponent(orderId)}`;
        commitWrites.push({
          update: {
            name: orderDocPath,
            fields: toFirestoreFields(updateData),
          },
          updateMask: {
            fieldPaths: ["status", "cancelledAt", "cancellationReason", "timeline"],
          },
          currentDocument: {
            exists: true,
          },
        });

        // 2. Authoritative atomic stock restoration:
        // Only restore inventory if stock was actually deducted for this order.
        // In this system, if existingOrder.stockDeducted === true, restore catalogue stock using atomic fieldTransforms increment.
        const shouldRestoreStock = existingOrder.stockDeducted === true;
        if (shouldRestoreStock && Array.isArray(existingOrder.items)) {
          for (const item of existingOrder.items) {
            if (!item?.productId) continue;
            const qtyToRestore = Number(item.quantity) || 1;
            const productDocPath = `projects/${projectId}/databases/(default)/documents/products/${encodeURIComponent(item.productId)}`;

            commitWrites.push({
              transform: {
                document: productDocPath,
                fieldTransforms: [
                  {
                    fieldPath: "stock",
                    increment: {
                      integerValue: String(qtyToRestore),
                    },
                  },
                ],
              },
            });
          }
        }

        // Execute atomic commit
        await commitFirestoreWrites(
          projectId,
          commitWrites,
          apiKey,
          firestoreToken
        );

        // Queue order cancellation email
        if (existingOrder.customerEmail) {
          const mailDocId = `mail_order_cancelled_${orderId}`;
          const mailPayload = {
            to: [existingOrder.customerEmail],
            message: {
              subject: `Order Cancelled & Refund Initiated #${orderId.slice(0, 8).toUpperCase()} — Shilp Sahayak`,
              html: `
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1917;">
                  <div style="background-color: #0c0a09; padding: 24px; text-align: center; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                    <h1 style="color: #ff4d00; margin: 0; font-size: 24px; font-weight: 800;">SHILP SAHAYAK</h1>
                    <p style="color: #a8a29e; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-family: monospace;">3D Fabrication & Precision Prototyping Studio</p>
                  </div>
                  <div style="padding: 32px 24px;">
                    <div style="display: inline-block; background-color: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase;">
                      Order Cancelled &amp; Refund Initiated
                    </div>
                    <h2 style="font-size: 20px; font-weight: 700; margin: 12px 0 8px 0; color: #0c0a09;">
                      Order #${orderId.slice(0, 8).toUpperCase()} has been cancelled
                    </h2>
                    <p style="font-size: 14px; line-height: 1.5; color: #57534e; margin: 0 0 20px 0;">
                      Hello ${escapeHtml(existingOrder.customerName || "Customer")}, your order has been cancelled prior to 3D production.
                    </p>
                    <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 20px;">
                      <span style="font-size: 11px; font-family: monospace; color: #9a3412; font-weight: 700; text-transform: uppercase;">
                        100% Refund Amount
                      </span>
                      <div style="font-size: 28px; font-weight: 800; color: #ea580c; margin: 4px 0;">
                        ₹${Number(existingOrder.total || 0).toLocaleString("en-IN")}
                      </div>
                      <p style="font-size: 12px; color: #78716c; margin: 4px 0 0 0;">
                        Your refund will be credited to your original payment method within <strong>2–3 business days</strong>.
                      </p>
                    </div>
                    <p style="font-size: 12px; color: #78716c;"><strong>Cancellation Reason:</strong> ${escapeHtml(finalReason)}</p>
                  </div>
                </div>
              `,
              text: `Your order #${orderId.slice(0, 8).toUpperCase()} has been cancelled. A 100% refund of ₹${Number(existingOrder.total || 0)} will be credited within 2-3 business days.`,
            },
            type: "order_cancelled",
            metadata: {
              orderId,
              cancelledAt,
              reason: finalReason,
            },
            createdAt: cancelledAt,
            status: "queued",
          };

          await setFirestoreDoc(
            projectId,
            "mail",
            mailDocId,
            mailPayload,
            apiKey,
            firestoreToken
          );
        }

        return jsonResponse(request, {
          success: true,
          orderId,
          status: "Cancelled",
          cancelledAt,
        });
      } catch (cancelErr: any) {
        console.error("[orders] Cancellation error:", cancelErr);
        return jsonResponse(
          request,
          {
            success: false,
            error: cancelErr?.message || "Failed to cancel order.",
          },
          500
        );
      }
    }

    // ------------------------------------------------------------------------
    // SERVER-CONTROLLED EMAIL DISPATCH (POST /api/mail/send)
    // ------------------------------------------------------------------------
    if (request.method === "POST" && pathname === "/api/mail/send") {
      let authUser: AuthenticatedUser;
      let adminToken: string;
      try {
        authUser = await authenticateFirebaseUser(request);
      } catch (authErr: any) {
        return jsonResponse(
          request,
          {
            success: false,
            error: `Authentication required: ${authErr?.message || "Missing or invalid token."}`,
          },
          401
        );
      }

      try {
        adminToken = await getPrivilegedFirestoreAccessToken(env);
      } catch (tokenErr: any) {
        console.error("[mail] Service account token error:", tokenErr?.message);
        return jsonResponse(
          request,
          { success: false, error: "Server configuration error." },
          500
        );
      }

      const uid = authUser.uid;

      try {
        const body: any = await request.json();
        const { targetId, eventType, data = {} } = body || {};

        if (!targetId || typeof targetId !== "string" || !eventType) {
          return jsonResponse(
            request,
            { success: false, error: "targetId and eventType are required." },
            400
          );
        }

        if (!/^[A-Za-z0-9_-]+$/.test(targetId)) {
          return jsonResponse(
            request,
            { success: false, error: "Invalid targetId format. Must match ^[A-Za-z0-9_-]+$." },
            400
          );
        }

        // Caller must either be an admin or the owner of the target document
        let userRole = "customer";
        try {
          const userDoc = await getFirestoreDoc(projectId, "users", uid, apiKey, adminToken);
          if (userDoc?.role === "admin") {
            userRole = "admin";
          }
        } catch (e) {
          console.warn("[mail] Could not look up user role, assuming customer:", e);
        }

        const isAdmin = userRole === "admin";

        let recipientEmail = "";
        let recipientName = "Customer";
        let mailSubject = "";
        let mailHtml = "";
        let mailText = "";
        let mailDocId = "";

        const emailHeaderHtml = `
          <div style="background-color: #0c0a09; padding: 24px; text-align: center; border-top-left-radius: 12px; border-top-right-radius: 12px;">
            <h1 style="color: #ff4d00; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
              SHILP SAHAYAK
            </h1>
            <p style="color: #a8a29e; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-family: monospace;">
              3D Fabrication & Precision Prototyping Studio
            </p>
          </div>
        `;

        const emailFooterHtml = `
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

        if (eventType === "quote_ready" || eventType === "quote_received") {
          const quoteDoc = await getFirestoreDoc(projectId, "quotes", targetId, apiKey, adminToken);
          if (!quoteDoc) {
            return jsonResponse(request, { success: false, error: "Quote not found." }, 404);
          }

          if (eventType === "quote_ready" && !isAdmin) {
            return jsonResponse(request, { success: false, error: "Only admins can send quote_ready notifications." }, 403);
          }

          if (eventType === "quote_ready") {
            const actualQuoteStatus = String(quoteDoc.status || "").toLowerCase();
            if (actualQuoteStatus !== "quoted" && actualQuoteStatus !== "ready") {
              return jsonResponse(
                request,
                { success: false, error: `Cannot send quote_ready email for quote with status "${quoteDoc.status}". Expected "Quoted" or "Ready".` },
                400
              );
            }
            recipientEmail = quoteDoc.customerEmail;
            recipientName = quoteDoc.customerName || "Creator";
          } else {
            // quote_received (customer-triggered): require verified email from Firebase auth token
            if (quoteDoc.customerId && quoteDoc.customerId !== uid && !isAdmin) {
              return jsonResponse(request, { success: false, error: "Unauthorized access to quote." }, 403);
            }
            if (!authUser.email || !authUser.emailVerified) {
              return jsonResponse(
                request,
                { success: false, error: "Verified email address is required in your authentication token to dispatch quote emails." },
                403
              );
            }
            recipientEmail = authUser.email;
            recipientName = quoteDoc.customerName || "Creator";
          }

          if (!recipientEmail || !recipientEmail.includes("@")) {
            return jsonResponse(request, { success: false, error: "Target quote does not have a valid customer email." }, 400);
          }

          const shortId = targetId.slice(0, 8).toUpperCase();
          const safeCustomerName = escapeHtml(recipientName);
          const safeFileName = escapeHtml(quoteDoc.fileName || "Uploaded Model");

          if (eventType === "quote_ready") {
            const price = Number(data.price ?? quoteDoc.adminPrice ?? 0);
            const expiresAt = data.expiresAt || quoteDoc.expiresAt;
            const expiryFormatted = expiresAt
              ? new Date(expiresAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "7 Days";

            mailDocId = `mail_quote_ready_${targetId}_${price}`;
            mailSubject = `Your 3D Print Quote #${shortId} is Ready — ₹${price.toLocaleString("en-IN")}`;
            mailText = `Hello ${safeCustomerName}, your custom 3D quote for ${safeFileName} is ready: ₹${price.toLocaleString("en-IN")}. Offer valid until ${expiryFormatted}. View your quote: https://shilpsahayak.in/account`;
            mailHtml = `
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
                ${emailHeaderHtml}
                <div style="padding: 32px 24px;">
                  <div style="display: inline-block; background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase;">
                    CAD Quotation Ready
                  </div>
                  <h2 style="font-size: 20px; font-weight: 700; margin: 12px 0 8px 0; color: #0c0a09;">
                    Hello ${safeCustomerName}, your custom 3D quote is ready!
                  </h2>
                  <p style="font-size: 14px; line-height: 1.5; color: #57534e; margin: 0 0 24px 0;">
                    Our workshop engineers have inspected your 3D CAD model <strong>"${safeFileName}"</strong> and prepared your official quotation.
                  </p>
                  <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 11px; font-family: monospace; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Quoted Fabrication Price
                    </span>
                    <div style="font-size: 32px; font-weight: 800; color: #ea580c; margin: 6px 0;">
                      ₹${price.toLocaleString("en-IN")}
                    </div>
                    <div style="font-size: 12px; color: #b45309; font-weight: 600;">
                      ⏳ Offer valid until: <strong>${escapeHtml(expiryFormatted)}</strong>
                    </div>
                  </div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 28px;">
                    <tr style="border-bottom: 1px solid #f5f5f4;">
                      <td style="padding: 8px 0; color: #78716c; font-family: monospace;">Model File:</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0c0a09;">${safeFileName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f5f5f4;">
                      <td style="padding: 8px 0; color: #78716c; font-family: monospace;">Material &amp; Color:</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0c0a09;">${escapeHtml(quoteDoc.material || "PLA")} (${escapeHtml(quoteDoc.color || "Standard")})</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f5f5f4;">
                      <td style="padding: 8px 0; color: #78716c; font-family: monospace;">Quantity:</td>
                      <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #0c0a09;">${Number(quoteDoc.quantity || 1)} unit(s)</td>
                    </tr>
                  </table>
                  <div style="text-align: center; margin-bottom: 24px;">
                    <a href="https://shilpsahayak.in/account" style="display: inline-block; background-color: #ff4d00; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Review &amp; Accept Quote ➔
                    </a>
                  </div>
                </div>
                ${emailFooterHtml}
              </div>
            `;
          } else {
            // quote_received
            const safeNotes = escapeHtml(data.notes || quoteDoc.notes || "");
            mailDocId = `mail_quote_received_${targetId}`;
            mailSubject = `Quote Request #${shortId} Received — Shilp Sahayak`;
            mailText = `Hi ${safeCustomerName}, we received your custom 3D printing quote request #${shortId}. Our engineering team will review your model and send you a quote within 48 hours.`;
            mailHtml = `
              <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 12px; overflow: hidden; border: 1px solid #e7e5e4;">
                ${emailHeaderHtml}
                <div style="padding: 32px 24px; background: #ffffff;">
                  <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1c1917;">
                    Quote Request Received ✓
                  </h2>
                  <p style="color: #44403c; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hi ${safeCustomerName},<br/><br/>
                    We have received your custom 3D printing quote request. Our engineering team will review your model and send you a detailed quotation within <strong>48 hours</strong>.
                  </p>
                  <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 20px; margin: 0 0 24px 0;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #78716c; font-family: monospace;">Request Summary</p>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #78716c; width: 140px;">Request ID</td>
                        <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #1c1917; font-family: monospace;">#${shortId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #78716c;">File</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #1c1917;">${safeFileName}</td>
                      </tr>
                      ${safeNotes ? `<tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #78716c; vertical-align: top;">Notes</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #1c1917;">${safeNotes}</td>
                      </tr>` : ""}
                    </table>
                  </div>
                  <div style="text-align: center;">
                    <a href="https://shilpsahayak.in/account" style="display: inline-block; background: #ff4d00; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-family: monospace; text-transform: uppercase;">
                      View My Requests
                    </a>
                  </div>
                </div>
                ${emailFooterHtml}
              </div>
            `;
          }
        } else if (eventType === "order_status" || eventType === "order_cancelled") {
          const orderDoc = await getFirestoreDoc(projectId, "orders", targetId, apiKey, adminToken);
          if (!orderDoc) {
            return jsonResponse(request, { success: false, error: "Order not found." }, 404);
          }

          if (eventType === "order_status" && !isAdmin) {
            return jsonResponse(request, { success: false, error: "Only admins can send order_status notifications." }, 403);
          }

          if (eventType === "order_cancelled" && orderDoc.customerId !== uid && !isAdmin) {
            return jsonResponse(request, { success: false, error: "Unauthorized access to order." }, 403);
          }

          if (eventType === "order_cancelled") {
            const actualStatus = String(orderDoc.status || "").toLowerCase();
            if (actualStatus !== "cancelled") {
              return jsonResponse(
                request,
                { success: false, error: `Cannot send order_cancelled email for order with status "${orderDoc.status}". Order must be Cancelled in database first.` },
                400
              );
            }
            // Customer-triggered cancellation: enforce email directly from verified token
            if (!authUser.email || !authUser.emailVerified) {
              return jsonResponse(
                request,
                { success: false, error: "Verified email address is required in your authentication token to dispatch cancellation emails." },
                403
              );
            }
            recipientEmail = authUser.email;
            recipientName = orderDoc.customerName || "Customer";
          } else {
            // order_status (admin-triggered): send to stored customer record email
            recipientEmail = orderDoc.customerEmail;
            recipientName = orderDoc.customerName || "Customer";
          }

          if (eventType === "order_status") {
            const expectedStatus = String(data.status || "").trim();
            const actualStatus = String(orderDoc.status || "").trim();
            if (expectedStatus && actualStatus.toLowerCase() !== expectedStatus.toLowerCase()) {
              return jsonResponse(
                request,
                { success: false, error: `Status mismatch: Requested email for status "${expectedStatus}", but order in database has status "${actualStatus}".` },
                400
              );
            }
          }

          if (!recipientEmail || !recipientEmail.includes("@")) {
            return jsonResponse(request, { success: false, error: "Target order does not have a valid customer email." }, 400);
          }

          const shortId = targetId.slice(0, 8).toUpperCase();
          const safeCustomerName = escapeHtml(recipientName);

          if (eventType === "order_status") {
            const status = String(data.status || orderDoc.status || "");
            const trackingNumber = data.trackingNumber || orderDoc.trackingNumber;
            const courierPartner = data.courierPartner || orderDoc.courierPartner;
            const safeStatus = escapeHtml(status);
            const safeTracking = trackingNumber ? escapeHtml(trackingNumber) : "";
            const safeCourier = courierPartner ? escapeHtml(courierPartner) : "";

            mailDocId = `mail_order_status_${targetId}_${status}`;
            mailSubject = `Update on Order #${shortId}: ${safeStatus} — Shilp Sahayak`;
            mailText = `Update on Order #${shortId}: Your order status has been updated to ${safeStatus}. Track online: https://shilpsahayak.in/account`;
            mailHtml = `
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
                ${emailHeaderHtml}
                <div style="padding: 32px 24px;">
                  <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 10px 0; color: #0c0a09;">
                    Order Status: ${safeStatus}
                  </h2>
                  <p style="font-size: 14px; line-height: 1.5; color: #57534e; margin: 0 0 20px 0;">
                    Hello ${safeCustomerName}, your order #${shortId} status has been updated to "${safeStatus}".
                  </p>
                  <div style="background-color: #f5f5f4; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
                    <div style="margin-bottom: 6px;"><strong>Order ID:</strong> #${shortId}</div>
                    <div><strong>Current Status:</strong> <span style="color: #ff4d00; font-weight: 700;">${safeStatus}</span></div>
                    ${safeTracking ? `<div style="margin-top: 6px;"><strong>Tracking AWB:</strong> <span style="font-family: monospace;">${safeTracking} (${safeCourier || "Courier"})</span></div>` : ""}
                  </div>
                  <div style="text-align: center; margin-bottom: 20px;">
                    <a href="https://shilpsahayak.in/account" style="display: inline-block; background-color: #ff4d00; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                      View Order in Account ➔
                    </a>
                  </div>
                </div>
                ${emailFooterHtml}
              </div>
            `;
          } else {
            // order_cancelled
            const reason = data.reason || "Cancelled as requested prior to production";
            const safeReason = escapeHtml(reason);
            const total = Number(orderDoc.total || 0);

            mailDocId = `mail_order_cancelled_${targetId}`;
            mailSubject = `Order Cancelled & Refund Initiated #${shortId} — Shilp Sahayak`;
            mailText = `Your order #${shortId} has been cancelled. A 100% refund of ₹${total.toLocaleString("en-IN")} will be credited within 2-3 business days.`;
            mailHtml = `
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
                ${emailHeaderHtml}
                <div style="padding: 32px 24px;">
                  <div style="display: inline-block; background-color: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase;">
                    Order Cancelled &amp; Refund Initiated
                  </div>
                  <h2 style="font-size: 20px; font-weight: 700; margin: 12px 0 8px 0; color: #0c0a09;">
                    Order #${shortId} has been cancelled
                  </h2>
                  <p style="font-size: 14px; line-height: 1.5; color: #57534e; margin: 0 0 20px 0;">
                    Hello ${safeCustomerName}, as requested, your order has been cancelled prior to 3D production.
                  </p>
                  <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 11px; font-family: monospace; color: #9a3412; font-weight: 700; text-transform: uppercase;">
                      100% Refund Amount
                    </span>
                    <div style="font-size: 28px; font-weight: 800; color: #ea580c; margin: 4px 0;">
                      ₹${total.toLocaleString("en-IN")}
                    </div>
                    <p style="font-size: 12px; color: #78716c; margin: 4px 0 0 0;">
                      Your refund will be credited to your original payment method within <strong>2–3 business days</strong>.
                    </p>
                  </div>
                  ${safeReason ? `<p style="font-size: 12px; color: #78716c;"><strong>Cancellation Reason:</strong> ${safeReason}</p>` : ""}
                </div>
                ${emailFooterHtml}
              </div>
            `;
          }
        } else {
          return jsonResponse(request, { success: false, error: `Unsupported eventType: "${eventType}".` }, 400);
        }

        const mailPayload = {
          to: [recipientEmail],
          message: {
            subject: mailSubject,
            html: mailHtml,
            text: mailText,
          },
          type: eventType,
          metadata: {
            targetId,
            eventType,
            triggeredBy: uid,
          },
          createdAt: new Date().toISOString(),
          status: "queued",
        };

        await setFirestoreDoc(
          projectId,
          "mail",
          mailDocId,
          mailPayload,
          apiKey,
          adminToken
        );

        return jsonResponse(request, {
          success: true,
          mailId: mailDocId,
        });
      } catch (err: any) {
        console.error("[mail] Dispatch error:", err);
        return jsonResponse(
          request,
          { success: false, error: err?.message || "Failed to dispatch email." },
          500
        );
      }
    }

    // ------------------------------------------------------------------------
    // NOT FOUND
    // ------------------------------------------------------------------------
    return jsonResponse(
      request,
      { success: false, error: "Endpoint not found." },
      404
    );
  },
} satisfies ExportedHandler<Env>;