import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon.jsx';
import { useViewer } from '../../store/viewerStore.js';
import { resetCamera, zoom } from '../../lib/camera.js';

function Btn({ icon, label, active, onClick, kbd }) {
  return (
    <button className={`icon-btn ${active ? 'active' : ''}`} onClick={onClick} aria-label={label} aria-pressed={active ?? undefined} title={kbd ? `${label} (${kbd})` : label}>
      <Icon name={icon} />
    </button>
  );
}

export default function ControlDock({ fullscreen, onFullscreen, onSave, hasSteps, stepsOpen, onSteps }) {
  const s = useViewer();
  const [pop, setPop] = useState(null);
  const toggle = (name) => setPop((p) => (p === name ? null : name));

  return (
    <>
      <AnimatePresence>
        {pop === 'section' && (
          <motion.div className="dock-pop panel" initial={{ opacity: 0, y: 10, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }}>
            <div className="row">
              <b>Section / cutaway</b>
              <div className="seg">
                <button className={!s.section.enabled ? 'on' : ''} onClick={() => s.setSection({ enabled: false })}>Off</button>
                <button className={s.section.enabled ? 'on' : ''} onClick={() => s.setSection({ enabled: true })}>On</button>
              </div>
            </div>
            <div className="row">
              <label>Cut axis</label>
              <div className="seg">
                {['x', 'y', 'z'].map((a) => (
                  <button key={a} className={s.section.axis === a ? 'on' : ''} onClick={() => s.setSection({ axis: a, enabled: true })}>{a.toUpperCase()}</button>
                ))}
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => s.setSection({ flip: !s.section.flip, enabled: true })}>Flip</button>
            </div>
            <div className="row">
              <label>Position</label>
              <input type="range" min="0" max="1" step="0.005" value={s.section.value} onChange={(e) => s.setSection({ value: +e.target.value, enabled: true })} aria-label="Section position" />
            </div>
          </motion.div>
        )}
        {pop === 'settings' && (
          <motion.div className="dock-pop panel" initial={{ opacity: 0, y: 10, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }}>
            <div className="row">
              <label>Animation speed</label>
              <input type="range" min="0.1" max="3" step="0.05" value={s.speed} onChange={(e) => s.setSpeed(+e.target.value)} aria-label="Animation speed" />
              <span className="mono tiny" style={{ width: 36 }}>{s.speed.toFixed(1)}×</span>
            </div>
            <div className="row">
              <label>Exploded view</label>
              <input type="range" min="0" max="1" step="0.01" value={s.explode} onChange={(e) => s.setExplode(+e.target.value)} aria-label="Explode amount" />
              <span className="mono tiny" style={{ width: 36 }}>{Math.round(s.explode * 100)}%</span>
            </div>
            <div className="row">
              <label>Auto-rotate (360°)</label>
              <div className="seg">
                <button className={!s.autoRotate ? 'on' : ''} onClick={() => s.setAutoRotate(false)}>Off</button>
                <button className={s.autoRotate ? 'on' : ''} onClick={() => s.setAutoRotate(true)}>On</button>
              </div>
            </div>
            <div className="row">
              <label>Isolate selection</label>
              <div className="seg">
                <button className={!s.isolate ? 'on' : ''} onClick={() => s.setIsolate(false)}>Off</button>
                <button className={s.isolate ? 'on' : ''} onClick={() => s.setIsolate(true)}>On</button>
              </div>
            </div>
            <div className="tiny">
              Keys: <kbd>←↑→↓</kbd> rotate · <kbd>W A S D</kbd> pan · <kbd>+</kbd>/<kbd>−</kbd> zoom · <kbd>E</kbd> explode · <kbd>T</kbd> transparency · <kbd>L</kbd> labels · <kbd>R</kbd> reset · <kbd>F</kbd> full screen · <kbd>Space</kbd> animate · <kbd>Esc</kbd> deselect
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dock panel" role="toolbar" aria-label="Viewer controls">
        <Btn icon="rotate" label="Rotate mode" active={s.mode === 'rotate'} onClick={() => s.setMode('rotate')} />
        <Btn icon="pan" label="Pan mode" active={s.mode === 'pan'} onClick={() => s.setMode('pan')} />
        <Btn icon="zoomIn" label="Zoom in" kbd="+" onClick={() => zoom(0.3)} />
        <Btn icon="zoomOut" label="Zoom out" kbd="−" onClick={() => zoom(-0.4)} />
        <span className="sep" />
        <Btn icon="explode" label="Exploded view" kbd="E" active={s.explode > 0.5} onClick={() => s.setExplode(1)} />
        <Btn icon="assemble" label="Assemble model" onClick={() => s.setExplode(0)} />
        <Btn icon="ghost" label="Transparency mode" kbd="T" active={s.transparency} onClick={() => s.setTransparency(!s.transparency)} />
        <Btn icon="section" label="Section / cutaway view" active={s.section.enabled || pop === 'section'} onClick={() => toggle('section')} />
        <Btn icon="label" label="Show labels" kbd="L" active={s.labels} onClick={() => s.setLabels(!s.labels)} />
        <Btn icon="eye" label="Show all components" onClick={() => s.showAll()} />
        <span className="sep" />
        <Btn icon={s.animate ? 'pause' : 'play'} label={s.animate ? 'Pause animation' : 'Play animation'} kbd="Space" active={s.animate} onClick={() => s.setAnimate(!s.animate)} />
        {hasSteps && <Btn icon="steps" label="How it works – guided steps" active={stepsOpen} onClick={onSteps} />}
        <Btn icon="sliders" label="Speed & settings" active={pop === 'settings'} onClick={() => toggle('settings')} />
        <span className="sep" />
        <Btn icon="reset" label="Reset camera" kbd="R" onClick={resetCamera} />
        <Btn icon={fullscreen ? 'exitFull' : 'fullscreen'} label={fullscreen ? 'Exit full screen' : 'Full screen'} kbd="F" active={fullscreen} onClick={onFullscreen} />
        {onSave && <Btn icon="save" label="Save to My Projects" onClick={onSave} />}
      </div>
    </>
  );
}
