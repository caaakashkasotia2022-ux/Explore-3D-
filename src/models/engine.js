import { M } from '../three/materials.js';

/*
 * Inline-4 DOHC 16-valve petrol engine (≈2.0 L class: 86 mm bore × 86 mm stroke).
 * Cylinders run along X (cylinder 1 at -X / flywheel end, timing drive at +X),
 * intake on +Z, exhaust on -Z. Crank axis y = 0.25, block deck y = 0.50.
 *
 * Animation sync: the crank spins about +X at 6 rad/s. A crank pin that starts at
 * z = -r rises as r·sin(t), which is exactly the `piston` anim with phase 0, so pins
 * of cylinders 1 & 4 sit at -Z and 2 & 3 at +Z (phase π). Cams turn at half speed.
 */

const PI = Math.PI;
const XS = [-0.138, -0.046, 0.046, 0.138]; // bore centres (92 mm pitch)
const ALONG_X = [0, 0, PI / 2]; // turns a Y-axis cylinder/gear onto the X axis
const RING_X = [0, PI / 2, 0]; // turns an XY torus so it wraps around the X axis
const FLAT = [PI / 2, 0, 0]; // lays an XY torus flat (axis = Y)
const ROW4 = { count: 4, offset: [0.092, 0, 0] };
const CRANK_Y = 0.25;
const CRANK_SPEED = 6;
const CAM_SPEED = CRANK_SPEED / 2;
const TILT = 0.32; // valve included half-angle (rad, ≈18°)
const DOUBLE = (m) => ({ ...m, side: 'double' });

/** Points on a circle in the YZ plane (x fixed). a = 0 → +Z, a = π/2 → +Y. */
function arc(cy, cz, r, a0, a1, n, x) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    pts.push([x, cy + r * Math.sin(a), cz + r * Math.cos(a)]);
  }
  return pts;
}

/** Crank web + counterweight profile (pin towards +v), extruded along X via rotation. */
function webOutline() {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = PI - (i / 8) * PI;
    pts.push([0.024 * Math.cos(a), 0.043 + 0.024 * Math.sin(a)]);
  }
  pts.push([0.026, 0.0]);
  for (let i = 0; i <= 12; i++) {
    const a = -0.12 - (i / 12) * (PI - 0.24);
    pts.push([0.062 * Math.cos(a), 0.062 * Math.sin(a)]);
  }
  pts.push([-0.026, 0.0]);
  return pts;
}
const WEB = webOutline();

/** Egg-shaped cam lobe (nose towards +u). */
const LOBE = Array.from({ length: 40 }, (_, i) => {
  const a = (i / 40) * PI * 2;
  const r = 0.016 + 0.0095 * Math.pow(Math.max(0, Math.cos(a)), 2.2);
  return [r * Math.cos(a), r * Math.sin(a)];
});

/** Offset along a tilted valve axis: returns [dy, dz] for distance d from the valve face. */
const along = (d) => [d * Math.cos(TILT), d * Math.sin(TILT)];

/** Convert world-space points into a part's local space. */
const rel = (pts, o) => pts.map(([x, y, z]) => [x - o[0], y - o[1], z - o[2]]);

// ---------------------------------------------------------------- crankshaft
const crankShapes = [
  // five main journals
  { type: 'cylinder', radius: 0.026, height: 0.022, rotation: ALONG_X, position: [-0.184, 0, 0],
    array: { count: 5, offset: [0.092, 0, 0] }, material: M.chrome() },
  // crank pins: cylinders 1 & 4 at -Z, 2 & 3 at +Z (180° flat-plane crank)
  { type: 'cylinder', radius: 0.022, height: 0.036, rotation: ALONG_X, position: [XS[0], 0, -0.043],
    array: { count: 2, offset: [0.276, 0, 0] }, material: M.chrome() },
  { type: 'cylinder', radius: 0.022, height: 0.036, rotation: ALONG_X, position: [XS[1], 0, 0.043],
    array: { count: 2, offset: [0.092, 0, 0] }, material: M.chrome() },
  // nose (snout) and rear flywheel flange
  { type: 'cylinder', radius: 0.018, height: 0.075, rotation: ALONG_X, position: [0.232, 0, 0], material: M.brushed() },
  { type: 'cylinder', radius: 0.042, height: 0.018, rotation: ALONG_X, position: [-0.205, 0, 0], material: M.metal('#7d858f') },
];
XS.forEach((x, i) => {
  const rx = i === 0 || i === 3 ? -PI / 2 : PI / 2;
  crankShapes.push({
    type: 'extrude', outline: WEB, depth: 0.014, bevel: 0.0015, rotation: [rx, PI / 2, 0],
    position: [x - 0.024, 0, 0], array: { count: 2, offset: [0.048, 0, 0] }, material: M.metal('#7d858f'),
  });
});

// ---------------------------------------------------------------- camshafts
const FIRING_ANGLE = { 0: 0, 2: PI / 2, 3: PI, 1: (3 * PI) / 2 }; // 1-3-4-2, 90° of cam per event
function camShapes(offset) {
  const shapes = [
    { type: 'cylinder', radius: 0.0115, height: 0.45, rotation: ALONG_X, position: [0.005, 0, 0], material: M.brushed('#a9b0b8') },
    { type: 'cylinder', radius: 0.0135, height: 0.012, rotation: ALONG_X, position: [-0.184, 0, 0],
      array: { count: 5, offset: [0.092, 0, 0] }, material: M.chrome() },
  ];
  XS.forEach((x, i) => {
    shapes.push({
      type: 'extrude', outline: LOBE, depth: 0.011, bevel: 0.001, rotation: [FIRING_ANGLE[i] + offset, PI / 2, 0],
      position: [x - 0.017, 0, 0], array: { count: 2, offset: [0.034, 0, 0] }, material: M.brushed('#c3c8ce'),
    });
  });
  return shapes;
}

// ---------------------------------------------------------------- valves & springs
const VALVE_PROFILE = (r) => [
  [0, 0], [r, 0], [r + 0.0008, 0.0015], [r * 0.75, 0.0055], [0.005, 0.013], [0.003, 0.02],
  [0.003, 0.09], [0.0036, 0.091], [0.0036, 0.094], [0, 0.094],
];
function valveShapes(side, r, material) {
  const z = 0.022 * side;
  const rot = [TILT * side, 0, 0];
  return [-0.017, 0.017].map((dx) => ({
    type: 'lathe', points: VALVE_PROFILE(r), segments: 18, rotation: rot,
    position: [XS[0] + dx, 0, z], array: ROW4, material,
  }));
}
function springShapes(side) {
  const shapes = [];
  const rot = [TILT * side, 0, 0];
  const at = (d) => { const [dy, dz] = along(d); return [dy, (0.022 + dz) * side]; };
  for (const dx of [-0.017, 0.017]) {
    const [sy, sz] = at(0.066);
    const [ry, rz] = at(0.081);
    const [by, bz] = at(0.089);
    shapes.push(
      { type: 'helix', radius: 0.0105, height: 0.026, turns: 4.5, tube: 0.0014, rotation: rot,
        position: [XS[0] + dx, sy, sz], array: ROW4, material: M.steel('#3f6fb5') },
      { type: 'cylinder', radius: 0.0115, height: 0.003, segments: 20, rotation: rot,
        position: [XS[0] + dx, ry, rz], array: ROW4, material: M.brushed() },
      { type: 'cylinder', radius: 0.0135, height: 0.011, segments: 20, rotation: rot,
        position: [XS[0] + dx, by, bz], array: ROW4, material: M.chrome() },
    );
  }
  return shapes;
}

// ---------------------------------------------------------------- belts
const TB_X = 0.235;
const timingBeltPts = [
  ...arc(CRANK_Y, 0, 0.03, 0, -PI, 9, TB_X), // under the crank sprocket
  [TB_X, 0.43, -0.068], // pressed in by the tensioner
  ...arc(0.615, -0.055, 0.054, PI, PI / 2, 6, TB_X), // over the exhaust cam sprocket
  ...arc(0.615, 0.055, 0.054, PI / 2, 0, 6, TB_X), // over the intake cam sprocket
];
const SB_X = 0.275;
const serpPts = [
  ...arc(CRANK_Y, 0, 0.066, 0.3, -PI - 0.3, 10, SB_X), // crank pulley
  ...arc(0.36, -0.085, 0.029, 1.2 * PI, 0.6 * PI, 5, SB_X), // idler
  ...arc(0.4, 0, 0.046, 0.8 * PI, 0.2 * PI, 6, SB_X), // water pump
  ...arc(0.34, 0.17, 0.03, 0.7 * PI, -0.6 * PI, 7, SB_X), // alternator
];

// ---------------------------------------------------------------- manifolds
const EXH_O = [0, 0.45, -0.16];
const exhaustRunners = XS.map((x) => ({
  type: 'tube', radius: 0.017, radialSegments: 14, segments: 40,
  points: rel([[x, 0.535, -0.104], [x, 0.532, -0.145], [x * 0.75, 0.5, -0.185], [x * 0.25, 0.445, -0.205], [0, 0.42, -0.21]], EXH_O),
  material: M.metal('#8d6e57'),
}));
const INT_O = [0, 0.6, 0.17];
const intakeRunners = XS.map((x) => ({
  type: 'tube', radius: 0.019, radialSegments: 14, segments: 40,
  points: rel([[x, 0.535, 0.104], [x, 0.537, 0.15], [x, 0.565, 0.205], [x, 0.615, 0.228], [x, 0.66, 0.2]], INT_O),
  material: M.plastic('#26292e'),
}));

// ---------------------------------------------------------------- per-cylinder parts
const ORDER_NOTE = 'Firing order is 1-3-4-2, so a power stroke happens every 180° of crank rotation.';
const PHASE = [0, PI, PI, 0];

const pistons = XS.map((x, i) => ({
  id: `piston-${i + 1}`,
  name: `Piston ${i + 1}`,
  system: 'block',
  position: [x, 0.39, 0],
  explode: [0, 0.2, 0],
  anim: { type: 'piston', axis: 'y', amplitude: 0.043, speed: CRANK_SPEED, phase: PHASE[i] },
  shapes: [
    { type: 'cylinder', radius: 0.0425, height: 0.062, position: [0, 0.011, 0], material: M.aluminium() },
    { type: 'cylinder', radiusTop: 0.036, radiusBottom: 0.0425, height: 0.005, position: [0, 0.0445, 0], material: M.metal('#6b6259') },
    { type: 'torus', radius: 0.0428, tube: 0.0016, radialSegments: 6, tubularSegments: 40, rotation: FLAT,
      position: [0, 0.035, 0], array: { count: 3, offset: [0, -0.0065, 0] }, material: M.metal('#3d4148') },
    { type: 'cylinder', radius: 0.0095, height: 0.074, rotation: ALONG_X, material: M.chrome() },
  ],
  info: {
    what: `The piston of cylinder ${i + 1}: a light aluminium plug that slides up and down inside the cylinder.`,
    location: `Inside cylinder ${i + 1} (${i === 0 ? 'the flywheel end' : i === 3 ? 'the timing-belt end' : 'the middle of the engine'}), between the cylinder head above and its connecting rod below.`,
    purpose: 'Seals the combustion chamber from below and turns the pressure of burning fuel into a push on the connecting rod.',
    how: 'On the intake stroke it moves down and sucks in air and fuel. It then rises to squeeze the mixture, is shoved down hard when the spark plug ignites it, and finally rises again to push the burnt gas out of the exhaust valves. Three rings around it seal the gas in and scrape oil off the cylinder wall.',
    connections: [`conrod-${i + 1}`, 'cylinder-liners', 'cylinder-head', 'crankshaft'],
    examples: 'Bicycle pumps, syringes and hydraulic jacks all use a piston sliding in a cylinder.',
    advanced: `Hypereutectic or forged Al-Si alloy, ~300 g, 86 mm diameter with a 86 mm stroke ("square" engine). At 6,500 rpm mean piston speed is ~18.6 m/s and peak acceleration exceeds 2,000 g. Top ring is a steel compression ring, second a tapered scraper, third a three-piece oil-control ring. Peak cylinder pressure ~60–80 bar at ~10–15° after TDC. Pistons ${i === 0 || i === 3 ? '1 and 4' : '2 and 3'} move in step; ${ORDER_NOTE}`,
    facts: ['A piston in a car engine at highway speed changes direction about 100 times per second.'],
  },
}));

