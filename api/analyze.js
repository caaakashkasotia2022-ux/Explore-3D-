import { analyzeImage, decodeImage } from '../server/ai.js';
import { limited, onlyPost, sendError } from './_lib.js';

export default async function handler(req, res) {
  if (onlyPost(req, res) || limited(req, res, 6)) return;
  try {
    const { buffer, mime } = decodeImage(req.body);
    res.json({ analysis: await analyzeImage(buffer, mime) });
  } catch (e) {
    sendError(res, e);
  }
}
