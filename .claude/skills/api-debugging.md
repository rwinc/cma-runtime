# API Debugging

Common issues and fixes for Cloudflare Workers API integration.

## Quick Checks

Before debugging frontend API issues:

```bash
# 1. Verify API is responding
curl -s 'https://[PROJECT]-api-qa.richwood.workers.dev/api/health' | jq

# 2. Check actual response structure
curl -s 'https://[PROJECT]-api-qa.richwood.workers.dev/api/[ENDPOINT]' | jq 'keys'

# 3. Check a specific object's data shape
curl -s 'https://[PROJECT]-api-qa.richwood.workers.dev/api/[ENDPOINT]' | jq '.[0] | keys'
```

## Common Issues

### 1. 404 Errors

**Symptom**: Frontend gets 404 for API calls

**Check**: Does frontend path include `/api` prefix?

```typescript
// WRONG - missing /api prefix
const API_BASE = 'https://[PROJECT]-api-qa.richwood.workers.dev';
api.get('/resource'); // calls /resource

// CORRECT
const API_BASE = 'https://[PROJECT]-api-qa.richwood.workers.dev/api';
api.get('/resource'); // calls /api/resource
```

### 2. Type Mismatches

**Symptom**: `Cannot read properties of undefined`

**Root Cause**: API returns different field names than TypeScript types expect

**Check**: Compare API response to shared types:

```bash
# Get actual API field names
curl -s 'https://[PROJECT]-api-qa.richwood.workers.dev/api/[ENDPOINT]' | jq '.[0] | keys'
```

```typescript
// Check shared type definition
// packages/shared/src/types/index.ts
export interface Resource {
  id: string;      // NOT resourceId
  name: string;    // NOT resourceName
}
```

**Fix**: Update API to match shared types, or vice versa. Never let them drift.

### 3. Response Format Mismatch

**Symptom**: `Cannot read properties of undefined (reading 'code')`

**Root Cause**: Frontend expects envelope `{success, data}` but API returns raw data

**Check**: Does API wrap responses?

```bash
# Raw response (no envelope)
{"items": [...], "summary": {...}}

# Envelope response
{"success": true, "data": {"items": [...], "summary": {...}}}
```

**Fix**: Make handleResponse support both formats (see api.ts)

### 4. CORS Errors

**Symptom**: CORS policy errors in console

**Check**: Is origin in allowed list?

```typescript
// apps/api/src/middleware/cors.ts
const allowedOrigins = [
  'https://[PROJECT].richwood.com',
  'https://qa.[PROJECT].richwood.com',
  // ... Pages URLs, localhost
];
```

**Fix**: Add origin to the allowedOrigins array in the CORS middleware.

### 5. Wrong Error Code

**Symptom**: TypeScript error on `fail()` call -- code not assignable to `ApiErrorCode`

**Root Cause**: `ApiErrorCode` is a closed Zod enum. You used a code that doesn't exist.

**Common valid codes** (defined in shared schemas):
| Code | HTTP Status | When to Use |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Bad input from client |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `UNAUTHORIZED` | 401 | No auth credentials |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Missing binding (D1, KV, etc.) |

**Fix**: Use an existing code. If you truly need a new one, add it to `ApiErrorCodeSchema` in shared first.

### 6. `env.DB` Possibly Undefined in Helper Functions

**Symptom**: `TS18048: 'env.DB' is possibly 'undefined'` in functions called after middleware

**Root Cause**: Hono middleware (e.g., `requireDB`) guards the route and returns 503 if binding is missing. But TypeScript can't propagate that narrowing into downstream functions.

**Fix**: Use non-null assertion with a comment:
```typescript
async function queryData(env: Env) {
  const db = env.DB!; // Guarded by requireDB middleware
  const result = await db.prepare('...').all();
}
```

### 7. No Mock/Fake Data -- Ever

**Rule**: NEVER return hardcoded fake data from API endpoints.

**When bindings are missing**: Return `fail(c, 'SERVICE_UNAVAILABLE', 'DB not configured', 503)`
**When upstream API fails**: Return `fail(c, '[SERVICE]_ERROR', 'Failed to fetch from [service]', 502)`

Frontend pages should handle errors via TanStack Query (`error` / `isError` destructuring + error UI).

## Error Handling Chain

```
API: fail(c, code, message, status)
  -> Response: { success: false, error: { code, message } }
    -> api.ts: throws ApiError(code, message, status)
      -> TanStack Query: exposes via error/isError
        -> Page: renders error UI + error.message
```

Mutations use `toast.error(apiError.userMessage)` via Sonner.

### 8. Sync Function Defined But Never Called

**Symptom**: A table is empty even though the function to populate it exists.

**Root Cause**: Function was created in a service file but never wired into the sync entry point.

**Fix**: Always verify new sync functions are called in the main sync orchestrator.

**Prevention**: After writing any new sync processing function, grep for its name in the sync entry point to confirm it's wired in.

## Prevention Checklist

1. Before writing frontend API calls, verify route exists with curl
2. When adding new types, update both shared types AND API response
3. After API changes, run `npm run typecheck` across all workspaces
4. Test API manually before deploying frontend changes
5. NEVER add mock data fallbacks -- return proper error responses
6. Check `ApiErrorCodeSchema` before using error codes in `fail()`
