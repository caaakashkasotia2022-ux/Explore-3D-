// Tiny, safe markdown subset for AI answers: paragraphs, headings, bullet lists, **bold**, `code`.
function inline(text) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith('**') ? <b key={k++}>{t.slice(2, -2)}</b> : <code key={k++}>{t.slice(1, -1)}</code>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function MiniMarkdown({ text }) {
  const blocks = [];
  let list = null;
  for (const raw of (text || '').split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^\s*(?:[-*•]|\d+\.)\s+(.*)/.exec(line);
    if (bullet) {
      if (!list) { list = []; blocks.push({ type: 'ul', items: list }); }
      list.push(bullet[1]);
      continue;
    }
    list = null;
    if (!line.trim()) continue;
    const h = /^#{1,4}\s+(.*)/.exec(line);
    blocks.push(h ? { type: 'h', text: h[1] } : { type: 'p', text: line });
  }
  return (
    <div className="ai-text">
      {blocks.map((b, i) =>
        b.type === 'ul' ? <ul key={i}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>
          : b.type === 'h' ? <p key={i}><b>{inline(b.text)}</b></p>
            : <p key={i}>{inline(b.text)}</p>,
      )}
    </div>
  );
}
