# Gist Sync Design

**Date:** 2026-04-13
**Feature:** GitHub Gist sync for cross-device task persistence

## Problem

Tasks are stored in `localStorage`, which is browser-local. Using the todo app on multiple devices (e.g. work laptop and personal laptop) means tasks do not stay in sync.

## Goal

Sync tasks across devices using a private GitHub Gist as the backend — no server required.

## Decisions

| Question | Decision |
|---|---|
| Conflict resolution | Remote wins on load — Gist is source of truth when opening the app |
| Sync trigger | Automatic (debounced 1.5s after any change) + manual pull button |
| Manual button direction | Pull only — auto-save handles push; manual pulls latest from the other device |
| Token setup location | Existing settings panel (⚙️ gear icon) |

## Architecture

### New file: `src/hooks/useGistSync.js`

A standalone hook that handles all GitHub Gist API communication and sync state. Follows the existing hook pattern (`useTasks`).

**Exposed API:**

| Item | Type | Purpose |
|---|---|---|
| `token` | string | Current GitHub PAT |
| `setToken(t)` | fn | Saves token to state + localStorage; clears gist ID when set to empty string |
| `syncStatus` | enum | `'idle' \| 'loading' \| 'pending' \| 'syncing' \| 'synced' \| 'error'` |
| `syncError` | string | Error message shown when `syncStatus === 'error'` |
| `load()` | async fn | Fetches tasks from Gist, returns task array or null |
| `scheduleSave(tasks)` | fn | Debounced (1.5s) push to Gist; creates Gist on first call |
| `flushSave(tasks)` | fn | Immediate push to Gist, bypassing debounce |

**Internal storage (refs, no re-renders):**
- `gistIdRef` — Gist ID, persisted to `localStorage` under key `todo-gist-id`
- `debounceRef` — debounce timer handle
- `pendingTasksRef` — latest tasks queued for save

**localStorage keys:**
- `todo-gist-token` — GitHub PAT
- `todo-gist-id` — Gist ID (created on first sync)

**Gist file:** `todo-app-tasks.json` inside a private Gist titled "Todo App Tasks"

### Modified: `src/hooks/useTasks.js`

Add one function: `resetTasks(newTasks)` — replaces all task state in one operation. Used by `App.jsx` after loading from Gist.

### Modified: `src/App.jsx`

Orchestrates sync with a `gistReady` flag to prevent the auto-save from firing before the initial Gist fetch completes.

**Mount sequence:**
```
if token exists
  → load() from Gist
  → resetTasks(remote) if data returned
set gistReady = true
```

**Auto-save:**
```
useEffect on [tasks]
  if gistReady → scheduleSave(tasks)
```

**Manual pull:**
```
flushSave(tasks)       ← persist any unsaved local changes first
→ load() from Gist
→ resetTasks(remote)
```

### Modified: `src/App.jsx` — Settings panel

Below the existing urgency thresholds section, separated by a divider:

**Not connected:**
- Password input for GitHub PAT
- "Connect" button — saves token, triggers initial load
- Small link: "Create token (gist scope)" → GitHub token creation URL

**Connected:**
- "Connected" badge
- "Disconnect" button — clears token and gist ID from localStorage and state

### Modified: `src/App.jsx` — Header

**Sync status indicator** below the title/streak line (only shown when token is configured):

| `syncStatus` | Display |
|---|---|
| `idle` | hidden |
| `loading` | "Loading from Gist…" |
| `pending` / `syncing` | "Syncing…" |
| `synced` | "Synced ✓" (auto-hides after 3s) |
| `error` | "Sync failed: [message]" in red |

**Pull button** — refresh icon next to ⚙️ gear, visible only when connected.

### Modified: `src/App.css`

New classes following existing naming convention:
- `.sync-status` — small muted text line below title
- `.sync-status--error` — red variant
- `.settings-divider` — `<hr>` separator in settings panel
- `.settings-token-input` — wider input for the PAT field
- `.settings-link` — small anchor for "Create token" link
- `.settings-gist-row` — connected state row (badge + disconnect)
- `.pull-btn` — refresh icon button in header, mirrors `.settings-btn` style

## Data Flow Diagram

```
Open app
  └── token in localStorage?
        yes → fetch Gist → resetTasks()  → gistReady = true
        no  → use localStorage tasks      → gistReady = true

Task changes (after gistReady)
  └── scheduleSave() → debounce 1.5s → PATCH Gist

Manual pull button
  └── flushSave() → PATCH Gist (immediate)
  └── load()      → GET Gist
  └── resetTasks()

First connect
  └── user pastes token → Connect
  └── load() — no gist ID yet, skips fetch
  └── gistReady = true
  └── first task change → scheduleSave() → POST /gists → stores gist ID
```

## Error Handling

- Network errors during load: fall back to localStorage tasks silently, show "Sync failed" status
- Network errors during save: show "Sync failed" status, tasks remain in localStorage (not lost)
- Invalid token: GitHub returns 401, shown as "Sync failed: Bad credentials"
- All GitHub API calls use `fetch` directly (no extra dependencies)

## Out of Scope

- Merge/conflict resolution (last write wins, remote wins on load)
- Multi-user sharing
- Offline queue / retry logic
- Token validation on entry (validated implicitly on first load/save)
