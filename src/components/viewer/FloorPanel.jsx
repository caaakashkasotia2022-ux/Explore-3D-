import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon.jsx';
import { useViewer } from '../../store/viewerStore.js';

/** Buildings: floor-by-floor visibility and the construction-sequence animation. */
export default function FloorPanel({ model }) {
  const floorMax = useViewer((s) => s.floorMax);
  const stage = useViewer((s) => s.stage);
  const speed = useViewer((s) => s.speed);
  const { setFloorMax, setStage } = useViewer.getState();
  const [playing, setPlaying] = useState(false);
  const timer = useRef();
  const floors = model.floors || [];
  const stages = model.stages || [];

  useEffect(() => {
    if (!playing) return;
    const next = () => {
      const cur = useViewer.getState().stage;
      const idx = stages.findIndex((s) => s.id > (Number.isFinite(cur) ? cur : -Infinity));
      if (idx === -1) { setPlaying(false); return; }
      setStage(stages[idx].id);
      timer.current = setTimeout(next, 2200 / Math.max(speed, 0.3));
    };
    setStage(stages[0].id - 1);
    timer.current = setTimeout(next, 500);
    return () => clearTimeout(timer.current);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = stages.find((s) => s.id === stage);

  return (
    <div className="floor-panel panel">
      {stages.length > 0 && (
        <>
          <b style={{ fontSize: 13 }}>Construction</b>
          <button className={`btn btn-sm ${playing ? '' : 'btn-primary'}`} onClick={() => { if (playing) { setPlaying(false); setStage(Infinity); } else setPlaying(true); }}>
            <Icon name={playing ? 'pause' : 'play'} size={14} /> {playing ? 'Stop' : 'Build sequence'}
          </button>
          {Number.isFinite(stage) && (
            <div className="tiny" aria-live="polite">
              <b style={{ color: 'var(--accent)' }}>Stage {current ? stages.indexOf(current) + 1 : 0}/{stages.length}</b>
              {current && <> · {current.name}</>}
              <input type="range" min={stages[0].id - 1} max={stages[stages.length - 1].id} step="1" value={stage} onChange={(e) => { setPlaying(false); setStage(+e.target.value); }} aria-label="Construction stage" />
            </div>
          )}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
        </>
      )}
      {floors.length > 0 && (
        <>
          <b style={{ fontSize: 13 }}>Floors</b>
          <button className={`floor ${!Number.isFinite(floorMax) ? 'on' : ''}`} onClick={() => setFloorMax(Infinity)}>All floors</button>
          {[...floors].reverse().map((f) => (
            <button key={f.id} className={`floor ${floorMax === f.id ? 'on' : ''}`} onClick={() => setFloorMax(f.id)} title={`Show up to ${f.name}`}>
              ≤ {f.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
