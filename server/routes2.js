// Phase 2 + 3 routes: study summary, quizzes/flashcards, roadmap, resources, portfolio.
import { Router } from 'express';
import { query } from './db.js';
import { HttpError, wrap, todayOf, addDays, toId, text, oneOf, toBool, intIn, like, paging, qstr, httpUrl, computeStreak, activityDates, getSettings } from './helpers.js';
import { QUIZ_TOPICS } from './seedQuiz.js';

const r = Router();
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

// ---------- study summary (timer page, calendar) ----------
r.get('/sessions/summary', wrap(async (req, res) => {
  const today = todayOf(req);
  const settings = await getSettings();
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : today.slice(0, 7);
  const monthStart = `${month}-01`;
  const next = new Date(`${monthStart}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const monthEnd = next.toISOString().slice(0, 10);
  const weekStart = addDays(today, -6);

  const [days, week, todayRow, recent, activity] = await Promise.all([
    query('SELECT session_date AS d, SUM(minutes)::int AS m, COUNT(*)::int AS n FROM study_sessions WHERE session_date >= $1 AND session_date < $2 GROUP BY session_date', [monthStart, monthEnd]),
    query('SELECT COALESCE(SUM(minutes),0)::int AS m FROM study_sessions WHERE session_date >= $1 AND session_date <= $2', [weekStart, today]),
    query('SELECT COALESCE(SUM(minutes),0)::int AS m FROM study_sessions WHERE session_date = $1', [today]),
    query('SELECT s.*, l.title AS lab_title FROM study_sessions s LEFT JOIN labs l ON l.id = s.lab_id ORDER BY s.created_at DESC LIMIT 15'),
    activityDates(),
  ]);
  res.json({
    month, today,
    days: days.rows,
    activeDays: [...activity].filter((d) => d >= monthStart && d < monthEnd),
    todayMinutes: todayRow.rows[0].m, weekMinutes: week.rows[0].m,
    dailyGoal: settings.daily_goal_minutes, weeklyGoal: settings.weekly_goal_minutes,
    streak: computeStreak(activity, today),
    recent: recent.rows,
  });
}));

// ---------- quiz & flashcards ----------
const INTERVALS = [0, 1, 3, 7, 14];

async function recordResult(questionId, correct, today) {
  const cur = (await query('SELECT box FROM quiz_stats WHERE question_id = $1', [questionId])).rows[0];
  const box = correct ? Math.min((cur ? cur.box : 0) + 1, 4) : 0;
  const nextReview = addDays(today, INTERVALS[box]);
  await query(
    `INSERT INTO quiz_stats (question_id, correct, wrong, box, last_correct, next_review) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (question_id) DO UPDATE SET correct = quiz_stats.correct + $2, wrong = quiz_stats.wrong + $3, box = $4, last_correct = $5, next_review = $6`,
    [questionId, correct ? 1 : 0, correct ? 0 : 1, box, correct, nextReview]);
}

const shapeQuestion = (row) => ({ id: row.id, topic: row.topic, difficulty: row.difficulty, type: row.type, text: row.text, options: JSON.parse(row.options) });

function questionFilter(req) {
  const where = [];
  const params = [];
  if (req.query.topic) {
    if (!QUIZ_TOPICS.includes(req.query.topic)) throw new HttpError(400, 'Unknown topic');
    params.push(req.query.topic); where.push(`q.topic = $${params.length}`);
  }
  if (req.query.difficulty) {
    if (!DIFFICULTIES.includes(req.query.difficulty)) throw new HttpError(400, 'Unknown difficulty');
    params.push(req.query.difficulty); where.push(`q.difficulty = $${params.length}`);
  }
  if (req.query.ids) {
    const ids = String(req.query.ids).split(',').map((x) => toId(x)).slice(0, 50);
    params.push(ids); where.push(`q.id = ANY($${params.length}::int[])`);
  }
  if (req.query.mode === 'review') where.push('s.wrong > 0 AND s.box < 3');
  return { where, params };
}

// Questions are sent WITHOUT answers or explanations.
r.get('/quiz/questions', wrap(async (req, res) => {
  const { where, params } = questionFilter(req);
  const count = intIn(req.query.count, 1, 50, 'Count', 10);
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await query(`SELECT q.* FROM quiz_questions q LEFT JOIN quiz_stats s ON s.question_id = q.id ${w} ORDER BY random() LIMIT ${count}`, params);
  res.json({ items: rows.map(shapeQuestion) });
}));

r.post('/quiz/attempts', wrap(async (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.answers) || b.answers.length < 1 || b.answers.length > 50) throw new HttpError(400, 'Submit between 1 and 50 answers');
  const today = todayOf(req);
  const ids = b.answers.map((a) => toId(a.question_id));
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'Duplicate questions in submission');
  const { rows } = await query('SELECT * FROM quiz_questions WHERE id = ANY($1::int[])', [ids]);
  const byId = Object.fromEntries(rows.map((x) => [x.id, x]));
  const results = [];
  let score = 0;
  for (const a of b.answers) {
    const row = byId[a.question_id];
    if (!row) throw new HttpError(400, 'Unknown question in submission');
    const options = JSON.parse(row.options);
    const choice = a.choice === null || a.choice === undefined ? null : intIn(a.choice, 0, options.length - 1, 'Choice', 0);
    const correct = choice === row.answer;
    if (correct) score += 1;
    await recordResult(row.id, correct, today);
    results.push({ id: row.id, topic: row.topic, text: row.text, options, choice, answer: row.answer, correct, explanation: row.explanation });
  }
  const topic = b.topic && QUIZ_TOPICS.includes(b.topic) ? b.topic : '';
  const difficulty = b.difficulty && DIFFICULTIES.includes(b.difficulty) ? b.difficulty : '';
  const mode = oneOf(b.mode, ['random', 'review', 'retry'], 'Mode', 'random');
  const ins = await query('INSERT INTO quiz_attempts (topic, difficulty, mode, score, total, details) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at',
    [topic, difficulty, mode, score, results.length, JSON.stringify(results)]);
  res.status(201).json({ attempt_id: ins.rows[0].id, score, total: results.length, results });
}));

r.get('/quiz/attempts', wrap(async (req, res) => {
  const { rows } = await query('SELECT id, topic, difficulty, mode, score, total, created_at FROM quiz_attempts ORDER BY created_at DESC LIMIT 30');
  res.json({ items: rows });
}));
r.get('/quiz/attempts/:id', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM quiz_attempts WHERE id = $1', [toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Attempt not found');
  res.json({ ...rows[0], details: JSON.parse(rows[0].details) });
}));

r.get('/quiz/stats', wrap(async (req, res) => {
  const [att, topics, review, bank] = await Promise.all([
    query('SELECT COUNT(*)::int AS n, COALESCE(SUM(score),0)::int AS s, COALESCE(SUM(total),0)::int AS t FROM quiz_attempts'),
    query(`SELECT q.topic, SUM(s.correct)::int AS c, SUM(s.wrong)::int AS w FROM quiz_stats s JOIN quiz_questions q ON q.id = s.question_id GROUP BY q.topic`),
    query(`SELECT q.id, q.topic, q.text, s.wrong, s.box FROM quiz_stats s JOIN quiz_questions q ON q.id = s.question_id WHERE s.wrong > 0 AND s.box < 3 ORDER BY s.box, s.wrong DESC LIMIT 50`),
    query('SELECT topic, COUNT(*)::int AS n FROM quiz_questions GROUP BY topic ORDER BY topic'),
  ]);
  const a = att.rows[0];
  res.json({
    attempts: a.n, averagePercent: a.t ? Math.round((a.s / a.t) * 100) : 0,
    byTopic: topics.rows.map((x) => ({ topic: x.topic, percent: x.c + x.w ? Math.round((x.c / (x.c + x.w)) * 100) : 0, answered: x.c + x.w })),
    reviewList: review.rows, bank: bank.rows,
  });
}));

// Flashcards deliberately include the answer: the learner flips the card themselves.
r.get('/quiz/cards', wrap(async (req, res) => {
  const { where, params } = questionFilter(req);
  const count = intIn(req.query.count, 1, 50, 'Count', 10);
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await query(`SELECT q.* FROM quiz_questions q LEFT JOIN quiz_stats s ON s.question_id = q.id ${w} ORDER BY random() LIMIT ${count}`, params);
  res.json({ items: rows.map((x) => { const o = JSON.parse(x.options); return { id: x.id, topic: x.topic, difficulty: x.difficulty, front: x.text, options: o, back: o[x.answer], explanation: x.explanation }; }) });
}));
r.post('/quiz/cards/:id', wrap(async (req, res) => {
  const id = toId(req.params.id);
  if (!(await query('SELECT 1 FROM quiz_questions WHERE id = $1', [id])).rows[0]) throw new HttpError(404, 'Card not found');
  await recordResult(id, toBool(req.body && req.body.known), todayOf(req));
  res.json({ ok: true });
}));

// ---------- roadmap ----------
const ITEM_KEY = /^s(10|[1-9])-[a-z0-9-]{1,40}$/;
r.get('/roadmap', wrap(async (req, res) => {
  const [items, goals] = await Promise.all([
    query('SELECT item_key FROM roadmap_items'),
    query('SELECT id, text, stage, done FROM roadmap_goals ORDER BY done, id'),
  ]);
  res.json({ done: items.rows.map((x) => x.item_key), goals: goals.rows });
}));
r.put('/roadmap/items', wrap(async (req, res) => {
  const key = String((req.body && req.body.key) || '');
  if (!ITEM_KEY.test(key)) throw new HttpError(400, 'Invalid checklist item');
  if (toBool(req.body.done)) {
    await query('INSERT INTO roadmap_items (item_key, done_at) VALUES ($1,$2) ON CONFLICT (item_key) DO NOTHING', [key, todayOf(req)]);
  } else await query('DELETE FROM roadmap_items WHERE item_key = $1', [key]);
  res.json({ key, done: toBool(req.body.done) });
}));
r.post('/roadmap/goals', wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await query('INSERT INTO roadmap_goals (text, stage) VALUES ($1,$2) RETURNING id, text, stage, done',
    [text(b.text, 200, 'Goal', { required: true }), intIn(b.stage, 1, 10, 'Stage', 1)]);
  res.status(201).json(rows[0]);
}));
r.put('/roadmap/goals/:id', wrap(async (req, res) => {
  const { rows } = await query('UPDATE roadmap_goals SET done = $1 WHERE id = $2 RETURNING id, text, stage, done', [toBool(req.body && req.body.done), toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Goal not found');
  res.json(rows[0]);
}));
r.delete('/roadmap/goals/:id', wrap(async (req, res) => {
  const { rows } = await query('DELETE FROM roadmap_goals WHERE id = $1 RETURNING id', [toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Goal not found');
  res.status(204).end();
}));

// ---------- resources ----------
const RES_CATEGORIES = ['Linux', 'Networking', 'Python', 'Web Security', 'Cloud', 'Security Fundamentals', 'Career', 'Other'];
const RES_TYPES = ['article', 'course', 'video', 'documentation', 'practice lab'];
function parseResource(b) {
  b = b || {};
  return {
    title: text(b.title, 200, 'Title', { required: true }), url: httpUrl(b.url, 'URL'),
    category: oneOf(b.category, RES_CATEGORIES, 'Category', 'Other'), difficulty: oneOf(b.difficulty, DIFFICULTIES, 'Difficulty', 'Beginner'),
    type: oneOf(b.type, RES_TYPES, 'Type', 'article'), notes: text(b.notes, 4000, 'Notes'),
    completed: toBool(b.completed), favorite: toBool(b.favorite),
  };
}
const RES_COLS = ['title', 'url', 'category', 'difficulty', 'type', 'notes', 'completed', 'favorite'];

r.get('/resources', wrap(async (req, res) => {
  const { limit, offset } = paging(req, 100);
  const where = []; const params = [];
  const q = qstr(req.query.q);
  if (q) { params.push(like(q)); where.push(`(title ILIKE $${params.length} OR notes ILIKE $${params.length} OR url ILIKE $${params.length})`); }
  for (const [k, list] of [['category', RES_CATEGORIES], ['difficulty', DIFFICULTIES], ['type', RES_TYPES]]) {
    if (req.query[k]) { if (!list.includes(req.query[k])) throw new HttpError(400, `Invalid ${k} filter`); params.push(req.query[k]); where.push(`${k} = $${params.length}`); }
  }
  if (req.query.filter === 'favorite') where.push('favorite = TRUE');
  if (req.query.filter === 'completed') where.push('completed = TRUE');
  if (req.query.filter === 'todo') where.push('completed = FALSE');
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM resources ${w} ORDER BY favorite DESC, created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items: rows });
}));
r.post('/resources', wrap(async (req, res) => {
  const x = parseResource(req.body);
  const { rows } = await query(`INSERT INTO resources (${RES_COLS.join(',')}) VALUES (${RES_COLS.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`, RES_COLS.map((c) => x[c]));
  res.status(201).json(rows[0]);
}));
r.put('/resources/:id', wrap(async (req, res) => {
  const x = parseResource(req.body);
  const { rows } = await query(`UPDATE resources SET ${RES_COLS.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${RES_COLS.length + 1} RETURNING *`, [...RES_COLS.map((c) => x[c]), toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Resource not found');
  res.json(rows[0]);
}));
r.patch('/resources/:id', wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `UPDATE resources SET completed = COALESCE($1::boolean, completed), favorite = COALESCE($2::boolean, favorite) WHERE id = $3 RETURNING *`,
    ['completed' in b ? toBool(b.completed) : null, 'favorite' in b ? toBool(b.favorite) : null, toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Resource not found');
  res.json(rows[0]);
}));
r.delete('/resources/:id', wrap(async (req, res) => {
  const { rows } = await query('DELETE FROM resources WHERE id = $1 RETURNING id', [toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Resource not found');
  res.status(204).end();
}));

// ---------- portfolio ----------
// Public write-ups contain ONLY an explicit allow-list of fields from labs that are completed AND marked public.
export const PUBLIC_LAB_FIELDS = ['id', 'title', 'lab_date', 'category', 'difficulty', 'tags', 'objective', 'target_env', 'tools', 'procedure', 'observations', 'security_lessons', 'recommendations', 'learned'];

export async function buildPortfolio() {
  const settings = await getSettings();
  const { rows: labs } = await query(`SELECT ${PUBLIC_LAB_FIELDS.join(', ')}, time_spent_min FROM labs WHERE is_public = TRUE AND status = 'completed' ORDER BY completed_at DESC, id DESC`);
  const [agg, cmd, topics] = await Promise.all([
    query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(time_spent_min),0)::int AS m FROM labs WHERE status = 'completed'`),
    query('SELECT COUNT(*)::int AS n FROM command_state WHERE understood'),
    query('SELECT COUNT(*)::int AS n FROM topic_progress WHERE completed'),
  ]);
  const cats = {}; const tools = {};
  for (const l of labs) {
    cats[l.category] = (cats[l.category] || 0) + 1;
    for (const t of String(l.tools || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10)) tools[t] = (tools[t] || 0) + 1;
  }
  return {
    name: settings.display_name, github_url: settings.github_url, intro: settings.portfolio_intro,
    labs: labs.map(({ time_spent_min, ...rest }) => ({ ...rest, hours: Math.round((time_spent_min / 60) * 10) / 10 })),
    skills: {
      categories: Object.entries(cats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      tools: Object.entries(tools).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name]) => name),
      labsCompleted: agg.rows[0].n, labHours: Math.round((agg.rows[0].m / 60) * 10) / 10,
      commandsUnderstood: cmd.rows[0].n, networkingTopicsCompleted: topics.rows[0].n,
    },
  };
}

r.get('/portfolio/preview', wrap(async (req, res) => {
  const [portfolio, settings, candidates] = await Promise.all([
    buildPortfolio(), getSettings(),
    query(`SELECT id, title, category, is_public FROM labs WHERE status = 'completed' ORDER BY completed_at DESC, id DESC`),
  ]);
  res.json({ portfolio, published: settings.portfolio_public, candidates: candidates.rows });
}));

r.patch('/labs/:id/visibility', wrap(async (req, res) => {
  const id = toId(req.params.id);
  const makePublic = toBool(req.body && req.body.is_public);
  const lab = (await query('SELECT status FROM labs WHERE id = $1', [id])).rows[0];
  if (!lab) throw new HttpError(404, 'Lab not found');
  if (makePublic && lab.status !== 'completed') throw new HttpError(400, 'Only completed labs can be added to the portfolio.');
  const { rows } = await query('UPDATE labs SET is_public = $1 WHERE id = $2 RETURNING id, is_public', [makePublic, id]);
  res.json(rows[0]);
}));

export default r;
