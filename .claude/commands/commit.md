---
description: Create conventional commits with branch strategy
---

# /commit

Create a properly formatted commit with pre-commit architecture verification.

## Workflow

### Step 1: Run /verify (code mode)

Before committing, verify the changed code against Richwood architectural standards. Run the code-mode checks from `/verify`:

1. Get changed files: `git diff --cached --name-only` (or `git diff --name-only`)
2. Check applicable rules based on file types (CSS architecture, API patterns, React patterns, security, testing)
3. Report results in the standard format
4. **Failures block the commit.** Warnings are noted but do not block.

If verify finds failures, show the issues and stop. Do not proceed to commit.

### Step 2: Stage changes

Review unstaged changes with `git status` and `git diff`.
Stage the relevant files. Prefer specific file adds over `git add -A`.

### Step 3: Create commit

#### Branch Strategy

```
main        - Production releases only
develop     - Integration branch (default)
feature/*   - New features
fix/*       - Bug fixes
hotfix/*    - Urgent production fixes
```

Always branch from `develop`. Never push directly to `main`.

#### Commit Message Format

```
<type>(<scope>): <short description>

<optional body explaining why, not what>

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### Types

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `docs` - Documentation
- `chore` - Maintenance
- `test` - Tests
- `perf` - Performance improvements
- `ci` - CI/CD changes

#### Scopes (per project, from SDLC)

| Project  | Scopes                                                         |
| -------- | -------------------------------------------------------------- |
| Nexus    | traverse-sync, orchestrator, middleware, admin, d1, salesforce |
| LeanView | api, ui, scheduler, mrp, auth, d1                              |
| Vault    | api, r2, auth, ui                                              |
| KB       | api, auth, ui, chat                                            |

### Step 4: Verify commit succeeded

Run `git log --oneline -1` to confirm the commit was created.

## Pre-Commit Checklist (verified by /verify)

- [ ] Architecture patterns followed (CSS layers, Hono not Express, Zod validation)
- [ ] Tests pass
- [ ] No console.log/debugger in production code
- [ ] No hardcoded secrets or credentials
- [ ] Parameterized D1 queries (no string concatenation)
- [ ] React 19 patterns (no forwardRef, no react-router-dom)
- [ ] Documentation updated if behavior changed
