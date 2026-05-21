# Zod — Correct Patterns

> TRIGGER: code imports from `zod`.
> Richwood baseline: zod ^4.3.0
> Zod v4 is the current standard. Use v4 patterns (z.pipe instead of z.preprocess, etc.).

## Schema Definition

```ts
import { z } from "zod";

// Primitives
const nameSchema = z.string().min(1).max(255);
const ageSchema = z.number().int().positive();
const emailSchema = z.string().email();
const idSchema = z.string().uuid();

// Objects
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["admin", "user", "viewer"]),
  createdAt: z.string().datetime(),
  metadata: z.record(z.string()).optional(),
});

// Infer TypeScript type from schema
type User = z.infer<typeof userSchema>;
```

## Validation at API Boundaries (Richwood Pattern)

```ts
// CORRECT — validate at Hono handler entry point
app.post("/users", async (c) => {
  const body = await c.req.json();
  const result = userSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  const user = result.data; // fully typed
  // ... proceed with validated data
});
```

### parse vs safeParse

```ts
// .parse() — throws ZodError on failure
const user = userSchema.parse(data); // throws if invalid

// .safeParse() — returns { success, data } | { success, error }
const result = userSchema.safeParse(data);
if (result.success) {
  result.data; // typed
} else {
  result.error; // ZodError
}
```

Use `.safeParse()` at API boundaries (return 400, not throw). Use `.parse()` for internal validation where failure is a programming error.

## Coercion

```ts
// Coerce string inputs to native types (useful for query params, form data)
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  active: z.coerce.boolean().default(true),
});

// "5" -> 5, "true" -> true
const params = querySchema.parse({ page: "5", limit: "20", active: "true" });
```

## Transform and Pipe

```ts
// .transform() — change the output value
const trimmedString = z.string().transform((s) => s.trim().toLowerCase());

// .pipe() — chain schemas (output of first becomes input of second)
const numberFromString = z
  .string()
  .transform((s) => parseInt(s, 10))
  .pipe(z.number().int().positive());
```

## Common Patterns

### Partial and required

```ts
const updateSchema = userSchema.partial(); // all fields optional
const requiredSchema = userSchema.required(); // all fields required
const pickSchema = userSchema.pick({ name: true, email: true });
const omitSchema = userSchema.omit({ id: true, createdAt: true });
```

### Discriminated unions

```ts
const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("scroll"), offset: z.number() }),
  z.object({ type: z.literal("keypress"), key: z.string() }),
]);
```

### Arrays and records

```ts
const tagsSchema = z.array(z.string()).min(1).max(10);
const metadataSchema = z.record(z.string(), z.unknown());
```

### Default values

```ts
const configSchema = z.object({
  pageSize: z.number().default(20),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  includeArchived: z.boolean().default(false),
});
```

## Error Formatting

```ts
const result = schema.safeParse(data);
if (!result.success) {
  // Flat format (good for API responses)
  const flat = result.error.flatten();
  // { formErrors: string[], fieldErrors: { name?: string[], email?: string[] } }

  // Issue format (detailed)
  const issues = result.error.issues;
  // [{ code: 'too_small', minimum: 1, path: ['name'], message: '...' }]
}
```

## WRONG Patterns

```ts
// WRONG — using any/unknown without validation
const data = (await c.req.json()) as User; // bypasses validation

// WRONG — string validation for structured data
if (typeof body.email === "string" && body.email.includes("@"))
  // fragile

  // WRONG — Joi or yup (not in Richwood stack)
  import Joi from "joi";
```

## Zod v4 Awareness

Zod v4 (`zod/v4`) exists with performance improvements and new features. Richwood has not adopted v4 yet. Key v4 differences to be aware of:

- `z.interface()` replaces some `z.object()` use cases
- `z.stringbool()` for boolean-like strings
- New error formatting API
- JSON Schema generation built in

Do not use v4 APIs until the baseline is updated.

---

## Need More Detail?

For full API reference, use: `/stack-docs zod <topic>`
