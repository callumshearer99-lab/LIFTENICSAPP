# Liftenics

A calisthenics app where athletes can follow training plans, learn exercises with form videos, and chat with the community.

## Features

- **Training plans** — four built-in plans (Beginner Foundations → Muscle-up & Front Lever), or build your own from the exercise library. Start a plan and your dashboard shows today's session; mark it complete to log it and track progress.
- **Exercise library** — 23 exercises across push, pull, legs, core and skills, each with step-by-step technique, common mistakes, muscles worked, easier/harder progressions and a form video.
- **Form videos** — the first account created is the admin and can attach a YouTube link or `.mp4` URL to any exercise from its page. Exercises without a video link to a YouTube tutorial search.
- **Community chat** — real-time channels (General, Progress, Form Checks, Beginners) with online counts, typing indicators and message history.
- Works on desktop and phones (bottom tab bar on mobile).

## Tech

- Frontend: React + Vite + React Router (`src/`)
- Backend: Node.js + Express API, Socket.io for live chat (`server/`)
- Database: SQLite via Node's built-in `node:sqlite` (no native install step)

Requires **Node.js 22.13+**.

## Running it

```bash
npm install
npm run dev        # API on :3001 + web app on http://localhost:5173
```

Production:

```bash
npm run build
npm start          # serves the app and API on http://localhost:3001
```

Environment variables: `PORT` (default `3001`) and `DB_PATH` (default `liftenics.db`).

## Tests

```bash
npm test
```

## Customising content

- Exercises: `server/data/exercises.js`
- Plans and chat channels: `server/data/plans.js`

New entries are added to the database on the next server start; existing rows are left alone so edits made in the app are kept.
