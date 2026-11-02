import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon.jsx';
import MiniMarkdown from '../MiniMarkdown.jsx';
import { useViewer } from '../../store/viewerStore.js';
import { focusPart } from '../../lib/camera.js';
import { api } from '../../lib/api.js';

const SECTIONS = [
  ['what', 'What it is'],
  ['location', 'Where it is'],
  ['purpose', 'Purpose & function'],
  ['how', 'How it works'],
];

export default function InfoPanel({ model }) {
  const selectedId = useViewer((s) => s.selectedId);
  const level = useViewer((s) => s.level);
  const setLevel = useViewer((s) => s.setLevel);
  const hidden = useViewer((s) => s.hidden);
  const part = selectedId ? model.partById[selectedId] : null;

  return (
    <div className="panel">
      <AnimatePresence mode="wait">
        {part ? (
          <motion.div
            key={part.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.22 }}
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
          >
            <PartInfo part={part} model={model} level={level} setLevel={setLevel} hidden={!!hidden[part.id]} />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="info-empty scroll-y">
            <span className="eyebrow">{model.estimated ? 'Estimated model' : 'Explanation'}</span>
            <h3>{model.name}</h3>
            <p>{model.description}</p>
            <div className="info-sec">
              <h4>Get started</h4>
              <ul className="facts">
                <li><b>Click</b> any component in the 3D view (or the list) to learn what it is and how it works.</li>
                <li><b>Double-click</b> to fly the camera to it.</li>
                <li>Drag to rotate, scroll / pinch to zoom, right-drag or two fingers to pan.</li>
                <li>Use <b>Exploded view</b> to pull the parts apart, and <b>How it works</b> for a guided animation.</li>
              </ul>
            </div>
            <div className="info-sec">
              <h4>Systems</h4>
              <div className="conn">
                {model.systems.map((s) => (
                  <span key={s.id} style={{ borderStyle: 'solid', color: s.color }}>{s.name}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PartInfo({ part, model, level, setLevel, hidden }) {
  const sys = model.sysById[part.system];
  const info = part.info || {};
  const { select, toggleHidden } = useViewer.getState();
  const body = useRef();
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [part.id]);

  return (
    <>
      <div className="info-head">
        <span className="sys-tag"><span className="sys-dot" style={{ background: sys?.color, color: sys?.color }} />{sys?.name}</span>
        <h2>{part.name}</h2>
        <div className="info-actions">
          <div className="seg" role="group" aria-label="Explanation level">
            <button className={level === 'beginner' ? 'on' : ''} onClick={() => setLevel('beginner')}>Beginner</button>
            <button className={level === 'advanced' ? 'on' : ''} onClick={() => setLevel('advanced')}>Advanced</button>
          </div>
          <button className="icon-btn" title="Focus camera" aria-label="Focus camera on part" onClick={() => focusPart(part.id)}><Icon name="focus" /></button>
          <button className="icon-btn" title={hidden ? 'Show part' : 'Hide part'} aria-label={hidden ? 'Show part' : 'Hide part'} onClick={() => toggleHidden(part.id)}><Icon name={hidden ? 'eyeOff' : 'eye'} /></button>
          <button className="icon-btn" title="Close" aria-label="Deselect" onClick={() => select(null)}><Icon name="close" /></button>
        </div>
      </div>
      <div className="info-body scroll-y" ref={body}>
        {model.estimated && (
          <div className="estimate-banner" style={{ marginTop: 14 }}>
            <Icon name="alert" /> <span>AI-estimated component from your image — descriptions are an interpretation, not verified measurements.</span>
          </div>
        )}
        {SECTIONS.map(([k, label]) => info[k] && (
          <div className="info-sec" key={k}>
            <h4>{label}</h4>
            <p>{info[k]}</p>
          </div>
        ))}
        {info.connections?.length > 0 && (
          <div className="info-sec">
            <h4>Connects with</h4>
            <div className="conn">
              {info.connections.map((c) =>
                model.partById[c] ? (
                  <button key={c} onClick={() => { select(c); focusPart(c); }}>{model.partById[c].name}</button>
                ) : (
                  <span key={c}>{c}</span>
                ),
              )}
            </div>
          </div>
        )}
        {info.examples && (
          <div className="info-sec">
            <h4>Examples & applications</h4>
            <p>{info.examples}</p>
          </div>
        )}
        {level === 'advanced' && info.advanced && (
          <div className="info-sec">
            <h4>Technical detail</h4>
            <div className="advanced"><p>{info.advanced}</p></div>
          </div>
        )}
        {info.facts?.length > 0 && (
          <div className="info-sec">
            <h4>Key facts</h4>
            <ul className="facts">{info.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        )}
        {part.anim && (
          <div className="info-sec">
            <h4>Animation</h4>
            <p className="muted" style={{ fontSize: 13.5 }}>This part is animated — press <kbd>Space</kbd> or the play button, and change the speed in settings.</p>
          </div>
        )}
        <AskAI part={part} model={model} level={level} />
      </div>
    </>
  );
}

function AskAI({ part, model, level }) {
  const [state, setState] = useState({ status: 'idle', text: '', error: '' });
  const [q, setQ] = useState('');
  const ctrl = useRef();
  useEffect(() => {
    setState({ status: 'idle', text: '', error: '' });
    setQ('');
    return () => ctrl.current?.abort();
  }, [part.id]);

  const ask = async (question) => {
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setState({ status: 'loading', text: '', error: '' });
    try {
      const res = await api('/explain', {
        method: 'POST',
        signal: ctrl.current.signal,
        body: {
          subject: model.name,
          component: part.name,
          system: model.sysById[part.system]?.name,
          level,
          question: question || undefined,
          context: [part.info?.what, part.info?.purpose].filter(Boolean).join(' '),
        },
      });
      setState({ status: 'done', text: res.text, error: '' });
    } catch (e) {
      if (e.name === 'AbortError') return;
      setState({ status: 'error', text: '', error: e.message });
    }
  };

  return (
    <div className="ai-box">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <b style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="sparkles" size={16} /> AI tutor</b>
        {state.status !== 'loading' && (
          <button className="btn btn-sm" onClick={() => ask()}>{state.status === 'done' ? 'Explain again' : `Explain ${level === 'advanced' ? 'in depth' : 'simply'}`}</button>
        )}
      </div>
      {state.status === 'loading' && (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <div className="skeleton" style={{ height: 12 }} /><div className="skeleton" style={{ height: 12, width: '85%' }} /><div className="skeleton" style={{ height: 12, width: '60%' }} />
        </div>
      )}
      {state.status === 'error' && <p className="error-text">{state.error}</p>}
      {state.status === 'done' && <div style={{ marginTop: 10 }}><MiniMarkdown text={state.text} /></div>}
      <form className="ai-ask" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q.trim()); }}>
        <input className="input" style={{ height: 34, fontSize: 13 }} placeholder={`Ask about the ${part.name.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask the AI tutor" />
        <button className="btn btn-sm" disabled={!q.trim() || state.status === 'loading'}>Ask</button>
      </form>
    </div>
  );
}
