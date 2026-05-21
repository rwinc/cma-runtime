---
description: "SCOPE — Select and sharpen work before writing code"
---

# /dev1 — SCOPE

Select work from GitHub milestones/issues and interrogate the scope until it's sharp enough to plan.

**This step is conversational. Ask one question at a time. Push back on vague answers.**

## Step 1: Pull context

Determine the repo name from the current directory, then pull milestone and issue context:

```bash
# What milestones exist?
gh api repos/rwinc/REPO/milestones --jq '.[] | "\(.number) \(.title) — \(.open_issues) open"'

# Open issues in the current or selected milestone
gh issue list --milestone "<milestone>" --state open --limit 20
```

If no milestone is obvious, ask the developer which milestone they're working in.

If the developer already knows the issue number, skip to Step 3.

## Step 2: Select issue(s)

Present the open issues. Ask: "Which issue are you picking up?"

If the issue body is thin or vague, say so: "This issue doesn't have enough detail to scope. Let's sharpen it before we start."

Read the full issue:

```bash
gh issue view <number>
```

## Step 2.5: Assign the issue

Once the developer confirms which issue they're picking up, assign it to them:

```bash
gh issue edit <number> --add-assignee @me
```

This signals to the team that work is in progress.

## Step 3: Interrogate the scope

Ask these **one at a time**. Do not dump them as a list. Wait for the answer before asking the next. Offer suggested answers when you can infer them from the issue body.

1. **"What problem does this solve?"**
   Push for one sentence. If the developer says "it adds X feature" — ask "what breaks or hurts without it?"

2. **"Who is affected?"**
   User role, workflow, or system. Not "everyone."

3. **"What's in scope?"**
   Specific deliverables. Suggest what you think is in scope based on the issue, let them confirm or correct.

4. **"What's explicitly NOT in scope?"**
   This prevents creep. Suggest likely temptations based on the issue. Example: "The issue mentions filtering — are we doing sorting too, or is that separate?"

5. **"What does done look like?"**
   Push for observable outcomes. Reject implementation descriptions.
   - Bad: "Add a date filter component"
   - Good: "User can filter work orders by date range, results update without page reload, empty state shown when no results match"

## Step 4: Flag risks

Based on the scope conversation, check for risk flags. Ask about any that apply:

- **Permissions/auth?** → "This touches user access. What roles need this? Any new capabilities?"
- **External system?** (Salesforce, Traverse, LeanKit) → "This involves [system]. What happens if it's down?"
- **Shared package?** (`@rwinc/*`) → "This changes a shared package. Which apps consume it?"
- **Schema change?** (D1 migration) → "This needs a database change. High risk by default."
- **New data entity?** → "Where is the source of truth for this data?"

If no flags apply, note "No risk flags" and move on.

## Step 5: Post the scope

Update the GitHub issue with a comment containing the scoped output:

```bash
gh issue comment <number> --body "$(cat <<'EOF'
## Scope (from /dev1)

**Problem:** [one sentence from step 3.1]
**Affected:** [from step 3.2]
**In scope:**
- [from step 3.3]

**Not in scope:**
- [from step 3.4]

**Done when:**
- [observable outcomes from step 3.5]

**Risk flags:** [from step 4, or "None"]

---
*Scoped on [date]*
EOF
)"
```

## Exit condition

Scope is posted to the issue. Developer confirms it's accurate. If scope can't be defined clearly, the issue needs more information — do not proceed to /dev2.

**Next step:** `/dev2 <issue-number>`
