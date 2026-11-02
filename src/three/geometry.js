import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Shape specs → THREE.BufferGeometry.
 *
 * Every model in src/models is pure data. A part is made of one or more
 * "shapes"; each shape is { type, ...params, position?, rotation?, scale?,
 * material?, array? } and is turned into geometry here.
 *
 * Units are metres, Y is up. Rotations are radians (Euler XYZ).
 *
 * Supported types (params):
 *   box       { size:[w,h,d], radius? }                     radius>0 → rounded box
 *   cylinder  { radiusTop, radiusBottom, height, segments?, open?, thetaLength? }
 *   sphere    { radius, widthSegments?, heightSegments?, phiLength?, thetaLength? }
 *   capsule   { radius, length }                            length = straight middle section, along Y
 *   cone      { radius, height, segments? }
 *   torus     { radius, tube, arc?, radialSegments?, tubularSegments? }  lies in XY plane
 *   ring      { inner, outer, segments? }                   flat, in XY plane
 *   tube      { points:[[x,y,z],...], radius, closed?, segments?, radialSegments? }  Catmull-Rom spline
 *   helix     { radius, height, turns, tube }               coil spring along Y, centred
 *   lathe     { points:[[r,y],...], segments? }             revolve profile around Y
 *   extrude   { outline:[[x,y],...], depth, bevel? }        XY profile extruded along Z, centred on Z
 *   organic   { radius, noise?, frequency?, detail? }       noisy blob (brain, organs)
 *   gear      { radius, teeth, toothDepth, thickness }      spur gear, axis along Y
 *
 * array: { count, offset:[dx,dy,dz], rotation:[rx,ry,rz], scale?:[sx,sy,sz] }
 *   Repeats the shape `count` times, each copy offset/rotated by i * step
 *   (rotation is applied about the part origin, so it can sweep spokes or ribs).
 */

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();

export function buildBaseGeometry(s) {
  switch (s.type) {
    case 'box': {
      const [w, h, d] = s.size || [1, 1, 1];
      if (s.radius) return new RoundedBoxGeometry(w, h, d, 3, Math.min(s.radius, w / 2, h / 2, d / 2));
      return new THREE.BoxGeometry(w, h, d);
    }
    case 'cylinder':
      return new THREE.CylinderGeometry(
        s.radiusTop ?? s.radius ?? 0.5,
        s.radiusBottom ?? s.radius ?? 0.5,
        s.height ?? 1,
        s.segments ?? 32,
        1,
        !!s.open,
        0,
        s.thetaLength ?? Math.PI * 2,
      );
    case 'sphere':
      return new THREE.SphereGeometry(
        s.radius ?? 0.5,
        s.widthSegments ?? 40,
        s.heightSegments ?? 28,
        0,
        s.phiLength ?? Math.PI * 2,
        0,
        s.thetaLength ?? Math.PI,
      );
    case 'capsule':
      return new THREE.CapsuleGeometry(s.radius ?? 0.2, s.length ?? 1, 8, 24);
    case 'cone':
      return new THREE.ConeGeometry(s.radius ?? 0.5, s.height ?? 1, s.segments ?? 32);
    case 'torus':
      return new THREE.TorusGeometry(
        s.radius ?? 0.5,
        s.tube ?? 0.1,
        s.radialSegments ?? 16,
        s.tubularSegments ?? 64,
        s.arc ?? Math.PI * 2,
      );
    case 'ring':
      return new THREE.RingGeometry(s.inner ?? 0.3, s.outer ?? 0.5, s.segments ?? 48);
    case 'tube': {
      const pts = (s.points || [[0, 0, 0], [0, 1, 0]]).map((p) => new THREE.Vector3(...p));
      const curve = new THREE.CatmullRomCurve3(pts, !!s.closed, 'centripetal');
      return new THREE.TubeGeometry(curve, s.segments ?? Math.max(24, pts.length * 12), s.radius ?? 0.05, s.radialSegments ?? 12, !!s.closed);
    }
    case 'helix': {
      const turns = s.turns ?? 6;
      const h = s.height ?? 1;
      const r = s.radius ?? 0.1;
      const n = Math.ceil(turns * 24);
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const a = t * turns * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, t * h - h / 2, Math.sin(a) * r));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, s.tube ?? 0.015, 8, false);
    }
    case 'lathe': {
      const pts = (s.points || [[0.5, 0], [0.5, 1]]).map(([x, y]) => new THREE.Vector2(x, y));
      return new THREE.LatheGeometry(pts, s.segments ?? 48);
    }
    case 'extrude': {
      const shape = new THREE.Shape();
      const o = s.outline || [[0, 0], [1, 0], [1, 1], [0, 1]];
      shape.moveTo(o[0][0], o[0][1]);
      for (let i = 1; i < o.length; i++) shape.lineTo(o[i][0], o[i][1]);
      shape.closePath();
      const bevel = s.bevel ?? 0;
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: s.depth ?? 0.2,
        bevelEnabled: bevel > 0,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 4,
        curveSegments: 12,
      });
      geo.translate(0, 0, -(s.depth ?? 0.2) / 2);
      return geo;
    }
    case 'organic': {
      const r = s.radius ?? 0.5;
      const geo = new THREE.IcosahedronGeometry(r, s.detail ?? 5);
      const pos = geo.attributes.position;
      const v = new THREE.Vector3();
      const amp = s.noise ?? 0.06;
      const f = s.frequency ?? 9;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const n = v.clone().normalize();
        const d =
          Math.sin(n.x * f + Math.cos(n.y * f * 0.7)) * Math.cos(n.z * f * 1.1 + n.x * 2.3) +
          0.5 * Math.sin(n.y * f * 2.1 + n.z * 3.7);
        v.addScaledVector(n, d * amp * r);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      return geo;
    }
    case 'gear': {
      const R = s.radius ?? 0.3;
      const teeth = s.teeth ?? 18;
      const depth = s.toothDepth ?? R * 0.12;
      const shape = new THREE.Shape();
      const steps = teeth * 4;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const phase = i % 4;
        const rr = phase === 1 || phase === 2 ? R : R - depth;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      const hole = new THREE.Path();
      hole.absarc(0, 0, R * 0.25, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const t = s.thickness ?? 0.05;
      const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 6 });
      geo.translate(0, 0, -t / 2);
      geo.rotateX(-Math.PI / 2);
      return geo;
    }
    default:
      throw new Error(`Unknown shape type "${s.type}"`);
  }
}

