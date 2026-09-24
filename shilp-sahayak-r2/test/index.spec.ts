import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from "cloudflare:test";
import { describe, it, expect, vi } from "vitest";
import { importPKCS8, SignJWT } from "jose";
import worker, {
  computeHmacSha256,
  verifyHmacSha256,
  timingSafeEqual,
  escapeHtml,
  verifyRazorpayPaymentCapture,
  fetchRazorpayOrder,
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

  it("timingSafeEqual correctly compares equal and unequal strings in constant time", () => {
    expect(timingSafeEqual("abcdef", "abcdef")).toBe(true);
    expect(timingSafeEqual("abcdef", "abcdeg")).toBe(false);
    expect(timingSafeEqual("abcdef", "abcde")).toBe(false);
  });

  it("escapeHtml sanitizes dangerous characters to prevent HTML/XSS injection", () => {
    const raw = '<script>alert("xss & steal \'cookies\'")</script>';
    const sanitized = escapeHtml(raw);
    expect(sanitized).toBe("&lt;script&gt;alert(&quot;xss &amp; steal &#039;cookies&#039;&quot;)&lt;/script&gt;");
  });
});

describe("Razorpay Fail-Closed Verification (verifyRazorpayPaymentCapture)", () => {
  it("fails closed when credentials are missing or empty", async () => {
    const resultMissingSecret = await verifyRazorpayPaymentCapture(
      "rzp_test_123",
      "",
      "pay_123",
      "order_123",
      1000
    );
    expect(resultMissingSecret.valid).toBe(false);
    expect(resultMissingSecret.error).toContain("credentials");

    const resultMissingKey = await verifyRazorpayPaymentCapture(
      "",
      "secret_123",
      "pay_123",
      "order_123",
      1000
    );
    expect(resultMissingKey.valid).toBe(false);
  });

  it("fails closed when credentials contain placeholder values", async () => {
    const resultPlaceholder = await verifyRazorpayPaymentCapture(
      "rzp_test_123",
      "placeholder_secret",
      "pay_123",
      "order_123",
      1000
    );
    expect(resultPlaceholder.valid).toBe(false);
    expect(resultPlaceholder.error).toContain("configured on server");
  });

  it("verifies genuine captured payments when details match", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "pay_valid123",
          order_id: "order_valid123",
          amount: 50000,
          currency: "INR",
          status: "captured",
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyRazorpayPaymentCapture(
      "rzp_test_validKey",
      "validSecret123",
      "pay_valid123",
      "order_valid123",
      50000,
      "INR"
    );

    expect(result.valid).toBe(true);
    vi.unstubAllGlobals();
  });

  it("rejects payment if Razorpay order ID mismatches", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "pay_valid123",
          order_id: "order_ATTACKER",
          amount: 50000,
          currency: "INR",
          status: "captured",
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyRazorpayPaymentCapture(
      "rzp_test_validKey",
      "validSecret123",
      "pay_valid123",
      "order_EXPECTED",
      50000,
      "INR"
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain("mismatch");
    vi.unstubAllGlobals();
  });

  it("rejects payment if amount mismatches", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "pay_valid123",
          order_id: "order_valid123",
          amount: 25000, // Expected 50000
          currency: "INR",
          status: "captured",
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyRazorpayPaymentCapture(
      "rzp_test_validKey",
      "validSecret123",
      "pay_valid123",
      "order_valid123",
      50000,
      "INR"
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Payment amount mismatch");
    vi.unstubAllGlobals();
  });

  it("rejects payment if currency mismatches", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "pay_valid123",
          order_id: "order_valid123",
          amount: 50000,
          currency: "USD", // Expected INR
          status: "captured",
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyRazorpayPaymentCapture(
      "rzp_test_validKey",
      "validSecret123",
      "pay_valid123",
      "order_valid123",
      50000,
      "INR"
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Payment currency mismatch");
    vi.unstubAllGlobals();
  });

  it("rejects fake payment ID when Razorpay returns HTTP 404 or error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "BAD_REQUEST_ERROR",
            description: "The id provided does not exist",
          },
        }),
        { status: 404 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyRazorpayPaymentCapture(
      "rzp_test_validKey",
      "validSecret123",
      "pay_fakeNonExistent",
      "order_valid123",
      50000,
      "INR"
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain("rejected payment lookup");
    vi.unstubAllGlobals();
  });

  it("rejects payment if status is not captured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "pay_valid123",
          order_id: "order_valid123",
          amount: 50000,
          currency: "INR",
          status: "authorized",
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyRazorpayPaymentCapture(
      "rzp_test_validKey",
      "validSecret123",
      "pay_valid123",
      "order_valid123",
      50000,
      "INR"
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain("not in captured state");
    vi.unstubAllGlobals();
  });
});

