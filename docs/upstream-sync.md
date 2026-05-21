# Upstream sync — thin-fork workflow

This document is **Richwood-owned**. It describes how to pull updates from [`cloudflare/claude-managed-agents`](https://github.com/cloudflare/claude-managed-agents) into this fork without breaking Richwood customizations.

> Context: ADR-0005 commits this fork to a **thin** posture — Richwood changes live in new files, upstream files stay as-is. That's a behavior, not a config. This doc keeps the behavior honest.

## TL;DR

```bash
git fetch upstream
git checkout main
git merge upstream/main          # or: git rebase upstream/main
# resolve conflicts (ideally none)
npm install
npm test
git push origin main
```

If a conflict requires modifying an upstream-owned file, **stop**. See "When conflicts hit upstream files" below.

## File ownership at a glance

Upstream-owned (don't customize directly):

- `README.md`, `AGENTS.md`, `VALIDATION.md`
- `Dockerfile`, `LICENSE`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`
- `wrangler.jsonc`, `worker-configuration.d.ts`
- `package.json`, `package-lock.json`
- `src/`, `tests/`, `scripts/`, `migrations/`, `frontend/`
- `docs/` — _except this file and any other Richwood-added files in `docs/`_

Richwood-owned (free to edit):

- `CLAUDE.md`, `RICHWOOD.md`
- `docs/upstream-sync.md` (this file)
- `.claude/` (commands, skills, plugin settings)
- `.github/` (templates, workflows, dependabot)
- `.prettierignore` — Prettier ignore list that keeps the local hook off upstream files
- `commitlint.config.js` (once wired — see issue #14)
- The `<!-- RICHWOOD-ADDENDUM:START/END -->` block at the top of `README.md`

If a path isn't in either list, default to treating it as upstream-owned.

## Cadence

Pull upstream **weekly**, _and_ before starting any non-trivial customization PR.

Why both:

- **Weekly** keeps drift small. Small drift = easy merges.
- **Before customization** keeps your customization PR scoped to the change, not "the change + N weeks of upstream churn."

A Dependabot or scheduled-action sync is a reasonable future automation — until then, this is a manual discipline.

## The merge flow

### 1. Make sure your tree is clean

```bash
git status               # working tree should be clean
git checkout main
git pull origin main     # match the remote
```

### 2. Fetch upstream

```bash
git fetch upstream
git log --oneline main..upstream/main | head -20    # preview what's coming in
```

If `head -20` shows nothing, there's nothing to sync. Done.

### 3. Merge (or rebase)

**Default: merge.** Keeps history honest and preserves Richwood commits as a clear branch.

```bash
git merge upstream/main
```

**Alternative: rebase** if you want a linear history and there are no pushed Richwood commits since the last sync. Don't rebase if anyone else has pulled from `main` — you'll rewrite shared history.

```bash
git rebase upstream/main
```

### 4. Resolve conflicts

The thin-fork posture means conflicts should be **rare**. The common cases:

| Conflict location                     | What to do                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `README.md` (RICHWOOD-ADDENDUM block) | Keep the addendum block intact; accept upstream changes around it. The fenced HTML comments make this deterministic.              |
| Any other upstream file               | **Stop. Read "When conflicts hit upstream files".**                                                                               |
| A Richwood-owned file                 | Resolve normally — this is your code.                                                                                             |
| `package.json` / `package-lock.json`  | Take upstream's, then re-run `npm install` to re-add any Richwood deps (e.g. commitlint, husky). Commit the regenerated lockfile. |

### 5. Verify

```bash
npm install              # may pull in upstream's new deps
npm run typecheck
npm test
npm run build            # if it's plausible the change touched build config
```

If anything fails, the merge isn't done. Either fix forward (in a Richwood-owned file) or back out (`git merge --abort` / `git reset --hard origin/main`).

### 6. Push

```bash
git push origin main
```

If branch protection blocks direct push to `main` (see issue #4), open a PR for the merge.

## When conflicts hit upstream files

This is the hard case. A conflict in an upstream file means Richwood logic has crept into a file we said we wouldn't touch — _or_ upstream has changed in a way that breaks a Richwood expectation.

**The policy**: prefer upstreaming the fix to `cloudflare/claude-managed-agents` over carrying the delta locally.

Decision flow:

1. **Is the change generally useful?** Open a PR to `cloudflare/claude-managed-agents`. Land it there. Then your fork's sync becomes free.
2. **Is the change Richwood-specific?** Extract it into a new file (e.g. `src/richwood/<thing>.ts`) and import from upstream wire-up points if possible. If the change truly has to live in an upstream file, document it in `CLAUDE.md` under "known deltas" so the next maintainer doesn't lose context.
3. **Is upstream just wrong?** Sometimes the right answer is a temporary patch. Capture it as a `git format-patch` file under `patches/` so the delta is visible, applied deterministically, and easy to remove once upstream catches up.

If we accumulate more than ~2 deltas in upstream files, the thin-fork posture is no longer load-bearing — escalate to a discussion about whether we own the codebase outright.

## Tools that help

- `git diff main upstream/main -- <path>` — preview a single file's incoming changes
- `git log --oneline --no-merges main..upstream/main` — list incoming commits
- `git diff --stat HEAD~1` after merge — confirm scope
- `.prettierignore` — prevents the local Prettier hook from reformatting upstream files during edits

## Failure modes to watch for

- **Prettier silently reformats upstream files on edit.** The rw plugin's PostToolUse hook runs Prettier on every `.md` / `.ts` / `.json` / `.css` / `.js` edit. `.prettierignore` covers the known upstream paths, but if upstream adds a new file at a path the ignore list doesn't yet cover, the first edit can reformat it. Update `.prettierignore` whenever the upstream file inventory changes (notably new files under `docs/`).
- **Lockfile churn.** `npm install` regenerates `package-lock.json`. If you've added Richwood devDeps (commitlint, husky), they belong in the lockfile alongside upstream's. Don't strip them on sync.
- **`.dev.vars`-style secrets drift.** If `.dev.vars.example` changes upstream, mirror the new keys in your local `.dev.vars` _and_ in 1Password before deploying.

## When this doc is wrong

If a sync teaches you something this doc didn't anticipate — file an issue, or PR a fix to this file. The doc earns its keep by being current.
