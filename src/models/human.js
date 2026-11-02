import { M } from '../three/materials.js';

// ---------------------------------------------------------------------------
// Human body – anatomical position: standing, feet on y = 0, ~1.75 m tall,
// facing +Z (front), the person's LEFT = +X, palms facing forward.
// The helpers below only generate plain shape data.
// ---------------------------------------------------------------------------

const PI = Math.PI;
const SIDES = [1, -1]; // +1 = left (+X), -1 = right (-X)
const r3 = (n) => Math.round(n * 10000) / 10000;
const mx = (p, s) => [r3(p[0] * s), r3(p[1]), r3(p[2])];
const mxs = (pts, s) => pts.map((p) => mx(p, s));

/**
 * Rotation (Euler XYZ) that points a Y-aligned primitive from a to b using the
 * shortest-arc rotation, so the primitive's local X/Z stay close to world X/Z.
 */
function aim(a, b) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d) || 1e-6;
  const [dx, dy, dz] = d.map((v) => v / len);
  const mid = a.map((v, i) => r3((v + b[i]) / 2));
  if (dy < -0.99999) return { len, mid, rot: [PI, 0, 0] };
  // quaternion (0,1,0) -> d : axis (dz, 0, -dx), w = 1 + dy
  let x = dz;
  let z = -dx;
  let w = 1 + dy;
  const n = Math.hypot(x, z, w);
  x /= n; z /= n; w /= n;
  const m11 = 1 - 2 * z * z;
  const m12 = -2 * w * z;
  const m13 = 2 * x * z;
  const m22 = 1 - 2 * (x * x + z * z);
  const m23 = -2 * w * x;
  const m32 = 2 * w * x;
  const m33 = 1 - 2 * x * x;
  const ry = Math.asin(Math.max(-1, Math.min(1, m13)));
  const rot = Math.abs(m13) < 0.9999999 ? [Math.atan2(-m23, m33), ry, Math.atan2(-m12, m11)] : [Math.atan2(m32, m22), ry, 0];
  return { len, mid, rot: rot.map(r3) };
}
/** Capsule from a to b (ends overshoot by the radius, which suits joints and soft tissue). */
function seg(a, b, radius, material, extra = {}) {
  const { len, rot, mid } = aim(a, b);
  const { trim, ...rest } = extra;
  return { type: 'capsule', radius, length: r3(Math.max(0.002, len - (trim ? 2 * radius : 0))), position: mid, rotation: rot, material, ...rest };
}
/** Tapered cylinder from a (radius r1) to b (radius r2). */
function taper(a, b, r1, r2, material, extra = {}) {
  const { len, rot, mid } = aim(a, b);
  return { type: 'cylinder', radiusBottom: r1, radiusTop: r2, height: r3(len), segments: 20, position: mid, rotation: rot, material, ...extra };
}
/** Flattened muscle band from a to b. */
/** Low-poly cylinder for small bones / nerve roots. */
const thin = (a, b, radius, material, extra = {}) => taper(a, b, radius, radius * 0.85, material, { segments: 8, ...extra });
const band = (a, b, radius, widen, flat, material) => seg(a, b, radius, material, { scale: [widen, 1, flat] });
const sph = (position, radius, material, extra = {}) => ({ type: 'sphere', radius, widthSegments: 24, heightSegments: 16, position, material, ...extra });
const tube = (points, radius, material, extra = {}) => ({ type: 'tube', points, radius, radialSegments: 8, material, ...extra });
/** Re-express absolute shapes relative to a part origin c. */
function at(c, shapes) {
  return shapes.map((s) => {
    const o = { ...s };
    if (o.type === 'tube') o.points = o.points.map((p) => [r3(p[0] - c[0]), r3(p[1] - c[1]), r3(p[2] - c[2])]);
    else {
      const p = o.position || [0, 0, 0];
      o.position = [r3(p[0] - c[0]), r3(p[1] - c[1]), r3(p[2] - c[2])];
    }
    return o;
  });
}
const both = (fn) => SIDES.flatMap((s) => fn(s));

// ---------------------------------------------------------------- materials
const SKIN = M.skin();
const BONE = M.bone();
const CART = { color: '#cfe2e6', metalness: 0, roughness: 0.4, clearcoat: 0.5 };
const TOOTH = { color: '#f6f3ea', metalness: 0, roughness: 0.25, clearcoat: 0.8 };
const MUS = M.muscle('#b3343a');
const MUS_D = M.muscle('#9c2a31');
const TENDON = { color: '#e9dccb', metalness: 0, roughness: 0.4, clearcoat: 0.4 };
const ART = M.artery();
const VEIN = M.vein();
const NERVE = M.nerve('#f5d76e');
const BRAIN = { ...M.organ('#e8a3a8'), roughness: 0.5, clearcoat: 0.5 };
const BRAIN_D = { ...M.organ('#d98a93'), roughness: 0.5, clearcoat: 0.5 };
const LUNG = { ...M.organ('#e7a1a0'), roughness: 0.62, clearcoat: 0.25 };
const LUNG_D = { ...M.organ('#dc8f90'), roughness: 0.62, clearcoat: 0.25 };
const HEART = M.organ('#a8222b');
const HEART_D = M.organ('#7d1a22');
const LIVER = M.organ('#7a2a22');
const GALL = M.organ('#4f8a3a');
const STOMACH = M.organ('#d98a7e');
const PANC = M.organ('#e8c27a');
const SPLEEN = M.organ('#6b2140');
const GUT = M.organ('#e2a093');
const COLON = M.organ('#c98b6b');
const KIDNEY = M.organ('#8e2b2b');
const URINE = M.organ('#e0c070');
const BLADDER = M.organ('#d9a07a');
const GLAND = M.organ('#c9663f');
const ADRENAL = M.organ('#d9a441');
const EYE = { color: '#f4f1ec', metalness: 0, roughness: 0.15, clearcoat: 1 };
const IRIS = { color: '#3d6e9c', metalness: 0, roughness: 0.2, clearcoat: 1 };
const PUPIL = { color: '#111111', metalness: 0, roughness: 0.2, clearcoat: 1 };
const DIAPH = { ...M.muscle('#b5474b'), side: 'double' };

// ---------------------------------------------------------------- key joints (left side, +X)
const SHOULDER = [0.19, 1.415, -0.02];
const ELBOW = [0.235, 1.12, -0.025];
const WRIST = [0.272, 0.865, 0.0];
const KNEE = [0.093, 0.49, 0.005];
const ANKLE = [0.09, 0.075, -0.005];

// ---------------------------------------------------------------- spine data
/** i = 0..11 (T1..T12) → [y, z] of the vertebral body centre. */
function thoracic(i) {
  if (i < 6) return [1.405 - 0.025 * i, -0.06 - 0.0045 * i];
  return [1.255 - 0.025 * (i - 6), -0.084 + 0.004 * (i - 6)];
}

