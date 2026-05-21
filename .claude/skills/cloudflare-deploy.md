# Cloudflare Deployment

## Environments

| Env | API Worker | Web Pages Project | Web Domain | Git Branch |
|-----|------------|-------------------|------------|------------|
| **QA** | `[PROJECT]-api-qa` | `[PROJECT]-qa` | `qa.[PROJECT].richwood.com` | `qa` |
| **Prod** | `[PROJECT]-api-prod` | `[PROJECT]` | `[PROJECT].richwood.com` | `main` |

Git flow: `develop` -> `qa` -> `main`

## Prerequisites

Always export these before ANY wrangler command:

```bash
export CLOUDFLARE_API_TOKEN=$(cat ~/.cloudflare/api_token)
export CLOUDFLARE_ACCOUNT_ID=b14f3ed52e5d52a763962704f8873871
```

## Deploy Script (Preferred)

```bash
./scripts/deploy.sh qa all      # Deploy API + Web to QA
./scripts/deploy.sh qa api      # Deploy API only to QA
./scripts/deploy.sh qa web      # Deploy Web only to QA
./scripts/deploy.sh prod all    # Deploy to Prod
```

## Manual Deploy Commands

### API (Workers)

```bash
cd apps/api
npx wrangler deploy --env qa    # or --env prod
```

### Web (Pages)

```bash
cd apps/web && npm run build
npx wrangler pages deploy dist --project-name=[PROJECT]-qa --branch=qa     # QA
npx wrangler pages deploy dist --project-name=[PROJECT] --branch=main      # Prod
```

## D1 Migrations

**Run migrations BEFORE deploying API** if new tables/columns are referenced:

```bash
npx wrangler d1 execute [DB_NAME]-qa --remote --file=migrations/NNNN_name.sql    # QA
npx wrangler d1 execute [DB_NAME]-prod --remote --file=migrations/NNNN_name.sql  # Prod
```

Verify migration applied:
```bash
npx wrangler d1 execute [DB_NAME]-qa --remote --command="SELECT name FROM _migrations ORDER BY applied_at DESC LIMIT 5"
```

## Deploy Sequence (Full)

1. Export CF env vars
2. Run any new D1 migrations
3. Deploy API worker
4. Verify health: `curl -s https://[PROJECT]-api-qa.richwood.workers.dev/health`
5. Check for required secrets (e.g., `hasApiToken: true`) -- if false, re-set secret
6. Build and deploy web
7. Verify web loads at target URL

## Secrets After Redeploy

**Secrets are CLEARED when redeploying a worker.** Always verify after deploy:

```bash
curl -s https://[PROJECT]-api-qa.richwood.workers.dev/health
# Check that required secrets show as present

# If missing, re-set:
cd apps/api
printf "TOKEN_VALUE" | npx wrangler secret put SECRET_NAME --env qa
printf "TOKEN_VALUE" | npx wrangler secret put SECRET_NAME --env prod
```

## Web Build Verification (CRITICAL)

If the web app uses `import.meta.env.PROD` to select the API URL at build time:

**After building, ALWAYS verify API URLs exist in the bundle:**

```bash
grep -o '[project]-api-[a-z]*' apps/web/dist/assets/*.js | sort -u
```

If only one environment appears, the build was not in the correct mode. The build script must include:
```json
"build": "export NODE_ENV=production && tsc -b && vite build --mode production"
```

## CORS Configuration

CORS origins configured in the API middleware (e.g., `apps/api/src/middleware/cors.ts`).

When adding new frontend domains, update the origins array there.

## Common Issues

### Wrangler auth error
```
In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN...
```
**Fix:** Export `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` before running wrangler.

### Secret shows as missing after deploy
**Cause:** Secret was cleared by redeploy.
**Fix:** Re-set secret with `wrangler secret put`.

### API crashes on new table reference
**Cause:** Migration not run before deploy.
**Fix:** Run migration first, then redeploy.

### Prod website shows wrong data
**Cause:** Web built without `NODE_ENV=production`.
**Fix:** Rebuild with production mode, verify API URLs in bundle, redeploy.
