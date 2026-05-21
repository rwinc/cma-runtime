# Richwood Shared Skills & Commands

> Canonical versions maintained in [rw-meta](https://github.com/rwinc/meta). Synced to project repos via `/refresh`.

## Commands (available in all projects)

| Command      | Purpose                                           | When to Use                                      |
| ------------ | ------------------------------------------------- | ------------------------------------------------ |
| `/commit`    | Create properly formatted conventional commit     | After completing a unit of work                  |
| `/learn`     | Analyze session, extract learnings, update docs   | After debugging sessions or discovering patterns |
| `/progress`  | Update progress tracker and documentation         | At task completion or status check               |
| `/refresh`   | Pull latest shared resources from rw-meta         | After rw-meta updates or context compaction      |
| `/verify`    | Audit project against SDLC standards              | Before PRs, after milestones, during audits      |
| `/standards` | Sync standard labels across GitHub repos          | When labels drift or new repos are created       |
| `/eod`       | End-of-day workflow (verify, PR, progress, learn) | End of each working session                      |

## Shared Skills (platform-wide knowledge)

| Skill                       | Domain         | Applies To                                                           |
| --------------------------- | -------------- | -------------------------------------------------------------------- |
| `architecture-checklist.md` | Quality        | All projects -- backend, frontend, security, deployment verification |
| `git-workflow.md`           | Process        | All projects -- branch strategy, PR workflow, commit format          |
| `d1-debugging.md`           | Database       | All D1 projects -- constraint errors, migrations, wrangler patterns  |
| `cloudflare-deploy.md`      | Infrastructure | All CF Workers projects -- Pages, Workers, D1 migrations, secrets    |
| `api-debugging.md`          | Backend        | All Hono/Workers APIs -- error patterns, type mismatches, CORS       |
| `css-architecture.md`       | Frontend       | All web frontends -- Tailwind v4, 3-layer token system, theming      |
| `responsive-design.md`      | Frontend       | All web frontends -- mobile-first, breakpoints, patterns             |
| `memgrid-usage.md`          | Memory         | All projects -- writing memories, search patterns, retrieval tools   |

## Project-Specific Skills (stay in their project repo)

These skills contain domain knowledge unique to one project and should NOT be centralized:

### LeanView

| Skill                            | Domain                                                         |
| -------------------------------- | -------------------------------------------------------------- |
| `leanview-api.md`                | LeanView API routes and data model                             |
| `leankit-data.md`                | LeanKit card structure and sync patterns                       |
| `mrp-*.md` (8 skills)            | MRP scheduling, cut lists, press routing, delivery projections |
| `traverse-data.md`               | Traverse ERP data structures                                   |
| `traverse-query-rules.md`        | Traverse API query patterns and limits                         |
| `nexus-integration.md`           | Nexus-to-LeanView data flow                                    |
| `press-scheduler-integration.md` | Press scheduling system integration                            |
| `user-preferences.md`            | LeanView user preference system                                |

### Nexus

| Skill                            | Domain                              |
| -------------------------------- | ----------------------------------- |
| `salesforce-data-model.md`       | SF object relationships for Nexus   |
| `salesforce-field-deployment.md` | SF metadata deployment patterns     |
| `salesforce-scratch-org.md`      | Scratch org setup for Nexus         |
| `traverse-sync.md`               | Traverse-to-D1 sync engine          |
| `traverse-middleware.md`         | Traverse OAuth middleware           |
| `traverse-query.md`              | Traverse API query patterns         |
| `sync-orchestrator.md`           | Multi-system sync orchestration     |
| `nexus-admin.md`                 | Admin dashboard specifics           |
| `d1-sf-debug.md`                 | D1-to-Salesforce debug patterns     |
| `raw-sf-sync-debug.md`           | Raw sync debugging                  |
| `d1-duplicate-cleanup.md`        | Duplicate record cleanup            |
| `field-parity-check.md`          | Cross-system field parity           |
| `leankit.md`                     | LeanKit integration from Nexus side |
| `adr012-production-migration.md` | ADR-012 migration specifics         |
| `commercient-migration.md`       | Legacy Commercient migration        |
| `admin-ui.md`                    | Admin UI components                 |

### Vault

| Skill                | Domain                      |
| -------------------- | --------------------------- |
| `vault-api.md`       | Vault API routes            |
| `vault-component.md` | Vault UI component patterns |
| `vault-hook.md`      | Vault React hooks           |

### KB

| Skill                | Domain                         |
| -------------------- | ------------------------------ |
| `cf-access/SKILL.md` | KB-specific CF Access patterns |
| `deploy/SKILL.md`    | KB deployment specifics        |

### Press Optimizer

| Skill                  | Domain                        |
| ---------------------- | ----------------------------- |
| `data-pipeline.md`     | Press optimizer data flow     |
| `layout-packing.md`    | 2D bin packing algorithms     |
| `scheduling-engine.md` | Press scheduling optimization |
| `deployment.md`        | Press optimizer deployment    |

## How Skills Work

Skills are markdown files that Claude Code loads as context when relevant. They contain:

- Domain knowledge that would otherwise require re-reading source code
- Patterns and anti-patterns learned from debugging sessions
- Technical constraints and gotchas specific to our stack
- Checklists and verification procedures

### Shared vs Project-Specific

**Shared skills** (in rw-meta) contain platform-wide knowledge: how we use Cloudflare, how we structure git workflows, how we debug D1. These are synced to every project.

**Project-specific skills** contain domain knowledge unique to one system: how LeanView's MRP engine works, how Nexus syncs Traverse data, how Vault handles file deduplication. These stay in their project.

### Adding a New Skill

1. Determine scope: shared (all projects) or project-specific (one project)
2. If shared: create in `rw-meta/shared/.claude/skills/`, run `sync-all.sh`
3. If project-specific: create in `{project}/.claude/skills/`
4. Follow the naming pattern: `{domain}-{topic}.md` (lowercase, hyphenated)
5. Include a clear header explaining what the skill covers and when to use it

### Updating Shared Skills

1. Edit the canonical version in `rw-meta/shared/.claude/skills/`
2. Run `./scripts/sync-all.sh --apply` to propagate
3. Commit both the rw-meta change and the synced project changes
