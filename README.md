# Todo App

A personal task manager built with React. Supports personal/work modes, project organization, urgency indicators, and optional cloud sync via GitHub Gist.

## Features

- Create, edit, complete, and reorder tasks via drag-and-drop
- Organize tasks into projects
- Personal and Work modes with separate task lists
- Urgency indicators (configurable warning/critical thresholds)
- Today filter with daily streak tracking
- Confetti on task completion
- Optional GitHub Gist sync for cloud backup

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

Your tasks are stored in two gists (one for personal, one for work) and synced automatically on load and save.

## Local Storage

All data is saved locally in `localStorage` with no backend required. Keys used:

| Key | Description |
|-----|-------------|
| `todo-app-mode` | Active mode (`personal` or `work`) |
| `todo-app-tasks-{mode}` | Task list for the given mode |
| `todo-app-projects-{mode}` | Project list for the given mode |
| `urgencySettings` | Warning/critical hour thresholds |
