import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, dbHealth } from './db.js';
import { authRouter, requireAuth, authRequired } from './auth.js';
import api from './routes.js';
import publicApi from './publicRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Render terminates TLS in front of the app
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  next();
});

const startedAt = Date.now();
app.get('/api/health', async (req, res) => {
  const database = await dbHealth();
  res.status(database.ok ? 200 : 503).json({
    status: database.ok ? 'ok' : 'degraded',
    app: 'cyberlab-journal',
    version: '1.0.0',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    time: new Date().toISOString(),
    database,
    passwordProtected: authRequired,
  });
});

app.use('/api/auth', authRouter);
app.use('/api/public', publicApi);
app.use('/api', requireAuth, api);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.type('text').send('API running. Build the frontend with "npm run build" or use "npm run dev".'));
}

// Centralised error handling
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  let status = err.status || 500;
  let message = err.message;
  if (err.code === '23503') { status = 400; message = 'A linked item does not exist.'; }
  if (status >= 500) { console.error('[error]', err); message = 'Internal server error'; }
  res.status(status).json({ error: message });
});

const PORT = Number(process.env.PORT) || 3000;
try {
  await initDb();
  app.listen(PORT, '0.0.0.0', () => console.log(`[server] CyberLab Journal listening on 0.0.0.0:${PORT}`));
} catch (e) {
  console.error('[startup] failed:', e.message);
  process.exit(1);
}
