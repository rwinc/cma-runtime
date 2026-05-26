# CLAUDE.md — Richwood fork of cma-runtime

Agents and humans landing in this repo: read this first. It tells you what's different about working here.

## This is a fork

This repo is a Richwood fork of [`cloudflare/claude-managed-agents`](https://github.com/cloudflare/claude-managed-agents) (MIT). It exists to back the `ClaudeManagedCloudflareProvider` in [`rwinc/tardis`](https://github.com/rwinc/tardis).

The policy is **thin fork**:

- Default to using the upstream codebase as-is.
- Put Richwood-specific changes in new files where possible. Don't rewrite upstream files.
- If a customization has to touch an upstream file, first ask whether it could be upstreamed to `cloudflare/claude-managed-agents` instead of carried as a delta.
- The README at the repo root is upstream's. Add Richwood-only context in `RICHWOOD.md` (or a clearly-marked addendum) — don't edit upstream prose.

Why this matters: every line we change in an upstream file is a future merge conflict. Thin forks pull cleanly; thick forks calcify.

## Upstream sync

The `upstream` remote is already configured:

```
upstream  https://github.com/cloudflare/claude-managed-agents.git
```

Pull upstream changes weekly, or before starting any non-trivial customization PR:

```bash
git fetch upstream
git merge upstream/main          # or: git rebase upstream/main
# resolve conflicts (ideally none — thin-fork posture)
npm install
npm test
```

If a conflict requires modifying an upstream-owned file, stop and consider upstreaming the fix to `cloudflare/claude-managed-agents` instead of carrying the delta locally.

The detailed sync workflow lives in [`docs/upstream-sync.md`](./docs/upstream-sync.md).

## Richwood-specific files

Look here for customizations and Richwood context. Everything else is upstream's:

| Path                    | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `CLAUDE.md`             | This file — agent guardrails                              |
| `RICHWOOD.md`           | Fork ownership, Richwood README addendum                  |
| `.claude/`              | Skills, commands, and agent tooling synced from `rw-meta` |
| `.github/`              | Richwood PR/issue templates and workflows                 |
| `.github/CODEOWNERS`    | Review routing                                            |
| `.prettierignore`       | Keeps the local Prettier hook off upstream-owned files    |
| `commitlint.config.js`  | Conventional Commits enforcement                          |
| `.husky/`               | Git hooks — commit-msg runs `commitlint`                  |
| `docs/upstream-sync.md` | Thin-fork sync workflow                                   |

If a file isn't in this table or the next one, treat it as upstream-owned and leave it alone unless absolutely necessary.

## Upstream files with Richwood divergence

These are upstream-owned files that carry a small Richwood delta. Each one is a candidate to upstream — when touching them, first ask whether the change could land at `cloudflare/claude-managed-agents` instead.

| Path                              | Richwood delta                                                                                                                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wrangler.jsonc`                  | Worker / D1 / R2 / container names renamed to `cma-runtime-qa` (upstream ships `claude-managed-agents-*`). Adds `vars.ENVIRONMENT`. KV/D1 IDs reset to `""` placeholders per the file's own comments — upstream had real IDs leaked in (see Day 1 PR-15 review). |
| `src/index.ts`                    | Adds a `/health` route alongside upstream's `/webhooks` and `/openapi.json` — required by rw-meta deploy standards.                                                                                                                                              |
| `src/env.d.ts`                    | Adds optional `ENVIRONMENT?: string` type for the wrangler-vars value.                                                                                                                                                                                           |
| `.github/workflows/deploy-qa.yml` | rw-meta-synced template, customized body: deploy + migrations steps handle the case where `WORKER_ENV` is unset (this fork uses top-level config, not env blocks).                                                                                               |

## Decision context

The decision to deploy CMA on Cloudflare and fork this repo is recorded in **[Tardis ADR-0005](https://github.com/rwinc/tardis/blob/develop/docs/canonical/ADR/adr-0005-claude-managed-agents-on-cloudflare.md)** — read it before making structural changes.

> ADR-0005 currently lives on the `docs-adr-0005-cma-on-cloudflare` branch (tardis [PR #170](https://github.com/rwinc/tardis/pull/170)). It will land at the link above once that PR merges to `develop`.

The ADR captures:

- Why Cloudflare (not Anthropic-managed) for our CMA provider
- The single-account deploy posture
- Validation plan and fork ownership

## Conventions

- **Commits**: Conventional Commits (`type(scope): description`). Enforced locally by a husky `commit-msg` hook running `commitlint` (config: `commitlint.config.js`, 72-char subject cap). Bypass with `git commit --no-verify` only for genuine edge cases — e.g. merge commits with upstream-shaped messages we can't rewrite, or emergency reverts. CI does not currently lint commit subjects; the local hook is the only enforcement layer.
- **Secrets**: via 1Password CLI or `wrangler secret put`. Never in code or `.dev.vars`-committed files. See `.dev.vars.example` for shape.
- **Don't rewrite upstream files** unless there's no other path. New behavior goes in new files.
- **Don't touch `README.md`** — that's upstream. Use `RICHWOOD.md` for Richwood-specific docs.
- **Tests**: `npm test` runs Vitest against the worker pool. Run before pushing.
- **Deploys**: `npm run deploy` (terminal flow) or git-based via the Deploy to Cloudflare button. Production deploys belong to the Richwood Cloudflare account.
  - **QA is the default.** Top-level `wrangler.jsonc` is the QA config (`name: cma-runtime-qa`). `npm run deploy` and `wrangler deploy` (no `--env` flag) target QA.
  - **No env blocks.** The fork intentionally does not use `[env.qa]` / `[env.production]` because `scripts/ensure-kv.mjs` and `scripts/ensure-d1.mjs` only read top-level config — env blocks would silently de-sync resource auto-provisioning. See the known trap below.
  - **Production is not yet wired.** `deploy-production.yml` is deferred until either prod gets its own top-level config (separate file or fork) or the ensure scripts learn about env blocks. Pushing to `main` does not deploy.

## Known traps

Non-obvious failure modes surfaced in past sessions. Read before changing config or doing cross-repo work.

- **Branch protection deadlocks solo work if `require_code_owner_reviews: true`.** GitHub treats that flag as a hard gate even when `required_approving_review_count: 0` — a CODEOWNER review is required, and the PR author can't approve their own PR. For a solo or single-maintainer repo, set `require_code_owner_reviews: false`. CODEOWNERS still auto-requests review as a notification; merge is gated by status checks only. Hit during issue #4 setup.
- **Upstream and this fork have overlapping PR numbers.** GitHub numbers PRs per-repo. `#8` in this fork is `CLAUDE.md`; `#8` upstream (`cloudflare/claude-managed-agents`) is a security PR. Always cite `repo#N` in commits, comments, and reviews — bare `#N` causes real cross-repo confusion. Hit when reviewer findings on upstream PRs were mistaken for findings on our fork.
- **`git merge upstream/main` can auto-close fork issues via `Fixes #N` in upstream commit messages.** GitHub parses close keywords using _this repo's_ numbering when commits land on the default branch, regardless of which repo authored the commit. An upstream commit whose body ends with `Fixes #14` (referring to upstream's `#14`) will close the fork's `#14` when the merge commit lands on `main`. Same root cause as the PR-number trap above — different surface. After every `git merge upstream/main`, scan `git log --grep='[FfCc][il][xo]es\? #' main..upstream/main` (or just the incoming commit list) for close keywords and reopen anything that auto-closed by mistake. Hit during the 2026-05-22 sync: our `#14` (commitlint wiring) was incorrectly closed by upstream commit `8eef70b` ("Fixes #14" → upstream's cf-tools fixture issue).
- **This repo is public — it cannot consume private `rwinc/meta` actions or reusable workflows.** GitHub Actions blocks a public repo from resolving an action in another, private repo, regardless of that repo's org access-level setting (`organization` access covers private/internal callers only — a public caller is excluded by design, since a fork could otherwise exfiltrate private action source). The symptom is `Unable to resolve action 'rwinc/meta', not found` at the runner's "Prepare actions" step. Any rw-meta-synced workflow that calls `rwinc/meta/.github/actions/...` (e.g. `codex-pr-review.yml`) is inert here until either rw-meta's relevant path is public or the action is mirrored somewhere public. Hit verifying #13 (Codex PR review). Note this is separate from whether the action _works_: the rw-meta `codex-review` action was also disabled org-wide on 2026-04-20.
- **`scripts/ensure-kv.mjs` and `scripts/ensure-d1.mjs` only read top-level `wrangler.jsonc` — not env blocks.** Both scripts regex-parse the file looking for `name`, `d1_databases[0].database_name`, and `kv_namespaces[*].binding`. They have no notion of `[env.qa]` / `[env.production]`. If you add env blocks and use `wrangler deploy --env qa`, the worker deploys under the env-block name but the ensure scripts will try to adopt/create resources under the **top-level** name — silently splitting the deployment across two names. That's why this fork uses top-level-as-QA and defers production until the scripts learn env semantics (or until prod gets its own top-level file). Hit while planning the first QA deploy (#5).

## When to look elsewhere

- **Upstream onboarding / architecture**: `README.md` and `AGENTS.md` (both upstream-owned, don't edit)
- **Validation plan**: `VALIDATION.md` (upstream-owned)
- **Tardis integration shape**: `rwinc/tardis` → `apps/api/src/providers/claude-managed-cloudflare/`
- **Writing style for docs / PRs / commits**: `rw-meta/practices/writing-style-guide.md`
