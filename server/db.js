import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { COMMANDS, MISSIONS, PLATFORMS } from './seed.js';
import { QUESTIONS } from './seedQuiz.js';

export let mode = 'uninitialised';
let runQuery;
let runExec;

export const query = (text, params = []) => runQuery(text, params);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS labs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  lab_date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Linux',
  difficulty TEXT NOT NULL DEFAULT 'Beginner',
  objective TEXT NOT NULL DEFAULT '',
  target_env TEXT NOT NULL DEFAULT '',
  tools TEXT NOT NULL DEFAULT '',
  commands TEXT NOT NULL DEFAULT '',
  procedure TEXT NOT NULL DEFAULT '',
  expected TEXT NOT NULL DEFAULT '',
  observations TEXT NOT NULL DEFAULT '',
  learned TEXT NOT NULL DEFAULT '',
  mistakes TEXT NOT NULL DEFAULT '',
  security_lessons TEXT NOT NULL DEFAULT '',
  next_steps TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  time_spent_min INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  authorized_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled note',
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Linux',
  tags TEXT NOT NULL DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commands (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  risk TEXT NOT NULL DEFAULT 'Safe',
  syntax TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  hindi TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  sample_output TEXT NOT NULL DEFAULT '',
  flags TEXT NOT NULL DEFAULT '',
  mistakes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS command_state (
  command_id INTEGER PRIMARY KEY REFERENCES commands(id) ON DELETE CASCADE,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  understood BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS topic_progress (
  slug TEXT PRIMARY KEY,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  best_score INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  session_date TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS missions (
  id SERIAL PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'Beginner',
  est_minutes INTEGER NOT NULL DEFAULT 15,
  category TEXT NOT NULL DEFAULT 'Linux'
);

CREATE TABLE IF NOT EXISTS mission_done (
  mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  done_date TEXT NOT NULL,
  PRIMARY KEY (mission_id, done_date)
);

CREATE TABLE IF NOT EXISTS platforms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL
);


ALTER TABLE labs ADD COLUMN IF NOT EXISTS recommendations TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'multiple_choice',
  text TEXT UNIQUE NOT NULL,
  options TEXT NOT NULL,
  answer INTEGER NOT NULL,
  explanation TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS quiz_stats (
  question_id INTEGER PRIMARY KEY REFERENCES quiz_questions(id) ON DELETE CASCADE,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  box INTEGER NOT NULL DEFAULT 0,
  last_correct BOOLEAN,
  next_review TEXT
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'random',
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  details TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS roadmap_items (item_key TEXT PRIMARY KEY, done_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS roadmap_goals (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 1,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  difficulty TEXT NOT NULL DEFAULT 'Beginner',
  type TEXT NOT NULL DEFAULT 'article',
  notes TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_labs_status ON labs (status);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON study_sessions (session_date);
`;

async function seed() {
  for (const [i, c] of COMMANDS.entries()) {
    await query(
      `INSERT INTO commands (name, category, risk, syntax, description, hindi, example, sample_output, flags, mistakes, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (name) DO UPDATE SET category=EXCLUDED.category, risk=EXCLUDED.risk, syntax=EXCLUDED.syntax,
         description=EXCLUDED.description, hindi=EXCLUDED.hindi, example=EXCLUDED.example,
         sample_output=EXCLUDED.sample_output, flags=EXCLUDED.flags, mistakes=EXCLUDED.mistakes, sort_order=EXCLUDED.sort_order`,
      [c.name, c.category, c.risk, c.syntax, c.description, c.hindi, c.example, c.sample_output, c.flags, c.mistakes, i],
    );
  }
  for (const m of MISSIONS) {
    await query(
      `INSERT INTO missions (title, description, difficulty, est_minutes, category) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (title) DO NOTHING`,
      [m.title, m.description, m.difficulty, m.est_minutes, m.category],
    );
  }
  for (const x of QUESTIONS) {
    await query(
      `INSERT INTO quiz_questions (topic, difficulty, type, text, options, answer, explanation) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (text) DO UPDATE SET topic=EXCLUDED.topic, difficulty=EXCLUDED.difficulty, type=EXCLUDED.type, options=EXCLUDED.options, answer=EXCLUDED.answer, explanation=EXCLUDED.explanation`,
      [x.topic, x.difficulty, x.type, x.text, JSON.stringify(x.options), x.answer, x.explanation]);
  }
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM platforms');
  if (rows[0].n === 0) {
    for (const p of PLATFORMS) {
      await query('INSERT INTO platforms (name, description, level, url) VALUES ($1,$2,$3,$4)', [p.name, p.description, p.level, p.url]);
    }
  }
}

export async function initDb() {
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: 5,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (e) => console.error('[db] idle client error:', e.message));
    runQuery = (t, p) => pool.query(t, p);
    runExec = (t) => pool.query(t);
    mode = 'postgres';
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production. Create a Render PostgreSQL database and set it.');
    }
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR || '.data/pglite';
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    const db = new PGlite(dir);
    await db.waitReady;
    runQuery = (t, p) => db.query(t, p);
    runExec = (t) => db.exec(t);
    mode = 'local-embedded (PGlite)';
  }
  await runExec(SCHEMA);
  await seed();
  console.log(`[db] ready (${mode})`);
}

export async function dbHealth() {
  try {
    const t0 = Date.now();
    await query('SELECT 1');
    return { ok: true, mode, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, mode, error: 'database unreachable' };
  }
}
