import express from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, json, parse } from './db.js';
import { authRouter, optionalAuth, requireAuth } from './auth.js';
import { analyzeImage, explain, aiStatus, probeAi, decodeImage, AiUnavailableError } from './ai.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(root, 'storage', 'uploads');
const DIST = path.join(root, '..', 'dist');
const PORT = Number(process.env.PORT) || 8787;
await mkdir(UPLOAD_DIR, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => (req.path === '/api/analyze' ? next() : express.json({ limit: '2mb' })(req, res, next)));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use('/api', optionalAuth);

// --- Simple in-memory rate limiter for the costly AI endpoints -------------------
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const key = `${req.path}:${req.user?.id || req.ip}`;
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) return res.status(429).json({ error: 'Too many requests — please wait a minute and try again.', code: 'rate_limited' });
    list.push(now);
    hits.set(key, list);
    next();
  };
}

// uploads/accounts: this full server stores files and users. The Vercel functions in /api don't.
app.get('/api/health', (_req, res) => res.json({ ok: true, ai: aiStatus(), uploads: true, accounts: true, model: process.env.CLAUDE_MODEL || 'claude-opus-5-5' }));
app.use('/api/auth', authRouter);

// --- Uploads ---------------------------------------------------------------------
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (MIME_EXT[file.mimetype]) cb(null, true);
    else cb(Object.assign(new Error('Unsupported file type. Please upload a JPG, PNG or WEBP image.'), { status: 415 }));
  },
});

/** Trust bytes, not the declared mime type. */
function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

app.post('/api/uploads', rateLimit(30, 60_000), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image received.' });
  const mime = sniff(req.file.buffer);
  if (!mime) return res.status(415).json({ error: 'That file is not a valid JPG, PNG or WEBP image.' });
  const id = randomUUID();
  const filename = `${id}.${MIME_EXT[mime]}`;
  await writeFile(path.join(UPLOAD_DIR, filename), req.file.buffer);
  db.prepare('INSERT INTO uploads (id, user_id, filename, original_name, mime, size) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.user?.id ?? null, filename, String(req.file.originalname || '').slice(0, 200), mime, req.file.size);
  res.status(201).json({ id, url: `/files/${filename}`, mime, size: req.file.size });
});

app.post('/api/uploads/:id/analyze', rateLimit(8, 60_000), async (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM uploads WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Upload not found.' });
    if (row.analysis && !req.query.refresh) return res.json({ analysis: parse(row.analysis), cached: true });
    const buf = await readFile(path.join(UPLOAD_DIR, row.filename));
    const analysis = await analyzeImage(buf, row.mime);
    db.prepare('UPDATE uploads SET analysis = ? WHERE id = ?').run(json(analysis), row.id);
    res.json({ analysis });
  } catch (e) {
    next(e);
  }
});

app.get('/api/uploads/:id', (req, res) => {
  const row = db.prepare('SELECT id, filename, mime, size, analysis, created_at FROM uploads WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Upload not found.' });
  res.json({ id: row.id, url: `/files/${row.filename}`, mime: row.mime, size: row.size, analysis: parse(row.analysis) });
});

// Uploaded files: unguessable UUID names, served with a strict content type.
app.get('/files/:name', (req, res) => {
  const name = path.basename(req.params.name);
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) return res.status(404).end();
  const file = path.join(UPLOAD_DIR, name);
  if (!existsSync(file)) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.sendFile(file);
});

// Stateless analysis (same contract as the Vercel function api/analyze.js).
app.post('/api/analyze', express.json({ limit: '8mb' }), rateLimit(8, 60_000), async (req, res, next) => {
  try {
    const { buffer, mime } = decodeImage(req.body);
    res.json({ analysis: await analyzeImage(buffer, mime) });
  } catch (e) {
    next(e);
  }
});

// --- AI explanations ---------------------------------------------------------------
app.post('/api/explain', rateLimit(20, 60_000), async (req, res, next) => {
  try {
    const { subject, component, system, level, question, context } = req.body || {};
    if (!subject || !component) return res.status(400).json({ error: 'subject and component are required.' });
    const text = await explain({
      subject: String(subject).slice(0, 120),
      component: String(component).slice(0, 120),
      system: system ? String(system).slice(0, 80) : undefined,
      level: level === 'advanced' ? 'advanced' : 'beginner',
      question: question ? String(question).slice(0, 500) : undefined,
      context: context ? String(context).slice(0, 800) : undefined,
    });
    res.json({ text });
  } catch (e) {
    next(e);
  }
});

// --- Projects ----------------------------------------------------------------------
const toProject = (r) => ({
  id: r.id, name: r.name, modelId: r.model_id, state: parse(r.state), thumbnail: r.thumbnail,
  extra: parse(r.extra), createdAt: r.created_at, updatedAt: r.updated_at,
});

app.get('/api/projects', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  res.json({ projects: rows.map(toProject) });
});
app.get('/api/projects/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Project not found.' });
  res.json({ project: toProject(row) });
});
app.post('/api/projects', requireAuth, (req, res) => {
  const { name, modelId, state, thumbnail, extra } = req.body || {};
  if (!name || !modelId) return res.status(400).json({ error: 'name and modelId are required.' });
  const id = randomUUID();
  db.prepare('INSERT INTO projects (id, user_id, name, model_id, state, thumbnail, extra) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, String(name).slice(0, 120), String(modelId).slice(0, 80), json(state), validThumb(thumbnail), json(extra));
  res.status(201).json({ project: toProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id)) });
});
app.put('/api/projects/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Project not found.' });
  const b = req.body || {};
  db.prepare("UPDATE projects SET name = ?, state = ?, thumbnail = ?, extra = ?, updated_at = datetime('now') WHERE id = ?").run(
    b.name ? String(b.name).slice(0, 120) : row.name,
    b.state !== undefined ? json(b.state) : row.state,
    b.thumbnail !== undefined ? validThumb(b.thumbnail) : row.thumbnail,
    b.extra !== undefined ? json(b.extra) : row.extra,
    row.id,
  );
  res.json({ project: toProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(row.id)) });
});
app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!r.changes) return res.status(404).json({ error: 'Project not found.' });
  res.json({ ok: true });
});
function validThumb(t) {
  return typeof t === 'string' && t.startsWith('data:image/jpeg;base64,') && t.length < 400_000 ? t : null;
}

// --- Production: serve the built SPA -------------------------------------------------
if (existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api\/|\/files\/).*/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// --- Errors -------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  if (err instanceof AiUnavailableError) return res.status(503).json({ error: err.message, code: 'ai_unavailable' });
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 10 MB).' : err.message;
    return res.status(413).json({ error: msg, code: err.code });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? 'Unexpected server error.' : err.message });
});

app.listen(PORT, async () => {
  const ok = await probeAi();
  console.log(`Explore3D API on http://localhost:${PORT}  (AI: ${ok ? 'enabled' : 'disabled – set ANTHROPIC_API_KEY to enable image analysis & AI tutor'})`);
});

