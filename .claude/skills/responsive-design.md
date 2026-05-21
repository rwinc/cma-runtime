# Responsive Design

## Overview

Applications must work seamlessly across desktop, tablet, and mobile viewports. No horizontal scrolling should ever be required on any device.

## Viewport Breakpoints

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| Mobile | < 640px | Phones |
| Tablet | 640px - 1024px | Tablets, small laptops |
| Desktop | > 1024px | Laptops, monitors |

## Core Principles

### 1. No Horizontal Scrolling
- Content must fit within viewport width at all breakpoints
- Tables should become scrollable containers OR stack vertically on mobile
- Wide forms should stack fields vertically on narrow viewports

### 2. Touch-First on Mobile
- Minimum touch target: 44x44px (per Apple HIG)
- Adequate spacing between interactive elements
- No hover-only interactions on touch devices

### 3. Progressive Enhancement
- Start with mobile layout, enhance for larger screens
- Use CSS `min-width` media queries (mobile-first)
- Hide secondary information on mobile, show on desktop

## Implementation Patterns

### Responsive Tables
```tsx
// Option 1: Horizontal scroll container
<div className="overflow-x-auto">
  <table className="min-w-[600px]">...</table>
</div>

// Option 2: Card layout on mobile
<div className="hidden md:block">
  <table>...</table>
</div>
<div className="md:hidden space-y-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Responsive Grid
```tsx
// Stack on mobile, grid on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  ...
</div>
```

### Responsive Navigation
```tsx
// Desktop: horizontal nav
// Mobile: hamburger menu with slide-out drawer
```

### Max Width Containers
```tsx
// Prevent content from being too wide on large screens
<div className="max-w-[1400px] mx-auto px-4 md:px-6">
  ...
</div>
```

## Testing Checklist

Before deploying any page/component:
- [ ] Test at 320px width (small phones)
- [ ] Test at 768px width (tablets)
- [ ] Test at 1024px width (small laptops)
- [ ] Test at 1440px width (desktop)
- [ ] No horizontal scrollbar at any width
- [ ] All touch targets are 44px minimum
- [ ] Text is readable without zooming

## Common Issues

### Problem: Table causes horizontal scroll
**Fix**: Wrap in `overflow-x-auto` container OR use card layout on mobile

### Problem: Fixed-width elements break layout
**Fix**: Use `max-w-full`, `w-full`, or percentage widths

### Problem: Flexbox row overflows
**Fix**: Add `flex-wrap` or switch to `flex-col` on mobile

### Problem: Long text/URLs break layout
**Fix**: Add `break-words` or `truncate` classes

## Tailwind Classes Reference

| Class | Purpose |
|-------|---------|
| `w-full` | Full width of parent |
| `max-w-full` | Prevent exceeding parent width |
| `overflow-x-auto` | Horizontal scroll when needed |
| `flex-wrap` | Wrap flex items |
| `grid-cols-1 md:grid-cols-2` | Responsive grid |
| `hidden md:block` | Hide on mobile |
| `md:hidden` | Hide on desktop |
| `truncate` | Ellipsis for overflow text |
| `break-words` | Break long words |
