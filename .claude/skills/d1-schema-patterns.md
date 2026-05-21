---
description: D1 schema conventions, timestamp standard, CASCADE policy, and db.batch() patterns. Use when writing migrations, creating tables, or writing multi-statement D1 queries.
globs:
  ["**/migrations/**", "**/*.sql", "**/src/routes/**", "**/src/services/**"]
---

# D1 Schema and Query Patterns

## Schema Conventions

### Naming

| Element      | Convention                          | Example                       |
| ------------ | ----------------------------------- | ----------------------------- |
| Tables       | lowercase snake_case, plural        | `users`, `work_orders`        |
| Columns      | lowercase snake_case                | `created_at`, `owner_id`      |
| Foreign keys | `{table_singular}_id`               | `user_id`, `facility_id`      |
| Booleans     | `is_` or `has_` prefix, INTEGER 0/1 | `is_active`, `has_attachment` |
| Indexes      | `idx_{table}_{columns}`             | `idx_users_email`             |

### Primary Keys

TEXT type with UUIDs. Not auto-increment.

```sql
id TEXT PRIMARY KEY  -- populated via crypto.randomUUID()
```

### Cascade Behavior

| Relationship            | ON DELETE  | When                                         |
| ----------------------- | ---------- | -------------------------------------------- |
| Parent owns children    | `CASCADE`  | Deleting parent deletes children             |
| Child references parent | `RESTRICT` | Prevent deleting parent while children exist |
| Soft reference          | `SET NULL` | Clear reference when linked record deleted   |

### Join Tables

Composite primary key — no separate `id` column:

```sql
CREATE TABLE facility_members (
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  PRIMARY KEY (facility_id, user_id)
);
```

## Timestamp Standard

All timestamps as **INTEGER Unix seconds**. Not milliseconds. Not ISO strings. Not `CURRENT_TIMESTAMP`.

### Schema

```sql
created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
  CHECK (created_at > 946684800 AND created_at < 10000000000),
updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
  CHECK (updated_at > 946684800 AND updated_at < 10000000000)
```

The CHECK constraint rejects millisecond values (> 10 billion) and pre-2000 values.

### Application Code

```typescript
// utils/time.ts — use this, not raw Date.now()
export function now(): number {
  return Math.floor(Date.now() / 1000);
}

export function toSeconds(ts: number): number {
  return ts > 10_000_000_000 ? Math.floor(ts / 1000) : ts;
}

export function assertSeconds(ts: number): void {
  if (ts > 10_000_000_000) {
    throw new Error(`Expected seconds, got milliseconds: ${ts}`);
  }
}
```

### What NOT to Do

```sql
-- BAD: returns a string, not an integer
created_at TEXT DEFAULT CURRENT_TIMESTAMP

-- BAD: milliseconds, not seconds
created_at INTEGER DEFAULT (strftime('%s','now') * 1000)

-- GOOD
created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
```

## Prepared Statements

Always use `.prepare()` with `.bind()`. Never concatenate user input into SQL.

```typescript
// GOOD
const result = await db
  .prepare("SELECT * FROM users WHERE id = ?")
  .bind(userId)
  .first();

// GOOD — dynamic fields from code, values from .bind()
const fields = ["name", "status"];
const placeholders = fields.map((f) => `${f} = ?`).join(", ");
await db
  .prepare(`UPDATE users SET ${placeholders} WHERE id = ?`)
  .bind(...values, userId)
  .run();

// BAD — user input in SQL structure
await db
  .prepare(`SELECT * FROM ${tableName} WHERE ${columnName} = ?`)
  .bind(value)
  .first();
```

Dynamic SQL: field/table names must come from hardcoded code, never from user input. Values always go through `.bind()`.

## Atomic Batches

Use `db.batch()` when writing to multiple tables or multiple rows that must succeed or fail together.

```typescript
// Multiple related writes — use batch
await db.batch([
  db
    .prepare("INSERT INTO pages (id, space_id, title) VALUES (?, ?, ?)")
    .bind(pageId, spaceId, title),
  db
    .prepare(
      "INSERT INTO page_versions (id, page_id, content) VALUES (?, ?, ?)",
    )
    .bind(versionId, pageId, content),
]);
```

### D1 Batch Limit

D1 allows max **100 statements per batch**. For larger operations, chunk:

```typescript
const BATCH_SIZE = 50;
for (let i = 0; i < statements.length; i += BATCH_SIZE) {
  await db.batch(statements.slice(i, i + BATCH_SIZE));
}
```

### When to Batch

- Creating a record + its initial related records (page + version, conversation + system message)
- Bulk updates/deletes on multiple rows
- Any multi-table write where partial completion would leave inconsistent data

## Ownership in SQL

Check ownership in the SQL WHERE clause, not by fetching then checking in JS:

```typescript
// GOOD — ownership checked in query
const account = await db.prepare(
  "SELECT * FROM accounts WHERE id = ? AND facility_id = ?"
).bind(accountId, userFacilityId).first();

if (!account) return apiError(c, { code: "NOT_FOUND", message: "Account not found", status: 404 });

// BAD — fetch everything, then check
const account = await db.prepare("SELECT * FROM accounts WHERE id = ?").bind(accountId).first();
if (account.facility_id !== userFacilityId) return apiError(c, { code: "FORBIDDEN", ... });
```

The SQL approach prevents timing attacks and ensures the check cannot be accidentally skipped.
