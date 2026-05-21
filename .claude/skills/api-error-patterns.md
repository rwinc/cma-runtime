---
description: Standard API error envelope, apiError() utility, production error stripping, and requestId correlation. Use when writing route handlers, error handling, or API responses.
globs: ["**/src/routes/**", "**/src/utils/**", "**/src/index.ts"]
---

# API Error and Response Patterns

## Response Envelopes

All API endpoints use consistent response shapes.

### Success Responses

```typescript
// Single resource — wrap in named key
return c.json({ account: { id: "...", name: "Acme Corp" } });

// Collection — wrap in named key with pagination
return c.json({ accounts: [...], total: 142, limit: 25, offset: 0 });

// Mutation confirmation — no resource to return
return c.json({ ok: true });
```

Never return a bare object or bare array. Always wrap.

### Error Responses

```typescript
// Standard error envelope
return c.json(
  {
    error: {
      code: "ACCOUNT_NOT_FOUND",
      message: "Account not found",
      requestId: c.req.header("cf-ray") || "unknown",
    },
  },
  404,
);

// Validation error with field details
return c.json(
  {
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: {
        field_errors: [
          { field: "email", message: "Invalid email format" },
          { field: "amount", message: "Must be greater than 0" },
        ],
      },
      requestId: c.req.header("cf-ray") || "unknown",
    },
  },
  400,
);
```

## apiError() Utility

Every project should have a centralized error utility:

```typescript
// utils/apiError.ts
import type { Context } from "hono";

interface ApiErrorOptions {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export function apiError(c: Context, opts: ApiErrorOptions) {
  const requestId = c.req.header("cf-ray") || "unknown";
  return c.json(
    {
      error: {
        code: opts.code,
        message: opts.message,
        requestId,
        ...(opts.details && { details: opts.details }),
      },
    },
    opts.status as any,
  );
}
```

### Usage

```typescript
import { apiError } from "../utils/apiError";

// 404
return apiError(c, {
  code: "ACCOUNT_NOT_FOUND",
  message: "Account not found",
  status: 404,
});

// 403
return apiError(c, {
  code: "FORBIDDEN",
  message: "Insufficient permissions",
  status: 403,
});

// 400 with validation details
return apiError(c, {
  code: "VALIDATION_ERROR",
  message: "Invalid request data",
  status: 400,
  details: { field_errors: errors },
});
```

## Standard Error Codes

Common codes across all Richwood projects:

| Code               | HTTP Status | Meaning                                |
| ------------------ | ----------- | -------------------------------------- |
| `UNAUTHORIZED`     | 401         | Missing or invalid authentication      |
| `FORBIDDEN`        | 403         | Authenticated but lacks permission     |
| `VALIDATION_ERROR` | 400         | Request failed input validation        |
| `RATE_LIMITED`     | 429         | Too many requests                      |
| `INTERNAL_ERROR`   | 500         | Server error                           |
| `CONFLICT`         | 409         | Duplicate or conflicting operation     |
| `NOT_FOUND`        | 404         | Generic (prefer domain-specific codes) |

Domain-specific codes use UPPER_SNAKE_CASE: `ACCOUNT_NOT_FOUND`, `FILE_TOO_LARGE`, `SCHEDULE_CONFLICT`, `SYNC_FAILED`.

## Production Error Stripping

500-level errors must NOT include stack traces in production. Include them in dev/QA for debugging.

```typescript
// Global error handler in index.ts
app.onError((err, c) => {
  const isProd = c.env.ENVIRONMENT === "production";

  console.error("Unhandled error:", {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    requestId: c.req.header("cf-ray"),
  });

  return apiError(c, {
    code: "INTERNAL_ERROR",
    message: isProd ? "An unexpected error occurred" : err.message,
    status: 500,
    details: isProd ? undefined : { stack: err.stack },
  });
});
```

## Validation with Zod

Parse request bodies with Zod and return structured validation errors:

```typescript
import { z } from "zod";
import { apiError } from "../utils/apiError";

const CreateAccountSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  facility_id: z.string().uuid(),
});

app.post("/api/accounts", requireAuth, async (c) => {
  const body = await c.req.json();
  const parsed = CreateAccountSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(c, {
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      status: 400,
      details: {
        field_errors: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
    });
  }

  // Use parsed.data — validated and typed
  const { name, email, facility_id } = parsed.data;
  // ...
});
```

## Idempotency

POST mutations should support `X-Idempotency-Key` to prevent duplicate operations:

```typescript
// middleware/idempotency.ts
import { createMiddleware } from "hono/factory";

export function withIdempotency(ttl = 300) {
  return createMiddleware(async (c, next) => {
    const key = c.req.header("X-Idempotency-Key");
    if (!key) {
      await next();
      return;
    }

    const userId = c.get("userId");
    const cacheKey = `idempotency:${userId}:${c.req.method}:${c.req.path}:${key}`;

    const cached = await c.env.CACHE.get(cacheKey, "json");
    if (cached) {
      return c.json(cached.body, cached.status);
    }

    await next();

    const body = await c.res.clone().json();
    await c.env.CACHE.put(
      cacheKey,
      JSON.stringify({
        body,
        status: c.res.status,
      }),
      { expirationTtl: ttl },
    );
  });
}

// Usage
app.post("/api/accounts", requireAuth, withIdempotency(), createAccountHandler);
```

## Caching Headers

Set `Cache-Control` based on endpoint type:

| Endpoint Type      | Header                                           | TTL    |
| ------------------ | ------------------------------------------------ | ------ |
| Public, immutable  | `public, immutable, max-age=31536000`            | 1 year |
| Public, dynamic    | `public, max-age=300, stale-while-revalidate=60` | 5 min  |
| Private user data  | `private, max-age=900`                           | 15 min |
| Mutations and auth | No cache header                                  | None   |
