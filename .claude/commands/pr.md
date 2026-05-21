---
description: Create a pull request with pre-flight verification
---

# /pr

Create a pull request with automated pre-flight checks, risk classification, and proper labeling.

## Workflow

### Step 1: Pre-flight verification

Run the full verification suite before creating the PR:

1. **Tests**: `npm test` (or `npm run test:coverage` if available) — must pass
2. **Type check**: `npm run typecheck` — must pass
3. **Lint**: `npm run lint` — must pass
4. **Git state**: all changes committed, branch pushed to origin

If any check fails, stop and report. Do not create the PR.

### Step 2: Determine base branch and direction

| Current branch pattern                                            | PR targets | Type       |
| ----------------------------------------------------------------- | ---------- | ---------- |
| `feature/*`, `fix/*`, `chore/*`, `refactor/*`, `test/*`, `docs/*` | `develop`  | Feature PR |
| `develop`                                                         | `main`     | Release PR |
| `hotfix/*`                                                        | `main`     | Hotfix PR  |

If the branch targets the wrong base, warn and confirm before proceeding.

### Step 3: Classify risk

Scan the changed files (`git diff develop...HEAD --name-only` or `git diff main...HEAD --name-only`) and classify:

| If changes touch...                             | Risk       | Label         |
| ----------------------------------------------- | ---------- | ------------- |
| D1 migrations, schema changes                   | **High**   | `risk:high`   |
| Auth, permissions, middleware                   | **High**   | `risk:high`   |
| Shared packages (`@rwinc/*`)                    | **High**   | `risk:high`   |
| Salesforce, Traverse, external API integrations | **High**   | `risk:high`   |
| Cross-app service bindings                      | **High**   | `risk:high`   |
| New API routes, data mutations                  | **Medium** | `risk:medium` |
| UI with business logic                          | **Medium** | `risk:medium` |
| UI-only, docs, config, dev tooling              | **Low**    | (no label)    |

If **High**: note that 2 reviewers are required per SDLC.

### Step 4: Determine size

Count changed lines (`git diff develop...HEAD --stat | tail -1`):

| Lines changed | Label                                             |
| :-----------: | ------------------------------------------------- |
|     < 100     | `size/small`                                      |
|    100-400    | `size/medium`                                     |
|    400-800    | `size/large` — suggest splitting                  |
|     > 800     | `size/xl` — must split unless migration/generated |

### Step 5: Create PR

Use `gh pr create` with:

- **Title**: Short, imperative (`Add user permissions`, `Fix scheduler timeout`)
- **Body**: Use the PR template format (Summary, Type, Testing, Deployment, Author/Reviewer checklists)
- **Labels**: risk label + size label + type label (enhancement/bug/etc.)
- **Base branch**: determined in Step 2

```bash
gh pr create --base develop --title "..." --body "..." --label "enhancement,size/medium"
```

### Step 6: Report

Show:

- PR URL
- Risk classification and reviewer requirements
- Size assessment
- Any warnings from pre-flight

## For Release PRs (develop → main)

When creating a release PR:

1. List all commits since last release: `git log main..develop --oneline`
2. Title: `release: vX.Y.Z`
3. Body: changelog of all included features/fixes
4. Label: appropriate risk level based on aggregate changes
