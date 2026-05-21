# /learn Command

Analyze the current session and update documentation based on learnings.

## Purpose

After encountering issues, debugging problems, or discovering new patterns, use this command to:
1. Document what was learned
2. Update relevant documentation
3. Prevent the same issues in the future

## Steps

1. **Identify the learning**
   - What problem was encountered?
   - What was the root cause?
   - What was the solution?

2. **Categorize the learning**
   - Architecture pattern
   - Common pitfall/gotcha
   - Tool-specific behavior
   - Integration quirk
   - Performance consideration

3. **Update appropriate documentation**

   **For architecture patterns:**
   - Add to `docs/canonical/architecture/` or relevant ADR

   **For common pitfalls:**
   - Add to CLAUDE.md under appropriate section
   - Consider adding to `/verify` checklist

   **For tool-specific issues:**
   - Add to relevant skill file in `.claude/skills/`

   **For integration quirks:**
   - Add to `docs/canonical/integrations/`

4. **Commit the learning**
   ```bash
   git add docs/ .claude/
   git commit -m "docs: Add learning - [brief description]

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

## Learning Entry Format

```markdown
### [Issue Title]

**Problem**: Brief description of what went wrong

**Root Cause**: Why it happened

**Solution**: How it was fixed

**Prevention**: How to avoid in the future

**Date**: YYYY-MM-DD
```

## Example

```markdown
### API Timeout Not Handled

**Problem**: Sync job failed silently when external API timed out

**Root Cause**: No timeout configured on fetch request, default was too long

**Solution**: Added 30s timeout with retry logic

**Prevention**:
- All external API calls must have explicit timeout
- Added to /verify checklist

**Date**: 2026-01-15
```
