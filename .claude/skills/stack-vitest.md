# Vitest + Cloudflare Workers Testing — Correct Patterns

> TRIGGER: code references vitest, test files, or `@cloudflare/vitest-pool-workers`.
> Richwood baseline: vitest ^4.1.0 | @cloudflare/vitest-pool-workers ^0.13.0
> Do NOT generate Jest patterns. Do NOT mock D1, R2, or KV.

## Workers Backend Config

```ts
// vitest.config.ts
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./wrangler.toml",
      },
    }),
  ],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
```

### WRONG — Jest config or old Vitest patterns

```ts
// WRONG — Jest
module.exports = { testEnvironment: "miniflare" };

// WRONG — old vitest-pool-workers config (pre-v4)
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: true, // REMOVED in v4 migration
      },
    },
  },
});
```

## Accessing Bindings in Tests

```ts
import { env } from "cloudflare:workers";

// Declare your bindings
declare module "cloudflare:workers" {
  interface ProvidedEnv {
    DB: D1Database;
    MY_KV: KVNamespace;
    MY_BUCKET: R2Bucket;
    ENVIRONMENT: string;
  }
}

describe("KV operations", () => {
  it("stores and retrieves values", async () => {
    await env.MY_KV.put("key", "value");
    const result = await env.MY_KV.get("key");
    expect(result).toBe("value");
  });
});
```

### WRONG — Mock bindings

```ts
// WRONG — Do NOT mock D1/R2/KV
const mockDB = { prepare: vi.fn().mockReturnValue({ all: vi.fn() }) };

// WRONG — Manual miniflare setup
const mf = new Miniflare({ d1Databases: ["DB"] });
```

The `@cloudflare/vitest-pool-workers` provides real local instances. Mocking hides real bugs.

## D1 Testing with Migrations

```ts
// vitest.config.ts
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations("./migrations");
      return {
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
        },
      };
    }),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
```

```ts
// test/apply-migrations.ts
import { applyD1Migrations, env } from "cloudflare:workers";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
```

## Testing Hono Handlers

```ts
import { env } from "cloudflare:workers";
import app from "../src/index";

describe("API routes", () => {
  it("returns users", async () => {
    // Seed test data
    await env.DB.prepare("INSERT INTO users (id, name) VALUES (?, ?)")
      .bind("1", "Alice")
      .run();

    // Call the Hono app directly
    const res = await app.request("/api/users", {}, env);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Alice");
  });

  it("validates input", async () => {
    const res = await app.request(
      "/api/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }), // invalid
      },
      env,
    );

    expect(res.status).toBe(400);
  });
});
```

## React Frontend Config

```ts
// vitest.config.ts (frontend)
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
```

## Common Test Patterns

```ts
// describe/it/expect (same as Jest syntax)
describe("calculateTotal", () => {
  it("sums line items", () => {
    expect(calculateTotal([10, 20, 30])).toBe(60);
  });

  it("handles empty array", () => {
    expect(calculateTotal([])).toBe(0);
  });
});

// Mocking (use vi, not jest)
vi.mock("../lib/external-api");
const mockFetch = vi.fn();

// Spying
const spy = vi.spyOn(service, "process");

// Async
it("fetches data", async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

// beforeEach/afterEach
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Key Differences from Jest

| Jest (Do Not Use)              | Vitest (Use This)                  |
| ------------------------------ | ---------------------------------- |
| `jest.fn()`                    | `vi.fn()`                          |
| `jest.mock()`                  | `vi.mock()`                        |
| `jest.spyOn()`                 | `vi.spyOn()`                       |
| `jest.useFakeTimers()`         | `vi.useFakeTimers()`               |
| `jest.config.js`               | `vitest.config.ts`                 |
| `testEnvironment: 'miniflare'` | `cloudflareTest()` plugin          |
| `@jest/globals` import         | `vitest` import (or globals: true) |

## Storage Isolation Note

As of vitest-pool-workers v4 migration, `isolatedStorage` was removed. Storage is now isolated per test file (not per individual test). If tests within the same file need clean state, use `beforeEach` to reset:

```ts
beforeEach(async () => {
  await env.DB.prepare("DELETE FROM users").run();
});
```

---

## Need More Detail?

For full API reference, use: `/stack-docs vitest <topic>`
