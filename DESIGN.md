# Design System — Todo App

## Classification
APP UI. Task management workspace. Utility language. Calm surface hierarchy.

---

## Color Tokens

Tokens are defined as CSS custom properties in `src/App.css` (`:root` for light, `[data-theme='dark']` and `[data-theme='retro']` for the other themes). The theme attribute is set on `<html>` by `useTheme` (and a pre-paint script in `index.html`); preference is `light`/`dark`/`retro`/`system`, persisted as `todo-app-theme`. Shape (`--radius-*`, `--border-w`) and font (`--font-body`, `--font-display`) are also tokens so themes can restyle structure, not just color.

### Retro theme
NES-inspired: 'Press Start 2P' for display text, 'VT323' for body (root font-size bumped to 18px to compensate for VT323's small render), square corners (`--radius-*: 0`), 2px borders, hard offset shadows, dark navy palette with NES red accent (`#d82800`) and coin gold headings (`#fcbf28`). The streak counter renders as a zero-padded `SCORE` (100 pts/task) and completing a task pops a `+100` (`.score-pop`, hidden in other themes). The existing Mario sound effects are the native soundtrack for this theme.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-bg` | `#f5f5f5` | `#161618` | Page background |
| `--color-surface` | `#ffffff` | `#1f1f23` | Cards, inputs, dropdowns |
| `--color-text` | `#1a1a1a` | `#e8e8e8` | Primary text |
| `--color-accent` | `#1a1a1a` | `#e8e8e8` | Buttons, checkbox accent, active pills (text: `--color-accent-text`) |
| `--color-border` | `#e8e8e8` | `#2e2e33` | Card borders (default) |
| `--color-border-strong` | `#d4d4d4` | `#3a3a40` | Input and toggle borders |
| `--color-border-hover` | `#ccc` | `#4a4a52` | Card borders (hover) |
| `--color-muted` | `#aaa` | `#6b6b73` | Completed task text, timestamps |
| `--color-faint` | `#bbb` | `#5c5c64` | Empty state text |
| `--color-secondary-text` | `#666` | `#a0a0a8` | Filter buttons, labels |
| `--color-delete` | `#dc2626` | `#ef4444` | Delete icon hover, error text |
| `--color-complete-glow` | `rgba(34,197,94,.35)` | `rgba(34,197,94,.3)` | Completion animation glow |

### Urgency Colors
| Level | Light (bg / text / border) | Dark (bg / text / border) |
|-------|---------------------------|---------------------------|
| Warning (yellow) | `#FFF3CD` / `#856404` / `#ffeeba` | `#3d3520` / `#f0d77a` / `#564a26` |
| Critical (red) | `#F8D7DA` / `#721c24` / `#f5c6cb` | `#42272b` / `#f3a6ae` / `#5c333a` |

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
