import express from 'express';
import { bearerToken, createSession, hashPassword, userForToken, verifyPassword } from './auth.js';

const CATEGORIES = ['push', 'pull', 'legs', 'core', 'skills'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function parseExercise(row) {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    difficulty: row.difficulty,
    muscles: JSON.parse(row.muscles),
    description: row.description,
    steps: JSON.parse(row.steps),
    mistakes: JSON.parse(row.mistakes),
    progressionOf: row.progression_of,
    videoUrl: row.video_url,
  };
}

function parsePlan(row) {
  return {
    slug: row.slug,
    name: row.name,
    level: row.level,
    weeks: row.weeks,
    description: row.description,
    days: JSON.parse(row.days),
    custom: row.created_by != null,
    author: row.author ?? null,
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// Only allow http(s) URLs so a stored video link can't become a javascript: URL.
function isSafeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function createApp(db) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  // Attach the signed-in user (if any) to every request.
  app.use((req, _res, next) => {
    req.user = userForToken(db, bearerToken(req));
    next();
  });

  const requireUser = (req, res, next) =>
    req.user ? next() : res.status(401).json({ error: 'Please log in first.' });
  const requireAdmin = (req, res, next) =>
    req.user?.isAdmin ? next() : res.status(403).json({ error: 'Admins only.' });

  // Adds each exercise's display name to a plan's workout days.
  const withExerciseNames = (plan) => {
    const names = Object.fromEntries(db.prepare('SELECT slug, name FROM exercises').all().map((e) => [e.slug, e.name]));
    return {
      ...plan,
      days: plan.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((x) => ({ ...x, name: names[x.slug] ?? x.slug })),
      })),
    };
  };

  const planBySlug = (slug) =>
    db
      .prepare('SELECT p.*, u.username AS author FROM plans p LEFT JOIN users u ON u.id = p.created_by WHERE p.slug = ?')
      .get(slug);

  // ---------- Auth ----------
  app.post('/api/auth/register', (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 letters, numbers or underscores.' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
      return res.status(409).json({ error: 'That username is taken.' });
    }
    // The first account created becomes the admin (can set exercise videos).
    const isFirstUser = db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;
    const { hash, salt } = hashPassword(password);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (username, password_hash, salt, is_admin) VALUES (?, ?, ?, ?)')
      .run(username, hash, salt, isFirstUser ? 1 : 0);
    const token = createSession(db, lastInsertRowid);
    res.status(201).json({ token, user: userForToken(db, token) });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!row || !verifyPassword(password, row.salt, row.password_hash)) {
      return res.status(401).json({ error: 'Wrong username or password.' });
    }
    const token = createSession(db, row.id);
    res.json({ token, user: userForToken(db, token) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = bearerToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.status(204).end();
  });

  // ---------- Dashboard ----------
  app.get('/api/me', requireUser, (req, res) => {
    const userId = req.user.id;
    const active = db
      .prepare(
        `SELECT p.*, up.started_at FROM user_plans up JOIN plans p ON p.id = up.plan_id WHERE up.user_id = ?`,
      )
      .get(userId);

    let activePlan = null;
    if (active) {
      const plan = withExerciseNames(parsePlan(active));
      const last = db
        .prepare(
          'SELECT day_index FROM workout_logs WHERE user_id = ? AND plan_id = ? AND completed_at >= ? ORDER BY id DESC LIMIT 1',
        )
        .get(userId, active.id, active.started_at);
      const completed = db
        .prepare('SELECT COUNT(*) AS n FROM workout_logs WHERE user_id = ? AND plan_id = ? AND completed_at >= ?')
        .get(userId, active.id, active.started_at).n;
      const totalSessions = plan.weeks * plan.days.length;
      activePlan = {
        ...plan,
        startedAt: active.started_at,
        // The next session is the day after the last one logged, wrapping around the week.
        nextDayIndex: last ? (last.day_index + 1) % plan.days.length : 0,
        completedSessions: completed,
        totalSessions,
      };
    }

    const recentWorkouts = db
      .prepare(
        `SELECT w.id, w.day_index AS dayIndex, w.notes, w.completed_at AS completedAt, p.name AS planName, p.days
         FROM workout_logs w JOIN plans p ON p.id = w.plan_id
         WHERE w.user_id = ? ORDER BY w.id DESC LIMIT 10`,
      )
      .all(userId)
      .map(({ days, ...w }) => ({ ...w, dayName: JSON.parse(days)[w.dayIndex]?.name ?? `Day ${w.dayIndex + 1}` }));

    const stats = db
      .prepare(
        `SELECT COUNT(*) AS totalWorkouts,
                SUM(completed_at >= datetime('now', '-7 days')) AS thisWeek
         FROM workout_logs WHERE user_id = ?`,
      )
      .get(userId);

    res.json({
      user: req.user,
      activePlan,
      recentWorkouts,
      stats: { totalWorkouts: stats.totalWorkouts, thisWeek: stats.thisWeek ?? 0 },
    });
  });

  app.post('/api/me/workouts', requireUser, (req, res) => {
    const active = db
      .prepare('SELECT p.id, p.days FROM user_plans up JOIN plans p ON p.id = up.plan_id WHERE up.user_id = ?')
      .get(req.user.id);
    if (!active) return res.status(400).json({ error: 'Start a plan before logging workouts.' });
    const dayIndex = Number(req.body?.dayIndex);
    const days = JSON.parse(active.days);
    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= days.length) {
      return res.status(400).json({ error: 'Invalid workout day.' });
    }
    const notes = String(req.body?.notes ?? '').slice(0, 500) || null;
    db.prepare('INSERT INTO workout_logs (user_id, plan_id, day_index, notes) VALUES (?, ?, ?, ?)').run(
      req.user.id, active.id, dayIndex, notes,
    );
    res.status(201).json({ ok: true });
  });

  // ---------- Exercises ----------
  app.get('/api/exercises', (req, res) => {
    const { category, q } = req.query;
    let rows = db.prepare('SELECT * FROM exercises ORDER BY category, difficulty, name').all().map(parseExercise);
    if (category && CATEGORIES.includes(category)) rows = rows.filter((e) => e.category === category);
    if (q) {
      const needle = String(q).toLowerCase();
      rows = rows.filter(
        (e) => e.name.toLowerCase().includes(needle) || e.muscles.some((m) => m.toLowerCase().includes(needle)),
      );
    }
    res.json({ exercises: rows, categories: CATEGORIES });
  });

  app.get('/api/exercises/:slug', (req, res) => {
    const row = db.prepare('SELECT * FROM exercises WHERE slug = ?').get(req.params.slug);
    if (!row) return res.status(404).json({ error: 'Exercise not found.' });
    const exercise = parseExercise(row);
    const easier = exercise.progressionOf
      ? db.prepare('SELECT slug, name FROM exercises WHERE slug = ?').get(exercise.progressionOf)
      : null;
    const harder = db.prepare('SELECT slug, name FROM exercises WHERE progression_of = ?').all(exercise.slug);
    const usedIn = db
      .prepare('SELECT slug, name, days FROM plans WHERE created_by IS NULL')
      .all()
      .filter((p) => JSON.parse(p.days).some((d) => d.exercises.some((x) => x.slug === exercise.slug)))
      .map(({ slug, name }) => ({ slug, name }));
    res.json({ exercise, easier: easier ?? null, harder, usedIn });
  });

  app.put('/api/exercises/:slug/video', requireUser, requireAdmin, (req, res) => {
    const videoUrl = String(req.body?.videoUrl ?? '').trim() || null;
    if (videoUrl && !isSafeUrl(videoUrl)) return res.status(400).json({ error: 'Enter a valid http(s) URL.' });
    const { changes } = db.prepare('UPDATE exercises SET video_url = ? WHERE slug = ?').run(videoUrl, req.params.slug);
    if (!changes) return res.status(404).json({ error: 'Exercise not found.' });
    res.json({ videoUrl });
  });

  // ---------- Plans ----------
  app.get('/api/plans', (req, res) => {
    const rows = db
      .prepare(
        `SELECT p.*, u.username AS author FROM plans p LEFT JOIN users u ON u.id = p.created_by
         ORDER BY p.created_by IS NOT NULL, CASE p.level WHEN 'beginner' THEN 0 WHEN 'intermediate' THEN 1 ELSE 2 END, p.id`,
      )
      .all();
    res.json({ plans: rows.map(parsePlan) });
  });

  app.get('/api/plans/:slug', (req, res) => {
    const row = planBySlug(req.params.slug);
    if (!row) return res.status(404).json({ error: 'Plan not found.' });
    const plan = withExerciseNames(parsePlan(row));
    const isActive = req.user
      ? Boolean(db.prepare('SELECT 1 FROM user_plans WHERE user_id = ? AND plan_id = ?').get(req.user.id, row.id))
      : false;
    res.json({ plan, isActive });
  });

  app.post('/api/plans', requireUser, (req, res) => {
    const { name, level, weeks, description, days } = req.body ?? {};
    const validSlugs = new Set(db.prepare('SELECT slug FROM exercises').all().map((e) => e.slug));
    const cleanName = String(name ?? '').trim().slice(0, 60);
    if (!cleanName) return res.status(400).json({ error: 'Give your plan a name.' });
    if (!LEVELS.includes(level)) return res.status(400).json({ error: 'Pick a level.' });
    const cleanWeeks = Math.min(52, Math.max(1, Number(weeks) || 4));
    if (!Array.isArray(days) || days.length === 0 || days.length > 7) {
      return res.status(400).json({ error: 'Add between 1 and 7 workout days.' });
    }
    const cleanDays = [];
    for (const [i, day] of days.entries()) {
      const exercises = (Array.isArray(day?.exercises) ? day.exercises : [])
        .filter((x) => validSlugs.has(x?.slug))
        .slice(0, 15)
        .map((x) => ({
          slug: x.slug,
          sets: Math.min(20, Math.max(1, Number(x.sets) || 3)),
          reps: String(x.reps ?? '10').slice(0, 40),
          rest: Math.min(600, Math.max(0, Number(x.rest) || 90)),
        }));
      if (exercises.length === 0) return res.status(400).json({ error: `Day ${i + 1} needs at least one exercise.` });
      cleanDays.push({ name: String(day.name ?? '').trim().slice(0, 60) || `Day ${i + 1}`, exercises });
    }

    let slug = slugify(`${req.user.username}-${cleanName}`) || 'plan';
    for (let n = 2; db.prepare('SELECT 1 FROM plans WHERE slug = ?').get(slug); n++) slug = `${slug.replace(/-\d+$/, '')}-${n}`;

    db.prepare(
      'INSERT INTO plans (slug, name, level, weeks, description, days, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(slug, cleanName, level, cleanWeeks, String(description ?? '').slice(0, 500), JSON.stringify(cleanDays), req.user.id);
    res.status(201).json({ slug });
  });

  app.post('/api/plans/:slug/start', requireUser, (req, res) => {
    const plan = planBySlug(req.params.slug);
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });
    db.prepare(
      `INSERT INTO user_plans (user_id, plan_id, started_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET plan_id = excluded.plan_id, started_at = excluded.started_at`,
    ).run(req.user.id, plan.id);
    res.json({ ok: true });
  });

  // ---------- Community ----------
  app.get('/api/channels', (_req, res) => {
    res.json({ channels: db.prepare('SELECT slug, name, description FROM channels ORDER BY id').all() });
  });

  app.get('/api/channels/:slug/messages', requireUser, (req, res) => {
    const channel = db.prepare('SELECT id FROM channels WHERE slug = ?').get(req.params.slug);
    if (!channel) return res.status(404).json({ error: 'Channel not found.' });
    const before = Number(req.query.before) || Number.MAX_SAFE_INTEGER;
    const messages = db
      .prepare(
        `SELECT m.id, m.body, m.created_at AS createdAt, u.username
         FROM messages m JOIN users u ON u.id = m.user_id
         WHERE m.channel_id = ? AND m.id < ? ORDER BY m.id DESC LIMIT 50`,
      )
      .all(channel.id, before)
      .reverse();
    res.json({ messages, hasMore: messages.length === 50 });
  });

  return app;
}
