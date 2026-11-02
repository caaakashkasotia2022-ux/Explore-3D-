import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
// Server-side refusal fallback: if Claude declines, the API re-runs the request on a
// recommended fallback model inside the same call.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

export class AiUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.code = 'ai_unavailable';
  }
}

let client = null;
let credentialsBroken = false;
function getClient() {
  if (process.env.AI_DISABLED === '1') throw new AiUnavailableError('AI features are disabled on this server.');
  if (credentialsBroken) throw new AiUnavailableError('The server has no valid Claude API credentials configured.');
  if (!client) {
    try {
      // Resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile.
      client = new Anthropic({ maxRetries: 2, timeout: 120_000 });
    } catch (e) {
      credentialsBroken = true;
      throw new AiUnavailableError(`Claude API client could not start: ${e.message}`);
    }
  }
  return client;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const badRequest = (message, status = 400) => Object.assign(new Error(message), { status });

/** Decodes `{ image: <base64 or data URL> }` and checks the bytes really are JPG/PNG/WEBP. */
export function decodeImage(body) {
  const raw = typeof body?.image === 'string' ? body.image.replace(/^data:[^,]+,/, '') : '';
  if (!raw) throw badRequest('No image received.');
  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) throw badRequest('Image is too large for analysis (max 5 MB after resizing).', 413);
  let mime = null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) mime = 'image/jpeg';
  else if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) mime = 'image/png';
  else if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') mime = 'image/webp';
  if (!mime) throw badRequest('That file is not a valid JPG, PNG or WEBP image.', 415);
  return { buffer, mime };
}

/** Cheap credential check at startup (Models API, no tokens billed). */
export async function probeAi() {
  try {
    await getClient().models.retrieve(MODEL);
    return true;
  } catch (e) {
    const mapped = mapError(e);
    if (mapped instanceof AiUnavailableError) credentialsBroken = true;
    return !credentialsBroken;
  }
}

export function aiStatus() {
  if (process.env.AI_DISABLED === '1') return false;
  if (credentialsBroken) return false;
  return true;
}

function mapError(e) {
  if (e instanceof AiUnavailableError) return e;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    credentialsBroken = true;
    return new AiUnavailableError('The server’s Claude API credentials were rejected.');
  }
  if (e instanceof Anthropic.RateLimitError) return Object.assign(new Error('The AI service is busy. Please try again in a moment.'), { status: 429 });
  if (e instanceof Anthropic.APIConnectionError) return Object.assign(new Error('Could not reach the AI service. Check the server’s internet connection.'), { status: 502 });
  if (e instanceof Anthropic.APIError) return Object.assign(new Error(`AI service error: ${e.message}`), { status: 502 });
  if (/credentials|api key|apiKey|authToken/i.test(e?.message || '')) {
    credentialsBroken = true;
    return new AiUnavailableError('The server has no Claude API credentials configured (set ANTHROPIC_API_KEY).');
  }
  return e;
}

const BOX = {
  type: 'object',
  additionalProperties: false,
  required: ['x', 'y', 'w', 'h'],
  properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } },
};

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'objects', 'best_match', 'match_confidence', 'match_reason', 'reconstruction'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    objects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'category', 'confidence', 'bbox', 'description', 'components'],
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: ['human_body', 'anatomy', 'car', 'engine', 'motorcycle', 'building', 'bridge', 'road', 'appliance', 'electronics', 'machine', 'other'] },
          confidence: { type: 'number' },
          bbox: BOX,
          description: { type: 'string' },
          components: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'what', 'purpose', 'how', 'bbox', 'visible'],
              properties: {
                name: { type: 'string' },
                what: { type: 'string' },
                purpose: { type: 'string' },
                how: { type: 'string' },
                bbox: BOX,
                visible: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    best_match: { type: 'string', enum: ['human', 'car', 'engine', 'motorcycle', 'building', 'bridge', 'road', 'phone', 'charger', 'printer', 'tv', 'ac', 'fridge', 'fan', 'iron', 'none'] },
    match_confidence: { type: 'number' },
    match_reason: { type: 'string' },
    reconstruction: {
      type: 'object',
      additionalProperties: false,
      required: ['feasible', 'quality', 'reason'],
      properties: {
        feasible: { type: 'boolean' },
        quality: { type: 'string', enum: ['good', 'approximate', 'poor'] },
        reason: { type: 'string' },
      },
    },
  },
};

