# R2 token mint — Richwood Cloudflare account

How to mint a Cloudflare R2 API token and rotate the resulting keys onto the cma-runtime workers. First runbook in `docs/runbooks/`.

## Why this exists

The operational path to mint an R2 API token in this project is non-obvious:

- `wrangler` has no `r2 token` subcommand (verify with `wrangler r2 --help`).
- The dedicated `/accounts/{id}/r2/tokens` REST endpoint returns 404.
- The OAuth scopes wrangler holds (`account read`, `workers write`, `d1 write`, `workers_kv write`, etc.) do not include R2-admin or API-token-management.
- The documented generic-token path exists — Cloudflare's [R2 token API docs](https://developers.cloudflare.com/r2/api/tokens/) cover token creation via the generic `/accounts/{id}/tokens` endpoint with R2 bucket resources and R2 permission groups (e.g. `Workers R2 Storage Bucket Item Write`). The Day 5 attempt did not pin down the exact permission-group selection in-session because the dashboard was faster.

**The dashboard is this project's recommended operational path** unless and until someone deliberately scripts the documented generic-token API with the right token-create permissions and R2 permission groups. Discovered while wiring the first prod deploy on 2026-05-27; this runbook encodes the operational choice so the next person doesn't re-investigate.

## ⚠ Run this from your own shell

The auto-mode classifier blocks `wrangler secret put` against prod workers from chat-driven sessions. The dashboard step requires a browser. **Run every command in this runbook from your own terminal, signed into wrangler with your own account.** Do not delegate the `wrangler secret put` calls to a Claude chat session.

## Prerequisites

- Dashboard access to the Richwood Cloudflare account.
- `wrangler` logged in as your user (`wrangler whoami` should show your account).
- The worker name(s) that will consume the keys (cma-runtime uses `cma-runtime-qa` and `cma-runtime-prod`).
- The R2 bucket name(s) the token will scope to (cma-runtime uses `cma-runtime-snapshots-qa` and `cma-runtime-snapshots-prod`).

## Step 1 — Mint the token in the dashboard

For cma-runtime, mint **one token per environment** — keeping blast radius per-env. Repeat this step twice (once for QA, once for prod). If you have a strong reason to share one token across environments, see the footnote.

1. Sign into the Cloudflare dashboard for the Richwood account.
2. Navigate: **R2 → Manage R2 API Tokens → Create token**.
3. Configure the token:
   - **Name**: `cma-runtime-qa-snapshots` (or `cma-runtime-prod-snapshots`).
   - **Permissions**: `Object Read & Write` — **not** `Admin Read & Write`. Least privilege; the worker only needs object I/O on the snapshot bucket.
   - **Specify bucket**: pick the single bucket — `cma-runtime-snapshots-qa` (or `cma-runtime-snapshots-prod`). Do **not** select "Apply to all buckets."
   - **TTL**: no expiration (or your team's standard rotation cadence, whichever is shorter).
4. Click **Create API Token**.
5. **Immediately copy** the `Access Key ID` and `Secret Access Key`. The Secret Access Key is shown once — if you close this page without copying, you have to delete and re-mint.

The dashboard also surfaces an `S3 API` endpoint URL on this screen. The cma-runtime worker doesn't need it (the Sandbox SDK derives the endpoint from `CLOUDFLARE_ACCOUNT_ID`), but copy it if you want a record.

## Step 2 — Rotate the keys onto the worker

From your own shell (not Claude chat — see the callout above), push the keys to the matching worker. Each `wrangler secret put` will prompt for the value interactively; paste the value from Step 1 and press Enter.

**QA:**

```bash
wrangler secret put R2_ACCESS_KEY_ID --name cma-runtime-qa
wrangler secret put R2_SECRET_ACCESS_KEY --name cma-runtime-qa
```

**Prod:**

```bash
wrangler secret put R2_ACCESS_KEY_ID --name cma-runtime-prod
wrangler secret put R2_SECRET_ACCESS_KEY --name cma-runtime-prod
```

These overwrite the `TEMP-ROTATE-`-prefixed placeholder values that were set on 2026-05-27 to complete the secret roster. The other two R2-related secrets — `BACKUP_BUCKET_NAME` and `CLOUDFLARE_ACCOUNT_ID` — were set with real values during initial provisioning and do **not** need rotation.

## Step 3 — Verify the rotation took

Confirm the secrets exist on each worker (this lists names only, never values):

```bash
wrangler secret list --name cma-runtime-qa
wrangler secret list --name cma-runtime-prod
```

Expected output on each: a JSON array containing entries for `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `BACKUP_BUCKET_NAME`, `CLOUDFLARE_ACCOUNT_ID`, and the worker's other unrelated secrets.

End-to-end verification requires a MicroVM session that actually exercises snapshot/restore — `/health` does not touch R2. Once both workers are rotated, smoke the snapshot path as a separate follow-up (tracked in the progress tracker's Day 5 addendum next-steps).

## For future Richwood Worker projects

The procedure above generalizes. Substitute:

- Worker names → your project's worker names.
- Bucket names → your project's R2 buckets.
- Token name → `<project>-<env>-<purpose>`.

The Cloudflare-account constraints don't change: wrangler still can't mint R2 tokens, the dedicated `/accounts/{id}/r2/tokens` REST endpoint still 404s, and the documented generic-token-API path remains unscripted in this org. Use the dashboard unless your project has a reason to invest in the scripting work (see the "Why we don't script the mint" section below).

## Why we don't script the mint

The path exists — Cloudflare's [R2 token API docs](https://developers.cloudflare.com/r2/api/tokens/) cover token creation against the generic `/accounts/{id}/tokens` endpoint with R2 bucket resources and R2 permission groups (e.g. `Workers R2 Storage Bucket Item Write`). The Day 5 session did not pin down the exact permission-group selection because the dashboard was the faster operational path. Two reasons we haven't gone back to script it:

- Scripting still needs the correct permission-group selection. Guessing wrong risks minting over-broad tokens (for example, account-wide R2 admin instead of object I/O on one bucket) — the failure mode we most want to avoid. The dashboard form gates this implicitly.
- This procedure runs a few times a year. Dashboard mint takes under a minute. Automation cost-benefit is poor for this project.

If `wrangler` ships an `r2 token` subcommand, or someone in this org invests in scripting the documented generic-token-API path with the right permission groups, update this runbook.

---

<sub>**Footnote — single token across environments.** If you mint one token scoped to both `cma-runtime-snapshots-qa` and `cma-runtime-snapshots-prod` instead of two per-env tokens, the wrangler steps are unchanged (same key pair pushed to each worker) but a leak of one worker's keys also exposes the other environment's bucket. Per-env tokens are the recommended default.</sub>
