# Build log: #49 workers.dev private (2026-10-06)

Issue: rwinc/cma-runtime#49 (from ops#416, epic ops#221). Branch `fix/49-workers-dev-private` off `origin/develop` at `46c4644`.

## Red (test-first)

Test-only commit: `e26f128673201a66a6a7e698b0bfdbb8f8ced881` (`test: assert both wrangler configs pin workers_dev and preview_urls off (#49)`). It adds `tests/wrangler-config.test.ts` and nothing else.

Command, on the develop tree with only the test added: `npx vitest run tests/wrangler-config.test.ts`

Raw output (ANSI colour codes stripped, blank lines dropped):

```
 RUN  v3.2.4 /home/ss1/projects/cma-runtime/.claude/worktrees/fix-49-workers-dev-private
 ❯ tests/wrangler-config.test.ts (7 tests | 4 failed) 20ms
   ✓ parseJsonc > keeps comment-like sequences inside strings 3ms
   ✓ wrangler.jsonc > parses and names a cma-runtime worker 1ms
   × wrangler.jsonc > pins workers_dev to false 10ms
     → expected undefined to be false // Object.is equality
   × wrangler.jsonc > pins preview_urls to false 1ms
     → expected undefined to be false // Object.is equality
   ✓ wrangler.prod.jsonc > parses and names a cma-runtime worker 0ms
   × wrangler.prod.jsonc > pins workers_dev to false 1ms
     → expected undefined to be false // Object.is equality
   × wrangler.prod.jsonc > pins preview_urls to false 1ms
     → expected undefined to be false // Object.is equality
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/wrangler-config.test.ts > wrangler.jsonc > pins workers_dev to false
 FAIL  tests/wrangler-config.test.ts > wrangler.prod.jsonc > pins workers_dev to false
AssertionError: expected undefined to be false // Object.is equality
- Expected: 
false
+ Received: 
undefined
 ❯ tests/wrangler-config.test.ts:66:32
     64| 
     65|   it("pins workers_dev to false", () => {
     66|     expect(config.workers_dev).toBe(false);
       |                                ^
     67|   });
     68| 
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯
 FAIL  tests/wrangler-config.test.ts > wrangler.jsonc > pins preview_urls to false
 FAIL  tests/wrangler-config.test.ts > wrangler.prod.jsonc > pins preview_urls to false
AssertionError: expected undefined to be false // Object.is equality
- Expected: 
false
+ Received: 
undefined
 ❯ tests/wrangler-config.test.ts:70:33
     68| 
     69|   it("pins preview_urls to false", () => {
     70|     expect(config.preview_urls).toBe(false);
       |                                 ^
     71|   });
     72| });
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯
 Test Files  1 failed (1)
      Tests  4 failed | 3 passed (7)
   Start at  15:26:07
   Duration  536ms (transform 64ms, setup 0ms, collect 56ms, tests 20ms, environment 0ms, prepare 108ms)
```

Right reason: both files parse (the name assertions pass) and the four failures are the keys being absent (`undefined`), which is the issue's root cause.

## Green

After pinning `"workers_dev": false` and `"preview_urls": false` in both configs:

- `npx vitest run tests/wrangler-config.test.ts`: 1 file, 7 tests passed.
- `npm test`: 9 files, 159 tests passed.
- `npm run typecheck` (root and frontend `tsc --noEmit`): exit 0.
- No `lint` script exists in package.json (`npm run lint --if-present` in pr-validation is a no-op).

Wrangler's own config loader (wrangler 4.90.0, `unstable_readConfig`) reads the pinned keys. The KV `id` placeholders were set to a dummy value in a temp copy, because the committed `""` placeholders fail validation until `prebuild` patches them; that is pre-existing and unrelated:

```
wrangler.jsonc cma-runtime-qa workers_dev= false preview_urls= false
wrangler.prod.jsonc cma-runtime-prod workers_dev= false preview_urls= false
```

## Workflow assertion step

Both workflows parse with PyYAML. Steps after `Deploy Worker` in each: `['Assert workers.dev private', 'Build frontend', 'Deploy frontend']`. `HEALTH_URL` is gone from both env blocks; `WORKER_NAME` is `cma-runtime-qa` / `cma-runtime-prod`.

The step's `run` body was extracted from each YAML file and executed with `bash -e` against a stub `curl` on `PATH` returning hand-made payloads. Output for deploy-qa.yml; deploy-production.yml produced byte-identical output apart from the header line:

```
predicate: .success == true and .result.enabled == false and .result.previews_enabled == false
-- enabled=true previews=false -> exit 1
   Subdomain setting for cma-runtime-test: {"enabled":true,"previews_enabled":false}
   ::error::cma-runtime-test is not confirmed private — expected enabled=false and previews_enabled=false from the subdomain endpoint
-- enabled=false previews=true -> exit 1
   Subdomain setting for cma-runtime-test: {"enabled":false,"previews_enabled":true}
   ::error::cma-runtime-test is not confirmed private — expected enabled=false and previews_enabled=false from the subdomain endpoint
-- enabled=false previews=false -> exit 0
   Subdomain setting for cma-runtime-test: {"enabled":false,"previews_enabled":false}
   cma-runtime-test: workers.dev subdomain and preview URLs are off
-- result missing keys -> exit 1
   Subdomain setting for cma-runtime-test: {}
   ::error::cma-runtime-test is not confirmed private — expected enabled=false and previews_enabled=false from the subdomain endpoint
-- API 403 (curl --fail-with-body exit 22) -> exit 1
   ::error::Subdomain read failed for cma-runtime-test: [{"code":10000,"message":"Authentication error"}]
-- account id unset -> exit 1
   ::error::vars.CLOUDFLARE_ACCOUNT_ID is not set — cannot read the script subdomain setting
-- bare jq predicate on spec sample payloads
   enabled=true  -> jq exit 1
   both false    -> jq exit 0
   workflow predicate, enabled=true -> jq exit 1
   workflow predicate, both false   -> jq exit 0
```

## Live endpoint read (read-only, before merge)

A read-only `GET /accounts/{id}/workers/scripts/{name}/subdomain` with the dev-box Cloudflare token (not the CI token) at 2026-10-06 ~11:28 ET:

```
== cma-runtime-qa
{"success":true,"errors":[],"result":{"enabled":true,"previews_enabled":true}}
== cma-runtime-prod
{"success":true,"errors":[],"result":{"enabled":false,"previews_enabled":false}}
```

This confirms the endpoint and payload shape the step reads, confirms QA is public today (the step would fail on the current QA state), and confirms prod is private. Whether the CI `CLOUDFLARE_API_TOKEN` may read this endpoint is unverified until the first QA deploy after merge.

## grep

`grep -n workers.dev .github/workflows/*.yml` matches only the mandated step name `Assert workers.dev private`, its comments and its success message. No workers.dev URL and no `HEALTH_URL` value remain: `grep -n 'richwood\.workers\.dev' .github/workflows/*.yml` returns nothing.