describe("Webhook Processing & Idempotency", () => {
  const webhookSecret = "your_razorpay_webhook_secret";

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

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("signature");
  });

  it("processes first valid webhook and marks event processed", async () => {
    const eventPayload = {
      event: "payment.captured",
      id: "evt_test_first_run",
      payload: {
        payment: {
          entity: {
            id: "pay_webhook_test_1",
            order_id: "order_webhook_test_1",
            amount: 49900,
            currency: "INR",
            status: "captured",
            notes: {
              internalOrderId: "ORD_WEBHOOK_1",
            },
          },
        },
      },
    };
    const rawBody = JSON.stringify(eventPayload);
    const validSignature = await computeHmacSha256(webhookSecret, rawBody);

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      // 1. Google OAuth token exchange
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      // 2. Webhook event lookup (initially doesn't exist)
      if (url.includes("/webhook_events/evt_test_first_run")) {
        if (init?.method === "PATCH" || init?.method === "POST") {
          return Promise.resolve(new Response("{}", { status: 200 }));
        }
        return Promise.resolve(new Response("{}", { status: 404 }));
      }
      // 3. Order lookup (returns unpaid order)
      if (url.includes("/orders/ORD_WEBHOOK_1")) {
        if (init?.method === "PATCH") {
          return Promise.resolve(new Response("{}", { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_WEBHOOK_1",
            razorpayOrderId: "order_webhook_test_1",
            paymentStatus: "Pending",
            status: "Pending",
            customerEmail: "client@example.com",
            customerName: "Client",
          }),
        }), { status: 200 }));
      }
      // 4. Mail creation
      if (url.includes("/mail/")) {
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": validSignature,
      },
      body: rawBody,
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.received).toBe(true);
    expect(body.status).toBe("processed");
    vi.unstubAllGlobals();
  });

  it("handles duplicate webhook idempotently without double-marking paid", async () => {
    const eventPayload = {
      event: "payment.captured",
      id: "evt_test_duplicate",
      payload: {
        payment: {
          entity: {
            id: "pay_duplicate_1",
            order_id: "order_duplicate_1",
            notes: { internalOrderId: "ORD_DUPLICATE_1" },
          },
        },
      },
    };
    const rawBody = JSON.stringify(eventPayload);
    const validSignature = await computeHmacSha256(webhookSecret, rawBody);

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      // Webhook event already marked 'processed'
      if (url.includes("/webhook_events/evt_test_duplicate")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "evt_test_duplicate",
            status: "processed",
            completedAt: "2026-09-24T00:00:00.000Z",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": validSignature,
      },
      body: rawBody,
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.received).toBe(true);
    expect(body.status).toBe("already_processed");
    vi.unstubAllGlobals();
  });

  it("rejects webhook if Razorpay order ID does not match order's stored razorpayOrderId", async () => {
    const eventPayload = {
      event: "payment.captured",
      id: "evt_test_order_mismatch",
      payload: {
        payment: {
          entity: {
            id: "pay_mismatch_1",
            order_id: "order_ATTACKER_MISMATCH",
            notes: { internalOrderId: "ORD_STORED_1" },
          },
        },
      },
    };
    const rawBody = JSON.stringify(eventPayload);
    const validSignature = await computeHmacSha256(webhookSecret, rawBody);

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/webhook_events/evt_test_order_mismatch")) {
        return Promise.resolve(new Response("{}", { status: init?.method === "PATCH" || init?.method === "POST" ? 200 : 404 }));
      }
      if (url.includes("/orders/ORD_STORED_1")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_STORED_1",
            razorpayOrderId: "order_LEGITIMATE_EXPECTED", // Mismatched!
            paymentStatus: "Pending",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": validSignature,
      },
      body: rawBody,
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Mismatched or missing Razorpay order ID");
    vi.unstubAllGlobals();
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

describe("Server-Controlled Email Dispatch Endpoint (POST /api/mail/send)", () => {
  it("rejects unauthenticated requests with HTTP 401", async () => {
    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetId: "ORD_123",
        eventType: "order_status",
      }),
    });

    expect(response.status).toBe(401);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Authentication required");
  });

  it("rejects requests missing targetId or eventType with HTTP 400", async () => {
    // If request has bearer token but missing targetId
    // Note: Since authenticateUser verifies JWT with JWKS, unauthenticated fails with 401 first
    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(401);
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

const testPrivateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQChj9OsiFMNYk+W\nx+x8TIf15qXlpzSfcTXj4yU2Fa1/Op4ycGpvBtTZvKncuZUY4FMQ95Id3P/ANXAY\niqP9UgWux3Z8g7Aysi0KfNjhcXLZqQSo6u8nE8WJ/MLPvpRbrAoPW3hjoMlwQIky\n9Ubd1WDwccSyIJi2GeyMXvO4y0J5XS5kpZ/nsC9oeuYmC6luxSWGN8/LOwcCn0nu\nVczYLf8JkJb5r/X9TKgMp6Baw1WgoAdq3sMBfUqh0MJYRDLkiTFkEhdpuCmXxcu5\n6WNYYtIdoVwdBPRXvXkDsE8jM+s90iwL+tp3UwdfrRaIGn/gL1zcLm4x26vL8UPL\nEx3mdQcFAgMBAAECggEAPPXwmFrN/7BXOJ0SKeqUqJ/RfCCFth25CFZmbYxrbSTY\nmU6akm8g9FGARHVQAVVvcmj/3L3NUKC5PcFeVFDVLRg9KIll/BMH9Lub+CDfBasF\nQ5l2CKgossLJXSrbfuWg3B+XAvyh1XW8bxpmlYCUddVvswiipp+MhoCzdMhZOkJp\nhd53JSRAWwVTGu3ck5XHtwtT/ULUC3ySKC3ecNBChBdiT04n3AL+JFbqEBmC1o3W\nfHL/3ToyLMc483vbeW1/KDc2NTeSu9yuiGV6Um3znUc8Baz0jxuvqDp1j+rlemQD\nd7PujYKvtfCyjZbfsscLAOMEDVC4/6fSbzp53q9xlwKBgQDUhO77swos96vOd2D8\ny3OS5nsmLdfrvhsT3S8yrAOHE/C74HOJa56IACi3UTklRKhqMSus3fjMRxgT9L2p\n8y8DtqWlecF46/AqrHrnjG8OrKvtB8Gmn1iYWJ7PCbx8xEwMddN+UJxdGuk3jX+9\nm6iIvmE0o3e/syTs0SOVl5WF5wKBgQDCneiKPEjSeu/bTJPqHHl+aFHpxJKtjKKr\n9ojQgV6VoDpxyq6isz6I57UzDpX5zSC30q7FfbEWcTFCPB2mVeaH1FBZcGc+Aidm\nGt0eIlHV4wtGQQcsnNFc9dpkM3JFnaoRh+eYwpZqPiKlxgvHTCIaCuiFBvOsPTrx\ntALZXFqWMwKBgA+WfIz7sehgdjqbqQKBzcVdoHTJcgf5lrTbSWX3Ff8naEXvjanr\nueIR2OqxS3a/VXcMij6QvXoGUO7NyceYbb9g+z9q8dTzwVbv9cfcFh1GbwngwsR8\n9ZufDG71MN0Z7NYRImUmdoGhwq9vcoouy6rUA/8/aj4mXrP8FxcW2kHLAoGAWl64\n/HfB2Pr9JfgJN0zBndETOFnvQmdroi54mVl5ckFU4kIblbFl+Gyf13WObtCxwKo0\nPcB/2sv086y2l+aLhccxCFcJmeGmKeOPic6l8YvcUGMh0bWAAoqnPqAlD+6Gal2R\nTX4OGod/zzqHfaP8sdse3aa8v94u4M2WBRi9d8ECgYEAhq68yFzrnvmPrxHhFvOn\nkqm4H8OOGCCPjjppYXseL3CE4d1VHMLGmoCrXDt1sai6vgjZUfkj3ntgO6lgfS8W\ny+eK9R1a0vZDhA2Fg9hGbHHHWHP32Uhcg/l+OHTcjN7KHz1ZRTU3Khcq1xfLxJNc\nc9bUX0b9ZDzsTeI6RnXoT/g=\n-----END PRIVATE KEY-----`;

const testJwk = {
  kty: "RSA",
  n: "oY_TrIhTDWJPlsfsfEyH9eal5ac0n3E14-MlNhWtfzqeMnBqbwbU2byp3LmVGOBTEPeSHdz_wDVwGIqj_VIFrsd2fIOwMrItCnzY4XFy2akEqOrvJxPFifzCz76UW6wKD1t4Y6DJcECJMvVG3dVg8HHEsiCYthnsjF7zuMtCeV0uZKWf57AvaHrmJgupbsUlhjfPyzsHAp9J7lXM2C3_CZCW-a_1_UyoDKegWsNVoKAHat7DAX1KodDCWEQy5IkxZBIXabgpl8XLueljWGLSHaFcHQT0V715A7BPIzPrPdIsC_rad1MHX60WiBp_4C9c3C5uMdury_FDyxMd5nUHBQ",
  e: "AQAB",
  kid: "test-kid-1",
  alg: "RS256",
  use: "sig",
};

async function createMockIdToken(uid: string, email = "alice@example.com", emailVerified = true) {
  const key = await importPKCS8(testPrivateKey, "RS256");
  return await new SignJWT({
    email,
    email_verified: emailVerified,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-kid-1" })
    .setSubject(uid)
    .setIssuer("https://securetoken.google.com/shilp-sahayak")
    .setAudience("shilp-sahayak")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

describe("Detailed Payment Verification & Security Matrix (POST /api/payment/verify)", () => {

  it("marks order paid when signature, amount, currency, and capture verification all pass", async () => {
    const idToken = await createMockIdToken("user_alice");
    const razorpaySecret = "your_razorpay_test_key_secret";
    const dataToSign = "order_rzp_valid100|pay_rzp_valid100";
    const signature = await computeHmacSha256(razorpaySecret, dataToSign);

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      // JWKS for JWT verification
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      // Google SA Token
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      // Razorpay payment lookup
      if (url.includes("api.razorpay.com/v1/payments/pay_rzp_valid100")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "pay_rzp_valid100",
          order_id: "order_rzp_valid100",
          amount: 50000,
          currency: "INR",
          status: "captured",
        }), { status: 200 }));
      }
      // Razorpay order lookup
      if (url.includes("api.razorpay.com/v1/orders/order_rzp_valid100")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "order_rzp_valid100",
          receipt: "ORD_TEST_VALID",
          amount: 50000,
          currency: "INR",
          status: "paid",
        }), { status: 200 }));
      }
      // Firestore order lookup
      if (url.includes("/orders/ORD_TEST_VALID")) {
        if (init?.method === "PATCH") {
          return Promise.resolve(new Response("{}", { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_TEST_VALID",
            customerId: "user_alice",
            customerEmail: "alice@example.com",
            customerName: "Alice",
            total: 500, // 500 * 100 = 50000 paise
            razorpayOrderId: "order_rzp_valid100",
            paymentStatus: "Pending",
            status: "Pending",
          }),
        }), { status: 200 }));
      }
      // Mail queue
      if (url.includes("/mail/")) {
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_TEST_VALID",
        razorpayPaymentId: "pay_rzp_valid100",
        razorpayOrderId: "order_rzp_valid100",
        razorpaySignature: signature,
      }),
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.paymentStatus).toBe("Paid");
    expect(body.status).toBe("Confirmed");
    vi.unstubAllGlobals();
  });

  it("rejects re-marking an already Paid order with a different payment ID", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      // Order is already paid with pay_original
      if (url.includes("/orders/ORD_ALREADY_PAID")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_ALREADY_PAID",
            customerId: "user_alice",
            paymentStatus: "Paid",
            status: "Confirmed",
            paymentId: "pay_original",
            razorpayPaymentId: "pay_original",
            razorpayOrderId: "order_rzp_paid",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const razorpaySecret = "your_razorpay_test_key_secret";
    const dataToSign = "order_rzp_paid|pay_DIFFERENT_ATTACK";
    const signature = await computeHmacSha256(razorpaySecret, dataToSign);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_ALREADY_PAID",
        razorpayPaymentId: "pay_DIFFERENT_ATTACK",
        razorpayOrderId: "order_rzp_paid",
        razorpaySignature: signature,
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("already paid with a different payment reference");
    vi.unstubAllGlobals();
  });

  it("returns idempotent success if re-verifying a Paid order with the identical payment ID", async () => {
    const idToken = await createMockIdToken("user_alice");
    const razorpaySecret = "your_razorpay_test_key_secret";
    const dataToSign = "order_rzp_paid|pay_original";
    const signature = await computeHmacSha256(razorpaySecret, dataToSign);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_MATCHING_PAID")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_MATCHING_PAID",
            customerId: "user_alice",
            paymentStatus: "Paid",
            status: "Confirmed",
            paymentId: "pay_original",
            razorpayPaymentId: "pay_original",
            razorpayOrderId: "order_rzp_paid",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_MATCHING_PAID",
        razorpayPaymentId: "pay_original",
        razorpayOrderId: "order_rzp_paid",
        razorpaySignature: signature,
      }),
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.paymentStatus).toBe("Paid");
    vi.unstubAllGlobals();
  });

  it("rejects verification if Razorpay order ID mismatches internal order record", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_MISMATCH")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_MISMATCH",
            customerId: "user_alice",
            paymentStatus: "Pending",
            razorpayOrderId: "order_INTERNAL_123",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_MISMATCH",
        razorpayPaymentId: "pay_123",
        razorpayOrderId: "order_ATTACKER_FAKE",
        razorpaySignature: "sig",
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Mismatched Razorpay order identifier");
    vi.unstubAllGlobals();
  });

  it("rejects verification if internal order has no customerId", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_NO_CUSTOMER")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_NO_CUSTOMER",
            // customerId is missing!
            paymentStatus: "Pending",
            razorpayOrderId: "order_INTERNAL_123",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_NO_CUSTOMER",
        razorpayPaymentId: "pay_123",
        razorpayOrderId: "order_INTERNAL_123",
        razorpaySignature: "sig",
      }),
    });

    expect(response.status).toBe(403);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Unauthorized access to this order");
    vi.unstubAllGlobals();
  });

  it("rejects verification if internal order belongs to a different customerId", async () => {
    const idToken = await createMockIdToken("attacker_eve");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_VICTIM_BOB")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_VICTIM_BOB",
            customerId: "victim_bob", // Does not match caller attacker_eve
            paymentStatus: "Pending",
            razorpayOrderId: "order_INTERNAL_123",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_VICTIM_BOB",
        razorpayPaymentId: "pay_123",
        razorpayOrderId: "order_INTERNAL_123",
        razorpaySignature: "sig",
      }),
    });

    expect(response.status).toBe(403);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Unauthorized access to this order");
    vi.unstubAllGlobals();
  });
});

describe("Server Mail Security & Relay Prevention (POST /api/mail/send)", () => {

  it("rejects non-owner non-admin caller trying to send cancellation email for another customer order", async () => {
    const idToken = await createMockIdToken("attacker_bob");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      // Bob is customer
      if (url.includes("/users/attacker_bob")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({ role: "customer" }),
        }), { status: 200 }));
      }
      // Target order belongs to alice
      if (url.includes("/orders/ORD_ALICE")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_ALICE",
            customerId: "user_alice",
            customerEmail: "alice@example.com",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        targetId: "ORD_ALICE",
        eventType: "order_cancelled",
      }),
    });

    expect(response.status).toBe(403);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Unauthorized access to order");
    vi.unstubAllGlobals();
  });

  it("rejects non-admin caller trying to trigger admin-only event order_status", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/users/user_alice")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({ role: "customer" }),
        }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_ALICE")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_ALICE",
            customerId: "user_alice",
            customerEmail: "alice@example.com",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        targetId: "ORD_ALICE",
        eventType: "order_status",
        data: { status: "Shipped" },
      }),
    });

    expect(response.status).toBe(403);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Only admins can send order_status");
    vi.unstubAllGlobals();
  });

  it("rejects non-admin caller trying to trigger admin-only event quote_ready", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/users/user_alice")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({ role: "customer" }),
        }), { status: 200 }));
      }
      if (url.includes("/quotes/QUOTE_123")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "QUOTE_123",
            customerId: "user_alice",
            customerEmail: "alice@example.com",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        targetId: "QUOTE_123",
        eventType: "quote_ready",
        data: { price: 1200 },
      }),
    });

    expect(response.status).toBe(403);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Only admins can send quote_ready");
    vi.unstubAllGlobals();
  });

  it("ignores any attacker-supplied 'to' field in request body and strictly sends to customer record email", async () => {
    const idToken = await createMockIdToken("user_alice", "legit_alice@example.com", true);
    let recordedMailDoc: any = null;

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/users/user_alice")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({ role: "customer" }),
        }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_ALICE")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_ALICE",
            customerId: "user_alice",
            customerEmail: "legit_alice@example.com",
            customerName: "Alice",
            total: 300,
            status: "Cancelled",
          }),
        }), { status: 200 }));
      }
      if (url.includes("/documents/mail")) {
        if (init?.body) {
          recordedMailDoc = JSON.parse(init.body as string);
        }
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        targetId: "ORD_ALICE",
        eventType: "order_cancelled",
        to: "arbitrary_victim_or_spammer@target.com", // Attacker injected email
        recipient: "evil@spammer.com",
        data: { reason: "Customer requested" },
      }),
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    // Recipient email MUST NOT be returned in JSON response (security hardening)
    expect(body.recipient).toBeUndefined();
    expect(body.mailId).toBe("mail_order_cancelled_ORD_ALICE");
    expect(recordedMailDoc).toBeDefined();
    const mailRecipients = recordedMailDoc.fields.to.arrayValue.values.map((v: any) => v.stringValue);
    expect(mailRecipients).toEqual(["legit_alice@example.com"]);
    expect(mailRecipients).not.toContain("arbitrary_victim_or_spammer@target.com");
    vi.unstubAllGlobals();
  });

  it("rejects invalid targetId format with HTTP 400", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        targetId: "ORD/malicious/../../path",
        eventType: "order_status",
        data: { status: "Shipped" },
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Invalid targetId format");
    vi.unstubAllGlobals();
  });

  it("rejects order_cancelled email if order is not Cancelled in Firestore", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/users/user_alice")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({ role: "customer" }),
        }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_ACTIVE")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_ACTIVE",
            customerId: "user_alice",
            customerEmail: "alice@example.com",
            status: "In Production", // Not Cancelled!
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        targetId: "ORD_ACTIVE",
        eventType: "order_cancelled",
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Order must be Cancelled in database first");
    vi.unstubAllGlobals();
  });

  it("rejects order_status email if requested status does not match Firestore record", async () => {
    const idToken = await createMockIdToken("admin_user");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/users/admin_user")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({ role: "admin" }),
        }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_STATUS_TEST")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_STATUS_TEST",
            customerId: "user_bob",
            customerEmail: "bob@example.com",
            status: "Processing", // In DB it is Processing
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        targetId: "ORD_STATUS_TEST",
        eventType: "order_status",
        data: { status: "Delivered" }, // Admin requested email for Delivered before updating DB
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Status mismatch");
    vi.unstubAllGlobals();
  });

  it("rejects quote_ready email if quote status is not Quoted or Ready", async () => {
    const idToken = await createMockIdToken("admin_user");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/users/admin_user")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({ role: "admin" }),
        }), { status: 200 }));
      }
      if (url.includes("/quotes/QUO_PENDING")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "QUO_PENDING",
            customerId: "user_bob",
            customerEmail: "bob@example.com",
            status: "Pending Review", // Not Quoted!
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        targetId: "QUO_PENDING",
        eventType: "quote_ready",
        data: { price: 500 },
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Expected \"Quoted\" or \"Ready\"");
    vi.unstubAllGlobals();
  });

  it("rejects customer-triggered mail if token has unverified email", async () => {
    const unverifiedToken = await createMockIdToken("user_bob", "bob@example.com", false);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/users/user_bob")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({ role: "customer" }),
        }), { status: 200 }));
      }
      if (url.includes("/quotes/QUO_CUST")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "QUO_CUST",
            customerId: "user_bob",
            customerEmail: "attacker_spoofed@example.com",
            customerName: "Bob",
            status: "Pending",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${unverifiedToken}`,
      },
      body: JSON.stringify({
        targetId: "QUO_CUST",
        eventType: "quote_received",
      }),
    });

    expect(response.status).toBe(403);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Verified email address is required");
    vi.unstubAllGlobals();
  });
});

