# Todo App

A personal task manager built with React. **[Try it live →](https://leonardonespolon.github.io/todo-app/)**

Supports personal/work modes, project organization, urgency indicators, and optional cloud sync via GitHub Gist. No sign-up required — runs entirely in the browser.

## Features

- Create, edit, complete, and reorder tasks via drag-and-drop
- Undo a deleted task from a toast within five seconds
- Organize tasks into projects (available in both Personal and Work modes), collapsible and remembered per project
- Personal and Work modes with separate task and project lists
- Urgency indicators (configurable warning/critical thresholds)
- Today filter with daily streak tracking
- Confetti on task completion
- Light, dark, retro (NES-style), and system theme (header theme menu)
- Focus mode — one click hides everything except your top 3 Todo items
- Optional GitHub Gist sync for cloud backup
- Mobile-friendly: touch-sized controls, long-press to drag, and installable to the home screen (Share → Add to Home Screen on iOS, Install app on Android)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173/todo-app/](http://localhost:5173/todo-app/) in your browser.

## Other Commands

```bash
npm run build    # Production build
npm run preview  # Preview production build locally
npm test         # Run tests
```

## GitHub Gist Sync (Optional)

To sync tasks across devices, generate a GitHub personal access token with `gist` scope and paste it in **Settings → GitHub Gist Sync**.

Both modes are stored in a single private gist (`todo-app-tasks.json`) and synced automatically on load and after each change.

## Local Storage

All data is saved locally in `localStorage` with no backend required. Keys used:

| Key | Description |
|-----|-------------|
| `todo-app-mode` | Active mode (`personal` or `work`) |
| `todo-app-tasks-{mode}` | Task list for the given mode |
| `todo-app-projects-{mode}` | Project list for the given mode |
| `urgencySettings` | Warning/critical hour thresholds |
| `todo-app-theme` | Theme preference (`light`, `dark`, `retro`, or `system`) |
| `todo-app-focus` | Focus mode on/off |
| `todo-app-section-collapse` | Collapsed state of the Watch/Later/Completed sections |
| `todo-app-project-collapse` | Collapsed state of individual project cards |
| `todo-gist-token` | GitHub token for Gist sync (stored in plain text in the browser) |
| `todo-gist-id` | ID of the gist holding the synced data |
