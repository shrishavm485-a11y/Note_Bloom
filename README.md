# CyberLab Journal (complete: all three phases)

A personal cybersecurity and cloud-security learning workspace.

- **Phase 1:** dashboard (real data), Linux command reference (34 commands, English + Romanized Hindi), networking knowledge base (16 topics, OSI explorer, ports table), lab journal (CRUD, 10 templates, Markdown/JSON export, print), notes with autosave, Practice Safely checklist, settings.
- **Phase 2:** cloud security workspace (16 concepts, AWS/Azure/GCP mapping, 5 interactive SVG diagrams), Pomodoro study timer (timestamp-based, persisted, goals, streak, calendar), quizzes and flashcards (47 questions, server-side grading, score history, spaced review), 10-stage roadmap with progress and personal goals.
- **Phase 3:** portfolio (selectable completed labs, skills summary, GitHub link, intro, Markdown export, print, optional public read-only page at `/p`), resource library, installable-app manifest.

**Stack:** React + Vite, Express, PostgreSQL (Render), Lucide icons. No paid APIs, no external fonts.

## Status (read this first)
This code was written without being able to run `npm install`, the build or the server in the authoring environment (no network). Server files passed `node --check`, seed and content data files were load-tested, and a script checked that client imports resolve. **The app has never been run end to end and the React code has never been compiled.** Expect to fix some typos or runtime errors on first run. Work through "Verify" below and report any error text.

## Run locally (Windows + VS Code)
1. Install Node.js 20 LTS. Open the folder in VS Code, open a terminal.
2. `copy .env.example .env` (leave `DATABASE_URL` empty: an embedded Postgres (PGlite) stores data in `.data/`).
3. `npm install`
4. `npm run dev` then open http://localhost:5173 (API on :3000).
5. Production check: `npm run build` then `npm start` and open http://localhost:3000.

## Verify
- http://localhost:3000/api/health returns `"status":"ok"`.
- Create/edit/delete a lab and a note; restart the server; data is still there.
- Search and filter labs, notes and commands; answer a networking quiz.
- Timer: start a 1-minute focus session (set Focus to 1 in Timer settings), switch tabs, come back: it finishes and a session appears in history.
- Quiz: answers are hidden until Submit; flashcards flip on tap; missed questions appear in Review list.
- Portfolio: mark a completed lab public, Publish, open `/p` in a private window (no login needed). Unpublish and it returns 404.
- Resize to a phone width: bottom nav appears, no sideways scrolling.
- Invalid input (empty lab title; a lab set to Completed without ticking the safety checklist) shows an error.

## Publish to GitHub
```
git init
git add .
git commit -m "CyberLab Journal Phase 1"
git branch -M main
git remote add origin https://github.com/<you>/cyberlab-journal.git
git push -u origin main
```
`.env` and `node_modules` are git-ignored. Never commit secrets.

## Deploy on Render
Option A (Blueprint): Render dashboard > New > Blueprint > pick the repo. It reads `render.yaml` and creates the web service and a PostgreSQL database.

Option B (manual):
1. New > PostgreSQL (free). Copy the **Internal Database URL**.
2. New > Web Service > the repo. Build: `npm install && npm run build`. Start: `npm start`. Health check path: `/api/health`.
3. Environment: `NODE_ENV=production`, `DATABASE_URL=<internal url>`, `SESSION_SECRET=<openssl rand -hex 32>`.

Tables and seed data are created automatically on startup (safe to re-run).

**No password:** the app is configured to open without a login. Anyone who has your URL can read and edit your data, so keep the link private. You can add `APP_PASSWORD` later in Render's environment settings to turn the login on. Free Render databases and services have limits (expiry, sleeping); check Render's current terms and use Settings > Export regularly.

## Troubleshooting
- *Build fails, "vite not found"*: run `npm install` without `--omit=dev`.
- *"DATABASE_URL is required in production"*: set it on the web service.
- *SSL/connection errors*: use the Internal URL on Render; if using an External URL set `DATABASE_SSL=true`.
- *Blank page / 404 on refresh*: make sure `npm run build` ran (creates `dist/`).
- *Logged out after each deploy*: set a fixed `SESSION_SECRET`.
- *Local PGlite errors*: delete `.data/` or set `DATABASE_URL` to a local Postgres.

## Mobile test checklist
Bottom nav works; forms fit; code blocks scroll sideways inside their box; dialogs fit the screen; search works with the on-screen keyboard; theme toggle; log in on phone if password-protected.

## Security notes
- Login is optional and off by default (no `APP_PASSWORD`). Set `APP_PASSWORD` to turn it on. Private API routes require a signed token; `/api/health` and `/api/public/portfolio` are the only open endpoints.
- The public portfolio returns a fixed allow-list of fields from labs that are both completed and marked public: never commands, mistakes, next steps, notes, settings or attachments. You are still responsible for not writing secrets into public write-ups.
- All SQL is parameterized; Markdown is rendered without raw HTML; the app sets a strict Content-Security-Policy.

## Done / not done
Done: everything listed at the top.
Not included (by design or limitation):
- Evidence/screenshot uploads: not implemented (free hosting has an ephemeral filesystem). Describe evidence in text.
- Offline service worker: not included, to avoid interfering with updates and data sync.
- Manifest has an SVG icon only; some phones need 192/512 px PNG icons before offering "Install".
- Single user only. Quiz content is a starter bank: review it for accuracy and add your own questions via the database.
- Resource library starts empty on purpose; links are saved, not verified.
- Free Render databases expire: export from Settings regularly.
