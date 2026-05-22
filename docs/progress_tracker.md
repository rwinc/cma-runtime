# Progress tracker — rwinc/cma-runtime

Session-by-session log of what's been done, what's open, and what to pick up next. Richwood-owned; not synced with upstream.

---

## 2026-05-21 — Day 1: Foundation

### Completed

- **Thin-fork posture established.** ADR-0005 (in tardis #170, pending merge) commits this fork to a thin posture — Richwood changes live in new files, upstream files stay as-is.
- **Agent guardrails in place.** `CLAUDE.md` (PR #8, closes #2) lays out the thin-fork policy, upstream-sync workflow, Richwood file map, ADR-0005 link, and conventions for any agent working in this repo.
- **Fork ownership documented.** `RICHWOOD.md` (PR #9, closes #1) covers fork ownership, the thin-fork file map, the relationship to Tardis (`ClaudeManagedCloudflareProvider`), and the ADR-0005 forward reference. `README.md` gets a 4-line addendum banner fenced with HTML comments so upstream syncs can preserve or strip it deterministically.
- **Upstream-sync workflow doc.** `docs/upstream-sync.md` (PR #15, closes #7) — TL;DR commands, cadence (weekly + before customization PRs), conflict-resolution policy, and "what to do when upstream files conflict" decision tree.
- **Richwood tooling synced.** `.claude/commands/`, `.claude/skills/`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*.yml`, `.github/dependabot.yml`, `.github/workflows/pr-validation.yml`, and `.gitignore` updates (PR #10).
- **CODEOWNERS routing.** `.github/CODEOWNERS` (PR #16, closes #3) auto-requests `@rwinc/richwood-sr-dev` on every PR. Approval is not required for merge — gate is status checks only.
- **Branch protection on `main`.** Configured via API (closes #4). 0 required approving reviews, `Validate` status check required (strict/up-to-date), no force pushes, no branch deletion, required conversation resolution. Initially had `require_code_owner_reviews: true` — caused a deadlock for solo work (PR author can't approve their own PRs), corrected to `false`.
- **Prettier ignore for upstream files.** `.prettierignore` (PR #19, closes #11) lists every upstream-owned path so the rw-plugin's PostToolUse Prettier hook can't reformat them. This is tooling enforcement of the thin-fork policy. PR #9 motivated it — the Prettier hook silently reflowed 41 lines of upstream README prose on a single banner edit and dropped a `>` blockquote prefix.
- **CI test-skip workaround.** Surfaced 3 latent test failures in `tests/cf-tools.test.ts` (upstream tests reference a `RESPONDY` VPC binding that doesn't exist in upstream's committed config; upstream has no test CI so the breakage went undetected). Skipped via vitest `--testNamePattern '^(?!.*case-insensitive binding).*$'` in our Richwood-owned `pr-validation.yml`. Tracked in #17 locally and `cloudflare/claude-managed-agents#14` upstream.
- **Upstream review feedback.** Reviewed three upstream PRs (#8, #12, #15) on `cloudflare/claude-managed-agents` and filed substantive comments — static-asset auth bypass, committed account-specific resource IDs, vitest peer-dep mismatch. Tracked locally in #18 so the next `git merge upstream/main` doesn't blindly inherit any unfixed defects.

### In Progress

None — all today's PRs landed.

### Open

- **#5** Initial deploy to Richwood CF (QA) — needs Cloudflare credentials + naming decisions
- **#6** Smoke a CMA session end-to-end — depends on #5
- **#12** Wire deploy workflows — depends on #5 + branch-model decision
- **#13** Enable Codex PR review — needs `OPENAI_API_KEY` org secret
- **#14** Wire commitlint deps + husky
- **#17** Drop cf-tools test-skip when upstream fix lands
- **#18** Tracker: do not merge upstream PRs #8/#12/#15 as-is

Filed upstream: `cloudflare/claude-managed-agents#14` (cf-tools test fixture).

### Blockers

- Deploy track (#5 → #6 → #12) gates on Cloudflare credentials and naming decisions only the user can make.
- Codex review (#13) gates on `OPENAI_API_KEY` org-level secret.

### Untracked gaps from /verify repo

- Vitest coverage thresholds missing (upstream's config has no coverage block).
- Standard label set incomplete — missing `severity:s1-s4`, `P1-P4`, `risk:high/medium`.
- No deployment runbook (`docs/runbooks/deployment.md`).

Worth filing as small issues when there's bandwidth; not blocking.

### Next Steps

- **#14 (commitlint)** is small, no external dependencies, removes a TODO from the file map. Good Day-2 warm-up.
- **#5 (QA deploy)** is the unlocker for #6 / #12 / health endpoint / runbook — biggest impact, needs your credentials.
- Watch upstream `cloudflare/claude-managed-agents` PRs #8, #12, #15 (and #14, the issue I filed). When any of those land or close, update #18.

---

## 2026-05-22 — Day 2: Sync, commitlint, workspace cleanup

### Completed

- **Upstream sync + cf-tools test-skip dropped.** PR #22 (closes #17) merged `upstream/main` into our `main` — incoming: `cloudflare/claude-managed-agents` PR #17 (the cf-tools fixture fix mocking `VPC_BINDINGS`, resolving upstream `#14`) and PR #18 (egress policy fingerprint hash). Clean merge, no conflicts — all changes in upstream-owned paths. With the fixture fixed, the Richwood-local `--testNamePattern` exclusion in `pr-validation.yml` was removed; the full vitest suite (152 tests, 8 files) passes with no skip. Merged with a merge commit (not squash) to keep upstream history visible on `main`.
- **Commitlint wired.** PR #23 (closes #14) added `@commitlint/cli`, `@commitlint/config-conventional`, `husky` as devDependencies, a `prepare: husky` script, and a `.husky/commit-msg` hook running commitlint. The rw-meta-synced `commitlint.config.js` arrived as CommonJS (`module.exports`), which Node's ESM loader rejects because `package.json` declares `"type": "module"` — rewritten as ESM (`export default`). `CLAUDE.md` updated: TODO dropped from the file-map row, `.husky/` added, `--no-verify` bypass documented. Hook verified live — it caught an over-100-char commit body and a non-standard `wip:` type during this session.
- **Workspace cleanup.** PR #24 added `.agents/` to `.gitignore` (per-machine agent-skill working area, not source) and landed `.github/workflows/codex-pr-review.yml` (rw-meta-synced thin caller; narrow `if:` verified — fired `SKIPPED` on PR #24 itself). The two deploy workflows (`deploy-qa.yml`, `deploy-production.yml`) were stashed to branch `wip/deploy-workflows-issue-12` rather than landed, since they trigger on branch push and would no-op or block on environment gates until #12 is executed.
- **Issue tracker hygiene.** #18 updated — upstream PR #15 closed without merging, checklist item ticked, status comment added (upstream #8/#12 still open). #14 was spuriously auto-closed by upstream commit `8eef70b` ("Fixes #14") during the #22 sync — reopened with an explanatory comment, then closed legitimately by PR #23.
- **Known traps captured.** `CLAUDE.md` gained two entries: (1) `git merge upstream/main` can auto-close fork issues via `Fixes #N` keywords in upstream commit messages; (2) this public repo cannot consume private `rwinc/meta` actions.

### In Progress

None — PRs #22/#23/#24 all merged. `wip/deploy-workflows-issue-12` branch parked for #12.

### Open

- **#5** Initial deploy to Richwood CF (QA) — needs Cloudflare credentials + naming decisions
- **#6** Smoke a CMA session end-to-end — depends on #5
- **#12** Wire deploy workflows — drafts stashed on `wip/deploy-workflows-issue-12`; needs CF creds + env config
- **#13** Enable Codex PR review — workflow wired, secret set, but blocked (see Blockers)
- **#18** Tracker: do not merge upstream PRs #8/#12 as-is (#15 resolved)

### Blockers

- Deploy track (#5 → #6 → #12) gates on Cloudflare credentials and naming decisions only the user can make.
- **Codex review (#13) is double-blocked.** The `OPENAI_API_KEY` org secret is now set, but: (1) `cma-runtime` is public and cannot resolve the private `rwinc/meta` action — a hard GitHub policy, not a config miss; (2) the `rwinc/meta` `codex-review` action was disabled org-wide on 2026-04-20 (Seth Stoll) pending a Codex rework. Recommend holding #13 until the rw-meta rework lands. Full diagnosis in the #13 comment thread.

### Untracked gaps from /verify repo (carried from Day 1)

- Vitest coverage thresholds missing (upstream's config has no coverage block).
- Standard label set incomplete — missing `severity:s1-s4`, `P1-P4`, `risk:high/medium`. Can be synced via the `/standards` skill.
- No deployment runbook (`docs/runbooks/deployment.md`).

Still worth filing as small issues when there's bandwidth; not blocking.

### Next Steps

- **#5 (QA deploy)** remains the biggest unlocker — gates #6, #12, the health endpoint, and the runbook. Needs your Cloudflare credentials + naming decisions.
- **`/standards`** — sync the missing label set from rw-meta. Small, no external deps; good warm-up.
- **Upstream test-CI offer** — `cloudflare/claude-managed-agents` has no `npm test` workflow (root cause of the cf-tools breakage shipping). Worth a courtesy PR adding one.
- Watch upstream PRs #8 and #12; update #18 when either resolves.
