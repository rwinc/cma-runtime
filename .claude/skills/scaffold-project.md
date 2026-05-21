# Scaffold a New Richwood Project

> TRIGGER: creating a new project, scaffolding a repo, setting up a new app, initializing a new codebase.
> This skill MUST be used when creating any new Richwood project to ensure correct dependency versions.

## Why This Exists

Agents running bare `npm install <package>` without version specifiers install whatever is latest on npm. This causes version drift: TypeScript 6 in one project, 5.7 in another. Vite 8 here, Vite 6 there. The tooling-versions baseline exists to prevent this.

**Rule: Never run `npm install <package>` without a version specifier when scaffolding.**

## Step 1: Read the Baseline

Before installing any dependency, read `rw-meta/practices/tooling-versions.md` for the current baseline versions. The install commands below reflect the baseline as of 2026-03-30. If the baseline has been updated since, use the versions from the doc.

## Step 2: Install with Pinned Versions

### Workers Backend

```bash
npm i hono@^4.12.0 zod@^4.3.0
npm i -D wrangler@^4.78.0 @cloudflare/workers-types@^4.20260329.0 \
  vitest@^4.1.0 @cloudflare/vitest-pool-workers@^0.13.0 \
  typescript@^6.0.0 eslint@^10.1.0 prettier@^3.5.0 \
  husky@^9.1.0 lint-staged@^15.5.0 \
  @commitlint/cli@^19.0.0 @commitlint/config-conventional@^19.0.0
```

### Frontend

```bash
npm i react@^19.0.0 react-dom@^19.0.0 react-router@^7.13.0 \
  @tanstack/react-query@^5.90.0 lucide-react@^1.7.0 sonner@^2.0.0
npm i -D vite@^8.0.0 tailwindcss@^4.2.0 @tailwindcss/vite@^4.2.0 \
  vitest@^4.1.0 @testing-library/react@^16.0.0 \
  typescript@^6.0.0 eslint@^10.1.0
```

### Platform Integration

```bash
npm i @rwinc/platform-ui @rwinc/design-system @rwinc/auth-core
```

## Step 3: Agent Infrastructure

Copy from rw-meta shared resources:

```bash
# From project root
cp -r /path/to/rw-meta/shared/.claude/commands/ .claude/commands/
cp -r /path/to/rw-meta/shared/.claude/skills/ .claude/skills/
```

Or run the sync script:

```bash
/path/to/rw-meta/scripts/sync-to-project.sh /path/to/new-project
```

## Step 4: Required Files

Every project needs:

| File                       | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `CLAUDE.md`                | Agent instructions (use template from rw-meta)                      |
| `.nvmrc`                   | Contains `22` (Node version)                                        |
| `commitlint.config.js`     | `module.exports = { extends: ['@commitlint/config-conventional'] }` |
| `.gitignore`               | Node, CF Workers, OS files, credentials                             |
| `.editorconfig`            | Consistent formatting                                               |
| `docs/PROGRESS_TRACKER.md` | Single source of truth                                              |
| `docs/canonical/ADR/`      | Architecture Decision Records                                       |

## Step 5: Verify

After scaffold, verify versions match baseline:

```bash
# Check key versions
node -e "const p=require('./package.json'); const d={...p.dependencies,...p.devDependencies}; ['typescript','vite','vitest','eslint','zod','hono','wrangler'].forEach(k => console.log(k, d[k] || 'not installed'))"
```

## Packages to Never Install

| Package           | Why                            |
| ----------------- | ------------------------------ |
| Express           | Use Hono on CF Workers         |
| Redux             | Use TanStack Query             |
| Next.js           | Use Vite + React on CF Pages   |
| Prisma            | Use D1 raw SQL                 |
| styled-components | Use Tailwind v4                |
| moment / dayjs    | Use native Intl.DateTimeFormat |
| axios             | Use native fetch               |

## Reference

- Full version matrix: `rw-meta/practices/tooling-versions.md`
- GH repo template spec: `rw-meta/director/drafts/gh-repo-template-spec.md`
