---
description: Security headers, CORS allowlist, and rate limiting middleware for Cloudflare Workers. Use when creating new Workers, adding middleware, or handling CORS/security.
globs: ["**/src/index.ts", "**/src/middleware/**", "**/wrangler.toml"]
---

# Security Middleware Patterns

## Security Headers (Required on Every Worker)

Add to the app-level middleware chain — runs on all responses.

```typescript
// middleware/securityHeaders.ts
import { createMiddleware } from "hono/factory";

export const securityHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=()",
  );
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'",
  );
});

// Apply at app level
app.use("*", securityHeaders);
```

## CORS Origin Allowlist

Never use `*` for `Access-Control-Allow-Origin` when `credentials: true`.

```typescript
import { cors } from "hono/cors";

const ALLOWED_ORIGINS = [
  "https://APPNAME.richwood.com",
  "https://qa.APPNAME.richwood.com",
  "https://dev.APPNAME.richwood.com",
];

// Include localhost only in non-production
if (process.env.ENVIRONMENT !== "production") {
  ALLOWED_ORIGINS.push("http://localhost:5173");
}

app.use(
  "*",
  cors({
    origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : ""),
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key"],
  }),
);
```

## CSRF Prevention

Richwood Workers are protected by three layers — no separate CSRF token needed:

1. **CF Access JWT** — every request to a protected app passes through CF Access
2. **CORS origin validation** — rejects cross-origin requests from unknown origins
3. **SameSite cookies** — if setting cookies, use `SameSite=Lax` minimum

## Rate Limiting (KV-Backed)

Standard pattern for application-level rate limiting. Reference implementation: Vault.

```typescript
// middleware/rateLimit.ts
import { createMiddleware } from "hono/factory";

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  category: string;
}

export function rateLimit(config: RateLimitConfig) {
  return createMiddleware(async (c, next) => {
    const userId = c.get("userId");
    if (!userId) {
      await next();
      return;
    }

    const windowMinute = Math.floor(Date.now() / 1000 / config.windowSeconds);
    const key = `ratelimit:${userId}:${config.category}:${windowMinute}`;

    const current = parseInt((await c.env.CACHE.get(key)) || "0");
    if (current >= config.limit) {
      c.header("Retry-After", String(config.windowSeconds));
      return c.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        429,
      );
    }

    await c.env.CACHE.put(key, String(current + 1), {
      expirationTtl: config.windowSeconds * 2,
    });

    await next();
  });
}
```

Standard limits:

| Endpoint Type   | Limit        | Window   |
| --------------- | ------------ | -------- |
| Auth-related    | 10 requests  | 1 hour   |
| Write mutations | 60 requests  | 1 minute |
| Read endpoints  | 300 requests | 1 minute |

## Middleware Chain Order

Always compose in this order:

```
securityHeaders → cors → requireAuth → requireMembership → requirePermission → withIdempotency → handler
```

Not every route needs every layer, but the order must not vary.
