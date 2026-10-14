import crypto from 'node:crypto';
import { Router } from 'express';

// Single-user protection. If APP_PASSWORD is set, every private API route needs a signed token.
// If it is NOT set, the API is open: only acceptable for local use.
const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const authRequired = Boolean(PASSWORD);

if (authRequired && !process.env.SESSION_SECRET) {
  console.warn('[auth] SESSION_SECRET not set: logins will be invalidated on every restart.');
}
if (!authRequired && process.env.NODE_ENV === 'production') {
  console.warn('[auth] WARNING: APP_PASSWORD is not set. Anyone with the URL can read and change your data.');
}

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

function issueToken() {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${sign(exp)}`;
}

function validToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}

const bearer = (req) => {
  const h = req.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
};

const attempts = new Map(); // ip -> { count, resetAt }
function tooManyAttempts(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) return false;
  return rec.count >= 10;
}
function noteFailure(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  else rec.count += 1;
}

export const authRouter = Router();

authRouter.get('/status', (req, res) => {
  res.json({ required: authRequired, authenticated: !authRequired || validToken(bearer(req)) });
});

authRouter.post('/login', (req, res) => {
  if (!authRequired) return res.json({ token: '', required: false });
  const ip = req.ip;
  if (tooManyAttempts(ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  const given = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (crypto.timingSafeEqual(sha(given), sha(PASSWORD))) {
    attempts.delete(ip);
    return res.json({ token: issueToken(), required: true });
  }
  noteFailure(ip);
  return res.status(401).json({ error: 'Incorrect password.' });
});

export function requireAuth(req, res, next) {
  if (!authRequired || validToken(bearer(req))) return next();
  return res.status(401).json({ error: 'Authentication required' });
}
