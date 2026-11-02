import { aiStatus } from '../server/ai.js';

export default function handler(_req, res) {
  const configured = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  res.json({
    ok: true,
    ai: configured && aiStatus(),
    uploads: false,
    accounts: false,
    model: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
  });
}
