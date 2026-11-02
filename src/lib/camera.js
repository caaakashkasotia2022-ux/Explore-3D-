import * as THREE from 'three';
import { useViewer } from '../store/viewerStore.js';

const box = new THREE.Box3();
const sphere = new THREE.Sphere();

/** Smoothly frame one part, keeping the current viewing angle. */
export function focusPart(id) {
  const { controls, scene, bounds } = useViewer.getState();
  if (!controls || !scene) return;
  const obj = scene.getObjectByName(id);
  if (!obj) return;
  box.setFromObject(obj);
  if (box.isEmpty()) return;
  box.getBoundingSphere(sphere);
  // Keep some surrounding context: never frame tighter than ~30 % of the whole model.
  sphere.radius = Math.max(sphere.radius * 1.5, (bounds?.radius ?? 1) * 0.3);
  controls.fitToSphere(sphere, true);
}

export function focusParts(ids) {
  const { controls, scene, bounds } = useViewer.getState();
  if (!controls || !scene || !ids?.length) return;
  box.makeEmpty();
  for (const id of ids) {
    const o = scene.getObjectByName(id);
    if (o) box.expandByObject(o);
  }
  if (box.isEmpty()) return;
  box.getBoundingSphere(sphere);
  sphere.radius = Math.max(sphere.radius * 1.25, (bounds?.radius ?? 1) * 0.35);
  controls.fitToSphere(sphere, true);
}

/** Model's preferred camera, pulled back on portrait screens so the model isn't cropped. */
export function cameraFor(model, aspect = 1.6) {
  const cam = model.camera || { position: [4, 3, 5], target: [0, 1, 0] };
  const k = aspect < 1.2 ? Math.min(2.2, Math.pow(1.2 / aspect, 0.85)) : 1;
  const pos = cam.position.map((p, i) => cam.target[i] + (p - cam.target[i]) * k);
  return { position: pos, target: cam.target };
}

export function resetCamera() {
  const { controls, model } = useViewer.getState();
  if (!controls || !model) return;
  const el = controls.camera;
  const cam = cameraFor(model, el.aspect);
  controls.setLookAt(...cam.position, ...cam.target, true);
}

export function zoom(factor) {
  const { controls } = useViewer.getState();
  if (!controls) return;
  controls.dolly(controls.distance * factor, true);
}
