import { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Environment, Lightformer, ContactShadows, Grid } from '@react-three/drei';
import * as THREE from 'three';
import Part from './Part.jsx';
import { useViewer } from '../../store/viewerStore.js';
import { useApp } from '../../store/appStore.js';
import { sectionPlane } from '../../three/makeMaterial.js';
import { cameraFor } from '../../lib/camera.js';

/** Full interactive viewer canvas. All UI chrome lives outside (ControlDock, panels). */
export default function Viewer3D({ model }) {
  const quality = useApp((s) => s.quality);
  const theme = useApp((s) => s.theme);
  return (
    <Canvas
      shadows={quality === 'high'}
      dpr={quality === 'high' ? [1, 2] : [1, 1.25]}
      camera={{ fov: 38, near: 0.01, far: 500, position: model.camera?.position || [4, 3, 5] }}
      gl={{ antialias: true, preserveDrawingBuffer: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={(e) => { if (e.type === 'click') useViewer.getState().select(null); }}
      style={{ touchAction: 'none' }}
    >
      <Lights quality={quality} />
      <Suspense fallback={null}>
        <Env />
      </Suspense>
      <ModelScene model={model} />
      <Controls model={model} />
      <SectionController />
      <Floor model={model} theme={theme} />
    </Canvas>
  );
}

function Lights({ quality }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#cfe3ff', '#1a1f2e', 0.5]} />
      <directionalLight
        position={[6, 10, 6]}
        intensity={1.6}
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-6, 4, -5]} intensity={0.6} color="#7b9cff" />
      <pointLight position={[0, 3, -6]} intensity={8} color="#4cc9f0" distance={20} />
    </>
  );
}

/** Studio environment built from light-formers: no HDR download needed, works offline. */
function Env() {
  return (
    <Environment resolution={256} frames={1}>
      <group rotation={[-Math.PI / 3, 0, 1]}>
        <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
        <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
        <Lightformer form="ring" color="#4cc9f0" intensity={3} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={3} />
        <Lightformer form="rect" color="#7b5cff" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[0, 0, 10]} scale={[20, 6, 1]} />
      </group>
    </Environment>
  );
}

function ModelScene({ model }) {
  const root = useRef();
  const setScene = useViewer((s) => s.setScene);
  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(root.current);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    setScene(root.current, { center: sphere.center.toArray(), radius: sphere.radius, min: box.min.toArray(), max: box.max.toArray() });
  }, [model, setScene]);
  return (
    <group ref={root}>
      {model.parts.map((p) => <Part key={p.id} part={p} model={model} />)}
    </group>
  );
}

function Controls({ model }) {
  const ref = useRef();
  const setControls = useViewer((s) => s.setControls);
  const mode = useViewer((s) => s.mode);
  const bounds = useViewer((s) => s.bounds);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    setControls(c);
    const cam = cameraFor(model, c.camera.aspect);
    c.setLookAt(...cam.position, ...cam.target, false);
    c.smoothTime = 0.35;
    c.draggingSmoothTime = 0.12;
    return () => setControls(null);
  }, [model, setControls]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const A = c.constructor.ACTION;
    c.mouseButtons.left = mode === 'pan' ? A.TRUCK : A.ROTATE;
    c.touches.one = mode === 'pan' ? A.TOUCH_TRUCK : A.TOUCH_ROTATE;
  }, [mode]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !bounds) return;
    c.minDistance = bounds.radius * 0.05;
    c.maxDistance = bounds.radius * 8;
  }, [bounds]);

  useFrame((_, dt) => {
    const st = useViewer.getState();
    if (st.autoRotate && ref.current) ref.current.azimuthAngle += dt * 0.25 * st.speed;
  });

  return <CameraControls ref={ref} makeDefault dollyToCursor />;
}

/** Positions the shared clipping plane from the section settings + model bounds. */
function SectionController() {
  const plane = useRef();
  useFrame(() => {
    const { section, bounds } = useViewer.getState();
    if (!bounds) return;
    const i = { x: 0, y: 1, z: 2 }[section.axis];
    const min = bounds.min[i];
    const max = bounds.max[i];
    const at = min + (max - min) * section.value;
    const n = new THREE.Vector3();
    n.setComponent(i, section.flip ? 1 : -1);
    sectionPlane.normal.copy(n);
    sectionPlane.constant = section.flip ? -at : at;
    if (plane.current) {
      plane.current.visible = section.enabled;
      plane.current.position.set(...bounds.center);
      plane.current.position.setComponent(i, at);
      plane.current.rotation.set(0, 0, 0);
      if (section.axis === 'x') plane.current.rotation.y = Math.PI / 2;
      if (section.axis === 'y') plane.current.rotation.x = Math.PI / 2;
      const s = bounds.radius * 2.2;
      plane.current.scale.set(s, s, 1);
    }
  });
  return (
    <mesh ref={plane} visible={false} raycast={() => null} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#4cc9f0" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Floor({ model, theme }) {
  const bounds = useViewer((s) => s.bounds);
  const r = bounds?.radius ?? 3;
  const y = Math.min(0, bounds?.min?.[1] ?? 0) - 0.001;
  const dark = theme !== 'light';
  return (
    <group position={[0, y, 0]}>
      <ContactShadows opacity={dark ? 0.6 : 0.35} scale={r * 4} blur={2.4} far={r * 1.5} resolution={512} color="#000" />
      <Grid
        args={[r * 10, r * 10]}
        cellSize={r / 12}
        sectionSize={r / 3}
        cellColor={dark ? '#1b2a4a' : '#c7d0e4'}
        sectionColor={dark ? '#27406e' : '#9fb0d6'}
        cellThickness={0.6}
        sectionThickness={1}
        fadeDistance={r * 6}
        fadeStrength={1.5}
        infiniteGrid
      />
    </group>
  );
}
