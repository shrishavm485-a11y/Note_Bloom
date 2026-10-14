# NoteBloom

Messy text in, beautiful notes out. Runs as one Node web service (Express serves the static app and `/api/health`).

## What works in this version
- Deterministic beautify engine (no API, no paid services): 6 styles (Aesthetic, Minimal, Colorful, Cornell, Exam Prep, Flashcards)
- Edit in source (Markdown) or preview, autosave, favorites, folders (create/rename/delete), move, duplicate, trash/restore/delete forever, search, sort, filter
- Copy formatted / plain text, download .txt .md .html, print/PDF, JSON backup + validated import, .txt/.md import
- Dark mode, mobile bottom navigation, reduced-motion support

## Storage (important)
Notes are saved in **your browser's localStorage** (guest mode). They do NOT sync across devices.
Use Settings > Export JSON backup to move notes between devices. Clearing browser data erases notes.

## Not built yet
Accounts, PostgreSQL sync, AI rewriting, Cornell/Revision variants beyond the basics, flashcard study mode, PWA, mind-map and revision-sheet styles, section drag-reorder.

## Run locally
    npm install
    npm start        # http://localhost:3000

## Deploy on Render
1. Push this folder to a GitHub repo.
2. Render > New > Web Service > connect the repo.
3. Build command: `npm install`  Start command: `npm start`
4. Health check path: `/api/health`. Render sets `PORT` automatically.
Free plan services sleep after inactivity (first load can take ~1 minute).

## Troubleshooting
- Blank page: check the browser console and that `public/` was deployed.
- Notes missing: they live in the browser that created them; import a JSON backup.
