import os

with open("shilp-sahayak-r2/src/index.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Add RATE_LIMITER to Env
if "RATE_LIMITER: KVNamespace;" not in content:
    content = content.replace("STORAGE: R2Bucket;", "STORAGE: R2Bucket;\n  RATE_LIMITER: KVNamespace;")

# Add rate limit helper
helper = """
async function checkRateLimit(
  env: Env,
  ip: string,
  action: string,
  maxRequests: number,
  ttlSeconds: number = 3600
): Promise<boolean> {
  const currentHour = Math.floor(Date.now() / (1000 * ttlSeconds)); // Epoch hour
  const key = `ratelimit:${action}:${ip}:${currentHour}`;

  const currentCount = await env.RATE_LIMITER.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  if (count >= maxRequests) {
    return false; // Rate limited
  }

  // Increment the count (this is subject to race conditions but sufficient for soft rate limiting)
  await env.RATE_LIMITER.put(key, (count + 1).toString(), {
    expirationTtl: ttlSeconds, // Store for an hour
  });

  return true;
}
"""

if "checkRateLimit" not in content:
    # Insert before getCorsHeaders
    content = content.replace("function getCorsHeaders", helper + "\nfunction getCorsHeaders")


# Insert rate limiter for /api/contact
contact_logic = """
        const ip = request.headers.get("cf-connecting-ip") || "unknown";
        const allowed = await checkRateLimit(env, ip, "contact", 3); // 3 per hour
        if (!allowed) {
          return jsonResponse(request, { success: false, error: "Too many requests. Please try again later." }, 429);
        }
"""
if "const ip = request.headers.get(\"cf-connecting-ip\") || \"unknown\";" not in content:
    content = content.replace("if (request.method === \"POST\" && pathname === \"/api/contact\") {\n      try {", "if (request.method === \"POST\" && pathname === \"/api/contact\") {\n      try {" + contact_logic)


# Insert rate limiter for /api/payment/create-order
payment_logic = """
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const allowed = await checkRateLimit(env, ip, "create_order", 20); // 20 per hour
      if (!allowed) {
        return jsonResponse(request, { success: false, error: "Too many requests. Please try again later." }, 429);
      }
"""
if "const allowed = await checkRateLimit(env, ip, \"create_order\", 20);" not in content:
    content = content.replace("if (\n      request.method === \"POST\" &&\n      pathname === \"/api/payment/create-order\"\n    ) {\n      let authUser;", "if (\n      request.method === \"POST\" &&\n      pathname === \"/api/payment/create-order\"\n    ) {" + payment_logic + "\n      let authUser;")

with open("shilp-sahayak-r2/src/index.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched index.ts")
