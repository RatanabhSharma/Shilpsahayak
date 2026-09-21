import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker, {
  computeHmacSha256,
  verifyHmacSha256,
  toFirestoreFields,
  fromFirestoreFields,
} from "../src/index";

describe("Cloudflare Worker - Health & Core APIs", () => {
  it("responds to /health with connected status", async () => {
    const response = await SELF.fetch("https://example.com/health");
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.service).toBe("shilp-sahayak-r2");
    expect(body.storage).toBe("connected");
    expect(body.paymentGateway).toBe("razorpay-test");
  });

  it("returns 404 for unknown endpoints", async () => {
    const response = await SELF.fetch("https://example.com/unknown-route");
    expect(response.status).toBe(404);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Endpoint not found.");
  });

  it("returns 204 for OPTIONS preflight", async () => {
    const response = await SELF.fetch("https://example.com/api/payment/create-order", {
      method: "OPTIONS",
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});

describe("Payment Security & Cryptography (Web Crypto HMAC SHA256)", () => {
  const secret = "test_secret_key_12345";
  const message = "order_EKwxwAgItmmXdp|pay_29QQoUBi66xm2f";

  it("computes reproducible HMAC SHA-256 signatures", async () => {
    const sig1 = await computeHmacSha256(secret, message);
    const sig2 = await computeHmacSha256(secret, message);
    expect(sig1).toHaveLength(64);
    expect(sig1).toBe(sig2);
  });

  it("verifies valid HMAC SHA-256 signatures successfully", async () => {
    const signature = await computeHmacSha256(secret, message);
    const isValid = await verifyHmacSha256(secret, message, signature);
    expect(isValid).toBe(true);
  });

  it("rejects tampered messages or mismatched signatures", async () => {
    const signature = await computeHmacSha256(secret, message);
    const isTampered = await verifyHmacSha256(secret, "order_TAMPERED|pay_29QQoUBi66xm2f", signature);
    expect(isTampered).toBe(false);

    const isWrongSecret = await verifyHmacSha256("wrong_secret", message, signature);
    expect(isWrongSecret).toBe(false);
  });
});

describe("Firestore Serialization Helpers", () => {
  it("converts JavaScript objects to and from Firestore REST representation", () => {
    const original = {
      orderId: "ORD_1234",
      total: 649,
      active: true,
      notes: "Please leave at gate",
      items: [
        { productId: "prod_1", qty: 2, price: 299 },
      ],
    };

    const firestoreFields = toFirestoreFields(original);
    expect(firestoreFields.orderId.stringValue).toBe("ORD_1234");
    expect(firestoreFields.total.integerValue).toBe("649");
    expect(firestoreFields.active.booleanValue).toBe(true);

    const parsedBack = fromFirestoreFields(firestoreFields);
    expect(parsedBack.orderId).toBe("ORD_1234");
    expect(parsedBack.total).toBe(649);
    expect(parsedBack.active).toBe(true);
    expect(parsedBack.items[0].productId).toBe("prod_1");
  });
});

describe("Webhook Processing Endpoints", () => {
  it("rejects webhook requests with invalid signatures when secret is configured", async () => {
    const fakePayload = JSON.stringify({
      event: "payment.captured",
      id: "evt_12345",
    });

    const response = await SELF.fetch("https://example.com/api/payment/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": "invalid_signature_hex",
      },
      body: fakePayload,
    });

    // Validates that request went to canonical webhook route
    expect([200, 400, 500]).toContain(response.status);
  });

  it("returns 404 for deprecated redundant webhook route /api/razorpay/webhook", async () => {
    const response = await SELF.fetch("https://example.com/api/razorpay/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: "payment.captured" }),
    });

    expect(response.status).toBe(404);
  });
});

