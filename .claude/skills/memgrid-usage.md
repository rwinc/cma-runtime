---
description: "Memgrid semantic memory — tool usage, memory kinds, writing patterns, and retrieval strategies. Use when calling memgrid MCP tools (write_memory, search_semantic, etc.), capturing decisions, or managing project knowledge."
---

# Memgrid — Developer Usage Guide

Memgrid is Richwood's semantic memory system. It stores, searches, and governs knowledge with vector embeddings, confidence decay, contradiction detection, and lifecycle management.

## Connection

Local MCP server via `op run` (secrets from 1Password, never on disk):

```json
{
  "mcpServers": {
    "memgrid": {
      "command": "op",
      "args": [
        "run",
        "--env-file",
        "op-secrets.env",
        "--",
        "npx",
        "tsx",
        "packages/mcp-server/src/index.ts"
      ]
    }
  }
}
```

Requires `op-secrets.env` with `op://` references for DATABASE_URL, OPENAI_API_KEY, MEMGRID_TENANT_ID.

## GitHub vs Memgrid — What Goes Where

GitHub captures **artifacts** — the code, the issue, the PR, the review comment. Structured, searchable by ID.

Memgrid captures **context** — why we chose this over that, what surprised us, what pattern worked, what constraint we discovered. Searchable by meaning.

| What happened                | GitHub has it        | What we learned                                                    | Memgrid captures it |
| ---------------------------- | -------------------- | ------------------------------------------------------------------ | ------------------- |
| PR #96 merged                | Commit, diff, review | False positives worse than duplicates — design shifted mid-plan    | `decision`          |
| Deployed to prod             | Issue #92 closed     | Prod and dev need separate Neon databases                          | `framework`         |
| Wired secrets via 1Password  | `.mcp.json` in repo  | `op item create` from CLI doesn't work in our container env        | `note`              |
| Code review caught a bug     | PR comment           | Dedup query must exclude self — same pattern as findContradictions | `framework`         |
| Integration tests skip in CI | Issue #95            | Mock-only CI for SQL-heavy code provides false confidence          | `framework`         |

**The rule: if a future Claude session would make a better decision knowing this, write it to memgrid.** If it's just a record of what happened, GitHub already has it.

## When to Write Memories

Write when meaningful information surfaces that a future conversation would need:

| Kind        | What to capture                                 | Example                                  |
| ----------- | ----------------------------------------------- | ---------------------------------------- |
| `decision`  | Design choices, strategic plans                 | "Chose Postgres over Mongo for X reason" |
| `framework` | Mental models, principles, recurring approaches | "Always validate at system boundaries"   |
| `reference` | Personal facts, dates, contacts                 | "Mortgage payoff target is March 2028"   |
| `note`      | Milestones, status changes, completions         | "Deployed v2 of the API to production"   |
| `task`      | Action items, follow-ups (decays fast)          | "Need to rotate API keys by Friday"      |

### When NOT to Write

