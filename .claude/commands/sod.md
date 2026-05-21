Start-of-day workflow. Pull latest code and check project health.

## Steps

### 1. Pull latest code

```bash
git fetch origin && git status
```

If on a feature branch, check if the base branch has moved ahead.

### 2. Quick health check

- Any open PRs? `gh pr list --state open`
- Any issues assigned to me? `gh issue list --assignee @me --state open --limit 10`
- Any failing CI? `gh run list --limit 3`

### 3. Report what changed

- Summarize new issues, PRs, or commits since last session
- Flag any blockers, failing CI, or items needing attention

### 4. Load project context

- Read `CLAUDE.md` for project instructions
- Read `docs/progress_tracker.md` for current status
- Check the current milestone: `gh api repos/{owner}/{repo}/milestones --jq '.[] | select(.state=="open") | .title + " — " + (.open_issues|tostring) + " open"'`
- Identify the next priority task

### 5. Summarize

Output a brief start-of-day report:

```markdown
## Start of Day — [Date]

### Repo Status

- **Branch**: [current branch] — [clean/dirty]
- **Open PRs**: [count]
- **Failing CI**: [count or "none"]

### Items Needing Attention

- [blockers, stale PRs, failing CI]

### Today's Priority

- [next task or issue to pick up]
```
