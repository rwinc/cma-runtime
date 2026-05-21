Look up current API documentation for Richwood's tech stack.

Usage: /stack-docs <library> [topic]

## Available Libraries

| Library        | Directory       | Covers                                               |
| -------------- | --------------- | ---------------------------------------------------- |
| cloudflare     | cloudflare/     | Workers runtime, D1, R2, KV, Wrangler, Pages         |
| hono           | hono/           | Routing, middleware, context, CF Workers integration |
| react          | react/          | React 19 hooks, components, patterns                 |
| tailwind       | tailwind/       | v4 CSS-first config, utilities, theming              |
| tanstack-query | tanstack-query/ | useQuery, useMutation, QueryClient, cache            |
| react-router   | react-router/   | v7 routing, loaders, actions, navigation             |
| zod            | zod/            | Schema validation, parsing, types                    |
| vitest         | vitest/         | Testing config, matchers, CF pool workers            |
| jose           | jose/           | JWT sign/verify, JWKS, key import                    |
| vite           | vite/           | Build config, plugins, dev server                    |

## Instructions

1. Parse the user's request to identify `<library>` and optional `[topic]`.

2. Check if the docs cache exists at `/root/share/projects/rw-meta/stack-docs/`:

   ```bash
   ls /root/share/projects/rw-meta/stack-docs/
   ```

3. If the cache directory exists and contains the requested library:
   - Read the library's `_index.md` for topic listing
   - If a topic was specified, find and read the matching file
   - If no topic, show the index and ask what to look up

4. If the cache does NOT exist or the library is not cached yet:
   - Fall back to the auto-loaded stack skills in `.claude/skills/stack-*.md`
   - Read the relevant skill file for quick reference
   - Suggest running the update script: `/root/share/projects/rw-meta/stack-docs/_update.sh`

5. Search strategy when topic doesn't match a filename exactly:

   ```bash
   grep -rl "<topic>" /root/share/projects/rw-meta/stack-docs/<library>/
   ```

   Read the top 1-2 matching files.

6. Cap output at ~600 lines per invocation to avoid context bloat.

7. After showing the docs, note which version the docs reference and when they were last updated (check `_versions.json`).

## Examples

- `/stack-docs cloudflare d1` — D1 database API reference
- `/stack-docs hono middleware` — Hono middleware patterns
- `/stack-docs tanstack-query mutations` — useMutation reference
- `/stack-docs react` — Show React topics index
- `/stack-docs tailwind config` — Tailwind v4 configuration
