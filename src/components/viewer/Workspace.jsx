import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Viewer3D from './Viewer3D.jsx';
import ControlDock from './ControlDock.jsx';
import ComponentList from './ComponentList.jsx';
import InfoPanel from './InfoPanel.jsx';
import StepsBar from './StepsBar.jsx';
import FloorPanel from './FloorPanel.jsx';
import Icon from '../Icon.jsx';
import { useViewer } from '../../store/viewerStore.js';
import { resetCamera, zoom, focusPart } from '../../lib/camera.js';

/** The complete exploration UI: list | 3D stage | explanation panel. */
export default function Workspace({ model, header, banner, onSave, initialState }) {
  const wrap = useRef();
  const [full, setFull] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null);
  const selectedId = useViewer((s) => s.selectedId);
  const explode = useViewer((s) => s.explode);

  useEffect(() => {
    useViewer.getState().setModel(model);
    setStepsOpen(false);
    if (initialState) {
      // Wait a frame so camera controls exist.
      const t = setTimeout(() => useViewer.getState().restore(initialState), 120);
      return () => clearTimeout(t);
    }
  }, [model, initialState]);

  // On phones, open the info sheet when something is selected.
  useEffect(() => { if (selectedId && window.innerWidth <= 900) setMobilePanel('info'); }, [selectedId]);

  const toggleFull = useCallback(() => {
    const el = wrap.current;
    if (!document.fullscreenElement) {
      (el.requestFullscreen?.() || Promise.reject()).catch(() => setFull((f) => !f));
    } else document.exitFullscreen();
  }, []);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = useViewer.getState();
      const c = s.controls;
      const step = e.shiftKey ? 0.35 : 0.15;
      const panStep = (s.bounds?.radius ?? 2) * 0.05;
      const k = e.key.toLowerCase();
      const handled = true;
      switch (k) {
        case 'arrowleft': c?.rotate(-step, 0, true); break;
        case 'arrowright': c?.rotate(step, 0, true); break;
        case 'arrowup': c?.rotate(0, -step, true); break;
        case 'arrowdown': c?.rotate(0, step, true); break;
        case 'a': c?.truck(-panStep, 0, true); break;
        case 'd': c?.truck(panStep, 0, true); break;
        case 'w': c?.truck(0, -panStep, true); break;
        case 's': c?.truck(0, panStep, true); break;
        case '+': case '=': zoom(0.25); break;
        case '-': case '_': zoom(-0.33); break;
        case 'e': s.toggleExplode(); break;
        case 't': s.setTransparency(!s.transparency); break;
        case 'l': s.setLabels(!s.labels); break;
        case 'r': resetCamera(); break;
        case 'f': toggleFull(); break;
        case 'h': if (s.selectedId) s.toggleHidden(s.selectedId); break;
        case ' ': s.setAnimate(!s.animate); break;
        case 'enter': if (s.selectedId) focusPart(s.selectedId); break;
        case 'escape': s.select(null); break;
        default: return;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFull]);

  const hasFloors = model.floors?.length || model.stages?.length;

  return (
    <div ref={wrap} className={`workspace ${full ? 'full' : ''}`}>
      <aside className={`side ${mobilePanel === 'list' ? 'open' : ''}`} aria-label="Component list">
        <ComponentList model={model} />
      </aside>

      <section className="stage" aria-label={`${model.name} 3D viewer`}>
        <Viewer3D model={model} />
        <div className="stage-top">
          <div className="model-title">
            {header}
            {banner}
          </div>
        </div>
        <div className="mobile-tabs">
          <button className={`icon-btn panel ${mobilePanel === 'list' ? 'active' : ''}`} onClick={() => setMobilePanel((p) => (p === 'list' ? null : 'list'))} aria-label="Components"><Icon name="layers" /></button>
          <button className={`icon-btn panel ${mobilePanel === 'info' ? 'active' : ''}`} onClick={() => setMobilePanel((p) => (p === 'info' ? null : 'info'))} aria-label="Explanation"><Icon name="info" /></button>
        </div>
        {hasFloors ? <FloorPanel model={model} /> : null}
        <div className="explode-slider panel">
          <Icon name="explode" size={16} />
          <input type="range" min="0" max="1" step="0.01" value={explode} onChange={(e) => useViewer.getState().setExplode(+e.target.value)} aria-label="Exploded view amount" />
          <span className="mono">{Math.round(explode * 100)}%</span>
        </div>
        <AnimatePresence>{stepsOpen && model.steps?.length > 0 && <StepsBar model={model} onClose={() => setStepsOpen(false)} />}</AnimatePresence>
        <ControlDock
          fullscreen={full}
          onFullscreen={toggleFull}
          onSave={onSave}
          hasSteps={model.steps?.length > 0}
          stepsOpen={stepsOpen}
          onSteps={() => { if (stepsOpen) { useViewer.getState().exitSteps(); } setStepsOpen((o) => !o); }}
        />
        <div className="kbd-hint">Drag to rotate · Scroll to zoom · Right-drag to pan · <kbd>?</kbd> in settings for keys</div>
      </section>

      <aside className={`side ${mobilePanel === 'info' ? 'open' : ''}`} aria-label="Explanation">
        <InfoPanel model={model} />
      </aside>
    </div>
  );
}
