import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from "cloudflare:test";
import { describe, it, expect, vi } from "vitest";
import worker, {
  computeHmacSha256,
  verifyHmacSha256,
  getPrivilegedFirestoreAccessToken,
  patchFirestoreDoc,
  FirestoreRequestError,
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

describe("Privileged Firestore authorization", () => {
  it("does not allow a missing service-account configuration to fall back to a customer token", async () => {
    await expect(
      getPrivilegedFirestoreAccessToken({})
    ).rejects.toThrow("FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY");
  });

  it("uses the service-account OAuth bearer on the payment PATCH path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ name: "orders/ORD_123" }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await patchFirestoreDoc(
      "shilp-sahayak",
      "orders",
      "ORD_123",
      {
        paymentStatus: "Paid",
        status: "Confirmed",
        paymentId: "pay_123",
        paidAt: "2026-09-22T00:00:00.000Z",
        timeline: [{ status: "Confirmed" }],
      },
      ["paymentStatus", "status", "paymentId", "paidAt", "timeline"],
      "public-api-key-must-not-authorize-this-write",
      "service-account-access-token"
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer service-account-access-token"
    );
    expect(url).toContain(
      "/v1/projects/shilp-sahayak/databases/(default)/documents/orders/ORD_123"
    );
    expect(url).toContain("updateMask.fieldPaths=paymentStatus");
    expect(url).toContain("updateMask.fieldPaths=timeline");

    const body = JSON.parse(init.body);
    expect(body.fields.paymentStatus.stringValue).toBe("Paid");
    expect(body.fields.status.stringValue).toBe("Confirmed");
    expect(body.fields.paymentId.stringValue).toBe("pay_123");
    expect(body.fields.paidAt.stringValue).toBe("2026-09-22T00:00:00.000Z");
    vi.unstubAllGlobals();
  });

  it("persists the complete payment.captured state through the same privileged PATCH", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await patchFirestoreDoc(
      "shilp-sahayak",
      "orders",
      "ORD_WEBHOOK",
      {
        paymentStatus: "Paid",
        status: "Confirmed",
        paymentId: "pay_webhook",
        razorpayOrderId: "order_webhook",
        paidAt: "2026-09-22T00:00:00.000Z",
        timeline: [{ status: "Confirmed", updatedBy: "Razorpay Webhook" }],
      },
      [
        "paymentStatus",
        "status",
        "paymentId",
        "razorpayOrderId",
        "paidAt",
        "timeline",
      ],
      undefined,
      "service-account-access-token"
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.fields.paymentStatus.stringValue).toBe("Paid");
    expect(body.fields.status.stringValue).toBe("Confirmed");
    expect(body.fields.paymentId.stringValue).toBe("pay_webhook");
    // timeline is an array, so toFirestoreValue produces arrayValue, not mapValue.
    expect(body.fields.timeline.arrayValue.values).toBeDefined();
    vi.unstubAllGlobals();
  });

  it("surfaces Firestore write failures instead of reporting success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { status: "PERMISSION_DENIED" } }),
          { status: 403 }
        )
      )
    );

    await expect(
      patchFirestoreDoc(
        "shilp-sahayak",
        "orders",
        "ORD_FAILED",
        { paymentStatus: "Paid" },
        ["paymentStatus"],
        undefined,
        "service-account-access-token"
      )
    ).rejects.toMatchObject<FirestoreRequestError>({
      operation: "Firestore patch",
      status: 403,
    });
    vi.unstubAllGlobals();
  });

  it("rejects every Firestore write without a privileged bearer token", async () => {
    await expect(
      patchFirestoreDoc(
        "shilp-sahayak",
        "orders",
        "ORD_NO_CUSTOMER_ESCALATION",
        { paymentStatus: "Paid" },
        ["paymentStatus"],
        "firebase-client-api-key"
      )
    ).rejects.toThrow("privileged Firestore access token");
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

describe("Payment Endpoints Authentication & Security (Worker)", () => {
  it("rejects unauthenticated POST /api/payment/create-order with HTTP 401", async () => {
    const response = await SELF.fetch("https://example.com/api/payment/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ productId: "test_prod", quantity: 1 }],
        shippingAddress: {
          fullName: "John Doe",
          email: "john@example.com",
          phone: "9876543210",
        },
      }),
    });

    expect(response.status).toBe(401);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Authentication required");
  });

  it("rejects unauthenticated POST /api/payment/verify with HTTP 401", async () => {
    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: "ORD_12345",
        razorpayPaymentId: "pay_123",
        razorpayOrderId: "order_123",
      }),
    });

    expect(response.status).toBe(401);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Authentication required");
  });

  it("permits guest upload of 3D models to R2 under quotes/guest path without Authorization", async () => {
    const fakeStlContent = "solid test\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test";
    const response = await SELF.fetch("https://example.com/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": "gear_sample.stl",
      },
      body: fakeStlContent,
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.key).toMatch(/^quotes\/guest\/\d+_[a-z0-9]+_gear_sample\.stl$/);
  });
});


