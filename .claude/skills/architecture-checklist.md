# Architecture Checklist

Pre-commit verification checklist for Richwood projects.

## Backend Checklist

### Database
- [ ] All queries use prepared statements with `.bind()`
- [ ] No SQL string concatenation
- [ ] Timestamps are Unix seconds (`Math.floor(Date.now()/1000)`)
- [ ] Soft delete uses `deleted_at` column
- [ ] Queries filter by `deleted_at IS NULL`

### Authentication
- [ ] All mutations have `requireAuth` middleware
- [ ] User ID extracted from Access JWT
- [ ] Ownership verified before mutations
- [ ] No hardcoded user IDs

### Validation
- [ ] Zod schema for all request bodies
- [ ] File size limits enforced
- [ ] Content type validated
- [ ] Filename sanitized (no path traversal)

### Error Handling
- [ ] Standard error envelope: `{ error: { code, message } }`
- [ ] Appropriate HTTP status codes
- [ ] No stack traces in production responses
- [ ] Errors logged for debugging

### R2 Operations
- [ ] Signed URLs used for upload/download
- [ ] TTL is reasonable (5 minutes default)
- [ ] R2 key format is consistent
- [ ] Upload completion validated

## Frontend Checklist

### Data Fetching
- [ ] TanStack Query for all data fetching
- [ ] No `useEffect` for fetching data
- [ ] Query keys follow convention
- [ ] `useVaultMutation` for mutations

### Styling
- [ ] Layer 2 CSS tokens only (`bg-rw-*`, `text-text-*`)
- [ ] No raw token references (`--nightfall-*`)
- [ ] No inline hex colors
- [ ] No CSS-in-JS

### Components
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Proper TypeScript types

### Icons
- [ ] Lucide React only
- [ ] No Font Awesome or Material Icons

### Accessibility
- [ ] Form inputs have labels
- [ ] Buttons have accessible names
- [ ] Loading indicators announced
- [ ] Keyboard navigation works

## Security Checklist

### Input Validation
- [ ] All user input validated
- [ ] File uploads validated (type, size)
- [ ] No path traversal possible
- [ ] SQL injection prevented (prepared statements)

### Authentication
- [ ] JWT verified on every request
- [ ] User can only access own resources
- [ ] Share tokens are random and unguessable
- [ ] Expired shares are rejected

### Data Protection
- [ ] Soft delete only (data recoverable)
- [ ] Access logged for audit
- [ ] No sensitive data in logs
- [ ] R2 keys not guessable

## Documentation Checklist

### For New Features
- [ ] Feature spec in `docs/canonical/features/`
- [ ] API endpoints documented
- [ ] Schema changes documented
- [ ] ADR if significant decision

### For Changes
- [ ] Existing docs updated
- [ ] Breaking changes noted
- [ ] Migration path documented

## Deployment Checklist

### Database
- [ ] SQL column names in code match actual DB schema
- [ ] New migrations applied to ALL environments (dev, qa, prod)
- [ ] Migration tested on dev before qa/prod

### Multi-Environment
- [ ] wrangler deploy uses correct `--env` flag (dev/qa/production)
- [ ] Pages deploy uses `--branch main` for production
- [ ] `CLOUDFLARE_ACCOUNT_ID` exported for Pages/D1 operations
- [ ] Environment-specific resources (D1/R2/KV) are correct in wrangler.toml

### Branch Workflow
- [ ] Feature branch -> PR -> develop
- [ ] develop -> PR -> qa (for QA testing)
- [ ] qa -> PR -> main (for production, requires approval)
- [ ] Never push directly to protected branches

## Common Violations

### 1. String Concatenation in SQL
```typescript
// WRONG
.prepare(`SELECT * FROM files WHERE id = '${id}'`)

// CORRECT
.prepare('SELECT * FROM files WHERE id = ?').bind(id)
```

### 2. Missing Auth Middleware
```typescript
// WRONG
app.post('/files', async (c) => { ... })

// CORRECT
app.post('/files', requireAuth, async (c) => { ... })
```

### 3. Raw CSS Tokens
```tsx
// WRONG
className="text-[#E8E8E5]"
style={{ color: 'var(--nightfall-text-primary)' }}

// CORRECT
className="text-text-primary"
```

### 4. useEffect for Data
```tsx
// WRONG
useEffect(() => {
  fetch('/api/files').then(setFiles);
}, []);

// CORRECT
const { data } = useQuery({
  queryKey: ['files'],
  queryFn: () => filesApi.list(),
});
```

### 5. DB Column Name Mismatch
```typescript
// WRONG — migration says 'name' but code says 'filename'
.prepare('SELECT id, filename FROM files')

// CORRECT — verify column names match migration schema
.prepare('SELECT id, filename FROM files') // after migration renames name->filename
```

### 6. Hard Delete
```typescript
// WRONG
.prepare('DELETE FROM files WHERE id = ?')

// CORRECT
.prepare('UPDATE files SET deleted_at = ? WHERE id = ?')
```
