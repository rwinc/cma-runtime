# GitHub Workflow Skill

Git and GitHub operations for Richwood projects.

## Branch Strategy

```
main        - Production releases only
develop     - Integration branch (default)
feature/*   - New features
fix/*       - Bug fixes
```

Always branch from `develop`. Never push directly to `main`.

## Creating a Branch

```bash
# Ensure develop is up to date
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/file-upload

# Or for fixes
git checkout -b fix/share-link-expiry
```

## Commit Messages

Format:
```
<type>: <short description>

<optional body>

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `docs` - Documentation
- `chore` - Maintenance
- `test` - Tests

Examples:
```bash
git commit -m "feat: Add file upload with R2 signed URLs

Co-Authored-By: Claude <noreply@anthropic.com>"

git commit -m "fix: Handle expired share links gracefully

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Pull Requests

### Creating a PR

```bash
# Push branch
git push -u origin feature/file-upload

# Create PR via CLI
gh pr create --base develop --title "feat: Add file upload" --body "## Summary
- Implements init-upload and complete-upload endpoints
- Uses R2 signed URLs for direct upload

## Testing
- [ ] Upload small file
- [ ] Upload large file
- [ ] Handle upload failure"
```

### PR Template

```markdown
## Summary
Brief description of changes.

## Changes
- Change 1
- Change 2

## Testing
- [ ] Test case 1
- [ ] Test case 2

## Documentation
- [ ] Docs updated
- [ ] ADR written (if applicable)
```

## Code Review

```bash
# List open PRs
gh pr list

# Checkout PR for review
gh pr checkout 123

# Approve PR
gh pr review 123 --approve

# Request changes
gh pr review 123 --request-changes --body "Please fix X"
```

## Merging

```bash
# Merge PR (squash by default)
gh pr merge 123 --squash

# Delete branch after merge
git branch -d feature/file-upload
git push origin --delete feature/file-upload
```

## Issues

### Creating Issues

```bash
gh issue create --title "Bug: Share links expire too early" --body "## Description
Share links are expiring after 1 minute instead of configured time.

## Steps to Reproduce
1. Create share link
2. Wait 2 minutes
3. Try to access link

## Expected
Link should work for configured duration.

## Actual
Link expires after ~1 minute."
```

### Closing Issues

```bash
# Close with comment
gh issue close 42 --comment "Fixed in #45"

# Close via commit message
git commit -m "fix: Correct share link expiry calculation

Fixes #42

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Useful Commands

```bash
# View repo status
git status

# View recent commits
git log --oneline -10

# View diff
git diff

# Stash changes
git stash
git stash pop

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View PR status
gh pr status

# View workflow runs
gh run list
```

## Handling Conflicts

```bash
# Update develop
git checkout develop
git pull origin develop

# Rebase feature branch
git checkout feature/my-feature
git rebase develop

# If conflicts, resolve then:
git add .
git rebase --continue

# Force push (after rebase only)
git push --force-with-lease
```

## Emergency Rollback

```bash
# Revert a commit
git revert <commit-sha>

# Push revert
git push origin develop
```

Never use `git push --force` on `develop` or `main`.