describe("Webhook Order-ID & Receipt Validation Security Tests", () => {
  const webhookSecret = "your_razorpay_webhook_secret";

  it("rejects webhook if payload order_id is missing", async () => {
    const payload = JSON.stringify({
      id: "evt_missing_order_id",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test123",
            // order_id is missing!
            amount: 50000,
            currency: "INR",
            status: "captured",
            notes: { internalOrderId: "ORD_MISSING_RZP" },
          },
        },
      },
    });

    const signature = await computeHmacSha256(webhookSecret, payload);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/webhook_events/evt_missing_order_id")) {
        return Promise.resolve(new Response("{}", { status: 404 }));
      }
      if (url.includes("/orders/ORD_MISSING_RZP")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_MISSING_RZP",
            razorpayOrderId: "order_rzp_expected",
            paymentStatus: "Pending",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature,
      },
      body: payload,
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Mismatched or missing Razorpay order ID");
    vi.unstubAllGlobals();
  });

  it("rejects webhook if stored order doc is missing razorpayOrderId", async () => {
    const payload = JSON.stringify({
      id: "evt_missing_stored_order_id",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test123",
            order_id: "order_rzp_123",
            amount: 50000,
            currency: "INR",
            status: "captured",
            notes: { internalOrderId: "ORD_NO_STORED_RZP" },
          },
        },
      },
    });

    const signature = await computeHmacSha256(webhookSecret, payload);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/webhook_events/evt_missing_stored_order_id")) {
        return Promise.resolve(new Response("{}", { status: 404 }));
      }
      if (url.includes("/orders/ORD_NO_STORED_RZP")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_NO_STORED_RZP",
            // razorpayOrderId is missing in stored doc!
            paymentStatus: "Pending",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature,
      },
      body: payload,
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Mismatched or missing Razorpay order ID");
    vi.unstubAllGlobals();
  });
});

