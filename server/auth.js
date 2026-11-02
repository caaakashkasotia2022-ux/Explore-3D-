import { Router } from 'express';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 30;
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  const [, saltHex, keyHex] = stored.split('$');
  const key = await scryptAsync(password, Buffer.from(saltHex, 'hex'), 64);
  return timingSafeEqual(key, Buffer.from(keyHex, 'hex'));
}

function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expires);
  return token;
}

/** Attaches req.user when a valid bearer token is present. Never rejects. */
export function optionalAuth(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (token) {
    const row = db
      .prepare('SELECT u.id, u.email, u.name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?')
      .get(sha256(token));
    if (row && new Date(row.expires_at) > new Date()) req.user = { id: row.id, email: row.email, name: row.name };
    req.tokenHash = sha256(token);
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to do that.', code: 'unauthorized' });
  next();
}

export const authRouter = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

authRouter.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!EMAIL.test(email || '')) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const clean = String(email).trim().toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(clean)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = { id: randomUUID(), email: clean, name: String(name || clean.split('@')[0]).slice(0, 60) };
  db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(user.id, user.email, user.name, await hashPassword(password));
  res.status(201).json({ user, token: createSession(user.id) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());
  if (!row || !(await verifyPassword(String(password || ''), row.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  res.json({ user: { id: row.id, email: row.email, name: row.name }, token: createSession(row.id) });
});

authRouter.post('/logout', (req, res) => {
  if (req.tokenHash) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.tokenHash);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