const conrods = XS.map((x, i) => ({
  id: `conrod-${i + 1}`,
  name: `Connecting Rod ${i + 1}`,
  system: 'block',
  position: [x, 0.32, 0],
  explode: [0, 0.08, 0],
  anim: { type: 'piston', axis: 'y', amplitude: 0.043, speed: CRANK_SPEED, phase: PHASE[i] },
  shapes: [
    { type: 'torus', radius: 0.03, tube: 0.008, radialSegments: 8, tubularSegments: 36, rotation: RING_X, position: [0, -0.07, 0], material: M.metal('#7d858f') },
    { type: 'box', size: [0.016, 0.026, 0.09], radius: 0.004, position: [0, -0.07, 0], material: M.metal('#6f7781') },
    { type: 'box', size: [0.014, 0.1, 0.022], radius: 0.004, position: [0, 0.005, 0], material: M.metal('#7d858f') },
    { type: 'box', size: [0.018, 0.1, 0.008], position: [0, 0.005, 0], material: M.metal('#6f7781') },
    { type: 'torus', radius: 0.0135, tube: 0.005, radialSegments: 8, tubularSegments: 28, rotation: RING_X, position: [0, 0.07, 0], material: M.metal('#7d858f') },
    { type: 'cylinder', radius: 0.004, height: 0.03, position: [0, -0.085, -0.036], array: { count: 2, offset: [0, 0, 0.072] }, material: M.chrome() },
  ],
  info: {
    what: `The connecting rod ("con-rod") of cylinder ${i + 1}: a strong steel link between the piston and the crankshaft.`,
    location: `Below piston ${i + 1}; its small end wraps the piston pin and its big end wraps a crank pin.`,
    purpose: 'Turns the straight up-and-down motion of the piston into the rotating motion of the crankshaft.',
    how: 'The small end only rocks a little around the piston pin, while the big end follows the crank pin in a circle. The rod is pushed hard on the power stroke and pulled hard at the top of the exhaust stroke, so it must handle both compression and tension.',
    connections: [`piston-${i + 1}`, 'crankshaft'],
    examples: 'The pedal arm and your leg on a bicycle form the same "slider-crank" linkage; old steam locomotives show it in plain sight.',
    advanced: 'Forged or powder-metal steel with an I-beam shank, ~145 mm centre-to-centre (rod/stroke ratio ≈1.7). The big-end cap is often "fracture-split" so it fits back perfectly, and runs on thin shell bearings fed with pressurised oil through drillings in the crank. Peak tensile load occurs at TDC overlap from the inertia of the piston: F = m·r·ω²·(1 + r/l).',
    facts: ['A connecting-rod failure is called "throwing a rod" – the rod can punch a hole straight through the block.'],
  },
}));

