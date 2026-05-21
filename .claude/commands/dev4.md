---
description: "CHECK — Self-review and quality gate before PR"
---

# /dev4 — CHECK

Self-review and quality gate. Catches problems before a reviewer has to. Nothing moves forward if this step fails.

**Input required:** Issue number (must have a /dev2 plan).

## Step 1: Run the verification suite

```bash
npm test
npm run typecheck
npm run lint
```

If ANY of these fail, stop. Fix the failures before proceeding. Do not skip checks.

### Dependency audit (if packages changed)

If `package.json` or `package-lock.json` is in the diff:

```bash
# Check for vulnerabilities
npm audit --omit=dev

# Verify Node engine constraints in transitive deps vs CI
grep -r "node-version\|NODE_VERSION" .github/workflows/ 2>/dev/null
```

- Report audit result in the /dev4 output and include it in the PR description.
- If transitive deps raised their `engines.node` floor, confirm CI and dev environments meet it.
- High/critical vulnerabilities block. Moderate is a warning.

## Step 2: Run architectural verification

Execute the `/verify` code-mode checks against changed files:

```bash
# Get the list of changed files
git diff develop...HEAD --name-only
```

Check each applicable rule against changed files:

- **CSS Architecture** — Tailwind v4: `@import "tailwindcss"` not `@tailwind`. No hardcoded colors. 3-layer tokens.
- **API Patterns** — Hono (`c.json()`, not `res.send()`). Zod `.safeParse()` at boundaries. Parameterized D1 queries.
- **Auth Patterns** — auth-core imports, capability checks, no hardcoded role strings, no `process.env`.
- **React Patterns** — React 19 (no forwardRef), `react-router` (not `react-router-dom`), TanStack Query v5 (no onSuccess/onError on useQuery).
- **Testing** — Business logic changes have corresponding test changes. No mocking D1, R2, or KV.
- **Security** — No secrets/tokens in code. No `console.log` with sensitive data. No `debugger` statements.

Report results:

```
=== /dev4 Check ===
[ok]   CSS: Tailwind v4 patterns
[ok]   API: Hono patterns, Zod validation
[warn] Testing: src/services/scheduler.ts changed but no test changes
[ok]   Security: clean
```

Warnings do not block. Failures block.

## Step 3: Review the diff

```bash
git diff develop...HEAD --stat
git diff develop...HEAD
```

Check:

- Does this match the plan from /dev2? Any scope creep?
- Are there files changed that shouldn't be?
- Is the change size reasonable? (Under 400 lines preferred, over 800 must split unless migration/generated)

## Step 4: Check observability (Standard+ risk only)

For Standard and High risk changes, verify:

- New endpoints have structured logging (JSON, with request context)?
- Error paths return the standard error envelope?
- Health check endpoint still works?

Skip this step for Low risk changes.

## Step 5: Verify "done when" criteria

Read the /dev2 plan:

```bash
gh issue view <number>
```

For each task's "done when" statement, verify it's met with evidence — not "I think so." Run the code, check the output, grep for the implementation.

Report:

```
=== Plan Alignment ===
[ok] Task 1: "User can filter by date range" — verified: DateFilter component renders, API accepts date params
[ok] Task 2: "Empty state shown when no results" — verified: EmptyState renders when data.length === 0
[ok] Task 3: "Tests cover filter logic" — verified: 4 test cases in scheduler.test.ts
=== 3/3 tasks verified ===
```

## Step 6: Final report

```
=== /dev4 Summary ===
Tests:       47 passed, 0 failed
Typecheck:   clean
Lint:        clean
Verify:      7 checks passed, 1 warning
Diff:        142 lines changed across 6 files
Plan:        3/3 tasks verified
Risk tier:   Standard
=== Ready for /dev5 ===
```

If everything passes: "Ready for `/dev5 <issue-number>`"

If anything fails: show what failed, suggest fixes, and say "Fix these issues, then re-run `/dev4 <issue-number>`"

## Gate behavior

This step blocks forward progress. Do not suggest proceeding to /dev5 if there are failures. Warnings are acceptable — note them but allow continuation.
