# Hono v4 — Correct Patterns for Cloudflare Workers

> TRIGGER: code imports from `hono` or `hono/*`.
> Richwood baseline: hono ^4.12.0
> Hono is NOT Express. Do not use Express patterns.

## App Setup with CF Bindings

```ts
import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
  MY_BUCKET: R2Bucket;
  MY_KV: KVNamespace;
  ENVIRONMENT: string;
};

type Variables = {
  user: { id: string; role: string };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
```

## Route Handlers

```ts
// CORRECT — Hono uses context object (c), not (req, res)
app.get("/users", async (c) => {
  return c.json({ users: [] });
});

app.get("/users/:id", async (c) => {
  const id = c.req.param("id");
  return c.json({ id });
});

app.post("/users", async (c) => {
  const body = await c.req.json();
  return c.json({ created: true }, 201);
});
```

### WRONG — Express patterns

```ts
// WRONG — (req, res) signature
app.get("/users", async (req, res) => {
  res.json({ users: [] });
});

// WRONG — res.status().json() chaining
app.get("/users", async (c) => {
  c.status(200).json({ users: [] });
});

// WRONG — res.send()
app.get("/", async (c) => {
  c.send("hello");
});
```

## Request Data

| Need             | Hono                            | NOT Express                    |
| ---------------- | ------------------------------- | ------------------------------ |
| JSON body        | `await c.req.json()`            | `req.body`                     |
| Form body        | `await c.req.parseBody()`       | `req.body`                     |
| Query param      | `c.req.query('name')`           | `req.query.name`               |
| All query params | `c.req.queries('tag')`          | `req.query.tag` (array)        |
| URL param        | `c.req.param('id')`             | `req.params.id`                |
| Header           | `c.req.header('Authorization')` | `req.headers['authorization']` |
| Raw body         | `await c.req.text()`            | `req.body`                     |

## Response Helpers

```ts
return c.json(data); // JSON response
return c.json(data, 201); // JSON with status
return c.text("hello"); // Plain text
return c.html("<h1>Hello</h1>"); // HTML
return c.redirect("/other"); // 302 redirect
return c.redirect("/other", 301); // 301 redirect
return c.notFound(); // 404
return c.body(null, 204); // No content
return new Response(stream, { headers }); // Streaming
```

## Middleware

### CORRECT — createMiddleware with typed context

```ts
import { createMiddleware } from "hono/factory";

const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const user = await verifyToken(token, c.env);
  c.set("user", user);
  await next();
});

app.use("/api/*", authMiddleware);
```

### WRONG — Express middleware patterns

```ts
// WRONG — Express (req, res, next) signature
const auth = (req, res, next) => {
  if (!req.headers.authorization) return res.status(401).send();
  next();
};

// WRONG — Express middleware packages (cors, helmet, etc.)
import cors from "cors";
app.use(cors()); // Does NOT work — use hono/cors instead
```

### Built-in Hono middleware

```ts
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { bearerAuth } from "hono/bearer-auth";
import { basicAuth } from "hono/basic-auth";
import { prettyJSON } from "hono/pretty-json";

app.use("*", logger());
app.use("*", cors({ origin: ["https://app.richwood.com"] }));
app.use("*", secureHeaders());
```

## Variables (Request-scoped state)

```ts
// Set in middleware
c.set("user", { id: "123", role: "admin" });

// Get in handler
const user = c.get("user");
```

## Error Handling

```ts
import { HTTPException } from "hono/http-exception";

// Throw in handler
app.get("/protected", async (c) => {
  throw new HTTPException(403, { message: "Forbidden" });
});

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});
```

## Route Groups

```ts
const api = new Hono<{ Bindings: Bindings }>();

api.get("/users", listUsers);
api.post("/users", createUser);
api.get("/users/:id", getUser);

app.route("/api/v1", api);
```

## Export for Workers

```ts
// CORRECT — default export for CF Workers
export default app;

// WRONG — app.listen() (Express pattern, not for Workers)
app.listen(3000);
```

---

## Need More Detail?

For full API reference, use: `/stack-docs hono <topic>`
