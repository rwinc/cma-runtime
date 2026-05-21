Sync standard labels across all Richwood GitHub repos.

For each repo in [Nexus, Leanview, vault, rwkb, qms, Horizon, Tradewind], ensure these labels exist:

**Type labels:**
- bug (color: d73a4a)
- enhancement (color: a2eeef)
- documentation (color: 0075ca)
- infrastructure (color: d4c5f9)
- security (color: e4e669)

**Priority labels:**
- P1-critical (color: b60205)
- P2-high (color: d93f0b)
- P3-medium (color: fbca04)
- P4-low (color: 0e8a16)

**Environment labels:**
- env:qa (color: c2e0c6)
- env:prod (color: f9d0c4)

**Risk labels:**
- risk:high (color: b60205)
- risk:medium (color: fbca04)

**Size labels:**
- size/small (color: c2e0c6)
- size/medium (color: fef2c0)
- size/large (color: f9d0c4)
- size/xl (color: e6e6e6)

**Status labels:**
- blocked (color: d73a4a)
- needs-info (color: d876e3)
- ready-for-review (color: 0e8a16)

Use `gh label create` for missing labels. Use `gh label edit` to fix colors on existing labels. Report what was created/updated per repo.