const ANALYSIS_PROMPT = `You are the vision engine of an educational 3D exploration website. Analyse the attached image.

Return JSON matching the schema:
- title: a short name for what the image shows.
- summary: 2–3 plain-language sentences describing the image for a beginner.
- objects: the main visible objects (max 6, most important first). For each: category, confidence 0–1, a bounding box in normalised image coordinates (x,y = top-left corner, w,h = size, all 0–1), a short description, and its key components (max 8 per object). Components should be the meaningful functional parts a learner would want explained (e.g. for a bicycle: frame, chainring, chain, derailleur, brake caliper). For each component give: what it is, its purpose, how it works (1–2 sentences each, beginner-friendly), a normalised bbox of where it is (or your best estimate of where it would be if hidden), and visible=true only if it is actually visible in the image.
- best_match: which of the site's built-in detailed 3D models best represents the main subject (human = human anatomy, car = passenger car, engine = car engine, motorcycle, building = multi-storey building, bridge = any road/rail bridge, road = road or pavement, phone = smartphone, charger = phone/laptop power adapter, printer, tv = television or monitor, ac = air conditioner, fridge = refrigerator/freezer, fan = ceiling/table fan, iron = clothes iron), or "none".
- match_confidence 0–1 and match_reason: one sentence.
- reconstruction: whether an approximate 2.5D relief (depth-from-image) model is useful. A single photo cannot reveal hidden geometry, so quality is at best "approximate" unless the object is nearly flat. Explain the limitation honestly in reason.

Be accurate: do not invent components that make no sense for the object, and say clearly when you are unsure.`;

export async function analyzeImage(buffer, mime) {
  const c = getClient();
  try {
    const res = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ANALYSIS_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: buffer.toString('base64') } },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });
    if (res.stop_reason === 'refusal') {
      throw Object.assign(new Error('The AI declined to analyse this image. Try a different image.'), { status: 422 });
    }
    if (res.stop_reason === 'max_tokens') {
      throw Object.assign(new Error('The analysis was cut short. Please try again.'), { status: 502 });
    }
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const data = JSON.parse(text);
    return clampAnalysis(data);
  } catch (e) {
    if (e instanceof SyntaxError) throw Object.assign(new Error('The AI returned an unreadable analysis. Please retry.'), { status: 502 });
    throw mapError(e);
  }
}

const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
function clampBox(b) {
  const x = clamp01(b?.x);
  const y = clamp01(b?.y);
  return { x, y, w: Math.max(0.01, Math.min(1 - x, clamp01(b?.w))), h: Math.max(0.01, Math.min(1 - y, clamp01(b?.h))) };
}
function clampAnalysis(a) {
  a.objects = (a.objects || []).slice(0, 6).map((o) => ({
    ...o,
    confidence: clamp01(o.confidence),
    bbox: clampBox(o.bbox),
    components: (o.components || []).slice(0, 8).map((c) => ({ ...c, bbox: clampBox(c.bbox) })),
  }));
  a.match_confidence = clamp01(a.match_confidence);
  return a;
}

const EXPLAIN_SYSTEM = `You are a friendly, accurate tutor on an interactive 3D learning website. Learners click a component of a 3D model and ask about it.
Rules:
- Be factually precise. If something varies between designs, say so.
- Format: short paragraphs and "- " bullet lists; **bold** key terms. No tables, no headings longer than a few words. 120–220 words unless the learner asks for more.
- Beginner level: everyday analogies, no jargon without a quick definition.
- Advanced level: technical depth (materials, numbers, physics/physiology, failure modes, standards), still clear.
- Cover, when relevant: what it is, how it works, how it connects to neighbouring components, and a real-world example.`;

export async function explain({ subject, component, system, level, question, context }) {
  const c = getClient();
  const user = [
    `Model: ${subject}`,
    system ? `System: ${system}` : null,
    `Component: ${component}`,
    context ? `Known context: ${context}` : null,
    `Level: ${level === 'advanced' ? 'advanced / technical' : 'beginner'}`,
    question ? `Learner's question: ${question}` : 'Explain this component.',
  ].filter(Boolean).join('\n');
  try {
    const res = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      ...FALLBACK,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      system: EXPLAIN_SYSTEM,
      messages: [{ role: 'user', content: user }],
    });
    if (res.stop_reason === 'refusal') {
      throw Object.assign(new Error('The AI tutor declined this question.'), { status: 422 });
    }
    return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  } catch (e) {
    throw mapError(e);
  }
}
