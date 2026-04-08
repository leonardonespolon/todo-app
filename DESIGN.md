# Design System — Todo App

## Classification
APP UI. Task management workspace. Utility language. Calm surface hierarchy.

---

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#1a1a1a` | Text, buttons, checkbox accent, active filter |
| `--color-surface` | `#ffffff` | Cards, inputs, dropdowns |
| `--color-bg` | `#f5f5f5` | Page background |
| `--color-border` | `#e8e8e8` | Card borders (default) |
| `--color-border-hover` | `#ccc` | Card borders (hover) |
| `--color-muted` | `#aaa` | Completed task text, timestamps |
| `--color-faint` | `#bbb` | Empty state text, completed timestamps |
| `--color-secondary-text` | `#666` | Filter buttons, labels |
| `--color-delete` | `#dc2626` | Delete icon hover, error text |
| `--color-complete-glow` | `rgba(34, 197, 94, 0.35)` | Completion animation glow |

### Urgency Colors
| Level | Background | Text | Border |
|-------|-----------|------|--------|
| Warning (yellow) | `#FFF3CD` | `#856404` | `#ffeeba` |
| Critical (red) | `#F8D7DA` | `#721c24` | `#f5c6cb` |

---

## Typography

- **Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Base size:** `0.9375rem` (15px)
- **App title:** `1.75rem`, weight 700, letter-spacing `-0.02em`
- **Section headings:** `0.6875rem`, weight 600, uppercase, letter-spacing `0.09em`, color `#999`
- **Timestamps:** `0.75rem`, weight 400, color `#aaa`
- **Small labels (settings):** `0.8125rem`

---

## Spacing

| Usage | Value |
|-------|-------|
| Page padding | `2.5rem 1.25rem` |
| Max content width | `640px` |
| Card padding | `0.5625rem 0.75rem` |
| Card gap | `0.625rem` |
| Card margin-bottom | `0.3125rem` |
| Section margin-bottom | `2rem` |
| Form gap | `0.5rem` |
| Filter gap | `0.375rem` |

---

## Shape & Motion

- **Border radius:** `6px` (cards, inputs, buttons), `20px` (filter pills), `5px` (small controls)
- **Transition default:** `0.15s` ease (borders, colors, opacity)
- **Completion animation:** `taskComplete` keyframe, 600ms ease — scale pop + green glow
- **Reduced motion:** animation disabled via `@media (prefers-reduced-motion: reduce)`

---

## Components

### Task Item
- White card, 1px `#e8e8e8` border, 6px radius
- Hover: border darkens to `#ccc`
- Completed: text `line-through`, color `#aaa`
- Urgency: background color override (yellow/red), cleared on completion
- Delete button: hidden until hover, 24×24px, opacity transition

### Settings Button
- 44×44px touch target (minimum), gear icon, border matches card style
- Toggles dropdown anchored `top: calc(100% + 6px); right: 0`
- Dropdown: 220px wide, `max-width: calc(100vw - 2rem)` for mobile safety

### Filters
- Pill shape (20px radius), default: white + `#d4d4d4` border
- Active: `#1a1a1a` background + white text

---

## Urgency Thresholds (user-configurable)

Defaults: warning after 24h, critical after 48h. Persisted to `localStorage` as `urgencySettings`. Validation: warning must be strictly less than critical.

---

## Principles

1. **Calm surface hierarchy.** Strong typography, few colors, minimal chrome.
2. **Utility language.** Section headings state what the area is ("Tasks", "Completed"). No aspirational copy.
3. **Subtraction default.** If an element doesn't earn its pixels, cut it.
4. **Cards earn existence.** Cards are used because the item IS the interaction — not for decoration.
5. **Trust is pixel-level.** Urgency colors, timestamps, and completion states are accurate and meaningful.
