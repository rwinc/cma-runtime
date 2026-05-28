# Richwood notes for cma-runtime

This is a **Richwood fork** of [`cloudflare/claude-managed-agents`](https://github.com/cloudflare/claude-managed-agents) (MIT). The upstream `README.md` and `AGENTS.md` describe the project as a whole — this file describes what is Richwood-specific.

## Why this fork exists

This repo backs the `ClaudeManagedCloudflareProvider` in [`rwinc/tardis`](https://github.com/rwinc/tardis). Tardis is provider-neutral; CMA-on-Cloudflare is one provider option among several. Forking gives Richwood a known-good control plane we can patch, observe, and extend without waiting on upstream releases.

Decision context: **[Tardis ADR-0005 — Claude Managed Agents on Cloudflare as a provider option](https://github.com/rwinc/tardis/blob/develop/docs/canonical/ADR/adr-0005-claude-managed-agents-on-cloudflare.md)**.

> ADR-0005 currently lives on the `docs-adr-0005-cma-on-cloudflare` branch (tardis [PR #170](https://github.com/rwinc/tardis/pull/170)). The link above resolves once that PR merges to `develop`.

## Thin-fork policy

This fork is intentionally **thin**:

- Richwood customizations live in **new files** (e.g. this one, `CLAUDE.md`, `.claude/`, `.github/`).
- Upstream files (`README.md`, `AGENTS.md`, `VALIDATION.md`, `src/`, `tests/`, `wrangler.jsonc`, etc.) stay as-is unless there's no other path.
- If a change has to touch an upstream file, prefer upstreaming the fix to `cloudflare/claude-managed-agents` over carrying a delta.
- We pull upstream weekly, or before any non-trivial customization PR. Conflicts on a thin fork should be rare — when they aren't, that's a signal we've drifted.

The detailed sync workflow lives in [`docs/upstream-sync.md`](./docs/upstream-sync.md).

## What lives where

| Path                    | Owner    | Purpose                                                 |
| ----------------------- | -------- | ------------------------------------------------------- |
| `README.md`             | Upstream | Project overview, onboarding, architecture              |
| `AGENTS.md`             | Upstream | Cloudflare Workers / agent SDK notes                    |
| `VALIDATION.md`         | Upstream | Upstream's validation plan                              |
| `src/`, `tests/`, etc.  | Upstream | Code and tests for the control plane                    |
| `RICHWOOD.md`           | Richwood | This file — fork ownership + relationship to Tardis     |
| `CLAUDE.md`             | Richwood | Agent guardrails (thin-fork policy, conventions)        |
| `docs/upstream-sync.md` | Richwood | Thin-fork sync workflow                                 |
| `.claude/`              | Richwood | Skills, commands, and agent tooling synced from rw-meta |
| `.github/`              | Richwood | Richwood PR/issue templates and workflows               |
| `.github/CODEOWNERS`    | Richwood | Review auto-request routing                             |
| `.prettierignore`       | Richwood | Keeps local Prettier hook off upstream-owned files      |
| `commitlint.config.js`  | Richwood | Conventional Commits enforcement (pending issue #14)    |

## Relationship to Tardis

```
rwinc/tardis (orchestrator)
  └── apps/api/src/providers/claude-managed-cloudflare/
         └── talks to → rwinc/cma-runtime (this repo, deployed to Richwood CF)
```

Tardis dispatches agent sessions to this control plane. This repo's job is to run those sessions on Cloudflare — sandboxes, egress controls, observability — and emit normalized events back to Tardis.

## Runbooks

Operational procedures for working with the deployed runtime. More will land here as they're encoded.

- [`docs/runbooks/r2-token-mint.md`](./docs/runbooks/r2-token-mint.md) — mint a Cloudflare R2 API token via the dashboard (wrangler can't) and rotate the keys onto the `cma-runtime-qa` / `cma-runtime-prod` workers.

## For agents working in this repo

Read **`CLAUDE.md`** first. It encodes the thin-fork posture, upstream sync workflow, and conventions in a form designed for agent consumption.
