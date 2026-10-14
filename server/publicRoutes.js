import { Router } from 'express';
import { wrap, getSettings } from './helpers.js';
import { buildPortfolio } from './routes2.js';

// Unauthenticated, read-only. Returns data only when the owner has explicitly published the portfolio.
const r = Router();
r.get('/portfolio', wrap(async (req, res) => {
  const settings = await getSettings();
  if (!settings.portfolio_public) return res.status(404).json({ error: 'This portfolio is not published.' });
  res.setHeader('Cache-Control', 'no-store');
  res.json(await buildPortfolio());
}));
export default r;
