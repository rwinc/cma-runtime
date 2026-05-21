# CSS Architecture Skill

Richwood projects use a 3-layer CSS architecture with Tailwind v4 for maintainable, themeable styling.

## Architecture Overview

3-layer CSS custom property system. Components ONLY reference Layer 3 (component tokens). Theme switching remaps Layers 1-2 without per-component dark mode logic.

```
Layer 1: Primitives (--rw-blue-500, --rw-amber-300)
    |
    v
Layer 2: Semantic (--color-info, --color-warning, --color-danger)
    |
    v
Layer 3: Component (--feature-element-property)
    |
    v
Components reference ONLY Layer 3
```

## File Structure

```
apps/web/src/styles/
  tokens.css      # All 3 layers of CSS custom properties + theme overrides
  main.css        # Tailwind v4 imports + custom utilities + component classes
```

Tailwind v4 is configured via Vite (no separate build step). `main.css` is the entry point imported in the app.

## Layer 1: Primitives (tokens.css)

Raw color values with brand prefix:

```css
--rw-blue-50: #eff6ff;
--rw-blue-500: #3b82f6;
--rw-amber-300: #fcd34d;
```

## Layer 2: Semantic (tokens.css)

Map primitives to meaning:

```css
--color-brand-primary: var(--rw-blue-800);
--color-success: var(--rw-green-600);
--color-warning: var(--rw-amber-500);
--color-danger: var(--rw-red-600);
--color-info: var(--rw-blue-500);
--color-info-light: var(--rw-blue-50);
--color-info-dark: var(--rw-blue-800);
```

## Layer 3: Component Tokens (tokens.css)

Feature-specific tokens referencing Layer 2:

```css
/* Feature: Utilization Bar */
--feature-util-green: var(--color-success);
--feature-util-amber: var(--color-warning);
--feature-util-red: var(--color-danger);

/* Feature: Warning Banner */
--feature-warning-bg: ...;
--feature-warning-text: ...;
--feature-warning-icon: ...;
```

### Themes

Themes switch via `data-theme` attribute on `<html>`:

| Theme | Selector | Notes |
|-------|----------|-------|
| Light | `:root` (default) | Standard office use |
| Dark | `[data-theme="dark"]` | Low-light environments |
| Production Blue | `[data-theme="production-blue"]` | Shop floor (high contrast) |

Each theme overrides Layer 1-2 primitives. Layer 3 component tokens auto-adjust because they reference Layer 2.

## Component Classes (main.css)

Component classes in `main.css` use tokens for consistent theming:

```css
.card {
  background: var(--surface-card);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
}

.btn--primary {
  background: var(--color-brand-primary-light);
  color: var(--text-inverse);
}
```

### Component Naming Convention

- Block: `.card`, `.btn`, `.nav`
- Element: `.card__header`, `.card__body`
- Modifier: `.card--elevated`, `.btn--primary`
- Status: `.item--hot`, `.item--rush`

## Tailwind Utilities

Tailwind v4 provides utility classes for quick adjustments:

```html
<div class="flex items-center gap-4 p-6">
  <span class="text-lg font-semibold">Title</span>
</div>
```

### Custom Utilities (in main.css)

```css
@layer utilities {
  .text-brand { color: var(--color-brand-primary); }
  .bg-surface { background: var(--surface-background); }
  .indicator-hot { border-left: 4px solid var(--color-danger); }
}
```

## Known CSS Gotchas

### `<tr>` borders are unreliable
CSS `border-left` (and other borders) on `<tr>` elements render inconsistently across Chrome, Safari, and Firefox. For urgency/priority indicators in table rows, use a dedicated narrow `<td>` with a solid background:

```tsx
{/* Urgency indicator — replaces unreliable <tr> borderLeft */}
<td className="py-2 w-1.5 px-0" style={{ background: urgencyColor(item) }} />
```

### Timezone-proof date display
Never construct `new Date()` for display-only formatting. `new Date("2026-03-10T00:00:00Z")` shifts to March 9 in negative UTC offsets. Use regex extraction:

```typescript
function parseDateParts(s: string): { month: string; day: number } | null {
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { month: MONTHS[parseInt(match[2], 10) - 1], day: parseInt(match[3], 10) };
}
```

## Build

Tailwind v4 is compiled via Vite -- no separate CSS build commands. `npm run dev:web` handles live reload.

## Adding New Component Tokens

When building a new feature area:

1. Define L3 tokens in `tokens.css` under `:root` in the Layer 3 block
2. Reference only L2 semantic tokens (not raw colors) so themes auto-work
3. Name with feature prefix: `--feature-*`, `--layout-*`, `--planning-*`, etc.
4. Components reference L3 via `style={{ background: 'var(--feature-bg)' }}` or Tailwind classes

**Dark mode and alternative themes inherit automatically** when L3 aliases only
reference L2 tokens. You do NOT need to add entries to `[data-theme="dark"]` or
other theme blocks unless the token needs a different *value* in those themes
(e.g., alpha backgrounds instead of opaque ones). Most feature tokens need no theme override.

### Token Naming Convention

```
--<feature>-<element>-<property>
```

Examples:
| Feature | Prefix | Example |
|---------|--------|---------|
| Schedule | `--schedule-*` | `--schedule-frozen-bg`, `--schedule-util-warn` |
| Layout | `--layout-*` | `--layout-util-good`, `--layout-reused` |
| Dashboard | `--dashboard-*` | `--dashboard-metric-bg` |

### Rule: additive-only within a PR

When adding feature tokens, do not change existing values. Existing L3 tokens
that reference `--color-success` (for example) can be *renamed* in a separate refactor PR;
don't rename and re-wire in the same PR as a functional feature change.

### Canonical example

```css
/* Layout feature — aliases to existing semantic tokens, no new values */
--layout-cavity-filled: var(--color-success);
--layout-util-good:     var(--color-success);
--layout-util-warn:     var(--color-warning);
--layout-util-critical: var(--color-danger);
```

No dark mode override needed -- all inherit correctly through the L2 chain.

## Troubleshooting

### Dark mode not working?
1. Ensure `data-theme="dark"` is on `<html>`
2. Check that tokens.css `[data-theme="dark"]` block has the overrides
3. Verify the theme toggle hook is working

### Token not applying?
1. Check the L3 token exists in all theme blocks
2. Verify component references L3 (not L1/L2 directly)
3. Use browser dev tools to trace the custom property chain