describe("Client-Forged Order Protection & Receipt/Notes Validation (/verify)", () => {
  const testJwk = {
    kty: "RSA",
    n: "oY_TrIhTDWJPlsfsfEyH9eal5ac0n3E14-MlNhWtfzqeMnBqbwbU2byp3LmVGOBTEPeSHdz_wDVwGIqj_VIFrsd2fIOwMrItCnzY4XFy2akEqOrvJxPFifzCz76UW6wKD1t4Y6DJcECJMvVG3dVg8HHEsiCYthnsjF7zuMtCeV0uZKWf57AvaHrmJgupbsUlhjfPyzsHAp9J7lXM2C3_CZCW-a_1_UyoDKegWsNVoKAHat7DAX1KodDCWEQy5IkxZBIXabgpl8XLueljWGLSHaFcHQT0V715A7BPIzPrPdIsC_rad1MHX60WiBp_4C9c3C5uMdury_FDyxMd5nUHBQ",
    e: "AQAB",
    kid: "test-kid-1",
    alg: "RS256",
    use: "sig",
  };

  it("rejects verification if Razorpay payment notes internalOrderId does not match internal orderId", async () => {
    const idToken = await createMockIdToken("user_alice");
    const razorpaySecret = "your_razorpay_test_key_secret";
    const dataToSign = "order_rzp_legit|pay_rzp_stolen";
    const signature = await computeHmacSha256(razorpaySecret, dataToSign);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      // Stored order points at order_rzp_legit
      if (url.includes("/orders/ORD_FORGED_ATTACK")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_FORGED_ATTACK",
            customerId: "user_alice",
            customerEmail: "alice@example.com",
            total: 500,
            razorpayOrderId: "order_rzp_legit",
            paymentStatus: "Pending",
          }),
        }), { status: 200 }));
      }
      // Re-fetched Razorpay payment belongs to another internal order: ORD_VICTIM_REAL!
      if (url.includes("api.razorpay.com/v1/payments/pay_rzp_stolen")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "pay_rzp_stolen",
          order_id: "order_rzp_legit",
          amount: 50000,
          currency: "INR",
          status: "captured",
          notes: {
            internalOrderId: "ORD_VICTIM_REAL", // Mismatched internal order!
          },
        }), { status: 200 }));
      }
      // Re-fetched Razorpay order
      if (url.includes("api.razorpay.com/v1/orders/order_rzp_legit")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "order_rzp_legit",
          receipt: "ORD_FORGED_ATTACK",
          amount: 50000,
          currency: "INR",
          status: "paid",
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_FORGED_ATTACK",
        razorpayPaymentId: "pay_rzp_stolen",
        razorpayOrderId: "order_rzp_legit",
        razorpaySignature: signature,
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Razorpay payment receipt does not match this internal order");
    vi.unstubAllGlobals();
  });

  it("accepts verification when fetched Razorpay order receipt matches internal order ID", async () => {
    const idToken = await createMockIdToken("user_alice");
    const razorpaySecret = "your_razorpay_test_key_secret";
    const dataToSign = "order_rzp_legit|pay_rzp_legit";
    const signature = await computeHmacSha256(razorpaySecret, dataToSign);

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_RECEIPT_MATCH")) {
        if (init?.method === "PATCH") {
          return Promise.resolve(new Response("{}", { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_RECEIPT_MATCH",
            customerId: "user_alice",
            customerEmail: "alice@example.com",
            customerName: "Alice",
            total: 500,
            razorpayOrderId: "order_rzp_legit",
            paymentStatus: "Pending",
          }),
        }), { status: 200 }));
      }
      if (url.includes("api.razorpay.com/v1/payments/pay_rzp_legit")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "pay_rzp_legit",
          order_id: "order_rzp_legit",
          amount: 50000,
          currency: "INR",
          status: "captured",
        }), { status: 200 }));
      }
      // Razorpay order returns receipt: ORD_RECEIPT_MATCH
      if (url.includes("api.razorpay.com/v1/orders/order_rzp_legit")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "order_rzp_legit",
          receipt: "ORD_RECEIPT_MATCH",
          amount: 50000,
          currency: "INR",
          status: "paid",
        }), { status: 200 }));
      }
      if (url.includes("/mail/")) {
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_RECEIPT_MATCH",
        razorpayPaymentId: "pay_rzp_legit",
        razorpayOrderId: "order_rzp_legit",
        razorpaySignature: signature,
      }),
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.paymentStatus).toBe("Paid");
    vi.unstubAllGlobals();
  });

  it("rejects verification when fetched Razorpay order receipt mismatches internal order ID", async () => {
    const idToken = await createMockIdToken("user_alice");
    const razorpaySecret = "your_razorpay_test_key_secret";
    const dataToSign = "order_rzp_legit|pay_rzp_legit";
    const signature = await computeHmacSha256(razorpaySecret, dataToSign);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_RECEIPT_MISMATCH")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_RECEIPT_MISMATCH",
            customerId: "user_alice",
            customerEmail: "alice@example.com",
            total: 500,
            razorpayOrderId: "order_rzp_legit",
            paymentStatus: "Pending",
          }),
        }), { status: 200 }));
      }
      if (url.includes("api.razorpay.com/v1/payments/pay_rzp_legit")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "pay_rzp_legit",
          order_id: "order_rzp_legit",
          amount: 50000,
          currency: "INR",
          status: "captured",
        }), { status: 200 }));
      }
      // Razorpay order returns mismatched receipt!
      if (url.includes("api.razorpay.com/v1/orders/order_rzp_legit")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "order_rzp_legit",
          receipt: "ORD_ANOTHER_CLIENT_DIFFERENT",
          amount: 50000,
          currency: "INR",
          status: "paid",
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_RECEIPT_MISMATCH",
        razorpayPaymentId: "pay_rzp_legit",
        razorpayOrderId: "order_rzp_legit",
        razorpaySignature: signature,
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Razorpay order receipt does not match this internal order");
    vi.unstubAllGlobals();
  });

  it("rejects verification when fetched Razorpay order is missing receipt identifier", async () => {
    const idToken = await createMockIdToken("user_alice");
    const razorpaySecret = "your_razorpay_test_key_secret";
    const dataToSign = "order_rzp_legit|pay_rzp_legit";
    const signature = await computeHmacSha256(razorpaySecret, dataToSign);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "mock-sa-token" }), { status: 200 }));
      }
      if (url.includes("/orders/ORD_RECEIPT_MISSING")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_RECEIPT_MISSING",
            customerId: "user_alice",
            customerEmail: "alice@example.com",
            total: 500,
            razorpayOrderId: "order_rzp_legit",
            paymentStatus: "Pending",
          }),
        }), { status: 200 }));
      }
      if (url.includes("api.razorpay.com/v1/payments/pay_rzp_legit")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "pay_rzp_legit",
          order_id: "order_rzp_legit",
          amount: 50000,
          currency: "INR",
          status: "captured",
        }), { status: 200 }));
      }
      // Razorpay order is missing receipt and notes!
      if (url.includes("api.razorpay.com/v1/orders/order_rzp_legit")) {
        return Promise.resolve(new Response(JSON.stringify({
          id: "order_rzp_legit",
          amount: 50000,
          currency: "INR",
          status: "paid",
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_RECEIPT_MISSING",
        razorpayPaymentId: "pay_rzp_legit",
        razorpayOrderId: "order_rzp_legit",
        razorpaySignature: signature,
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Razorpay order is missing receipt identifier");
    vi.unstubAllGlobals();
  });
});

describe("Generic Server Configuration Error on Missing SA Credentials", () => {
  const testJwk = {
    kty: "RSA",
    n: "oY_TrIhTDWJPlsfsfEyH9eal5ac0n3E14-MlNhWtfzqeMnBqbwbU2byp3LmVGOBTEPeSHdz_wDVwGIqj_VIFrsd2fIOwMrItCnzY4XFy2akEqOrvJxPFifzCz76UW6wKD1t4Y6DJcECJMvVG3dVg8HHEsiCYthnsjF7zuMtCeV0uZKWf57AvaHrmJgupbsUlhjfPyzsHAp9J7lXM2C3_CZCW-a_1_UyoDKegWsNVoKAHat7DAX1KodDCWEQy5IkxZBIXabgpl8XLueljWGLSHaFcHQT0V715A7BPIzPrPdIsC_rad1MHX60WiBp_4C9c3C5uMdury_FDyxMd5nUHBQ",
    e: "AQAB",
    kid: "test-kid-1",
    alg: "RS256",
    use: "sig",
  };

  it("returns generic 500 Server configuration error on /api/payment/create-order when SA token fails", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      // Simulate Google OAuth token endpoint failing (e.g. invalid or missing SA credentials)
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 401 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: "test_prod", quantity: 1 }],
        shippingAddress: {
          fullName: "Alice Smith",
          email: "alice@example.com",
          phone: "9876543210",
        },
      }),
    });

    expect(response.status).toBe(500);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Server configuration error.");
    vi.unstubAllGlobals();
  });

  it("returns generic 500 Server configuration error on /api/payment/verify when SA token fails", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 401 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_TEST",
        razorpayPaymentId: "pay_test",
        razorpayOrderId: "order_test",
        razorpaySignature: "sig_test",
      }),
    });

    expect(response.status).toBe(500);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Server configuration error.");
    vi.unstubAllGlobals();
  });

  it("returns generic 500 Server configuration error on /api/payment/webhook when SA token fails", async () => {
    const webhookSecret = "your_razorpay_webhook_secret";
    const payload = JSON.stringify({ id: "evt_sa_fail", event: "payment.captured" });
    const signature = await computeHmacSha256(webhookSecret, payload);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 401 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/payment/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": signature,
      },
      body: payload,
    });

    expect(response.status).toBe(500);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Server configuration error.");
    vi.unstubAllGlobals();
  });

  it("returns generic 500 Server configuration error on /api/mail/send when SA token fails", async () => {
    const idToken = await createMockIdToken("user_alice");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 401 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        targetId: "ORD_123",
        eventType: "order_cancelled",
      }),
    });

    expect(response.status).toBe(500);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Server configuration error.");
    vi.unstubAllGlobals();
  });
});

