# /progress Command

Update progress tracking and documentation.

## Steps

1. **Review completed work**
   ```bash
   git log --oneline -5
   git diff --stat HEAD~3
   ```

2. **Update PROGRESS_TRACKER.md**
   - Mark completed tasks with [x]
   - Note any blockers
   - Add newly discovered tasks
   - Update milestone progress

3. **Update GitHub Issues** (if applicable)
   ```bash
   # Close completed issues
   gh issue close ISSUE_NUMBER --comment "Completed in commit abc123"

   # Add comments to in-progress issues
   gh issue comment ISSUE_NUMBER --body "Progress update: ..."
   ```

4. **Update feature docs** (if applicable)
   - Move completed features to appropriate status
   - Update implementation notes

5. **Commit progress update**
   ```bash
   git add docs/
   git commit -m "docs: Update progress tracker

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

## Progress Entry Format

```markdown
## Session: YYYY-MM-DD

### Completed
- [x] Task description (commit: abc123)
- [x] Another task (commit: def456)

### In Progress
- [ ] Ongoing task

### Blockers
- Issue description
- Waiting on: [dependency]

### Next Steps
- Planned task 1
- Planned task 2
```

## Milestone Update Format

```markdown
| Milestone | Progress | Status |
|-----------|----------|--------|
| v1.0.0 | 75% | On Track |
| v1.1.0 | 10% | Not Started |
```