- Code snippets or diffs (they's in git)
- Debugging details or transient errors
- Information already in project docs or CLAUDE.md
- Trivial or obvious facts

## Writing Patterns

### write_memory

Standard memory capture. Idempotent by content hash.

```
write_memory(
  content: "Chose detect-and-flag over write-suppression for semantic dedup. A false positive (swallowed write) is worse than a duplicate.",
  kind: "decision",
  project: "memgrid",
  tags: ["architecture", "dedup"]
)
```

### write_decision

Structured decisions with rationale and alternatives. Use for choices that should be findable later.

```
write_decision(
  title: "Semantic dedup: detect-and-flag, not suppress",
  decision: "Flag near-duplicates with derived_from edge instead of preventing creation",
  rationale: "False positive cost (silently swallowed write) exceeds duplicate cost (fixable by compaction)",
  alternatives: ["Suppress writes on cosine >= 0.95", "Quarantine for human review"],
  project: "memgrid"
)
```

### write_session_summary

End-of-session capture. Idempotent per project per hour.

```
write_session_summary(
  content: "Completed M4.4 semantic dedup. All milestones M0-M4 done.",
  project: "memgrid",
  decisions: ["Detect-and-flag over write-suppression"],
  next_steps: ["Deploy to production", "Begin M5 scoping"]
)
```

## Claim Types

When writing, classify the epistemological type:

| Type           | Meaning                               | Example                                       |
| -------------- | ------------------------------------- | --------------------------------------------- |
| `empirical`    | Falsifiable facts, measurements       | "Water boils at 100C at sea level"            |
| `normative`    | Principles, values, should-statements | "Teams should use trunk-based development"    |
| `experiential` | Observations, personal experience     | "The deploy process felt chaotic last Friday" |

Claim type enables smarter contradiction handling — two normative claims can coexist, but contradicting empirical claims need resolution.

## Searching

### search_semantic

Vector similarity search. Best for finding memories by meaning.

```
search_semantic(query: "why did we choose postgres", limit: 5)
```

With explain mode for debugging retrieval:

```
search_semantic(query: "dedup strategy", explain: true)
```

### search_layered

Cascading search: repo scope -> project scope -> global. Use when you want scoped results with fallback.

```
search_layered(query: "deployment process", project: "memgrid", repo: "memgrid")
```

### Filtering

Both search tools support filters:

- `kind`: note, decision, framework, reference, task
- `claim_type`: empirical, normative, experiential
- `source`: mcp, api, slack, session
- `project`, `repo`: scope to specific project

## Retrieval Tools

### get_current_belief

Topic-level belief snapshot. Shows what the system currently believes about a topic, with provenance and contradiction surfacing.

```
get_current_belief(topic: "database choice for memgrid")
```

### get_memory / get_neighborhood

Retrieve a specific memory by ID, or get its temporal neighbors and graph edges.

### get_graph

Explore the memory graph from any anchor. Shows relationships: supports, contradicts, derived_from, supersedes.

## Memory Management

### supersede_memory

When a belief changes, supersede the old memory instead of discarding:

```
supersede_memory(old_id: "...", new_id: "...", reason: "Updated after load testing results")
```

The old memory is archived with a pointer to the new one. The chain is walkable.

### discard_memory

Soft-delete with reason. Use for memories that are wrong, not just outdated:

```
discard_memory(id: "...", reason: "Incorrect — was based on stale data")
```

### review_contradictions

Surface conflicting memories. Run periodically or when investigating a topic:

```
review_contradictions(project: "memgrid")
```

## Semantic Dedup

When a memory is created that closely matches an existing memory from a different source (cosine >= 0.95), the system flags it:

- Memory is still created (no writes suppressed)
- `derived_from` edge links new memory to the near-duplicate
- `semantic_dedup_flagged` event logged
- Caller sees `nearDuplicateOf` in the response

Use `force_create: true` to bypass detection when you know content is intentionally similar.

## Scoring

Retrieval ranking combines:

```
score = salience * confidence * feedback_boost
salience = similarity * trust_weight
confidence = base_confidence * exp(-lambda * decay_factor * months)
```

- **Trust weights**: trusted (1.0), user_owned (0.9), unknown (0.6), external (0.4)
- **Decay**: decisions/frameworks decay slowly (~2 years to halve), tasks decay fast
- **Feedback**: `rate_result` positive/negative signals boost or suppress results over time

## Project Scoping

Always set `project` when writing. This enables layered search and keeps memories organized:

```
write_memory(content: "...", project: "memgrid")
write_memory(content: "...", project: "nexus")
write_memory(content: "...", project: "leanview")
```

## End-of-Session Memory Extraction

Run this checklist before `write_session_summary`. Review the conversation for each category and write memories for anything a future session would need.

### 1. Decisions made

Did we choose between alternatives? Write a `write_decision` with rationale and what was rejected.

Ask: _would a future session re-evaluate this choice without knowing why we made it?_

### 2. Patterns discovered

Did we learn a reusable approach or anti-pattern? Write as `kind: framework`.

Ask: _would a future session hit the same wall or repeat the same mistake?_

### 3. Constraints found

Did we hit an environment limitation, API behavior quirk, or schema constraint? Write as `kind: note` with `claim_type: empirical`.

Ask: _is this discoverable from code alone, or only from running into it?_

### 4. Corrections from review

Did code review or testing catch something non-obvious? Write as `kind: framework`.

Ask: _is the fix in the code obvious enough, or does the reasoning need to be preserved?_

### 5. Strategic direction

Did scope, philosophy, or architecture shift? Write as `kind: decision` or `kind: framework`.

Ask: _did we change course in a way that affects future work?_

### Filter

For each candidate: _would a future Claude session make a different decision without this memory?_

- **Yes** — write it to Memgrid
- **No, it's in the code/docs** — skip
- **No, it's just what happened** — GitHub has it, skip

Then call `write_session_summary` with decisions, state, and next_steps.

## Health and Observability

### insights

Memory health reports: kind distribution, staleness, trust breakdown.

### retrieval_analytics

Query patterns, hit rates, latency, zero-result queries. Use to tune retrieval.

### rate_result

After a search, signal whether results were useful:

```
rate_result(search_log_id: "...", memory_id: "...", signal: "positive")
```
