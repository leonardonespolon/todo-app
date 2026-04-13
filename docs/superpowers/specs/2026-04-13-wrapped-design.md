# Wrapped Feature — Design Spec
Date: 2026-04-13

## Overview

A "Wrapped"-style stats summary (inspired by Spotify Wrapped) that surfaces productivity insights from the user's completed task history. Triggered by a button in the app header, displayed as a full-screen overlay with a period switcher and a personality label as the finale.

---

## Entry Point

- A **Wrapped button** (e.g., a chart/sparkle icon) is added to the app header, next to the settings gear.
- The button is only rendered when at least one completed task exists.
- Clicking it opens the `WrappedModal` overlay.

---

## Overlay Layout

- **Full-screen modal** with a dark/overlay backdrop, dismissible via close button, clicking outside, or pressing `Escape`.
- **Period switcher** at the top: `Week | Month | Year` (default: Week).
- Switching period re-computes and re-renders stats immediately (no async, derived from in-memory task array).
- **Single scrollable column** of stat rows below the switcher.
- **Personality label** at the bottom as a finale: bold headline + one-line description.

---

## Stats

**Period windows (rolling):** Week = last 7 days, Month = last 30 days, Year = last 365 days. Window is relative to `Date.now()` at render time.

All stats are derived from completed tasks within the selected period window.

| Stat | Label | Notes |
|------|-------|-------|
| Tasks completed | `tasks completed` | Count of completedAt within period |
| Fastest completion | `fastest completion` | Min (completedAt - createdAt), formatted as Xh or Xm |
| Avg completion time | `avg completion time` | Mean (completedAt - createdAt), formatted as Xh |
| Longest streak | `longest streak` | Consecutive days with ≥1 completion, within period |
| Completion rate | `completion rate` | completed / (completed + still active tasks created in period) |
| Most productive day | `most productive day` | Day of week with most completions |
| Most productive hour | `most productive hour` | Hour of day with most completions, formatted as 12h (e.g. 3pm) |

If a period has no completed tasks, show a friendly empty state: "No completed tasks this [week/month/year] yet."

---

## Personality Label

Only shown when ≥ 3 tasks were completed in the period. Below that threshold, show "Not enough data yet." in place of the label.

Derived from stats using a priority-ordered set of rules. First matching rule wins.

| Rule | Label | Description |
|------|-------|-------------|
| Completion rate ≥ 90% | **The Closer** | You finish almost everything you start. |
| Avg completion < 2h | **The Sprint King** | You blast through tasks fast. |
| Most productive hour falls between 22:00–05:00 | **The Night Owl** | You do your best work after dark. |
| Most productive hour falls between 05:00–09:00 | **The Early Bird** | You hit the ground running every morning. |
| Longest streak ≥ 5 days | **The Consistent One** | Showing up every day is your superpower. |
| Avg completion > 24h | **The Deep Thinker** | You take your time and do it right. |
| Default | **The Steady Hand** | Reliable, methodical, always moving forward. |

---

## Architecture

### New utility: `src/utils/computeWrapped.js` + `tests/utils/computeWrapped.test.js`

```
computeWrapped(tasks: Task[], period: 'week' | 'month' | 'year') → WrappedStats
```

- Pure function, no side effects.
- Period windows are rolling: Week = last 7 days, Month = last 30 days, Year = last 365 days.
- Filters tasks by `completedAt` within the period window.
- Returns all stats + personality label as a plain object. Returns `null` stats for empty periods.
- Tiebreaker for most productive hour/day: earliest value wins.
- Must have a corresponding test file: `tests/utils/computeWrapped.test.js`
  - Tests: period window filtering, each stat (happy path + edge cases), streak non-consecutive gap, completion rate with zero active tasks, personality priority order, minimum threshold (< 3 completions → no label), empty period.

### New component: `src/components/WrappedModal.jsx`

- Receives the full `tasks` array and an `onClose` callback.
- Manages `period` state internally (`week` default).
- Calls `computeWrapped(tasks, period)` on each render (fast enough — no memoization needed for typical task counts).
- Renders the overlay, period switcher, stat rows, and personality label.
- Closes on backdrop click or close button.

### Changes to `App.jsx`

- Add `wrappedOpen` boolean state.
- Add Wrapped button to header (conditionally rendered when completed tasks exist).
- Render `<WrappedModal tasks={tasks} onClose={() => setWrappedOpen(false)} />` when open.

### Changes to `App.css`

- Add styles for: overlay backdrop, modal container, period switcher pills, stat rows (big number + label), personality label block.
- Follow existing DESIGN.md tokens: colors, typography, spacing, border-radius.

---

## Design Constraints (from DESIGN.md)

- Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Colors: use existing tokens (`--color-primary`, `--color-bg`, `--color-surface`, etc.)
- Urgency colors not used here — Wrapped is celebratory, not urgent.
- Border radius: 6px for containers, 20px for period switcher pills.
- Transitions: 0.15s ease.

---

## Out of Scope

- Shareable cards / screenshots
- Animation / swipeable cards
- Push notifications or scheduled summaries
- Data beyond what's already in the task array (no new tracking fields)
