---
description: "PLAN — Break work into tasks with 'done when' criteria"
---

# /dev2 — PLAN

Break scoped work into tasks with acceptance criteria. Classify risk. Surface architectural concerns before code.

**Input required:** Issue number (must have a /dev1 scope comment).

## Step 1: Read the scoped issue

```bash
gh issue view <number>
```

Confirm the /dev1 scope comment exists. If not, stop: "This issue hasn't been scoped. Run `/dev1` first."

Read the scope: problem, in/out of scope, "done when" criteria, risk flags.

## Step 2: Propose task breakdown

Break the work into atomic tasks. Propose the list, then ask the developer: "Does this breakdown match how you'd approach it? Anything missing or over-split?"

Each task gets:

```markdown
- [ ] Task description
      **Done when:** [specific, verifiable condition]
      **Files likely touched:** [paths]
```

Guidelines:

- Keep tasks small — if a task would take more than a few hours, split it.
- Order tasks by dependency (what has to exist before the next task can start).
- Include test tasks alongside implementation tasks, not as an afterthought.

## Step 3: Classify risk tier

Scan the likely files and systems. Apply the SDLC risk classification:

| Risk         | Criteria                                                                                                                 | Review                                | Validation               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | ------------------------ |
| **High**     | Auth, permissions, D1 schema, shared packages (`@rwinc/*`), external integrations (Salesforce, Traverse), financial data | 2 reviewers, no self-approve          | 5-10 business days in QA |
| **Standard** | New features, new API routes, UI with data mutations                                                                     | 1 reviewer + 1 tester (not builder)   | 3-5 business days in QA  |
| **Low**      | UI-only, docs, config, dev tooling, non-data refactors                                                                   | 1 reviewer, self-approve after review | 1-3 business days in QA  |

Default to Standard. Escalate to High if ANY high-risk criteria apply. Drop to Low only if no data mutations, no auth, no integrations, and fully reversible.

State the classification and why. If the developer disagrees, discuss — but err toward higher risk.

## Step 4: Surface architectural concerns

Based on risk flags from /dev1 and the task breakdown, raise concerns. **Do not skip this even for Low risk.** Ask the relevant questions:

**If permissions are involved:**

- What roles need access? What's the least-privilege model?
- Are we adding new capabilities or extending existing ones?
- Where does the check happen — middleware, handler, or UI?
- How do we test with different permission levels?

**If an external integration is involved:**

- What's the contract? What data goes out, what comes back?
- What happens when the external system is unavailable? Timeout? Retry? Fallback?
- Who is the source of truth for this data?
- Is this a new integration or extending an existing service layer?

**If a schema change is involved:**

- What's the migration SQL? Forward-only — reverse migration prepared?
- Data volume on affected tables — will this lock?
- Does existing data need a backfill?
- Does this need a CHECK constraint or index?

**If a new API endpoint:**

- Zod schema defined for input validation?
- Response shape follows standard envelope (`{ data, cursor?, total? }` for lists, `{ data, meta? }` for mutations)?
- If list endpoint: pagination and filtering approach?
- If write endpoint: idempotency needed?

**If a new UI surface:**

- Which page template applies? (reference `rw:page-templates`)
- Loading, error, and empty states defined?
- Does this need responsive behavior?

If no concerns apply, say so: "Straightforward implementation — no architectural flags."

## Step 5: Post the plan

Add the plan as a comment on the GitHub issue:

```bash
gh issue comment <number> --body "$(cat <<'EOF'
## Plan (from /dev2)

**Risk tier:** [High / Standard / Low] — [one-line reason]
**Branch:** `feat/<issue-number>-<short-description>` (or `fix/` for bugs)
**Tasks:** [count]

### Task Breakdown

- [ ] Task 1
  **Done when:** [criteria]
  **Files:** [paths]

- [ ] Task 2
  **Done when:** [criteria]
  **Files:** [paths]

- [ ] Task 3
  **Done when:** [criteria]
  **Files:** [paths]

### Architectural Notes

[Concerns from step 4, or "None — straightforward implementation"]

### Review Requirements

- Reviewers needed: [1 or 2]
- Validation duration: [X business days in QA]
- Self-approve eligible: [Yes/No]

---
*Planned on [date]*
EOF
)"
```

## Exit condition

Plan is posted to the issue. Developer confirms the task list, risk classification, and review requirements. If High risk, confirm who the second reviewer will be.

**Next step:** `/dev3 <issue-number>`
