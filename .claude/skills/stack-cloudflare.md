# Cloudflare Workers, D1, R2, KV — Correct Patterns

> TRIGGER: code imports from `hono`, uses `wrangler`, or references D1/R2/KV bindings.
> Richwood baseline: wrangler ^4.78.0 | @cloudflare/workers-types ^4.20260329.0
> See tooling-versions.md for current baseline.

## D1 (SQLite) API

### Query chain: prepare → bind → execute

```ts
// CORRECT — parameterized query
const { results } = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
  .bind(userId)
  .first();

// CORRECT — multiple params
const { results } = await c.env.DB.prepare(
  "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
)
  .bind(id, name, email)
  .run();

// CORRECT — get all rows
const { results } = await c.env.DB.prepare(
  "SELECT * FROM users WHERE active = ?",
)
  .bind(1)
  .all();
```

### WRONG patterns

```ts
// WRONG — string concatenation (SQL injection risk)
await c.env.DB.prepare(`SELECT * FROM users WHERE id = '${userId}'`).all();

// WRONG — .query() does not exist on D1
await c.env.DB.query("SELECT * FROM users");

// WRONG — .execute() does not exist on D1
await c.env.DB.execute("SELECT * FROM users");

// WRONG — .bind() after .all()/.first()/.run()
await c.env.DB.prepare("...").all().bind(param);
```

### D1 execution methods

| Method        | Returns                           | Use When                       |
| ------------- | --------------------------------- | ------------------------------ |
| `.first()`    | Single row or null                | SELECT expecting one row       |
| `.first<T>()` | Typed single row                  | With TypeScript generics       |
| `.all()`      | `{ results: T[], success, meta }` | SELECT expecting multiple rows |
| `.run()`      | `{ success, meta }`               | INSERT, UPDATE, DELETE         |
| `.raw()`      | `string[][]`                      | Raw column arrays              |

### D1 batch operations

```ts
// CORRECT — batch multiple statements in one round trip
const results = await c.env.DB.batch([
  c.env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Alice"),
  c.env.DB.prepare("INSERT INTO users (name) VALUES (?)").bind("Bob"),
]);
```

---

## R2 (Object Storage) API

### Put and get objects

```ts
// CORRECT — put
await c.env.MY_BUCKET.put("key", body, {
  httpMetadata: { contentType: "application/json" },
  customMetadata: { uploadedBy: userId },
});

// CORRECT — get (returns R2ObjectBody | null)
const object = await c.env.MY_BUCKET.get("key");
if (object === null) return c.notFound();

const data = await object.text(); // or .json(), .arrayBuffer(), .blob()
```

### WRONG patterns

```ts
// WRONG — .upload() does not exist
await c.env.MY_BUCKET.upload("key", body);

// WRONG — .read() does not exist on R2Bucket
await c.env.MY_BUCKET.read("key");

// WRONG — treating get() result as string directly
const data = await c.env.MY_BUCKET.get("key"); // This is R2ObjectBody, not string
```

### R2 list with prefix

```ts
const listed = await c.env.MY_BUCKET.list({ prefix: "uploads/", limit: 100 });
for (const obj of listed.objects) {
  console.log(obj.key, obj.size);
}
```

---

## KV (Key-Value) API

### Basic operations

```ts
// CORRECT — get (returns string | null)
const value = await c.env.MY_KV.get("key");
const json = await c.env.MY_KV.get("key", "json");

// CORRECT — put
await c.env.MY_KV.put("key", "value", {
  expirationTtl: 60 * 60, // seconds
  metadata: { createdBy: userId },
});

// CORRECT — get with metadata
const { value, metadata } = await c.env.MY_KV.getWithMetadata("key");

// CORRECT — delete
await c.env.MY_KV.delete("key");

// CORRECT — list
const list = await c.env.MY_KV.list({ prefix: "user:" });
```

### WRONG patterns

```ts
// WRONG — .set() does not exist (it's .put())
await c.env.MY_KV.set("key", "value");

// WRONG — .remove() does not exist (it's .delete())
await c.env.MY_KV.remove("key");

// WRONG — second arg to get is type, not options
await c.env.MY_KV.get("key", { type: "json" }); // WRONG
await c.env.MY_KV.get("key", "json"); // CORRECT
```

---

## Workers Env Typing with Hono

```ts
// CORRECT — define Bindings type
type Bindings = {
  DB: D1Database;
  MY_BUCKET: R2Bucket;
  MY_KV: KVNamespace;
  ENVIRONMENT: string;
  API_SECRET: string;
};

// CORRECT — pass to Hono generic
const app = new Hono<{ Bindings: Bindings }>();

// CORRECT — access via c.env
app.get("/data", async (c) => {
  const db = c.env.DB;
  const env = c.env.ENVIRONMENT;
  // ...
});
```

### WRONG patterns

```ts
// WRONG — process.env does not exist in Workers
const secret = process.env.API_SECRET;

// WRONG — globalThis.env does not exist
const db = globalThis.DB;

// WRONG — env as function parameter (Express pattern)
app.get("/data", async (req, res) => {
  const db = req.env.DB; // Not how Hono works
});
```

---

## Wrangler v4 Config

### wrangler.toml key patterns

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxxx"

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"

[[kv_namespaces]]
binding = "MY_KV"
id = "xxxx"

[env.production]
name = "my-worker-prod"
```

### Cloudflare naming convention (Richwood standard)

```
Workers:   {domain}-{role}-{env}     e.g., finance-api-prod
D1:        {domain}-{purpose}-{env}  e.g., leanview-data-qa
R2:        {domain}-{purpose}-{env}  e.g., vault-files-prod
KV:        {domain}-{purpose}-{env}  e.g., kb-cache-prod
Bindings:  UPPER_SNAKE_CASE          e.g., DB, FILES, CACHE
```

---

## Need More Detail?

For full API reference, use: `/stack-docs cloudflare <topic>`