function applyTransform(geo, position, rotation, scale) {
  tmpEuler.set(...(rotation || [0, 0, 0]));
  tmpQuat.setFromEuler(tmpEuler);
  tmpMatrix.compose(
    new THREE.Vector3(...(position || [0, 0, 0])),
    tmpQuat,
    new THREE.Vector3(...(scale || [1, 1, 1])),
  );
  geo.applyMatrix4(tmpMatrix);
  return geo;
}

function normalise(geo) {
  // mergeGeometries needs identical attribute sets.
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  }
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/** Build the full geometry for one shape spec, including `array` repetition and its own transform. */
export function buildShapeGeometry(s) {
  const base = buildBaseGeometry(s);
  applyTransform(base, s.position, s.rotation, s.scale);
  if (!s.array || !s.array.count || s.array.count <= 1) return base;

  const { count, offset = [0, 0, 0], rotation = [0, 0, 0], scale } = s.array;
  const copies = [];
  for (let i = 0; i < count; i++) {
    const g = base.clone();
    const sc = scale ? scale.map((v) => Math.pow(v, i)) : [1, 1, 1];
    applyTransform(
      g,
      offset.map((v) => v * i),
      rotation.map((v) => v * i),
      sc,
    );
    copies.push(normalise(g));
  }
  base.dispose();
  const merged = mergeGeometries(copies, false);
  copies.forEach((c) => c.dispose());
  return mergeVertices(merged);
}

const cache = new Map();
/** Cached by JSON key – the same spec is reused across previews and the main viewer. */
export function getShapeGeometry(s) {
  const key = JSON.stringify(s, (k, v) => (k === 'material' ? undefined : v));
  let g = cache.get(key);
  if (!g) {
    g = buildShapeGeometry(s);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    cache.set(key, g);
  }
  return g;
}

export const SHAPE_TYPES = [
  'box', 'cylinder', 'sphere', 'capsule', 'cone', 'torus', 'ring',
  'tube', 'helix', 'lathe', 'extrude', 'organic', 'gear',
];