// ================================================================= model
export default {
  id: 'engine',
  name: 'Inline-4 Engine',
  category: 'cars',
  tagline: 'Sixteen valves, four pistons and thousands of tiny explosions a minute.',
  description:
    'A modern 2.0-litre DOHC inline-four petrol engine – the kind found in most family cars. Explode it to see how the bottom end, cylinder head, valvetrain and timing drive stack together, then follow the four-stroke Otto cycle step by step.',
  camera: { position: [1.4, 1.0, 1.6], target: [0, 0.4, 0] },
  explodeScale: 1,
  systems: [
    { id: 'block', name: 'Block & Bottom End', color: '#8b95a5' },
    { id: 'valvetrain', name: 'Cylinder Head & Valvetrain', color: '#4cc9f0' },
    { id: 'timing', name: 'Timing Drive', color: '#f4a261' },
    { id: 'intake', name: 'Intake & Fuel', color: '#4ade80' },
    { id: 'ignition', name: 'Ignition & Sensors', color: '#facc15' },
    { id: 'exhaust', name: 'Exhaust', color: '#ef4444' },
    { id: 'lubrication', name: 'Lubrication', color: '#d97706' },
    { id: 'cooling', name: 'Cooling', color: '#38bdf8' },
    { id: 'accessories', name: 'Accessories', color: '#a78bfa' },
  ],
  parts: [
    // ------------------------------------------------------------ lubrication (bottom)
    {
      id: 'oil-pan',
      name: 'Oil Pan (Sump)',
      system: 'lubrication',
      position: [0, 0.16, 0],
      explode: [0, -0.1, 0],
      shapes: [
        { type: 'box', size: [0.44, 0.008, 0.235], radius: 0.003, position: [0, 0.056, 0], material: M.metal('#555a62') },
        { type: 'box', size: [0.42, 0.06, 0.215], radius: 0.012, position: [0, 0.025, 0], material: M.metal('#4a4e55') },
        { type: 'box', size: [0.25, 0.07, 0.19], radius: 0.016, position: [-0.06, -0.022, 0], material: M.metal('#4a4e55') },
        { type: 'box', size: [0.2, 0.004, 0.006], position: [-0.06, -0.058, 0], array: { count: 5, offset: [0, 0, 0.035] }, scale: [1, 1, 1], material: M.metal('#5c6169') },
        { type: 'cylinder', radius: 0.009, height: 0.008, segments: 6, rotation: [PI / 2, 0, 0], position: [-0.12, -0.03, -0.098], material: M.chrome() },
      ],
      info: {
        what: 'The oil pan, or sump, is the metal tray bolted to the bottom of the engine that holds the engine oil.',
        location: 'The very bottom of the engine, under the crankshaft.',
        purpose: 'Stores 4–5 litres of oil, lets it cool and settle, and gives the oil pump a place to draw from.',
        how: 'Oil that has lubricated the engine drips back down by gravity and collects here. The deep "well" keeps the pump pickup submerged even when the car brakes or corners hard. A drain plug at the bottom lets mechanics empty it at an oil change.',
        connections: ['oil-pump', 'engine-block', 'dipstick', 'oil-filter'],
        examples: 'Changing your oil means unscrewing the sump drain plug. Racing cars use "dry-sump" systems with a separate tank instead.',
        advanced: 'Wet sump of pressed steel or cast aluminium (cast pans add stiffness to the block/transmission joint). Internal baffles and a windage tray stop oil sloshing away from the pickup under ~1 g lateral loads and keep the spinning crank from whipping the oil into foam, which costs power and causes aeration.',
        facts: ['A dented sump can starve the oil pickup and destroy an engine within minutes.'],
      },
    },
    {
      id: 'oil-pump',
      name: 'Oil Pump & Pickup',
      system: 'lubrication',
      position: [0.12, 0.175, 0],
      explode: [0.05, -0.04, 0],
      shapes: [
        { type: 'box', size: [0.06, 0.04, 0.07], radius: 0.006, material: M.aluminium() },
        { type: 'gear', radius: 0.022, teeth: 12, toothDepth: 0.004, thickness: 0.008, rotation: ALONG_X, position: [0.034, 0, 0], material: M.steel() },
        { type: 'tube', radius: 0.008, radialSegments: 10, points: [[-0.02, -0.01, 0], [-0.07, -0.03, 0], [-0.13, -0.045, 0], [-0.17, -0.05, 0]], material: M.steel() },
        { type: 'cylinder', radius: 0.03, height: 0.008, position: [-0.17, -0.058, 0], material: M.metal('#8b8f96') },
      ],
      info: {
        what: 'A small gear pump that pushes engine oil around the engine under pressure.',
        location: 'Hanging inside the oil pan at the front of the engine, with its pickup tube reaching into the deepest part of the sump.',
        purpose: 'Delivers a steady stream of pressurised oil to every bearing, the camshafts and the pistons.',
        how: 'The crankshaft drives a pair of meshing gears (or a rotor). As the teeth unmesh they create a low-pressure pocket that sucks oil up through the strainer; as they mesh again they squeeze it out into the oil gallery. A relief valve dumps excess pressure back to the sump.',
        connections: ['oil-pan', 'oil-filter', 'crankshaft', 'engine-block'],
        examples: 'The oil-pressure warning light on your dashboard watches the output of this pump.',
        advanced: 'Typically a gerotor or external-gear positive-displacement pump giving ~1 bar at idle and 3–5 bar at speed (rule of thumb: 10 psi per 1,000 rpm). Modern engines use variable-displacement vane pumps that lower pressure at light load, saving ~1–2 % fuel. The strainer mesh stops debris that would score the pump.',
        facts: ['At high rpm an oil pump can circulate the entire sump contents several times per minute.'],
      },
    },
    {
      id: 'oil-filter',
      name: 'Oil Filter',
      system: 'lubrication',
      position: [0.1, 0.28, -0.135],
      explode: [0, -0.02, -0.25],
      shapes: [
        { type: 'cylinder', radius: 0.035, height: 0.075, rotation: [PI / 2, 0, 0], position: [0, 0, -0.012], material: M.paint('#1f5fbf') },
        { type: 'cylinder', radius: 0.03, height: 0.004, rotation: [PI / 2, 0, 0], position: [0, 0, -0.052], material: M.metal('#c9ced4') },
        { type: 'box', size: [0.08, 0.08, 0.012], radius: 0.006, position: [0, 0, 0.03], material: M.aluminium() },
        { type: 'cylinder', radius: 0.036, height: 0.004, segments: 32, rotation: [PI / 2, 0, 0], position: [0, 0, -0.012],
          array: { count: 6, offset: [0, 0, 0.009] }, material: M.paint('#174b99') },
      ],
      info: {
        what: 'A screw-on canister containing folded paper that cleans the engine oil.',
        location: 'Screwed onto a mounting boss on the exhaust side of the engine block.',
        purpose: 'Traps metal particles, soot and dirt so they do not wear out bearings and cylinder walls.',
        how: 'Oil from the pump enters around the outer holes, is forced through the pleated filter paper, and leaves cleaned through the centre hole into the block’s main oil gallery. If the filter clogs, a bypass valve lets oil through anyway, because dirty oil is better than no oil.',
        connections: ['oil-pump', 'engine-block', 'oil-pan'],
        examples: 'Replaced at every oil change, typically every 10,000–15,000 km.',
        advanced: 'Full-flow filter with cellulose/synthetic media rated ~20–25 µm (β-ratio based). Includes an anti-drain-back valve so oil stays in the filter when the engine stops, giving quicker pressure at start-up — when most engine wear happens. Bypass valve opens at ~0.8–1.0 bar differential.',
        facts: ['Most engine wear happens in the first few seconds after a cold start, before oil pressure builds.'],
      },
    },
    {
      id: 'dipstick',
      name: 'Oil Dipstick',
      system: 'lubrication',
      position: [0.19, 0.45, -0.13],
      explode: [0.08, 0.25, -0.2],
      shapes: [
        { type: 'tube', radius: 0.0045, radialSegments: 8, points: rel([[0.18, 0.27, -0.115], [0.185, 0.4, -0.125], [0.192, 0.55, -0.135], [0.196, 0.63, -0.14]], [0.19, 0.45, -0.13]), material: M.steel() },
        { type: 'torus', radius: 0.013, tube: 0.004, radialSegments: 8, tubularSegments: 28, rotation: [0, PI / 2, 0], position: [0.006, 0.195, -0.01], material: M.plastic('#f2b705') },
      ],
      info: {
        what: 'A long thin metal rod used to check how much oil is in the engine.',
        location: 'Slides down a guide tube on the side of the block into the oil pan; the bright yellow handle sits near the top of the engine.',
        purpose: 'Lets the driver or mechanic measure the oil level and see the oil’s condition.',
        how: 'Pull it out, wipe it, push it back in fully and pull it out again. The oil film on the tip should sit between the MIN and MAX marks. Dark, gritty or milky oil is a sign of trouble.',
        connections: ['oil-pan', 'engine-block'],
        examples: 'The yellow loop you see when you open almost any car bonnet.',
        advanced: 'The distance between MIN and MAX usually equals ~1 litre. Milky, mayonnaise-like oil suggests coolant contamination (e.g. a failed head gasket); a fuel smell suggests injector leakage or excessive short-trip dilution. Many newer cars drop the dipstick for an electronic level sensor.',
        facts: ['Checking it with the engine hot and level gives the most accurate reading.'],
      },
    },

    // ------------------------------------------------------------ block & bottom end
    {
      id: 'engine-block',
      name: 'Engine Block (Crankcase)',
      system: 'block',
      position: [0, 0.36, 0],
      explode: [0, 0, 0],
      ghost: true,
      shapes: [
        { type: 'box', size: [0.44, 0.17, 0.03], position: [0, 0.055, -0.085], array: { count: 2, offset: [0, 0, 0.17] }, material: M.castIron() },
        { type: 'box', size: [0.03, 0.17, 0.2], position: [-0.205, 0.055, 0], array: { count: 2, offset: [0.41, 0, 0] }, material: M.castIron() },
        { type: 'box', size: [0.44, 0.11, 0.235], radius: 0.012, position: [0, -0.085, 0], material: M.castIron() },
        { type: 'box', size: [0.012, 0.1, 0.2], position: [-0.184, -0.08, 0], array: { count: 5, offset: [0.092, 0, 0] }, material: M.castIron() },
        { type: 'box', size: [0.44, 0.012, 0.2], position: [0, 0.134, 0], scale: [1, 1, 1], material: M.castIron() },
        { type: 'box', size: [0.4, 0.012, 0.016], position: [0, 0.02, -0.102], array: { count: 3, offset: [0, 0.04, 0] }, material: M.castIron() },
        { type: 'box', size: [0.4, 0.012, 0.016], position: [0, 0.02, 0.102], array: { count: 3, offset: [0, 0.04, 0] }, material: M.castIron() },
      ],
      info: {
        what: 'The engine block is the large, heavy main body of the engine. All the other parts bolt to it.',
        location: 'The centre of the engine, between the oil pan below and the cylinder head above.',
        purpose: 'Holds the four cylinders, supports the spinning crankshaft and carries passages for coolant and oil.',
        how: 'The upper half contains the cylinder bores where the pistons slide, surrounded by a "water jacket" for coolant. The lower half (crankcase) has thick bulkheads with bearing caps that clamp the crankshaft. Drilled galleries carry oil from the pump to every bearing.',
        connections: ['cylinder-liners', 'crankshaft', 'cylinder-head', 'head-gasket', 'oil-pan', 'water-pump'],
        examples: 'When people say a car has a "2.0-litre block", they mean the total swept volume of the cylinders cast into this part.',
        advanced: 'Cast grey iron (strong, damps vibration) or, more commonly today, A356/A319 aluminium with cast-in iron liners (~40 % lighter). Open-deck designs allow easy casting; closed-deck blocks are stiffer for turbo boost. Displacement = π/4 · 0.086² · 0.086 · 4 ≈ 2.0 L. Five main bearings (one either side of every throw) give the bottom end its stiffness.',
        facts: ['The block is shown semi-transparent here so you can see the pistons and crankshaft working inside.', 'A bare aluminium four-cylinder block weighs only around 25–30 kg.'],
      },
    },
    {
      id: 'cylinder-liners',
      name: 'Cylinder Liners (Bores)',
      system: 'block',
      position: [0, 0.41, 0],
      explode: [0, 0, 0],
      shapes: [
        { type: 'cylinder', radius: 0.0465, height: 0.17, open: true, segments: 40, position: [XS[0], 0, 0], array: ROW4, material: DOUBLE(M.brushed('#9aa1a8')) },
        { type: 'cylinder', radius: 0.0435, height: 0.17, open: true, segments: 40, position: [XS[0], 0, 0], array: ROW4, material: DOUBLE(M.metal('#b7bdc4')) },
        { type: 'torus', radius: 0.045, tube: 0.0025, radialSegments: 6, tubularSegments: 40, rotation: FLAT, position: [XS[0], 0.085, 0], array: ROW4, material: M.brushed() },
      ],
      info: {
        what: 'Four smooth, hard tubes – the cylinders – in which the pistons slide.',
        location: 'Cast into the upper half of the engine block, in a straight row from front to back.',
        purpose: 'Provide a precise, wear-resistant surface for the pistons and their rings to seal against.',
        how: 'The inner wall is honed into a fine criss-cross pattern that holds a microscopic film of oil. The piston rings ride on that film, sealing in combustion pressure while barely touching the metal. Coolant flows around the outside to carry away heat.',
        connections: ['engine-block', 'piston-1', 'piston-2', 'piston-3', 'piston-4', 'head-gasket'],
        examples: 'An engine described as "86 mm bore" has liners 86 mm across.',
        advanced: 'Centrifugally cast iron liners or thermal-spray coatings (e.g. plasma-transferred-wire arc) on aluminium bores. Cross-hatch honing at ~45° with a plateau finish (Rpk < 0.3 µm) balances oil retention and ring seal. Wall temperatures of ~150–200 °C at the top ring reversal point are critical to avoid scuffing.',
        facts: ['Cylinder walls are honed to tolerances finer than a human hair (≈0.01 mm).'],
      },
    },
    {
      id: 'crankshaft',
      name: 'Crankshaft',
      system: 'block',
      position: [0, CRANK_Y, 0],
      explode: [0, -0.04, 0],
      anim: { type: 'spin', axis: 'x', speed: CRANK_SPEED },
      shapes: crankShapes,
      info: {
        what: 'The crankshaft is the engine’s main rotating shaft – it turns the pistons’ up-and-down pushes into spinning motion.',
        location: 'Along the bottom of the engine block, running the full length of the engine, just above the oil pan.',
        purpose: 'Collects the force from all four pistons and delivers it as torque to the flywheel, gearbox and wheels.',
        how: 'Each connecting rod grabs an offset "crank pin". When a piston is pushed down, it pushes the pin around in a circle – like your foot on a bicycle pedal. Heavy counterweights opposite each pin balance the spinning mass so the engine runs smoothly.',
        connections: ['conrod-1', 'conrod-2', 'conrod-3', 'conrod-4', 'flywheel', 'crank-sprocket', 'crank-pulley', 'engine-block', 'crank-position-sensor'],
        examples: 'Bicycle cranks, hand-cranked pencil sharpeners and old car starting handles all use the same principle.',
        advanced: 'Forged steel, induction-hardened journals, 5 main bearings, 4 pins at 180° ("flat-plane"): pins 1 & 4 share one position and 2 & 3 the opposite one. This balances primary forces but leaves an unbalanced secondary force at 2× crank speed, which larger I4s cancel with twin Lanchester balance shafts. Throw = half the stroke (43 mm). Oil reaches the big ends through cross-drillings from the main journals.',
        facts: ['At 6,000 rpm the crankshaft turns 100 times every second.', 'Pistons 1 & 4 always move together, as do 2 & 3 – watch the animation.'],
      },
    },
    ...conrods,
    ...pistons,
    {
      id: 'flywheel',
      name: 'Flywheel',
      system: 'block',
      position: [-0.232, CRANK_Y, 0],
      explode: [-0.22, 0, 0],
      anim: { type: 'spin', axis: 'x', speed: CRANK_SPEED },
      shapes: [
        { type: 'gear', radius: 0.135, teeth: 72, toothDepth: 0.006, thickness: 0.016, rotation: ALONG_X, position: [-0.004, 0, 0], material: M.steel('#6a717a') },
        { type: 'cylinder', radius: 0.12, height: 0.026, rotation: ALONG_X, position: [0.004, 0, 0], material: M.metal('#868d96') },
        { type: 'cylinder', radius: 0.03, height: 0.034, rotation: ALONG_X, position: [0, 0, 0], material: M.brushed() },
        { type: 'cylinder', radius: 0.006, height: 0.03, rotation: ALONG_X, position: [0.004, 0.06, 0], array: { count: 6, offset: [0, 0, 0], rotation: [PI / 3, 0, 0] }, material: M.chrome() },
      ],
      info: {
        what: 'A heavy disc bolted to the back end of the crankshaft, with gear teeth around its rim.',
        location: 'At the rear (cylinder 1) end of the crankshaft, between the engine and the gearbox.',
        purpose: 'Smooths out the jerky power pulses of the pistons, gives the clutch a surface to grip and lets the starter motor turn the engine.',
        how: 'Its weight stores rotational energy during each power stroke and gives it back during the other three strokes, keeping the crank turning evenly. The ring gear on its edge meshes with the starter motor pinion when you start the car.',
        connections: ['crankshaft', 'starter-motor', 'crank-position-sensor'],
        examples: 'Potter’s wheels, toy friction cars and kinetic energy recovery systems use flywheels to store energy.',
        advanced: 'Kinetic energy E = ½·I·ω². A four-cylinder only fires twice per revolution, so torque fluctuates strongly; many modern cars use a dual-mass flywheel with internal springs to isolate the gearbox from these torsional vibrations. Automatic cars use a thin "flexplate" plus the torque converter instead.',
        facts: ['The ring gear usually has 100–150 teeth; the starter pinion only about 9–11, giving a big gear reduction.'],
      },
    },

    // ------------------------------------------------------------ head & valvetrain
    {
      id: 'head-gasket',
      name: 'Head Gasket',
      system: 'valvetrain',
      position: [0, 0.502, 0],
      explode: [0, 0.3, 0],
      shapes: [
        { type: 'box', size: [0.44, 0.003, 0.2], material: M.metal('#a8adb3') },
        { type: 'torus', radius: 0.0455, tube: 0.0022, radialSegments: 6, tubularSegments: 44, rotation: FLAT, position: [XS[0], 0.0015, 0], array: ROW4, material: M.copper() },
        { type: 'cylinder', radius: 0.042, height: 0.0034, segments: 40, position: [XS[0], 0, 0], array: ROW4, material: M.metal('#3b3e44') },
      ],
      info: {
        what: 'A thin, multi-layer steel seal sandwiched between the engine block and the cylinder head.',
        location: 'Directly on top of the block’s flat deck surface, under the cylinder head.',
        purpose: 'Seals combustion pressure inside each cylinder and keeps oil and coolant passages separate.',
        how: 'When the head bolts are tightened, the gasket is crushed slightly. Raised beads and fire rings around each bore concentrate clamping pressure where it is needed most, sealing gases at up to 80+ times atmospheric pressure.',
        connections: ['engine-block', 'cylinder-head', 'cylinder-liners'],
        examples: 'A "blown head gasket" causes white exhaust smoke, overheating and milky oil – a classic expensive repair.',
        advanced: 'Multi-layer steel (MLS): 3–5 layers of spring-steel with embossed beads and elastomer coatings, ~0.7–1.2 mm thick. Its compressed thickness directly affects compression ratio and squish clearance. Head bolts are torque-to-yield and tightened in a spiral sequence to distribute load evenly.',
        facts: ['Its thickness changes compression ratio – racers use thinner gaskets to raise it.'],
      },
    },
    {
      id: 'cylinder-head',
      name: 'Cylinder Head',
      system: 'valvetrain',
      position: [0, 0.5345, 0],
      explode: [0, 0.38, 0],
      shapes: [
        { type: 'box', size: [0.44, 0.061, 0.2], radius: 0.006, material: M.aluminium() },
        { type: 'box', size: [0.014, 0.05, 0.15], position: [-0.184, 0.055, 0], array: { count: 5, offset: [0.092, 0, 0] }, material: M.aluminium() },
        { type: 'box', size: [0.44, 0.03, 0.012], radius: 0.003, position: [0, 0.045, -0.094], array: { count: 2, offset: [0, 0, 0.188] }, material: M.aluminium() },
        { type: 'cylinder', radius: 0.013, height: 0.05, segments: 20, position: [XS[0], 0.055, 0], array: ROW4, material: M.aluminium() },
        { type: 'box', size: [0.07, 0.04, 0.008], radius: 0.003, position: [XS[0], 0, 0.102], array: ROW4, material: M.brushed() },
        { type: 'box', size: [0.06, 0.036, 0.008], radius: 0.003, position: [XS[0], 0, -0.102], array: ROW4, material: M.brushed() },
      ],
      info: {
        what: 'The cylinder head is the "lid" of the engine that closes off the top of the cylinders and houses the valves.',
        location: 'Bolted on top of the engine block (with the head gasket between), under the valve cover.',
        purpose: 'Forms the roof of each combustion chamber, contains the intake and exhaust ports, valves, spark plugs and camshafts.',
        how: 'Air-fuel mixture flows in through curved intake ports on one side, and burnt gas leaves through exhaust ports on the other ("cross-flow"). Each cylinder has four valves and a central spark plug in a tent-shaped "pent-roof" chamber. Coolant passages keep the hot chamber walls at a safe temperature.',
        connections: ['head-gasket', 'engine-block', 'intake-camshaft', 'exhaust-camshaft', 'intake-valves', 'exhaust-valves', 'spark-plugs', 'intake-manifold', 'exhaust-manifold', 'valve-cover'],
        examples: '"DOHC 16V" on a car badge describes this head: double overhead camshafts, 16 valves.',
        advanced: 'Cast A356-T6 aluminium for good thermal conductivity. Pent-roof chamber with a central plug minimises flame travel, allowing ~10.5–12:1 compression on 95 RON fuel. Port shape is tuned to generate "tumble" (in-cylinder swirl about a horizontal axis) for fast, stable combustion. Valve seats are sintered inserts pressed into the aluminium.',
        facts: ['Exhaust-side head surfaces see gas temperatures above 900 °C, yet the metal stays below about 250 °C thanks to coolant.'],
      },
    },
    {
      id: 'intake-valves',
      name: 'Intake Valves (×8)',
      system: 'valvetrain',
      position: [0, 0.508, 0],
      explode: [0, 0.48, 0.03],
      anim: { type: 'piston', axis: 'y', amplitude: 0.004, speed: CAM_SPEED, phase: 0 },
      shapes: valveShapes(1, 0.016, M.metal('#b5bcc4')),
      info: {
        what: 'Mushroom-shaped "poppet" valves that open to let the air-fuel mixture into each cylinder – two per cylinder.',
        location: 'In the cylinder head on the intake (+Z) side, sitting at the top of each combustion chamber.',
        purpose: 'Open during the intake stroke to fill the cylinder, then seal tightly for compression and combustion.',
        how: 'A lobe on the intake camshaft pushes the valve down into the cylinder, opening a gap around its head for mixture to rush in. When the lobe rotates away, the valve spring snaps it shut against its seat.',
        connections: ['intake-camshaft', 'valve-springs', 'cylinder-head', 'intake-manifold'],
        examples: 'Using two smaller intake valves instead of one big one increases flow area – that is why most modern engines have 4 valves per cylinder.',
        advanced: 'Intake valves are larger than exhaust valves (~33 vs 28 mm) because the pressure pushing gas in (≤1 bar) is far lower than the pressure pushing it out. Typical intake events: open ~10° BTDC, close ~45° ABDC; the late close uses the inertia of the moving air column to "ram" extra charge in. Lift ~9–10 mm. Variable valve timing (VVT) phases the cam ±25–50° with oil pressure.',
        facts: ['At 6,000 rpm each valve opens and closes 50 times per second.'],
      },
    },
    {
      id: 'exhaust-valves',
      name: 'Exhaust Valves (×8)',
      system: 'valvetrain',
      position: [0, 0.508, 0],
      explode: [0, 0.48, -0.03],
      anim: { type: 'piston', axis: 'y', amplitude: 0.004, speed: CAM_SPEED, phase: PI },
      shapes: valveShapes(-1, 0.014, M.metal('#8a7f74')),
      info: {
        what: 'Valves that open to let the burnt gases out of each cylinder – two per cylinder.',
        location: 'In the cylinder head on the exhaust (−Z) side of each combustion chamber.',
        purpose: 'Release the spent combustion gas into the exhaust manifold at the end of the power stroke.',
        how: 'The exhaust camshaft pushes them open just before the piston reaches the bottom of the power stroke. High pressure gas "blows down" out of the cylinder, then the rising piston pushes the rest out. They close just after the piston passes the top.',
        connections: ['exhaust-camshaft', 'valve-springs', 'cylinder-head', 'exhaust-manifold'],
        examples: 'The rhythmic "burble" of an exhaust pipe is the sound of these valves opening in sequence.',
        advanced: 'Exhaust valves run red-hot (~700–800 °C) and are made of heat-resistant austenitic steel (21-4N) or Inconel; some use sodium-filled hollow stems that carry heat from the head to the cooler stem. Typical timing: open ~45° BBDC, close ~10° ATDC. The overlap period with both valves open uses exhaust momentum to scavenge the chamber.',
        facts: ['Sodium-filled valves were developed for WWII aircraft engines.'],
      },
    },
    {
      id: 'valve-springs',
      name: 'Valve Springs & Tappets',
      system: 'valvetrain',
      position: [0, 0.508, 0],
      explode: [0, 0.56, 0],
      shapes: [...springShapes(1), ...springShapes(-1)],
      info: {
        what: 'Sixteen coil springs (one per valve) topped with retainers and bucket tappets.',
        location: 'Around the top of each valve stem, between the cylinder head and the camshafts.',
        purpose: 'Snap the valves shut and keep them following the cam lobes exactly, even at high rpm.',
        how: 'The cam lobe presses on a cup-shaped "bucket" tappet, which pushes the valve open and compresses the spring. As the lobe rolls past, the spring’s stored energy closes the valve and holds it tightly on its seat.',
        connections: ['intake-valves', 'exhaust-valves', 'intake-camshaft', 'exhaust-camshaft', 'cylinder-head'],
        examples: 'Motorsport engines sometimes replace springs with compressed air (Formula 1) or a second cam lobe (Ducati "desmodromic") to go higher in rpm.',
        advanced: 'Chrome-silicon steel, shot-peened; seat load ~200–250 N, open load ~500 N. If inertia exceeds spring force the valve "floats" (loses contact with the cam), limiting maximum rpm. Hydraulic lash adjusters or shimmed buckets set the clearance (~0.2 mm intake, ~0.3 mm exhaust) to allow for thermal expansion.',
        facts: ['Engines with too-weak springs can let a floating valve touch the piston – a costly "valve-to-piston" crash.'],
      },
    },
    {
      id: 'intake-camshaft',
      name: 'Intake Camshaft',
      system: 'valvetrain',
      position: [0, 0.615, 0.055],
      explode: [0, 0.66, 0.06],
      anim: { type: 'spin', axis: 'x', speed: CAM_SPEED },
      shapes: camShapes(0),
      info: {
        what: 'A rotating shaft with egg-shaped lobes that opens the intake valves.',
        location: 'On top of the cylinder head, on the intake side, running the length of the engine.',
        purpose: 'Opens each intake valve at exactly the right moment, by the right amount, for the right time.',
        how: 'The timing belt turns the camshaft at half crankshaft speed. Each egg-shaped lobe presses down on a valve’s tappet as its pointed "nose" rotates past, then lets it close again. The lobes are arranged so the cylinders breathe in the 1-3-4-2 firing order.',
        connections: ['intake-cam-sprocket', 'intake-valves', 'valve-springs', 'cylinder-head', 'timing-belt'],
        examples: 'Music boxes use pins on a rotating drum the same way – the drum’s shape "programs" the sequence.',
        advanced: 'Chilled cast iron or assembled hollow steel tube with pressed-on lobes. Half crank speed because each valve operates once per 720° four-stroke cycle. Lobe profile defines lift, duration (~240° @ 0 lift) and ramps that limit jerk. Usually fitted with a hydraulic cam phaser (VVT) to advance timing at low rpm for torque and retard it at high rpm for power.',
        facts: ['"Hot cams" with more lift and duration are a classic tuning upgrade – they trade idle smoothness for top-end power.'],
      },
    },
    {
      id: 'exhaust-camshaft',
      name: 'Exhaust Camshaft',
      system: 'valvetrain',
      position: [0, 0.615, -0.055],
      explode: [0, 0.66, -0.06],
      anim: { type: 'spin', axis: 'x', speed: CAM_SPEED },
      shapes: camShapes(-1.92),
      info: {
        what: 'The second camshaft, which opens the exhaust valves.',
        location: 'On top of the cylinder head on the exhaust side, parallel to the intake camshaft.',
        purpose: 'Times the opening and closing of all eight exhaust valves.',
        how: 'It is driven by the same timing belt as the intake cam. Its lobes are rotated relative to the intake lobes so that exhaust valves open near the end of the power stroke and close just after the intake valves begin to open.',
        connections: ['exhaust-cam-sprocket', 'exhaust-valves', 'valve-springs', 'cylinder-head', 'timing-belt'],
        examples: 'Having separate intake and exhaust camshafts (DOHC) allows each to be timed independently – essential for modern dual-VVT engines.',
        advanced: 'Lobe separation angle ~105–115 cam degrees. Overlap (both valves open near TDC) of ~20–40 crank degrees improves high-rpm scavenging but causes rough idle and raises HC emissions; dual VVT adjusts overlap on the fly and can even provide internal EGR to reduce pumping losses and NOx.',
        facts: ['A DOHC four-cylinder has 16 cam lobes – one per valve.'],
      },
    },
    {
      id: 'valve-cover',
      name: 'Valve Cover (Cam Cover)',
      system: 'valvetrain',
      position: [0, 0.64, 0],
      explode: [0, 0.88, 0],
      shapes: [
        { type: 'box', size: [0.45, 0.08, 0.22], radius: 0.02, material: M.paint('#b3121f') },
        { type: 'box', size: [0.45, 0.006, 0.226], radius: 0.002, position: [0, -0.038, 0], material: M.rubber() },
        { type: 'box', size: [0.38, 0.006, 0.01], radius: 0.002, position: [0, 0.041, -0.06], array: { count: 2, offset: [0, 0, 0.12] }, material: M.brushed() },
        { type: 'cylinder', radius: 0.016, height: 0.004, segments: 24, position: [XS[0], 0.0405, 0], array: ROW4, material: M.rubber() },
        { type: 'cylinder', radius: 0.022, height: 0.016, segments: 24, position: [-0.19, 0.046, 0.06], material: M.plastic('#1b1c1f') },
        { type: 'cylinder', radius: 0.004, height: 0.012, position: [-0.21, 0.04, -0.105], array: { count: 6, offset: [0.084, 0, 0] }, material: M.chrome() },
      ],
      info: {
        what: 'The painted lid on the very top of the engine that covers the camshafts and valves.',
        location: 'Bolted to the top of the cylinder head; the ignition coils plug through it.',
        purpose: 'Keeps the oil splashing around the camshafts inside the engine and keeps dirt out.',
        how: 'A rubber gasket seals its edge to the head. Inside, baffles separate oil mist from crankcase gases, which are drawn back into the intake by the PCV (positive crankcase ventilation) system to be burnt. The oil filler cap sits on top.',
        connections: ['cylinder-head', 'ignition-coils', 'intake-camshaft', 'exhaust-camshaft'],
        examples: 'Performance cars often paint this cover red (Ferrari "Testa Rossa" literally means "red head").',
        advanced: 'Usually glass-filled polyamide or cast magnesium/aluminium. It often integrates the PCV oil separator, cam position sensor mounts and coil retention. A leaking cover gasket is one of the most common sources of burning-oil smells.',
        facts: ['Oil is added through the cap on this cover, not into the sump directly.'],
      },
    },

    // ------------------------------------------------------------ ignition
    {
      id: 'spark-plugs',
      name: 'Spark Plugs (×4)',
      system: 'ignition',
      position: [0, 0.56, 0],
      explode: [0, 0.8, 0],
      shapes: [
        { type: 'cylinder', radius: 0.007, height: 0.019, segments: 16, position: [XS[0], -0.04, 0], array: ROW4, material: M.metal('#9aa3ad') },
        { type: 'cylinder', radius: 0.0105, height: 0.01, segments: 6, position: [XS[0], -0.025, 0], array: ROW4, material: M.chrome() },
        { type: 'cylinder', radius: 0.006, height: 0.065, segments: 16, position: [XS[0], 0.0125, 0], array: ROW4, material: M.plastic('#f2efe8') },
        { type: 'cylinder', radius: 0.003, height: 0.012, segments: 10, position: [XS[0], 0.05, 0], array: ROW4, material: M.chrome() },
        { type: 'box', size: [0.006, 0.003, 0.002], position: [XS[0] + 0.001, -0.051, 0], array: ROW4, material: M.metal() },
      ],
      info: {
        what: 'Small devices that make an electric spark inside each cylinder to ignite the fuel.',
        location: 'Screwed into the centre of each combustion chamber, down long wells between the two camshafts.',
        purpose: 'Start the combustion of the compressed air-fuel mixture at precisely the right instant.',
        how: 'The ignition coil sends tens of thousands of volts down the plug’s centre electrode. The voltage jumps the tiny gap to the ground electrode as a spark, lighting a flame kernel that spreads through the chamber in about 2 milliseconds.',
        connections: ['ignition-coils', 'cylinder-head', 'crank-position-sensor'],
        examples: 'Petrol lawnmowers, motorbikes and outboard motors all use spark plugs; diesel engines do not – they ignite by compression alone.',
        advanced: 'Iridium or platinum fine-wire centre electrode, gap ~0.7–1.1 mm, firing voltage 15–30 kV. The ECU sets spark advance (~10–40° BTDC) so peak pressure occurs ~14° ATDC regardless of rpm. Too much advance causes knock (detonation), which a knock sensor detects and the ECU corrects by retarding timing. Heat range is chosen so the tip self-cleans (>450 °C) without causing pre-ignition (>850 °C).',
        facts: ['A spark plug fires roughly 3,000 times per minute at highway cruising speed.'],
      },
    },
    {
      id: 'ignition-coils',
      name: 'Ignition Coils (Coil-on-Plug)',
      system: 'ignition',
      position: [0, 0.7, 0],
      explode: [0, 1.05, 0],
      shapes: [
        { type: 'box', size: [0.032, 0.04, 0.055], radius: 0.006, position: [XS[0], 0, 0], array: ROW4, material: M.plastic('#202328') },
        { type: 'box', size: [0.018, 0.016, 0.02], radius: 0.003, position: [XS[0], 0.006, 0.037], array: ROW4, material: M.plastic('#3a3d44') },
        { type: 'cylinder', radius: 0.0095, height: 0.05, segments: 16, position: [XS[0], -0.043, 0], array: ROW4, material: M.rubber() },
        { type: 'tube', radius: 0.004, radialSegments: 8, points: [[-0.2, 0.01, 0.05], [XS[0], 0.012, 0.05], [XS[3], 0.012, 0.05], [0.21, 0.0, 0.07]], material: M.wire('#1d1f24') },
      ],
      info: {
        what: 'Four small transformers, one sitting directly on top of each spark plug.',
        location: 'Plugged through the valve cover into the spark-plug wells, one per cylinder.',
        purpose: 'Turn the car’s 12-volt supply into the 20,000–40,000 volts needed to fire a spark plug.',
        how: 'Current flows through a primary winding of a few hundred turns, building a magnetic field. When the ECU suddenly switches it off, the field collapses and induces a huge voltage in the secondary winding of thousands of turns, which is delivered straight down into the plug.',
        connections: ['spark-plugs', 'crank-position-sensor', 'valve-cover'],
        examples: 'Older cars used one coil with a distributor and plug leads; "coil-on-plug" is now standard.',
        advanced: 'Turns ratio ~1:100. "Dwell time" (charging time, ~2–4 ms) is controlled by the ECU’s igniter transistors so the coil reaches full energy (~50–100 mJ) at any battery voltage and rpm. Individual coils allow cylinder-selective timing and misfire detection via ionisation current.',
        facts: ['The voltage from an ignition coil is higher than the supply to most household electrical grids.'],
      },
    },
    {
      id: 'crank-position-sensor',
      name: 'Crankshaft Position Sensor',
      system: 'ignition',
      position: [-0.205, 0.25, 0.13],
      explode: [-0.05, 0, 0.22],
      shapes: [
        { type: 'cylinder', radius: 0.008, height: 0.04, rotation: [PI / 2, 0, 0], position: [0, 0, -0.01], material: M.metal('#8b939c') },
        { type: 'box', size: [0.022, 0.02, 0.025], radius: 0.004, position: [0, 0, 0.018], material: M.plastic('#1f2125') },
        { type: 'box', size: [0.034, 0.008, 0.012], radius: 0.002, position: [0.012, -0.012, 0.012], material: M.plastic('#1f2125') },
        { type: 'tube', radius: 0.0025, radialSegments: 6, points: [[0, 0.01, 0.03], [0.03, 0.05, 0.05], [0.09, 0.1, 0.06]], material: M.wire('#1d1f24') },
      ],
      info: {
        what: 'A magnetic sensor that tells the engine computer exactly where the crankshaft is and how fast it is turning.',
        location: 'Mounted in the rear of the engine block, pointing at a toothed reluctor ring on the crankshaft.',
        purpose: 'Provides the master timing signal for fuel injection and ignition.',
        how: 'As each tooth of the toothed ring passes the sensor’s tip, it changes the magnetic field and the sensor produces a pulse. A deliberately missing tooth marks a reference position, so the computer can count teeth and know the crank angle to within a fraction of a degree.',
        connections: ['crankshaft', 'flywheel', 'ignition-coils', 'fuel-rail', 'spark-plugs'],
        examples: 'If this sensor fails, most cars will crank but not start at all – the computer cannot time the spark.',
        advanced: 'Hall-effect or variable-reluctance sensor reading a 60-2 tooth wheel (6° per tooth). Combined with the cam position sensor it distinguishes compression TDC from exhaust TDC. Tiny speed fluctuations between teeth are analysed to detect misfires (OBD-II requirement).',
        facts: ['The "60-2" wheel has 58 teeth and a gap where two are missing.'],
      },
    },

    // ------------------------------------------------------------ timing drive
    {
      id: 'crank-sprocket',
      name: 'Crankshaft Timing Sprocket',
      system: 'timing',
      position: [TB_X, CRANK_Y, 0],
      explode: [0.28, 0, 0],
      anim: { type: 'spin', axis: 'x', speed: CRANK_SPEED },
      shapes: [
        { type: 'gear', radius: 0.028, teeth: 20, toothDepth: 0.004, thickness: 0.018, rotation: ALONG_X, material: M.steel() },
        { type: 'cylinder', radius: 0.032, height: 0.002, rotation: ALONG_X, position: [0.01, 0, 0], array: { count: 2, offset: [-0.02, 0, 0] }, material: M.metal('#8b939c') },
      ],
      info: {
        what: 'A small toothed wheel on the front of the crankshaft that drives the timing belt.',
        location: 'On the crankshaft nose at the front (timing end) of the engine, behind the crank pulley.',
        purpose: 'Drives the camshafts so that valve motion stays perfectly synchronised with piston motion.',
        how: 'Its teeth mesh with the teeth on the inside of the timing belt. Because it has exactly half as many teeth as each cam sprocket, the camshafts turn once for every two crankshaft turns.',
        connections: ['crankshaft', 'timing-belt', 'intake-cam-sprocket', 'exhaust-cam-sprocket'],
        examples: 'Like the small front chainring–rear sprocket pairing on a bicycle, the tooth ratio sets the speed ratio.',
        advanced: 'Ratio 20:40 = 1:2, required because a four-stroke cycle spans 720° of crank rotation but each valve opens once per cycle. Keyed to the crank so timing marks align at TDC cylinder 1. Often also carries the reluctor for the crank sensor on some designs.',
        facts: ['Install it one tooth out and the engine may run badly – or the valves may hit the pistons.'],
      },
    },
    {
      id: 'intake-cam-sprocket',
      name: 'Intake Cam Sprocket (VVT)',
      system: 'timing',
      position: [TB_X, 0.615, 0.055],
      explode: [0.28, 0, 0],
      anim: { type: 'spin', axis: 'x', speed: CAM_SPEED },
      shapes: [
        { type: 'gear', radius: 0.05, teeth: 40, toothDepth: 0.004, thickness: 0.018, rotation: ALONG_X, material: M.steel() },
        { type: 'cylinder', radius: 0.032, height: 0.022, rotation: ALONG_X, position: [0.012, 0, 0], material: M.aluminium() },
        { type: 'cylinder', radius: 0.01, height: 0.006, segments: 6, rotation: ALONG_X, position: [0.025, 0, 0], material: M.chrome() },
      ],
      info: {
        what: 'A large toothed wheel on the end of the intake camshaft, with a variable timing unit inside.',
        location: 'At the timing end of the engine, on the front of the intake camshaft.',
        purpose: 'Receives drive from the timing belt and can shift the intake cam timing while the engine runs.',
        how: 'The belt turns the sprocket. Inside, a vane-type phaser filled with engine oil can rotate the camshaft a few degrees ahead of or behind the sprocket when the ECU switches an oil-control valve, changing when the intake valves open.',
        connections: ['intake-camshaft', 'timing-belt', 'crank-sprocket'],
        examples: 'Toyota calls this VVT-i, Honda VTC, BMW VANOS – all variations on the same idea.',
        advanced: '40 teeth (2× the crank sprocket). Hydraulic vane phaser gives ~40–60 crank degrees of authority with a lock pin for start-up. Advancing intake timing at low rpm increases effective compression and torque; retarding it at light load enables Atkinson-like late intake closing for better efficiency.',
        facts: ['Variable valve timing can be worth 10 % more torque across the rev range.'],
      },
    },
    {
      id: 'exhaust-cam-sprocket',
      name: 'Exhaust Cam Sprocket',
      system: 'timing',
      position: [TB_X, 0.615, -0.055],
      explode: [0.28, 0, 0],
      anim: { type: 'spin', axis: 'x', speed: CAM_SPEED },
      shapes: [
        { type: 'gear', radius: 0.05, teeth: 40, toothDepth: 0.004, thickness: 0.018, rotation: ALONG_X, material: M.steel() },
        { type: 'cylinder', radius: 0.015, height: 0.022, rotation: ALONG_X, position: [0.008, 0, 0], material: M.brushed() },
        { type: 'cylinder', radius: 0.0085, height: 0.022, segments: 16, rotation: ALONG_X, position: [0.002, 0.03, 0],
          array: { count: 4, offset: [0, 0, 0], rotation: [PI / 2, 0, 0] }, material: M.metal('#3b3f46') },
      ],
      info: {
        what: 'The large toothed wheel bolted to the front of the exhaust camshaft.',
        location: 'At the timing end of the engine, beside the intake cam sprocket.',
        purpose: 'Transfers drive from the timing belt to the exhaust camshaft.',
        how: 'It has the same number of teeth as the intake sprocket, so both camshafts turn at exactly half crankshaft speed and stay locked in step with the pistons.',
        connections: ['exhaust-camshaft', 'timing-belt', 'timing-tensioner'],
        examples: 'Timing marks on this sprocket line up with marks on the head when cylinder 1 is at top dead centre.',
        advanced: 'Lightening holes reduce rotating inertia. On dual-VVT engines this sprocket also contains a phaser so exhaust timing (and therefore valve overlap/internal EGR) can be optimised separately.',
        facts: ['Sprockets for belts are called "pulleys" by some manufacturers and "sprockets" when used with chains.'],
      },
    },
    {
      id: 'timing-belt',
      name: 'Timing Belt',
      system: 'timing',
      position: [0, 0, 0],
      explode: [0.36, 0, 0],
      shapes: [
        { type: 'tube', points: timingBeltPts, closed: true, radius: 0.0055, radialSegments: 8, segments: 260, scale: [3, 1, 1], position: [TB_X * -2, 0, 0], material: M.rubber() },
      ],
      info: {
        what: 'A toothed rubber belt that links the crankshaft to both camshafts.',
        location: 'On the front (timing end) of the engine, looping around the crank sprocket, the tensioner and both cam sprockets.',
        purpose: 'Keeps the valves perfectly in time with the pistons.',
        how: 'Teeth moulded on the inside of the belt lock into the sprocket teeth so it can never slip. As the crankshaft turns, the belt drags the camshafts around at half speed. A spring-loaded tensioner keeps it tight.',
        connections: ['crank-sprocket', 'intake-cam-sprocket', 'exhaust-cam-sprocket', 'timing-tensioner'],
        examples: 'Many owners’ manuals call for a timing-belt change every 100,000–160,000 km; some engines use a longer-lasting metal chain instead.',
        advanced: 'HNBR rubber reinforced with glass or aramid cords, trapezoidal or curvilinear teeth (~8 mm pitch). In an "interference" engine the valves and pistons occupy the same space at different times, so a snapped belt lets them collide – bending valves and sometimes destroying pistons. Chains (duplex or silent inverted-tooth) last the engine’s life but are noisier and need oil.',
        facts: ['A snapped timing belt in an interference engine can wreck it in a single revolution.'],
      },
    },
    {
      id: 'timing-tensioner',
      name: 'Timing Belt Tensioner',
      system: 'timing',
      position: [TB_X, 0.43, -0.083],
      explode: [0.32, 0, -0.04],
      shapes: [
        { type: 'cylinder', radius: 0.0145, height: 0.022, rotation: ALONG_X, material: M.plastic('#d8dadd') },
        { type: 'cylinder', radius: 0.006, height: 0.026, rotation: ALONG_X, material: M.chrome() },
        { type: 'box', size: [0.01, 0.07, 0.02], radius: 0.004, position: [-0.014, -0.03, 0.012], rotation: [0.35, 0, 0], material: M.aluminium() },
        { type: 'cylinder', radius: 0.009, height: 0.012, rotation: ALONG_X, position: [-0.014, -0.062, 0.024], material: M.brushed() },
      ],
      info: {
        what: 'A spring-loaded pulley that presses against the timing belt to keep it tight.',
        location: 'On the exhaust side of the timing drive, between the crank sprocket and the exhaust cam sprocket.',
        purpose: 'Maintains the correct belt tension as the belt stretches and the engine heats up.',
        how: 'A spring (or a small hydraulic plunger) pushes a smooth pulley against the back of the belt on its slack side, taking up any looseness so the belt teeth cannot jump.',
        connections: ['timing-belt', 'exhaust-cam-sprocket', 'crank-sprocket'],
        examples: 'Tensioners and idlers are always replaced together with the belt during a timing-belt service.',
        advanced: 'Automatic eccentric tensioners use a torsion spring and friction damper; the hydraulic type uses an oil-filled damper to absorb the torsional oscillations caused by cam torque reversals, which would otherwise cause belt flap and tooth wear. Set with the engine cold to a pointer mark.',
        facts: ['A worn tensioner bearing often warns of failure with a whine or chirp.'],
      },
    },

    // ------------------------------------------------------------ intake & fuel
    {
      id: 'intake-manifold',
      name: 'Intake Manifold',
      system: 'intake',
      position: INT_O,
      explode: [0, 0.38, 0.3],
      shapes: [
        ...intakeRunners,
        { type: 'capsule', radius: 0.042, length: 0.36, rotation: ALONG_X, position: [0, 0.065, 0.02], material: M.plastic('#2b2e34') },
        { type: 'box', size: [0.43, 0.045, 0.01], radius: 0.003, position: [0, -0.065, -0.062], material: M.plastic('#26292e') },
        { type: 'box', size: [0.38, 0.006, 0.006], position: [0, 0.103, 0.02], array: { count: 2, offset: [0, 0.004, 0.02] }, material: M.plastic('#33373e') },
      ],
      info: {
        what: 'A set of four curved pipes joined to a common chamber that delivers air to each cylinder.',
        location: 'Bolted to the intake side (+Z) of the cylinder head, arching up to a plenum chamber running alongside the engine.',
        purpose: 'Distributes incoming air evenly to all four cylinders and tunes the airflow for better breathing.',
        how: 'Air from the throttle body fills the plenum. When an intake valve opens, the descending piston draws air from the plenum down that cylinder’s runner. The length of each runner is chosen so that pressure waves bouncing inside it arrive at the valve just as it is about to close, cramming in extra air.',
        connections: ['throttle-body', 'cylinder-head', 'intake-valves', 'fuel-rail', 'air-filter'],
        examples: 'Some engines switch between long and short runners (variable-length intake) for both low-down torque and top-end power.',
        advanced: 'Usually glass-filled nylon (PA6-GF30): light, smooth and insulating so the charge stays cool and dense. Runner tuning follows Helmholtz/quarter-wave theory – longer runners suit lower rpm. Volumetric efficiency of a well-tuned NA engine can exceed 100 % near the torque peak. The plenum also hosts the MAP sensor, PCV and brake-booster vacuum ports.',
        facts: ['At full throttle a 2-litre engine at 6,000 rpm swallows roughly 100 litres of air per second.'],
      },
    },
    {
      id: 'throttle-body',
      name: 'Throttle Body',
      system: 'intake',
      position: [0.245, 0.665, 0.19],
      explode: [0.12, 0.38, 0.36],
      shapes: [
        { type: 'cylinder', radius: 0.032, height: 0.045, rotation: ALONG_X, material: M.aluminium() },
        { type: 'cylinder', radius: 0.026, height: 0.0025, rotation: [0, 0, PI / 2 - 0.5], material: M.brushed('#d6dadf') },
        { type: 'box', size: [0.035, 0.05, 0.035], radius: 0.006, position: [0, -0.01, 0.042], material: M.plastic('#1f2226') },
        { type: 'box', size: [0.01, 0.075, 0.075], radius: 0.004, position: [-0.024, 0, 0], material: M.aluminium() },
      ],
      info: {
        what: 'A valve – basically a round flap – that controls how much air enters the engine.',
        location: 'At the front end of the intake manifold plenum, between the air filter duct and the manifold.',
        purpose: 'Sets engine power: the more it opens, the more air (and therefore fuel) the engine can burn.',
        how: 'When you press the accelerator, the engine computer commands an electric motor to rotate the butterfly flap open. At idle it is almost closed; at full throttle it is edge-on to the airflow. A sensor reports its exact angle back to the computer.',
        connections: ['intake-manifold', 'air-filter'],
        examples: '"Full throttle" literally means this flap is wide open.',
        advanced: 'Drive-by-wire: accelerator pedal position sensor → ECU torque model → DC motor with dual redundant throttle position sensors. Part-throttle operation creates manifold vacuum, causing "pumping losses" – a key reason petrol engines are less efficient at light load than diesels (which have no throttle). VVT and turbo downsizing aim to reduce this throttling.',
        facts: ['At idle the manifold behind the throttle sits at about one-third of atmospheric pressure.'],
      },
    },
    {
      id: 'air-filter',
      name: 'Air Filter Box',
      system: 'intake',
      position: [0.37, 0.55, 0.19],
      explode: [0.22, 0.38, 0.45],
      shapes: [
        { type: 'box', size: [0.12, 0.08, 0.16], radius: 0.012, position: [0, -0.02, 0], material: M.plastic('#1f2226') },
        { type: 'box', size: [0.124, 0.012, 0.164], radius: 0.004, position: [0, 0.024, 0], material: M.plastic('#e0c36a') },
        { type: 'box', size: [0.12, 0.03, 0.16], radius: 0.01, position: [0, 0.045, 0], material: M.plastic('#2a2d33') },
        { type: 'tube', radius: 0.026, radialSegments: 16, points: rel([[0.27, 0.665, 0.19], [0.33, 0.67, 0.19], [0.365, 0.64, 0.19], [0.37, 0.605, 0.19]], [0.37, 0.55, 0.19]), material: M.rubber() },
        { type: 'cylinder', radius: 0.028, height: 0.05, rotation: [PI / 2, 0, 0], position: [0, -0.03, -0.1], material: M.plastic('#1f2226') },
      ],
      info: {
        what: 'A plastic box containing a pleated paper filter that cleans the air before it enters the engine.',
        location: 'At the front of the engine, connected to the throttle body by a rubber duct.',
        purpose: 'Stops dust, sand and insects from entering the cylinders where they would act like sandpaper.',
        how: 'Outside air enters through the snorkel, passes through the folded filter element (yellow), and the clean air flows through the duct to the throttle body. A mass-airflow sensor in the duct measures how much air passes.',
        connections: ['throttle-body', 'intake-manifold'],
        examples: 'A clogged filter makes the engine feel sluggish; it is a cheap part replaced at routine services.',
        advanced: 'Cellulose or synthetic media capturing >99 % of particles >5 µm. The hot-film MAF sensor measures air mass (kg/h) directly, which the ECU divides by 14.7 to compute the base fuel quantity. Intake resonators in the box cancel induction roar at specific frequencies.',
        facts: ['An engine breathes about 10,000 litres of air for every litre of petrol it burns.'],
      },
    },
    {
      id: 'fuel-rail',
      name: 'Fuel Rail & Injectors',
      system: 'intake',
      position: [0, 0.6, 0.14],
      explode: [0, 0.45, 0.2],
      shapes: [
        { type: 'cylinder', radius: 0.009, height: 0.42, rotation: ALONG_X, material: M.brushed() },
        { type: 'cylinder', radius: 0.0075, height: 0.035, segments: 16, position: [XS[0], -0.024, -0.004], rotation: [0.25, 0, 0], array: ROW4, material: M.plastic('#3a6fd8') },
        { type: 'box', size: [0.012, 0.012, 0.01], radius: 0.002, position: [XS[0], -0.014, 0.01], array: ROW4, material: M.plastic('#1f2226') },
        { type: 'cylinder', radius: 0.0035, height: 0.015, segments: 10, position: [XS[0], -0.047, -0.01], rotation: [0.25, 0, 0], array: ROW4, material: M.chrome() },
        { type: 'tube', radius: 0.004, radialSegments: 8, points: [[0.21, 0, 0], [0.24, 0.01, 0.01], [0.27, 0.0, 0.05], [0.3, -0.05, 0.08]], material: M.steel() },
      ],
      info: {
        what: 'A metal pipe carrying pressurised petrol, feeding four electronically controlled injectors – one per cylinder.',
        location: 'Along the intake side of the cylinder head, tucked beneath the intake runners, with each injector aimed into an intake port.',
        purpose: 'Delivers exactly the right amount of fuel to each cylinder for clean, efficient combustion.',
        how: 'The fuel pump in the tank keeps the rail full at constant pressure. When the engine computer energises an injector’s solenoid, a tiny needle lifts and a fine mist of fuel sprays toward the back of the intake valves. The longer it stays open, the more fuel is delivered.',
        connections: ['intake-manifold', 'intake-valves', 'cylinder-head', 'crank-position-sensor', 'o2-sensor'],
        examples: 'Fuel injection replaced carburettors in most cars during the late 1980s and 1990s.',
        advanced: 'Port fuel injection at ~3–4 bar; pulse widths 2–20 ms. The ECU targets the stoichiometric air–fuel ratio of 14.7:1 by mass (λ = 1) so the three-way catalyst can work, using the O2 sensor for closed-loop trim. Direct-injection (GDI) versions run 200–350 bar straight into the cylinder, allowing higher compression thanks to charge cooling.',
        facts: ['A single injector can open and close over 100 times per second.'],
      },
    },

    // ------------------------------------------------------------ exhaust
    {
      id: 'exhaust-manifold',
      name: 'Exhaust Manifold (Header)',
      system: 'exhaust',
      position: EXH_O,
      explode: [0, 0.38, -0.3],
      shapes: [
        ...exhaustRunners,
        { type: 'box', size: [0.43, 0.045, 0.01], radius: 0.003, position: [0, 0.085, 0.058], material: M.metal('#7d6656') },
        { type: 'cylinder', radius: 0.03, height: 0.05, position: [0, -0.04, -0.05], material: M.metal('#8d6e57') },
        { type: 'tube', radius: 0.026, radialSegments: 14, points: rel([[0, 0.41, -0.21], [0, 0.33, -0.215], [0.01, 0.25, -0.22], [0.03, 0.18, -0.22]], EXH_O), material: M.metal('#7a6a5e') },
        { type: 'cylinder', radius: 0.045, height: 0.008, position: [0.03, -0.27, -0.06], material: M.metal('#6f7885') },
        { type: 'box', size: [0.42, 0.11, 0.004], radius: 0.002, position: [0, 0.04, -0.075], rotation: [0.35, 0, 0], material: DOUBLE(M.brushed('#c9ced4')) },
      ],
      info: {
        what: 'A set of pipes that collects the hot exhaust gas from all four cylinders into one outlet.',
        location: 'Bolted to the exhaust side (−Z) of the cylinder head, curving down into the downpipe.',
        purpose: 'Carries burnt gas away from the engine towards the catalytic converter and silencer.',
        how: 'Each cylinder’s exhaust port feeds its own pipe ("runner"). The runners merge into a collector. Pulses from cylinders that fire 360° apart are paired so that one pulse’s low-pressure wake helps suck the next cylinder’s gas out (scavenging). A heat shield protects nearby parts.',
        connections: ['cylinder-head', 'exhaust-valves', 'o2-sensor'],
        examples: 'Performance "4-2-1" headers use carefully matched pipe lengths to improve scavenging.',
        advanced: 'Stainless-steel tubular or cast-iron, sometimes integrated into the head with a water jacket for faster catalyst light-off and turbo protection. Exhaust gas leaves at ~800–950 °C under load. A close-coupled three-way catalyst downstream converts CO, HC and NOx (>98 % efficient once above ~300 °C) – which only works within ±1 % of λ = 1.',
        facts: ['Exhaust manifolds can glow cherry-red during a hard dyno pull.'],
      },
    },
    {
      id: 'o2-sensor',
      name: 'Oxygen (Lambda) Sensor',
      system: 'exhaust',
      position: [0, 0.39, -0.245],
      explode: [0, 0.38, -0.46],
      shapes: [
        { type: 'cylinder', radius: 0.009, height: 0.012, segments: 6, rotation: [PI / 2, 0, 0], position: [0, 0, 0.01], material: M.chrome() },
        { type: 'cylinder', radius: 0.0065, height: 0.03, rotation: [PI / 2, 0, 0], position: [0, 0, -0.01], material: M.brushed() },
        { type: 'tube', radius: 0.0025, radialSegments: 6, points: [[0, 0, -0.025], [0, 0.03, -0.05], [0.06, 0.1, -0.05], [0.12, 0.13, -0.03]], material: M.wire('#2a2d33') },
      ],
      info: {
        what: 'A sensor screwed into the exhaust that measures how much oxygen is left in the exhaust gas.',
        location: 'In the exhaust collector/downpipe, just after the manifold runners join.',
        purpose: 'Tells the engine computer whether the engine is burning too much fuel (rich) or too little (lean).',
        how: 'A ceramic element compares the oxygen in the exhaust with outside air and produces a voltage. The computer constantly adjusts injector pulse width to keep the mixture right at the chemically ideal ratio.',
        connections: ['exhaust-manifold', 'fuel-rail'],
        examples: 'A faulty O2 sensor is one of the most common reasons for a "check engine" light and increased fuel consumption.',
        advanced: 'Zirconia (ZrO₂) Nernst cell: ~0.9 V when rich, ~0.1 V when lean, switching sharply at λ = 1 (14.7:1). Wideband sensors add an oxygen-pumping cell to measure λ from ~0.7–∞ linearly. A second sensor after the catalyst monitors its oxygen-storage capacity for OBD. Heated to ~700 °C for fast operation.',
        facts: ['Burning petrol perfectly needs 14.7 kg of air for every 1 kg of fuel.'],
      },
    },

    // ------------------------------------------------------------ cooling
    {
      id: 'water-pump',
      name: 'Water Pump',
      system: 'cooling',
      position: [0.245, 0.4, 0],
      explode: [0.4, 0, 0],
      anim: { type: 'spin', axis: 'x', speed: CRANK_SPEED * 1.2 },
      shapes: [
        { type: 'cylinder', radius: 0.032, height: 0.026, rotation: ALONG_X, position: [-0.006, 0, 0], material: M.aluminium() },
        { type: 'cylinder', radius: 0.008, height: 0.03, rotation: ALONG_X, position: [0.015, 0, 0], material: M.brushed() },
        { type: 'cylinder', radius: 0.042, height: 0.016, rotation: ALONG_X, position: [0.03, 0, 0], material: M.steel() },
        { type: 'box', size: [0.004, 0.018, 0.034], position: [0.039, 0.012, 0], array: { count: 3, offset: [0, 0, 0], rotation: [(2 * PI) / 3, 0, 0] }, material: M.steel('#5d6570') },
      ],
      info: {
        what: 'A belt-driven pump that circulates coolant through the engine and radiator.',
        location: 'On the front of the engine block, driven by the serpentine accessory belt.',
        purpose: 'Keeps coolant flowing so heat from combustion is carried away to the radiator.',
        how: 'The pulley spins an impeller (a small fan-like wheel) inside the pump housing. Centrifugal force flings coolant outwards into the block’s water jacket; it flows up through the head, out through the thermostat to the radiator, and back to the pump.',
        connections: ['serpentine-belt', 'engine-block', 'thermostat', 'cylinder-head'],
        examples: 'A leaking or failed water pump is a common cause of overheating; many are replaced along with the timing belt.',
        advanced: 'Centrifugal pump moving ~100–200 L/min at high rpm. Coolant is ~50/50 ethylene glycol and water: boiling point raised to ~129 °C under a 1.1-bar pressurised cap and freezing point lowered to −37 °C. Roughly one-third of the fuel energy ends up in the cooling system. Modern engines may use electric or switchable pumps for faster warm-up.',
        facts: ['Of the fuel’s chemical energy, only about 30–38 % becomes useful work; most of the rest is heat.'],
      },
    },
    {
      id: 'thermostat',
      name: 'Thermostat Housing',
      system: 'cooling',
      position: [-0.235, 0.57, 0.04],
      explode: [-0.25, 0.38, 0.05],
      shapes: [
        { type: 'box', size: [0.03, 0.045, 0.06], radius: 0.006, material: M.aluminium() },
        { type: 'cylinder', radius: 0.018, height: 0.03, rotation: ALONG_X, position: [-0.025, 0.005, 0], material: M.aluminium() },
        { type: 'tube', radius: 0.017, radialSegments: 14, points: [[-0.035, 0.005, 0], [-0.07, 0.01, 0.01], [-0.1, -0.02, 0.05]], material: M.rubber() },
        { type: 'cylinder', radius: 0.004, height: 0.03, rotation: ALONG_X, position: [0.0, 0.02, -0.022], material: M.brass() },
      ],
      info: {
        what: 'A heat-sensitive valve that controls when coolant flows to the radiator.',
        location: 'In a housing on the rear end of the cylinder head, where the top radiator hose connects.',
        purpose: 'Helps the engine warm up quickly and then holds it at its ideal operating temperature.',
        how: 'Inside is a wax pellet. When the engine is cold the valve stays shut, so coolant only circulates inside the engine and it warms up fast. At about 90 °C the wax melts and expands, pushing the valve open so hot coolant flows to the radiator to be cooled.',
        connections: ['water-pump', 'cylinder-head', 'engine-block'],
        examples: 'A thermostat stuck open makes the heater blow cold air in winter; stuck shut, the engine overheats.',
        advanced: 'Wax-element thermostat opening at ~87–92 °C, fully open ~10 °C higher. Electronically mapped thermostats heat the wax with a resistor to lower the target to ~85 °C at high load (protecting against knock) and allow ~105–110 °C at light load (less friction, better economy). The housing also hosts the coolant temperature sensor (brass).',
        facts: ['A cold engine uses noticeably more fuel and wears faster – the thermostat minimises that time.'],
      },
    },

    // ------------------------------------------------------------ accessories
    {
      id: 'alternator',
      name: 'Alternator',
      system: 'accessories',
      position: [0.16, 0.34, 0.17],
      explode: [0.15, 0, 0.3],
      shapes: [
        { type: 'cylinder', radius: 0.055, height: 0.09, rotation: ALONG_X, material: M.aluminium() },
        { type: 'cylinder', radius: 0.056, height: 0.006, rotation: ALONG_X, position: [-0.035, 0, 0], array: { count: 6, offset: [0.014, 0, 0] }, material: M.brushed('#9fa6ae') },
        { type: 'cylinder', radius: 0.026, height: 0.022, rotation: ALONG_X, position: [SB_X - 0.16, 0, 0], material: M.steel() },
        { type: 'cylinder', radius: 0.008, height: 0.07, rotation: ALONG_X, position: [0.08, 0, 0], material: M.brushed() },
        { type: 'box', size: [0.03, 0.02, 0.025], radius: 0.004, position: [-0.05, 0.03, 0.02], material: M.plastic('#202328') },
        { type: 'box', size: [0.02, 0.02, 0.07], radius: 0.004, position: [0, 0.0, -0.06], material: M.aluminium() },
      ],
      info: {
        what: 'A small electrical generator driven by the engine.',
        location: 'On the front intake-side corner of the engine, driven by the serpentine belt.',
        purpose: 'Recharges the battery and powers the car’s electrical systems while the engine runs.',
        how: 'The belt spins a magnetised rotor inside fixed copper windings (the stator), generating alternating current. Diodes inside convert it to direct current, and a regulator holds the output at about 14 volts.',
        connections: ['serpentine-belt', 'crank-pulley', 'starter-motor'],
        examples: 'A battery warning light on the dash usually means the alternator has stopped charging.',
        advanced: 'Claw-pole synchronous machine with a three-phase stator and six-diode rectifier, ~120–180 A output, ~60–70 % efficient. Pulley ratio ~2.5–3:1 so it reaches useful output at idle. Smart charging lets the ECU de-excite the field during acceleration and charge during deceleration to save fuel; many use an overrunning alternator decoupler pulley to smooth belt loads.',
        facts: ['At full load an alternator can absorb 3–4 hp from the engine.'],
      },
    },
    {
      id: 'starter-motor',
      name: 'Starter Motor',
      system: 'accessories',
      position: [-0.16, 0.2, -0.145],
      explode: [-0.12, -0.02, -0.22],
      shapes: [
        { type: 'cylinder', radius: 0.04, height: 0.11, rotation: ALONG_X, material: M.metal('#3a3d42') },
        { type: 'cylinder', radius: 0.022, height: 0.08, rotation: ALONG_X, position: [0.0, 0.05, -0.01], material: M.brushed() },
        { type: 'cylinder', radius: 0.03, height: 0.03, rotation: ALONG_X, position: [-0.065, 0, 0], material: M.aluminium() },
        { type: 'gear', radius: 0.016, teeth: 10, toothDepth: 0.004, thickness: 0.016, rotation: ALONG_X, position: [-0.076, 0, 0], material: M.steel() },
        { type: 'cylinder', radius: 0.004, height: 0.012, position: [0.035, 0.074, -0.01], material: M.copper() },
      ],
      info: {
        what: 'A powerful electric motor that spins the engine to start it.',
        location: 'Low on the rear exhaust side of the engine, with its small gear facing the flywheel.',
        purpose: 'Turns the crankshaft fast enough for the engine to begin running on its own.',
        how: 'When you turn the key or press Start, the solenoid (the smaller cylinder on top) pushes a small pinion gear into the flywheel’s ring gear and connects battery power to the motor. The motor cranks the engine at ~200 rpm until it fires; a one-way clutch then lets the pinion spin freely and it retracts.',
        connections: ['flywheel', 'alternator', 'crankshaft'],
        examples: 'The "rrr-rrr-rrr" sound before an engine catches is the starter motor working.',
        advanced: 'Permanent-magnet DC motor with planetary gear reduction, ~1–1.5 kW, drawing 150–250 A briefly. The pinion-to-ring-gear ratio of ~10–15:1 multiplies torque further. Stop-start systems use reinforced starters rated for ~300,000 starts, or belt-driven starter-generators instead.',
        facts: ['The starter draws more current than any other component in a car – enough to dim the headlights.'],
      },
    },
    {
      id: 'crank-pulley',
      name: 'Crankshaft Pulley (Harmonic Damper)',
      system: 'accessories',
      position: [SB_X, CRANK_Y, 0],
      explode: [0.42, 0, 0],
      anim: { type: 'spin', axis: 'x', speed: CRANK_SPEED },
      shapes: [
        { type: 'cylinder', radius: 0.062, height: 0.022, rotation: ALONG_X, material: M.steel('#5d6570') },
        { type: 'torus', radius: 0.062, tube: 0.0018, radialSegments: 6, tubularSegments: 48, rotation: RING_X, position: [-0.008, 0, 0], array: { count: 5, offset: [0.004, 0, 0] }, material: M.steel('#4a525c') },
        { type: 'cylinder', radius: 0.045, height: 0.024, rotation: ALONG_X, position: [-0.003, 0, 0], material: M.rubber() },
        { type: 'cylinder', radius: 0.02, height: 0.03, rotation: ALONG_X, position: [0.004, 0, 0], material: M.brushed() },
        { type: 'cylinder', radius: 0.01, height: 0.008, segments: 6, rotation: ALONG_X, position: [0.022, 0, 0], material: M.chrome() },
      ],
      info: {
        what: 'A grooved pulley on the front of the crankshaft that drives the accessory belt, with a rubber-mounted damper ring.',
        location: 'The very front of the crankshaft, in front of the timing sprocket.',
        purpose: 'Powers the alternator and water pump, and absorbs twisting vibrations in the crankshaft.',
        how: 'The ribbed outer rim drives the serpentine belt. Between the hub and the outer ring is a layer of rubber: when the crankshaft twists back and forth slightly with each power stroke, the heavy ring lags behind and the rubber soaks up the vibration as heat.',
        connections: ['crankshaft', 'serpentine-belt', 'alternator', 'water-pump'],
        examples: 'Also called a "harmonic balancer"; if its rubber perishes, the outer ring can slip or even fly off.',
        advanced: 'Tuned torsional vibration damper (TVD): inertia ring + elastomer spring tuned to the crank’s first torsional mode (often ~300–500 Hz), reducing amplitude at resonance by up to 70 %. Its rim usually carries the ignition-timing marks used with a timing light.',
        facts: ['Without a damper, crankshafts can crack from torsional fatigue at certain rpm.'],
      },
    },
    {
      id: 'serpentine-belt',
      name: 'Serpentine Belt & Idler',
      system: 'accessories',
      position: [0, 0, 0],
      explode: [0.47, 0, 0],
      shapes: [
        { type: 'tube', points: serpPts, closed: true, radius: 0.005, radialSegments: 8, segments: 260, material: M.rubber() },
        { type: 'cylinder', radius: 0.025, height: 0.02, rotation: ALONG_X, position: [SB_X, 0.36, -0.085], material: M.plastic('#d8dadd') },
        { type: 'cylinder', radius: 0.007, height: 0.024, rotation: ALONG_X, position: [SB_X, 0.36, -0.085], material: M.chrome() },
      ],
      info: {
        what: 'A single long, ribbed rubber belt that snakes around several pulleys at the front of the engine.',
        location: 'The outermost layer at the front of the engine, looping around the crank pulley, an idler, the water pump and the alternator.',
        purpose: 'Transfers power from the crankshaft to the engine’s accessories.',
        how: 'The crank pulley turns the belt; the belt’s ribs grip the grooves of each accessory pulley. An idler pulley sets its path and wrap angle so it does not slip. One belt replaces the several separate V-belts older cars used.',
        connections: ['crank-pulley', 'alternator', 'water-pump'],
        examples: 'A squealing noise at start-up is often a worn or loose serpentine belt.',
        advanced: 'EPDM poly-V belt with 5–7 ribs and polyester cords, transmitting ~5–10 kW. Wrap angle and an automatic tensioner keep slip below ~1–2 %. Many cars also drive the A/C compressor and power-steering pump with it; on newer cars those are often electric.',
        facts: ['It is called "serpentine" because of its snake-like path.'],
      },
    },
  ],

  steps: [
    {
      title: '1 · Intake stroke',
      text: 'The piston slides down while the intake valves are open. The falling piston lowers the pressure in the cylinder, so air rushes in through the air filter, throttle body and intake manifold. The fuel injector sprays petrol into the port, mixing it with the air at about 14.7 parts air to 1 part fuel by weight.',
      focus: ['air-filter', 'throttle-body', 'intake-manifold', 'fuel-rail', 'intake-valves', 'piston-1', 'piston-4'],
      explode: 0.15,
      animate: true,
    },
    {
      title: '2 · Compression stroke',
      text: 'Both valves close and the piston rises, squeezing the mixture into about one-eleventh of its original volume (a compression ratio of ~11:1). Compression heats the mixture and packs the molecules tightly so they will burn quickly and release more useful energy.',
      focus: ['piston-1', 'piston-2', 'piston-3', 'piston-4', 'cylinder-head', 'head-gasket', 'cylinder-liners'],
      explode: 0.2,
      animate: true,
    },
    {
      title: '3 · Power stroke (combustion)',
      text: 'Just before the piston reaches the top, the ignition coil fires the spark plug. The flame burns through the mixture in a few milliseconds, pressure jumps to ~60–80 bar and slams the piston down. The connecting rod turns that push into torque on the crankshaft – this is the only stroke that makes power, so the four cylinders take turns in the 1-3-4-2 order.',
      focus: ['spark-plugs', 'ignition-coils', 'piston-1', 'piston-2', 'piston-3', 'piston-4', 'conrod-1', 'conrod-2', 'conrod-3', 'conrod-4', 'crankshaft', 'flywheel'],
      explode: 0.25,
      animate: true,
    },
    {
      title: '4 · Exhaust stroke',
      text: 'Near the bottom of the power stroke the exhaust valves open. The rising piston pushes the burnt gas out into the exhaust manifold, past the oxygen sensor and on to the catalytic converter. Then the cycle starts again – four strokes take two full turns of the crankshaft.',
      focus: ['exhaust-valves', 'exhaust-manifold', 'o2-sensor', 'piston-1', 'piston-4'],
      explode: 0.2,
      animate: true,
    },
    {
      title: '5 · Valve timing',
      text: 'The timing belt links the crankshaft to the two camshafts with a 2:1 ratio, so every valve opens once per four-stroke cycle. Each cam lobe pushes a valve open against its spring at precisely the right crank angle; the variable-timing unit in the intake sprocket shifts this timing as engine speed and load change.',
      focus: ['crank-sprocket', 'timing-belt', 'timing-tensioner', 'intake-cam-sprocket', 'exhaust-cam-sprocket', 'intake-camshaft', 'exhaust-camshaft', 'valve-springs', 'intake-valves', 'exhaust-valves'],
      explode: 0.45,
      animate: true,
    },
    {
      title: '6 · Lubrication',
      text: 'The oil pump draws oil from the sump through a strainer, pushes it through the filter and into galleries in the block. Oil reaches the crankshaft bearings, sprays under the pistons and climbs to the camshafts, then drains back down to the sump. A film thinner than a hair keeps metal from touching metal.',
      focus: ['oil-pan', 'oil-pump', 'oil-filter', 'dipstick', 'crankshaft', 'engine-block'],
      explode: 0.5,
      animate: true,
    },
    {
      title: '7 · Cooling',
      text: 'Only about a third of the fuel’s energy becomes motion – much of the rest is heat. The water pump circulates coolant through jackets around the cylinders and through the head. When the engine reaches ~90 °C the thermostat opens and sends hot coolant to the radiator.',
      focus: ['water-pump', 'thermostat', 'engine-block', 'cylinder-head', 'cylinder-liners'],
      explode: 0.3,
      animate: true,
    },
    {
      title: '8 · Starting & charging',
      text: 'To start, the starter motor spins the flywheel while the crank sensor tells the computer when to inject and spark. Once running, the crank pulley drives the serpentine belt, which turns the alternator to recharge the battery and powers the water pump.',
      focus: ['starter-motor', 'flywheel', 'crank-position-sensor', 'crank-pulley', 'serpentine-belt', 'alternator'],
      explode: 0.35,
      animate: true,
    },
  ],
};
