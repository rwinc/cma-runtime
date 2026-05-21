---
description: "SHIP — Create PR targeting develop, then stop"
---

# /dev5 — SHIP

Create the PR and submit for review. Then stop. Do not merge.

**Input required:** Issue number (must have passed /dev4).

## Step 1: Ensure branch is pushed

```bash
git push origin $(git branch --show-current)
```

## Step 2: Gather context for the PR

```bash
# Risk tier and plan from /dev2
gh issue view <number>

# What changed
git diff develop...HEAD --stat

# Commit history on this branch
git log develop...HEAD --oneline
```

Extract from the /dev2 plan comment:

- Risk tier
- Task list (for the PR body)
- Architectural notes
- Review requirements

## Step 3: Determine PR size

Count changed lines:

```bash
git diff develop...HEAD --stat | tail -1
```

|  Lines  | Label         | Action                                        |
| :-----: | ------------- | --------------------------------------------- |
|  < 100  | `size/small`  |                                               |
| 100-400 | `size/medium` |                                               |
| 400-800 | `size/large`  | Warn: consider splitting                      |
|  > 800  | `size/xl`     | Must split unless migration or generated code |

## Step 4: Create the PR

```bash
gh pr create --base develop \
  --title "<type>(<scope>): <short description>" \
  --label "<risk-label>,<size-label>,<type-label>" \
  --body "$(cat <<'EOF'
## Summary

[2-3 sentences: what changed and why]

Closes #<issue-number>

## Risk Classification

**Tier:** [High / Standard / Low]
**Reason:** [from /dev2]

## Changes

- [bullet list of what was done, mapped to /dev2 tasks]

## Testing

- [how it was tested]
- [test output summary]

## Deployment Notes

- [any migration, config, or env changes needed]
- [or "None — standard deploy"]

## "Done When" Verification (from /dev2)

- [x] [criteria 1] — verified
- [x] [criteria 2] — verified
- [x] [criteria 3] — verified

---
Scoped, planned, and checked via Richwood /dev process
EOF
)"
```

## Step 5: Request reviewers

Based on risk tier from /dev2:

| Risk     | Reviewers   |
| -------- | ----------- |
| Low      | 1 reviewer  |
| Standard | 1 reviewer  |
| High     | 2 reviewers |

```bash
gh pr edit <pr-number> --add-reviewer <reviewer>
```

## Step 6: Report and stop

Output:

```
=== /dev5 Complete ===
PR:        <URL>
Risk:      <tier>
Size:      <label>
Reviewers: <names>
Base:      develop

Waiting for review. Do not merge until PR is approved and CI passes.
```

## What happens next

The PR is in the reviewer's hands. The developer can:

- Start a new `/dev1` on a different issue
- Address review feedback when it arrives
- When approved + CI green → merge to `develop` (squash merge)
- Merging to `develop` deploys to QA

**After merge to develop:** `/dev6 <issue-number>`

## Rules

- Do NOT merge without approval
- Do NOT merge with failing CI
- Squash merge to `develop`
- Do NOT push directly to `develop` or `main`