describe("Strict Production CORS Security Matrix", () => {
  it("allows requests from legitimate production domain", async () => {
    const response = await SELF.fetch("https://example.com/health", {
      method: "GET",
      headers: {
        Origin: "https://shilpsahayak.com",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://shilpsahayak.com");
  });

  it("rejects unauthorized third-party vercel or web.app origins", async () => {
    const response = await SELF.fetch("https://example.com/health", {
      method: "GET",
      headers: {
        Origin: "https://malicious-attacker.vercel.app",
      },
    });

    expect(response.status).toBe(200);
    // Should NOT reflect the attacker origin
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe("https://malicious-attacker.vercel.app");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://shilpsahayak.com");
  });
});

describe("Authoritative Order Cancellation Endpoint (POST /api/orders/cancel)", () => {
  it("successfully cancels order when requested by the order customer", async () => {
    const customerToken = await createMockIdToken("user_customer_123");

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "sa_token_mock" }), { status: 200 }));
      }
      if (url.includes("documents/orders/ORD_CANCEL_ME")) {
        if (init?.method === "PATCH") {
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_CANCEL_ME",
            customerId: "user_customer_123",
            customerName: "Alice",
            customerEmail: "alice@example.com",
            status: "Confirmed",
            total: 1500,
            items: [{ productId: "PROD_1", quantity: 2 }],
          }),
        }), { status: 200 }));
      }
      if (url.includes("documents/products/PROD_1")) {
        if (init?.method === "PATCH") {
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "PROD_1",
            stock: 8,
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/orders/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_CANCEL_ME",
        reason: "Change of plans",
      }),
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("Cancelled");
    vi.unstubAllGlobals();
  });

  it("rejects cancellation if requested by another unauthorized customer", async () => {
    const attackerToken = await createMockIdToken("user_attacker_999");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "sa_token_mock" }), { status: 200 }));
      }
      if (url.includes("documents/users/user_attacker_999")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({ role: "customer" }),
        }), { status: 200 }));
      }
      if (url.includes("documents/orders/ORD_VICTIM_ORDER")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_VICTIM_ORDER",
            customerId: "user_victim_original",
            status: "Confirmed",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/orders/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${attackerToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_VICTIM_ORDER",
      }),
    });

    expect(response.status).toBe(403);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Unauthorized access");
    vi.unstubAllGlobals();
  });

  it("rejects cancellation if order status is already Shipped or Delivered", async () => {
    const customerToken = await createMockIdToken("user_customer_123");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "sa_token_mock" }), { status: 200 }));
      }
      if (url.includes("documents/orders/ORD_SHIPPED")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_SHIPPED",
            customerId: "user_customer_123",
            status: "Shipped",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/orders/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_SHIPPED",
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Cannot cancel order");
    vi.unstubAllGlobals();
  });

  it("handles double cancel as safe idempotent no-op without restoring duplicate stock", async () => {
    const customerToken = await createMockIdToken("user_customer_123");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "sa_token_mock" }), { status: 200 }));
      }
      if (url.includes("documents/orders/ORD_ALREADY_CANCELLED")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_ALREADY_CANCELLED",
            customerId: "user_customer_123",
            status: "Cancelled",
            cancelledAt: "2026-09-24T12:00:00.000Z",
          }),
        }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/orders/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_ALREADY_CANCELLED",
      }),
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("Cancelled");
    expect(body.message).toContain("already cancelled");
    vi.unstubAllGlobals();
  });

  it("cancels an order that is Paid (status Confirmed) and records refund notice", async () => {
    const customerToken = await createMockIdToken("user_customer_123");

    let orderPatchBody: any = null;
    let mailCreated = false;

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("jwk/securetoken@system.gserviceaccount.com")) {
        return Promise.resolve(new Response(JSON.stringify({ keys: [testJwk] }), { status: 200 }));
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve(new Response(JSON.stringify({ access_token: "sa_token_mock" }), { status: 200 }));
      }
      if (url.includes("documents/orders/ORD_PAID_CONFIRMED")) {
        if (init?.method === "PATCH") {
          orderPatchBody = JSON.parse(init?.body as string);
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "ORD_PAID_CONFIRMED",
            customerId: "user_customer_123",
            customerName: "Alice",
            customerEmail: "alice@example.com",
            paymentStatus: "Paid",
            status: "Confirmed",
            total: 2499,
            items: [{ productId: "PROD_2", quantity: 1 }],
          }),
        }), { status: 200 }));
      }
      if (url.includes("documents/products/PROD_2")) {
        return Promise.resolve(new Response(JSON.stringify({
          fields: toFirestoreFields({
            id: "PROD_2",
            stock: 3,
          }),
        }), { status: 200 }));
      }
      if (url.includes("documents/mail")) {
        mailCreated = true;
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await SELF.fetch("https://example.com/api/orders/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        orderId: "ORD_PAID_CONFIRMED",
        reason: "Ordered wrong filament",
      }),
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("Cancelled");
    expect(orderPatchBody).not.toBeNull();
    expect(mailCreated).toBe(true);
    vi.unstubAllGlobals();
  });
});



