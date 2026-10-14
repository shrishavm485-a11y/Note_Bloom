import { query } from './db.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const validDate = (s) => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const todayOf = (req) => {
  const h = req.get('x-client-date');
  return validDate(h) ? h : new Date().toISOString().slice(0, 10);
};
export const addDays = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

export const toId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647) throw new HttpError(400, 'Invalid id');
  return n;
};
export const text = (v, max, name, { required = false } = {}) => {
  const s = v == null ? '' : String(v).trim();
  if (required && !s) throw new HttpError(400, `${name} is required`);
  if (s.length > max) throw new HttpError(400, `${name} is too long (max ${max} characters)`);
  return s;
};
export const oneOf = (v, list, name, def) => {
  if (v == null || v === '') return def;
  if (!list.includes(v)) throw new HttpError(400, `${name} must be one of: ${list.join(', ')}`);
  return v;
};
export const toBool = (v) => v === true || v === 'true';
export const intIn = (v, min, max, name, def = 0) => {
  if (v == null || v === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${name} must be a whole number between ${min} and ${max}`);
  return n;
};
export const like = (q) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
export const cleanTags = (v) => {
  const arr = Array.isArray(v) ? v : String(v ?? '').split(',');
  const out = [];
  for (const t of arr) {
    const s = String(t).trim().toLowerCase().slice(0, 30);
    if (s && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 12).join(', ');
};
export const paging = (req, defLimit = 50) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || defLimit, 1), 200);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  return { limit, page, offset: (page - 1) * limit };
};
export const qstr = (v) => (typeof v === 'string' ? v.trim().slice(0, 100) : '');
export const httpUrl = (v, name = 'URL', { required = true } = {}) => {
  const s = text(v, 500, name, { required });
  if (!s) return '';
  let u;
  try { u = new URL(s); } catch { throw new HttpError(400, `${name} is not a valid URL`); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new HttpError(400, `${name} must start with http:// or https://`);
  return u.toString();
};

export function computeStreak(dateSet, today) {
  let cursor = dateSet.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (dateSet.has(cursor)) { streak += 1; cursor = addDays(cursor, -1); }
  return streak;
}
export async function activityDates() {
  const { rows } = await query(`SELECT session_date AS d FROM study_sessions UNION SELECT completed_at FROM labs WHERE completed_at IS NOT NULL UNION SELECT done_date FROM mission_done`);
  return new Set(rows.map((x) => x.d));
}

// ---------- settings ----------
export const LAB_CATEGORIES = ['Linux', 'Networking', 'Ethical Hacking', 'Cloud', 'Security Fundamentals', 'Other'];
export const DEFAULT_SETTINGS = {
  display_name: 'Operator', theme: 'cybercore', language: 'both',
  daily_goal_minutes: '60', weekly_goal_minutes: '300',
  focus_min: '25', short_break_min: '5', long_break_min: '15', sound: 'true', notifications: 'false',
  github_url: '', portfolio_intro: '', portfolio_public: 'false', preferred_categories: '[]',
};
export async function getSettings() {
  const { rows } = await query('SELECT key, value FROM settings');
  const s = { ...DEFAULT_SETTINGS };
  for (const row of rows) if (row.key in DEFAULT_SETTINGS) s[row.key] = row.value;
  let preferred = [];
  try { preferred = JSON.parse(s.preferred_categories).filter((c) => LAB_CATEGORIES.includes(c)); } catch { preferred = []; }
  return {
    display_name: s.display_name, theme: s.theme, language: s.language,
    daily_goal_minutes: Number(s.daily_goal_minutes), weekly_goal_minutes: Number(s.weekly_goal_minutes),
    focus_min: Number(s.focus_min), short_break_min: Number(s.short_break_min), long_break_min: Number(s.long_break_min),
    sound: s.sound === 'true', notifications: s.notifications === 'true',
    github_url: s.github_url, portfolio_intro: s.portfolio_intro, portfolio_public: s.portfolio_public === 'true',
    preferred_categories: preferred,
  };
}

export function parseSettingsUpdate(b) {
  const u = {};
  if ('display_name' in b) u.display_name = text(b.display_name, 40, 'Display name', { required: true });
  if ('theme' in b) u.theme = oneOf(b.theme, ['cybercore', 'soft'], 'Theme', 'cybercore');
  if ('language' in b) u.language = oneOf(b.language, ['both', 'en', 'hi'], 'Language', 'both');
  if ('daily_goal_minutes' in b) u.daily_goal_minutes = String(intIn(b.daily_goal_minutes, 5, 720, 'Daily goal', 60));
  if ('weekly_goal_minutes' in b) u.weekly_goal_minutes = String(intIn(b.weekly_goal_minutes, 5, 5040, 'Weekly goal', 300));
  if ('focus_min' in b) u.focus_min = String(intIn(b.focus_min, 1, 180, 'Focus minutes', 25));
  if ('short_break_min' in b) u.short_break_min = String(intIn(b.short_break_min, 1, 60, 'Short break minutes', 5));
  if ('long_break_min' in b) u.long_break_min = String(intIn(b.long_break_min, 1, 120, 'Long break minutes', 15));
  if ('sound' in b) u.sound = String(toBool(b.sound));
  if ('notifications' in b) u.notifications = String(toBool(b.notifications));
  if ('portfolio_public' in b) u.portfolio_public = String(toBool(b.portfolio_public));
  if ('portfolio_intro' in b) u.portfolio_intro = text(b.portfolio_intro, 1500, 'Portfolio introduction');
  if ('github_url' in b) {
    const g = httpUrl(b.github_url, 'GitHub URL', { required: false });
    if (g && new URL(g).hostname !== 'github.com') throw new HttpError(400, 'GitHub URL must be on github.com');
    u.github_url = g;
  }
  if ('preferred_categories' in b) {
    const arr = Array.isArray(b.preferred_categories) ? b.preferred_categories : [];
    u.preferred_categories = JSON.stringify(arr.filter((c) => LAB_CATEGORIES.includes(c)));
  }
  return u;
}
