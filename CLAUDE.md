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

The detailed sync workflow lives in `docs/upstream-sync.md` (TODO: issue #7).

## Richwood-specific files

Look here for customizations and Richwood context. Everything else is upstream's:

| Path                    | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `CLAUDE.md`             | This file — agent guardrails                              |
| `RICHWOOD.md`           | Fork ownership, Richwood README addendum (TODO: issue #1) |
| `.claude/`              | Skills, commands, and agent tooling synced from `rw-meta` |
| `.github/`              | Richwood PR/issue templates and workflows                 |
| `commitlint.config.js`  | Conventional Commits enforcement                          |
| `docs/upstream-sync.md` | Thin-fork sync workflow (TODO: issue #7)                  |
| `.github/CODEOWNERS`    | Review routing (TODO: issue #3)                           |

If a file isn't in this table, treat it as upstream-owned and leave it alone unless absolutely necessary.

## Decision context

The decision to deploy CMA on Cloudflare and fork this repo is recorded in **[Tardis ADR-0005](https://github.com/rwinc/tardis/blob/develop/docs/canonical/ADR/adr-0005-claude-managed-agents-on-cloudflare.md)** — read it before making structural changes.

> ADR-0005 currently lives on the `docs-adr-0005-cma-on-cloudflare` branch (tardis [PR #170](https://github.com/rwinc/tardis/pull/170)). It will land at the link above once that PR merges to `develop`.

The ADR captures:

- Why Cloudflare (not Anthropic-managed) for our CMA provider
- The single-account deploy posture
- Validation plan and fork ownership

## Conventions

- **Commits**: Conventional Commits (`type(scope): description`). Enforced by `commitlint`.
- **Secrets**: via 1Password CLI or `wrangler secret put`. Never in code or `.dev.vars`-committed files. See `.dev.vars.example` for shape.
- **Don't rewrite upstream files** unless there's no other path. New behavior goes in new files.
- **Don't touch `README.md`** — that's upstream. Use `RICHWOOD.md` for Richwood-specific docs.
- **Tests**: `npm test` runs Vitest against the worker pool. Run before pushing.
- **Deploys**: `npm run deploy` (terminal flow) or git-based via the Deploy to Cloudflare button. Production deploys belong to the Richwood Cloudflare account.

## When to look elsewhere

- **Upstream onboarding / architecture**: `README.md` and `AGENTS.md` (both upstream-owned, don't edit)
- **Validation plan**: `VALIDATION.md` (upstream-owned)
- **Tardis integration shape**: `rwinc/tardis` → `apps/api/src/providers/claude-managed-cloudflare/`
- **Writing style for docs / PRs / commits**: `rw-meta/practices/writing-style-guide.md`
