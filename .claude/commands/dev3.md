---
description: "BUILD — Implement on a feature branch from develop"
---

# /dev3 — BUILD

Implement the planned work on a feature branch.

**Input required:** Issue number (must have a /dev2 plan comment).

## Step 1: Read the plan

```bash
gh issue view <number>
```

Load the /dev2 plan: task breakdown, risk tier, branch name, architectural notes. If no plan exists, stop: "This issue hasn't been planned. Run `/dev2 <number>` first."

## Step 2: Create the branch

```bash
git checkout develop
git pull origin develop
git checkout -b feat/<issue-number>-<short-description>
# Use fix/ prefix for bug fixes
```

Confirm the branch name matches what was specified in the /dev2 plan.

## Step 3: Implement

Work through the task list from /dev2 in order. For each task:

1. Implement the change
2. Verify the "done when" condition is met
3. Commit with a conventional commit message:

   ```
   <type>(<scope>): <description>

   Refs #<issue-number>
   ```

### Guardrails during implementation

The following Richwood stack and architecture skills are available as reference. Use them when the relevant technology is in play — they prevent common mistakes:

- **React 19**: `rw:stack-react19` — no forwardRef, no react-router-dom imports
- **Hono**: `rw:stack-hono` — not Express, use `c.json()` not `res.send()`
- **Zod**: `rw:stack-zod` — `.safeParse()` at handler boundaries
- **D1**: `rw:d1-schema-patterns` — parameterized queries, UUID PKs, Unix second timestamps
- **Tailwind v4**: `rw:stack-tailwind4` — CSS-first config, `@import "tailwindcss"`
- **TanStack Query v5**: `rw:stack-tanstack-query5` — no onSuccess/onError on useQuery
- **React Router v7**: `rw:stack-react-router7` — import from `react-router`
- **Vitest**: `rw:stack-vitest` — real D1/R2/KV instances, no mocking
- **API errors**: `rw:api-error-patterns` — standard error envelope, `apiError()`
- **Page templates**: `rw:page-templates` — standard page types from @rwinc/app-kit
- **Security**: `rw:security-middleware` — CORS, headers, rate limiting

These are not separate steps. They inform how code gets written.

## Step 4: Push the branch

```bash
git push -u origin feat/<issue-number>-<short-description>
```

## Exit condition

All tasks from the /dev2 plan are implemented and committed. Code compiles. Developer believes it's ready for review.

**Next step:** `/dev4 <issue-number>`
