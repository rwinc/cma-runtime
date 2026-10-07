import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Richwood fork (#49, ops#416): both top-level wrangler configs must pin
// the public workers.dev subdomain and preview URLs off. When either key
// is omitted, `wrangler deploy` reapplies its defaults (both on) and the
// unauthenticated control plane becomes reachable on
// `<name>.richwood.workers.dev`.

const CONFIGS = ["wrangler.jsonc", "wrangler.prod.jsonc"] as const;

// Strips `//` and `/* */` comments and trailing commas outside string
// literals. String-aware on purpose: values such as "/api/*" contain
// comment-like sequences.
function parseJsonc(text: string): Record<string, unknown> {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') {
        j += text[j] === "\\" ? 2 : 1;
      }
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (ch === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      out += ch;
      i++;
    }
  }
  // Remove trailing commas before a closing bracket or brace. Safe after
  // comment removal because string contents were copied verbatim and no
  // config string value ends in `,` followed by `]` or `}`.
  return JSON.parse(out.replace(/,(\s*[\]}])/g, "$1"));
}

function loadConfig(file: string): Record<string, unknown> {
  const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
  return parseJsonc(readFileSync(path, "utf8"));
}

describe("parseJsonc", () => {
  it("keeps comment-like sequences inside strings", () => {
    expect(
      parseJsonc('{ "a": ["/api/*", "//x"], // c\n /* b */ "b": 1, }'),
    ).toEqual({ a: ["/api/*", "//x"], b: 1 });
  });
});

describe.each(CONFIGS)("%s", (file) => {
  const config = loadConfig(file);

  it("parses and names a cma-runtime worker", () => {
    expect(config.name).toMatch(/^cma-runtime-(qa|prod)$/);
  });

  it("pins workers_dev to false", () => {
    expect(config.workers_dev).toBe(false);
  });

  it("pins preview_urls to false", () => {
    expect(config.preview_urls).toBe(false);
  });
});
