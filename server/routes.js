import { Router } from 'express';
import { query } from './db.js';
import { NET_TOPICS } from './seed.js';

const r = Router();

import { HttpError, wrap, validDate, todayOf, addDays, daysBetween, toId, text, oneOf, toBool, intIn, like, cleanTags, paging, qstr, computeStreak, getSettings, parseSettingsUpdate } from './helpers.js';
import extra from './routes2.js';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const STATUSES = ['planned', 'in-progress', 'completed'];
const LAB_CATEGORIES = ['Linux', 'Networking', 'Ethical Hacking', 'Cloud', 'Security Fundamentals', 'Other'];
const NOTE_CATEGORIES = ['Linux', 'Networking', 'Python', 'C', 'Web Security', 'Cloud Security', 'Operating Systems', 'DBMS', 'Mathematics', 'Internship Preparation'];
const RISKS = ['Safe', 'Caution', 'Destructive'];

// ---------- settings ----------
r.get('/settings', wrap(async (req, res) => res.json(await getSettings())));

r.put('/settings', wrap(async (req, res) => {
  const updates = parseSettingsUpdate(req.body || {});
  for (const [key, value] of Object.entries(updates)) {
    await query('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value]);
  }
  res.json(await getSettings());
}));

// ---------- labs ----------
const LAB_TEXT = ['objective', 'target_env', 'tools', 'commands', 'procedure', 'expected', 'observations', 'learned', 'mistakes', 'security_lessons', 'recommendations', 'next_steps'];
const LAB_COLS = ['title', 'lab_date', 'category', 'difficulty', ...LAB_TEXT, 'tags', 'status', 'time_spent_min', 'is_public', 'authorized_confirmed'];

function parseLab(b, today) {
  b = b || {};
  const lab = {
    title: text(b.title, 200, 'Title', { required: true }),
    lab_date: b.lab_date ? (validDate(b.lab_date) ? b.lab_date : (() => { throw new HttpError(400, 'Date must be YYYY-MM-DD'); })()) : today,
    category: oneOf(b.category, LAB_CATEGORIES, 'Category', 'Linux'),
    difficulty: oneOf(b.difficulty, DIFFICULTIES, 'Difficulty', 'Beginner'),
  };
  for (const f of LAB_TEXT) lab[f] = text(b[f], 20000, f);
  lab.tags = cleanTags(b.tags);
  lab.status = oneOf(b.status, STATUSES, 'Status', 'planned');
  lab.time_spent_min = intIn(b.time_spent_min, 0, 100000, 'Time spent', 0);
  lab.is_public = toBool(b.is_public) && lab.status === 'completed';
  lab.authorized_confirmed = toBool(b.authorized_confirmed);
  if (lab.status !== 'planned' && lab.category !== 'Other' && !lab.authorized_confirmed) {
    throw new HttpError(400, 'Confirm every item of the Practice Safely checklist before starting a lab.');
  }
  return lab;
}

r.get('/labs', wrap(async (req, res) => {
  const { limit, page, offset } = paging(req);
  const where = [];
  const params = [];
  const q = qstr(req.query.q);
  if (q) {
    params.push(like(q));
    const p = `$${params.length}`;
    where.push(`(title ILIKE ${p} OR objective ILIKE ${p} OR tags ILIKE ${p} OR commands ILIKE ${p} OR observations ILIKE ${p} OR learned ILIKE ${p})`);
  }
  for (const [key, list] of [['category', LAB_CATEGORIES], ['difficulty', DIFFICULTIES], ['status', STATUSES]]) {
    const v = req.query[key];
    if (v) {
      if (!list.includes(v)) throw new HttpError(400, `Invalid ${key} filter`);
      params.push(v);
      where.push(`${key} = $${params.length}`);
    }
  }
  const sorts = {
    date: 'lab_date DESC, id DESC',
    updated: 'updated_at DESC',
    difficulty: "CASE difficulty WHEN 'Beginner' THEN 1 WHEN 'Intermediate' THEN 2 ELSE 3 END, lab_date DESC",
    status: "CASE status WHEN 'in-progress' THEN 1 WHEN 'planned' THEN 2 ELSE 3 END, lab_date DESC",
  };
  const order = sorts[req.query.sort] || sorts.date;
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await query(`SELECT COUNT(*)::int AS n FROM labs ${w}`, params)).rows[0].n;
  const { rows } = await query(`SELECT * FROM labs ${w} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items: rows, total, page, limit });
}));

r.get('/labs/:id', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM labs WHERE id = $1', [toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Lab not found');
  res.json(rows[0]);
}));

r.post('/labs', wrap(async (req, res) => {
  const today = todayOf(req);
  const lab = parseLab(req.body, today);
  const completedAt = lab.status === 'completed' ? today : null;
  const cols = [...LAB_COLS, 'completed_at'];
  const vals = [...LAB_COLS.map((c) => lab[c]), completedAt];
  const { rows } = await query(
    `INSERT INTO labs (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, vals);
  res.status(201).json(rows[0]);
}));

r.put('/labs/:id', wrap(async (req, res) => {
  const id = toId(req.params.id);
  const today = todayOf(req);
  const existing = (await query('SELECT completed_at FROM labs WHERE id = $1', [id])).rows[0];
  if (!existing) throw new HttpError(404, 'Lab not found');
  const lab = parseLab(req.body, today);
  const completedAt = lab.status === 'completed' ? (existing.completed_at || today) : null;
  const cols = [...LAB_COLS, 'completed_at'];
  const vals = [...LAB_COLS.map((c) => lab[c]), completedAt];
  const set = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const { rows } = await query(`UPDATE labs SET ${set}, updated_at = now() WHERE id = $${cols.length + 1} RETURNING *`, [...vals, id]);
  res.json(rows[0]);
}));

r.delete('/labs/:id', wrap(async (req, res) => {
  const { rows } = await query('DELETE FROM labs WHERE id = $1 RETURNING id', [toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Lab not found');
  res.status(204).end();
}));

// ---------- notes ----------
function parseNote(b) {
  b = b || {};
  let lab_id = null;
  if (b.lab_id !== null && b.lab_id !== undefined && b.lab_id !== '') lab_id = toId(b.lab_id);
  return {
    title: text(b.title, 200, 'Title') || 'Untitled note',
    body: text(b.body, 100000, 'Body'),
    category: oneOf(b.category, NOTE_CATEGORIES, 'Category', 'Linux'),
    tags: cleanTags(b.tags),
    pinned: toBool(b.pinned),
    favorite: toBool(b.favorite),
    lab_id,
  };
}
const NOTE_COLS = ['title', 'body', 'category', 'tags', 'pinned', 'favorite', 'lab_id'];

r.get('/notes', wrap(async (req, res) => {
  const { limit, page, offset } = paging(req, 200);
  const where = [];
  const params = [];
  const q = qstr(req.query.q);
  if (q) { params.push(like(q)); where.push(`(title ILIKE $${params.length} OR body ILIKE $${params.length} OR tags ILIKE $${params.length})`); }
  if (req.query.category) {
    if (!NOTE_CATEGORIES.includes(req.query.category)) throw new HttpError(400, 'Invalid category filter');
    params.push(req.query.category); where.push(`category = $${params.length}`);
  }
  if (req.query.filter === 'favorite') where.push('favorite = TRUE');
  if (req.query.filter === 'pinned') where.push('pinned = TRUE');
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await query(`SELECT COUNT(*)::int AS n FROM notes ${w}`, params)).rows[0].n;
  const { rows } = await query(
    `SELECT n.*, l.title AS lab_title FROM notes n LEFT JOIN labs l ON l.id = n.lab_id ${w.replace(/\b(title|body|tags|category|favorite|pinned)\b/g, 'n.$1')}
     ORDER BY n.pinned DESC, n.updated_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
  res.json({ items: rows, total, page, limit });
}));

r.post('/notes', wrap(async (req, res) => {
  const n = parseNote(req.body);
  const { rows } = await query(
    `INSERT INTO notes (${NOTE_COLS.join(', ')}) VALUES (${NOTE_COLS.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    NOTE_COLS.map((c) => n[c]));
  res.status(201).json(rows[0]);
}));

r.put('/notes/:id', wrap(async (req, res) => {
  const n = parseNote(req.body);
  const set = NOTE_COLS.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const { rows } = await query(
    `UPDATE notes SET ${set}, updated_at = now() WHERE id = $${NOTE_COLS.length + 1} RETURNING *`,
    [...NOTE_COLS.map((c) => n[c]), toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Note not found');
  res.json(rows[0]);
}));

r.delete('/notes/:id', wrap(async (req, res) => {
  const { rows } = await query('DELETE FROM notes WHERE id = $1 RETURNING id', [toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Note not found');
  res.status(204).end();
}));

// ---------- commands ----------
r.get('/commands', wrap(async (req, res) => {
  const where = [];
  const params = [];
  const q = qstr(req.query.q);
  if (q) {
    params.push(like(q));
    const p = `$${params.length}`;
    where.push(`(c.name ILIKE ${p} OR c.syntax ILIKE ${p} OR c.description ILIKE ${p} OR c.hindi ILIKE ${p})`);
  }
  if (req.query.category) { params.push(req.query.category); where.push(`c.category = $${params.length}`); }
  if (req.query.risk) {
    if (!RISKS.includes(req.query.risk)) throw new HttpError(400, 'Invalid risk filter');
    params.push(req.query.risk); where.push(`c.risk = $${params.length}`);
  }
  if (req.query.filter === 'favorite') where.push('COALESCE(s.favorite, FALSE) = TRUE');
  if (req.query.filter === 'understood') where.push('COALESCE(s.understood, FALSE) = TRUE');
  if (req.query.filter === 'todo') where.push('COALESCE(s.understood, FALSE) = FALSE');
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT c.*, COALESCE(s.favorite, FALSE) AS favorite, COALESCE(s.understood, FALSE) AS understood
     FROM commands c LEFT JOIN command_state s ON s.command_id = c.id ${w} ORDER BY c.sort_order, c.name`, params);
  res.json({ items: rows, total: rows.length });
}));

r.patch('/commands/:id/state', wrap(async (req, res) => {
  const b = req.body || {};
  const fav = 'favorite' in b ? toBool(b.favorite) : null;
  const und = 'understood' in b ? toBool(b.understood) : null;
  const { rows } = await query(
    `INSERT INTO command_state (command_id, favorite, understood) VALUES ($1, COALESCE($2::boolean, FALSE), COALESCE($3::boolean, FALSE))
     ON CONFLICT (command_id) DO UPDATE SET favorite = COALESCE($2::boolean, command_state.favorite), understood = COALESCE($3::boolean, command_state.understood)
     RETURNING command_id, favorite, understood`, [toId(req.params.id), fav, und]);
  res.json(rows[0]);
}));

// ---------- networking topic progress ----------
r.get('/topics/progress', wrap(async (req, res) => {
  const { rows } = await query('SELECT slug, completed, best_score FROM topic_progress');
  res.json({ items: rows, total: NET_TOPICS.length });
}));

r.put('/topics/:slug', wrap(async (req, res) => {
  const slug = req.params.slug;
  if (!NET_TOPICS.includes(slug)) throw new HttpError(404, 'Unknown topic');
  const b = req.body || {};
  const completed = 'completed' in b ? toBool(b.completed) : null;
  const score = b.score == null ? null : intIn(b.score, 0, 100, 'Score');
  const { rows } = await query(
    `INSERT INTO topic_progress (slug, completed, best_score) VALUES ($1, COALESCE($2::boolean, FALSE), $3::int)
     ON CONFLICT (slug) DO UPDATE SET completed = COALESCE($2::boolean, topic_progress.completed),
       best_score = GREATEST(COALESCE($3::int, topic_progress.best_score), COALESCE(topic_progress.best_score, 0)), updated_at = now()
     RETURNING slug, completed, best_score`, [slug, completed, score]);
  res.json(rows[0]);
}));

// ---------- study sessions ----------
r.post('/sessions', wrap(async (req, res) => {
  const b = req.body || {};
  const minutes = intIn(b.minutes, 1, 720, 'Minutes', 0);
  if (!minutes) throw new HttpError(400, 'Minutes must be between 1 and 720');
  const lab_id = b.lab_id ? toId(b.lab_id) : null;
  const { rows } = await query(
    'INSERT INTO study_sessions (session_date, minutes, subject, lab_id) VALUES ($1,$2,$3,$4) RETURNING *',
    [todayOf(req), minutes, text(b.subject, 100, 'Subject'), lab_id]);
  res.status(201).json(rows[0]);
}));

r.get('/sessions', wrap(async (req, res) => {
  const { limit } = paging(req, 30);
  const { rows } = await query('SELECT * FROM study_sessions ORDER BY created_at DESC LIMIT $1', [limit]);
  res.json({ items: rows });
}));

r.delete('/sessions/:id', wrap(async (req, res) => {
  const { rows } = await query('DELETE FROM study_sessions WHERE id = $1 RETURNING id', [toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Session not found');
  res.status(204).end();
}));

// ---------- daily mission ----------
r.post('/missions/:id/toggle', wrap(async (req, res) => {
  const id = toId(req.params.id);
  const today = todayOf(req);
  const exists = (await query('SELECT 1 FROM missions WHERE id = $1', [id])).rows[0];
  if (!exists) throw new HttpError(404, 'Mission not found');
  const del = await query('DELETE FROM mission_done WHERE mission_id = $1 AND done_date = $2 RETURNING mission_id', [id, today]);
  if (del.rows[0]) return res.json({ done: false });
  await query('INSERT INTO mission_done (mission_id, done_date) VALUES ($1,$2)', [id, today]);
  res.json({ done: true });
}));

// ---------- practice platforms (editable reference data) ----------
function parsePlatform(b) {
  b = b || {};
  const url = text(b.url, 500, 'URL', { required: true });
  let parsed;
  try { parsed = new URL(url); } catch { throw new HttpError(400, 'URL is not valid'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(400, 'URL must start with http:// or https://');
  return { name: text(b.name, 100, 'Name', { required: true }), description: text(b.description, 600, 'Description'), level: text(b.level, 60, 'Level'), url: parsed.toString() };
}
r.get('/platforms', wrap(async (req, res) => res.json({ items: (await query('SELECT * FROM platforms ORDER BY name')).rows })));
r.post('/platforms', wrap(async (req, res) => {
  const p = parsePlatform(req.body);
  const { rows } = await query('INSERT INTO platforms (name, description, level, url) VALUES ($1,$2,$3,$4) RETURNING *', [p.name, p.description, p.level, p.url]);
  res.status(201).json(rows[0]);
}));
r.put('/platforms/:id', wrap(async (req, res) => {
  const p = parsePlatform(req.body);
  const { rows } = await query('UPDATE platforms SET name=$1, description=$2, level=$3, url=$4 WHERE id=$5 RETURNING *', [p.name, p.description, p.level, p.url, toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Platform not found');
  res.json(rows[0]);
}));
r.delete('/platforms/:id', wrap(async (req, res) => {
  const { rows } = await query('DELETE FROM platforms WHERE id = $1 RETURNING id', [toId(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, 'Platform not found');
  res.status(204).end();
}));

// ---------- dashboard (everything computed from stored data) ----------
r.get('/dashboard', wrap(async (req, res) => {
  const today = todayOf(req);
  const settings = await getSettings();
  const weekStart = addDays(today, -6);

  const [labAgg, sessAgg, week, activity, completedLabs, labCats, cmdAgg, topics, notesCount, recentNotes, recentLabs, upcoming, missions, missionDone] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'completed')::int AS completed, COALESCE(SUM(time_spent_min), 0)::int AS minutes FROM labs`),
    query('SELECT COUNT(*)::int AS n, COALESCE(SUM(minutes), 0)::int AS total FROM study_sessions'),
    query('SELECT session_date AS d, SUM(minutes)::int AS m FROM study_sessions WHERE session_date >= $1 GROUP BY session_date', [weekStart]),
    query(`SELECT session_date AS d FROM study_sessions UNION SELECT completed_at FROM labs WHERE completed_at IS NOT NULL UNION SELECT done_date FROM mission_done`),
    query(`SELECT completed_at AS d FROM labs WHERE status = 'completed' AND completed_at IS NOT NULL`),
    query(`SELECT category, COUNT(*)::int AS n FROM labs WHERE status = 'completed' GROUP BY category`),
    query('SELECT (SELECT COUNT(*) FROM commands)::int AS total, (SELECT COUNT(*) FROM command_state WHERE understood)::int AS understood'),
    query('SELECT slug FROM topic_progress WHERE completed'),
    query('SELECT COUNT(*)::int AS n FROM notes'),
    query('SELECT id, title, category, updated_at FROM notes ORDER BY updated_at DESC LIMIT 5'),
    query(`SELECT id, title, category, completed_at FROM labs WHERE status = 'completed' ORDER BY completed_at DESC, id DESC LIMIT 5`),
    query(`SELECT id, title, category, status, lab_date FROM labs WHERE status <> 'completed' ORDER BY (status = 'in-progress') DESC, lab_date ASC LIMIT 5`),
    query('SELECT * FROM missions ORDER BY id'),
    query('SELECT mission_id FROM mission_done WHERE done_date = $1', [today]),
  ]);

  const labs = labAgg.rows[0];
  const sess = sessAgg.rows[0];
  const dateSet = new Set(activity.rows.map((x) => x.d));
  const streak = computeStreak(dateSet, today);

  const byDay = Object.fromEntries(week.rows.map((x) => [x.d, x.m]));
  const weekly = Array.from({ length: 7 }, (_, i) => { const d = addDays(weekStart, i); return { date: d, minutes: byDay[d] || 0 }; });
  const minutesToday = byDay[today] || 0;

  const weeks = Array.from({ length: 8 }, (_, i) => ({ weeksAgo: 7 - i, count: 0 }));
  for (const x of completedLabs.rows) {
    const idx = Math.floor(daysBetween(x.d, today) / 7);
    if (idx >= 0 && idx < 8) weeks[7 - idx].count += 1;
  }

  const topicsDone = topics.rows.length;
  const netPct = Math.round((topicsDone / NET_TOPICS.length) * 100);
  const linuxPct = cmdAgg.rows[0].total ? Math.round((cmdAgg.rows[0].understood / cmdAgg.rows[0].total) * 100) : 0;
  const catCount = Object.fromEntries(labCats.rows.map((x) => [x.category, x.n]));
  const LAB_TARGET = 5;
  const labPct = (name) => Math.min(100, Math.round(((catCount[name] || 0) / LAB_TARGET) * 100));
  const categories = [
    { name: 'Linux', percent: linuxPct, detail: `${cmdAgg.rows[0].understood} of ${cmdAgg.rows[0].total} commands understood` },
    { name: 'Networking', percent: netPct, detail: `${topicsDone} of ${NET_TOPICS.length} topics completed` },
    { name: 'Ethical Hacking', percent: labPct('Ethical Hacking'), detail: `${catCount['Ethical Hacking'] || 0} of ${LAB_TARGET} target labs completed` },
    { name: 'Cloud', percent: labPct('Cloud'), detail: `${catCount.Cloud || 0} of ${LAB_TARGET} target labs completed` },
    { name: 'Security Fundamentals', percent: labPct('Security Fundamentals'), detail: `${catCount['Security Fundamentals'] || 0} of ${LAB_TARGET} target labs completed` },
  ];
  const overall = Math.round(categories.reduce((a, c) => a + c.percent, 0) / categories.length);

  let mission = null;
  if (missions.rows.length) {
    const dayOfYear = daysBetween(`${today.slice(0, 4)}-01-01`, today);
    const m = missions.rows[dayOfYear % missions.rows.length];
    mission = { ...m, done: missionDone.rows.some((x) => x.mission_id === m.id) };
  }

  const achievements = [
    { id: 'first-lab', title: 'First lab completed', earned: labs.completed >= 1 },
    { id: 'five-labs', title: 'Five labs completed', earned: labs.completed >= 5 },
    { id: 'streak-3', title: '3-day learning streak', earned: streak >= 3 },
    { id: 'streak-7', title: '7-day learning streak', earned: streak >= 7 },
    { id: 'cmds-10', title: '10 commands understood', earned: cmdAgg.rows[0].understood >= 10 },
    { id: 'net-5', title: '5 networking topics completed', earned: topicsDone >= 5 },
    { id: 'hours-10', title: '10 hours of study logged', earned: sess.total >= 600 },
    { id: 'first-note', title: 'First note written', earned: notesCount.rows[0].n >= 1 },
  ];

  const inProgress = upcoming.rows.find((l) => l.status === 'in-progress');
  const nextTopic = NET_TOPICS.find((s) => !topics.rows.some((t) => t.slug === s));
  const cont = inProgress
    ? { label: `Resume lab: ${inProgress.title}`, to: `/labs/${inProgress.id}/edit` }
    : nextTopic ? { label: 'Next networking topic', to: `/networking/${nextTopic}` }
      : { label: 'Review Linux commands', to: '/commands' };

  res.json({
    today, settings,
    stats: { streak, completedLabs: labs.completed, totalLabs: labs.total, labHours: Math.round((labs.minutes / 60) * 10) / 10, studySessions: sess.n, studyMinutes: sess.total, notes: notesCount.rows[0].n, overallProgress: overall },
    goal: { dailyMinutes: settings.daily_goal_minutes, minutesToday },
    mission, weekly, labsOverTime: weeks, categories,
    recent: { notes: recentNotes.rows, labs: recentLabs.rows, achievements, upcoming: upcoming.rows },
    continue: cont,
  });
}));

// ---------- export / reset ----------
r.get('/export', wrap(async (req, res) => {
  const tables = { labs: 'SELECT * FROM labs ORDER BY id', notes: 'SELECT * FROM notes ORDER BY id', study_sessions: 'SELECT * FROM study_sessions ORDER BY id',
    command_state: 'SELECT cs.*, c.name AS command_name FROM command_state cs JOIN commands c ON c.id = cs.command_id', topic_progress: 'SELECT * FROM topic_progress', mission_done: 'SELECT * FROM mission_done', quiz_attempts: 'SELECT id, topic, difficulty, mode, score, total, created_at FROM quiz_attempts', quiz_stats: 'SELECT * FROM quiz_stats', roadmap_items: 'SELECT * FROM roadmap_items', roadmap_goals: 'SELECT * FROM roadmap_goals', resources: 'SELECT * FROM resources ORDER BY id', platforms: 'SELECT * FROM platforms ORDER BY id' };
  const out = { app: 'cyberlab-journal', exported_at: new Date().toISOString(), settings: await getSettings() };
  for (const [k, sql] of Object.entries(tables)) out[k] = (await query(sql)).rows;
  res.setHeader('Content-Disposition', 'attachment; filename="cyberlab-export.json"');
  res.json(out);
}));

r.delete('/data', wrap(async (req, res) => {
  if (!req.body || req.body.confirm !== 'DELETE') throw new HttpError(400, 'Type DELETE to confirm.');
  for (const t of ['study_sessions', 'mission_done', 'notes', 'labs', 'command_state', 'topic_progress', 'quiz_stats', 'quiz_attempts', 'roadmap_items', 'roadmap_goals', 'resources', 'settings']) await query(`DELETE FROM ${t}`);
  res.json({ cleared: true });
}));

r.use(extra);

export default r;
