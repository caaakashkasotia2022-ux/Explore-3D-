import { useMemo, useState } from 'react';
import Icon from '../Icon.jsx';
import { useViewer } from '../../store/viewerStore.js';
import { focusPart } from '../../lib/camera.js';

function highlight(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export default function ComponentList({ model }) {
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [layer, setLayer] = useState('all');
  const selectedId = useViewer((s) => s.selectedId);
  const hidden = useViewer((s) => s.hidden);
  const { select, toggleHidden, setHiddenMany, showOnlySystems } = useViewer.getState();

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    return model.systems
      .map((sys) => ({
        sys,
        parts: model.parts.filter(
          (p) => p.system === sys.id && (!query || p.name.toLowerCase().includes(query) || sys.name.toLowerCase().includes(query) || p.info?.what?.toLowerCase().includes(query)),
        ),
      }))
      .filter((g) => g.parts.length);
  }, [model, q]);

  const total = groups.reduce((n, g) => n + g.parts.length, 0);

  const pick = (id) => {
    if (hidden[id]) toggleHidden(id);
    select(id);
    focusPart(id);
  };

  const applyLayer = (l) => {
    setLayer(l.id);
    showOnlySystems(l.systems || null);
  };

  return (
    <div className="panel">
      <div className="list-head">
        <h3>Components <span className="tiny mono">{total}/{model.parts.length}</span></h3>
        <div className="search">
          <Icon name="search" size={15} />
          <input
            className="input"
            placeholder="Search parts, e.g. “heart”, “piston”…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && groups[0]?.parts[0]) pick(groups[0].parts[0].id); }}
            aria-label="Search components"
          />
        </div>
        {model.layers?.length > 0 && (
          <div className="layer-row" role="group" aria-label="Layer presets">
            <button className={layer === 'all' ? 'on' : ''} onClick={() => applyLayer({ id: 'all' })}>All</button>
            {model.layers.map((l) => (
              <button key={l.id} className={layer === l.id ? 'on' : ''} onClick={() => applyLayer(l)}>{l.name}</button>
            ))}
          </div>
        )}
      </div>
      <div className="list-body scroll-y">
        {groups.length === 0 && <p className="tiny" style={{ padding: 14 }}>No components match “{q}”.</p>}
        {groups.map(({ sys, parts }) => {
          const allHidden = parts.every((p) => hidden[p.id]);
          const open = !collapsed[sys.id] || q;
          return (
            <div className="sys" key={sys.id}>
              <div className="sys-head" onClick={() => setCollapsed((c) => ({ ...c, [sys.id]: !c[sys.id] }))}>
                <Icon name={open ? 'chevronD' : 'chevronR'} size={14} />
                <span className="sys-dot" style={{ background: sys.color || 'var(--accent)', color: sys.color || 'var(--accent)' }} />
                {sys.name}
                <span className="count">{parts.length}</span>
                <button
                  className="icon-btn"
                  style={{ width: 26, height: 26 }}
                  onClick={(e) => { e.stopPropagation(); setHiddenMany(parts.map((p) => p.id), !allHidden); }}
                  aria-label={`${allHidden ? 'Show' : 'Hide'} ${sys.name}`}
                  title={`${allHidden ? 'Show' : 'Hide'} system`}
                >
                  <Icon name={allHidden ? 'eyeOff' : 'eye'} size={14} />
                </button>
              </div>
              {open && parts.map((p) => (
                <div key={p.id} className={`part-row ${selectedId === p.id ? 'sel' : ''} ${hidden[p.id] ? 'off' : ''}`}>
                  <button className="name" onClick={() => pick(p.id)} onMouseEnter={() => useViewer.getState().hover(p.id)} onMouseLeave={() => useViewer.getState().hover(null)}>
                    {highlight(p.name, q.trim())}
                  </button>
                  <button className="icon-btn" onClick={() => toggleHidden(p.id)} aria-label={`${hidden[p.id] ? 'Show' : 'Hide'} ${p.name}`}>
                    <Icon name={hidden[p.id] ? 'eyeOff' : 'eye'} size={15} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
