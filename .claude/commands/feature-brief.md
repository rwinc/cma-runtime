---
description: "SCOPE a multi-issue feature into versioned slices before creating issues"
---

# /feature-brief — Feature Scoping

Scope a feature or epic into versioned slices (v1.0, v1.1, v1.2+) with clear boundaries before any issues are created.

**This step is conversational. Ask one question at a time. Push back on vague answers. The goal is a written brief that prevents scope creep and headlong building.**

Use this when the work:

- Spans more than 3-5 issues
- Involves more than one person
- Touches more than one system or repo
- Will take more than one sprint
- Came from a conversation where someone said "can we build..."

For single issues, use `/dev1`. For architectural decisions, use an RFC.

## Step 1: Identify the feature

Ask: **"What feature are we scoping?"**

If the developer gives a name and one-liner, accept it. If they start describing implementation, stop them: "Hold on — what problem does this solve for the user? Not how we'd build it."

Capture:

- **Feature name** (short, becomes the epic label)
- **Who asked for it** (name + role — not "someone mentioned")
- **What triggered it** (pain point, conversation, business need)

## Step 2: Define the problem

Ask: **"What is broken, slow, missing, or painful today?"**

Push for the user's perspective, not the builder's. One paragraph max.

- Bad: "We need a tablet interface for data capture"
- Good: "Rubber shop scrap data is captured on paper after the fact — counts are late, incomplete, and trends are invisible until someone pulls a manual report"

If the developer cannot articulate the problem clearly, that is a signal the feature is not ready to scope.

## Step 3: Identify users

Ask: **"Who uses this, and what changes for them?"**

Build a table. Push for specifics — not "management" but "shift leads checking production status."

| Who | How they work today | What changes |
| --- | ------------------- | ------------ |

At least 2 rows. If only one user benefits, it might be a single issue, not a feature.

## Step 4: Slice into versions

This is the most important step. The conversation is not "what do we build" — it is **"what is in v1.0 and what is not."**

### v1.0 — Minimum Useful Version

Ask: **"What is the smallest version that ships value on its own?"**

Push hard here. If the developer describes a full system, ask: "If we stopped after v1.0 and never built anything else, would users still benefit?"

For v1.0, capture:

**User stories** — ask one at a time:

- "As a [role], I can [action] so that [outcome]"
- Keep asking "what else is essential?" until the developer says "that's it"
- For each story that sounds like a v1.1, say so: "That sounds like it builds on the core — can v1.0 ship without it?"

**Done means** — observable, testable criteria:

- Reject implementation descriptions ("add a component")
- Accept outcomes ("operator can submit a scrap count in under 10 seconds")

**Explicitly NOT in v1.0** — this is where scope creep dies:

- Ask: "What will people expect that is NOT in v1.0?"
- Ask: "What is the most tempting thing to add that we should defer?"
- List every deferred item. This is a contract.

**Effort estimate** — ask for a gut estimate, then add 50%.

**Risk tier** — classify per SDLC (High / Standard / Low). State the criteria that apply.

### v1.1 — First Extension

Ask: **"After v1.0 is validated, what is the first thing we would add?"**

Lighter detail than v1.0:

- 1-2 user stories
- Done-when criteria
- What must be true before v1.1 starts (v1.0 validated, dependency resolved, etc.)

### v1.2+ — Future ideas

Ask: **"What other ideas came up that we should park, not forget?"**

Bullet list only. These are not commitments. They exist so good ideas survive without creating pressure to build them now.

## Step 5: Map systems and dependencies

Ask: **"What systems does this touch?"**

Build a table:

| System | What it provides | What it needs | Owner |
| ------ | ---------------- | ------------- | ----- |

Then check:

- **Integration points** — what sends data where?
- **New infrastructure** — D1 tables, R2 buckets, KV, CF Access, service bindings, crons?
- **Open questions** — things nobody knows the answer to yet. List them explicitly. Unanswered questions are the number one source of mid-build surprises.

## Step 6: Assign people

Ask: **"Who builds, reviews, validates, and accepts this?"**

| Role        | Person | Responsibility                                   |
| ----------- | ------ | ------------------------------------------------ |
| Builder     |        | Writes the code                                  |
| Reviewer    |        | Reviews PRs (default: @franksaysno)              |
| Validator   |        | Tests in QA — must not be the builder (per SDLC) |
| Stakeholder |        | Accepts or rejects the outcome                   |

If the validator is "TBD," push: "Who will actually test this? If we do not name someone, nobody will."

## Step 7: Surface risks

Ask: **"What could kill this or make it take 3x longer?"**

Prompt with common risks:

- Auth model (especially for shared devices or new user types)
- External system dependencies (APIs that may not exist)
- Connectivity or environment constraints (shop floor, mobile)
- User adoption (if it is annoying to use, people will not use it)
- Scope creep from enthusiastic stakeholders
- Conflict with current sprint commitments

For each risk, ask: "What do we do about it?"

Set the **"too long" signal**: "If v1.0 takes more than \_\_\_ weeks, we stop and re-scope."

## Step 8: Write the brief

Create the brief file in the project's docs:

```bash
mkdir -p docs/features
```

Write the completed brief to `docs/features/<feature-slug>.md` using the template structure from `rw-meta/practices/feature-brief.md`.

Include at the top:

```markdown
> Status: **DRAFT** — Needs approval before issues are created
> Created: [date]
> Last updated: [date]
```

## Step 9: Approval gate

Present the brief summary and ask:

> **Before we create issues, confirm:**
>
> - [ ] Builder and stakeholder agree on v1.0 scope
> - [ ] "NOT in v1.0" list reviewed — nothing critical was deferred
> - [ ] Risk tier assigned and validation plan matches SDLC
> - [ ] Effort estimate reviewed (with 50% buffer)
> - [ ] Feature does not conflict with current sprint commitments
> - [ ] Open questions identified — who will answer them and by when?

If any checkbox cannot be checked, stop. The feature is not ready for issues.

## Exit condition

Brief is written to `docs/features/`. Developer confirms it is accurate and complete.

If approved:

1. Create a GitHub milestone or label for the feature
2. Break v1.0 into issues (each scoped to under 400 lines changed)
3. Each issue gets a scope checklist via `/dev1` before work starts
4. Do not create v1.1 issues until v1.0 is validated in production

**Next step:** Create milestone, then `/dev1` on the first issue.
