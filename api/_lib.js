// Shared helpers for the Vercel serverless functions in /api.
// These are stateless: no database or file storage (Vercel's filesystem is ephemeral),
// so accounts and server-side uploads are only available with the full Node server.
import { AiUnavailableError } from '../server/ai.js';

// Best-effort limiter: per warm function instance only. Use Vercel's firewall rate
// limiting (or a shared store such as Upstash Redis) for real protection.
const hits = new Map();
export function limited(req, res, max, windowMs = 60_000) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    res.status(429).json({ error: 'Too many requests — please wait a minute and try again.', code: 'rate_limited' });
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

export function onlyPost(req, res) {
  if (req.method === 'POST') return false;
  res.setHeader('Allow', 'POST');
  res.status(405).json({ error: 'Method not allowed' });
  return true;
}

export function sendError(res, err) {
  if (err instanceof AiUnavailableError) return res.status(503).json({ error: err.message, code: 'ai_unavailable' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? 'Unexpected server error.' : err.message });
}
