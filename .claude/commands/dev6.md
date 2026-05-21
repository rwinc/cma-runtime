---
description: "VALIDATE — Second-user QA validation after merge to develop"
---

# /dev6 — VALIDATE

Second-user validation in QA. The builder does not validate their own work.

**Input required:** Issue number (PR must be merged to `develop`).

## Step 1: Confirm the merge

```bash
# Verify PR is merged
gh pr list --state merged --search "<issue-number>" --limit 5

# Verify develop has the changes
git fetch origin
git log origin/develop --oneline -5
```

If the PR hasn't been merged yet, stop: "PR not merged. Complete the review process in /dev5 first."

## Step 2: Confirm QA deployment

Check that the QA environment reflects the merged changes.

```bash
# Once autodeploy is configured, check deploy status here
# For now: manual verification
```

If QA deployment is manual, remind the developer to deploy:

```bash
# Deploy to QA (project-specific — check wrangler.toml for env names)
npx wrangler deploy --env qa
```

## Step 3: Prepare the validation handoff

Read the "done when" criteria from the /dev2 plan:

```bash
gh issue view <number>
```

Post a validation request comment on the issue:

```bash
gh issue comment <number> --body "$(cat <<'EOF'
## Ready for Validation (from /dev6)

**Merged to develop:** [commit or PR link]
**QA environment:** [URL or environment name]
**Risk tier:** [from /dev2]

### Validate these "done when" criteria:

- [ ] [criteria 1 from /dev2]
- [ ] [criteria 2 from /dev2]
- [ ] [criteria 3 from /dev2]

### Validation instructions:

1. Access QA at [URL]
2. Log in as [appropriate test user/role]
3. [specific steps to test each criterion]

### Edge cases to check:
- [based on /dev2 architectural notes]

**Validator:** must be someone other than the builder
**Validation window:** [X business days based on risk tier]

---
*Validation requested on [date]*
EOF
)"
```

## Step 4: Validator tests

The validator (not the builder) works through the checklist:

- Uses realistic or production-representative data
- Tests happy path AND edge cases from /dev2
- Tests with appropriate permissions (not admin-only)
- Checks loading, error, and empty states if UI change

## Step 5: Validator verdict

**If PASS:**
The validator comments on the issue:

```bash
gh issue comment <number> --body "Validated in QA on [date]. All 'done when' criteria met. Ready for production release."
```

The feature is now eligible for the next release PR (`develop` → `main`).

**If FAIL:**
The validator comments with specific feedback:

```bash
gh issue comment <number> --body "$(cat <<'EOF'
## Validation Failed

**What didn't pass:**
- [specific criterion that failed]
- [what was observed vs. expected]

**Steps to reproduce:**
1. [steps]

**Recommendation:** [fix needed before re-validation]
EOF
)"
```

On failure, the issue goes back to `/dev3` for fixes. The fix follows the same flow: `/dev3` → `/dev4` → `/dev5` → `/dev6`.

## Validation duration

| Risk     | Minimum time in QA |
| -------- | ------------------ |
| High     | 5-10 business days |
| Standard | 3-5 business days  |
| Low      | 1-3 business days  |

Do not rush validation. Features that have been in QA for less than the minimum should not be included in a release PR unless there's a documented reason.

## Release process (after validation passes)

Validated features are batched into release PRs:

```bash
# Create release PR from develop to main
gh pr create --base main --head develop \
  --title "release: vX.Y.Z" \
  --body "$(cat <<'EOF'
## Release vX.Y.Z

### Included
- #NNN — [feature/fix description] (validated [date])
- #NNN — [feature/fix description] (validated [date])

### Deployment Notes
- [any migrations, config changes, or coordination needed]
- [or "Standard deploy — no special steps"]
EOF
)"
```

Merging the release PR to `main` triggers production deployment.
