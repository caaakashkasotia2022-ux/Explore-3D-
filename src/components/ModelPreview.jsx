import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import Part from './viewer/Part.jsx';
import { loadModel } from '../models/index.js';

const BASE = {
  explode: 0, hidden: {}, floorMax: Infinity, stage: Infinity, animate: true, speed: 1,
  selectedId: null, hoveredId: null, focusSet: null, transparency: false, isolate: false,
  section: { enabled: false },
};

/**
 * Lightweight, non-interactive 3D preview of a library model. Rotates on its own,
 * stops rendering while off-screen, and can be driven by an external explode value
 * (a number, or a ref whose `.current` is read every frame, e.g. from scroll).
 */
export default function ModelPreview({ modelId, explode = 0, explodeRef, rotate = 0.25, highlight, autoExplode, fit = 1, className, style, cameraDir = [1, 0.45, 1.1], onLoaded }) {
  const [model, setModel] = useState(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const wrap = useRef();

  useEffect(() => {
    let alive = true;
    loadModel(modelId).then((m) => { if (alive) { setModel(m); onLoaded?.(m); } }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [modelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={className} style={{ position: 'absolute', inset: 0, ...style }}>
      {failed && <div className="loader-wrap"><span className="tiny">Preview coming soon</span></div>}
      {!model && !failed && <div className="loader-wrap"><div className="spinner" /></div>}
      {model && (
        <Canvas
          frameloop={visible ? 'always' : 'never'}
          dpr={[1, 1.75]}
          camera={{ fov: 30, near: 0.01, far: 300 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
          style={{ pointerEvents: 'none' }}
        >
          <ambientLight intensity={0.45} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} />
          <pointLight position={[-4, 2, -4]} intensity={6} color="#7b5cff" />
          <Environment resolution={128} frames={1}>
            <Lightformer form="rect" intensity={2.5} position={[0, 5, -6]} scale={[10, 4, 1]} />
            <Lightformer form="ring" color="#4cc9f0" intensity={3} position={[-5, 1, 2]} scale={3} />
            <Lightformer form="rect" intensity={1.5} position={[4, 0, 6]} scale={[8, 4, 1]} />
          </Environment>
          <PreviewScene model={model} explode={explode} explodeRef={explodeRef} rotate={rotate} highlight={highlight} autoExplode={autoExplode} fit={fit} cameraDir={cameraDir} />
        </Canvas>
      )}
    </div>
  );
}

function PreviewScene({ model, explode, explodeRef, rotate, highlight, autoExplode, fit, cameraDir }) {
  const group = useRef();
  const stateRef = useRef({ ...BASE });
  const fitted = useRef(false);
  const parts = useMemo(() => model.parts.filter((p) => !p.hiddenByDefault), [model]);

  useFrame((three, dt) => {
    const st = stateRef.current;
    if (explodeRef) st.explode = explodeRef.current;
    else if (autoExplode) st.explode = Math.max(0, Math.sin(three.clock.elapsedTime * 0.5)) * autoExplode;
    else st.explode = explode;
    st.focusSet = highlight ? highlight.current ?? null : null;
    st.selectedId = highlight?.selected ?? null;
    if (group.current) group.current.rotation.y += dt * rotate;

    if (!fitted.current && group.current) {
      const box = new THREE.Box3().setFromObject(group.current);
      if (!box.isEmpty()) {
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(15))) * 0.95 / fit;
        const dir = new THREE.Vector3(...cameraDir).normalize();
        three.camera.position.copy(sphere.center).addScaledVector(dir, dist);
        three.camera.lookAt(sphere.center);
        three.camera.near = dist / 50;
        three.camera.far = dist * 10;
        three.camera.updateProjectionMatrix();
        fitted.current = true;
      }
    }
  });

  return (
    <>
      <group ref={group}>
        {parts.map((p) => <Part key={p.id} part={p} model={model} interactive={false} stateRef={stateRef} />)}
      </group>
      <ContactShadows position={[0, -0.001, 0]} opacity={0.5} scale={20} blur={2.5} far={4} resolution={256} />
    </>
  );
}
