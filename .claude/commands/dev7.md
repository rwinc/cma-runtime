---
description: "CLOSE — Update issues, capture learnings, hand off"
---

# /dev7 — CLOSE

Close the loop. Update records, capture what was learned, hand off cleanly.

**Input required:** Issue number(s) worked on.

## Step 1: Update GitHub issues

```bash
# Check issue status
gh issue view <number>
```

For each issue worked on:

**If completed and validated (passed /dev6):**

```bash
gh issue close <number> --comment "Validated and merged. Deployed in release vX.Y.Z."
```

**If in progress (still in /dev3-/dev5):**

```bash
gh issue comment <number> --body "Status: [where things stand]. Current step: /dev[N]. Next: [what's left]."
```

**If blocked:**

```bash
gh issue comment <number> --body "Blocked: [what's blocking]. Need: [what would unblock it]."
```

## Step 2: Capture learnings

Ask the developer (or reflect if working with Claude):

1. **Did anything surprise you?** — Unexpected behavior, undocumented quirk, or assumption that turned out wrong.
2. **Did a pattern emerge?** — Something done here that should become standard across projects.
3. **Did guidance mislead?** — A skill, doc, or CLAUDE.md instruction that gave wrong or outdated advice.
4. **Did the /dev2 plan miss something?** — Work that wasn't anticipated during planning.

If the answer to any of these is yes, update the appropriate file:

| Learning type        | Update target                             |
| -------------------- | ----------------------------------------- |
| Architecture pattern | `docs/canonical/architecture/` or new ADR |
| Common pitfall       | Project CLAUDE.md or relevant skill file  |
| Tool/stack behavior  | `.claude/skills/stack-*.md`               |
| Integration quirk    | `docs/canonical/integrations/`            |
| Process improvement  | `/root/share/projects/rw-meta/practices/` |

Use the learning entry format:

```markdown
### [Issue Title]

**Problem:** [what went wrong or was discovered]
**Root Cause:** [why]
**Solution:** [how it was handled]
**Prevention:** [what changes to prevent recurrence]
**Date:** [today]
```

Commit any learning updates:

```bash
git add docs/ .claude/
git commit -m "docs: capture learning from #<issue-number>

<brief description of the learning>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Step 3: Update progress tracker

If the project has `docs/PROGRESS_TRACKER.md`, add a session entry:

```markdown
### [Date] — [Developer]

**Issues:** #NNN, #NNN
**Completed:** [what shipped]
**In progress:** [what's still open, at which /dev step]
**Learnings:** [brief, or "none"]
```

## Step 4: Handoff summary

Produce a summary for the next session (or for the team):

```markdown
## Session Summary — [Date]

### Completed

- #NNN — [what shipped, current status]

### In Progress

- #NNN — at /dev[N], [what's left]

### Blocked

- #NNN — [blocker and what would unblock]

### Learnings Captured

- [brief description, or "none"]

### Next Priority

- #NNN — start at /dev[N]
```

## When to run /dev7

- **End of a feature:** after /dev6 validation passes
- **End of a session:** even if work is mid-stream — capture state for the next session
- **After a bug fix:** especially if a learning emerged

## What this replaces

This consolidates the close-out portions of `/learn` and `/eod`. Those commands still work standalone:

- `/learn` — for capturing a single learning mid-session
- `/eod` — for full end-of-day wrap across all work (runs /dev7 implicitly for each active issue)
