import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../Icon.jsx';
import { useViewer } from '../../store/viewerStore.js';
import { focusParts, resetCamera } from '../../lib/camera.js';

/** Guided "How it works" animation: steps through model.steps, framing and highlighting parts. */
export default function StepsBar({ model, onClose }) {
  const stepIndex = useViewer((s) => s.stepIndex);
  const runStep = useViewer((s) => s.runStep);
  const speed = useViewer((s) => s.speed);
  const [playing, setPlaying] = useState(false);
  const steps = model.steps;
  const step = steps[stepIndex];

  const go = (i) => {
    runStep(i);
    // Let the explode animation start before framing.
    setTimeout(() => focusParts(steps[i]?.focus), 350);
  };

  useEffect(() => { if (stepIndex < 0) go(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (stepIndex < steps.length - 1) go(stepIndex + 1);
      else setPlaying(false);
    }, 6500 / Math.max(speed, 0.3));
    return () => clearTimeout(t);
  }, [playing, stepIndex, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    useViewer.getState().exitSteps();
    resetCamera();
    onClose();
  };

  if (!step) return null;
  return (
    <motion.div className="steps-bar panel" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }} role="region" aria-label="How it works">
      <div className="top">
        <span className="eyebrow">Step {stepIndex + 1}/{steps.length}</span>
        <div className="step-dots">
          {steps.map((s, i) => <button key={i} className={i === stepIndex ? 'on' : ''} onClick={() => go(i)} aria-label={`Step ${i + 1}: ${s.title}`} />)}
        </div>
        <span style={{ flex: 1 }} />
        <button className="icon-btn" onClick={() => go(Math.max(0, stepIndex - 1))} disabled={stepIndex === 0} aria-label="Previous step"><Icon name="chevronL" /></button>
        <button className={`icon-btn ${playing ? 'active' : ''}`} onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause tour' : 'Auto-play tour'}><Icon name={playing ? 'pause' : 'play'} /></button>
        <button className="icon-btn" onClick={() => go(Math.min(steps.length - 1, stepIndex + 1))} disabled={stepIndex === steps.length - 1} aria-label="Next step"><Icon name="chevronR" /></button>
        <button className="icon-btn" onClick={close} aria-label="Close guided steps"><Icon name="close" /></button>
      </div>
      <motion.div key={stepIndex} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
        <h4>{step.title}</h4>
        <p>{step.text}</p>
      </motion.div>
      {playing && (
        <div className="progress" style={{ height: 3 }}>
          <motion.div key={stepIndex} initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 6.5 / Math.max(speed, 0.3), ease: 'linear' }} />
        </div>
      )}
    </motion.div>
  );
}
