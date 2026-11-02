import { explain } from '../server/ai.js';
import { limited, onlyPost, sendError } from './_lib.js';

export default async function handler(req, res) {
  if (onlyPost(req, res) || limited(req, res, 20)) return;
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
    sendError(res, e);
  }
}
