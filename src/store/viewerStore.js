import { create } from 'zustand';

/**
 * State of the main 3D viewer. Parts read this every frame via getState()
 * (no React re-render), UI panels subscribe with selectors.
 */
const initial = {
  model: null,
  selectedId: null,
  hoveredId: null,
  hidden: {},          // partId -> true
  explode: 0,          // 0..1 target
  transparency: false,
  section: { enabled: false, axis: 'x', value: 0.5, flip: false },
  animate: true,
  speed: 1,
  labels: false,
  mode: 'rotate',      // rotate | pan
  autoRotate: false,
  floorMax: Infinity,
  stage: Infinity,     // construction stage shown
  constructing: false,
  focusSet: null,      // Set of part ids highlighted by a guided step
  stepIndex: -1,
  level: 'beginner',
  isolate: false,      // dim everything except the selection
  controls: null,      // camera-controls instance
  scene: null,         // root group of the model (for bounds)
  bounds: null,        // { center:[x,y,z], radius }
};

export const useViewer = create((set, get) => ({
  ...initial,

  reset: (model) => set({ ...initial, model, controls: get().controls, level: get().level, floorMax: Infinity, stage: Infinity }),
  setModel: (model) => {
    const hidden = {};
    for (const p of model.parts) if (p.hiddenByDefault) hidden[p.id] = true;
    set({ ...initial, model, hidden, controls: get().controls, level: get().level });
  },

  select: (id) => set({ selectedId: id }),
  hover: (id) => set({ hoveredId: id }),
  toggleHidden: (id) => set((s) => {
    const hidden = { ...s.hidden };
    if (hidden[id]) delete hidden[id]; else hidden[id] = true;
    return { hidden, selectedId: hidden[id] && s.selectedId === id ? null : s.selectedId };
  }),
  setHiddenMany: (ids, value) => set((s) => {
    const hidden = { ...s.hidden };
    for (const id of ids) { if (value) hidden[id] = true; else delete hidden[id]; }
    return { hidden };
  }),
  showAll: () => set({ hidden: {} }),
  showOnlySystems: (systemIds) => set((s) => {
    const hidden = {};
    if (systemIds) for (const p of s.model.parts) if (!systemIds.includes(p.system)) hidden[p.id] = true;
    return { hidden, selectedId: null };
  }),

  setExplode: (explode) => set({ explode }),
  toggleExplode: () => set((s) => ({ explode: s.explode > 0.5 ? 0 : 1 })),
  setTransparency: (transparency) => set({ transparency }),
  setSection: (patch) => set((s) => ({ section: { ...s.section, ...patch } })),
  setAnimate: (animate) => set({ animate }),
  setSpeed: (speed) => set({ speed }),
  setLabels: (labels) => set({ labels }),
  setMode: (mode) => set({ mode }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setFloorMax: (floorMax) => set({ floorMax }),
  setStage: (stage) => set({ stage }),
  setConstructing: (constructing) => set({ constructing }),
  setLevel: (level) => set({ level }),
  setIsolate: (isolate) => set({ isolate }),
  setControls: (controls) => set({ controls }),
  setScene: (scene, bounds) => set({ scene, bounds }),

  runStep: (index) => {
    const { model } = get();
    const step = model?.steps?.[index];
    if (!step) return set({ stepIndex: -1, focusSet: null });
    // Reveal anything the step is about (e.g. muscles hidden by default).
    const hidden = { ...get().hidden };
    for (const id of step.focus || []) delete hidden[id];
    set({
      hidden,
      stepIndex: index,
      focusSet: step.focus?.length ? new Set(step.focus) : null,
      selectedId: step.focus?.[0] ?? null,
      explode: step.explode ?? get().explode,
      animate: step.animate ?? get().animate,
    });
  },
  exitSteps: () => set({ stepIndex: -1, focusSet: null }),

  /** Serialisable snapshot for saved projects. */
  snapshot: () => {
    const s = get();
    const c = s.controls;
    const camera = c ? { position: c.getPosition(undefined).toArray(), target: c.getTarget(undefined).toArray() } : null;
    return {
      selectedId: s.selectedId, hidden: s.hidden, explode: s.explode, transparency: s.transparency,
      section: s.section, speed: s.speed, labels: s.labels, level: s.level,
      floorMax: Number.isFinite(s.floorMax) ? s.floorMax : null, camera,
    };
  },
  restore: (snap) => {
    if (!snap) return;
    set({
      selectedId: snap.selectedId ?? null, hidden: snap.hidden || {}, explode: snap.explode ?? 0,
      transparency: !!snap.transparency, section: snap.section || initial.section, speed: snap.speed ?? 1,
      labels: !!snap.labels, level: snap.level || 'beginner', floorMax: snap.floorMax ?? Infinity,
    });
    const c = get().controls;
    if (c && snap.camera) c.setLookAt(...snap.camera.position, ...snap.camera.target, true);
  },
}));
