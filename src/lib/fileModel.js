import * as THREE from 'three';
import { prepareModel } from '../models/index.js';

const MAX_PARTS = 120;

/**
 * Converts a user-supplied GLB / GLTF / OBJ file into the viewer's model format:
 * each mesh becomes a selectable component, explode vectors point away from the
 * model centre, and the whole model is scaled to ~2.5 m and placed on the ground.
 */
export async function loadModelFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const url = URL.createObjectURL(file);
  let root;
  try {
    if (ext === 'glb' || ext === 'gltf') {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(url);
      root = gltf.scene;
    } else if (ext === 'obj') {
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      root = await new OBJLoader().loadAsync(url);
    } else {
      throw new Error('Unsupported 3D format. Use .glb, .gltf (self-contained) or .obj.');
    }
  } catch (e) {
    throw new Error(e.message?.includes('Unsupported') ? e.message : `Could not read this 3D file: ${e.message || 'invalid data'}`);
  } finally {
    URL.revokeObjectURL(url);
  }

  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && o.geometry?.attributes?.position) meshes.push(o); });
  if (!meshes.length) throw new Error('This file contains no meshes.');

  // Normalise: fit to 2.5 m, sit on y = 0, centred in XZ.
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const scale = 2.5 / Math.max(size.x, size.y, size.z, 1e-6);
  const center = box.getCenter(new THREE.Vector3());
  const norm = new THREE.Matrix4()
    .makeScale(scale, scale, scale)
    .premultiply(new THREE.Matrix4().makeTranslation(0, (size.y * scale) / 2, 0))
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

  // Largest meshes first; overflow is merged into one "Other parts" component.
  meshes.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count);
  const modelCenter = new THREE.Vector3(0, (size.y * scale) / 2, 0);
  const radius = (Math.max(size.x, size.y, size.z) * scale) / 2;
  const parts = [];
  const names = new Map();

  meshes.slice(0, MAX_PARTS).forEach((mesh, i) => {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(norm, mesh.matrixWorld));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.computeBoundingBox();
    const c = geo.boundingBox.getCenter(new THREE.Vector3());
    const dir = c.clone().sub(modelCenter);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    dir.normalize().multiplyScalar(radius * 0.7);
    geo.translate(-c.x, -c.y, -c.z);

    const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const material = {
      color: m?.color ? `#${m.color.getHexString()}` : '#b8c0cc',
      metalness: m?.metalness ?? 0.2,
      roughness: m?.roughness ?? 0.6,
      map: m?.map || null,
      opacity: m?.transparent ? m.opacity : 1,
    };
    let name = (mesh.name || mesh.parent?.name || `Component ${i + 1}`).replace(/[_-]+/g, ' ').trim() || `Component ${i + 1}`;
    const n = (names.get(name) || 0) + 1;
    names.set(name, n);
    if (n > 1) name = `${name} ${n}`;

    parts.push({
      id: `mesh-${i}`,
      name,
      system: 'components',
      position: c.toArray(),
      explode: dir.toArray(),
      shapes: [{ type: 'custom', geometry: geo, material }],
      info: {
        what: `“${name}” is a component from your imported 3D file.`,
        location: `${describe(c, modelCenter)} of the model.`,
        purpose: 'Imported files carry geometry but no explanations. Use the AI tutor below to ask what this component is likely to do.',
        how: 'Select it, isolate it, explode the model or cut through it with the section tool to study its shape.',
        connections: [],
        examples: 'Try exploring CAD exports, Sketchfab downloads or photogrammetry scans.',
        advanced: `Mesh with ${geo.attributes.position.count.toLocaleString()} vertices. Scaled ×${scale.toFixed(3)} to fit the viewer.`,
      },
    });
  });

  if (meshes.length > MAX_PARTS) {
    parts[parts.length - 1].info.facts = [`${meshes.length - MAX_PARTS} small meshes were not imported to keep the viewer fast.`];
  }

  return prepareModel({
    id: `file-${file.name}`,
    name: file.name.replace(/\.[^.]+$/, ''),
    category: 'upload',
    tagline: `Imported ${ext.toUpperCase()} · ${parts.length} components`,
    description: 'Your own 3D model. Every mesh is a selectable component you can explode, hide, isolate and section.',
    camera: { position: [3.4, 2.4, 3.8], target: [0, (size.y * scale) / 2, 0] },
    systems: [{ id: 'components', name: 'Components', color: '#4cc9f0' }],
    parts,
    steps: [],
  });
}

function describe(c, center) {
  const d = c.clone().sub(center);
  const ax = Math.abs(d.x) > Math.abs(d.z) ? (d.x > 0 ? 'right' : 'left') : d.z > 0 ? 'front' : 'back';
  const v = d.y > 0.2 ? 'upper ' : d.y < -0.2 ? 'lower ' : '';
  return `In the ${v}${ax}`;
}
