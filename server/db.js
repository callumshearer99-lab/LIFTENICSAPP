import { DatabaseSync } from 'node:sqlite';
import { exercises } from './data/exercises.js';
import { plans, channels } from './data/plans.js';

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    is_admin      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id             INTEGER PRIMARY KEY,
    slug           TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    category       TEXT NOT NULL,
    difficulty     INTEGER NOT NULL,
    muscles        TEXT NOT NULL,
    description    TEXT NOT NULL,
    steps          TEXT NOT NULL,
    mistakes       TEXT NOT NULL,
    progression_of TEXT,
    video_url      TEXT
  );

  CREATE TABLE IF NOT EXISTS plans (
    id          INTEGER PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    level       TEXT NOT NULL,
    weeks       INTEGER NOT NULL,
    description TEXT NOT NULL,
    days        TEXT NOT NULL,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS user_plans (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan_id    INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workout_logs (
    id           INTEGER PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id      INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    day_index    INTEGER NOT NULL,
    notes        TEXT,
    completed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS channels (
    id          INTEGER PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS messages_channel_idx ON messages(channel_id, id);
`;

// Inserts seed content without overwriting rows that already exist, so edits
// made in the app (e.g. an admin setting a form video) survive restarts.
function seed(db) {
  const insertExercise = db.prepare(`
    INSERT OR IGNORE INTO exercises
      (slug, name, category, difficulty, muscles, description, steps, mistakes, progression_of, video_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const e of exercises) {
    insertExercise.run(
      e.slug, e.name, e.category, e.difficulty, JSON.stringify(e.muscles), e.description,
      JSON.stringify(e.steps), JSON.stringify(e.mistakes), e.progressionOf, e.videoUrl,
    );
  }

  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO plans (slug, name, level, weeks, description, days) VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const p of plans) {
    insertPlan.run(p.slug, p.name, p.level, p.weeks, p.description, JSON.stringify(p.days));
  }

  const insertChannel = db.prepare('INSERT OR IGNORE INTO channels (slug, name, description) VALUES (?, ?, ?)');
  for (const c of channels) insertChannel.run(c.slug, c.name, c.description);
}

export function openDatabase(path = process.env.DB_PATH || 'liftenics.db') {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  seed(db);
  return db;
}
