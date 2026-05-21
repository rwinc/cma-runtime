# /eod — End of Day

Wrap up the day's work: commit loose changes, update issues, capture learnings, and produce a handoff summary.

## Instructions

### 1. Gather State

```bash
# What branch are we on?
git branch --show-current

# Any uncommitted work?
git status

# Today's commits
git log --oneline --since="6am"
```

### 2. Commit Any Loose Changes

If there are uncommitted changes:

- Stage relevant files (never `git add -A`)
- Commit with a descriptive message referencing issue numbers
- Push to the appropriate branch

If there are untracked files that shouldn't be committed, note them in the summary.

### 3. GitHub Issue Hygiene

```bash
# Open issues assigned to me
gh issue list --assignee @me --state open --limit 10
```

For each issue worked on today:

- **Completed** → Close with commit reference
- **In progress** → Add a comment with current status
- **Blocked** → Add a comment explaining the blocker

Check: any work done today without an issue? Create retroactive issues if needed.

### 4. Create PR (if needed)

If there are commits ready for review or merge:

- Check if a PR already exists for the current branch
- If not, create one targeting the appropriate base branch
- If one exists, update its description with today's additions

### 5. Run /verify

Execute `/verify` to check today's work against Richwood architectural standards:

- Architecture compliance (approved stack, correct patterns)
- Convention compliance (no hardcoded secrets, consistent patterns)
- API patterns (Hono, response envelope, parameterized D1 queries)
- Security (no secrets, no debug statements)
- Test coverage (business logic changes have corresponding tests)

If issues are found, fix them before proceeding. Commit fixes.

### 6. Update Progress Tracker

Update `docs/progress_tracker.md` with a session entry for today:

- **Completed**: what shipped, with commit/issue references
- **In Progress**: ongoing work and current status
- **Blockers**: anything stalled and why
- **Next Steps**: what to pick up tomorrow

Commit and push the update.

### 7. Run /learn

Review the session for learnings worth capturing:

- Mistakes or debugging loops → update CLAUDE.md or skills
- New patterns discovered → update practices or skills
- Integration quirks → update canonical docs
- Architectural decisions → create or update ADRs

Only capture learnings that are durable and non-obvious. Skip if nothing worth recording.

### 8. Memgrid Memory Extraction (if memgrid MCP is connected)

Review the conversation for:

1. **Decisions made** — write as `write_decision` with rationale and rejected alternatives
2. **Patterns discovered** — write as `kind: framework`
3. **Constraints found** — write as `kind: note`, `claim_type: empirical`
4. **Corrections from review** — write as `kind: framework`

Filter: _would a future Claude session make a different decision without this?_ If yes, write it. If no, skip.

Before writing, `search_semantic` for each candidate to check for existing memories. If a similar memory exists and is outdated, use `supersede_memory` instead of creating a duplicate.

Finally, call `write_session_summary` with project, decisions, state, and next_steps.

### 9. Produce Handoff Summary

Output a summary:

```markdown
## EOD Summary — [Date]

### Completed Today

- [Bullet list of what shipped, with issue numbers]

### In Progress

- #NNN — [status, what's left]

### PRs

- [PR URL] — [status: open/merged/approved]

### Issues Closed

- #NNN, #NNN, #NNN

### Blockers / Needs Attention

- [anything that needs follow-up]

### Tomorrow's Priority

- #NNN — [what to pick up first]
```

## Quick Checklist

- [ ] All code committed and pushed
- [ ] Code verified against architecture (/verify)
- [ ] No work without a GitHub issue
- [ ] Completed issues closed with commit references
- [ ] In-progress issues have status comments
- [ ] PR created if commits are ready
- [ ] Progress tracker updated with session entry
- [ ] Session learnings captured (if any)
- [ ] Memgrid memories extracted (if MCP connected)
- [ ] Handoff summary produced
- [ ] No secrets or sensitive data in commits
