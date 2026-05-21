# D1 Debugging

Quick reference for debugging Cloudflare D1 issues.

## Common Issues

### NOT NULL Constraint Failed

**Symptom**: `NOT NULL constraint failed: table.column`

**Debug Steps**:
1. Check actual column names:
   ```bash
   npx wrangler d1 execute [DB_NAME] --remote --command="PRAGMA table_info(table_name)"
   ```
2. Compare with your INSERT statement
3. Common mistake: `created_at` vs `occurred_at`, `updated_at` vs `modified_at`

### Foreign Key Constraint Failed

**Symptom**: `FOREIGN KEY constraint failed`

**Debug Steps**:
1. Check if referenced row exists:
   ```bash
   npx wrangler d1 execute [DB_NAME] --remote --command="SELECT id FROM parent_table WHERE id = 'value'"
   ```
2. Pre-fetch valid IDs before batch inserts
3. Use `INSERT OR IGNORE` if FK may not exist

### Query Errors

**Check table structure**:
```bash
npx wrangler d1 execute [DB_NAME] --remote --command=".schema table_name"
```

**Check sample data**:
```bash
npx wrangler d1 execute [DB_NAME] --remote --command="SELECT * FROM table LIMIT 5"
```

### Column Rename Migrations

**When renaming a column**:
1. Rename in the main table: `ALTER TABLE t RENAME COLUMN old TO new`
2. Check ALL related tables that might reference the column by name:
   - History/audit tables (e.g., `line_categorization_history`)
   - Pattern/rule tables
   - Log tables
3. Update code in this order:
   - Type definitions (interfaces)
   - SELECT statements
   - INSERT statements (check column lists match table schema)
   - UPDATE statements
   - Function parameters and their callers
4. Keep history table column names stable if they differ from main table

**Example issue**: Renamed `line_category` to `so_line_category` in `pending_cards`, but `line_categorization_history` table kept `line_category`. Code INSERT into history must use original column name.

### Migration-Safety Pattern

When querying a table added in a recent migration, wrap in try/catch and return a safe default. Code can deploy before `wrangler d1 migrations apply` runs.

```typescript
try {
  const result = await db.prepare('SELECT ... FROM new_table WHERE ...')
    .bind(...).all();
  return result.results ?? [];
} catch (err) {
  // Table may not exist yet (pre-migration deploy)
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[feature] D1 query failed (falling back): ${msg}`);
  return []; // safe default — caller uses static fallback
}
```

**Key principle**: callers should always have a fallback path when the query returns an empty result, so returning `[]` on error naturally degrades to the pre-migration behavior.

### Wrangler Query Pattern

Always use `--json` flag for parseable output:
```bash
export CLOUDFLARE_API_TOKEN=$(cat ~/.cloudflare/api_token)
export CLOUDFLARE_ACCOUNT_ID=b14f3ed52e5d52a763962704f8873871

npx wrangler d1 execute [DB_NAME] --remote --json \
  --command "SELECT col FROM table WHERE ..." \
  2>&1 | grep -A 50 '"results"'
```

Without `--json`, output format is inconsistent and row data may not appear. Must run from the directory with the correct `wrangler.toml` context when using `--env`.

### SQL Filter Safety Checklist

When adding WHERE clause filters:
1. **NULL safety**: Use `COALESCE(col, '')` — `LOWER(NULL)` returns NULL, failing predicates silently
2. **False positive risk**: Prefer specific patterns (`%demo trailer%`) over broad substrings (`%demo%`)
3. **Idempotent UPDATEs**: Add condition guard (e.g., `AND col IS NULL`) for concurrent write safety
4. **Error surfacing**: Push failures to `errors[]` array, not just `console.error` — matches existing sync patterns

## Best Practices

1. **Always check schema before INSERT** - Column names vary
2. **Use parameterized queries** - Prevent SQL injection
3. **Batch operations** - D1 has statement size limits (~50KB)
4. **Pre-validate FKs** - Query valid IDs before batch insert
5. **Use INSERT OR REPLACE** - For upsert patterns
6. **Check related tables on schema changes** - History, audit, patterns tables may reference original names

## D1 Limits

- Statement size: ~50KB max
- Batch max: 50-100 statements per transaction
- ALTER TABLE supports: RENAME TABLE, RENAME COLUMN, ADD COLUMN, DROP COLUMN
- DROP COLUMN fails if column is: primary key, indexed, in a CHECK/FK constraint, or used in a trigger/view
- No ALTER COLUMN type — must create new column, migrate data, drop old
