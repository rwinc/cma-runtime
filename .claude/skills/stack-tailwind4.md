# Tailwind CSS v4 — Correct Patterns

> TRIGGER: code imports `tailwindcss`, references Tailwind classes, or edits CSS files with Tailwind.
> Richwood baseline: tailwindcss ^4.2.0
> Tailwind v4 uses CSS-first configuration. Do NOT generate v3 patterns.

## Configuration: CSS-First (No tailwind.config.js)

```css
/* WRONG — v3 directives (do not use) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* CORRECT — v4 single import */
@import "tailwindcss";
```

### Customization via @theme (replaces tailwind.config.js)

```css
@import "tailwindcss";

@theme {
  /* Colors — generates bg-*, text-*, border-* utilities */
  --color-primary: #118851;
  --color-primary-light: #1aad66;
  --color-primary-dark: #0d6b3f;

  /* Font families */
  --font-display: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Spacing (extends defaults) */
  --spacing-18: 4.5rem;
  --spacing-88: 22rem;

  /* Breakpoints */
  --breakpoint-3xl: 1920px;

  /* Animations */
  --animate-fade-in: fade-in 0.3s ease-out;

  /* Border radius */
  --radius-card: 0.75rem;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

### WRONG — v3 JavaScript config

```js
// WRONG — tailwind.config.js is NOT used in v4
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#118851",
      },
    },
  },
  plugins: [],
};
```

If you must use a JS config for migration, use `@config`:

```css
@import "tailwindcss";
@config "../tailwind.config.js";
```

But the target is pure CSS configuration.

## Build Integration

### Vite (Richwood standard)

```ts
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

### WRONG — PostCSS with old plugin

```js
// WRONG — v3 PostCSS config
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

For v4 with PostCSS (non-Vite): use `@tailwindcss/postcss` (not `tailwindcss`).

## CSS Variable Naming Convention

| Token Type         | Variable Pattern         | Generates                                   |
| ------------------ | ------------------------ | ------------------------------------------- |
| Colors             | `--color-{name}`         | `bg-{name}`, `text-{name}`, `border-{name}` |
| Colors with shades | `--color-{name}-{shade}` | `bg-{name}-{shade}`, etc.                   |
| Fonts              | `--font-{name}`          | `font-{name}`                               |
| Spacing            | `--spacing-{value}`      | `p-{value}`, `m-{value}`, `gap-{value}`     |
| Breakpoints        | `--breakpoint-{name}`    | `{name}:` responsive prefix                 |
| Animations         | `--animate-{name}`       | `animate-{name}`                            |
| Border radius      | `--radius-{name}`        | `rounded-{name}`                            |

## Richwood Design System Integration

```css
@import "tailwindcss";

@theme {
  /* Richwood brand tokens (Layer 2 semantic) */
  --color-rw-green: #118851;
  --color-rw-steel: #8fa3b8;
  --color-rw-charcoal: hsl(210, 5%, 8%);

  /* App-specific (Layer 3) */
  --color-leanview: #f97316; /* Orange */
  --color-vault: #118851; /* Green */
  --color-kb: #3b82f6; /* Blue */
  --color-fsl: #8b5cf6; /* Purple */
}
```

See `rw-meta/practices/design-system/richwood-design-system.md` for the full 3-layer token architecture.

## Dark Mode

```css
/* v4 dark mode via data attribute */
@import "tailwindcss";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

```tsx
// Toggle in components
<div data-theme={isDark ? "dark" : "light"}>
  <p className="text-gray-900 dark:text-gray-100">Content</p>
</div>
```

## Quick Reference: v3 to v4 Migration

| Tailwind v3 (Do Not Use)              | Tailwind v4 (Use This)                        |
| ------------------------------------- | --------------------------------------------- |
| `@tailwind base/components/utilities` | `@import "tailwindcss"`                       |
| `tailwind.config.js`                  | `@theme { }` in CSS                           |
| `tailwindcss` PostCSS plugin          | `@tailwindcss/postcss` or `@tailwindcss/vite` |
| `content: ['./src/**/*.tsx']`         | Automatic content detection                   |
| `theme.extend.colors` in JS           | `--color-{name}: value` in `@theme`           |
| `darkMode: 'class'`                   | `@custom-variant dark (...)`                  |

---

## Need More Detail?

For full API reference, use: `/stack-docs tailwind <topic>`