// ---------------------------------------------------------------- ribs (12 pairs, curved tubes)
const RIB_A = [0.07, 0.09, 0.105, 0.118, 0.128, 0.135, 0.14, 0.142, 0.14, 0.136, 0.13, 0.124];
const RIB_B = [0.055, 0.065, 0.075, 0.082, 0.087, 0.09, 0.091, 0.09, 0.088, 0.085, 0.08, 0.075];
const COSTAL_TARGET = [[0.04, 1.185, 0.093], [0.065, 1.165, 0.086], [0.09, 1.14, 0.074]];
function ribShapes() {
  const out = [];
  for (let i = 0; i < 12; i++) {
    for (const s of SIDES) {
      const [y0, zv] = thoracic(i);
      const a = RIB_A[i];
      const b = RIB_B[i];
      const zc = zv - 0.04 + b;
      const drop = 0.05 + 0.006 * i;
      const tEnd = i < 7 ? 0.78 * PI : i < 10 ? 0.74 * PI : i === 10 ? 0.5 * PI : 0.4 * PI;
      const pts = [[s * 0.02, y0, zv - 0.012]];
      const n = 7;
      for (let k = 0; k <= n; k++) {
        const t = 0.35 + ((tEnd - 0.35) * k) / n;
        const c = Math.cos(t);
        const z = c >= 0 ? zc - b * Math.pow(c, 0.6) : zc + b * Math.pow(-c, 0.9);
        pts.push([s * a * Math.sin(t), y0 + 0.012 * Math.sin(t) - drop * Math.pow(t / PI, 2), z]);
      }
      const P = pts.map((p) => p.map(r3));
      out.push(tube(P, i < 10 ? 0.0045 : 0.004, BONE, { radialSegments: 6, segments: 36 }));
      const E = P[P.length - 1];
      let T = null;
      if (i < 7) T = [s * 0.022, 1.37 - 0.028 * i, 0.07 + 0.004 * i];
      else if (i < 10) T = mx(COSTAL_TARGET[i - 7], s);
      if (T) {
        const mid = [r3((E[0] + T[0]) / 2 + s * 0.006), r3((E[1] + T[1]) / 2), r3((E[2] + T[2]) / 2 + 0.012)];
        out.push(tube([E, mid, T.map(r3)], 0.004, CART, { radialSegments: 6, segments: 16 }));
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- small intestine (coiled path)
function smallIntestinePoints() {
  const pts = [
    [-0.015, 1.065, 0.045], [-0.04, 1.05, 0.035], [-0.052, 1.015, 0.03], [-0.035, 0.99, 0.028],
    [0.0, 0.993, 0.03], [0.035, 0.985, 0.035], [0.07, 0.975, 0.045],
  ];
  const rows = [0.965, 0.943, 0.921, 0.899];
  rows.forEach((y, k) => {
    const dir = k % 2 ? 1 : -1;
    const zBase = k % 2 ? 0.068 : 0.04;
    for (let j = 0; j <= 6; j++) {
      const x = -dir * 0.068 + dir * 0.0227 * j;
      pts.push([x, y + (j % 2 ? 0.007 : -0.005), zBase + 0.014 * Math.sin(j * 1.7 + k)]);
    }
  });
  pts.push([-0.08, 0.9, 0.045]);
  return pts.map((p) => p.map(r3));
}

// ---------------------------------------------------------------- vessel / nerve paths
const armArtery = (s) => [
  ...(s < 0 ? [[-0.02, 1.4, 0.025]] : [[0.018, 1.355, -0.005], [0.03, 1.39, 0.0]]),
  ...mxs([[0.06, 1.41, 0.015], [0.11, 1.415, 0.0], [0.16, 1.385, -0.01], [0.195, 1.33, 0.002], [0.207, 1.24, 0.002], [0.226, 1.14, 0.004], [0.236, 1.1, 0.004]], s),
];
const radialA = (s) => mxs([[0.236, 1.1, 0.004], [0.25, 1.05, 0.006], [0.275, 0.95, 0.008], [0.286, 0.868, 0.01]], s);
const ulnarA = (s) => mxs([[0.236, 1.1, 0.004], [0.24, 1.02, 0.002], [0.252, 0.93, 0.006], [0.258, 0.868, 0.009]], s);
const palmArch = (s) => mxs([[0.286, 0.868, 0.01], [0.28, 0.82, 0.014], [0.262, 0.818, 0.014], [0.258, 0.868, 0.009]], s);
const legArtery = (s) => [[0.0, 0.99, -0.012], ...mxs([[0.03, 0.955, -0.005], [0.055, 0.92, 0.015], [0.075, 0.87, 0.04], [0.08, 0.8, 0.035], [0.075, 0.68, 0.02], [0.075, 0.6, 0.0], [0.085, 0.54, -0.03], [0.09, 0.48, -0.036]], s)];
const postTibA = (s) => mxs([[0.09, 0.48, -0.036], [0.085, 0.42, -0.032], [0.08, 0.25, -0.026], [0.072, 0.09, -0.02], [0.07, 0.035, 0.005], [0.075, 0.015, 0.06]], s);
const antTibA = (s) => mxs([[0.09, 0.48, -0.036], [0.095, 0.43, -0.02], [0.105, 0.41, 0.008], [0.103, 0.25, 0.014], [0.095, 0.1, 0.016], [0.09, 0.055, 0.05], [0.085, 0.035, 0.11]], s);
const cephalicV = (s) => mxs([[0.29, 0.85, 0.012], [0.287, 0.95, 0.016], [0.268, 1.08, 0.02], [0.247, 1.2, 0.024], [0.22, 1.36, 0.03], [0.15, 1.405, 0.03], [0.11, 1.41, 0.02]], s);
const basilicV = (s) => mxs([[0.255, 0.85, 0.01], [0.236, 0.98, 0.008], [0.216, 1.12, 0.006], [0.2, 1.25, -0.004], [0.17, 1.37, -0.004], [0.11, 1.41, 0.02]], s);
const subclavV = (s) => mxs([[0.11, 1.41, 0.02], [0.07, 1.405, 0.025], [0.045, 1.4, 0.025]], s);
const medCubital = (s) => mxs([[0.262, 1.08, 0.021], [0.24, 1.11, 0.014], [0.218, 1.13, 0.008]], s);
const saphenousV = (s) => mxs([[0.07, 0.03, 0.04], [0.062, 0.08, 0.025], [0.058, 0.25, 0.002], [0.06, 0.47, -0.015], [0.056, 0.62, 0.02], [0.06, 0.78, 0.045], [0.068, 0.86, 0.048]], s);
const femoralV = (s) => mxs([[0.075, 0.1, -0.026], [0.08, 0.3, -0.036], [0.085, 0.48, -0.042], [0.08, 0.54, -0.036], [0.068, 0.68, 0.014], [0.07, 0.8, 0.03], [0.066, 0.865, 0.04]], s);
const iliacV = (s) => [...mxs([[0.066, 0.865, 0.04], [0.05, 0.91, 0.012], [0.03, 0.95, -0.012]], s), [-0.012, 0.985, -0.015]];
const plexus = (s) => mxs([[0.02, 1.46, -0.06], [0.05, 1.44, -0.04], [0.1, 1.41, -0.015], [0.16, 1.375, -0.015], [0.19, 1.33, -0.01]], s);
const medianN = (s) => mxs([[0.19, 1.33, -0.01], [0.205, 1.24, -0.006], [0.228, 1.13, -0.003], [0.255, 1.0, 0.0], [0.27, 0.88, 0.006], [0.272, 0.82, 0.01], [0.274, 0.76, 0.008]], s);
const ulnarN = (s) => mxs([[0.19, 1.33, -0.01], [0.2, 1.24, -0.02], [0.213, 1.13, -0.046], [0.235, 1.0, -0.016], [0.255, 0.88, 0.0], [0.255, 0.78, 0.004]], s);
const radialN = (s) => mxs([[0.19, 1.33, -0.01], [0.205, 1.27, -0.046], [0.235, 1.2, -0.042], [0.252, 1.13, -0.016], [0.27, 1.0, -0.006], [0.286, 0.88, 0.0]], s);
const sciaticN = (s) => mxs([[0.03, 0.96, -0.075], [0.06, 0.9, -0.085], [0.085, 0.85, -0.07], [0.095, 0.75, -0.042], [0.095, 0.6, -0.036], [0.093, 0.53, -0.036]], s);
const tibialN = (s) => mxs([[0.093, 0.53, -0.036], [0.09, 0.45, -0.042], [0.085, 0.25, -0.037], [0.075, 0.09, -0.027], [0.08, 0.03, 0.02], [0.085, 0.012, 0.08]], s);
const fibularN = (s) => mxs([[0.093, 0.53, -0.036], [0.115, 0.48, -0.03], [0.132, 0.44, -0.006], [0.112, 0.3, 0.02], [0.1, 0.09, 0.022], [0.095, 0.04, 0.07]], s);
const femoralN = (s) => mxs([[0.04, 1.0, -0.03], [0.07, 0.92, 0.02], [0.088, 0.86, 0.042], [0.09, 0.75, 0.042], [0.088, 0.66, 0.035]], s);
const L = (p, s) => mx(p, s); // shorthand: mirror a left-side point

// =========================================================================
// INTEGUMENTARY (skin) – ghosted shell
// =========================================================================
const skinParts = [
  {
    id: 'skin-head',
    name: 'Skin – Head & Neck',
    system: 'integumentary',
    position: [0, 1.6, 0],
    explode: [0, 0.2, -0.7],
    ghost: true,
    shapes: at([0, 1.6, 0], [
      sph([0, 1.63, 0], 0.1, SKIN, { scale: [0.8, 1.2, 1.02], widthSegments: 32, heightSegments: 24 }),
      sph([0, 1.54, 0.035], 0.05, SKIN, { scale: [1.1, 0.9, 1.1] }),
      { type: 'cone', radius: 0.012, height: 0.032, segments: 12, position: [0, 1.618, 0.103], rotation: [PI / 2 + 0.35, 0, 0], material: SKIN },
      ...both((s) => [sph(L([0.08, 1.625, -0.005], s), 0.02, SKIN, { scale: [0.4, 1.25, 0.8] })]),
      { type: 'cylinder', radiusTop: 0.055, radiusBottom: 0.062, height: 0.13, segments: 28, position: [0, 1.49, -0.015], material: SKIN },
    ]),
    info: {
      what: "The skin covering the head, face and neck – part of the body's largest organ, the integumentary system.",
      location: 'Covers the skull, face and neck, continuous with the skin of the torso.',
      purpose: 'Protects the head, keeps out germs, senses touch and temperature, and helps control body heat. Facial skin also moves with facial muscles to make expressions.',
      how: 'The outer layer (epidermis) constantly makes new cells that move up and flake off. The deeper dermis holds blood vessels, sweat glands, hair follicles and nerve endings. Facial muscles attach directly into the skin, so contracting them wrinkles and stretches it into smiles and frowns.',
      connections: ['skin-torso', 'skull', 'eyes'],
      examples: 'Blushing (blood vessels in facial skin widening), goosebumps, sweating on the forehead during exercise.',
      advanced: 'Epidermis: stratified squamous keratinised epithelium (basale, spinosum, granulosum, lucidum on palms/soles only, corneum), turnover ~4 weeks. Melanocytes in the basal layer make melanin that is passed to keratinocytes; skin colour depends on melanin type and amount, not melanocyte number. Dermis: papillary (loose areolar) and reticular (dense irregular collagen I) layers. Scalp has ~100,000 hair follicles; eyelid skin is the thinnest in the body (~0.5 mm) versus ~4 mm on the back.',
      facts: ['Your skin is completely replaced roughly every month.', 'Eyelid skin is the thinnest skin on the body.'],
    },
  },
  {
    id: 'skin-torso',
    name: 'Skin – Torso',
    system: 'integumentary',
    position: [0, 1.15, 0],
    explode: [0, 0, -0.85],
    ghost: true,
    shapes: at([0, 1.15, 0], [
      {
        type: 'lathe', segments: 40, position: [0, 0, -0.01], scale: [1, 1, 0.72], material: SKIN,
        points: [[0.001, 0.8], [0.1, 0.81], [0.16, 0.86], [0.175, 0.93], [0.165, 1.0], [0.148, 1.06], [0.152, 1.14], [0.165, 1.25], [0.172, 1.34], [0.18, 1.4], [0.16, 1.45], [0.08, 1.475], [0.055, 1.48], [0.001, 1.485]],
      },
      ...both((s) => [
        sph(L([0.195, 1.4, -0.015], s), 0.06, SKIN),
        sph(L([0.07, 0.88, -0.075], s), 0.085, SKIN, { scale: [1, 1, 0.8] }),
      ]),
    ]),
    info: {
      what: 'The skin over the chest, abdomen, back and hips – the outer wrapping of the trunk.',
      location: 'Covers the whole trunk from the base of the neck to the hips and buttocks.',
      purpose: 'A waterproof, germ-proof barrier that also stores fat for insulation and energy, makes vitamin D in sunlight and cools the body by sweating.',
      how: 'Sweat glands release water that evaporates and carries heat away. Blood vessels in the dermis widen to lose heat or narrow to save it. Under the skin, a layer of fat (the hypodermis) cushions and insulates the organs.',
      connections: ['skin-head', 'skin-limbs', 'abdominals', 'pectoralis-major'],
      examples: 'Sunburn, sweating while running, a vaccine injection given just under the skin (subcutaneous).',
      advanced: 'Skin is ~15% of body mass with an adult surface area of ~1.8 m². Eccrine sweat glands (2–4 million) secrete hypotonic sweat for thermoregulation – up to 1–2 L/h in hot conditions. 7-dehydrocholesterol in keratinocytes is converted to pre-vitamin D3 by UVB (290–315 nm), then hydroxylated in liver (25-OH) and kidney (1,25-(OH)2, calcitriol). Subcutaneous adipose tissue is also an endocrine organ secreting leptin and adiponectin.',
      facts: ['Skin is the largest organ – about 1.8 m² and 4–5 kg in an adult.', 'Skin makes vitamin D when sunlight (UVB) hits it.'],
    },
  },
  {
    id: 'skin-limbs',
    name: 'Skin – Arms & Legs',
    system: 'integumentary',
    position: [0, 0.6, 0],
    explode: [0, 0, -0.85],
    ghost: true,
    shapes: at([0, 0.6, 0], both((s) => [
      seg(L(SHOULDER, s), L(ELBOW, s), 0.043, SKIN),
      sph(L(ELBOW, s), 0.038, SKIN),
      taper(L(ELBOW, s), L(WRIST, s), 0.04, 0.026, SKIN),
      { type: 'box', size: [0.07, 0.072, 0.028], radius: 0.012, position: L([0.272, 0.806, 0.003], s), material: SKIN },
      { type: 'box', size: [0.06, 0.08, 0.02], radius: 0.009, position: L([0.272, 0.735, 0.006], s), material: SKIN },
      seg(L([0.293, 0.83, 0.008], s), L([0.312, 0.758, 0.028], s), 0.01, SKIN),
      taper(L([0.095, 0.9, 0.0], s), L(KNEE, s), 0.088, 0.056, SKIN),
      sph(L(KNEE, s), 0.055, SKIN),
      taper(L(KNEE, s), L(ANKLE, s), 0.052, 0.036, SKIN),
      sph(L([0.095, 0.37, -0.025], s), 0.055, SKIN, { scale: [0.95, 1.9, 1] }),
      sph(L(ANKLE, s), 0.036, SKIN),
      { type: 'box', size: [0.09, 0.06, 0.26], radius: 0.026, position: L([0.095, 0.035, 0.045], s), material: SKIN },
    ])),
    info: {
      what: 'The skin of the arms, hands, legs and feet.',
      location: 'Covers both upper and lower limbs, from the shoulders and hips to the fingertips and toes.',
      purpose: 'Protects the limbs, gives grip and very fine touch to the fingertips, and lets joints bend freely.',
      how: 'Over joints the skin is loose and folded so it can stretch. The palms and soles have thick skin with ridges (fingerprints) that improve grip, and they are packed with touch receptors that send signals along sensory nerves to the brain.',
      connections: ['skin-torso', 'arm-nerves', 'leg-nerves', 'limb-veins'],
      examples: 'Fingerprints used for identification, calluses on feet, seeing blue veins under the skin of your wrist.',
      advanced: 'Thick skin (palms/soles) has a stratum lucidum and a corneum up to ~1.5 mm thick but no hair follicles. Fingertip mechanoreceptor density is ~240 units/cm² (Meissner corpuscles for light touch/flutter, Merkel discs for pressure and texture, Pacinian corpuscles for vibration, Ruffini endings for stretch). Two-point discrimination is ~2 mm at the fingertip versus ~40 mm on the back. Dermatoglyphic ridge patterns form at 10–16 weeks of gestation and stay fixed for life.',
      facts: ['Fingerprints are formed before birth and never change.', 'Fingertips can feel ridges only a few micrometres high.'],
    },
  },
];

// =========================================================================
// MUSCULAR – hidden by default so the organs stay visible
// =========================================================================
const muscleParts = [
  {
    id: 'pectoralis-major',
    name: 'Pectoralis Major (Chest)',
    system: 'muscular',
    position: [0, 1.33, 0.06],
    explode: [0, 0.05, 0.45],
    hiddenByDefault: true,
    shapes: at([0, 1.33, 0.06], both((s) => [
      band(L([0.014, 1.372, 0.082], s), L([0.18, 1.372, 0.014], s), 0.02, 2.2, 0.4, MUS),
      band(L([0.022, 1.268, 0.094], s), L([0.182, 1.355, 0.012], s), 0.022, 2.4, 0.4, MUS_D),
    ])),
    info: {
      what: 'The large, fan-shaped muscle of the chest.',
      location: 'Front of the chest, from the collarbone and breastbone out to the top of the upper-arm bone.',
      purpose: 'Pulls the arm across the body, rotates it inward and pushes things forward.',
      how: 'Its fibres start on the clavicle, sternum and rib cartilages and converge onto a tendon on the humerus. When they contract the tendon is pulled toward the chest, swinging the arm forward and inward.',
      connections: ['sternum', 'clavicles', 'humeri', 'deltoids'],
      examples: 'Push-ups, bench press, hugging someone, throwing a ball.',
      advanced: 'Two heads: clavicular (C5–C6) and sternocostal (C7–T1), both innervated by the medial and lateral pectoral nerves. Inserts on the lateral lip of the intertubercular (bicipital) groove of the humerus; the tendon twists so the lower fibres insert highest. Actions: adduction, medial rotation and flexion (clavicular head) of the shoulder. Skeletal muscle fibres are multinucleated, striated cells made of sarcomeres (actin/myosin) ~2–3 µm long.',
      facts: ['The tendon of the pec twists 180° before attaching to the arm.'],
    },
  },
  {
    id: 'deltoids',
    name: 'Deltoids (Shoulders)',
    system: 'muscular',
    position: [0, 1.39, -0.018],
    explode: [0, 0.1, 0.25],
    hiddenByDefault: true,
    shapes: at([0, 1.39, -0.018], both((s) => [sph(L([0.2, 1.39, -0.018], s), 0.05, MUS, { scale: [0.82, 1.25, 1.05] })])),
    info: {
      what: 'The rounded triangular muscle that caps each shoulder.',
      location: 'Over the shoulder joint, from the collarbone and shoulder blade down to the side of the upper arm.',
      purpose: 'Lifts the arm out to the side, forward and backward.',
      how: 'It has front, middle and back fibres. Each part pulls on the humerus in a different direction, so working together they can raise the arm in almost any direction.',
      connections: ['clavicles', 'scapulae', 'humeri', 'pectoralis-major'],
      examples: 'Raising your hand in class, lifting a suitcase onto a shelf, the shoulder press in the gym.',
      advanced: 'Origin: lateral third of clavicle, acromion and spine of scapula; insertion: deltoid tuberosity of humerus. Innervated by the axillary nerve (C5–C6), which can be injured in shoulder dislocation or surgical-neck fractures. The middle (acromial) fibres are multipennate, giving force for abduction from ~15° to 90° after supraspinatus initiates the movement. Common intramuscular injection site.',
      facts: ['The name comes from the Greek letter delta (Δ) because of its triangular shape.'],
    },
  },
  {
    id: 'biceps',
    name: 'Biceps Brachii',
    system: 'muscular',
    position: [0, 1.26, 0],
    explode: [0, 0, 0.3],
    hiddenByDefault: true,
    shapes: at([0, 1.26, 0], both((s) => [seg(L([0.202, 1.35, -0.002], s), L([0.232, 1.16, -0.002], s), 0.019, MUS)])),
    info: {
      what: 'The well-known two-headed muscle on the front of the upper arm.',
      location: 'Front of the upper arm, from the shoulder blade to the radius in the forearm.',
      purpose: 'Bends the elbow and turns the palm upward (supination).',
      how: 'When it shortens, it pulls on the radius just below the elbow, bending the arm. Because it attaches to the radius, it also twists the forearm so the palm faces up – like turning a screwdriver.',
      connections: ['triceps', 'humeri', 'forearm-bones', 'scapulae'],
      examples: 'Lifting a shopping bag, doing a curl, turning a door key or screwdriver.',
      advanced: 'Long head arises from the supraglenoid tubercle (its tendon runs through the shoulder joint), short head from the coracoid process. Inserts on the radial tuberosity and, via the bicipital aponeurosis, into the forearm fascia. Musculocutaneous nerve (C5–C6). It is the most powerful supinator of the forearm, especially with the elbow flexed. Biceps reflex tests the C5–C6 segments.',
      facts: ['The biceps is a stronger supinator (palm-up twister) than an elbow bender – the brachialis underneath does much of the bending.'],
    },
  },
  {
    id: 'triceps',
    name: 'Triceps Brachii',
    system: 'muscular',
    position: [0, 1.26, -0.04],
    explode: [0, 0, -0.35],
    hiddenByDefault: true,
    shapes: at([0, 1.26, -0.04], both((s) => [seg(L([0.198, 1.37, -0.04], s), L([0.236, 1.15, -0.044], s), 0.019, MUS_D)])),
    info: {
      what: 'The three-headed muscle on the back of the upper arm.',
      location: 'Back of the upper arm, from the shoulder blade and humerus to the point of the elbow (olecranon).',
      purpose: 'Straightens the elbow – the opposite of the biceps.',
      how: 'Muscles can only pull, never push, so they work in opposing pairs. When the triceps contracts, the biceps relaxes and the forearm swings straight.',
      connections: ['biceps', 'humeri', 'forearm-bones', 'scapulae'],
      examples: 'Pushing open a door, the upward phase of a push-up, throwing a dart.',
      advanced: 'Long head: infraglenoid tubercle of the scapula (also extends/adducts the shoulder); lateral and medial heads: posterior humerus either side of the radial groove. Inserts on the olecranon of the ulna. Innervated by the radial nerve (C6–C8), which spirals in the radial groove between the heads. The triceps reflex tests C7. Agonist–antagonist pairing relies on reciprocal inhibition in spinal circuits.',
      facts: ['The triceps makes up about two-thirds of the upper arm’s muscle mass.'],
    },
  },
  {
    id: 'forearm-muscles',
    name: 'Forearm Flexors & Extensors',
    system: 'muscular',
    position: [0, 1.0, -0.01],
    explode: [0, 0, 0.3],
    hiddenByDefault: true,
    shapes: at([0, 1.0, -0.01], both((s) => [
      taper(L([0.232, 1.1, -0.008], s), L([0.262, 0.9, 0.004], s), 0.02, 0.009, MUS),
      taper(L([0.252, 1.1, -0.036], s), L([0.282, 0.9, -0.006], s), 0.019, 0.009, MUS_D),
      seg(L([0.262, 0.905, 0.006], s), L([0.27, 0.86, 0.008], s), 0.005, TENDON),
    ])),
    info: {
      what: 'About 20 slim muscles in the forearm that move the wrist, hand and fingers.',
      location: 'The palm side (flexors) and back (extensors) of the forearm, between the elbow and the wrist.',
      purpose: 'Grip, make a fist, bend and straighten the wrist and fingers.',
      how: 'The muscle bellies sit in the forearm, but they pull on long tendons that run across the wrist into the fingers – like puppet strings. This keeps the fingers slim while still being strong.',
      connections: ['forearm-bones', 'hand-bones', 'arm-nerves'],
      examples: 'Typing, gripping a racket, opening a jar. "Tennis elbow" is irritation of the extensor tendons at the elbow.',
      advanced: 'Superficial flexors share a common origin on the medial epicondyle (pronator teres, flexor carpi radialis, palmaris longus, flexor carpi ulnaris); extensors share the lateral epicondyle. Flexor digitorum superficialis/profundus tendons pass through the carpal tunnel with the median nerve – compression causes carpal tunnel syndrome. Most flexors: median nerve; FCU and ulnar half of FDP: ulnar nerve; all posterior extensors: radial nerve (posterior interosseous branch). Palmaris longus is absent in ~14% of people.',
      facts: ['Your fingers have no muscle bellies of their own – they are moved by tendons from the forearm and small hand muscles.'],
    },
  },
  {
    id: 'abdominals',
    name: 'Abdominal Muscles',
    system: 'muscular',
    position: [0, 1.05, 0.09],
    explode: [0, -0.05, 0.6],
    hiddenByDefault: true,
    shapes: at([0, 1.05, 0.09], both((s) => [
      { type: 'box', size: [0.046, 0.05, 0.012], radius: 0.005, position: L([0.027, 1.175, 0.092], s), array: { count: 4, offset: [0, -0.056, 0.003] }, material: MUS },
      { type: 'box', size: [0.04, 0.085, 0.012], radius: 0.005, position: L([0.025, 0.93, 0.1], s), material: MUS },
      band(L([0.135, 1.15, 0.035], s), L([0.065, 0.95, 0.088], s), 0.03, 1.8, 0.33, MUS_D),
    ])),
    info: {
      what: 'The "abs": the rectus abdominis ("six-pack") plus the oblique muscles on the sides of the belly.',
      location: 'Front and sides of the abdomen, between the lower ribs and the pelvis.',
      purpose: 'Hold the abdominal organs in place, bend and twist the trunk, and squeeze the belly for coughing, breathing out forcefully and pushing.',
      how: 'The rectus abdominis runs vertically and bends the spine forward. The obliques run diagonally like a corset and twist the trunk. Tightening them all raises pressure inside the abdomen, which helps with breathing out, coughing and lifting.',
      connections: ['ribcage', 'pelvis', 'diaphragm', 'small-intestine'],
      examples: 'Sit-ups, coughing, laughing hard, bracing to lift something heavy.',
      advanced: 'Rectus abdominis: pubic crest/symphysis to costal cartilages 5–7 and xiphoid, divided by 3 tendinous intersections (giving the "six-pack") and enclosed in the rectus sheath formed by the aponeuroses of the external oblique, internal oblique and transversus abdominis. The linea alba is the midline raphe. Innervation: thoraco-abdominal nerves T7–T11 and subcostal T12. Raising intra-abdominal pressure (Valsalva) stabilises the lumbar spine.',
      facts: ['Everyone has a "six-pack" muscle – it is just hidden under a layer of fat in most people.'],
    },
  },
  {
    id: 'trapezius',
    name: 'Trapezius',
    system: 'muscular',
    position: [0, 1.36, -0.1],
    explode: [0, 0.1, -0.5],
    hiddenByDefault: true,
    shapes: at([0, 1.36, -0.1], both((s) => [
      band([0, 1.49, -0.066], L([0.17, 1.43, -0.036], s), 0.016, 2, 0.4, MUS),
      band([0, 1.39, -0.118], L([0.16, 1.4, -0.072], s), 0.022, 2, 0.35, MUS_D),
      band([0, 1.21, -0.122], L([0.12, 1.35, -0.104], s), 0.02, 2, 0.35, MUS),
    ])),
    info: {
      what: 'A large, diamond-shaped muscle of the upper back and neck.',
      location: 'From the base of the skull and the spine of the neck and upper back out to the collarbones and shoulder blades.',
      purpose: 'Moves and steadies the shoulder blades and helps hold up the head.',
      how: 'Its upper fibres shrug the shoulders, the middle fibres pull the shoulder blades together, and the lower fibres pull them down. Working together they rotate the shoulder blade so you can lift your arm overhead.',
      connections: ['scapulae', 'clavicles', 'spine', 'skull'],
      examples: 'Shrugging, carrying heavy bags, the tight "knots" many people feel after long computer work.',
      advanced: 'Origin: external occipital protuberance, superior nuchal line, ligamentum nuchae and spinous processes C7–T12. Insertion: lateral third of clavicle, acromion and spine of scapula. Motor supply: spinal accessory nerve (cranial nerve XI); proprioception via C3–C4. Upper and lower fibres together with serratus anterior produce upward rotation of the scapula needed for abduction beyond 90°.',
      facts: ['Its motor nerve is a cranial nerve (XI) that starts in the brainstem and upper spinal cord.'],
    },
  },
  {
    id: 'latissimus-dorsi',
    name: 'Latissimus Dorsi',
    system: 'muscular',
    position: [0, 1.18, -0.1],
    explode: [0, 0, -0.55],
    hiddenByDefault: true,
    shapes: at([0, 1.18, -0.1], both((s) => [
      band(L([0.02, 1.08, -0.112], s), L([0.165, 1.32, -0.08], s), 0.025, 2.4, 0.3, MUS_D),
      band(L([0.045, 1.0, -0.1], s), L([0.15, 1.25, -0.095], s), 0.022, 2, 0.3, MUS),
    ])),
    info: {
      what: 'The broadest muscle of the back – the "lats".',
      location: 'Lower and middle back, sweeping up from the spine and pelvis to the inside of the upper arm.',
      purpose: 'Pulls the arm down and back toward the body and rotates it inward.',
      how: 'Its wide sheet of fibres converges on a narrow tendon in the armpit. When it contracts it pulls the raised arm down powerfully – the movement used in climbing and swimming.',
      connections: ['humeri', 'spine', 'pelvis', 'trapezius'],
      examples: 'Pull-ups, rowing, swimming freestyle, pulling yourself out of a pool.',
      advanced: 'Origin: spinous processes T7–T12, thoracolumbar fascia, iliac crest, lower 3–4 ribs and often the inferior angle of the scapula. Insertion: floor of the intertubercular groove of the humerus. Thoracodorsal nerve (C6–C8). Actions: extension, adduction and medial rotation of the shoulder; can assist forced expiration. Used as a pedicled flap in reconstructive (e.g. breast) surgery.',
      facts: ['"Latissimus dorsi" literally means "broadest of the back".'],
    },
  },
  {
    id: 'glutes',
    name: 'Gluteal Muscles',
    system: 'muscular',
    position: [0, 0.9, -0.08],
    explode: [0, -0.05, -0.55],
    hiddenByDefault: true,
    shapes: at([0, 0.9, -0.08], both((s) => [
      sph(L([0.072, 0.885, -0.088], s), 0.07, MUS, { scale: [1, 1.05, 0.75] }),
      sph(L([0.12, 0.95, -0.04], s), 0.045, MUS_D, { scale: [0.6, 1, 1] }),
    ])),
    info: {
      what: 'The muscles of the buttocks – gluteus maximus, medius and minimus.',
      location: 'Behind and to the side of the hip, from the pelvis and sacrum to the top of the femur.',
      purpose: 'Straighten the hip, power standing up and climbing, and keep the pelvis level when you walk.',
      how: 'Gluteus maximus pulls the thigh backward (hip extension). Gluteus medius and minimus on the side pull the pelvis down toward the standing leg, so the opposite hip does not drop while you are on one foot.',
      connections: ['pelvis', 'femurs', 'leg-nerves', 'hamstrings'],
      examples: 'Climbing stairs, squats, getting up from a chair, sprinting.',
      advanced: 'Gluteus maximus: posterior ilium, sacrum, coccyx and sacrotuberous ligament → iliotibial tract and gluteal tuberosity; inferior gluteal nerve (L5–S2). Gluteus medius/minimus: outer ilium → greater trochanter; superior gluteal nerve (L4–S1). Weakness of the abductors causes a positive Trendelenburg sign. IM injections go in the upper-outer quadrant to avoid the sciatic nerve.',
      facts: ['Gluteus maximus is usually the largest single muscle in the body.'],
    },
  },
  {
    id: 'quadriceps',
    name: 'Quadriceps',
    system: 'muscular',
    position: [0, 0.68, 0.03],
    explode: [0, 0, 0.45],
    hiddenByDefault: true,
    shapes: at([0, 0.68, 0.03], both((s) => [
      taper(L([0.105, 0.83, 0.03], s), L([0.096, 0.53, 0.028], s), 0.048, 0.03, MUS),
      sph(L([0.075, 0.565, 0.028], s), 0.028, MUS_D, { scale: [1, 1.5, 1] }),
      seg(L([0.093, 0.475, 0.045], s), L([0.093, 0.435, 0.032], s), 0.008, TENDON),
    ])),
    info: {
      what: 'The four large muscles on the front of the thigh.',
      location: 'Front of the thigh, from the pelvis and femur down to the kneecap and shin.',
      purpose: 'Straighten the knee – essential for standing, walking, running, jumping and kicking.',
      how: 'All four heads join into one tendon that wraps the kneecap (patella) and continues as the patellar tendon to the tibia. The kneecap acts like a pulley, increasing the leverage of the muscle.',
      connections: ['femurs', 'tibia-fibula', 'pelvis', 'hamstrings'],
      examples: 'Climbing stairs, kicking a ball, the knee-jerk reflex the doctor tests with a hammer.',
      advanced: 'Rectus femoris (from the anterior inferior iliac spine, also flexes the hip), vastus lateralis, vastus medialis and vastus intermedius (from the femoral shaft). Femoral nerve (L2–L4). The patellar (knee-jerk) reflex is a monosynaptic stretch reflex testing L3–L4. Vastus medialis obliquus fibres help keep the patella tracking centrally.',
      facts: ['Tapping the patellar tendon makes the quads twitch without the brain being involved – the reflex loops through the spinal cord.'],
    },
  },
  {
    id: 'hamstrings',
    name: 'Hamstrings',
    system: 'muscular',
    position: [0, 0.69, -0.035],
    explode: [0, 0, -0.45],
    hiddenByDefault: true,
    shapes: at([0, 0.69, -0.035], both((s) => [taper(L([0.1, 0.84, -0.04], s), L([0.095, 0.54, -0.03], s), 0.04, 0.022, MUS_D)])),
    info: {
      what: 'Three muscles on the back of the thigh.',
      location: 'Back of the thigh, from the "sitting bone" of the pelvis to just below the knee.',
      purpose: 'Bend the knee and pull the thigh backward.',
      how: 'They cross both the hip and the knee. Contracting them bends the knee and straightens the hip – the opposite of the quadriceps, so the two groups work as a pair.',
      connections: ['quadriceps', 'pelvis', 'tibia-fibula', 'leg-nerves'],
      examples: 'Sprinting (hamstring strains are common in sprinters), touching your toes stretches them.',
      advanced: 'Biceps femoris (long head), semitendinosus and semimembranosus arise from the ischial tuberosity; biceps femoris short head from the linea aspera. Tibial division of the sciatic nerve supplies all except the short head (common fibular division). Being biarticular, they are most vulnerable to strain during late swing phase of sprinting, when they eccentrically decelerate knee extension.',
      facts: ['The name comes from butchers hanging hams by these tendons.'],
    },
  },
  {
    id: 'calf-muscles',
    name: 'Calf Muscles',
    system: 'muscular',
    position: [0, 0.3, -0.03],
    explode: [0, 0, -0.45],
    hiddenByDefault: true,
    shapes: at([0, 0.3, -0.03], both((s) => [
      sph(L([0.08, 0.375, -0.03], s), 0.03, MUS, { scale: [1, 2.4, 1] }),
      sph(L([0.108, 0.38, -0.028], s), 0.028, MUS_D, { scale: [1, 2.2, 1] }),
      taper(L([0.093, 0.4, -0.02], s), L([0.09, 0.15, -0.03], s), 0.03, 0.015, MUS_D),
      seg(L([0.09, 0.25, -0.034], s), L([0.092, 0.06, -0.036], s), 0.006, TENDON),
    ])),
    info: {
      what: 'The gastrocnemius and soleus – the muscles that make the bulge of the calf.',
      location: 'Back of the lower leg, from just above the knee to the heel via the Achilles tendon.',
      purpose: 'Point the foot down (plantarflexion) to push off when walking, running and jumping, and help pump blood back up from the legs.',
      how: 'Both muscles pull on the Achilles tendon, which lifts the heel. When they contract, they also squeeze the deep leg veins, pushing blood upward past one-way valves – the "calf muscle pump".',
      connections: ['tibia-fibula', 'foot-bones', 'limb-veins', 'leg-nerves'],
      examples: 'Standing on tiptoe, jumping, why sitting still on a long flight can lead to blood clots in the legs.',
      advanced: 'Gastrocnemius (medial and lateral heads from the femoral condyles) crosses the knee; soleus arises from tibia and fibula below the knee and is rich in slow-twitch (type I) fibres for posture. Together (triceps surae) they insert via the calcaneal (Achilles) tendon. Tibial nerve (S1–S2); the ankle jerk tests S1. The soleal venous sinuses are a common site of origin for deep vein thrombosis.',
      facts: ['The Achilles tendon is the thickest and strongest tendon in the body.', 'Calf muscles are sometimes called the "second heart" because they pump venous blood.'],
    },
  },
];

// =========================================================================
// SKELETAL
// =========================================================================
const cervical = { start: [0, 1.43, -0.055], step: [0, 0.02, 0.0035] };
const thorUp = { start: [0, 1.405, -0.06], step: [0, -0.025, -0.0045] };
const thorLo = { start: [0, 1.255, -0.084], step: [0, -0.025, 0.004] };
const lumbar = { start: [0, 1.1, -0.06], step: [0, -0.028, 0.003] };
const add = (a, b) => a.map((v, i) => r3(v + b[i]));

function vertebrae(reg, count, bodyR, bodyH, spLen, spTilt, tpWidth, discR) {
  const out = [
    { type: 'cylinder', radius: bodyR, height: bodyH, segments: 16, position: reg.start, scale: [1.15, 1, 0.9], array: { count, offset: reg.step }, material: BONE },
    { type: 'box', size: [0.007, 0.009, spLen], position: add(reg.start, [0, -0.004, -(bodyR + 0.012 + spLen / 2)]), rotation: [spTilt, 0, 0], array: { count, offset: reg.step }, material: BONE },
    { type: 'box', size: [tpWidth, 0.007, 0.009], position: add(reg.start, [0, 0, -(bodyR + 0.004)]), array: { count, offset: reg.step }, material: BONE },
    { type: 'torus', radius: 0.008, tube: 0.0028, radialSegments: 6, tubularSegments: 14, position: add(reg.start, [0, 0, -(bodyR + 0.009)]), rotation: [PI / 2, 0, 0], array: { count, offset: reg.step }, material: BONE },
  ];
  if (discR) {
    const half = reg.step.map((v) => v / 2);
    out.push({ type: 'cylinder', radius: discR, height: Math.abs(reg.step[1]) - bodyH, segments: 16, position: add(reg.start, half), scale: [1.15, 1, 0.9], array: { count: count - 1, offset: reg.step }, material: CART });
  }
  return out;
}

const skeletonParts = [
  {
    id: 'skull',
    name: 'Skull (Cranium & Face)',
    system: 'skeletal',
    position: [0, 1.63, 0],
    explode: [0, 0.4, 0.05],
    shapes: at([0, 1.63, 0], [
      sph([0, 1.655, -0.02], 0.1, BONE, { scale: [0.76, 0.86, 0.96], widthSegments: 36, heightSegments: 24 }),
      sph([0, 1.578, 0.05], 0.035, BONE, { scale: [1.15, 0.85, 0.8] }),
      { type: 'cone', radius: 0.008, height: 0.03, segments: 10, position: [0, 1.625, 0.085], rotation: [PI / 2 + 0.6, 0, 0], material: BONE },
      { type: 'torus', radius: 0.028, tube: 0.005, arc: PI, radialSegments: 8, tubularSegments: 20, position: [0, 1.553, 0.045], rotation: [PI / 2, 0, 0], scale: [1, 1.3, 1], material: TOOTH },
      ...both((s) => [
        { type: 'torus', radius: 0.019, tube: 0.0045, radialSegments: 8, tubularSegments: 28, position: L([0.032, 1.635, 0.074], s), material: BONE },
        seg(L([0.045, 1.605, 0.06], s), L([0.07, 1.6, 0.005], s), 0.008, BONE),
        sph(L([0.06, 1.585, -0.03], s), 0.01, BONE),
      ]),
    ]),
    info: {
      what: 'The bony case of the head: the cranium that encloses the brain plus the bones of the face.',
      location: 'Top of the spine, forming the head.',
      purpose: 'Protects the brain and eyes, holds the teeth, and gives the face its shape and attachment points for chewing and facial muscles.',
      how: 'Most skull bones are locked together by wavy joints called sutures, making a strong, light helmet. Openings (foramina) let the spinal cord, nerves and blood vessels pass in and out.',
      connections: ['mandible', 'spine', 'cerebrum', 'eyes'],
      examples: 'Wearing a helmet adds an extra protective layer; a baby’s "soft spot" is a gap where skull bones have not yet joined.',
      advanced: '22 bones: 8 cranial (frontal, 2 parietal, 2 temporal, occipital, sphenoid, ethmoid) and 14 facial. Cranial vault bones form by intramembranous ossification; the base by endochondral ossification. Infant fontanelles: posterior closes ~2–3 months, anterior ~18–24 months. The spinal cord exits via the foramen magnum where the occipital condyles articulate with the atlas (C1). The pterion, where four bones meet, overlies the middle meningeal artery – a fracture here can cause an epidural haematoma.',
      facts: ['The adult skull is made of 22 bones; only the jaw can move.', 'The middle ear contains the smallest bones in the body (stapes ≈ 3 mm).'],
    },
  },
  {
    id: 'mandible',
    name: 'Mandible (Lower Jaw)',
    system: 'skeletal',
    position: [0, 1.53, 0.008],
    explode: [0, 0.12, 0.25],
    shapes: at([0, 1.53, 0.008], [
      { type: 'torus', radius: 0.045, tube: 0.009, arc: PI, radialSegments: 10, tubularSegments: 28, position: [0, 1.53, 0.008], rotation: [PI / 2, 0, 0], scale: [1, 1.4, 1], material: BONE },
      { type: 'torus', radius: 0.03, tube: 0.005, arc: PI, radialSegments: 8, tubularSegments: 20, position: [0, 1.542, 0.04], rotation: [PI / 2, 0, 0], scale: [1, 1.3, 1], material: TOOTH },
      ...both((s) => [seg(L([0.045, 1.53, 0.008], s), L([0.056, 1.588, -0.012], s), 0.008, BONE)]),
    ]),
    info: {
      what: 'The lower jaw – the only skull bone that moves.',
      location: 'Forms the chin and lower face, hinged to the temporal bones just in front of the ears.',
      purpose: 'Holds the lower teeth and moves for chewing, speaking and swallowing.',
      how: 'It hinges and slides at the temporomandibular joints (TMJ). Powerful chewing muscles close it; smaller ones open it and move it side to side to grind food.',
      connections: ['skull', 'esophagus'],
      examples: 'Chewing, yawning, talking. Clicking or pain in front of the ear can come from the TMJ.',
      advanced: 'Body, two rami, condylar processes (articulating with the mandibular fossa via a fibrocartilaginous disc) and coronoid processes (temporalis insertion). Elevators: temporalis, masseter, medial pterygoid; depressor/protrusor: lateral pterygoid with digastric and geniohyoid. Supplied by the mandibular division of the trigeminal nerve (V3); the inferior alveolar nerve runs in the mandibular canal and is the target of dental nerve blocks. Bite force at the molars can reach ~700 N.',
      facts: ['The masseter, which closes the jaw, is one of the strongest muscles for its size.'],
    },
  },
  {
    id: 'spine',
    name: 'Vertebral Column (Spine)',
    system: 'skeletal',
    position: [0, 1.2, -0.07],
    explode: [0, 0, -0.3],
    shapes: at([0, 1.2, -0.07], [
      ...vertebrae(cervical, 7, 0.013, 0.013, 0.016, -0.25, 0.04, 0.012),
      ...vertebrae(thorUp, 6, 0.017, 0.018, 0.026, -0.6, 0.05, 0.016),
      ...vertebrae(thorLo, 6, 0.019, 0.019, 0.026, -0.45, 0.052, 0.018),
      ...vertebrae(lumbar, 5, 0.022, 0.022, 0.026, -0.1, 0.07, 0.021),
      { type: 'cylinder', radius: 0.017, height: 0.0055, segments: 16, position: [0, 1.4175, -0.06], scale: [1.15, 1, 0.9], material: CART },
      { type: 'cylinder', radius: 0.018, height: 0.0055, segments: 16, position: [0, 1.2675, -0.084], scale: [1.15, 1, 0.9], material: CART },
      { type: 'cylinder', radius: 0.02, height: 0.006, segments: 16, position: [0, 1.115, -0.062], scale: [1.15, 1, 0.9], material: CART },
    ]),
    info: {
      what: 'The backbone: a flexible column of 33 vertebrae stacked with cushioning discs between them.',
      location: 'Runs down the middle of the back from the skull to the pelvis.',
      purpose: 'Holds the body upright, carries the weight of the head and trunk, protects the spinal cord, and lets the back bend and twist.',
      how: 'Each vertebra has a solid body at the front for weight-bearing and a bony ring at the back that forms a tunnel for the spinal cord. Rubbery intervertebral discs act as shock absorbers. Its gentle S-shaped curves work like a spring when you walk and jump.',
      connections: ['spinal-cord', 'skull', 'ribcage', 'pelvis'],
      examples: 'Bending to tie your shoes, a "slipped" (herniated) disc pressing on a nerve and causing sciatica, scoliosis (sideways curve).',
      advanced: '7 cervical, 12 thoracic, 5 lumbar, 5 fused sacral and ~4 fused coccygeal vertebrae. Curves: cervical and lumbar lordosis, thoracic and sacral kyphosis. The atlas (C1) has no body and the axis (C2) carries the dens, allowing ~50% of head rotation at C1–C2. Discs: gelatinous nucleus pulposus (~80% water in youth) in an annulus fibrosus of collagen lamellae; herniation is commonest at L4–L5 and L5–S1. Discs make up ~25% of the column’s length; you are ~1 cm taller in the morning than at night.',
      facts: ['Almost all mammals – including giraffes – have exactly 7 neck vertebrae.', 'You are about 1 cm taller in the morning because your discs rehydrate overnight.'],
    },
  },
  {
    id: 'ribcage',
    name: 'Ribs & Costal Cartilage',
    system: 'skeletal',
    position: [0, 1.25, 0],
    explode: [0, 0.05, -0.2],
    shapes: at([0, 1.25, 0], ribShapes()),
    info: {
      what: '12 pairs of curved, flat bones that form a protective cage around the chest.',
      location: 'Around the chest, from the thoracic spine at the back curving round to the sternum at the front.',
      purpose: 'Protects the heart and lungs and moves during breathing to change the size of the chest.',
      how: 'Ribs 1–7 ("true ribs") attach to the sternum by their own cartilage; 8–10 ("false ribs") join the cartilage above; 11–12 ("floating ribs") end freely. Muscles between the ribs lift them up and out like bucket handles when you breathe in, enlarging the chest.',
      connections: ['sternum', 'spine', 'right-lung', 'left-lung', 'heart', 'diaphragm'],
      examples: 'Feeling your chest expand with a deep breath, a broken rib making breathing painful, CPR compressions pushing the sternum down against the springy cartilage.',
      advanced: 'Typical ribs (3–9) have a head with two facets articulating with adjacent vertebral bodies (costovertebral joint), a tubercle articulating with the transverse process (costotransverse joint), a neck, an angle and a shaft with a costal groove sheltering the intercostal vein, artery and nerve (VAN, top to bottom). Upper ribs move in a "pump-handle" (anteroposterior) motion and lower ribs in a "bucket-handle" (lateral) motion. External intercostals assist inspiration; internal intercostals assist forced expiration. Costal cartilage is hyaline cartilage that tends to calcify with age.',
      facts: ['About 1 in 200 people has an extra "cervical rib" above the first rib.', 'Men and women have the same number of ribs – 24.'],
    },
  },
  {
    id: 'sternum',
    name: 'Sternum (Breastbone)',
    system: 'skeletal',
    position: [0, 1.28, 0.085],
    explode: [0, 0.1, -0.2],
    shapes: at([0, 1.28, 0.085], [
      sph([0, 1.375, 0.071], 0.022, BONE, { scale: [1.2, 1, 0.4] }),
      seg([0, 1.355, 0.075], [0, 1.2, 0.096], 0.012, BONE, { scale: [1.6, 1, 0.5] }),
      { type: 'cone', radius: 0.008, height: 0.026, segments: 10, position: [0, 1.178, 0.098], rotation: [PI, 0, 0], scale: [1, 1, 0.5], material: CART },
    ]),
    info: {
      what: 'The flat, dagger-shaped bone in the middle of the chest.',
      location: 'Front centre of the chest, between the ribs, just in front of the heart.',
      purpose: 'Anchors the collarbones and the first seven pairs of ribs, and shields the heart and great vessels.',
      how: 'It has three parts: the manubrium (top handle), the body (blade) and the small xiphoid process (tip). Rib cartilages join along its edges so the chest can flex as you breathe.',
      connections: ['ribcage', 'clavicles', 'heart', 'pectoralis-major'],
      examples: 'CPR: hand position is on the lower half of the sternum, pushing 5–6 cm deep at 100–120 compressions per minute.',
      advanced: 'The manubriosternal joint (angle of Louis) lies at the level of the T4/T5 disc and the 2nd costal cartilage – a key landmark for counting ribs and marking the tracheal bifurcation, aortic arch and azygos termination. The sternum contains red marrow throughout adult life, so it can be used for bone-marrow biopsy. The xiphoid ossifies late (often after 40). Median sternotomy is the standard approach for open-heart surgery.',
      facts: ['Surgeons split the sternum lengthwise to reach the heart in open-heart operations.'],
    },
  },
  {
    id: 'clavicles',
    name: 'Clavicles (Collarbones)',
    system: 'skeletal',
    position: [0, 1.42, 0.03],
    explode: [0, 0.15, 0.05],
    shapes: at([0, 1.42, 0.03], both((s) => [
      tube(mxs([[0.025, 1.4, 0.075], [0.08, 1.415, 0.07], [0.13, 1.43, 0.03], [0.177, 1.44, -0.02]], s), 0.0065, BONE, { segments: 36 }),
    ])),
    info: {
      what: 'Two S-shaped bones running across the top of the chest.',
      location: 'Between the top of the sternum and the tip of each shoulder blade (acromion).',
      purpose: 'Act as struts that hold the shoulders out to the side so the arms can swing freely, and pass forces from the arms to the trunk.',
      how: 'Each clavicle is the only bony link between the arm and the trunk. It rotates and lifts slightly at the joint with the sternum whenever you raise your arm.',
      connections: ['sternum', 'scapulae', 'deltoids', 'trapezius'],
      examples: 'The bump you feel at the base of your neck; collarbone fractures from falling on an outstretched hand are very common.',
      advanced: 'First bone to start ossifying (week 5–6 of gestation, mainly intramembranous) and the last to complete (medial epiphysis fuses ~25 years). The sternoclavicular joint is a saddle joint with an articular disc; the acromioclavicular joint is a plane joint stabilised by the coracoclavicular (conoid and trapezoid) ligaments. Fractures usually occur at the junction of the middle and lateral thirds. Subclavian vessels and the brachial plexus pass just beneath it.',
      facts: ['The clavicle is the most commonly broken bone in children.'],
    },
  },
  {
    id: 'scapulae',
    name: 'Scapulae (Shoulder Blades)',
    system: 'skeletal',
    position: [0, 1.34, -0.09],
    explode: [0, 0.05, -0.4],
    shapes: at([0, 1.34, -0.09], both((s) => [
      { type: 'extrude', outline: [[-0.045 * s, 0.07], [0.055 * s, 0.06], [-0.032 * s, -0.1]].map((p) => p.map(r3)), depth: 0.006, bevel: 0.002, position: L([0.11, 1.33, -0.098], s), rotation: [0, -s * 0.4, 0], material: BONE },
      seg(L([0.06, 1.36, -0.106], s), L([0.18, 1.43, -0.04], s), 0.0065, BONE),
      seg(L([0.155, 1.39, -0.075], s), L([0.172, 1.405, -0.04], s), 0.012, BONE),
      seg(L([0.15, 1.405, -0.06], s), L([0.16, 1.41, -0.015], s), 0.005, BONE),
    ])),
    info: {
      what: 'Two flat, triangular bones on the upper back.',
      location: 'Over the back of the ribs, from about the 2nd to the 7th rib on each side.',
      purpose: 'Form the socket of the shoulder joint and give a large, movable base for 17 muscles that move the arm.',
      how: 'The shoulder blade glides over the ribcage. Its shallow socket (glenoid) holds the head of the humerus, and by tilting and rotating it extends the reach of the arm – especially when lifting it overhead.',
      connections: ['humeri', 'clavicles', 'trapezius', 'deltoids', 'ribcage'],
      examples: 'Squeezing your shoulder blades together; "winged scapula" when the serratus anterior is weak.',
      advanced: 'Features: spine, acromion, coracoid process, glenoid fossa (deepened by the fibrocartilaginous labrum), supraspinous and infraspinous fossae, subscapular fossa. Rotator cuff (supraspinatus, infraspinatus, teres minor, subscapularis) arises here and stabilises the glenohumeral joint. Scapulohumeral rhythm: ~2:1 glenohumeral to scapulothoracic motion during abduction. The scapulothoracic "joint" is a physiological, not anatomical, articulation.',
      facts: ['17 different muscles attach to each shoulder blade.'],
    },
  },
  {
    id: 'pelvis',
    name: 'Pelvis & Sacrum',
    system: 'skeletal',
    position: [0, 0.92, -0.01],
    explode: [0, -0.12, -0.15],
    shapes: at([0, 0.92, -0.01], [
      ...both((s) => [
        sph(L([0.105, 0.985, -0.025], s), 0.075, BONE, { widthSegments: 22, heightSegments: 14, scale: [1, 0.9, 0.3], rotation: [0.15, -s * 0.75, -s * 0.2] }),
        tube(mxs([[0.088, 0.925, 0.02], [0.06, 0.905, 0.05], [0.02, 0.875, 0.07], [0.006, 0.865, 0.072]], s), 0.011, BONE),
        tube(mxs([[0.085, 0.89, -0.015], [0.075, 0.845, -0.03], [0.055, 0.83, 0.0], [0.03, 0.845, 0.05], [0.008, 0.86, 0.07]], s), 0.01, BONE),
        { type: 'torus', radius: 0.026, tube: 0.008, radialSegments: 8, tubularSegments: 24, position: L([0.092, 0.905, 0.0], s), rotation: [0, PI / 2, 0], material: BONE },
        seg(L([0.05, 0.965, -0.06], s), L([0.08, 0.95, -0.04], s), 0.016, BONE),
      ]),
      taper([0, 0.975, -0.055], [0, 0.88, -0.088], 0.045, 0.014, BONE, { scale: [1, 1, 0.45] }),
      { type: 'cone', radius: 0.01, height: 0.025, segments: 10, position: [0, 0.865, -0.088], rotation: [PI, 0, 0], material: BONE },
      { type: 'box', size: [0.008, 0.025, 0.012], radius: 0.003, position: [0, 0.865, 0.072], material: CART },
    ]),
    info: {
      what: 'The basin-shaped ring of bones at the base of the trunk: two hip bones plus the sacrum and coccyx.',
      location: 'Between the lower spine and the legs, around the lower abdomen.',
      purpose: 'Transfers body weight from the spine to the legs, protects the bladder, rectum and reproductive organs, and anchors powerful hip and trunk muscles.',
      how: 'Each hip bone is three bones fused together – ilium, ischium and pubis – meeting at the cup-shaped hip socket (acetabulum). At the back they lock onto the sacrum; at the front they meet at the pubic symphysis, a cartilage joint.',
      connections: ['spine', 'femurs', 'bladder', 'glutes', 'abdominals'],
      examples: 'Your hip bones are the bumps you feel at your waist; you sit on the ischial tuberosities ("sit bones").',
      advanced: 'Ilium, ischium and pubis fuse at the Y-shaped triradiate cartilage in the acetabulum around age 15–17. The female pelvis typically has a wider, rounder inlet, a wider subpubic angle (>80° vs ~60°) and a larger outlet for childbirth. The sacroiliac joints are synovial in front and syndesmotic behind, with very little movement. The sacral canal holds the cauda equina; four pairs of sacral foramina transmit S1–S4 rami.',
      facts: ['The pelvis is one of the best bones for estimating sex from a skeleton.'],
    },
  },
  {
    id: 'humeri',
    name: 'Humerus (Upper-arm Bones)',
    system: 'skeletal',
    position: [0, 1.27, -0.022],
    explode: [0, 0, 0],
    shapes: at([0, 1.27, -0.022], both((s) => [
      sph(L([0.188, 1.415, -0.022], s), 0.024, BONE),
      sph(L([0.205, 1.41, -0.012], s), 0.013, BONE),
      seg(L([0.193, 1.4, -0.02], s), L([0.232, 1.14, -0.025], s), 0.011, BONE),
      seg(L([0.215, 1.126, -0.025], s), L([0.258, 1.13, -0.025], s), 0.011, BONE),
    ])),
    info: {
      what: 'The long bone of the upper arm.',
      location: 'Between the shoulder joint and the elbow.',
      purpose: 'Acts as a lever for the shoulder and arm muscles and forms the upper half of the elbow.',
      how: 'Its rounded head fits into the shallow shoulder socket, giving the shoulder the widest range of motion of any joint. At the bottom it widens into a hinge surface where the radius and ulna meet it.',
      connections: ['scapulae', 'forearm-bones', 'biceps', 'triceps', 'deltoids'],
      examples: 'The "funny bone" isn’t a bone – it is the ulnar nerve running behind the humerus at the elbow.',
      advanced: 'Proximal: head, anatomical neck, greater and lesser tubercles, intertubercular groove (long biceps tendon), surgical neck (axillary nerve at risk). Shaft: deltoid tuberosity and radial groove (radial nerve at risk in mid-shaft fractures, causing wrist drop). Distal: capitulum (radius), trochlea (ulna), medial epicondyle (ulnar nerve behind it) and lateral epicondyle. Long bones grow at epiphyseal plates by endochondral ossification; compact bone is organised into osteons around Haversian canals.',
      facts: ['The shoulder (glenohumeral) joint is the most frequently dislocated major joint.'],
    },
  },
  {
    id: 'forearm-bones',
    name: 'Radius & Ulna',
    system: 'skeletal',
    position: [0, 1.0, -0.02],
    explode: [0, 0, 0],
    shapes: at([0, 1.0, -0.02], both((s) => [
      taper(L([0.226, 1.14, -0.04], s), L([0.258, 0.872, -0.004], s), 0.011, 0.006, BONE),
      sph(L([0.226, 1.137, -0.043], s), 0.012, BONE),
      sph(L([0.258, 0.872, -0.004], s), 0.008, BONE),
      taper(L([0.25, 1.112, -0.02], s), L([0.285, 0.875, 0.0], s), 0.007, 0.012, BONE),
      { type: 'cylinder', radius: 0.01, height: 0.01, segments: 14, position: L([0.25, 1.11, -0.02], s), material: BONE },
    ])),
    info: {
      what: 'The two parallel bones of the forearm: the radius (thumb side) and the ulna (little-finger side).',
      location: 'Between the elbow and the wrist.',
      purpose: 'Support the forearm, anchor the hand and wrist muscles, and let the forearm twist.',
      how: 'The ulna forms a tight hinge with the humerus at the elbow. The radius can roll around the ulna, flipping the palm up (supination) or down (pronation), while the wrist is carried mainly on the radius.',
      connections: ['humeri', 'hand-bones', 'forearm-muscles', 'biceps'],
      examples: 'Turning a doorknob, twisting a screwdriver, a broken wrist from a fall (often a distal radius fracture).',
      advanced: 'Proximal and distal radio-ulnar joints are pivot joints; the interosseous membrane transmits load from radius to ulna. The olecranon is the bony point of the elbow. A Colles fracture is a dorsally displaced distal radius fracture after a fall on an outstretched hand, common in osteoporosis. In children, a "pulled elbow" is subluxation of the radial head from the annular ligament.',
      facts: ['In anatomical position (palms forward) the radius and ulna lie parallel; turning the palm down makes them cross.'],
    },
  },
  {
    id: 'hand-bones',
    name: 'Bones of the Hands',
    system: 'skeletal',
    position: [0, 0.8, 0.004],
    explode: [0, 0, 0],
    shapes: at([0, 0.8, 0.004], both((s) => [
      { type: 'box', size: [0.045, 0.026, 0.018], radius: 0.006, position: L([0.272, 0.848, 0.002], s), material: BONE },
      { ...thin(L([0.255, 0.835, 0.002], s), L([0.255, 0.782, 0.004], s), 0.0045, BONE), array: { count: 4, offset: [s * 0.0115, 0, 0] } },
      { ...thin(L([0.255, 0.772, 0.004], s), L([0.255, 0.705, 0.008], s), 0.004, BONE), array: { count: 4, offset: [s * 0.0115, 0, 0] } },
      thin(L([0.29, 0.84, 0.006], s), L([0.305, 0.797, 0.02], s), 0.005, BONE),
      thin(L([0.307, 0.79, 0.022], s), L([0.313, 0.755, 0.03], s), 0.0042, BONE),
    ])),
    info: {
      what: 'The 27 bones of each hand and wrist: 8 carpals, 5 metacarpals and 14 phalanges.',
      location: 'From the end of the forearm to the fingertips.',
      purpose: 'Give the hand its shape and make precise gripping and manipulation possible.',
      how: 'The small carpal bones glide against each other to let the wrist bend in many directions. Metacarpals form the palm, and the phalanges form jointed fingers. The thumb’s saddle joint lets it swing across to touch every fingertip (opposition).',
      connections: ['forearm-bones', 'forearm-muscles', 'arm-nerves'],
      examples: 'Writing, typing, threading a needle; "boxer’s fracture" of the 5th metacarpal from punching.',
      advanced: 'Carpals (proximal row: scaphoid, lunate, triquetrum, pisiform; distal row: trapezium, trapezoid, capitate, hamate). The scaphoid is the most commonly fractured carpal; its retrograde blood supply (from the radial artery, entering distally) makes proximal-pole avascular necrosis a risk. The first carpometacarpal joint is a saddle joint enabling opposition. The two hands contain 54 of the body’s 206 bones.',
      facts: ['Your hands and feet together contain more than half of all your bones (106 of 206).'],
    },
  },
  {
    id: 'femurs',
    name: 'Femur & Patella (Thigh Bone & Kneecap)',
    system: 'skeletal',
    position: [0, 0.7, 0],
    explode: [0, 0, 0],
    shapes: at([0, 0.7, 0], both((s) => [
      sph(L([0.088, 0.905, 0.0], s), 0.023, BONE),
      seg(L([0.088, 0.905, 0.0], s), L([0.135, 0.877, -0.005], s), 0.014, BONE),
      sph(L([0.142, 0.887, -0.01], s), 0.02, BONE, { scale: [1, 1.3, 1] }),
      sph(L([0.115, 0.85, -0.012], s), 0.01, BONE),
      seg(L([0.132, 0.875, -0.002], s), L([0.098, 0.52, 0.004], s), 0.0145, BONE),
      sph(L([0.075, 0.5, 0.0], s), 0.022, BONE, { scale: [1, 1, 1.3] }),
      sph(L([0.112, 0.5, 0.0], s), 0.022, BONE, { scale: [1, 1, 1.3] }),
      sph(L([0.093, 0.505, 0.042], s), 0.02, BONE, { scale: [1, 1.2, 0.5] }),
    ])),
    info: {
      what: 'The femur is the thigh bone – the longest and strongest bone in the body. The patella (kneecap) sits in front of its lower end.',
      location: 'From the hip socket in the pelvis down to the knee.',
      purpose: 'Carries the body’s weight while standing and walking, and acts as a long lever for the powerful thigh muscles.',
      how: 'The ball-shaped head fits deep into the pelvis, making a stable ball-and-socket hip. The shaft angles inward so the knees sit under the body. At the knee its two rounded condyles roll and glide on the tibia, with the kneecap gliding in a groove in front.',
      connections: ['pelvis', 'tibia-fibula', 'quadriceps', 'hamstrings', 'glutes'],
      examples: 'Hip fractures in elderly people usually break the femoral neck; the kneecap protects the front of the knee when kneeling.',
      advanced: 'Neck–shaft angle ~125°; femoral anteversion ~10–15°. Blood supply to the head comes mainly from the medial circumflex femoral artery, so displaced intracapsular neck fractures risk avascular necrosis. Cortical bone can withstand compressive stresses of ~170 MPa. Red marrow in the femur produces blood cells; much converts to yellow (fatty) marrow by adulthood. The patella is the largest sesamoid bone, embedded in the quadriceps tendon, increasing the extensor moment arm.',
      facts: ['The femur is about a quarter of your height.', 'The kneecap is bone you were born without – it ossifies at around 3–6 years of age.'],
    },
  },
  {
    id: 'tibia-fibula',
    name: 'Tibia & Fibula (Shin Bones)',
    system: 'skeletal',
    position: [0, 0.28, 0],
    explode: [0, 0, 0],
    shapes: at([0, 0.28, 0], both((s) => [
      { type: 'cylinder', radiusTop: 0.038, radiusBottom: 0.024, height: 0.03, segments: 20, position: L([0.093, 0.468, 0.0], s), scale: [1, 1, 0.8], material: BONE },
      seg(L([0.09, 0.46, 0.0], s), L([0.085, 0.095, -0.005], s), 0.012, BONE),
      sph(L([0.093, 0.44, 0.022], s), 0.01, BONE),
      sph(L([0.07, 0.075, -0.005], s), 0.012, BONE),
      sph(L([0.123, 0.448, -0.016], s), 0.01, BONE),
      seg(L([0.123, 0.445, -0.016], s), L([0.113, 0.08, -0.02], s), 0.0055, BONE),
      sph(L([0.113, 0.068, -0.02], s), 0.011, BONE),
    ])),
    info: {
      what: 'The two bones of the lower leg: the thick tibia (shinbone) and the thin fibula beside it.',
      location: 'Between the knee and the ankle; the tibia is on the inner (big-toe) side, the fibula on the outer side.',
      purpose: 'The tibia carries almost all of the body’s weight to the foot. The fibula anchors muscles and helps stabilise the ankle.',
      how: 'The flat top of the tibia forms the lower half of the knee. At the bottom, the tibia and fibula form a bony clamp (the ankle mortise) that grips the talus, letting the foot hinge up and down.',
      connections: ['femurs', 'foot-bones', 'calf-muscles', 'quadriceps'],
      examples: 'The bumps on each side of your ankle are the ends of the tibia (inside) and fibula (outside). "Shin splints" affect the tibia.',
      advanced: 'The tibial plateau carries the medial and lateral menisci (fibrocartilage C-shaped discs) and the intercondylar eminence where the cruciate ligaments attach. The anteromedial tibial surface is subcutaneous, so open fractures are common. The fibula bears only ~10–15% of load and can be harvested as a vascularised bone graft. The common fibular nerve winds around the fibular neck and is easily injured there (foot drop).',
      facts: ['The tibia is the second-longest bone in the body.'],
    },
  },
  {
    id: 'foot-bones',
    name: 'Bones of the Feet',
    system: 'skeletal',
    position: [0, 0.04, 0.03],
    explode: [0, 0, 0],
    shapes: at([0, 0.04, 0.03], both((s) => [
      sph(L([0.09, 0.058, -0.005], s), 0.02, BONE, { scale: [1, 0.8, 1.3] }),
      seg(L([0.092, 0.04, 0.0], s), L([0.092, 0.026, -0.058], s), 0.02, BONE),
      { type: 'box', size: [0.055, 0.028, 0.04], radius: 0.008, position: L([0.094, 0.042, 0.038], s), material: BONE },
      { ...thin(L([0.072, 0.036, 0.058], s), L([0.072, 0.014, 0.128], s), 0.0065, BONE), array: { count: 5, offset: [s * 0.012, 0, -0.007] } },
      { ...thin(L([0.072, 0.012, 0.138], s), L([0.072, 0.01, 0.166], s), 0.0055, BONE), array: { count: 5, offset: [s * 0.012, 0, -0.007] } },
    ])),
    info: {
      what: 'The 26 bones of each foot: 7 tarsals (including the heel bone), 5 metatarsals and 14 phalanges.',
      location: 'Below the ankle, from the heel to the toes.',
      purpose: 'Support the entire body weight, absorb shock and act as a springy lever for walking and running.',
      how: 'The bones are arranged in arches held up by ligaments and muscles. When you step, the arches flatten slightly to absorb impact, then recoil to help push you forward as the heel lifts and the toes push off.',
      connections: ['tibia-fibula', 'calf-muscles', 'leg-nerves', 'limb-arteries'],
      examples: 'Flat feet (fallen arches), a sprained ankle, stress fractures of the metatarsals in runners.',
      advanced: 'Tarsals: talus, calcaneus, navicular, cuboid and three cuneiforms. The talus has no muscle attachments and transmits load from the tibia. Medial longitudinal arch (keystone: talus), lateral longitudinal arch and transverse arch; the plantar aponeurosis acts as a windlass when the toes dorsiflex. During running, ground reaction forces reach ~2.5–3× body weight. The base of the 5th metatarsal is a common avulsion fracture site.',
      facts: ['A quarter of all your bones are in your feet.'],
    },
  },
];

// =========================================================================
// NERVOUS
// =========================================================================
const cordPoints = [[0, 1.57, -0.054], [0, 1.55, -0.057], [0, 1.49, -0.067], [0, 1.43, -0.077], [0, 1.38, -0.09], [0, 1.28, -0.108], [0, 1.18, -0.1], [0, 1.13, -0.092], [0, 1.085, -0.09]];
function spinalRoots() {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const [y, zb] = thoracic(i);
    const zc = zb - 0.026;
    for (const s of SIDES) out.push(thin(L([0.006, y - 0.008, zc], s), L([0.03, y - 0.014, zc + 0.012], s), 0.0018, NERVE));
  }
  return out;
}

const nervousParts = [
  {
    id: 'cerebrum',
    name: 'Cerebrum (Brain Hemispheres)',
    system: 'nervous',
    position: [0, 1.67, -0.012],
    explode: [0, 0.55, 0.15],
    shapes: at([0, 1.67, -0.012], [
      ...both((s) => [
        { type: 'organic', radius: 0.075, noise: 0.03, frequency: 20, detail: 24, position: L([0.035, 1.67, -0.012], s), scale: [0.45, 0.8, 1.08], material: BRAIN },
        { type: 'organic', radius: 0.03, noise: 0.04, frequency: 18, detail: 12, position: L([0.05, 1.627, 0.008], s), scale: [0.8, 0.8, 1.4], material: BRAIN },
      ]),
    ]),
    info: {
      what: 'The largest part of the brain: two wrinkled hemispheres responsible for thinking, memory, language, senses and voluntary movement.',
      location: 'Fills most of the skull, above the cerebellum and brainstem.',
      purpose: 'Processes everything you see, hear and feel, makes decisions, stores memories, controls deliberate movements and produces language and consciousness.',
      how: 'Its outer layer, the cortex, is folded into ridges (gyri) and grooves (sulci) to pack a large surface into the skull. Different regions specialise: the frontal lobe plans and moves, the parietal lobe feels touch, the temporal lobe hears and forms memories, the occipital lobe sees. Billions of neurons communicate with electrical impulses and chemical messengers.',
      connections: ['brainstem', 'cerebellum', 'spinal-cord', 'eyes', 'carotid-arteries'],
      examples: 'Reading this sentence (visual cortex + language areas), remembering a phone number, deciding to wave.',
      advanced: 'The cortex is 2–4 mm thick grey matter with six layers (neocortex) and ~16 billion of the brain’s ~86 billion neurons; white matter beneath is myelinated axons (corpus callosum: ~200 million fibres joining the hemispheres). Primary motor cortex (precentral gyrus) and somatosensory cortex (postcentral gyrus) are mapped somatotopically (homunculus). Broca’s (inferior frontal) and Wernicke’s (superior temporal) areas are usually left-lateralised. The brain is ~2% of body mass but uses ~20% of resting oxygen and ~15% of cardiac output (~750 mL/min); glucose use ~120 g/day.',
      facts: ['The brain has about 86 billion neurons.', 'Each hemisphere mainly controls the opposite side of the body.'],
    },
  },
  {
    id: 'cerebellum',
    name: 'Cerebellum',
    system: 'nervous',
    position: [0, 1.605, -0.07],
    explode: [0, 0.38, -0.25],
    shapes: at([0, 1.605, -0.07], [
      { type: 'organic', radius: 0.04, noise: 0.03, frequency: 30, detail: 18, position: [0, 1.605, -0.07], scale: [1.3, 0.65, 0.85], material: BRAIN_D },
    ]),
    info: {
      what: 'The "little brain" at the back of the head that coordinates movement and balance.',
      location: 'Under the back of the cerebrum, behind the brainstem.',
      purpose: 'Makes movements smooth, accurate and well-timed, keeps your balance and helps you learn motor skills.',
      how: 'It constantly compares what the brain intends to do with information from muscles, joints, eyes and the inner ear, and sends corrections – like an autopilot fine-tuning every movement.',
      connections: ['brainstem', 'cerebrum', 'spinal-cord'],
      examples: 'Riding a bike without thinking, touching your nose with eyes closed, the clumsiness caused by alcohol (which affects the cerebellum).',
      advanced: 'Contains ~69 billion neurons – about 80% of all brain neurons – mostly tiny granule cells, yet is only ~10% of brain volume. The cortex has three layers (molecular, Purkinje, granular); Purkinje cells are the sole output of the cortex and are GABAergic (inhibitory), projecting to deep cerebellar nuclei. Inputs via mossy fibres and climbing fibres (inferior olive), connected through three cerebellar peduncles. Lesions cause ipsilateral ataxia, intention tremor, dysmetria and dysdiadochokinesia.',
      facts: ['The cerebellum holds more neurons than the rest of the brain combined.'],
    },
  },
  {
    id: 'brainstem',
    name: 'Brainstem',
    system: 'nervous',
    position: [0, 1.6, -0.035],
    explode: [0, 0.32, -0.08],
    shapes: at([0, 1.6, -0.035], [
      taper([0, 1.645, -0.02], [0, 1.56, -0.056], 0.016, 0.01, BRAIN_D),
      sph([0, 1.615, -0.024], 0.017, BRAIN_D, { scale: [1.1, 1, 0.9] }),
    ]),
    info: {
      what: 'The stalk that connects the brain to the spinal cord: midbrain, pons and medulla.',
      location: 'At the base of the brain, in front of the cerebellum, continuous with the spinal cord.',
      purpose: 'Controls automatic life-sustaining functions – breathing, heart rate, blood pressure, swallowing, sleep and wakefulness – and relays all signals between brain and body.',
      how: 'All nerve pathways between the brain and the spinal cord pass through it. Clusters of neurons inside act as control centres: the medulla sets the breathing rhythm and adjusts heart rate, and 10 of the 12 cranial nerves emerge from it.',
      connections: ['cerebrum', 'cerebellum', 'spinal-cord', 'heart', 'diaphragm'],
      examples: 'Breathing while asleep, reflex coughing and swallowing, the gag reflex.',
      advanced: 'Midbrain: cerebral peduncles, substantia nigra (dopaminergic; degenerates in Parkinson’s), cranial nerves III–IV. Pons: CN V–VIII nuclei, pontine respiratory group. Medulla: pyramids (corticospinal tracts decussate here), olives, CN IX–XII, dorsal and ventral respiratory groups (pre-Bötzinger complex generates the respiratory rhythm), nucleus tractus solitarius and cardiovascular centres. The reticular activating system maintains arousal; brainstem death is the legal definition of death in many countries.',
      facts: ['The motor pathways cross sides in the medulla – that is why the left brain moves the right body.'],
    },
  },
  {
    id: 'spinal-cord',
    name: 'Spinal Cord',
    system: 'nervous',
    position: [0, 1.3, -0.09],
    explode: [0, 0, -0.5],
    shapes: at([0, 1.3, -0.09], [
      tube(cordPoints, 0.0055, NERVE, { segments: 90, radialSegments: 10 }),
      ...both((s) => [
        tube([[s * 0.003, 1.085, -0.09], [s * 0.006, 1.03, -0.086], [s * 0.01, 0.98, -0.08], [s * 0.02, 0.95, -0.075]], 0.0022, NERVE),
        tube([[s * 0.001, 1.085, -0.09], [s * 0.003, 1.02, -0.087], [s * 0.005, 0.96, -0.082], [s * 0.012, 0.92, -0.08]], 0.0018, NERVE),
      ]),
      ...spinalRoots(),
    ]),
    anim: { type: 'flow', speed: 1.5 },
    info: {
      what: 'A thick cable of nerve tissue running from the brainstem down the spinal canal – the main highway between brain and body.',
      location: 'Inside the vertebral column, from the base of the skull to about the first/second lumbar vertebra, continuing below as a bundle of roots (cauda equina).',
      purpose: 'Carries sensations up to the brain and movement commands down to the muscles, and handles fast reflexes on its own.',
      how: '31 pairs of spinal nerves branch off it, one through each gap between vertebrae. Sensory signals enter at the back of the cord, motor signals leave from the front. For a reflex – like pulling your hand from a hot stove – the cord connects the incoming and outgoing signals directly, before the brain even knows.',
      connections: ['brainstem', 'spine', 'arm-nerves', 'leg-nerves'],
      examples: 'Knee-jerk reflex, why spinal injuries can cause paralysis below the injury, an epidural injection during childbirth.',
      advanced: 'About 45 cm long, ~1 cm wide, with cervical (C4–T1) and lumbosacral (L1–S3) enlargements for the limbs. Cross-section: butterfly-shaped grey matter (dorsal horns sensory, ventral horns α-motor neurons, lateral horns sympathetic T1–L2) surrounded by white-matter tracts: dorsal columns (fine touch, proprioception), spinothalamic (pain, temperature, crosses at entry level), lateral corticospinal (voluntary movement, crossed in the medulla). The cord ends as the conus medullaris at L1–L2 in adults, so lumbar punctures are done at L3–L4 or L4–L5. Protected by dura, arachnoid and pia mater with CSF in the subarachnoid space.',
      facts: ['There are 31 pairs of spinal nerves.', 'The spinal cord stops growing before the spine does, so in adults it ends around waist level.'],
    },
  },
  {
    id: 'eyes',
    name: 'Eyes & Optic Nerves',
    system: 'nervous',
    position: [0, 1.635, 0.06],
    explode: [0, 0.2, 0.4],
    shapes: at([0, 1.635, 0.06], both((s) => [
      sph(L([0.032, 1.635, 0.07], s), 0.012, EYE),
      sph(L([0.032, 1.635, 0.0805], s), 0.0055, IRIS, { scale: [1, 1, 0.35] }),
      sph(L([0.032, 1.635, 0.0818], s), 0.0026, PUPIL, { scale: [1, 1, 0.35] }),
      tube(mxs([[0.032, 1.635, 0.06], [0.022, 1.632, 0.038], [0.004, 1.628, 0.02], [0.015, 1.63, 0.0], [0.02, 1.632, -0.02]], s), 0.0022, NERVE),
    ])),
    info: {
      what: 'The organs of sight – two fluid-filled balls that focus light onto a light-sensitive layer, connected to the brain by the optic nerves.',
      location: 'In the bony eye sockets (orbits) of the skull, just below the frontal lobes.',
      purpose: 'Turn light into nerve signals so the brain can build pictures of the world.',
      how: 'Light passes through the clear cornea, the pupil (sized by the coloured iris) and the lens, which focuses it onto the retina at the back. Rods and cones in the retina convert light into electrical signals that travel along the optic nerve. At the optic chiasm, half the fibres cross so each side of the brain sees the opposite half of the visual field.',
      connections: ['cerebrum', 'skull', 'brainstem'],
      examples: 'Pupils shrinking in bright light, needing glasses when the eye focuses in front of or behind the retina.',
      advanced: 'Axial length ~24 mm. The cornea provides ~43 of the eye’s ~60 dioptres of refractive power; the lens adds ~20 D and changes shape (accommodation) via the ciliary muscle. The retina holds ~120 million rods (dim-light, peripheral) and ~6 million cones (colour; S, M, L types), densest in the fovea. ~1.2 million retinal ganglion cell axons form each optic nerve (CN II), which is technically a tract of the CNS covered by meninges. Visual pathway: retina → optic chiasm (nasal fibres cross) → optic tract → lateral geniculate nucleus → optic radiation → primary visual cortex (V1, occipital lobe).',
      facts: ['Each eye has a blind spot where the optic nerve leaves – your brain fills in the gap.', 'The image on your retina is upside down; the brain flips it.'],
    },
  },
  {
    id: 'arm-nerves',
    name: 'Arm Nerves (Brachial Plexus)',
    system: 'nervous',
    position: [0, 1.1, -0.01],
    explode: [0, 0, -0.3],
    anim: { type: 'flow', speed: 2 },
    shapes: at([0, 1.1, -0.01], both((s) => [
      tube(plexus(s), 0.0035, NERVE),
      tube(medianN(s), 0.0026, NERVE),
      tube(ulnarN(s), 0.0024, NERVE),
      tube(radialN(s), 0.0026, NERVE),
    ])),
    info: {
      what: 'The network of nerves supplying the shoulder, arm and hand: the brachial plexus and its main branches – the median, ulnar and radial nerves.',
      location: 'From the lower neck (spinal cord segments C5–T1), under the collarbone, through the armpit and down the arm to the fingers.',
      purpose: 'Carry movement commands to the arm muscles and bring touch, pain, temperature and position sense back from the arm and hand.',
      how: 'Nerve roots from the neck merge and re-sort in the plexus, then leave as named nerves. The median nerve runs down the middle of the arm through the carpal tunnel, the ulnar nerve passes behind the elbow (the "funny bone") to the little finger, and the radial nerve spirals behind the humerus to the back of the forearm.',
      connections: ['spinal-cord', 'biceps', 'triceps', 'forearm-muscles', 'hand-bones'],
      examples: 'Hitting your "funny bone" (ulnar nerve), carpal tunnel syndrome (median nerve), "Saturday night palsy" from sleeping with an arm over a chair (radial nerve).',
      advanced: 'Plexus organisation: roots (C5–T1) → trunks (upper, middle, lower) → divisions → cords (lateral, posterior, medial, named relative to the axillary artery) → terminal branches (musculocutaneous, axillary, radial, median, ulnar). Peripheral nerves are bundles of axons in endoneurium, grouped into fascicles by perineurium, wrapped in epineurium. Myelinated Aα motor fibres conduct at ~70–120 m/s by saltatory conduction between nodes of Ranvier. Erb’s palsy (C5–C6) produces the "waiter’s tip" posture; Klumpke’s palsy (C8–T1) a claw hand.',
      facts: ['Nerve signals can travel faster than 100 m/s – over 360 km/h.'],
    },
  },
  {
    id: 'leg-nerves',
    name: 'Leg Nerves (Sciatic & Femoral)',
    system: 'nervous',
    position: [0, 0.5, -0.02],
    explode: [0, 0, -0.3],
    anim: { type: 'flow', speed: 2 },
    shapes: at([0, 0.5, -0.02], both((s) => [
      tube(sciaticN(s), 0.0048, NERVE),
      tube(tibialN(s), 0.0032, NERVE),
      tube(fibularN(s), 0.0028, NERVE),
      tube(femoralN(s), 0.003, NERVE),
    ])),
    info: {
      what: 'The main nerves of the legs: the sciatic nerve (and its tibial and common fibular branches) at the back, and the femoral nerve at the front.',
      location: 'From the lower spinal cord roots (L2–S3), through the pelvis, down the thigh and leg to the foot.',
      purpose: 'Control the leg muscles for standing and walking and carry sensation from the legs and feet.',
      how: 'The sciatic nerve leaves the pelvis under the buttock muscles, runs down the back of the thigh and splits above the knee: the tibial nerve continues down the calf to the sole, and the common fibular nerve wraps around the fibula to the front of the leg and top of the foot. The femoral nerve runs down the front of the thigh to the quadriceps.',
      connections: ['spinal-cord', 'glutes', 'hamstrings', 'quadriceps', 'calf-muscles'],
      examples: 'Sciatica – shooting pain down the leg when a disc presses on a nerve root; a "dead leg" or pins and needles after sitting cross-legged.',
      advanced: 'The sciatic nerve (L4–S3) is the largest nerve in the body, up to ~2 cm wide, exiting via the greater sciatic foramen below piriformis. The tibial nerve supplies the posterior compartment and sole (medial/lateral plantar nerves). The common fibular nerve supplies anterior (deep branch – dorsiflexion) and lateral (superficial branch – eversion) compartments; injury at the fibular neck causes foot drop. Femoral nerve (L2–L4) passes lateral to the femoral artery under the inguinal ligament (NAVY: Nerve, Artery, Vein, Y-fronts, lateral to medial).',
      facts: ['The sciatic nerve is the longest and widest nerve in the body – roughly as thick as your thumb at its origin.'],
    },
  },
];

// =========================================================================
// CIRCULATORY
// =========================================================================
const aortaPoints = [[0.012, 1.265, 0.045], [0.008, 1.3, 0.045], [0.003, 1.335, 0.035], [0.008, 1.36, 0.012], [0.02, 1.358, -0.015], [0.026, 1.34, -0.04], [0.026, 1.3, -0.05], [0.024, 1.22, -0.05], [0.02, 1.15, -0.042], [0.015, 1.08, -0.028], [0.008, 1.02, -0.016], [0.0, 0.99, -0.012]];

const circulatoryParts = [
  {
    id: 'heart',
    name: 'Heart',
    system: 'circulatory',
    position: [0.02, 1.235, 0.035],
    explode: [0, 0.15, 0.75],
    anim: { type: 'pulse', amount: 0.06, speed: 1.2 },
    shapes: [
      sph([0.005, -0.005, 0], 0.05, HEART, { scale: [0.9, 1.2, 0.82], rotation: [0.25, 0, 0.55], widthSegments: 32, heightSegments: 24 }),
      sph([-0.02, -0.008, 0.02], 0.035, HEART, { scale: [1, 1.1, 0.8], rotation: [0, 0, 0.4] }),
      sph([-0.035, 0.03, 0.0], 0.028, HEART_D),
      sph([0.02, 0.035, -0.035], 0.025, HEART_D),
      sph([0.03, 0.035, 0.02], 0.012, HEART_D, { scale: [1.3, 0.7, 1] }),
      tube([[-0.012, 0.038, 0.035], [-0.035, 0.012, 0.04], [-0.045, -0.025, 0.028], [-0.03, -0.05, 0.015]], 0.0025, ART),
      tube([[0.0, 0.042, 0.035], [0.012, 0.012, 0.045], [0.025, -0.02, 0.042], [0.035, -0.05, 0.028]], 0.0025, ART),
    ],
    info: {
      what: 'A fist-sized muscular pump with four chambers that pushes blood around the body.',
      location: 'In the middle of the chest between the lungs, slightly to the left, behind the sternum and resting on the diaphragm.',
      purpose: 'Keeps blood moving so every cell receives oxygen and nutrients and waste is carried away.',
      how: 'The right side receives oxygen-poor blood from the body and pumps it to the lungs. The left side receives oxygen-rich blood from the lungs and pumps it to the whole body through the aorta. Each beat starts with an electrical spark in the sinoatrial node: the atria squeeze first, then the ventricles. Four one-way valves keep blood flowing forward – their closing makes the "lub-dub" sound.',
      connections: ['aorta', 'vena-cava', 'pulmonary-vessels', 'right-lung', 'left-lung', 'sternum'],
      examples: 'Feeling your pulse at the wrist, your heart racing when you exercise or are scared, a doctor listening with a stethoscope.',
      advanced: 'Mass ~250–350 g. Resting cardiac output ≈ heart rate (~70 bpm) × stroke volume (~70 mL) ≈ 5 L/min, rising to 20–25 L/min in exercise (up to ~35 in elite athletes). Conduction: SA node (~60–100 bpm intrinsic) → AV node (~0.1 s delay) → bundle of His → bundle branches → Purkinje fibres. Valves: tricuspid and mitral (atrioventricular), pulmonary and aortic (semilunar). LV systolic pressure ~120 mmHg vs RV ~25 mmHg, so the LV wall (~10 mm) is ~3× thicker. Cardiomyocytes are branched, striated, joined by intercalated discs with gap junctions forming a functional syncytium. The coronary arteries (left: LAD + circumflex; right) fill mainly during diastole.',
      facts: ['Your heart beats about 100,000 times a day and around 3 billion times in a lifetime.', 'The heart pumps roughly 7,500 litres of blood every day.'],
    },
  },
  {
    id: 'aorta',
    name: 'Aorta',
    system: 'circulatory',
    position: [0.015, 1.2, -0.02],
    explode: [0, 0.05, 0.35],
    anim: { type: 'flow', speed: 2.4 },
    shapes: at([0.015, 1.2, -0.02], [
      tube(aortaPoints, 0.011, ART, { segments: 80, radialSegments: 12 }),
      tube([[0.0, 1.355, 0.02], [-0.012, 1.38, 0.024], [-0.02, 1.4, 0.025]], 0.006, ART),
      tube([[0.012, 1.12, -0.035], [0.016, 1.11, -0.01], [0.012, 1.108, 0.005]], 0.0035, ART),
      tube([[0.01, 1.09, -0.028], [0.012, 1.07, 0.0], [0.01, 1.0, 0.03]], 0.0035, ART),
      tube([[0.012, 1.035, -0.022], [0.03, 1.035, -0.035], [0.042, 1.033, -0.05]], 0.0038, ART),
      tube([[0.006, 1.025, -0.02], [-0.02, 1.022, -0.03], [-0.042, 1.017, -0.048]], 0.0038, ART),
    ]),
    info: {
      what: 'The largest artery in the body, carrying oxygen-rich blood away from the heart.',
      location: 'Rises from the left ventricle, arches over the heart to the left, then runs down in front of the spine through the chest and abdomen, splitting into the iliac arteries near the navel.',
      purpose: 'Delivers oxygenated blood from the heart to every branch artery that feeds the head, arms, organs and legs.',
      how: 'Each heartbeat pushes blood into the aorta under high pressure. Its elastic wall stretches to absorb the surge and then recoils, smoothing the flow so blood keeps moving between beats. Branches peel off along the way: to the head and arms from the arch, to the gut, kidneys and legs below.',
      connections: ['heart', 'carotid-arteries', 'limb-arteries', 'left-kidney', 'right-kidney'],
      examples: 'An aortic aneurysm is a dangerous ballooning of the aorta; blood pressure readings (e.g. 120/80 mmHg) reflect pressure in the arterial tree fed by the aorta.',
      advanced: 'Diameter ~2.5–3 cm at the root, ~2 cm in the abdomen. Segments: ascending (coronary arteries arise from the aortic sinuses), arch (brachiocephalic, left common carotid, left subclavian), descending thoracic, abdominal (celiac trunk ~T12, superior mesenteric ~L1, renal ~L1–L2, inferior mesenteric ~L3), bifurcating at ~L4. Elastic artery: tunica media with ~50 lamellae of elastin and smooth muscle (lamellar units), producing the Windkessel effect that converts pulsatile ejection into continuous flow. Peak velocity ~1 m/s. Abdominal aortic aneurysm is defined as diameter ≥3 cm.',
      facts: ['The aorta is about as wide as a garden hose.', 'Blood leaves the heart through the aorta at roughly 1 metre per second.'],
    },
  },
  {
    id: 'vena-cava',
    name: 'Venae Cavae (Superior & Inferior)',
    system: 'circulatory',
    position: [-0.02, 1.2, 0.0],
    explode: [0, 0.05, 0.35],
    anim: { type: 'flow', speed: 1.2 },
    shapes: at([-0.02, 1.2, 0.0], [
      tube([[-0.022, 1.37, 0.03], [-0.024, 1.33, 0.033], [-0.02, 1.282, 0.035]], 0.009, VEIN),
      tube([[-0.045, 1.4, 0.025], [-0.032, 1.385, 0.028], [-0.022, 1.37, 0.03]], 0.0065, VEIN),
      tube([[0.045, 1.4, 0.025], [0.02, 1.392, 0.036], [-0.005, 1.38, 0.034], [-0.022, 1.37, 0.03]], 0.0065, VEIN),
      tube([[-0.015, 1.205, 0.028], [-0.02, 1.15, 0.005], [-0.022, 1.08, -0.018], [-0.018, 1.02, -0.018], [-0.012, 0.985, -0.015]], 0.011, VEIN, { segments: 60, radialSegments: 12 }),
      tube([[-0.02, 1.02, -0.02], [-0.03, 1.019, -0.035], [-0.042, 1.018, -0.047]], 0.0045, VEIN),
      tube([[-0.018, 1.03, -0.014], [0.008, 1.033, -0.001], [0.03, 1.035, -0.035], [0.042, 1.035, -0.048]], 0.0045, VEIN),
      tube([[-0.02, 1.14, 0.0], [-0.045, 1.105, 0.01], [-0.07, 1.09, 0.012]], 0.005, VEIN),
    ]),
    info: {
      what: 'The two largest veins: the superior vena cava (from the upper body) and the inferior vena cava (from the lower body). Both empty into the heart.',
      location: 'The superior vena cava runs down the right side of the upper chest; the inferior vena cava runs up the abdomen to the right of the aorta, through the liver and diaphragm.',
      purpose: 'Return oxygen-poor blood from the whole body to the right atrium of the heart.',
      how: 'Veins have low pressure, so blood is helped back by one-way valves in limb veins, by muscle squeezing (the calf pump) and by breathing: when you breathe in, pressure in the chest drops and pulls blood up toward the heart.',
      connections: ['heart', 'jugular-veins', 'limb-veins', 'liver', 'right-kidney', 'left-kidney'],
      examples: 'In late pregnancy, lying flat on the back can squeeze the inferior vena cava and make a person feel faint – so lying on the left side is advised.',
      advanced: 'SVC (~7 cm long, ~2 cm wide) is formed by the right and left brachiocephalic veins (each = internal jugular + subclavian) and receives the azygos vein. IVC (~2.5–3 cm wide) is formed at L5 by the common iliac veins, receives the renal, right gonadal, lumbar and hepatic veins, and pierces the diaphragm at T8 through the central tendon. Central venous pressure is ~2–8 mmHg. Veins hold ~60–70% of total blood volume (capacitance vessels). The left renal vein crosses in front of the aorta beneath the superior mesenteric artery (site of "nutcracker" compression).',
      facts: ['About two-thirds of your blood is in your veins at any moment.'],
    },
  },
  {
    id: 'pulmonary-vessels',
    name: 'Pulmonary Arteries & Veins',
    system: 'circulatory',
    position: [0.01, 1.29, 0.0],
    explode: [0, 0.15, 0.55],
    anim: { type: 'flow', speed: 1.5 },
    shapes: at([0.01, 1.29, 0.0], [
      tube([[0.012, 1.265, 0.075], [0.02, 1.295, 0.06], [0.015, 1.315, 0.035], [0.005, 1.315, 0.015]], 0.009, VEIN),
      tube([[0.005, 1.315, 0.015], [-0.03, 1.305, 0.0], [-0.06, 1.295, -0.01], [-0.075, 1.28, -0.015]], 0.006, VEIN),
      tube([[0.005, 1.315, 0.015], [0.04, 1.31, 0.005], [0.07, 1.3, -0.012], [0.085, 1.285, -0.018]], 0.006, VEIN),
      tube([[-0.065, 1.29, -0.015], [-0.02, 1.278, -0.008], [0.035, 1.272, 0.0]], 0.005, ART),
      tube([[-0.065, 1.24, -0.025], [-0.02, 1.255, -0.015], [0.035, 1.265, -0.002]], 0.005, ART),
      tube([[0.09, 1.29, -0.02], [0.06, 1.28, -0.012], [0.045, 1.272, 0.0]], 0.005, ART),
      tube([[0.09, 1.24, -0.03], [0.06, 1.255, -0.02], [0.045, 1.265, -0.002]], 0.005, ART),
    ]),
    info: {
      what: 'The vessels of the "lung circuit": pulmonary arteries carry oxygen-poor blood (shown blue) from the heart to the lungs, and pulmonary veins bring oxygen-rich blood (shown red) back.',
      location: 'Between the heart and the roots of both lungs, in the middle of the chest.',
      purpose: 'Send blood through the lungs to pick up oxygen and drop off carbon dioxide.',
      how: 'The right ventricle pumps blood into the pulmonary trunk, which splits into left and right pulmonary arteries. These branch down to tiny capillaries around the air sacs, where gases swap. Four pulmonary veins return the refreshed blood to the left atrium.',
      connections: ['heart', 'right-lung', 'left-lung', 'bronchi'],
      examples: 'A pulmonary embolism is a blood clot – often from a leg vein – that lodges in a pulmonary artery.',
      advanced: 'They are the only arteries carrying deoxygenated blood and the only veins carrying oxygenated blood (postnatally). The pulmonary circulation is low-pressure and low-resistance: mean PA pressure ~15 mmHg (pulmonary hypertension: >20 mmHg at rest) despite carrying the entire cardiac output. Hypoxic pulmonary vasoconstriction diverts blood away from poorly ventilated alveoli to match ventilation and perfusion (V/Q ≈ 0.8 overall). Red cells spend ~0.75 s in a pulmonary capillary at rest, while equilibration for O2 takes ~0.25 s.',
      facts: ['These are the only arteries that carry oxygen-poor blood.'],
    },
  },
  {
    id: 'carotid-arteries',
    name: 'Carotid Arteries',
    system: 'circulatory',
    position: [0, 1.48, 0.012],
    explode: [0, 0.2, 0.3],
    anim: { type: 'flow', speed: 2.4 },
    shapes: at([0, 1.48, 0.012], [
      tube([[-0.02, 1.4, 0.025], [-0.025, 1.45, 0.022], [-0.03, 1.52, 0.016], [-0.032, 1.56, 0.008], [-0.026, 1.6, -0.002]], 0.0045, ART),
      tube([[0.008, 1.36, 0.01], [0.015, 1.39, 0.018], [0.022, 1.43, 0.022], [0.028, 1.5, 0.016], [0.032, 1.56, 0.008], [0.026, 1.6, -0.002]], 0.0045, ART),
      ...both((s) => [tube(mxs([[0.032, 1.552, 0.01], [0.042, 1.575, 0.035], [0.05, 1.6, 0.05]], s), 0.003, ART)]),
      { type: 'torus', radius: 0.016, tube: 0.0022, radialSegments: 6, tubularSegments: 28, position: [0, 1.612, 0.0], rotation: [PI / 2, 0, 0], material: ART },
    ]),
    info: {
      what: 'The main arteries of the neck that supply the head and brain.',
      location: 'One on each side of the windpipe in the neck; each splits into internal (brain) and external (face and scalp) branches near the angle of the jaw.',
      purpose: 'Carry oxygen-rich blood to the brain, eyes, face and scalp.',
      how: 'The right carotid arises from the brachiocephalic artery and the left directly from the aortic arch. The internal carotids enter the skull and join with the vertebral arteries in a ring at the base of the brain (the circle of Willis), so if one supply is blocked others can partly compensate.',
      connections: ['aorta', 'cerebrum', 'jugular-veins', 'thyroid'],
      examples: 'Feeling the pulse in your neck beside the windpipe; a narrowed carotid artery can cause a stroke.',
      advanced: 'Common carotid bifurcates at ~C4 (upper border of thyroid cartilage). The carotid sinus (baroreceptors, CN IX) at the bifurcation senses blood pressure; the carotid body senses arterial PO2/PCO2/pH and drives breathing. The internal carotid has no branches in the neck. Carotid endarterectomy is indicated for symptomatic stenosis ≥70%. The brain receives ~750 mL/min; loss of flow causes unconsciousness within ~10 s.',
      facts: ['Pressing on the carotid sinus can slow the heart – a reflex doctors sometimes use deliberately.'],
    },
  },
  {
    id: 'jugular-veins',
    name: 'Jugular Veins',
    system: 'circulatory',
    position: [0, 1.49, 0.008],
    explode: [0, 0.2, 0.3],
    anim: { type: 'flow', speed: 1.2 },
    shapes: at([0, 1.49, 0.008], both((s) => [tube(mxs([[0.04, 1.585, -0.01], [0.042, 1.52, 0.005], [0.043, 1.45, 0.018], [0.045, 1.4, 0.025]], s), 0.0065, VEIN)])),
    info: {
      what: 'The large veins of the neck that drain blood from the brain, face and neck.',
      location: 'On each side of the neck, just outside the carotid arteries, from the skull base down to behind the collarbone.',
      purpose: 'Return oxygen-poor blood from the head to the heart.',
      how: 'Blood from the brain collects in venous sinuses inside the skull and exits as the internal jugular vein. Each joins the subclavian vein from the arm to form a brachiocephalic vein, and the two brachiocephalic veins form the superior vena cava. Gravity helps them drain when you are upright.',
      connections: ['vena-cava', 'carotid-arteries', 'cerebrum'],
      examples: 'Doctors look at how high the jugular venous pulse rises in the neck to judge heart function; central lines are often placed in the internal jugular vein.',
      advanced: 'The internal jugular begins at the jugular foramen as a continuation of the sigmoid sinus and runs in the carotid sheath with the common/internal carotid artery and the vagus nerve (CN X). The jugular venous pressure (JVP) normally lies <3–4 cm above the sternal angle; raised JVP suggests right heart failure or fluid overload. The external jugular vein runs superficially over the sternocleidomastoid.',
      facts: ['The carotid sheath packs artery, vein and vagus nerve together in one tube of connective tissue.'],
    },
  },
  {
    id: 'limb-arteries',
    name: 'Arteries of the Limbs',
    system: 'circulatory',
    position: [0, 0.8, 0.0],
    explode: [0, 0, 0.22],
    anim: { type: 'flow', speed: 2.4 },
    shapes: at([0, 0.8, 0.0], both((s) => [
      tube(armArtery(s), 0.0045, ART, { segments: 90 }),
      tube(radialA(s), 0.003, ART),
      tube(ulnarA(s), 0.003, ART),
      tube(palmArch(s), 0.0022, ART),
      tube(legArtery(s), 0.006, ART, { segments: 90 }),
      tube(postTibA(s), 0.004, ART),
      tube(antTibA(s), 0.0035, ART),
      tube(mxs([[0.08, 0.83, 0.038], [0.1, 0.78, 0.005], [0.11, 0.68, -0.01]], s), 0.0038, ART),
    ])),
    info: {
      what: 'The arteries that carry oxygen-rich blood into the arms and legs: subclavian, brachial, radial and ulnar in the arms; iliac, femoral, popliteal and tibial in the legs.',
      location: 'Arm arteries run from beneath the collarbone, through the armpit and down the inner arm; leg arteries run from the lower abdomen, through the groin, behind the knee and down to the foot.',
      purpose: 'Supply the muscles, bones, skin and nerves of the limbs with oxygen and nutrients.',
      how: 'Arteries have thick, muscular walls that can tighten or relax to control how much blood goes to each area – for example opening wide to feed working leg muscles when you run. They branch into ever-smaller arterioles and finally capillaries.',
      connections: ['aorta', 'limb-veins', 'heart'],
      examples: 'Checking the radial pulse at the wrist, measuring blood pressure with a cuff around the brachial artery, feeling the pulse on top of the foot.',
      advanced: 'Muscular (distributing) arteries: thick tunica media of smooth muscle between internal and external elastic laminae. Arm: subclavian → axillary (from the outer border of rib 1) → brachial (from teres major) → radial + ulnar at the cubital fossa → superficial and deep palmar arches. Leg: common iliac → external iliac → femoral (at the inguinal ligament; deep femoral branch) → popliteal (through the adductor hiatus) → anterior tibial (→ dorsalis pedis) and posterior tibial (behind the medial malleolus). Peripheral arterial disease reduces the ankle–brachial pressure index below 0.9. Arterioles are the main site of vascular resistance.',
      facts: ['If laid end to end, all the blood vessels in an adult would stretch about 100,000 km.'],
    },
  },
  {
    id: 'limb-veins',
    name: 'Veins of the Limbs',
    system: 'circulatory',
    position: [0, 0.8, 0.0],
    explode: [0, 0, 0.3],
    anim: { type: 'flow', speed: 1.2 },
    shapes: at([0, 0.8, 0.0], both((s) => [
      tube(cephalicV(s), 0.0032, VEIN),
      tube(basilicV(s), 0.0035, VEIN),
      tube(subclavV(s), 0.0055, VEIN),
      tube(medCubital(s), 0.0026, VEIN),
      tube(saphenousV(s), 0.0038, VEIN, { segments: 80 }),
      tube(femoralV(s), 0.0062, VEIN, { segments: 80 }),
      tube(iliacV(s), 0.008, VEIN),
    ])),
    info: {
      what: 'The veins that return blood from the arms and legs, both superficial (just under the skin) and deep (beside the arteries).',
      location: 'Arms: cephalic (thumb side), basilic (little-finger side), joined at the elbow by the median cubital vein, draining into the subclavian. Legs: the great saphenous vein along the inner leg and the deep femoral vein, draining into the iliac veins.',
      purpose: 'Carry oxygen-poor blood from the limbs back toward the heart.',
      how: 'Limb veins contain one-way valves. When muscles contract they squeeze the veins, pushing blood upward; the valves stop it falling back down. This "muscle pump" is why walking helps circulation.',
      connections: ['vena-cava', 'limb-arteries', 'calf-muscles'],
      examples: 'Blood tests are usually taken from the median cubital vein at the elbow; varicose veins are leg veins with leaky valves; the great saphenous vein is used for heart bypass grafts.',
      advanced: 'Veins have thin walls with a prominent tunica adventitia and valves formed by intimal folds, most numerous in the legs. The great saphenous vein (longest vein in the body) runs anterior to the medial malleolus and enters the femoral vein at the saphenous opening ~3 cm below the inguinal ligament. Deep vein thrombosis risk follows Virchow’s triad: stasis, endothelial injury and hypercoagulability. Venous pressure in the foot falls from ~90 mmHg standing still to ~25 mmHg while walking thanks to the muscle pump.',
      facts: ['The great saphenous vein, running from foot to groin, is the longest vein in the body.'],
    },
  },
  {
    id: 'spleen',
    name: 'Spleen',
    system: 'circulatory',
    position: [0.115, 1.1, -0.06],
    explode: [0.45, 0, 0.3],
    shapes: [sph([0, 0, 0], 0.045, SPLEEN, { scale: [0.55, 1.1, 0.85], rotation: [0, 0.4, -0.3] })],
    info: {
      what: 'A soft, fist-sized organ that filters the blood and helps fight infection – part of the lymphatic and immune system.',
      location: 'Upper left abdomen, behind the stomach, tucked under the left lower ribs next to the diaphragm.',
      purpose: 'Removes old or damaged red blood cells, recycles their iron, stores platelets and white blood cells, and mounts immune responses to germs in the blood.',
      how: 'Blood flows slowly through a spongy mesh (red pulp) where worn-out red cells, which are stiffer, get trapped and eaten by macrophages. Islands of white pulp contain lymphocytes that recognise bacteria in the blood and make antibodies.',
      connections: ['stomach', 'pancreas', 'left-kidney', 'diaphragm', 'aorta'],
      examples: 'The spleen can rupture in contact sports or car accidents; people can live without it but are more prone to certain infections.',
      advanced: 'Normal size ~12 × 7 × 4 cm, ~150 g, lying along ribs 9–11. Receives ~5% of cardiac output via the splenic artery (from the celiac trunk). Red pulp: splenic cords (of Billroth) and sinusoids – red cells must squeeze through 1–2 µm slits, so rigid or aged cells (~120 days old) are removed. White pulp: periarteriolar lymphoid sheaths (T cells) and follicles (B cells). After splenectomy, vaccination against encapsulated organisms (pneumococcus, Hib, meningococcus) is recommended. Holds ~1/3 of the body’s platelets.',
      facts: ['The spleen filters your entire blood volume many times a day.', 'About a third of your platelets are stored in the spleen.'],
    },
  },
];

// =========================================================================
// RESPIRATORY
// =========================================================================
const AIRWAY = { ...CART, color: '#dcc5bd' };
const TRACH_TILT = 0.185;

const respiratoryParts = [
  {
    id: 'trachea',
    name: 'Larynx & Trachea (Windpipe)',
    system: 'respiratory',
    position: [0, 1.31, -0.005],
    explode: [0, 0.3, 0.45],
    shapes: [
      { type: 'cylinder', radius: 0.0088, height: 0.163, segments: 16, position: [0, 0.08, 0.015], rotation: [TRACH_TILT, 0, 0], material: AIRWAY },
      { type: 'torus', radius: 0.0098, tube: 0.0019, radialSegments: 6, tubularSegments: 20, position: [0, 0.006, 0.0011], rotation: [PI / 2 + TRACH_TILT, 0, 0], array: { count: 16, offset: [0, 0.0098, 0.00184] }, material: CART },
      { type: 'cylinder', radiusTop: 0.017, radiusBottom: 0.013, height: 0.032, segments: 14, position: [0, 0.168, 0.033], material: CART },
      { type: 'cone', radius: 0.007, height: 0.016, segments: 10, position: [0, 0.175, 0.048], rotation: [PI / 2, 0, 0], material: CART },
    ],
    info: {
      what: 'The airway of the neck: the larynx (voice box) on top of the trachea (windpipe), a tube stiffened by C-shaped rings of cartilage.',
      location: 'Front of the neck and upper chest, in front of the esophagus, from the throat down to just behind the top of the heart, where it splits into the two bronchi.',
      purpose: 'Carries air between the throat and the lungs and, at the larynx, produces the voice and protects the airway during swallowing.',
      how: 'The cartilage rings keep the tube open while you breathe in. In the larynx, vocal folds vibrate as air flows past them to make sound. When you swallow, the larynx rises and the epiglottis tips over it so food goes down the esophagus instead. The lining is coated in mucus and tiny hairs (cilia) that sweep dust and germs upward to be coughed or swallowed.',
      connections: ['bronchi', 'esophagus', 'thyroid', 'right-lung', 'left-lung'],
      examples: 'Feeling your "Adam’s apple" (thyroid cartilage) move when you swallow, coughing when something "goes down the wrong way", hoarseness with laryngitis.',
      advanced: 'Trachea: ~10–12 cm long, ~2 cm diameter, 16–20 C-shaped hyaline cartilage rings open posteriorly (bridged by the trachealis muscle), extending from C6 to the carina at ~T4/T5 (sternal angle). Lined by pseudostratified ciliated columnar epithelium with goblet cells (mucociliary escalator, cilia beat ~10–15 Hz). Larynx: thyroid, cricoid and epiglottic cartilages plus paired arytenoids; vocal fold tension is set by cricothyroid (superior laryngeal nerve) and other intrinsic muscles (recurrent laryngeal nerve). Typical speaking fundamental frequency ~100–120 Hz (men) and ~200–220 Hz (women). Emergency airway access is via the cricothyroid membrane.',
      facts: ['Your trachea’s cilia move mucus up toward your throat at about 1 cm per minute.'],
    },
  },
  {
    id: 'bronchi',
    name: 'Bronchi (Bronchial Tree)',
    system: 'respiratory',
    position: [0, 1.29, -0.01],
    explode: [0, 0.22, 0.45],
    shapes: at([0, 1.29, -0.01], [
      tube([[0, 1.312, -0.004], [-0.025, 1.296, -0.008], [-0.045, 1.28, -0.01]], 0.0068, AIRWAY),
      tube([[-0.028, 1.295, -0.008], [-0.06, 1.33, -0.01], [-0.08, 1.37, -0.015]], 0.0045, AIRWAY),
      tube([[-0.045, 1.28, -0.01], [-0.065, 1.255, 0.02], [-0.08, 1.24, 0.035]], 0.0042, AIRWAY),
      tube([[-0.045, 1.28, -0.01], [-0.07, 1.23, -0.03], [-0.085, 1.18, -0.04]], 0.0045, AIRWAY),
      tube([[0, 1.312, -0.004], [0.03, 1.3, -0.01], [0.055, 1.29, -0.015]], 0.0062, AIRWAY),
      tube([[0.055, 1.29, -0.015], [0.08, 1.33, -0.01], [0.095, 1.37, -0.015]], 0.0042, AIRWAY),
      tube([[0.055, 1.29, -0.015], [0.08, 1.23, -0.03], [0.095, 1.18, -0.04]], 0.0042, AIRWAY),
      tube([[-0.07, 1.23, -0.03], [-0.1, 1.21, -0.02], [-0.115, 1.2, -0.01]], 0.0026, AIRWAY),
      tube([[-0.06, 1.33, -0.01], [-0.095, 1.335, 0.01], [-0.11, 1.33, 0.02]], 0.0026, AIRWAY),
      tube([[0.08, 1.23, -0.03], [0.11, 1.21, -0.015], [0.125, 1.2, -0.005]], 0.0026, AIRWAY),
      tube([[0.08, 1.33, -0.01], [0.105, 1.32, 0.012], [0.12, 1.31, 0.02]], 0.0026, AIRWAY),
    ]),
    info: {
      what: 'The branching airways inside the lungs, starting with the left and right main bronchi.',
      location: 'From the bottom of the trachea (behind the top of the heart) into each lung, dividing again and again.',
      purpose: 'Distribute air to every part of both lungs.',
      how: 'Like an upside-down tree, each bronchus divides into smaller branches – lobar, segmental, then tiny bronchioles – about 23 generations in all, ending in clusters of air sacs (alveoli). Smooth muscle in the walls can narrow or widen the airways.',
      connections: ['trachea', 'right-lung', 'left-lung', 'pulmonary-vessels'],
      examples: 'Asthma narrows the bronchioles, causing wheezing; bronchitis is inflammation of the bronchi. Inhaled objects usually lodge in the right bronchus because it is wider and more vertical.',
      advanced: 'Right main bronchus: shorter (~2.5 cm), wider and more vertical (~25° from midline) → 3 lobar bronchi. Left main bronchus: ~5 cm, ~45°, passes under the aortic arch → 2 lobar bronchi. Conducting zone (generations 0–16, anatomical dead space ~150 mL) then respiratory zone (17–23). Cartilage disappears at the bronchiole level (<1 mm); club (Clara) cells replace goblet cells distally. Airway resistance peaks in medium-sized bronchi, not the smallest airways, because of the enormous total cross-section distally. β2-agonists (e.g. salbutamol) relax bronchial smooth muscle.',
      facts: ['The airways branch about 23 times between the trachea and the air sacs.'],
    },
  },
  {
    id: 'right-lung',
    name: 'Right Lung',
    system: 'respiratory',
    position: [-0.078, 1.28, -0.02],
    explode: [-0.38, 0.1, 0.45],
    anim: { type: 'breathe', amount: 0.06, speed: 0.25 },
    shapes: [
      sph([0, 0.06, 0], 0.1, LUNG, { scale: [0.55, 0.8, 0.78], widthSegments: 32, heightSegments: 22 }),
      sph([0.002, -0.02, 0.032], 0.065, LUNG_D, { scale: [0.8, 0.72, 0.65] }),
      sph([0, -0.055, -0.022], 0.1, LUNG, { scale: [0.56, 0.85, 0.76], widthSegments: 32, heightSegments: 22 }),
    ],
    info: {
      what: 'The larger of the two lungs, divided into three lobes (upper, middle and lower).',
      location: 'Right side of the chest, inside the ribcage, from just above the collarbone down to the dome of the diaphragm.',
      purpose: 'Takes oxygen from the air into the blood and removes carbon dioxide from the blood.',
      how: 'Air reaches about 300–500 million tiny air sacs (alveoli). Each is wrapped in capillaries, and the wall between air and blood is thinner than a soap bubble, so oxygen diffuses into the blood and carbon dioxide diffuses out. The lung itself has no muscle: it inflates because the diaphragm and rib muscles enlarge the chest.',
      connections: ['left-lung', 'bronchi', 'pulmonary-vessels', 'diaphragm', 'ribcage', 'heart'],
      examples: 'Taking a deep breath before diving, getting out of breath on a run, pneumonia (infection filling the alveoli with fluid).',
      advanced: 'Total lung capacity ~6 L; tidal volume ~500 mL at ~12–20 breaths/min (minute ventilation ~6–8 L/min); vital capacity ~4.5–5 L; residual volume ~1.2 L. Alveolar surface area ~70 m²; blood–gas barrier ~0.3–0.6 µm (type I pneumocyte, fused basement membrane, capillary endothelium). Type II pneumocytes secrete surfactant (dipalmitoylphosphatidylcholine), lowering surface tension and preventing alveolar collapse (Laplace’s law). Each lung is enclosed by visceral and parietal pleura with a thin film of pleural fluid at ~−5 cmH2O pressure; air entering this space causes pneumothorax. The right lung has horizontal and oblique fissures and 10 bronchopulmonary segments.',
      facts: ['Spread out, the inner surface of your lungs would cover about half a tennis court.', 'The right lung is slightly bigger because the heart takes up room on the left.'],
    },
  },
  {
    id: 'left-lung',
    name: 'Left Lung',
    system: 'respiratory',
    position: [0.088, 1.28, -0.022],
    explode: [0.4, 0.1, 0.45],
    anim: { type: 'breathe', amount: 0.06, speed: 0.25 },
    shapes: [
      sph([0, 0.05, 0.004], 0.1, LUNG, { scale: [0.5, 0.86, 0.75], widthSegments: 32, heightSegments: 22 }),
      sph([0.004, -0.055, -0.024], 0.1, LUNG_D, { scale: [0.52, 0.85, 0.73], widthSegments: 32, heightSegments: 22 }),
    ],
    info: {
      what: 'The smaller lung, with only two lobes (upper and lower) and a notch where the heart sits.',
      location: 'Left side of the chest inside the ribcage, wrapping around the left side of the heart.',
      purpose: 'Exchanges oxygen and carbon dioxide between the air and the blood, working together with the right lung.',
      how: 'When the diaphragm pulls down and the ribs lift, pressure inside the chest falls below air pressure, and air rushes in through the bronchi to fill the alveoli. When the muscles relax, the elastic lung springs back and pushes the air out.',
      connections: ['right-lung', 'bronchi', 'pulmonary-vessels', 'heart', 'diaphragm', 'ribcage'],
      examples: 'Blowing up a balloon, a chest X-ray showing the heart shadow overlapping the left lung.',
      advanced: 'Features the cardiac notch and lingula (a tongue-like part of the upper lobe, homologous to the right middle lobe); 8–10 bronchopulmonary segments; a single oblique fissure. Oxygen uptake at rest ~250 mL/min, CO2 output ~200 mL/min (respiratory quotient ~0.8). Arterial PO2 ~100 mmHg, PCO2 ~40 mmHg. Haemoglobin is ~97–98% saturated leaving the lungs; each gram binds ~1.34 mL O2. Lung compliance ~200 mL/cmH2O; fibrosis lowers it, emphysema raises it.',
      facts: ['The left lung is about 10% smaller than the right to make room for the heart.'],
    },
  },
  {
    id: 'diaphragm',
    name: 'Diaphragm',
    system: 'respiratory',
    position: [0, 1.11, -0.015],
    explode: [0, -0.05, 0.38],
    anim: { type: 'piston', axis: 'y', amplitude: 0.006, speed: 1.57, phase: PI },
    shapes: at([0, 1.11, -0.015], [
      sph([-0.052, 1.115, -0.015], 0.1, DIAPH, { thetaLength: PI / 2, scale: [0.9, 0.45, 0.95], widthSegments: 32, heightSegments: 12 }),
      sph([0.052, 1.105, -0.015], 0.1, DIAPH, { thetaLength: PI / 2, scale: [0.9, 0.45, 0.95], widthSegments: 32, heightSegments: 12 }),
    ]),
    info: {
      what: 'A dome-shaped sheet of muscle that separates the chest from the abdomen – the main muscle of breathing.',
      location: 'Under the lungs and heart, above the liver, stomach and spleen, attached all round the lower ribs, sternum and lumbar spine.',
      purpose: 'Powers breathing in, and helps with coughing, sneezing, vomiting and pushing.',
      how: 'When it contracts, the dome flattens and moves down like a piston, enlarging the chest so air is sucked into the lungs. When it relaxes, it rises back up and air flows out. Hiccups are sudden involuntary twitches of the diaphragm.',
      connections: ['right-lung', 'left-lung', 'heart', 'liver', 'stomach', 'esophagus', 'ribcage'],
      examples: '"Belly breathing" (your belly pushes out as the diaphragm descends), hiccups, singers training breath control.',
      advanced: 'Skeletal muscle with a central tendon (fused with the fibrous pericardium). Openings: IVC at T8 (central tendon), esophagus at T10 (right crus), aorta at T12 (behind the median arcuate ligament) – "I 8 10 eggs at 12". Motor supply: phrenic nerves (C3–C5, "C3, 4, 5 keeps the diaphragm alive"); hence high cervical cord injury requires ventilation. Moves ~1.5 cm in quiet breathing and up to ~10 cm in deep breathing, responsible for ~70–75% of tidal volume at rest. The right dome sits higher because of the liver.',
      facts: ['"C3, 4 and 5 keep the diaphragm alive" – the phrenic nerve comes from those neck segments.', 'Hiccups are spasms of the diaphragm followed by sudden closure of the vocal cords – the "hic".'],
    },
  },
];

// =========================================================================
// DIGESTIVE
// =========================================================================
const ESO = M.organ('#d4877a');
const colonPoints = [[-0.085, 0.885, 0.04], [-0.098, 0.93, 0.032], [-0.1, 1.0, 0.026], [-0.088, 1.042, 0.04], [-0.045, 1.01, 0.07], [0.02, 0.99, 0.074], [0.07, 1.0, 0.062], [0.105, 1.055, 0.022], [0.112, 1.0, 0.018], [0.105, 0.93, 0.025], [0.08, 0.885, 0.05], [0.04, 0.875, 0.055], [0.015, 0.89, 0.02], [0.0, 0.88, -0.035], [0.0, 0.84, -0.045], [0.0, 0.805, -0.03]];

const digestiveParts = [
  {
    id: 'esophagus',
    name: 'Esophagus (Food Pipe)',
    system: 'digestive',
    position: [0.01, 1.3, -0.02],
    explode: [0, 0.15, 0.35],
    shapes: at([0.01, 1.3, -0.02], [
      tube([[0, 1.51, 0.0], [0, 1.45, -0.003], [0.002, 1.38, -0.022], [0.006, 1.3, -0.033], [0.012, 1.22, -0.032], [0.025, 1.16, -0.02], [0.04, 1.135, -0.01], [0.05, 1.128, -0.007]], 0.0078, ESO, { segments: 70 }),
    ]),
    info: {
      what: 'A muscular tube about 25 cm long that carries swallowed food from the throat to the stomach.',
      location: 'Behind the trachea and heart, in front of the spine, passing through the diaphragm into the stomach.',
      purpose: 'Moves food and drink down to the stomach and stops stomach contents coming back up.',
      how: 'After you swallow, waves of muscle contraction (peristalsis) squeeze the food along – it works even upside down. At the bottom, a ring of muscle (the lower oesophageal sphincter) opens to let food in and then closes.',
      connections: ['stomach', 'trachea', 'diaphragm', 'mandible'],
      examples: 'Heartburn happens when stomach acid leaks back up through a weak lower sphincter (reflux).',
      advanced: 'Lined by non-keratinised stratified squamous epithelium; muscularis is skeletal in the upper third, mixed in the middle and smooth in the lower third. Peristaltic waves travel ~3–4 cm/s, so a bolus takes ~5–10 s to reach the stomach. The lower oesophageal sphincter maintains ~10–30 mmHg resting pressure. Chronic reflux can cause Barrett’s oesophagus – metaplasia to intestinal-type columnar epithelium, a precursor of adenocarcinoma. Three anatomical constrictions: cricopharyngeus, crossing of the aortic arch/left bronchus, and the diaphragmatic hiatus.',
      facts: ['You can swallow while standing on your head – peristalsis does not need gravity.'],
    },
  },
  {
    id: 'stomach',
    name: 'Stomach',
    system: 'digestive',
    position: [0.055, 1.09, 0.03],
    explode: [0.32, 0, 0.65],
    shapes: at([0.055, 1.09, 0.03], [
      sph([0.08, 1.11, 0.0], 0.034, STOMACH),
      sph([0.046, 1.128, -0.007], 0.022, STOMACH),
      tube([[0.046, 1.128, -0.007], [0.075, 1.13, -0.002], [0.1, 1.105, 0.015], [0.095, 1.07, 0.04], [0.065, 1.047, 0.058], [0.035, 1.05, 0.062]], 0.03, STOMACH, { radialSegments: 16, segments: 48 }),
      tube([[0.04, 1.049, 0.062], [0.01, 1.057, 0.057], [-0.012, 1.064, 0.047]], 0.017, STOMACH, { radialSegments: 14 }),
      sph([0.035, 1.05, 0.062], 0.03, STOMACH),
      sph([-0.012, 1.064, 0.047], 0.0125, STOMACH),
    ]),
    info: {
      what: 'A J-shaped, stretchy muscular bag where food is stored, churned and partly digested.',
      location: 'Upper left abdomen, just below the diaphragm and partly under the left ribs, between the esophagus and the small intestine.',
      purpose: 'Holds a meal, mixes it with acid and enzymes to start digesting protein and kill germs, and releases it slowly into the small intestine.',
      how: 'Three layers of muscle churn food into a soupy mix called chyme. Glands in the lining release hydrochloric acid and the enzyme pepsin. A thick layer of mucus protects the stomach from digesting itself. The pyloric sphincter at the exit lets out a little chyme at a time.',
      connections: ['esophagus', 'small-intestine', 'liver', 'pancreas', 'spleen', 'diaphragm'],
      examples: 'A rumbling stomach, feeling full after a big meal, stomach ulcers (often caused by Helicobacter pylori bacteria or anti-inflammatory drugs).',
      advanced: 'Regions: cardia, fundus, body, antrum, pylorus. Empty volume ~50 mL, can expand to 1–1.5 L (receptive relaxation via the vagus). Gastric glands: parietal cells secrete HCl (pH 1.5–3.5) via the H+/K+-ATPase and intrinsic factor (needed for vitamin B12 absorption); chief cells secrete pepsinogen; G cells (antrum) secrete gastrin; D cells secrete somatostatin. ~1.5–2 L of gastric juice per day. Gastric emptying of a mixed meal takes ~2–4 h; liquids leave fastest, fats slowest. Proton-pump inhibitors block the H+/K+-ATPase.',
      facts: ['Stomach acid is strong enough to dissolve some metals, yet the lining is replaced every few days.', 'An empty stomach is about the size of a fist.'],
    },
  },
  {
    id: 'liver',
    name: 'Liver',
    system: 'digestive',
    position: [-0.035, 1.085, 0.005],
    explode: [-0.32, 0.02, 0.6],
    shapes: at([-0.035, 1.085, 0.005], [
      { type: 'organic', radius: 0.1, noise: 0.015, frequency: 4, detail: 10, position: [-0.045, 1.085, 0.005], scale: [0.95, 0.5, 0.7], rotation: [0, 0, -0.15], material: LIVER },
      sph([0.035, 1.1, 0.03], 0.045, LIVER, { scale: [1.2, 0.45, 0.75], rotation: [0, 0, 0.15] }),
    ]),
    info: {
      what: 'The largest internal organ and the body’s chemical factory – a heavy, wedge-shaped organ.',
      location: 'Upper right abdomen, under the diaphragm and protected by the lower right ribs, extending across to the left side.',
      purpose: 'Processes nutrients from digestion, makes bile to digest fats, stores energy and vitamins, makes blood proteins and clotting factors, and breaks down toxins, drugs and alcohol.',
      how: 'All the blood from the stomach and intestines flows to the liver first through the portal vein, so it can sort and process what was absorbed. Millions of liver cells (hepatocytes) store sugar as glycogen, convert ammonia into urea, and make bile, which drains to the gallbladder.',
      connections: ['gallbladder', 'stomach', 'small-intestine', 'vena-cava', 'diaphragm', 'pancreas'],
      examples: 'Jaundice (yellow skin) when bilirubin builds up, damage from heavy drinking (cirrhosis), the liver breaking down paracetamol and caffeine.',
      advanced: 'Mass ~1.4–1.6 kg. Dual blood supply: portal vein (~75%, nutrient-rich, partly deoxygenated) and hepatic artery (~25%), total ~1.5 L/min (~25% of cardiac output). Functional unit: the hexagonal lobule with portal triads (portal vein, hepatic artery, bile duct) at the corners and a central vein; blood flows through sinusoids lined by fenestrated endothelium and Kupffer cells. Zone 3 (perivenular) hepatocytes are rich in CYP450 and most sensitive to hypoxia and paracetamol toxicity. Produces albumin (~12 g/day), clotting factors II, VII, IX, X (vitamin-K-dependent), ~500–1000 mL bile/day. Couinaud classification divides it into 8 surgical segments.',
      facts: ['The liver can regrow to full size even after up to two-thirds of it is removed.', 'It performs over 500 different functions.'],
    },
  },
  {
    id: 'gallbladder',
    name: 'Gallbladder',
    system: 'digestive',
    position: [-0.057, 1.045, 0.07],
    explode: [-0.22, -0.05, 0.75],
    shapes: at([-0.057, 1.045, 0.07], [
      seg([-0.06, 1.058, 0.058], [-0.054, 1.026, 0.08], 0.012, GALL),
      tube([[-0.058, 1.062, 0.05], [-0.045, 1.05, 0.04], [-0.042, 1.035, 0.033]], 0.0022, GALL),
    ]),
    info: {
      what: 'A small, pear-shaped sac that stores and concentrates bile.',
      location: 'Tucked under the right lobe of the liver, at the lower edge of the right ribs.',
      purpose: 'Stores bile made by the liver and squeezes it into the small intestine when you eat fatty food.',
      how: 'Between meals, bile flows from the liver into the gallbladder, which removes water to concentrate it. After a meal, the hormone CCK makes the gallbladder contract, sending bile down the bile duct into the duodenum, where it breaks fat into tiny droplets (like washing-up liquid on grease).',
      connections: ['liver', 'small-intestine', 'pancreas'],
      examples: 'Gallstones can block the bile duct and cause sharp pain after a fatty meal; the gallbladder is often removed by keyhole surgery.',
      advanced: 'Capacity ~30–50 mL; concentrates bile 5–10-fold by active Na+ and Cl− absorption. Bile = bile salts (conjugated cholic and chenodeoxycholic acids), phospholipids, cholesterol, bilirubin and bicarbonate. Bile salts are ~95% reabsorbed in the terminal ileum and recycled (enterohepatic circulation, 6–10 cycles/day). Cholecystokinin from duodenal I cells triggers contraction and relaxation of the sphincter of Oddi. Most gallstones are cholesterol stones. Murphy’s sign suggests cholecystitis.',
      facts: ['You can live normally without a gallbladder – bile then trickles continuously into the intestine.'],
    },
  },
  {
    id: 'pancreas',
    name: 'Pancreas',
    system: 'digestive',
    position: [0.04, 1.04, -0.005],
    explode: [0, -0.05, 0.5],
    shapes: at([0.04, 1.04, -0.005], [
      sph([-0.033, 1.015, 0.016], 0.017, PANC, { scale: [1, 1.1, 0.8] }),
      tube([[-0.03, 1.02, 0.012], [0.02, 1.035, -0.004], [0.07, 1.05, -0.02], [0.1, 1.065, -0.035], [0.115, 1.08, -0.05]], 0.011, PANC, { radialSegments: 12 }),
    ]),
    info: {
      what: 'A long, soft gland that makes digestive enzymes and the hormones insulin and glucagon.',
      location: 'Deep in the upper abdomen, behind the stomach, with its head cradled by the C-shaped duodenum and its tail reaching the spleen.',
      purpose: 'Sends powerful digestive juice into the small intestine and controls blood sugar.',
      how: 'Most of the pancreas makes enzymes that digest proteins, fats and carbohydrates, plus bicarbonate to neutralise stomach acid; these flow down the pancreatic duct into the duodenum. Scattered islands of cells (islets of Langerhans) release insulin when blood sugar is high and glucagon when it is low.',
      connections: ['small-intestine', 'stomach', 'gallbladder', 'spleen', 'liver'],
      examples: 'Type 1 diabetes – the immune system destroys the insulin-making cells; pancreatitis – enzymes activate too early and damage the pancreas.',
      advanced: 'Exocrine (~98% of mass): acinar cells secrete ~1.5 L/day of juice containing trypsinogen, chymotrypsinogen, lipase, amylase and nucleases; duct cells secrete HCO3− (stimulated by secretin). Trypsinogen is activated by enteropeptidase in the duodenum, then activates the other zymogens. Endocrine (~1–2%): ~1 million islets – β cells (insulin, ~60–70%), α cells (glucagon), δ cells (somatostatin), PP cells. The main duct joins the common bile duct at the ampulla of Vater (sphincter of Oddi). Normal fasting glucose ~4–5.5 mmol/L.',
      facts: ['The pancreas has about a million islets of Langerhans, but they make up only 1–2% of its mass.'],
    },
  },
  {
    id: 'small-intestine',
    name: 'Small Intestine',
    system: 'digestive',
    position: [0, 0.94, 0.045],
    explode: [0, -0.18, 0.75],
    shapes: at([0, 0.94, 0.045], [
      tube(smallIntestinePoints(), 0.0105, GUT, { segments: 520, radialSegments: 10 }),
    ]),
    info: {
      what: 'A long, coiled tube – about 6 metres – where most digestion and nutrient absorption happens. It has three parts: duodenum, jejunum and ileum.',
      location: 'Fills the middle and lower abdomen, framed by the large intestine.',
      purpose: 'Finishes breaking down food and absorbs nutrients – sugars, amino acids, fats, vitamins, minerals and most of the water – into the blood.',
      how: 'Bile and pancreatic juice enter at the duodenum. The lining is folded and covered in millions of finger-like villi, each covered in microvilli, giving an enormous surface for absorption. Muscle waves push food along over several hours. Absorbed nutrients pass into tiny blood vessels and travel to the liver.',
      connections: ['stomach', 'large-intestine', 'pancreas', 'gallbladder', 'liver'],
      examples: 'Coeliac disease (gluten damages the villi), lactose intolerance (missing the enzyme lactase), the gurgling sounds a doctor hears with a stethoscope.',
      advanced: 'Length ~6–7 m in life; duodenum ~25 cm, jejunum ~2.5 m, ileum ~3.5 m. Surface amplification by plicae circulares (×3), villi (×10) and microvilli (×20) gives ~30 m² (older estimates of ~250 m² are now considered too high). Enterocytes absorb monosaccharides via SGLT1/GLUT5/GLUT2, peptides via PepT1, and fats as micelles that are re-esterified and exported in chylomicrons via lacteals (lymph). Vitamin B12 and bile salts are absorbed in the terminal ileum. Crypt stem cells renew the epithelium every ~3–5 days. Transit time ~3–5 h.',
      facts: ['The lining of your gut is renewed every 3–5 days.', 'The small intestine is "small" in width, not length – it is several times longer than the large intestine.'],
    },
  },
  {
    id: 'large-intestine',
    name: 'Large Intestine (Colon & Rectum)',
    system: 'digestive',
    position: [0, 0.95, 0.02],
    explode: [0, -0.1, 0.55],
    shapes: at([0, 0.95, 0.02], [
      tube(colonPoints, 0.018, COLON, { segments: 220, radialSegments: 14 }),
      sph([-0.085, 0.885, 0.04], 0.024, COLON),
      tube([[-0.08, 0.872, 0.048], [-0.07, 0.852, 0.052], [-0.058, 0.856, 0.06]], 0.0038, COLON),
    ]),
    info: {
      what: 'The wide, final section of the gut, about 1.5 metres long: caecum (with the appendix), colon and rectum.',
      location: 'Frames the small intestine: up the right side (ascending colon), across the top (transverse colon), down the left side (descending colon), then an S-bend (sigmoid) into the rectum in the pelvis.',
      purpose: 'Absorbs water and salts, houses trillions of helpful bacteria, and forms and stores faeces until they leave the body.',
      how: 'Liquid leftovers arrive from the small intestine. As slow muscle movements push them around the colon, water is absorbed and the contents become solid. Gut bacteria ferment fibre, producing vitamins (like vitamin K) and gases. The rectum stretches as it fills, triggering the urge to go to the toilet.',
      connections: ['small-intestine', 'pelvis', 'bladder'],
      examples: 'Constipation and diarrhoea (too much or too little water absorbed), appendicitis, colonoscopy screening for colon cancer.',
      advanced: 'Receives ~1.5 L/day of chyme and absorbs ~1.35 L, leaving ~100–200 mL water in stool; can absorb up to ~5 L/day. Taeniae coli (three longitudinal muscle bands) cause sacculations called haustra. Mucosa has crypts with many goblet cells but no villi. Microbiota: ~10^13–10^14 bacteria (roughly equal to the number of human cells), mainly Bacteroidetes and Firmicutes, producing short-chain fatty acids (butyrate is the main fuel of colonocytes). Mass movements occur a few times daily, often after meals (gastrocolic reflex). Ascending and descending colon are retroperitoneal; transverse and sigmoid have a mesentery.',
      facts: ['Your colon holds roughly as many bacterial cells as there are human cells in your whole body.'],
    },
  },
];

// =========================================================================
// URINARY & ENDOCRINE
// =========================================================================
const kidneyShapes = (s) => [
  sph([0, 0, 0], 0.05, KIDNEY, { scale: [0.55, 1.15, 0.6], rotation: [0, 0, s * 0.2] }),
  sph([s * -0.02, -0.004, 0.004], 0.011, URINE, { scale: [1, 1.3, 0.8] }),
];
const ureter = (s, ky) => tube(mxs([[0.042, ky - 0.01, -0.05], [0.044, 0.97, -0.042], [0.047, 0.93, -0.035], [0.05, 0.89, -0.02], [0.04, 0.865, 0.012], [0.02, 0.86, 0.032]], s), 0.0032, URINE, { segments: 60 });

const urinaryParts = [
  {
    id: 'right-kidney',
    name: 'Right Kidney',
    system: 'urinary',
    position: [-0.065, 1.015, -0.055],
    explode: [-0.4, 0, 0.2],
    shapes: kidneyShapes(-1),
    info: {
      what: 'One of two bean-shaped organs that filter the blood and make urine.',
      location: 'Back of the upper abdomen on the right, beside the spine at about the level of the lowest ribs. It sits a little lower than the left kidney because the liver is above it.',
      purpose: 'Cleans waste and excess water and salt out of the blood, keeps the blood’s chemistry and pressure balanced, and makes hormones.',
      how: 'Blood enters through the renal artery and passes through about a million tiny filters called nephrons. Each nephron squeezes fluid out of the blood in a knot of capillaries (the glomerulus), then reabsorbs everything useful – water, sugar, salts – along its tubule. What is left becomes urine, which collects in the renal pelvis and drains down the ureter.',
      connections: ['left-kidney', 'ureters', 'aorta', 'vena-cava', 'adrenal-glands', 'liver'],
      examples: 'Kidney stones, dialysis when the kidneys fail, kidney transplants from living donors (you can live well with one kidney).',
      advanced: 'Each kidney ~11 × 6 × 3 cm, ~150 g, with ~1 million nephrons. Renal blood flow ~1.1–1.2 L/min (~20–25% of cardiac output). Glomerular filtration rate ~125 mL/min (~180 L/day), of which ~99% is reabsorbed, leaving ~1.5 L urine/day. Proximal tubule reabsorbs ~65% of filtered Na+ and water and all glucose (until the ~10 mmol/L threshold); the loop of Henle creates the medullary osmotic gradient (countercurrent multiplier, up to ~1200 mOsm/kg); ADH inserts aquaporin-2 in collecting ducts. Endocrine roles: renin (juxtaglomerular cells), erythropoietin and calcitriol (1α-hydroxylase).',
      facts: ['Your kidneys filter about 180 litres of fluid a day – and return all but about 1.5 L to the blood.'],
    },
  },
  {
    id: 'left-kidney',
    name: 'Left Kidney',
    system: 'urinary',
    position: [0.065, 1.03, -0.055],
    explode: [0.4, 0, 0.2],
    shapes: kidneyShapes(1),
    info: {
      what: 'The left of the two kidneys – a blood filter about the size of a fist.',
      location: 'Back of the upper abdomen on the left, beside the spine, slightly higher than the right kidney, behind the stomach, pancreas and spleen.',
      purpose: 'Filters the blood, controls fluid and salt balance, blood pressure and acidity, and makes hormones that stimulate red blood cell production and activate vitamin D.',
      how: 'If blood pressure falls, the kidney releases renin, which triggers a hormone chain (angiotensin, aldosterone) that makes the body hold on to salt and water and narrows blood vessels. If oxygen in the blood is low, it releases erythropoietin to make more red cells.',
      connections: ['right-kidney', 'ureters', 'aorta', 'vena-cava', 'adrenal-glands', 'spleen'],
      examples: 'Blood tests for creatinine check kidney function; people with kidney failure may need EPO injections for anaemia.',
      advanced: 'Layers: cortex (glomeruli, convoluted tubules) and medulla (8–18 pyramids with loops of Henle and collecting ducts) draining via minor and major calyces to the renal pelvis. ~85% of nephrons are cortical, ~15% juxtamedullary with long loops. Autoregulation (myogenic response and tubuloglomerular feedback via the macula densa) keeps GFR stable between mean arterial pressures of ~80–180 mmHg. The left renal vein is longer than the right and crosses anterior to the aorta, making the left kidney the usual choice for living donation.',
      facts: ['Surgeons usually take the left kidney from living donors because its vein is longer.'],
    },
  },
  {
    id: 'ureters',
    name: 'Ureters',
    system: 'urinary',
    position: [0, 0.94, -0.02],
    explode: [0, -0.05, 0.25],
    shapes: at([0, 0.94, -0.02], [ureter(-1, 1.015), ureter(1, 1.03)]),
    info: {
      what: 'Two thin muscular tubes, each about 25–30 cm long, that carry urine from the kidneys to the bladder.',
      location: 'From the inner side of each kidney, down the back wall of the abdomen alongside the spine, into the pelvis and into the back of the bladder.',
      purpose: 'Transport urine continuously from the kidneys to the bladder.',
      how: 'Urine does not just fall down: waves of muscle contraction push it along a few times a minute. Where the ureters enter the bladder they run at a slant through its wall, forming a valve that stops urine flowing back up when the bladder squeezes.',
      connections: ['right-kidney', 'left-kidney', 'bladder'],
      examples: 'Kidney stones often get stuck in a ureter, causing severe "renal colic" pain that comes in waves.',
      advanced: 'Diameter ~3–4 mm; lined by urothelium (transitional epithelium) with inner longitudinal and outer circular smooth muscle (plus an extra outer longitudinal layer distally). Peristalsis 1–5 times/min, originating from pacemaker cells in the renal pelvis. Three physiological narrowings where stones lodge: pelviureteric junction, crossing of the iliac vessels at the pelvic brim, and vesicoureteric junction. In the pelvis the uterine artery (female) or ductus deferens (male) crosses over the ureter – "water under the bridge".',
      facts: ['Urine reaches the bladder in little squirts, a few per minute, pushed by peristalsis.'],
    },
  },
  {
    id: 'bladder',
    name: 'Urinary Bladder',
    system: 'urinary',
    position: [0, 0.865, 0.04],
    explode: [0, -0.22, 0.45],
    shapes: [
      sph([0, 0, 0], 0.032, BLADDER, { scale: [1.1, 0.85, 0.95] }),
      tube([[0, -0.025, 0.002], [0, -0.045, 0.01], [0, -0.065, 0.015]], 0.003, BLADDER),
    ],
    info: {
      what: 'A hollow, stretchy muscular bag that stores urine.',
      location: 'Low in the pelvis, just behind the pubic bone.',
      purpose: 'Stores urine until it is convenient to empty it, then squeezes it out through the urethra.',
      how: 'Its wall unfolds and stretches as it fills. Stretch sensors send signals to the spinal cord and brain, giving you the urge to go. When you decide to urinate, the bladder muscle contracts and the sphincter muscles relax.',
      connections: ['ureters', 'pelvis', 'large-intestine', 'spinal-cord'],
      examples: 'Needing the toilet after drinking a lot, urinary tract infections (cystitis), pelvic-floor exercises to improve bladder control.',
      advanced: 'Capacity ~400–600 mL; first urge at ~150–250 mL. Wall: urothelium with umbrella cells and uroplakin plaques (impermeable barrier), and the detrusor smooth muscle. The trigone is a smooth triangle between the two ureteric orifices and the internal urethral orifice. Micturition: parasympathetic pelvic splanchnic nerves (S2–S4, muscarinic M3) contract the detrusor; sympathetic (T10–L2, β3) relaxes it and contracts the internal sphincter; the external sphincter is skeletal (pudendal nerve). Coordinated by the pontine micturition centre.',
      facts: ['A healthy bladder can comfortably hold about 400–600 mL – roughly a large glass and a half.'],
    },
  },
];

const endocrineParts = [
  {
    id: 'thyroid',
    name: 'Thyroid Gland',
    system: 'endocrine',
    position: [0, 1.44, 0.03],
    explode: [0, 0.22, 0.5],
    shapes: [
      ...both((s) => [sph([s * 0.016, 0, 0], 0.011, GLAND, { scale: [0.75, 1.8, 0.8] })]),
      { type: 'box', size: [0.022, 0.008, 0.006], radius: 0.002, position: [0, -0.008, 0.007], material: GLAND },
    ],
    info: {
      what: 'A butterfly-shaped hormone gland in the neck.',
      location: 'Front of the neck, wrapped around the trachea just below the Adam’s apple.',
      purpose: 'Sets the body’s metabolic rate – how fast cells use energy – and influences heart rate, body temperature, growth and brain development.',
      how: 'It takes iodine from food and uses it to make the hormones T4 and T3, which travel in the blood to almost every cell. The pituitary gland in the brain controls how much is released using thyroid-stimulating hormone (TSH), like a thermostat.',
      connections: ['trachea', 'carotid-arteries', 'brainstem'],
      examples: 'An overactive thyroid causes weight loss, a fast heart and anxiety; an underactive one causes tiredness and feeling cold. Iodised salt prevents goitre (an enlarged thyroid).',
      advanced: 'Mass ~15–25 g; two lobes joined by an isthmus over tracheal rings 2–4. Follicular cells take up iodide via the Na+/I− symporter, and thyroid peroxidase iodinates tyrosines on thyroglobulin stored as colloid. Secretes mainly T4 (~90%); T4 is converted to the more active T3 peripherally by deiodinases. Hypothalamic TRH → pituitary TSH → T3/T4 with negative feedback. Parafollicular C cells secrete calcitonin. The recurrent laryngeal nerves run close behind it, at risk during thyroidectomy (hoarse voice). Four parathyroid glands sit on its posterior surface and control calcium.',
      facts: ['The thyroid is one of the largest purely endocrine glands in the body.', 'Iodised salt was introduced to prevent thyroid enlargement (goitre).'],
    },
  },
  {
    id: 'adrenal-glands',
    name: 'Adrenal Glands',
    system: 'endocrine',
    position: [0, 1.085, -0.056],
    explode: [0, 0.14, 0.22],
    shapes: [
      { type: 'cone', radius: 0.013, height: 0.02, segments: 12, position: [-0.06, -0.007, 0], scale: [1, 1, 0.45], material: ADRENAL },
      { type: 'cone', radius: 0.013, height: 0.02, segments: 12, position: [0.06, 0.008, 0], scale: [1, 1, 0.45], material: ADRENAL },
    ],
    info: {
      what: 'Two small triangular hormone glands, one perched on top of each kidney.',
      location: 'On the upper pole of each kidney, at the back of the abdomen.',
      purpose: 'Release hormones that manage stress, blood pressure, salt balance and energy use – including adrenaline and cortisol.',
      how: 'The outer layer (cortex) makes steroid hormones: aldosterone (keeps salt and water), cortisol (raises blood sugar, controls inflammation and stress response) and some sex hormones. The inner core (medulla) is part of the nervous system: when you are frightened, nerves trigger it to flood the blood with adrenaline – the "fight or flight" response.',
      connections: ['right-kidney', 'left-kidney', 'aorta', 'spinal-cord'],
      examples: 'The racing heart and sweaty palms before an exam, an EpiPen (adrenaline injection) for severe allergic reactions.',
      advanced: 'Each ~4–5 g. Cortex zones ("GFR – salt, sugar, sex"): zona glomerulosa (aldosterone, regulated by angiotensin II and K+), zona fasciculata (cortisol, regulated by ACTH), zona reticularis (DHEA, androgens). Cortisol has a diurnal rhythm peaking around waking. Medulla: chromaffin cells (modified postganglionic sympathetic neurons) secrete ~80% adrenaline, ~20% noradrenaline, innervated by preganglionic sympathetic fibres (acetylcholine). Disorders: Cushing’s (excess cortisol), Addison’s (primary adrenal insufficiency), Conn’s (primary hyperaldosteronism), phaeochromocytoma.',
      facts: ['Adrenaline acts within seconds – faster than almost any other hormone.'],
    },
  },
];

// =========================================================================
// MODEL
// =========================================================================
export default {
  id: 'human',
  name: 'Human Body',
  category: 'human',
  tagline: 'Peel back skin, muscle and bone to see how the body’s systems work together.',
  description:
    'A full-body anatomical model of an adult standing in the anatomical position. Explore the skeleton, muscles, brain and nerves, heart and blood vessels, lungs, digestive organs and kidneys – then explode the layers apart or follow guided tours of the heartbeat, breathing, digestion and more.',
  camera: { position: [0, 1.1, 3.6], target: [0, 1.0, 0] },
  explodeScale: 1,
  systems: [
    { id: 'integumentary', name: 'Skin', color: '#e8b89a' },
    { id: 'muscular', name: 'Muscles', color: '#c0392b' },
    { id: 'skeletal', name: 'Skeleton', color: '#e6dcc3' },
    { id: 'nervous', name: 'Nervous System', color: '#f5d76e' },
    { id: 'circulatory', name: 'Heart & Blood Vessels', color: '#d0202f' },
    { id: 'respiratory', name: 'Respiratory System', color: '#e7a1a0' },
    { id: 'digestive', name: 'Digestive System', color: '#d98a5e' },
    { id: 'urinary', name: 'Urinary System', color: '#e0c070' },
    { id: 'endocrine', name: 'Endocrine Glands', color: '#c9663f' },
  ],
  layers: [
    { id: 'skin', name: 'Skin', systems: ['integumentary'] },
    { id: 'muscles', name: 'Muscles', systems: ['muscular', 'skeletal'] },
    { id: 'skeleton', name: 'Skeleton', systems: ['skeletal'] },
    { id: 'organs', name: 'Organs', systems: ['circulatory', 'respiratory', 'digestive', 'urinary', 'endocrine'] },
    { id: 'nervous', name: 'Nervous', systems: ['nervous'] },
    { id: 'vessels', name: 'Vessels', systems: ['circulatory'] },
  ],
  parts: [
    ...skinParts,
    ...muscleParts,
    ...skeletonParts,
    ...nervousParts,
    ...circulatoryParts,
    ...respiratoryParts,
    ...digestiveParts,
    ...urinaryParts,
    ...endocrineParts,
  ],
  steps: [
    {
      title: 'Layers of the body',
      text: 'The body is built in layers. Skin wraps everything; under it lie muscles, then the skeleton that protects the organs. The ribcage shields the heart and lungs, the skull shields the brain, and the pelvis cradles the bladder and lower gut.',
      focus: ['skin-torso', 'ribcage', 'skull', 'pelvis', 'heart'],
      explode: 0,
      animate: false,
    },
    {
      title: 'The heartbeat',
      text: 'An electrical spark from the sinoatrial node makes the atria squeeze blood into the ventricles. A split second later the ventricles contract: the right side pumps blood to the lungs through the pulmonary arteries, the left side pumps it into the aorta. Valves snap shut to stop backflow – "lub-dub" – about 70 times a minute, moving ~5 litres of blood every minute.',
      focus: ['heart', 'aorta', 'vena-cava', 'pulmonary-vessels'],
      explode: 0.35,
      animate: true,
    },
    {
      title: 'Blood circulation',
      text: 'Oxygen-rich blood (red) leaves the heart through the aorta and branches into arteries to the head, arms, organs and legs, ending in microscopic capillaries where oxygen and nutrients pass into the tissues. Oxygen-poor blood (blue) returns through veins – helped by muscle pumps and one-way valves – into the venae cavae and back to the heart. A full lap takes about a minute.',
      focus: ['heart', 'aorta', 'carotid-arteries', 'limb-arteries', 'limb-veins', 'jugular-veins', 'vena-cava'],
      explode: 0,
      animate: true,
    },
    {
      title: 'Breathing',
      text: 'The diaphragm contracts and flattens while the rib muscles lift the ribcage. The chest gets bigger, pressure inside falls, and air rushes in through the trachea and bronchi to ~500 million alveoli, where oxygen enters the blood and carbon dioxide leaves. Then the diaphragm relaxes, the elastic lungs recoil and air flows out – about 12–20 times a minute.',
      focus: ['diaphragm', 'right-lung', 'left-lung', 'trachea', 'bronchi', 'ribcage'],
      explode: 0.3,
      animate: true,
    },
    {
      title: 'Digestion journey',
      text: 'Food is chewed and swallowed, then pushed down the esophagus by muscle waves. The stomach churns it with acid for a few hours. In the small intestine, bile from the liver and gallbladder and enzymes from the pancreas break it into molecules small enough to absorb. The large intestine reclaims water, and what is left is stored in the rectum. The whole trip takes roughly 1–3 days.',
      focus: ['esophagus', 'stomach', 'liver', 'gallbladder', 'pancreas', 'small-intestine', 'large-intestine'],
      explode: 0.5,
      animate: true,
    },
    {
      title: 'Filtering blood (kidneys)',
      text: 'The aorta sends about a fifth of every heartbeat to the kidneys. A million nephrons in each kidney filter ~180 litres of fluid a day, reclaim almost all of it, and leave ~1.5 litres of urine containing waste such as urea. Cleaned blood returns through the renal veins to the inferior vena cava, and urine trickles down the ureters to the bladder.',
      focus: ['right-kidney', 'left-kidney', 'ureters', 'bladder', 'aorta', 'vena-cava', 'adrenal-glands'],
      explode: 0.4,
      animate: true,
    },
    {
      title: 'Nerve signals',
      text: 'Touch a hot pan: receptors in the skin fire electrical impulses along sensory nerves to the spinal cord. A reflex circuit there instantly sends a command back out along motor nerves to pull your hand away. Meanwhile the signal continues up through the brainstem to the cerebrum, where you become aware of the pain, and the cerebellum fine-tunes the movement.',
      focus: ['cerebrum', 'cerebellum', 'brainstem', 'spinal-cord', 'arm-nerves', 'leg-nerves'],
      explode: 0.3,
      animate: true,
    },
    {
      title: 'Muscles move bones',
      text: 'Muscles can only pull, so they work in opposing pairs across joints. The biceps bends the elbow while the triceps straightens it; the hamstrings bend the knee and the quadriceps straighten it. Tendons transmit the pull to the bones, which act as levers around the joints.',
      focus: ['biceps', 'triceps', 'humeri', 'forearm-bones', 'quadriceps', 'hamstrings', 'femurs', 'tibia-fibula'],
      explode: 0.2,
      animate: false,
    },
  ],
};
