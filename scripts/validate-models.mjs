// Validates every model definition in src/models: structure, ids, info fields and geometry.
// Usage: node scripts/validate-models.mjs [modelFile ...]
import { readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import * as THREE from 'three';
import { buildShapeGeometry, SHAPE_TYPES } from '../src/three/geometry.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/models');
const files = process.argv.slice(2).length
  ? process.argv.slice(2).map((f) => path.resolve(f))
  : readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'index.js').map((f) => path.join(dir, f));

const INFO_FIELDS = ['what', 'location', 'purpose', 'how', 'connections', 'examples', 'advanced'];
const ANIMS = ['spin', 'piston', 'pulse', 'breathe', 'rock', 'flow'];
let errors = 0;
let warnings = 0;
const err = (m, msg) => { errors++; console.error(`  ✖ [${m}] ${msg}`); };
const warn = (m, msg) => { warnings++; console.warn(`  ⚠ [${m}] ${msg}`); };

for (const file of files) {
  const mod = (await import(pathToFileURL(file).href)).default;
  const name = path.basename(file);
  console.log(`\n${name}: ${mod?.name} (${mod?.parts?.length ?? 0} parts)`);
  if (!mod?.id || !mod?.name || !Array.isArray(mod.parts) || !Array.isArray(mod.systems)) {
    err(name, 'missing id/name/parts/systems');
    continue;
  }
  const sysIds = new Set(mod.systems.map((s) => s.id));
  const ids = new Set();
  const box = new THREE.Box3();
  let tris = 0;
  for (const p of mod.parts) {
    const tag = `${name}:${p.id}`;
    if (!p.id || ids.has(p.id)) err(tag, 'missing or duplicate id');
    ids.add(p.id);
    if (!sysIds.has(p.system)) err(tag, `unknown system "${p.system}"`);
    if (!Array.isArray(p.shapes) || !p.shapes.length) err(tag, 'no shapes');
    if (!Array.isArray(p.explode) || p.explode.length !== 3) err(tag, 'explode must be [x,y,z]');
    if (p.anim && !ANIMS.includes(p.anim.type)) err(tag, `unknown anim ${p.anim.type}`);
    for (const f of INFO_FIELDS) if (!p.info?.[f] || (Array.isArray(p.info[f]) && !p.info[f].length)) err(tag, `info.${f} missing`);
    for (const s of p.shapes || []) {
      if (!SHAPE_TYPES.includes(s.type)) { err(tag, `bad shape type ${s.type}`); continue; }
      try {
        const g = buildShapeGeometry(s);
        g.computeBoundingBox();
        const b = g.boundingBox.clone().translate(new THREE.Vector3(...(p.position || [0, 0, 0])));
        if (!Number.isFinite(b.min.x)) err(tag, `NaN geometry in ${s.type}`);
        box.union(b);
        tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
        g.dispose();
      } catch (e) {
        err(tag, `geometry ${s.type} failed: ${e.message}`);
      }
    }
  }
  for (const p of mod.parts) {
    for (const c of p.info?.connections || []) {
      if (typeof c === 'string' && /^[a-z0-9]+(-[a-z0-9]+)+$|^[a-z0-9]+$/.test(c) && !ids.has(c) && !c.includes(' '))
        warn(`${name}:${p.id}`, `connection "${c}" is not a part id (rendered as text)`);
    }
  }
  for (const s of mod.steps || []) for (const f of s.focus || []) if (!ids.has(f)) err(name, `step "${s.title}" focuses unknown part ${f}`);
  const size = box.getSize(new THREE.Vector3());
  console.log(`  bounds min ${box.min.toArray().map((v) => v.toFixed(2))} max ${box.max.toArray().map((v) => v.toFixed(2))} size ${size.toArray().map((v) => v.toFixed(2))}`);
  console.log(`  ~${Math.round(tris).toLocaleString()} triangles, ${mod.steps?.length ?? 0} steps`);
  if (box.min.y < -0.05) warn(name, `model dips below ground (min y ${box.min.y.toFixed(2)})`);
}
console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
