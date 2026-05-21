---
description: Audit project against Richwood development standards
---

# /verify

Two modes: **code** (default, runs before commits) and **repo** (full infrastructure audit).

## Mode: Code (default)

Verify staged/changed code against Richwood architectural standards. This runs automatically as part of `/commit`.

### What to check

Run `git diff --cached --name-only` (or `git diff --name-only` if nothing staged) to get changed files. Then check each applicable rule:

#### 1. CSS Architecture (if .css files changed)

- Tailwind v4: uses `@import "tailwindcss"` NOT `@tailwind` directives
- No `tailwind.config.js` (should use `@theme` in CSS)
- 3-layer tokens: components reference Layer 3 tokens, not Layer 1 primitives
- No hardcoded color values in components (use CSS custom properties or Tailwind classes)

#### 2. API Patterns (if route/handler files changed)

- Hono patterns: uses `c.json()`, `c.text()`, NOT `res.send()`, `res.json()`
- No Express patterns: no `(req, res, next)` signatures
- API envelope: lists return `{ data, cursor?, total? }`, mutations return `{ data, meta? }`
- Input validation: Zod `.safeParse()` at handler entry points, not raw `as Type` casts
- Parameterized D1 queries: `.prepare('...?').bind(val)`, never string concatenation

#### 3. Auth Patterns (if middleware/auth files changed)

- Uses auth-core imports, not custom JWT verification
- Capabilities checked via auth-core, not hardcoded role strings
- No `process.env` (Workers use `c.env`)

#### 4. React Patterns (if .tsx files changed)

- React 19: no `React.forwardRef`, no `useFormState` from react-dom
- Imports from `react-router` not `react-router-dom`
- TanStack Query v5: no `onSuccess`/`onError` on `useQuery`
- No `process.env.REACT_APP_*` (Vite uses `import.meta.env.VITE_*`)

#### 5. Testing (if src files changed without test files)

- Business logic changes should have corresponding test changes
- No `jest.fn()` / `jest.mock()` (use `vi.fn()` / `vi.mock()`)
- No mocking D1, R2, or KV (use real instances via vitest-pool-workers)

#### 6. Security (always)

- No secrets, tokens, API keys in code
- No `console.log` with sensitive data
- No `debugger` statements
- D1 queries use parameterized statements

#### 7. General

- Conventional commit message format
- No TODO/FIXME without issue reference (warn, not block)
- Files follow project structure conventions

### Output format

```
=== Pre-Commit Verify ===
[ok] CSS: 3-layer architecture
[ok] API: Hono patterns, no Express
[ok] API: Zod validation at boundaries
[warn] Testing: src/services/scheduler.ts changed but no test changes
[ok] Security: no secrets detected
[ok] React: v19 patterns
=== 6 passed, 1 warning ===
```

Warnings do not block the commit. Failures block until fixed.

---

## Mode: Repo (`/verify repo`)

Full infrastructure audit. Run periodically, not on every commit.

Check each item and report status:

1. **Branch structure**: Does the repo have both `develop` and `main` branches? Is `develop` the default?
2. **Branch protection**: Are both branches protected? Check via `gh api repos/rwinc/REPO/branches/main/protection` and `gh api repos/rwinc/REPO/branches/develop/protection`
3. **PR template**: Does `.github/PULL_REQUEST_TEMPLATE.md` exist?
4. **Issue templates**: Do `.github/ISSUE_TEMPLATE/bug.yml` and `feature.yml` exist?
5. **CI/CD**: Do `.github/workflows/pr-validation.yml`, `deploy-qa.yml`, and `deploy-production.yml` exist?
6. **Dependabot**: Does `.github/dependabot.yml` exist?
7. **Test framework**: Is vitest (CF Workers) or jest (Salesforce) configured?
8. **Coverage thresholds**: Does vitest.config.ts include coverage.thresholds?
9. **Commitlint**: Does `commitlint.config.js` exist? Is husky configured?
10. **Labels**: Check `gh label list` against standard set (severity:s1-s4, P1-P4, risk:high/medium)
11. **Deploy scripts**: Do `scripts/deploy-{dev,qa,production}.sh` exist?
12. **Health endpoint**: Does the API expose `/health`?
13. **Runbook**: Does `docs/runbooks/deployment.md` exist?

Output a compliance matrix and list specific gaps to fix.

Reference: `/root/share/projects/rw-meta/practices/sdlc.md`
