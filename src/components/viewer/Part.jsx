import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getShapeGeometry } from '../../three/geometry.js';
import { makeMaterial, makeGlowMaterial, CLIP_PLANES } from '../../three/makeMaterial.js';
import { useViewer } from '../../store/viewerStore.js';
import { focusPart } from '../../lib/camera.js';

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const ACCENT = new THREE.Color('#4cc9f0');
const HOVER = new THREE.Color('#7b5cff');
const tmpV = new THREE.Vector3();
const noRaycast = () => null;

export default function Part({ part, model, interactive = true, stateRef }) {
  const group = useRef();
  const inner = useRef();
  const meshes = useRef([]);
  const state = useRef({ grow: part.stage != null ? 0 : 1, t: 0, clipped: false });
  const sysColor = model.sysById?.[part.system]?.color;

  const items = useMemo(
    () =>
      part.shapes.map((s) => ({
        geometry: s.geometry || getShapeGeometry(s),
        material: makeMaterial(s.material, { ghost: part.ghost, fallbackColor: sysColor }),
        glow: makeGlowMaterial(),
      })),
    [part, sysColor],
  );
  useEffect(() => () => items.forEach((i) => { i.material.dispose(); i.glow.dispose(); }), [items]);

  // Local centre (for labels / callouts).
  const center = useMemo(() => {
    const box = new THREE.Box3();
    items.forEach((i) => { if (!i.geometry.boundingBox) i.geometry.computeBoundingBox(); box.union(i.geometry.boundingBox); });
    return box.getCenter(new THREE.Vector3()).toArray();
  }, [items]);

  const isSelected = useViewer((s) => s.selectedId === part.id);
  // With X-ray / isolate on and a selection, label only the selection and what it connects to.
  const showLabel = useViewer((s) => {
    if (!s.labels || s.hidden[part.id]) return false;
    if (s.focusSet) return s.focusSet.has(part.id);
    if (!s.selectedId || !(s.transparency || s.isolate)) return true;
    return s.selectedId === part.id || !!model.partById?.[s.selectedId]?.info?.connections?.includes(part.id);
  });
  const explodeVec = useMemo(() => new THREE.Vector3(...part.explode), [part]);
  const basePos = useMemo(() => new THREE.Vector3(...part.position), [part]);

  useFrame((three, rawDt) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const st = stateRef ? stateRef.current : useViewer.getState();
    const k = 1 - Math.exp(-dt * 5);
    const ps = state.current;

    // Exploded-view position
    tmpV.copy(basePos).addScaledVector(explodeVec, st.explode * (model.explodeScale ?? 1));
    g.position.lerp(tmpV, k);

    // Visibility: hidden list, floor filter, construction stage
    const floorOk = part.floor == null || part.floor <= st.floorMax;
    const stageOk = part.stage == null || part.stage <= st.stage;
    const shown = !st.hidden[part.id] && floorOk;
    ps.grow += ((stageOk ? 1 : 0) - ps.grow) * (1 - Math.exp(-dt * 4));
    const grow = Math.max(ps.grow, 0.0001);
    g.scale.set(grow, Math.pow(grow, 0.6), grow);
    g.visible = shown && ps.grow > 0.02;

    // Mechanical / physiological animation
    const anim = part.anim;
    if (anim && inner.current) {
      if (st.animate) ps.t += dt * st.speed;
      const t = ps.t;
      const i = inner.current;
      const axis = AXES[anim.axis || 'y'];
      switch (anim.type) {
        case 'spin':
          i.rotation.set(0, 0, 0);
          i.rotateOnAxis(axis, t * (anim.speed ?? 2));
          break;
        case 'piston':
          i.position.copy(axis).multiplyScalar(Math.sin(t * (anim.speed ?? 4) + (anim.phase ?? 0)) * (anim.amplitude ?? 0.05));
          break;
        case 'rock':
          i.rotation.set(0, 0, 0);
          i.rotateOnAxis(axis, Math.sin(t * (anim.speed ?? 2) + (anim.phase ?? 0)) * (anim.amplitude ?? 0.2));
          break;
        case 'pulse': {
          const ph = (t * (anim.speed ?? 1.2)) % 1;
          const beat = Math.exp(-Math.pow((ph - 0.1) * 14, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.32) * 14, 2));
          i.scale.setScalar(1 + beat * (anim.amount ?? 0.06));
          break;
        }
        case 'breathe':
          i.scale.setScalar(1 + (0.5 + 0.5 * Math.sin(t * (anim.speed ?? 1.4))) * (anim.amount ?? 0.07));
          break;
        default:
          break;
      }
    }

    // Material state: dimming, highlight, clipping
    const selected = st.selectedId === part.id;
    const hovered = st.hoveredId === part.id;
    const focused = st.focusSet ? st.focusSet.has(part.id) : true;
    const dim = (!selected && (st.transparency || (st.isolate && st.selectedId))) || !focused;
    const pulse = 0.5 + 0.5 * Math.sin(three.clock.elapsedTime * 3.2);
    const wantClip = st.section.enabled;
    const flow = anim?.type === 'flow' && st.animate;

    for (let n = 0; n < items.length; n++) {
      const { material: m, glow } = items[n];
      const base = m.userData.baseOpacity;
      let target = dim ? Math.min(base, 0.1) : base;
      if (selected && part.ghost) target = Math.max(base, 0.5);
      m.opacity += (target - m.opacity) * k;
      const transparent = m.opacity < 0.985;
      if (transparent !== m.transparent) { m.transparent = transparent; m.needsUpdate = true; }
      m.depthWrite = m.opacity > 0.6;

      if (selected) {
        m.emissive.copy(ACCENT);
        m.emissiveIntensity = 0.25 + 0.25 * pulse;
      } else if (hovered) {
        m.emissive.copy(HOVER);
        m.emissiveIntensity = 0.22;
      } else {
        m.emissive.copy(m.userData.baseEmissive);
        m.emissiveIntensity = m.userData.baseEmissiveIntensity * (flow ? 0.6 + 0.8 * Math.abs(Math.sin(ps.t * (anim.speed ?? 3) + n)) : 1);
      }

      if (wantClip !== m.userData.clipped) {
        m.clippingPlanes = wantClip ? CLIP_PLANES : null;
        m.clipShadows = wantClip;
        glow.clippingPlanes = wantClip ? CLIP_PLANES : null;
        m.userData.clipped = wantClip;
        m.needsUpdate = true;
        glow.needsUpdate = true;
      }

      const gTarget = selected ? 0.9 + 0.4 * pulse : hovered ? 0.55 : 0;
      glow.uniforms.uIntensity.value += (gTarget - glow.uniforms.uIntensity.value) * Math.min(1, k * 2);
      glow.uniforms.uTime.value = three.clock.elapsedTime;
      glow.uniforms.uColor.value.copy(selected ? ACCENT : HOVER);

      const mesh = meshes.current[n * 2];
      const glowMesh = meshes.current[n * 2 + 1];
      if (glowMesh) glowMesh.visible = glow.uniforms.uIntensity.value > 0.01;
      if (mesh) mesh.userData.pickable = g.visible && m.opacity > 0.3;
    }
  });

  const handlers = interactive
    ? {
        onClick: (e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          const st = useViewer.getState();
          st.select(st.selectedId === part.id ? null : part.id);
        },
        onDoubleClick: (e) => { e.stopPropagation(); useViewer.getState().select(part.id); focusPart(part.id); },
        onPointerOver: (e) => { e.stopPropagation(); useViewer.getState().hover(part.id); document.body.style.cursor = 'pointer'; },
        onPointerOut: () => {
          if (useViewer.getState().hoveredId === part.id) useViewer.getState().hover(null);
          document.body.style.cursor = '';
        },
      }
    : {};

  return (
    <group ref={group} name={part.id} position={part.position} userData={{ partId: part.id }}>
      <group ref={inner}>
        {items.map((it, n) => [
          <mesh
            key={`m${n}`}
            ref={(el) => {
              meshes.current[n * 2] = el;
              if (el) el.raycast = pickableRaycast;
            }}
            geometry={it.geometry}
            material={it.material}
            castShadow={!part.ghost && (part.shapes[n].material?.opacity ?? 1) > 0.9}
            receiveShadow
            {...handlers}
          />,
          <mesh
            key={`g${n}`}
            ref={(el) => { meshes.current[n * 2 + 1] = el; }}
            geometry={it.geometry}
            material={it.glow}
            raycast={noRaycast}
            visible={false}
            renderOrder={10}
          />,
        ])}
      </group>
      {interactive && (isSelected || showLabel) && <Callout position={center} name={part.name} strong={isSelected} system={model.sysById?.[part.system]} />}
    </group>
  );
}

function pickableRaycast(raycaster, intersects) {
  if (this.userData.pickable === false) return;
  THREE.Mesh.prototype.raycast.call(this, raycaster, intersects);
}

function Callout({ position, name, strong, system }) {
  return (
    <Html position={position} zIndexRange={strong ? [3, 2] : [2, 1]} style={{ pointerEvents: 'none' }}>
      <div className={`callout ${strong ? 'strong' : ''}`}>
        <span className="callout-dot" style={system?.color ? { '--c': system.color } : undefined} />
        <svg className="callout-line" width="70" height="44" viewBox="0 0 70 44" aria-hidden>
          <path d="M2 42 L30 6 L70 6" />
        </svg>
        <div className="callout-label">
          <b>{name}</b>
          {strong && system && <small>{system.name}</small>}
        </div>
      </div>
    </Html>
  );
}
