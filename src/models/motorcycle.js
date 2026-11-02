import { M } from '../three/materials.js';

/*
 * Sport Motorcycle – naked sport bike with an air-cooled parallel-twin engine.
 * Faces +X, wheels on y = 0 in the XY plane, width along Z (+Z = left side).
 * Wheelbase 1.40 m, wheel Ø ≈ 0.63 m, seat height ≈ 0.80 m, rake 24°.
 */

const PI = Math.PI;
const RAKE = (24 * PI) / 180; // steering-head angle from vertical
const WR = 0.315; // wheel (tyre) outer radius
const FX = 0.7; // front axle x
const RX = -0.7; // rear axle x
const AY = WR; // axle height
const CHAIN_Z = 0.145; // chain line (left side)

// Point along the fork axis, `d` metres up from the front axle (relative to the axle).
const fk = (d, z = 0) => [-Math.sin(RAKE) * d, Math.cos(RAKE) * d, z];
// Straight tube member between two absolute points, expressed relative to `o`.
const rod = (o, a, b, radius = 0.013, material = M.paint('#c1121f')) => ({
  type: 'tube',
  points: [a.map((v, i) => v - o[i]), b.map((v, i) => v - o[i])],
  radius,
  segments: 1,
  radialSegments: 8,
  material,
});
const rel = (o, pts) => pts.map((p) => p.map((v, i) => v - o[i]));

// Closed chain loop around the front (gearbox) and rear sprockets, in the plane z = CHAIN_Z.
const FS = [-0.16, 0.36]; // front sprocket centre
const RS = [RX, AY]; // rear sprocket centre
const chainPts = (() => {
  const pts = [];
  const r1 = 0.052;
  const r2 = 0.118;
  for (let i = 0; i <= 8; i++) {
    const a = -PI / 2 + (i / 8) * PI; // front arc (right-hand half, facing +X)
    pts.push([FS[0] + Math.cos(a) * r1, FS[1] + Math.sin(a) * r1]);
  }
  for (let i = 1; i <= 3; i++) {
    const t = i / 4; // top run
    pts.push([FS[0] + (RS[0] - FS[0]) * t, FS[1] + r1 + (RS[1] + r2 - FS[1] - r1) * t]);
  }
  for (let i = 0; i <= 12; i++) {
    const a = PI / 2 + (i / 12) * PI; // rear arc (left-hand half)
    pts.push([RS[0] + Math.cos(a) * r2, RS[1] + Math.sin(a) * r2]);
  }
  for (let i = 1; i <= 3; i++) {
    const t = i / 4; // bottom run
    pts.push([RS[0] + (FS[0] - RS[0]) * t, RS[1] - r2 + (FS[1] - r1 - RS[1] + r2) * t]);
  }
  return pts.map(([x, y]) => [x - (FS[0] + RS[0]) / 2, y - (FS[1] + RS[1]) / 2, 0]);
})();

// Trellis frame nodes (x, y) – upper and lower rails, mirrored at ±z.
const UP = [[0.43, 0.94, 0.035], [0.24, 0.89, 0.12], [0.03, 0.84, 0.135], [-0.16, 0.79, 0.135], [-0.25, 0.6, 0.13]];
const LO = [[0.47, 0.83, 0.035], [0.3, 0.66, 0.125], [0.12, 0.6, 0.135], [-0.08, 0.6, 0.135], [-0.25, 0.44, 0.13]];
const FO = [0, 0.7, 0];
const frameShapes = (() => {
  const red = M.paint('#c1121f');
  const s = [];
  for (const side of [1, -1]) {
    const u = UP.map(([x, y, z]) => [x, y, z * side]);
    const l = LO.map(([x, y, z]) => [x, y, z * side]);
    for (let i = 0; i < u.length - 1; i++) {
      s.push(rod(FO, u[i], u[i + 1], 0.014, red));
      s.push(rod(FO, l[i], l[i + 1], 0.014, red));
      s.push(rod(FO, u[i + 1], l[i], 0.011, red)); // trellis diagonals
    }
    for (let i = 1; i < u.length; i++) s.push(rod(FO, u[i], l[i], 0.011, red));
    // swingarm pivot plate
    s.push({ type: 'box', size: [0.11, 0.16, 0.018], radius: 0.006, position: [-0.25 - FO[0], 0.47 - FO[1], 0.13 * side], material: M.aluminium() });
  }
  s.push(rod(FO, [-0.16, 0.79, 0.135], [-0.16, 0.79, -0.135], 0.012, red));
  s.push(rod(FO, [-0.25, 0.44, 0.13], [-0.25, 0.44, -0.13], 0.015, M.metal()));
  return s;
})();

const SO = [-0.5, 0.82, 0];
const subframeShapes = (() => {
  const s = [];
  const m = M.metal('#3a3d42');
  for (const z of [1, -1]) {
    s.push(rod(SO, [-0.16, 0.79, 0.12 * z], [-0.82, 0.89, 0.07 * z], 0.011, m));
    s.push(rod(SO, [-0.25, 0.6, 0.12 * z], [-0.6, 0.84, 0.09 * z], 0.01, m));
  }
  s.push(rod(SO, [-0.82, 0.89, 0.07], [-0.82, 0.89, -0.07], 0.01, m));
  s.push(rod(SO, [-0.55, 0.83, 0.1], [-0.55, 0.83, -0.1], 0.009, m));
  return s;
})();

const info = (what, location, purpose, how, connections, examples, advanced, facts) => ({
  what, location, purpose, how, connections, examples, advanced, facts,
});

const rotZ = [PI / 2, 0, 0]; // turns a Y-axis primitive so its axis runs along Z
const rotX = [0, 0, PI / 2]; // turns a Y-axis primitive so its axis runs along X
const CYL_TILT = -0.35; // cylinders lean forward ~20°
const CA = [Math.sin(-CYL_TILT), Math.cos(-CYL_TILT)]; // unit cylinder axis (x, y)
const CRANK = [0.03, 0.4];

const wheelShapes = (rearWidth) => [
  { type: 'torus', radius: 0.215, tube: 0.013, scale: [1, 1, rearWidth], radialSegments: 10, material: M.paint('#1d1f24') },
  { type: 'torus', radius: 0.205, tube: 0.006, position: [0, 0, 0.035 * rearWidth], radialSegments: 6, material: M.paint('#c1121f') },
  { type: 'cylinder', radius: 0.055, height: 0.05 * rearWidth + 0.06, rotation: rotZ, material: M.aluminium() },
  { type: 'cylinder', radius: 0.012, height: 0.26, rotation: rotZ, material: M.chrome() },
  { type: 'box', size: [0.17, 0.028, 0.03], position: [0.13, 0, 0], radius: 0.008, array: { count: 5, rotation: [0, 0, (2 * PI) / 5] }, material: M.paint('#1d1f24') },
];
const tyreShapes = (w) => [
  { type: 'torus', radius: 0.258, tube: 0.057, scale: [1, 1, w], radialSegments: 18, tubularSegments: 80, material: M.rubber() },
  { type: 'torus', radius: 0.312, tube: 0.006, scale: [1, 1, w * 3], radialSegments: 6, tubularSegments: 80, position: [0, 0, 0], material: M.plastic('#26282c') },
];

export default {
  id: 'motorcycle',
  name: 'Sport Motorcycle',
  category: 'motorcycles',
  tagline: 'A naked sport bike, taken apart bolt by bolt – from the parallel-twin engine to the chain that drives the rear wheel.',
  description:
    'A modern naked sport motorcycle with a red steel trellis frame and an air-cooled 650 cc parallel-twin engine. Explode it to see how the six-speed sequential gearbox, wet clutch, chain drive, twin-disc brakes and telescopic forks work together – and why you steer a bike by pushing the bar the "wrong" way.',
  camera: { position: [3, 1.5, 3.4], target: [0, 0.55, 0] },
  explodeScale: 1,
  systems: [
    { id: 'chassis', name: 'Frame & Chassis', color: '#e63946' },
    { id: 'engine', name: 'Engine', color: '#ff7a45' },
    { id: 'gearbox', name: 'Gearbox', color: '#f4a261' },
    { id: 'clutch', name: 'Clutch', color: '#e9c46a' },
    { id: 'drive', name: 'Final Drive', color: '#a7c957' },
    { id: 'wheels', name: 'Wheels & Tyres', color: '#6c757d' },
    { id: 'brakes', name: 'Brakes', color: '#d62828' },
    { id: 'suspension', name: 'Suspension', color: '#4cc9f0' },
    { id: 'steering', name: 'Steering & Controls', color: '#4361ee' },
    { id: 'electrical', name: 'Electrical', color: '#ffd166' },
    { id: 'fuel', name: 'Fuel & Exhaust', color: '#9d4edd' },
  ],
  parts: [
    // ───────────────────────────── FRAME & CHASSIS ─────────────────────────────
    {
      id: 'frame',
      name: 'Steel Trellis Frame',
      system: 'chassis',
      position: FO,
      explode: [0, 0, 0],
      shapes: frameShapes,
      info: info(
        'The skeleton of the bike: a lattice of welded steel tubes arranged in triangles that holds everything together.',
        'Runs from the steering head behind the handlebars, around both sides of the engine, down to the swingarm pivot behind the gearbox.',
        'Holds the engine, steering and rear suspension in exact alignment so the bike goes straight, corners predictably and carries the rider.',
        'Each tube is short and joined to others in triangles. A triangle cannot change shape without stretching a tube, so loads from braking, bumps and cornering are spread through many tubes as pure tension or compression. The engine bolts in as a "stressed member", adding to the stiffness.',
        ['steering-head', 'swingarm', 'subframe', 'crankcase', 'fuel-tank', 'rear-shock'],
        'Trellis frames are famous on Ducati Monsters and KTM Dukes; bridges, cranes and roof trusses use the same triangle principle.',
        'Chrome-moly (25CrMo4) tubes of 25–28 mm diameter and 1.5–2 mm wall are TIG-welded. A trellis is light (~10 kg) and allows tuned flex: designers aim for high torsional stiffness (≈ 5–8 kNm/°) but some lateral compliance, which acts as "suspension" when the bike is leaned over and the forks/shock are working off-axis. Twin-spar aluminium frames trade this for higher stiffness on superbikes.',
        ['A triangle is the only polygon that is rigid with pin joints.', 'Many naked bikes skip the frame downtubes and use the engine itself as part of the structure.'],
      ),
    },
    {
      id: 'subframe',
      name: 'Rear Subframe',
      system: 'chassis',
      position: SO,
      explode: [-0.35, 0.2, 0],
      shapes: subframeShapes,
      info: info(
        'A lighter bolt-on frame section that holds up the seat, tail and electronics.',
        'Behind the main frame, under the seat, sticking out over the rear wheel.',
        'Carries the rider, passenger, tail light and under-seat electrics without adding weight to the main frame.',
        'Two upper rails and two lower struts form a triangle on each side, bolted to the back of the main frame so it can be replaced after a crash.',
        ['frame', 'seat', 'tail-section', 'battery', 'ecu', 'tail-light'],
        'Track bikes often fit lightweight aluminium or carbon subframes; a bent subframe is a common, cheap-to-fix crash repair.',
        'Subframes are sized for a passenger load (≈ 90 kg plus bumps of 3–4 g). Bolt-on design isolates crash damage from the main frame’s steering geometry.',
        ['Some race bikes use self-supporting carbon seat units with no subframe at all.'],
      ),
    },
    {
      id: 'swingarm',
      name: 'Swingarm',
      system: 'chassis',
      position: [-0.47, 0.37, 0],
      explode: [-0.4, -0.05, 0],
      shapes: (() => {
        const o = [-0.47, 0.37, 0];
        const al = M.aluminium();
        return [
          rod(o, [-0.25, 0.44, 0.105], [RX, AY, 0.105], 0.022, al),
          rod(o, [-0.25, 0.44, -0.105], [RX, AY, -0.105], 0.022, al),
          rod(o, [-0.42, 0.38, 0.105], [-0.42, 0.38, -0.105], 0.018, al),
          { type: 'cylinder', radius: 0.022, height: 0.25, position: [-0.25 - o[0], 0.44 - o[1], 0], rotation: rotZ, material: M.metal() },
          { type: 'box', size: [0.06, 0.03, 0.012], position: [RX + 0.02 - o[0], AY - o[1], 0.12], material: M.metal() },
          { type: 'box', size: [0.06, 0.03, 0.012], position: [RX + 0.02 - o[0], AY - o[1], -0.12], material: M.metal() },
          { type: 'box', size: [0.38, 0.012, 0.035], position: [-0.48 - o[0], 0.425 - o[1], 0.13], rotation: [0, 0, 0.23], material: M.plastic('#202226') },
        ];
      })(),
      info: info(
        'A pivoting arm that holds the rear wheel and lets it move up and down over bumps.',
        'Between the frame’s pivot (behind the gearbox) and the rear axle.',
        'Locates the rear wheel while allowing suspension travel, and transmits drive and braking forces into the frame.',
        'The front end rotates on a pivot shaft with bearings; the rear end carries the axle. As the wheel hits a bump the arm swings upward, pushing on the shock linkage. Chain adjusters at the rear slide the axle back to set chain tension.',
        ['frame', 'rear-wheel', 'shock-linkage', 'rear-shock', 'chain', 'rear-caliper'],
        'Single-sided swingarms (Ducati, Triumph Speed Triple) make wheel changes quick; motocross bikes use very long swingarms for traction.',
        'Swingarm angle sets "anti-squat": the chain pull tries to extend the suspension under acceleration, counteracting load transfer. Pivot height relative to the chain line is tuned (typically 80–110 % anti-squat). Length (~550–600 mm) trades stability and traction against agility.',
        ['The chain slider (black pad) stops the chain from sawing into the swingarm.'],
      ),
    },
    {
      id: 'footpegs',
      name: 'Footpegs & Hangers',
      system: 'chassis',
      position: [-0.2, 0.36, 0],
      explode: [0, -0.15, 0],
      shapes: [
        { type: 'cylinder', radius: 0.014, height: 0.1, position: [0, 0, 0.21], rotation: rotZ, material: M.rubber() },
        { type: 'cylinder', radius: 0.014, height: 0.1, position: [0, 0, -0.21], rotation: rotZ, material: M.rubber() },
        { type: 'box', size: [0.12, 0.09, 0.012], position: [-0.03, 0.04, 0.155], radius: 0.005, material: M.aluminium() },
        { type: 'box', size: [0.12, 0.09, 0.012], position: [-0.03, 0.04, -0.155], radius: 0.005, material: M.aluminium() },
        { type: 'cone', radius: 0.006, height: 0.03, position: [0, -0.025, 0.24], rotation: [PI, 0, 0], material: M.metal() },
      ],
      info: info(
        'Where the rider’s feet rest, attached to aluminium hanger plates.',
        'Low on each side of the bike, just behind the engine.',
        'Support the rider’s weight and give the feet a base to work the gear lever and rear brake.',
        'The pegs fold upward on a spring if they hit the ground. Riders press down on the outside peg to help stabilise the bike in a corner.',
        ['frame', 'gear-lever', 'rear-master-cylinder'],
        'Sport bikes use high, rear-set pegs for ground clearance; cruisers use forward controls for comfort.',
        'Peg position defines rider ergonomics (knee angle) and lean-angle clearance. A "hero blob" feeler under the peg touches down at ≈ 45–48° of lean, warning the rider before hard parts scrape.',
        ['Weighting the outside peg is a classic racer technique to settle the chassis.'],
      ),
    },
    {
      id: 'side-stand',
      name: 'Side Stand',
      system: 'chassis',
      position: [-0.12, 0.3, 0.13],
      explode: [0, -0.1, 0.4],
      shapes: [
        rod([-0.12, 0.3, 0.13], [-0.12, 0.3, 0.13], [-0.2, 0.02, 0.3], 0.011, M.metal('#2c2e33')),
        { type: 'box', size: [0.06, 0.008, 0.035], position: [-0.08, -0.282, 0.17], material: M.metal('#2c2e33') },
        { type: 'cylinder', radius: 0.018, height: 0.03, rotation: rotZ, material: M.metal() },
      ],
      info: info(
        'A fold-out leg (kickstand) that lets the bike lean and stand on its own when parked.',
        'Left side of the frame, under the rider’s left foot.',
        'Holds the bike up when parked so it doesn’t need a centre stand or wall.',
        'It pivots down until it hits a stop; the bike then leans onto it. A spring pulls it back up when folded. A safety switch cuts the engine if you select a gear with the stand down.',
        ['frame', 'wiring-harness', 'footpegs'],
        'Every road bike has one; race bikes remove it and use paddock stands instead.',
        'The kill-switch interlock (stand switch + neutral switch + clutch switch) is wired through the ECU: engine runs only if in neutral OR clutch pulled with stand up. Stand is on the left because riders traditionally mount from the left (kerb side in left-hand-traffic countries).',
        ['Parking on soft tarmac in summer? Use a "puck" under the foot.'],
      ),
    },
    {
      id: 'seat',
      name: 'Seat',
      system: 'chassis',
      position: [-0.33, 0.8, 0],
      explode: [-0.1, 0.55, 0],
      shapes: [
        {
          type: 'extrude',
          outline: rel([-0.33, 0.8, 0], [[-0.03, 0.78, 0], [-0.06, 0.815, 0], [-0.3, 0.82, 0], [-0.46, 0.84, 0], [-0.62, 0.885, 0], [-0.64, 0.86, 0], [-0.5, 0.79, 0], [-0.1, 0.765, 0]]).map(([x, y]) => [x, y]),
          depth: 0.24,
          bevel: 0.015,
          material: M.leather('#1a1a1c'),
        },
        { type: 'box', size: [0.4, 0.004, 0.2], position: [-0.05, 0.023, 0], material: M.leather('#3b3b40') },
      ],
      info: info(
        'The padded seat for the rider (front) and passenger (rear, stepped up).',
        'On top of the subframe, behind the fuel tank – about 0.8 m above the ground.',
        'Supports the rider comfortably and lets them move their weight around in corners.',
        'A plastic or fibreglass pan carries foam and a grippy cover. It unlocks with the key to reach the battery, fuses and toolkit underneath.',
        ['subframe', 'fuel-tank', 'tail-section', 'battery'],
        'Low seats help short riders; sport bikes use firm foam for feedback, tourers use gel inserts.',
        'Seat height (~800 mm here) and seat width at the front together decide whether the rider can flat-foot the ground. Foam density (≈ 40–60 kg/m³) and a stepped design keep the rider from sliding forward under braking.',
        ['Many seats hide the passenger grab-strap and a small toolkit.'],
      ),
    },
    {
      id: 'tail-section',
      name: 'Tail Section',
      system: 'chassis',
      position: [-0.72, 0.85, 0],
      explode: [-0.45, 0.35, 0],
      shapes: [
        {
          type: 'extrude',
          outline: [[0.22, -0.07], [0.12, 0.0], [-0.08, 0.06], [-0.17, 0.095], [-0.18, 0.06], [-0.05, -0.03], [0.15, -0.11]],
          depth: 0.17,
          bevel: 0.012,
          material: M.paint('#1d1f24'),
        },
        { type: 'box', size: [0.13, 0.015, 0.14], position: [-0.12, -0.08, 0], rotation: [0, 0, 0.5], material: M.plastic() },
      ],
      info: info(
        'The sharp plastic bodywork that forms the back end of the bike.',
        'Wrapped around the rear of the subframe, under and behind the seat.',
        'Covers the subframe and electrics, holds the tail light and gives the bike its sporty look.',
        'Injection-moulded panels clip and bolt onto the subframe. A hugger/tail tidy below carries the number plate and indicators.',
        ['subframe', 'seat', 'tail-light'],
        'Many owners fit "tail tidy" kits to shorten the rear hugger for a cleaner look.',
        'Tail shape matters aerodynamically: a sharply cut-off ("Kamm") tail reduces the low-pressure wake behind the rider. Panels are typically ABS or polypropylene, about 2.5–3 mm thick.',
        ['The up-swept tail lets the exhaust and rear wheel move freely beneath it.'],
      ),
    },

    // ───────────────────────────── ENGINE ─────────────────────────────
    {
      id: 'crankcase',
      name: 'Crankcase',
      system: 'engine',
      position: [-0.02, 0.37, 0],
      explode: [0, -0.18, 0],
      shapes: [
        { type: 'box', size: [0.44, 0.24, 0.24], radius: 0.035, material: M.aluminium() },
        { type: 'cylinder', radius: 0.085, height: 0.04, position: [-0.04, 0.03, -0.14], rotation: rotZ, material: M.brushed() },
        { type: 'cylinder', radius: 0.075, height: 0.035, position: [0.05, 0.03, 0.135], rotation: rotZ, material: M.brushed() },
        { type: 'box', size: [0.3, 0.06, 0.2], position: [0.02, -0.14, 0], radius: 0.015, material: M.castIron() },
        { type: 'box', size: [0.24, 0.012, 0.004], position: [0.0, -0.06, 0.122], array: { count: 3, offset: [0, 0.03, 0] }, material: M.metal('#7d838a') },
      ],
      info: info(
        'The aluminium "box" at the bottom of the engine that houses the crankshaft, gearbox and oil.',
        'The lowest, widest part of the engine, between the rider’s feet.',
        'Supports the crankshaft and gear shafts in bearings, holds the engine oil and bolts the engine into the frame.',
        'Two halves split horizontally are bolted together around the crank and gearbox shafts. The bottom sump holds the oil, which a pump sends to the bearings, gears and clutch. Side covers close off the clutch (right) and alternator (left).',
        ['crankshaft', 'gearbox-gears', 'cylinder-block', 'clutch-basket', 'stator', 'frame'],
        'Almost every modern bike uses a "unit construction" crankcase where engine and gearbox share one case.',
        'Die-cast A356/ADC12 aluminium with a horizontally split design lets the crank and both gearbox shafts be dropped in together. A "semi-dry" sump on many sport bikes keeps oil away from the spinning crank to reduce windage losses. Typical oil capacity: 3–3.5 L of 10W-40 JASO MA oil.',
        ['Motorcycle oil must be JASO MA rated – car oils with friction modifiers can make a wet clutch slip.'],
      ),
    },
    {
      id: 'cylinder-block',
      name: 'Cylinder Block (with Cooling Fins)',
      system: 'engine',
      position: [CRANK[0] + 0.21 * CA[0], CRANK[1] + 0.21 * CA[1], 0],
      explode: [0.15, 0.22, 0],
      shapes: [
        { type: 'cylinder', radius: 0.046, height: 0.17, position: [0, 0, 0.05], rotation: [0, 0, CYL_TILT], material: M.castIron() },
        { type: 'cylinder', radius: 0.046, height: 0.17, position: [0, 0, -0.05], rotation: [0, 0, CYL_TILT], material: M.castIron() },
        {
          type: 'box',
          size: [0.21, 0.007, 0.2],
          radius: 0.003,
          position: [-0.075 * CA[0], -0.075 * CA[1], 0],
          rotation: [0, 0, CYL_TILT],
          array: { count: 7, offset: [0.025 * CA[0], 0.025 * CA[1], 0] },
          material: M.aluminium(),
        },
      ],
      info: info(
        'The two cylinders the pistons slide in, wrapped in thin fins that shed engine heat into the air.',
        'Above the crankcase, leaning forward about 20°, directly under the fuel tank.',
        'Guides the pistons and contains combustion; the fins cool the engine without a radiator.',
        'Each bore is lined with a hard sleeve. Combustion heat flows through the metal into dozens of thin fins, which give a huge surface area for passing air to carry heat away as the bike moves.',
        ['pistons', 'cylinder-head', 'crankcase'],
        'Air-cooled twins power the Royal Enfield 650 twins, older Honda CBs and classic Triumphs.',
        'This 650 cc parallel twin has ≈ 78 mm bore × 67.8 mm stroke. Fins add ~4–6× the surface area of a bare cylinder; fin pitch ~8–10 mm balances airflow vs area. Air cooling limits compression (~9.5:1) and makes emissions harder, which is why most modern sport bikes are liquid-cooled. The 20° forward lean lowers the centre of gravity and clears space for the air box.',
        ['Fins are thickest at the base and taper to the tip for best heat flow.', 'Cylinders are leaned forward so the fins get clean air past the front wheel.'],
      ),
    },
    {
      id: 'cylinder-head',
      name: 'Cylinder Head',
      system: 'engine',
      position: [CRANK[0] + 0.335 * CA[0], CRANK[1] + 0.335 * CA[1], 0],
      explode: [0.28, 0.42, 0],
      shapes: [
        { type: 'box', size: [0.23, 0.07, 0.22], radius: 0.015, rotation: [0, 0, CYL_TILT], material: M.aluminium() },
        { type: 'box', size: [0.2, 0.035, 0.2], radius: 0.012, position: [0.018, 0.05, 0], rotation: [0, 0, CYL_TILT], material: M.paint('#1d1f24') },
        { type: 'box', size: [0.2, 0.006, 0.22], position: [-0.006, -0.018, 0], rotation: [0, 0, CYL_TILT], array: { count: 3, offset: [0.007, 0.02, 0] }, material: M.aluminium() },
        { type: 'cylinder', radius: 0.008, height: 0.03, position: [0.03, 0.068, 0.05], rotation: [0, 0, CYL_TILT], material: M.copper() },
        { type: 'cylinder', radius: 0.008, height: 0.03, position: [0.03, 0.068, -0.05], rotation: [0, 0, CYL_TILT], material: M.copper() },
      ],
      info: info(
        'The top of the engine containing the valves, camshafts and spark plugs.',
        'Bolted on top of the cylinder block, under the front of the fuel tank.',
        'Lets air–fuel mixture in and exhaust out at exactly the right moments, and seals the top of the combustion chamber.',
        'Two overhead camshafts, driven by a chain from the crank, push open 4 valves per cylinder. Intake ports face backward to the throttle bodies; exhaust ports face forward into the header pipes. A spark plug in the middle of each chamber fires the mixture.',
        ['cylinder-block', 'throttle-body', 'exhaust-header', 'ecu', 'crankshaft'],
        'DOHC 4-valve heads are standard on almost all modern sport bikes.',
        'Four valves per cylinder give more curtain area than two, allowing higher rpm (redline ≈ 9,000 rpm here). Valve clearances (~0.10–0.15 mm intake, 0.20–0.25 mm exhaust) need checking every 12–24,000 km. Cam timing chain is tensioned automatically by a hydraulic or ratchet tensioner.',
        ['The black cam cover keeps oil in and dirt out.', 'Spark plugs sit in deep wells – a long plug socket is needed.'],
      ),
    },
    {
      id: 'pistons',
      name: 'Pistons & Connecting Rods',
      system: 'engine',
      position: [CRANK[0] + 0.24 * CA[0], CRANK[1] + 0.24 * CA[1], 0],
      explode: [0.25, 0.32, 0.45],
      anim: { type: 'piston', axis: 'y', amplitude: 0.022, speed: 8, phase: 0 },
      shapes: [
        { type: 'cylinder', radius: 0.039, height: 0.045, position: [0, 0, 0.05], rotation: [0, 0, CYL_TILT], material: M.brushed() },
        { type: 'cylinder', radius: 0.039, height: 0.045, position: [0, 0, -0.05], rotation: [0, 0, CYL_TILT], material: M.brushed() },
        { type: 'box', size: [0.016, 0.13, 0.012], position: [-0.065 * CA[0], -0.065 * CA[1], 0.05], rotation: [0, 0, CYL_TILT], material: M.metal() },
        { type: 'box', size: [0.016, 0.13, 0.012], position: [-0.065 * CA[0], -0.065 * CA[1], -0.05], rotation: [0, 0, CYL_TILT], material: M.metal() },
      ],
      info: info(
        'Two aluminium pistons that are pushed down by burning fuel, plus the rods that connect them to the crankshaft.',
        'Inside the two cylinders, hidden under the cylinder head.',
        'Turn the pressure of burning fuel into a pushing force on the crankshaft.',
        'Each piston goes up and down four times per power cycle: intake, compression, power, exhaust. Rings seal it against the cylinder wall. The connecting rod links the piston pin to an offset crank pin, so straight-line motion becomes rotation.',
        ['cylinder-block', 'crankshaft', 'cylinder-head'],
        'The same slider-crank principle runs car engines, compressors and steam locomotives.',
        'A 270° crank (one piston leads the other by three-quarters of a turn) gives an uneven firing interval of 270°/450°, mimicking a 90° V-twin: better traction "feel" and a characterful exhaust note. Forged aluminium pistons with a 3-ring pack; mean piston speed at 9,000 rpm with a 67.8 mm stroke ≈ 20 m/s.',
        ['A balance shaft cancels most of the rocking couple created by the 270° crank.'],
      ),
    },
    {
      id: 'crankshaft',
      name: 'Crankshaft',
      system: 'engine',
      position: [CRANK[0], CRANK[1], 0],
      explode: [0.05, -0.22, 0.5],
      anim: { type: 'spin', axis: 'z', speed: -8 },
      shapes: [
        { type: 'cylinder', radius: 0.016, height: 0.26, rotation: rotZ, material: M.metal() },
        { type: 'cylinder', radius: 0.052, height: 0.016, position: [0, 0, 0.073], rotation: rotZ, thetaLength: PI * 1.1, material: M.castIron() },
        { type: 'cylinder', radius: 0.052, height: 0.016, position: [0, 0, 0.027], rotation: rotZ, thetaLength: PI * 1.1, material: M.castIron() },
        { type: 'cylinder', radius: 0.052, height: 0.016, position: [0, 0, -0.027], rotation: [PI / 2, 0, PI / 2], thetaLength: PI * 1.1, material: M.castIron() },
        { type: 'cylinder', radius: 0.052, height: 0.016, position: [0, 0, -0.073], rotation: [PI / 2, 0, PI / 2], thetaLength: PI * 1.1, material: M.castIron() },
        { type: 'cylinder', radius: 0.014, height: 0.03, position: [0, 0.033, 0.05], rotation: rotZ, material: M.chrome() },
        { type: 'cylinder', radius: 0.014, height: 0.03, position: [0.033, 0, -0.05], rotation: rotZ, material: M.chrome() },
      ],
      info: info(
        'The spinning shaft at the heart of the engine that turns the pistons’ up-and-down motion into rotation.',
        'Lengthways across the bike (left to right) inside the front of the crankcase.',
        'Collects power from both pistons and sends it to the clutch, alternator and cam chain.',
        'Offset crank pins act like the pedals on a bicycle: as the rods push down on them, the shaft spins. Heavy counterweights balance the pistons. A gear on the right end drives the clutch basket; the left end spins the alternator rotor.',
        ['pistons', 'clutch-basket', 'stator', 'crankcase', 'cylinder-head'],
        'Your bicycle’s pedals and cranks are a human-powered crankshaft.',
        'Forged steel, running in plain bearings fed with pressurised oil (≈ 3–5 bar). Crank pins phased at 270° here; a 180° crank gives a "busier" sound, 360° behaves like a single. Primary gear reduction to the clutch is ≈ 1.8–2:1.',
        ['At 9,000 rpm the crank turns 150 times every second.'],
      ),
    },

    // ───────────────────────────── GEARBOX ─────────────────────────────
    {
      id: 'gearbox-gears',
      name: '6-Speed Gear Clusters',
      system: 'gearbox',
      position: [-0.13, 0.37, 0],
      explode: [-0.15, -0.2, -0.45],
      shapes: [
        { type: 'cylinder', radius: 0.01, height: 0.26, position: [0.035, 0.03, 0], rotation: rotZ, material: M.metal() },
        { type: 'cylinder', radius: 0.01, height: 0.3, position: [-0.03, -0.01, 0], rotation: rotZ, material: M.metal() },
        { type: 'gear', radius: 0.022, teeth: 12, toothDepth: 0.004, thickness: 0.012, position: [0.035, 0.03, -0.075], rotation: rotZ, array: { count: 6, offset: [0, 0, 0.03], scale: [1.13, 1, 1.13] }, material: M.brushed() },
        { type: 'gear', radius: 0.05, teeth: 28, toothDepth: 0.004, thickness: 0.012, position: [-0.03, -0.01, -0.075], rotation: rotZ, array: { count: 6, offset: [0, 0, 0.03], scale: [0.91, 1, 0.91] }, material: M.metal('#8a9097') },
      ],
      info: info(
        'Two shafts carrying six pairs of gears that let the engine stay in its power band at any road speed.',
        'Inside the rear half of the crankcase, behind the crankshaft.',
        'Multiplies torque for pulling away (1st gear) and lets the engine relax at cruising speed (6th gear).',
        'The input (main) shaft is driven by the clutch; the output (counter) shaft drives the front sprocket. All gear pairs are always meshed, but only one pair is locked to its shaft at a time by sliding "dogs". Small gear on the input + big gear on the output = low gear.',
        ['clutch-pack', 'shift-drum', 'front-sprocket', 'crankcase'],
        'The same constant-mesh, dog-engaged design is used in nearly all motorcycles and in racing-car sequential gearboxes.',
        'Typical ratios: 1st 2.6, 2nd 1.9, 3rd 1.5, 4th 1.25, 5th 1.1, 6th 0.95. "Dog rings" have 3–6 square-sided dogs; undercut ("back-cut") dogs pull the gears into engagement under load so they don’t jump out. Straight-cut gears are stronger and cheaper than helical; gear whine is masked by engine noise.',
        ['Gears are always meshed – you are only choosing which pair is locked to the shaft.'],
      ),
    },
    {
      id: 'shift-drum',
      name: 'Shift Drum & Forks',
      system: 'gearbox',
      position: [-0.2, 0.3, 0],
      explode: [-0.25, -0.25, -0.75],
      anim: { type: 'rock', axis: 'z', amplitude: 0.5, speed: 1.2, phase: 0 },
      shapes: [
        { type: 'cylinder', radius: 0.022, height: 0.2, rotation: rotZ, material: M.brushed() },
        { type: 'torus', radius: 0.022, tube: 0.003, position: [0, 0, -0.05], array: { count: 3, offset: [0, 0, 0.05] }, material: M.metal('#3a3d42') },
        { type: 'box', size: [0.06, 0.008, 0.006], position: [0.04, 0.03, -0.05], rotation: [0, 0, 0.6], array: { count: 3, offset: [0, 0, 0.05] }, material: M.brass() },
        { type: 'gear', radius: 0.024, teeth: 6, toothDepth: 0.008, thickness: 0.01, position: [0, 0, 0.11], rotation: rotZ, material: M.metal() },
      ],
      info: info(
        'A rotating drum with zig-zag grooves that moves the selector forks to change gear.',
        'Under the gearbox shafts, at the back of the crankcase.',
        'Makes gear changes sequential: you can only go up or down one gear at a time.',
        'Each kick of the gear lever turns the drum one step through a ratchet ("star" wheel). Pins on three selector forks ride in the drum’s grooves; as the drum turns, the grooves wiggle sideways and push the forks, sliding the dog gears into or out of engagement.',
        ['gear-lever', 'gearbox-gears', 'wiring-harness'],
        'Pattern: 1 – N – 2 – 3 – 4 – 5 – 6 ("one down, five up").',
        'Neutral is a half-step between 1st and 2nd, which is why it can be hard to find: a half-hearted tap from 1st goes to N, a firm one skips to 2nd. Finding neutral is easiest while rolling or with the clutch slightly let out so the dogs can align. A detent arm and the neutral switch on the drum end tell the dash "N". Quick-shifters cut ignition for ~50–80 ms so the dogs unload and the drum can index without the clutch.',
        ['MotoGP bikes use "seamless" gearboxes that engage the next gear before releasing the last.'],
      ),
    },
    {
      id: 'gear-lever',
      name: 'Gear Shift Lever',
      system: 'gearbox',
      position: [-0.18, 0.37, 0.16],
      explode: [0, -0.1, 0.45],
      anim: { type: 'rock', axis: 'z', amplitude: 0.12, speed: 1.2, phase: 0 },
      shapes: [
        rod([-0.18, 0.37, 0.16], [-0.18, 0.37, 0.16], [-0.03, 0.335, 0.19], 0.008, M.metal('#2c2e33')),
        { type: 'cylinder', radius: 0.01, height: 0.04, position: [0.15, -0.035, 0.05], rotation: rotZ, material: M.rubber() },
        { type: 'cylinder', radius: 0.016, height: 0.02, rotation: rotZ, material: M.aluminium() },
      ],
      info: info(
        'The foot lever on the left side that you click up or down to change gear.',
        'In front of the left footpeg.',
        'Turns a flick of the rider’s toe into one step of the shift drum.',
        'Push down for a lower gear, lift up with the toe for a higher gear. The lever turns a shift shaft into the crankcase, which ratchets the shift drum by exactly one position and then springs back to centre.',
        ['shift-drum', 'footpegs', 'clutch-lever'],
        'Road pattern is "one down, five up"; racers often reverse it ("GP shift") so up-shifts are a push down when leaned over.',
        'Lever ratio is set by the pivot-to-peg length versus the shift-shaft arm; a quick-shifter strain gauge often sits in the linkage rod. Pre-loading the lever before the clutch is released produces fast, clean up-shifts.',
        ['Many bikes allow clutchless up-shifts when the throttle is briefly closed.'],
      ),
    },

    // ───────────────────────────── CLUTCH ─────────────────────────────
    {
      id: 'clutch-basket',
      name: 'Clutch Basket',
      system: 'clutch',
      position: [-0.04, 0.4, -0.115],
      explode: [0, 0.05, -0.5],
      anim: { type: 'spin', axis: 'z', speed: -4 },
      shapes: [
        { type: 'cylinder', radius: 0.075, height: 0.07, open: true, rotation: rotZ, material: M.aluminium() },
        { type: 'gear', radius: 0.082, teeth: 40, toothDepth: 0.006, thickness: 0.014, position: [0, 0, 0.04], rotation: rotZ, material: M.brushed() },
        { type: 'box', size: [0.012, 0.016, 0.07], position: [0.075, 0, 0], array: { count: 8, rotation: [0, 0, PI / 4] }, material: M.metal('#7d838a') },
      ],
      info: info(
        'A cup-shaped outer housing, gear-driven by the crankshaft, that holds the clutch plates.',
        'On the right-hand end of the gearbox input shaft, behind the right engine cover.',
        'Brings engine power to the clutch plates.',
        'The large primary gear on its back meshes with the crank, so the basket always spins when the engine runs. Slots around its rim lock the tabs of the friction plates so they turn with it.',
        ['crankshaft', 'clutch-pack', 'crankcase', 'gearbox-gears'],
        'Notched baskets are a sign of age – plates catch in the grooves and the clutch feels jerky.',
        'Primary drive reduction ≈ 1.9:1. Rubber or spring dampers between the gear and basket soak up firing pulses. Many sport bikes add a "slipper" ramp that lets the clutch slip when the rear wheel tries to drive the engine on hard down-shifts.',
        ['The basket spins slower than the crank thanks to the primary gear reduction.'],
      ),
    },
    {
      id: 'clutch-pack',
      name: 'Wet Multi-Plate Clutch Pack',
      system: 'clutch',
      position: [-0.04, 0.4, -0.115],
      explode: [0, 0.05, -0.8],
      anim: { type: 'spin', axis: 'z', speed: -4 },
      shapes: [
        { type: 'cylinder', radius: 0.068, height: 0.005, position: [0, 0, -0.03], rotation: rotZ, array: { count: 8, offset: [0, 0, 0.008] }, material: M.plastic('#8a5a2b') },
        { type: 'cylinder', radius: 0.062, height: 0.003, position: [0, 0, -0.026], rotation: rotZ, array: { count: 7, offset: [0, 0, 0.008] }, material: M.metal() },
        { type: 'cylinder', radius: 0.05, height: 0.012, position: [0, 0, -0.045], rotation: rotZ, material: M.aluminium() },
        { type: 'helix', radius: 0.006, height: 0.022, turns: 5, tube: 0.0015, position: [0.03, 0, -0.06], rotation: rotZ, material: M.metal('#3a3d42') },
        { type: 'helix', radius: 0.006, height: 0.022, turns: 5, tube: 0.0015, position: [-0.03, 0, -0.06], rotation: rotZ, material: M.metal('#3a3d42') },
      ],
      info: info(
        'A stack of alternating friction and steel plates, squeezed together by springs, that connects or disconnects the engine from the gearbox.',
        'Inside the clutch basket, on the right side of the engine.',
        'Lets you stop without stalling, pull away smoothly and change gear.',
        'Friction plates turn with the basket (engine); steel plates turn with the inner hub (gearbox). Springs clamp the stack so the two spin together. Pulling the lever lifts the pressure plate, the plates separate and the engine spins freely. Releasing it slowly lets the plates slip and then grip – the "friction zone".',
        ['clutch-basket', 'clutch-lever', 'gearbox-gears', 'crankcase'],
        'Nearly all motorcycles use a wet clutch; Ducati’s rattly dry clutches are the famous exception.',
        'A "wet" clutch runs in the same oil as the engine and gearbox – the oil cools the plates and makes engagement smooth, but it shears through the oil (drag) and requires JASO MA oil without friction modifiers. Torque capacity T = μ·F·r_eff·n, with n = number of friction faces (here 8 friction plates → 16 faces). Many sport bikes add an assist/slipper ramp so lighter springs can be used.',
        ['Using car oil with friction modifiers can make a wet clutch slip.', 'More plates = more torque capacity in a small diameter.'],
      ),
    },
    {
      id: 'clutch-lever',
      name: 'Clutch Lever & Cable',
      system: 'clutch',
      position: [0.39, 1.0, 0.25],
      explode: [0.3, 0.5, 0.4],
      shapes: [
        rod([0.39, 1.0, 0.25], [0.39, 1.0, 0.24], [0.45, 0.99, 0.36], 0.006, M.aluminium()),
        { type: 'box', size: [0.04, 0.035, 0.035], position: [0, 0.005, -0.02], radius: 0.006, material: M.paint('#1d1f24') },
        {
          type: 'tube',
          points: rel([0.39, 1.0, 0.25], [[0.39, 1.0, 0.22], [0.42, 0.93, 0.18], [0.4, 0.8, 0.16], [0.2, 0.72, 0.15], [0.02, 0.58, 0.14], [-0.04, 0.5, 0.04], [-0.04, 0.48, -0.07]]),
          radius: 0.004,
          radialSegments: 6,
          material: M.plastic('#111'),
        },
      ],
      info: info(
        'The lever on the left handlebar and the steel cable that pulls the clutch apart.',
        'Left handlebar, in front of the left grip; the cable runs down past the engine to the clutch.',
        'Lets the rider disengage the clutch with two fingers.',
        'Squeezing the lever pulls the inner cable through its outer sheath. At the engine, the cable turns a release arm that pushes a pushrod against the pressure plate, compressing the clutch springs.',
        ['clutch-pack', 'handlebar', 'gear-lever'],
        'Some bikes use a hydraulic clutch line instead of a cable – self-adjusting and lighter to pull.',
        'Free play of 2–3 mm at the lever end is needed so the clutch fully engages. Lever ratio ≈ 5–6:1 multiplies finger force. An inline clutch switch tells the ECU the clutch is pulled (starter interlock).',
        ['The clutch lever is always on the left; the front brake on the right.'],
      ),
    },

    // ───────────────────────────── FINAL DRIVE ─────────────────────────────
    {
      id: 'front-sprocket',
      name: 'Front Sprocket',
      system: 'drive',
      position: [FS[0], FS[1], CHAIN_Z],
      explode: [0, 0, 0.45],
      anim: { type: 'spin', axis: 'z', speed: -11 },
      shapes: [
        { type: 'gear', radius: 0.052, teeth: 15, toothDepth: 0.008, thickness: 0.01, rotation: rotZ, material: M.metal('#5b5f66') },
        { type: 'cylinder', radius: 0.018, height: 0.03, rotation: rotZ, material: M.metal() },
      ],
      info: info(
        'A small toothed wheel on the gearbox output shaft that drives the chain.',
        'Left side of the engine, just behind and below the cylinders, under a small cover.',
        'Transfers power from the gearbox to the chain.',
        'Splined onto the output (counter) shaft. As it turns, its teeth pull the chain’s rollers along, which in turn rotates the rear sprocket.',
        ['gearbox-gears', 'chain', 'rear-sprocket'],
        'Changing to one tooth smaller gives quicker acceleration but lower top speed – a cheap, popular modification.',
        '15 teeth on a 520-pitch chain. Overall final ratio = rear/front teeth = 43/15 ≈ 2.87:1. One tooth less at the front changes the ratio about as much as three teeth more at the rear.',
        ['Fewer than ~14 teeth wears chains faster due to "chordal action".'],
      ),
    },
    {
      id: 'rear-sprocket',
      name: 'Rear Sprocket',
      system: 'drive',
      position: [RX, AY, CHAIN_Z - 0.01],
      explode: [-0.5, 0, 0.5],
      anim: { type: 'spin', axis: 'z', speed: -5 },
      shapes: [
        { type: 'gear', radius: 0.118, teeth: 43, toothDepth: 0.008, thickness: 0.008, rotation: rotZ, material: M.aluminium() },
        { type: 'cylinder', radius: 0.012, height: 0.012, position: [0.065, 0, 0], rotation: rotZ, array: { count: 5, rotation: [0, 0, (2 * PI) / 5] }, material: M.paint('#1d1f24') },
      ],
      info: info(
        'The large toothed wheel bolted to the rear wheel that the chain pulls around.',
        'Left side of the rear wheel hub.',
        'Turns chain pull into rear-wheel rotation, reducing speed and multiplying torque.',
        'Bolted to a "cush drive" carrier in the hub. Because it has about three times more teeth than the front sprocket, the rear wheel turns about three times slower but with three times the torque.',
        ['chain', 'rear-wheel', 'front-sprocket', 'swingarm'],
        'Lightweight aluminium sprockets are used for racing; steel ones last much longer on the road.',
        '43-tooth, 520 pitch. Rubber cush-drive blocks between sprocket carrier and hub absorb driveline shocks. Always replace chain and both sprockets together – a worn ("hooked") sprocket destroys a new chain quickly.',
        ['Hooked or shark-fin teeth are the sign of a worn sprocket.'],
      ),
    },
    {
      id: 'chain',
      name: 'Drive Chain (520)',
      system: 'drive',
      position: [(FS[0] + RS[0]) / 2, (FS[1] + RS[1]) / 2, CHAIN_Z],
      explode: [-0.2, -0.05, 0.6],
      anim: { type: 'flow', speed: 2 },
      shapes: [
        { type: 'tube', points: chainPts, closed: true, radius: 0.008, segments: 220, radialSegments: 6, material: M.metal('#c9a227') },
      ],
      info: info(
        'A loop of steel links that carries power from the gearbox to the rear wheel.',
        'Left side of the bike, running between the front sprocket and rear sprocket alongside the swingarm.',
        'Delivers engine power to the rear wheel efficiently while letting the wheel move up and down.',
        'Each link has rollers that sit between sprocket teeth. The top run is pulled tight by the front sprocket, rotating the rear sprocket. The bottom run returns slack. Because the swingarm moves, the chain needs some slack (~25–35 mm).',
        ['front-sprocket', 'rear-sprocket', 'swingarm'],
        'Bicycles use the same roller-chain idea; shaft drive (BMW) and belt drive (Harley) are the alternatives.',
        '"520" means 5/8 in (15.875 mm) pitch and 2/8 in (6.35 mm) roller width. O-ring / X-ring seals hold grease inside each pin. Efficiency ≈ 97–98 %, better than shaft drive. Clean and lube every ~500–1000 km; check slack with the bike on its side stand.',
        ['A worn chain "stretches" because pins and bushes wear – the steel itself does not stretch.', 'Too-tight chains wreck gearbox output bearings.'],
      ),
    },

    // ───────────────────────────── WHEELS & TYRES ─────────────────────────────
    {
      id: 'front-wheel',
      name: 'Front Wheel (5-spoke)',
      system: 'wheels',
      position: [FX, AY, 0],
      explode: [0.55, 0, 0.6],
      anim: { type: 'spin', axis: 'z', speed: -5 },
      shapes: wheelShapes(2.2),
      info: info(
        'A cast-aluminium five-spoke wheel that carries the front tyre and brake discs.',
        'Held in the bottom of the front fork.',
        'Holds the tyre in shape, carries the brake discs and spins on bearings around the axle.',
        'The tyre bead locks onto the rim; the hub has two bearings that spin around a fixed axle clamped in the fork legs. Brake discs bolt to both sides of the hub.',
        ['front-tyre', 'front-discs', 'fork-sliders'],
        '17-inch cast wheels are standard on sport bikes; adventure bikes use spoked 19/21-inch wheels for toughness off-road.',
        '17 × 3.50 in rim. Low unsprung mass and low rotational inertia improve suspension response and steering. A spinning wheel acts as a gyroscope – this gyroscopic precession is part of why countersteering works and why bikes self-stabilise at speed.',
        ['Forged magnesium wheels can save over 1 kg per wheel versus cast aluminium.'],
      ),
    },
    {
      id: 'front-tyre',
      name: 'Front Tyre (120/70 ZR17)',
      system: 'wheels',
      position: [FX, AY, 0],
      explode: [0.55, 0, 0.95],
      anim: { type: 'spin', axis: 'z', speed: -5 },
      shapes: tyreShapes(1.05),
      info: info(
        'A rounded rubber tyre filled with air that gives the bike grip and cushioning.',
        'Mounted on the front wheel.',
        'Provides grip for steering and braking and absorbs small bumps.',
        'The rounded profile lets the bike lean: as it tips over, the tyre rolls onto its shoulder and the contact patch stays about the size of a credit card. Air pressure (≈ 2.3–2.5 bar) supports the load.',
        ['front-wheel', 'front-discs', 'fork-sliders'],
        'Sport tyres use softer compounds; touring tyres harder for mileage; dual-compound tyres combine both.',
        '120 mm wide, 70 % aspect ratio, Z-rated (>240 km/h), 17 in rim. Front tyre does most of the braking work (up to ~100 % at maximum deceleration) – that is why front brakes are much bigger than rear ones. Camber thrust at lean contributes significantly to cornering force.',
        ['A motorcycle has only two contact patches roughly the size of your palm.'],
      ),
    },
    {
      id: 'rear-wheel',
      name: 'Rear Wheel (5-spoke)',
      system: 'wheels',
      position: [RX, AY, 0],
      explode: [-0.55, 0, -0.6],
      anim: { type: 'spin', axis: 'z', speed: -5 },
      shapes: wheelShapes(3),
      info: info(
        'The wider driven wheel at the back, carrying the rear sprocket and rear brake disc.',
        'At the end of the swingarm.',
        'Transfers drive from the chain to the road.',
        'The rear sprocket bolts on the left via a rubber "cush drive"; the brake disc bolts on the right. The axle passes through the swingarm, where chain adjusters set its position.',
        ['rear-tyre', 'rear-sprocket', 'rear-disc', 'swingarm'],
        'Rear rims are wider than front rims to hold a fatter tyre for traction.',
        '17 × 5.50 in rim. Cush-drive damping (rubber blocks) protects gearbox from shock loads; wheel bearings are sealed deep-groove ball bearings.',
        ['Rear wheel bearings carry most of the bike and rider weight.'],
      ),
    },
    {
      id: 'rear-tyre',
      name: 'Rear Tyre (180/55 ZR17)',
      system: 'wheels',
      position: [RX, AY, 0],
      explode: [-0.55, 0, -0.95],
      anim: { type: 'spin', axis: 'z', speed: -5 },
      shapes: tyreShapes(1.45),
      info: info(
        'A wide, flatter rubber tyre that puts the engine’s power onto the road.',
        'Mounted on the rear wheel.',
        'Provides traction for acceleration, carries most of the weight and helps with cornering grip.',
        'Its wide contact patch spreads the drive force. When leaned over, the narrow shoulder takes over, so rear tyres wear "square" in the middle on motorway riders.',
        ['rear-wheel', 'swingarm'],
        'Sticky track tyres need tyre warmers; road tyres work from cold.',
        '180 mm wide, 55 % profile. Slip ratio of ~5–15 % gives maximum traction; traction control in the ECU compares front and rear wheel speeds to keep slip in this window.',
        ['A wider rear tyre gives more grip but makes the bike slightly slower to steer.'],
      ),
    },

    // ───────────────────────────── BRAKES ─────────────────────────────
    {
      id: 'front-discs',
      name: 'Front Twin Brake Discs (320 mm)',
      system: 'brakes',
      position: [FX, AY, 0],
      explode: [0.85, 0, 0.25],
      anim: { type: 'spin', axis: 'z', speed: -5 },
      shapes: [
        { type: 'ring', inner: 0.11, outer: 0.15, segments: 48, position: [0, 0, 0.068], material: { ...M.brushed(), side: 'double' } },
        { type: 'ring', inner: 0.11, outer: 0.15, segments: 48, position: [0, 0, -0.068], material: { ...M.brushed(), side: 'double' } },
        { type: 'cylinder', radius: 0.008, height: 0.006, position: [0.13, 0, 0.068], rotation: rotZ, array: { count: 12, rotation: [0, 0, PI / 6] }, material: M.metal('#3a3d42') },
        { type: 'ring', inner: 0.05, outer: 0.11, segments: 32, position: [0, 0, 0.066], material: { ...M.aluminium(), side: 'double' } },
        { type: 'ring', inner: 0.05, outer: 0.11, segments: 32, position: [0, 0, -0.066], material: { ...M.aluminium(), side: 'double' } },
      ],
      info: info(
        'Two large steel discs bolted to the front wheel that the brake pads squeeze.',
        'Either side of the front wheel hub.',
        'Turn the bike’s motion into heat to slow it down.',
        'When the rider pulls the brake lever, the calipers squeeze pads against the discs. Friction converts kinetic energy into heat, which the discs soak up and release into the air.',
        ['front-calipers', 'front-wheel', 'front-master-cylinder'],
        'Twin front discs are standard on sport bikes; small commuters use a single disc.',
        '320 mm, 4.5–5 mm thick stainless (410/420) discs, "floating" on bobbins so the friction ring can expand with heat without warping. During hard braking ~70–100 % of stopping force is at the front because weight transfers forward. Discs can exceed 400 °C on track.',
        ['A 200 kg bike + rider stopping from 100 km/h releases ≈ 77 kJ of heat.'],
      ),
    },
    {
      id: 'front-calipers',
      name: 'Front Radial 4-Piston Calipers',
      system: 'brakes',
      position: [FX - 0.11, AY + 0.075, 0],
      explode: [0.75, 0.15, 0],
      shapes: [
        { type: 'box', size: [0.05, 0.11, 0.045], radius: 0.012, position: [0, 0, 0.068], rotation: [0, 0, 0.95], material: M.paint('#c9a227') },
        { type: 'box', size: [0.05, 0.11, 0.045], radius: 0.012, position: [0, 0, -0.068], rotation: [0, 0, 0.95], material: M.paint('#c9a227') },
      ],
      info: info(
        'Clamps that hold the brake pads and squeeze them onto the discs using hydraulic pistons.',
        'Bolted to the bottom of each fork slider, wrapped around the edge of each disc.',
        'Convert hydraulic pressure into pad clamping force.',
        'Brake fluid pushed from the master cylinder enters the caliper and pushes four pistons outward, pressing pads against both sides of the disc. Square-section seals pull the pistons back slightly when you release the lever.',
        ['front-discs', 'brake-lines', 'fork-sliders', 'front-master-cylinder'],
        'Brembo Stylema and Nissin radial calipers are common on modern naked bikes.',
        '"Radial-mount" means the mounting bolts run parallel to the radius of the disc, making the caliper stiffer than axial mounting. Four 30–32 mm pistons per caliper; with a 16–19 mm master cylinder the hydraulic multiplication is ≈ 15–20:1. ABS modulates pressure here up to ~15 times per second.',
        ['Gold calipers are often the giveaway of Brembo kit.'],
      ),
    },
    {
      id: 'rear-disc',
      name: 'Rear Brake Disc (245 mm)',
      system: 'brakes',
      position: [RX, AY, -0.085],
      explode: [-0.55, 0, -0.32],
      anim: { type: 'spin', axis: 'z', speed: -5 },
      shapes: [
        { type: 'ring', inner: 0.07, outer: 0.122, segments: 40, material: { ...M.brushed(), side: 'double' } },
        { type: 'cylinder', radius: 0.006, height: 0.006, position: [0.1, 0, 0], rotation: rotZ, array: { count: 10, rotation: [0, 0, PI / 5] }, material: M.metal('#3a3d42') },
      ],
      info: info(
        'A smaller single disc on the right side of the rear wheel.',
        'Right side of the rear wheel hub, inside the swingarm.',
        'Provides extra braking and stability; used gently to settle the bike in corners.',
        'Works like the front: a single-piston floating caliper squeezes pads on it when the rider presses the right foot pedal.',
        ['rear-caliper', 'rear-wheel', 'rear-master-cylinder'],
        'Riders trail a little rear brake on slow U-turns to keep the bike stable.',
        'Rear brake force is limited by grip: under hard braking the rear wheel is lightly loaded, so too much rear brake locks it. Linked-ABS systems blend front and rear automatically.',
        ['On a sport bike the rear brake provides as little as 10–20 % of max stopping power.'],
      ),
    },
    {
      id: 'rear-caliper',
      name: 'Rear Caliper',
      system: 'brakes',
      position: [RX + 0.075, AY + 0.075, -0.085],
      explode: [-0.4, 0.2, -0.45],
      shapes: [
        { type: 'box', size: [0.045, 0.07, 0.04], radius: 0.01, rotation: [0, 0, 0.8], material: M.paint('#1d1f24') },
        { type: 'box', size: [0.14, 0.02, 0.012], position: [0.06, 0.02, -0.015], rotation: [0, 0, -0.23], material: M.aluminium() },
      ],
      info: info(
        'The clamp for the rear disc, attached to the swingarm by a bracket.',
        'Above the rear axle on the right side.',
        'Squeezes the rear brake pads onto the rear disc.',
        'Fluid pressure from the foot pedal pushes a piston; the floating caliper slides on pins so both pads clamp evenly.',
        ['rear-disc', 'swingarm', 'brake-lines', 'rear-master-cylinder'],
        'Single- or twin-piston sliding calipers are common at the rear.',
        'A torque arm/bracket keyed to the swingarm stops the caliper rotating with the disc. Single 34–38 mm piston, sliding pin design.',
        ['Rear pads usually last twice as long as fronts.'],
      ),
    },
    {
      id: 'front-master-cylinder',
      name: 'Front Brake Master Cylinder & Lever',
      system: 'brakes',
      position: [0.39, 1.0, -0.25],
      explode: [0.25, 0.55, -0.35],
      shapes: [
        { type: 'cylinder', radius: 0.016, height: 0.07, rotation: rotX, material: M.aluminium() },
        { type: 'box', size: [0.04, 0.035, 0.04], radius: 0.006, position: [-0.005, 0.04, 0.015], material: M.plastic('#2a2d33') },
        { type: 'box', size: [0.035, 0.012, 0.035], position: [-0.005, 0.062, 0.015], material: M.glass('#3a3a3a') },
        rod([0.39, 1.0, -0.25], [0.41, 1.0, -0.24], [0.45, 0.99, -0.36], 0.006, M.aluminium()),
      ],
      info: info(
        'The hydraulic pump on the right handlebar that you squeeze with the brake lever.',
        'Right handlebar, next to the throttle grip.',
        'Turns finger force into hydraulic pressure for the front calipers.',
        'Squeezing the lever pushes a small piston down a bore full of brake fluid. Fluid can’t compress, so the pressure travels down the brake lines to the calipers. The reservoir on top tops up fluid as pads wear.',
        ['brake-lines', 'front-calipers', 'handlebar'],
        'Radial master cylinders (piston in line with the lever push) give the best feel.',
        'Bore 16–19 mm; smaller bore = more pressure but more lever travel. DOT 4 fluid is hygroscopic (absorbs water), lowering its boiling point – change every 2 years. A brake-light switch is built into the lever perch.',
        ['Brake fluid strips paint – cover the tank before topping it up.'],
      ),
    },
    {
      id: 'rear-master-cylinder',
      name: 'Rear Brake Pedal & Master Cylinder',
      system: 'brakes',
      position: [-0.2, 0.4, -0.15],
      explode: [-0.1, -0.12, -0.45],
      shapes: [
        rod([-0.2, 0.4, -0.15], [-0.2, 0.38, -0.17], [-0.04, 0.32, -0.2], 0.008, M.metal('#2c2e33')),
        { type: 'cylinder', radius: 0.013, height: 0.08, position: [-0.02, 0.06, -0.01], rotation: [0, 0, 0.3], material: M.aluminium() },
        { type: 'cylinder', radius: 0.02, height: 0.04, position: [-0.06, 0.15, 0.02], material: M.plastic('#2a2d33') },
      ],
      info: info(
        'The foot pedal and its small hydraulic pump for the rear brake.',
        'In front of the right footpeg.',
        'Lets the rider operate the rear brake with the right foot.',
        'Pressing the pedal pushes a pushrod into the master cylinder, sending fluid through the rear brake line to the rear caliper.',
        ['rear-caliper', 'brake-lines', 'footpegs'],
        'Scooters put the rear brake on the left handlebar instead.',
        'Pedal ratio and bore are chosen to give modulation rather than raw power. A separate switch on the pedal lights the brake light.',
        ['Trail-braking the rear slightly can tighten a line mid-corner.'],
      ),
    },
    {
      id: 'brake-lines',
      name: 'Brake Lines',
      system: 'brakes',
      position: [0.3, 0.7, 0],
      explode: [0.3, 0.2, -0.25],
      shapes: (() => {
        const o = [0.3, 0.7, 0];
        const m = M.metal('#3a3d42');
        return [
          { type: 'tube', points: rel(o, [[0.39, 1.0, -0.25], [0.44, 0.96, -0.18], [0.5, 0.85, 0], [0.52, 0.82, 0]]), radius: 0.004, radialSegments: 6, material: m },
          { type: 'tube', points: rel(o, [[0.52, 0.82, 0], [0.56, 0.75, 0.09], [0.6, 0.55, 0.11], [0.6, 0.42, 0.075]]), radius: 0.004, radialSegments: 6, material: m },
          { type: 'tube', points: rel(o, [[0.52, 0.82, 0], [0.56, 0.75, -0.09], [0.6, 0.55, -0.11], [0.6, 0.42, -0.075]]), radius: 0.004, radialSegments: 6, material: m },
          { type: 'tube', points: rel(o, [[-0.2, 0.47, -0.13], [-0.32, 0.44, -0.12], [-0.5, 0.4, -0.115], [-0.62, 0.4, -0.1]]), radius: 0.004, radialSegments: 6, material: m },
          { type: 'box', size: [0.03, 0.02, 0.03], position: [0.22, 0.12, 0], material: M.aluminium() },
        ];
      })(),
      info: info(
        'Flexible hoses that carry brake fluid from the master cylinders to the calipers.',
        'From the right handlebar down the forks to both front calipers, and along the swingarm to the rear caliper.',
        'Transmit hydraulic pressure without leaking or ballooning.',
        'Sealed hoses full of incompressible fluid: pressure applied at one end appears instantly at the other. A splitter near the lower triple clamp sends fluid to both front calipers.',
        ['front-master-cylinder', 'front-calipers', 'rear-master-cylinder', 'rear-caliper'],
        'Braided stainless hoses are a popular upgrade over rubber for a firmer lever.',
        'Braided PTFE lines expand far less under 60–100 bar than rubber lines, improving lever feel. On ABS bikes the lines route through the ABS modulator, which can hold, drop and rebuild pressure at each wheel.',
        ['Air in a brake line makes the lever feel spongy because air compresses.'],
      ),
    },

    // ───────────────────────────── SUSPENSION ─────────────────────────────
    {
      id: 'fork-stanchions',
      name: 'Fork Stanchions (Upside-Down)',
      system: 'suspension',
      position: [FX, AY, 0],
      explode: [0.5, 0.3, 0],
      shapes: [
        { type: 'cylinder', radius: 0.026, height: 0.42, position: fk(0.5, 0.11), rotation: [0, 0, RAKE], material: M.paint('#c9a227') },
        { type: 'cylinder', radius: 0.026, height: 0.42, position: fk(0.5, -0.11), rotation: [0, 0, RAKE], material: M.paint('#c9a227') },
        { type: 'cylinder', radius: 0.016, height: 0.02, position: fk(0.72, 0.11), rotation: [0, 0, RAKE], material: M.aluminium() },
        { type: 'cylinder', radius: 0.016, height: 0.02, position: fk(0.72, -0.11), rotation: [0, 0, RAKE], material: M.aluminium() },
      ],
      info: info(
        'The upper, fatter fork tubes clamped into the triple clamps, containing springs and damping cartridges.',
        'The two front legs running from the handlebars down toward the front wheel.',
        'Hold the front wheel and let it move up and down to absorb bumps and braking forces.',
        'This is an upside-down (USD) fork: the big outer tubes are at the top, and the thin chrome inner tubes (with the wheel) slide up inside them. Inside are coil springs and an oil-filled damper that controls how fast the fork moves.',
        ['triple-clamps', 'fork-sliders', 'steering-head'],
        'USD forks are standard on sport bikes; conventional (right-way-up) forks are cheaper and common on commuters.',
        '41–43 mm tubes, ~120–130 mm travel. Rake 24° and fork offset ~30 mm give ~100 mm trail. Spring rate ~9–10 N/mm; separate compression and rebound damping adjusters on top caps. USD forks put heavy tubes above the spring (reducing unsprung mass) and give a stiffer clamp area.',
        ['Fork "dive" under braking can use up two-thirds of the travel.'],
      ),
    },
    {
      id: 'fork-sliders',
      name: 'Fork Sliders, Axle & Front Fender',
      system: 'suspension',
      position: [FX, AY, 0],
      explode: [0.65, 0.05, 0],
      anim: { type: 'piston', axis: 'y', amplitude: 0.012, speed: 3, phase: 0 },
      shapes: [
        { type: 'cylinder', radius: 0.022, height: 0.36, position: fk(0.17, 0.11), rotation: [0, 0, RAKE], material: M.chrome() },
        { type: 'cylinder', radius: 0.022, height: 0.36, position: fk(0.17, -0.11), rotation: [0, 0, RAKE], material: M.chrome() },
        { type: 'box', size: [0.06, 0.06, 0.05], radius: 0.01, position: [0, 0, 0.11], material: M.paint('#1d1f24') },
        { type: 'box', size: [0.06, 0.06, 0.05], radius: 0.01, position: [0, 0, -0.11], material: M.paint('#1d1f24') },
        { type: 'cylinder', radius: 0.012, height: 0.28, rotation: rotZ, material: M.chrome() },
        { type: 'torus', radius: 0.345, tube: 0.012, arc: 1.6, rotation: [0, 0, 0.75], scale: [1, 1, 5], radialSegments: 8, material: M.paint('#1d1f24') },
      ],
      info: info(
        'The lower chrome fork tubes that hold the front axle, plus the front mudguard.',
        'Bottom of the fork, either side of the front wheel.',
        'Carry the front wheel and calipers and slide in and out of the stanchions as the suspension works.',
        'Polished hard-chrome tubes slide through bushes and seals inside the stanchions. The axle clamps through the bottom lugs; the calipers bolt on behind them. The fender keeps road spray off the rider and engine.',
        ['fork-stanchions', 'front-wheel', 'front-calipers', 'front-tyre'],
        'Leaking fork seals usually mean dirt has scratched the chrome – fork seal savers can help.',
        'Hard-chrome or DLC/titanium-nitride coated tubes reduce stiction (static friction) so the fork reacts to small bumps. Fork offset plus rake set trail: trail = (R·sin(rake) − offset)/cos(rake) ≈ 100 mm here, which provides self-centring stability.',
        ['Trail is why a bike rolling with no hands keeps going straight.'],
      ),
    },
    {
      id: 'triple-clamps',
      name: 'Triple Clamps (Yokes)',
      system: 'suspension',
      position: [FX, AY, 0],
      explode: [0.45, 0.45, 0],
      shapes: [
        { type: 'box', size: [0.09, 0.035, 0.29], radius: 0.012, position: fk(0.53), rotation: [0, 0, RAKE], material: M.aluminium() },
        { type: 'box', size: [0.1, 0.025, 0.29], radius: 0.01, position: fk(0.69), rotation: [0, 0, RAKE], material: M.aluminium() },
        { type: 'cylinder', radius: 0.012, height: 0.012, position: fk(0.705), rotation: [0, 0, RAKE], material: M.metal() },
      ],
      info: info(
        'Two aluminium brackets that clamp both fork legs together and to the steering stem.',
        'Top and bottom of the steering head, just below the handlebar.',
        'Hold the forks parallel and let the whole front end rotate for steering.',
        'A stem runs from the lower clamp up through bearings in the steering head and is bolted to the upper clamp. Turning the handlebar rotates the clamps, forks and front wheel together.',
        ['steering-head', 'fork-stanchions', 'handlebar', 'headlight'],
        'Aftermarket yokes can change fork offset to tune steering speed.',
        'Fork offset (here ~30 mm) is the distance between the steering axis and fork tube axis: more offset = less trail = quicker steering. Clamp bolt torque is critical – over-tightening distorts the fork tubes and causes stiction.',
        ['Called "yokes" in the UK and "triple trees" in the US.'],
      ),
    },
    {
      id: 'rear-shock',
      name: 'Rear Monoshock',
      system: 'suspension',
      position: [-0.33, 0.51, 0],
      explode: [-0.1, 0.25, -0.45],
      anim: { type: 'piston', axis: 'y', amplitude: 0.01, speed: 3, phase: PI },
      shapes: [
        { type: 'cylinder', radius: 0.022, height: 0.3, position: [0.005, 0.04, 0], rotation: [0, 0, -0.142], material: M.paint('#1d1f24') },
        { type: 'cylinder', radius: 0.008, height: 0.12, position: [-0.02, -0.14, 0], rotation: [0, 0, -0.142], material: M.chrome() },
        { type: 'helix', radius: 0.036, height: 0.22, turns: 7, tube: 0.007, position: [0, -0.01, 0], rotation: [0, 0, -0.142], material: M.paint('#c1121f') },
        { type: 'cylinder', radius: 0.04, height: 0.012, position: [0.014, 0.105, 0], rotation: [0, 0, -0.142], material: M.aluminium() },
        { type: 'cylinder', radius: 0.018, height: 0.09, position: [0.05, 0.13, -0.05], rotation: [0, 0, -0.142], material: M.paint('#c9a227') },
        { type: 'cylinder', radius: 0.014, height: 0.035, position: [0.03, 0.2, 0], rotation: rotZ, material: M.metal() },
        { type: 'cylinder', radius: 0.014, height: 0.035, position: [-0.03, -0.205, 0], rotation: rotZ, material: M.metal() },
      ],
      info: info(
        'A single coil-over spring and damper unit that controls the rear suspension.',
        'In the middle of the bike, behind the engine, under the seat.',
        'Supports the rear of the bike and controls how fast the rear wheel moves over bumps.',
        'The spring holds the bike up and stores energy when compressed. The damper forces oil through tiny holes so the spring doesn’t keep bouncing. A gas-filled piggy-back reservoir prevents the oil foaming.',
        ['swingarm', 'shock-linkage', 'frame'],
        'Adjusting preload for a passenger or luggage is the most common tweak.',
        'Spring ~95 N/mm, ~130 mm wheel travel. Adjusters: spring preload (sets sag – aim for ≈ 30–35 mm rider sag), rebound damping, compression damping. Nitrogen at ~10 bar in the reservoir keeps the oil under pressure to avoid cavitation.',
        ['Single-shock rear ends were popularised by Yamaha’s Monocross in the 1970s.'],
      ),
    },
    {
      id: 'shock-linkage',
      name: 'Rising-Rate Linkage',
      system: 'suspension',
      position: [-0.37, 0.3, 0],
      explode: [-0.1, -0.2, -0.3],
      anim: { type: 'rock', axis: 'z', amplitude: 0.08, speed: 3, phase: 0 },
      shapes: [
        { type: 'extrude', outline: [[-0.04, 0.01], [0.04, -0.02], [0.02, 0.04]], depth: 0.05, bevel: 0.008, material: M.aluminium() },
        rod([-0.37, 0.3, 0], [-0.35, 0.28, 0.035], [-0.22, 0.32, 0.035], 0.008, M.metal()),
        rod([-0.37, 0.3, 0], [-0.35, 0.28, -0.035], [-0.22, 0.32, -0.035], 0.008, M.metal()),
        rod([-0.37, 0.3, 0], [-0.4, 0.31, 0], [-0.43, 0.37, 0], 0.01, M.metal()),
      ],
      info: info(
        'A set of levers between the swingarm, shock and frame that changes how stiff the suspension feels as it compresses.',
        'Under the swingarm, below the shock.',
        'Makes the rear soft on small bumps and progressively firmer on big hits.',
        'As the swingarm rises, a triangular rocker turns and dog-bone rods pull it around, compressing the shock more and more per millimetre of wheel travel.',
        ['rear-shock', 'swingarm', 'frame'],
        'Some naked bikes skip the linkage and mount the shock directly (e.g. KTM Duke PDS) for simplicity.',
        'Leverage ratio drops from ≈ 2.3:1 at full extension to ≈ 1.9:1 at full compression – a "rising rate". Changing dog-bone length alters ride height and the rate curve. Needle-roller bearings need regular greasing.',
        ['A seized linkage bearing makes the rear suspension feel rock-hard.'],
      ),
    },

    // ───────────────────────────── STEERING ─────────────────────────────
    {
      id: 'steering-head',
      name: 'Steering Head & Stem',
      system: 'steering',
      position: [FX, AY, 0],
      explode: [0.2, 0.25, 0],
      shapes: [
        { type: 'cylinder', radius: 0.03, height: 0.15, position: fk(0.61), rotation: [0, 0, RAKE], material: M.paint('#c1121f') },
        { type: 'cylinder', radius: 0.014, height: 0.2, position: fk(0.61), rotation: [0, 0, RAKE], material: M.metal() },
        { type: 'torus', radius: 0.026, tube: 0.006, position: fk(0.535), rotation: [PI / 2, RAKE, 0], material: M.metal('#3a3d42') },
        { type: 'torus', radius: 0.026, tube: 0.006, position: fk(0.685), rotation: [PI / 2, RAKE, 0], material: M.metal('#3a3d42') },
      ],
      info: info(
        'The short tilted tube at the very front of the frame in which the steering stem turns on bearings.',
        'At the front of the frame, directly behind the headlight and between the triple clamps.',
        'Sets the steering axis angle (rake) and lets the front end turn smoothly.',
        'Tapered roller bearings at top and bottom carry the steering stem. The whole fork assembly pivots about this axis when you turn the bars.',
        ['frame', 'triple-clamps', 'handlebar', 'fork-stanchions'],
        'A "notchy" feeling when steering straight ahead is a sign of worn head bearings.',
        'Rake (here 24°) is the angle of the steering axis from vertical. Together with fork offset it sets trail (~100 mm). Short rake/trail = fast, light steering (sport bikes ~23–25°/95–100 mm); long rake/trail = stability (cruisers ~30°+/120+ mm). A steering damper is often fitted here to calm "tank-slappers".',
        ['Steep rake makes a bike flick-able but more prone to head-shake.'],
      ),
    },
    {
      id: 'handlebar',
      name: 'Handlebar, Grips & Mirrors',
      system: 'steering',
      position: [0.4, 1.0, 0],
      explode: [0.3, 0.55, 0],
      shapes: [
        { type: 'tube', points: rel([0.4, 1.0, 0], [[0.37, 1.02, 0.37], [0.4, 1.0, 0.2], [0.415, 0.985, 0], [0.4, 1.0, -0.2], [0.37, 1.02, -0.37]]), radius: 0.011, radialSegments: 10, material: M.metal('#2c2e33') },
        { type: 'cylinder', radius: 0.017, height: 0.12, position: [-0.028, 0.017, 0.31], rotation: [PI / 2, 0.15, 0], material: M.rubber() },
        { type: 'cylinder', radius: 0.018, height: 0.12, position: [-0.028, 0.017, -0.31], rotation: [PI / 2, -0.15, 0], material: M.rubber() },
        { type: 'box', size: [0.05, 0.04, 0.05], radius: 0.01, position: [-0.012, 0.005, 0.2], material: M.plastic() },
        { type: 'box', size: [0.05, 0.04, 0.05], radius: 0.01, position: [-0.012, 0.005, -0.2], material: M.plastic() },
        { type: 'tube', points: [[-0.01, 0.02, 0.23], [-0.03, 0.1, 0.27], [-0.06, 0.17, 0.3]], radius: 0.005, radialSegments: 6, material: M.metal('#2c2e33') },
        { type: 'tube', points: [[-0.01, 0.02, -0.23], [-0.03, 0.1, -0.27], [-0.06, 0.17, -0.3]], radius: 0.005, radialSegments: 6, material: M.metal('#2c2e33') },
        { type: 'sphere', radius: 0.05, position: [-0.065, 0.18, 0.33], scale: [0.35, 0.65, 1], widthSegments: 20, heightSegments: 14, material: M.plastic('#1d1f24') },
        { type: 'sphere', radius: 0.05, position: [-0.065, 0.18, -0.33], scale: [0.35, 0.65, 1], widthSegments: 20, heightSegments: 14, material: M.plastic('#1d1f24') },
        { type: 'sphere', radius: 0.045, position: [-0.08, 0.18, 0.33], scale: [0.1, 0.6, 0.95], widthSegments: 20, heightSegments: 14, material: M.chrome() },
        { type: 'sphere', radius: 0.045, position: [-0.08, 0.18, -0.33], scale: [0.1, 0.6, 0.95], widthSegments: 20, heightSegments: 14, material: M.chrome() },
      ],
      info: info(
        'The wide tubular bar the rider holds, with rubber grips, switch gear and rear-view mirrors.',
        'On top of the upper triple clamp, in front of the fuel tank.',
        'Gives leverage to steer and carries all hand controls: throttle (right grip), front brake (right lever), clutch (left lever) and switches.',
        'The right grip twists to open the throttle via cables or a "ride-by-wire" sensor. Switch cubes hold the starter, kill switch, indicators, horn and lights. Mirrors on stalks show the road behind.',
        ['triple-clamps', 'clutch-lever', 'front-master-cylinder', 'throttle-body', 'instrument-cluster', 'steering-head'],
        'Wide, flat "naked" bars give lots of leverage; supersports use low clip-ons; adventure bikes use tall, wide bars.',
        'COUNTERSTEERING: above ~15 km/h, to turn right you briefly push the right bar forward. That steers the front tyre momentarily left, the contact patches move out from under the centre of mass, and the bike falls (leans) to the right – then it turns right. Wider bars mean less force is needed for this input. Ride-by-wire throttles send a twist-grip position signal to the ECU instead of pulling a cable.',
        ['To go right, push right – the essence of countersteering.', 'The kill switch is the red rocker by the right thumb.'],
      ),
    },

    // ───────────────────────────── ELECTRICAL ─────────────────────────────
    {
      id: 'battery',
      name: 'Battery (12 V)',
      system: 'electrical',
      position: [-0.44, 0.72, 0],
      explode: [-0.1, 0.35, 0.45],
      shapes: [
        { type: 'box', size: [0.12, 0.09, 0.08], radius: 0.006, material: M.plastic('#222428') },
        { type: 'box', size: [0.015, 0.012, 0.015], position: [0.04, 0.05, 0.025], material: M.paint('#c1121f') },
        { type: 'box', size: [0.015, 0.012, 0.015], position: [-0.04, 0.05, 0.025], material: M.plastic('#111') },
      ],
      info: info(
        'A compact 12-volt battery that stores electrical energy.',
        'Under the rider’s seat.',
        'Powers the starter motor to crank the engine, and steadies the electrical system while running.',
        'Chemical reactions between lead plates and acid (or lithium cells) release electrons when a circuit is connected. While the engine runs, the charging system pushes current back in to recharge it.',
        ['regulator-rectifier', 'ecu', 'wiring-harness', 'stator'],
        'Lithium-iron batteries can save 2–3 kg over lead-acid on sport bikes.',
        '12 V, ~8–10 Ah AGM (absorbent glass mat) or LiFePO4. Starter draw is 100–150 A for a second or two. A healthy battery reads ~12.7 V at rest, 13.8–14.5 V with engine running. Use a smart trickle charger over winter.',
        ['A battery losing charge is the #1 reason bikes won’t start in spring.'],
      ),
    },
    {
      id: 'regulator-rectifier',
      name: 'Regulator-Rectifier',
      system: 'electrical',
      position: [-0.57, 0.73, -0.08],
      explode: [-0.2, 0.3, -0.45],
      shapes: [
        { type: 'box', size: [0.07, 0.016, 0.06], radius: 0.003, material: M.metal('#3a3d42') },
        { type: 'box', size: [0.07, 0.012, 0.003], position: [0, 0.014, -0.025], array: { count: 9, offset: [0, 0, 0.0062] }, material: M.metal('#3a3d42') },
      ],
      info: info(
        'A finned electronic box that converts the alternator’s raw AC power into steady 14-volt DC.',
        'Under the tail, where air can flow over its fins.',
        'Protects the battery and electronics from over-voltage and makes the alternator’s output usable.',
        'Diodes "rectify" alternating current into one direction (DC); a regulator circuit dumps or blocks the excess so the voltage never rises above about 14.5 V.',
        ['stator', 'battery', 'wiring-harness'],
        'A failing reg-rec is the classic cause of boiled batteries or flat batteries on older bikes.',
        'Traditional shunt regulators short excess current to ground through the stator and turn it into heat – hence the fins. MOSFET series regulators (e.g. Shindengen SH847) open the circuit instead, running much cooler and more efficiently.',
        ['If your battery reads above 15 V while revving, suspect the regulator.'],
      ),
    },
    {
      id: 'stator',
      name: 'Stator / Alternator',
      system: 'electrical',
      position: [CRANK[0], CRANK[1], 0.15],
      explode: [0.1, 0, 0.65],
      anim: { type: 'spin', axis: 'z', speed: -8 },
      shapes: [
        { type: 'cylinder', radius: 0.065, height: 0.025, open: true, rotation: rotZ, material: M.metal('#5b5f66') },
        { type: 'box', size: [0.022, 0.014, 0.022], position: [0.042, 0, 0], array: { count: 12, rotation: [0, 0, PI / 6] }, material: M.copper() },
        { type: 'cylinder', radius: 0.022, height: 0.025, rotation: rotZ, material: M.metal() },
      ],
      info: info(
        'The bike’s generator: a ring of copper coils with a spinning magnet around it.',
        'On the left end of the crankshaft, behind the left engine cover.',
        'Produces electricity to run the lights, ignition and fuel injection and to recharge the battery.',
        'A magnetised rotor bolted to the crank spins around the stationary copper coils (the stator). The moving magnetic field induces alternating current in the coils – Faraday’s law of induction.',
        ['crankshaft', 'regulator-rectifier', 'battery', 'ecu'],
        'Bicycle dynamo hub lights work on the same principle.',
        'Permanent-magnet three-phase alternator producing ~350–450 W at 5,000 rpm. Output rises with rpm, which is why low-rpm idling with all lights on can slowly drain the battery. Coil resistance (~0.2–0.5 Ω phase-to-phase) and AC output (~50–70 V at 5,000 rpm) are standard diagnostic checks.',
        ['The rotor doubles as a flywheel, smoothing out the engine’s power pulses.'],
      ),
    },
    {
      id: 'ecu',
      name: 'ECU & Ignition',
      system: 'electrical',
      position: [-0.63, 0.79, 0.04],
      explode: [-0.2, 0.45, 0.35],
      shapes: [
        { type: 'box', size: [0.11, 0.025, 0.07], radius: 0.005, material: M.aluminium() },
        { type: 'box', size: [0.02, 0.02, 0.05], position: [0.06, 0, 0], material: M.plastic('#111') },
        { type: 'box', size: [0.09, 0.004, 0.003], position: [0, 0.014, -0.025], array: { count: 6, offset: [0, 0, 0.01] }, material: M.aluminium() },
      ],
      info: info(
        'The engine control unit – a small computer that runs the fuel injection, ignition and rider aids.',
        'Under the seat / tail (ignition coils sit on the spark plugs in the cylinder head).',
        'Decides exactly when to fire each spark plug and how much fuel to inject, thousands of times per second.',
        'Sensors report rpm (crank sensor), throttle angle, air temperature/pressure, engine temperature and exhaust oxygen. The ECU looks up maps and fires the injectors and stick coils at the right moment. It also handles the side-stand/neutral/clutch start interlock.',
        ['throttle-body', 'cylinder-head', 'wiring-harness', 'battery', 'stator', 'fuel-pump'],
        'Riding modes (Rain / Road / Sport) are just different ECU maps and traction-control settings.',
        'Ignition timing advance ~10° BTDC at idle up to ~35–40° at high rpm. Closed-loop lambda control targets stoichiometric 14.7:1 AFR at cruise; open-loop richer (~12.5–13:1) at full throttle. Modern ECUs with an IMU add cornering ABS and lean-sensitive traction control.',
        ['A "flash" or remap changes these maps – often to remove emissions-driven lean spots.'],
      ),
    },
    {
      id: 'wiring-harness',
      name: 'Wiring Harness',
      system: 'electrical',
      position: [0, 0.8, 0],
      explode: [0, 0.15, 0.3],
      anim: { type: 'flow', speed: 3 },
      shapes: [
        {
          type: 'tube',
          points: rel([0, 0.8, 0], [[-0.63, 0.78, 0.04], [-0.44, 0.78, 0.07], [-0.2, 0.77, 0.1], [0.05, 0.8, 0.105], [0.3, 0.85, 0.08], [0.47, 0.88, 0.05], [0.55, 0.9, 0.02]]),
          radius: 0.007,
          radialSegments: 6,
          material: M.wire('#2a2d33'),
        },
        {
          type: 'tube',
          points: rel([0, 0.8, 0], [[-0.2, 0.77, 0.1], [-0.12, 0.6, 0.12], [0.02, 0.45, 0.14]]),
          radius: 0.005,
          radialSegments: 6,
          material: M.wire('#f4c430'),
        },
        {
          type: 'tube',
          points: rel([0, 0.8, 0], [[-0.63, 0.78, 0.04], [-0.75, 0.86, 0.02], [-0.86, 0.9, 0]]),
          radius: 0.005,
          radialSegments: 6,
          material: M.wire('#2a2d33'),
        },
      ],
      info: info(
        'The bundle of wires that connects every electrical part of the bike.',
        'Runs along the frame from the tail, past the engine, to the headlight and handlebar switches.',
        'Carries power and sensor signals between the battery, ECU, lights, switches and engine.',
        'Colour-coded wires are taped or sleeved into one loom with waterproof connectors. Fuses and relays protect each circuit.',
        ['battery', 'ecu', 'headlight', 'tail-light', 'instrument-cluster', 'regulator-rectifier', 'stator'],
        'Modern bikes use CAN-bus networking, so a single pair of wires carries data between the ECU, ABS and dash.',
        'CAN-bus at 500 kbit/s links ECU, ABS, IMU and dash. Typical main fuse 30 A. Chafing where the harness passes the steering head is a common fault – it must flex lock-to-lock thousands of times.',
        ['A bike harness can contain over 100 m of wire.'],
      ),
    },
    {
      id: 'headlight',
      name: 'LED Headlight',
      system: 'electrical',
      position: [0.58, 0.9, 0],
      explode: [0.8, 0.15, 0],
      shapes: [
        { type: 'cylinder', radius: 0.085, height: 0.09, rotation: rotX, material: M.paint('#1d1f24') },
        { type: 'cylinder', radius: 0.078, height: 0.01, position: [0.046, 0, 0], rotation: rotX, material: M.glass('#dbe9ff') },
        { type: 'torus', radius: 0.055, tube: 0.006, position: [0.048, 0, 0], rotation: [0, PI / 2, 0], material: M.light('#e8f4ff', 3) },
        { type: 'box', size: [0.1, 0.012, 0.012], position: [-0.08, -0.02, 0.08], rotation: [0, 0, 0.3], material: M.metal('#2c2e33') },
        { type: 'box', size: [0.1, 0.012, 0.012], position: [-0.08, -0.02, -0.08], rotation: [0, 0, 0.3], material: M.metal('#2c2e33') },
        { type: 'capsule', radius: 0.012, length: 0.03, position: [-0.02, 0.0, 0.13], rotation: rotZ, material: M.light('#ffb347', 1.2) },
        { type: 'capsule', radius: 0.012, length: 0.03, position: [-0.02, 0.0, -0.13], rotation: rotZ, material: M.light('#ffb347', 1.2) },
      ],
      info: info(
        'The round LED headlamp (with indicators either side) that lights the road ahead.',
        'Front of the bike, mounted on brackets to the fork, ahead of the handlebar.',
        'Lets the rider see at night and makes the bike visible to others.',
        'LEDs behind a lens and reflector create low and high beams; a ring daytime-running light (DRL) is lit at all times. Because it is mounted to the forks, it turns with the steering.',
        ['triple-clamps', 'wiring-harness', 'instrument-cluster'],
        'A round headlight is the visual signature of "naked" and retro bikes.',
        'LED units draw ≈ 20–30 W vs 55/60 W for an H4 halogen, easing the load on the alternator. Advanced bikes use cornering lights that switch on extra LEDs based on lean angle from the IMU.',
        ['Fork-mounted headlights point where the bike is steering, not where it is leaning.'],
      ),
    },
    {
      id: 'tail-light',
      name: 'LED Tail Light',
      system: 'electrical',
      position: [-0.885, 0.91, 0],
      explode: [-0.5, 0.2, 0],
      shapes: [
        { type: 'box', size: [0.03, 0.03, 0.12], radius: 0.01, rotation: [0, 0, 0.35], material: M.light('#ff2a2a', 2) },
        { type: 'box', size: [0.13, 0.008, 0.16], position: [0.02, -0.13, 0], rotation: [0, 0, -1.0], material: M.plastic('#1d1f24') },
      ],
      info: info(
        'The red rear light and brake light.',
        'At the very back of the tail section.',
        'Shows the bike’s position at night and flashes brighter when braking.',
        'A low-intensity setting is on with the ignition; the front lever or rear pedal switch closes a circuit that drives the LEDs at full brightness.',
        ['tail-section', 'wiring-harness', 'front-master-cylinder', 'rear-master-cylinder'],
        'Some bikes flash the brake light rapidly under emergency braking (ESS).',
        'LEDs switch on in < 1 ms versus ~200 ms for a filament bulb – at 100 km/h that is about 5.5 m of extra warning for the driver behind.',
        ['The hanger below carries the number plate and plate light.'],
      ),
    },
    {
      id: 'instrument-cluster',
      name: 'Instrument Cluster (TFT)',
      system: 'electrical',
      position: [0.46, 1.06, 0],
      explode: [0.4, 0.7, 0],
      shapes: [
        { type: 'box', size: [0.035, 0.08, 0.14], radius: 0.01, rotation: [0, 0, 0.5], material: M.plastic('#1d1f24') },
        { type: 'box', size: [0.004, 0.06, 0.12], position: [-0.016, 0.01, 0], rotation: [0, 0, 0.5], material: M.light('#4cc9f0', 0.8) },
      ],
      info: info(
        'The digital dashboard showing speed, rpm, gear, fuel and warnings.',
        'Above the handlebar clamp, facing the rider.',
        'Keeps the rider informed: speed, gear, revs, fuel, temperature and warning lights.',
        'Receives data from the ECU and ABS over CAN-bus and draws it on a colour TFT screen. Warning lights include neutral (green N), oil pressure, ABS and engine check.',
        ['ecu', 'wiring-harness', 'handlebar', 'shift-drum'],
        'Many dashes now pair with your phone for navigation and calls.',
        'Gear indicator is calculated from road speed ÷ engine rpm or read from the shift drum position sensor. Ambient-light sensors auto-switch day/night themes.',
        ['A green "N" light comes from a switch on the end of the shift drum.'],
      ),
    },

    // ───────────────────────────── FUEL & EXHAUST ─────────────────────────────
    {
      id: 'fuel-tank',
      name: 'Fuel Tank (14 L)',
      system: 'fuel',
      position: [0.17, 0.95, 0],
      explode: [0, 0.75, 0],
      shapes: [
        { type: 'sphere', radius: 0.2, scale: [1.2, 0.62, 0.85], material: M.paint('#c1121f') },
        { type: 'sphere', radius: 0.12, position: [0.18, -0.035, 0], scale: [1, 0.7, 1.15], material: M.paint('#c1121f') },
        { type: 'cylinder', radius: 0.04, height: 0.012, position: [0.04, 0.12, 0], material: M.aluminium() },
        { type: 'sphere', radius: 0.09, position: [-0.13, -0.05, 0.11], scale: [1.4, 0.8, 0.3], widthSegments: 20, heightSegments: 14, material: M.rubber() },
        { type: 'sphere', radius: 0.09, position: [-0.13, -0.05, -0.11], scale: [1.4, 0.8, 0.3], widthSegments: 20, heightSegments: 14, material: M.rubber() },
        { type: 'box', size: [0.38, 0.004, 0.012], position: [0.0, 0.122, 0.05], rotation: [0, 0, 0], material: M.paint('#f2f2f2') },
      ],
      info: info(
        'The sculpted painted tank that holds the petrol, sitting between the rider’s knees.',
        'On top of the frame, between the handlebar and seat, directly above the engine.',
        'Stores fuel and gives the rider something to grip with the knees.',
        'Petrol is poured in through the lockable cap and an internal pump sends it to the injectors. Breather pipes and a charcoal canister handle fuel vapour. Rubber knee pads help the rider hold on under braking and in corners.',
        ['fuel-pump', 'frame', 'seat', 'air-box'],
        'On many bikes the "tank" is partly a plastic cover, with the real fuel cell under the seat to centralise mass.',
        '14 L steel tank, giving ~250–300 km range at ~4.5 L/100 km. Fuel is ~10 kg of mass high in the bike – its level changes handling slightly. Gripping the tank with the knees lets the arms stay relaxed, which is key for good countersteering inputs.',
        ['The fuel tank is usually the most "designed" part of a bike.'],
      ),
    },
    {
      id: 'fuel-pump',
      name: 'Fuel Pump',
      system: 'fuel',
      position: [0.12, 0.88, 0],
      explode: [0.05, 0.45, 0.25],
      shapes: [
        { type: 'cylinder', radius: 0.03, height: 0.1, material: M.plastic('#2a2d33') },
        { type: 'cylinder', radius: 0.05, height: 0.01, position: [0, -0.05, 0], material: M.aluminium() },
        { type: 'cylinder', radius: 0.022, height: 0.025, position: [0, 0.06, 0], material: M.plastic('#ffffff') },
        { type: 'tube', points: [[0, -0.055, 0], [-0.05, -0.1, 0.02], [-0.1, -0.15, 0.02]], radius: 0.004, radialSegments: 6, material: M.plastic('#111') },
      ],
      info: info(
        'An electric pump inside the fuel tank that sends petrol to the injectors under pressure.',
        'Mounted through the bottom of the fuel tank.',
        'Supplies a steady, pressurised flow of fuel to the throttle bodies.',
        'When you switch on the ignition you hear it whirr for 2 seconds as it pressurises the line. A filter sock cleans the fuel; a regulator keeps the pressure constant; a float sender measures fuel level for the gauge.',
        ['fuel-tank', 'throttle-body', 'ecu'],
        'Carburetted bikes used gravity feed instead – no pump needed.',
        'Turbine-type pump, ≈ 3 bar (≈ 43 psi) regulated pressure, returnless system. It is cooled and lubricated by the fuel itself – running the tank dry regularly shortens its life.',
        ['That 2-second hum at key-on is the pump priming.'],
      ),
    },
    {
      id: 'throttle-body',
      name: 'Throttle Bodies & Injectors',
      system: 'fuel',
      position: [0.0, 0.72, 0],
      explode: [0.05, 0.3, 0.35],
      shapes: [
        { type: 'cylinder', radius: 0.022, height: 0.07, position: [0, 0, 0.05], rotation: [0, 0, PI / 2 - 0.25], material: M.aluminium() },
        { type: 'cylinder', radius: 0.022, height: 0.07, position: [0, 0, -0.05], rotation: [0, 0, PI / 2 - 0.25], material: M.aluminium() },
        { type: 'cylinder', radius: 0.004, height: 0.13, position: [0, 0, 0], rotation: rotZ, material: M.metal() },
        { type: 'cylinder', radius: 0.008, height: 0.04, position: [0.02, 0.03, 0.05], rotation: [0, 0, -0.5], material: M.plastic('#1d1f24') },
        { type: 'cylinder', radius: 0.008, height: 0.04, position: [0.02, 0.03, -0.05], rotation: [0, 0, -0.5], material: M.plastic('#1d1f24') },
        { type: 'box', size: [0.03, 0.03, 0.02], position: [0, 0, 0.09], material: M.plastic('#2a2d33') },
      ],
      info: info(
        'Two tubes with butterfly valves that control how much air enters the engine, plus injectors that spray in fuel.',
        'Behind the cylinder head, between the air box and the intake ports.',
        'This is what the throttle grip actually controls – more air (and fuel) = more power.',
        'Twisting the grip opens a flat butterfly valve in each tube. The ECU measures the opening with a throttle-position sensor and fires the injector for the right length of time to match the airflow.',
        ['air-box', 'cylinder-head', 'ecu', 'fuel-pump', 'handlebar'],
        'Older or simpler bikes use carburettors, which meter fuel using the venturi effect instead of electronics.',
        '42 mm throttle bodies. Injector pulse width ~2–15 ms. A shared shaft ("sync") keeps both cylinders breathing equally; a vacuum balance is checked at service. Ride-by-wire versions replace the cable with a motor, enabling cruise control and riding modes.',
        ['A carburettor and a throttle body do the same job: control air and add fuel.'],
      ),
    },
    {
      id: 'air-box',
      name: 'Air Box & Filter',
      system: 'fuel',
      position: [-0.1, 0.78, 0],
      explode: [-0.05, 0.5, 0],
      shapes: [
        { type: 'box', size: [0.17, 0.09, 0.2], radius: 0.02, material: M.plastic('#2a2d33') },
        { type: 'box', size: [0.12, 0.012, 0.15], position: [0.0, 0.05, 0], material: M.plastic('#d1495b') },
        { type: 'cylinder', radius: 0.022, height: 0.05, position: [-0.06, 0.02, 0.1], rotation: rotZ, material: M.plastic('#1d1f24') },
      ],
      info: info(
        'A plastic box holding the air filter, from which the engine breathes.',
        'Under the back of the fuel tank, above the throttle bodies.',
        'Supplies clean, calm air to the engine and quietens intake noise.',
        'Air enters through snorkels, passes through a pleated filter that traps dust, and settles in the box before being drawn into the throttle bodies.',
        ['throttle-body', 'fuel-tank', 'ecu'],
        'A clogged filter makes a bike feel flat and use more fuel; dusty off-road riding means frequent cleaning.',
        'Air box volume (~8–10 L) is tuned like a Helmholtz resonator to add a few percent of torque at certain rpm. An intake-air temperature sensor and crankcase breather hose also connect here.',
        ['The air box is often what makes the "induction roar" you hear from the saddle.'],
      ),
    },
    {
      id: 'exhaust-header',
      name: 'Exhaust Headers & Collector',
      system: 'fuel',
      position: [0.15, 0.3, 0],
      explode: [0.2, -0.05, -0.6],
      shapes: (() => {
        const o = [0.15, 0.3, 0];
        const s = M.brushed('#c9b9a3');
        const pipe = (z) => ({
          type: 'tube',
          points: rel(o, [[0.25, 0.68, z], [0.33, 0.6, z * 1.2], [0.37, 0.45, z * 1.4], [0.31, 0.22, z * 1.2], [0.15, 0.15, z * 0.6], [-0.03, 0.15, -0.02]]),
          radius: 0.019,
          radialSegments: 12,
          material: s,
        });
        return [
          pipe(0.05),
          pipe(-0.05),
          { type: 'tube', points: rel(o, [[-0.03, 0.15, -0.02], [-0.18, 0.18, -0.08], [-0.3, 0.27, -0.15], [-0.36, 0.33, -0.17]]), radius: 0.024, radialSegments: 12, material: s },
          { type: 'cylinder', radius: 0.026, height: 0.08, position: [-0.02 - o[0], 0.15 - o[1], -0.02], rotation: rotX, material: M.metal('#3a3d42') },
        ];
      })(),
      info: info(
        'Stainless pipes that carry hot exhaust gas away from the cylinder head.',
        'From the front of the cylinder head, curving down in front of and under the engine.',
        'Remove burnt gases from the cylinders and help the engine breathe out efficiently.',
        'Hot gas (up to ~800 °C) leaves each exhaust port, travels down its own header pipe, and merges in a collector beneath the engine, which also houses the catalytic converter and an oxygen sensor.',
        ['cylinder-head', 'muffler', 'ecu'],
        'Golden-blue heat colouring on stainless headers is normal and prized by enthusiasts.',
        'Header length and diameter are tuned so pressure waves from one cylinder help scavenge the next (2-into-1 with a balance pipe). The oxygen (lambda) sensor feeds the ECU for closed-loop fuelling; the catalyst converts CO, HC and NOx to CO₂, H₂O and N₂ – required for Euro 5+.',
        ['Headers can glow red after a hard track session.'],
      ),
    },
    {
      id: 'muffler',
      name: 'Muffler (Silencer)',
      system: 'fuel',
      position: [-0.5, 0.42, -0.18],
      explode: [-0.2, 0.0, -0.75],
      shapes: [
        { type: 'cylinder', radius: 0.055, height: 0.36, rotation: [0, 0, PI / 2 - 0.3], material: M.brushed('#7d838a') },
        { type: 'cylinder', radius: 0.057, height: 0.03, position: [-0.17 * 0.955, 0.17 * 0.296, 0], rotation: [0, 0, PI / 2 - 0.3], material: M.metal('#1d1f24') },
        { type: 'cylinder', radius: 0.022, height: 0.04, position: [-0.2 * 0.955, 0.2 * 0.296, 0], rotation: [0, 0, PI / 2 - 0.3], material: M.metal('#1d1f24') },
        { type: 'cone', radius: 0.055, height: 0.06, position: [0.2 * 0.955, -0.2 * 0.296, 0], rotation: [0, 0, PI / 2 - 0.3 + PI], material: M.brushed('#7d838a') },
        { type: 'box', size: [0.08, 0.04, 0.012], position: [0.0, 0.07, 0.04], material: M.aluminium() },
      ],
      info: info(
        'The large can at the end of the exhaust that quietens the engine’s noise.',
        'Right side of the bike, beside the rear wheel.',
        'Reduces exhaust noise to legal levels and directs hot gases away from the rider.',
        'Inside are perforated tubes and sound-absorbing packing (or baffle chambers) that spread out and absorb pressure pulses, turning loud bangs into a deep hum.',
        ['exhaust-header', 'swingarm'],
        'Aftermarket "slip-on" silencers (Akrapovič, SC-Project) are the most common bike modification.',
        'Absorptive silencers use glass/basalt wool around a perforated core; packing burns out over time and the bike gets louder. Euro 5 limits drive-by noise to ~77 dB(A). Many have an exhaust valve controlled by the ECU to pass noise tests while keeping low-rpm torque.',
        ['A parallel twin with a 270° crank sounds much like a V-twin through the muffler.'],
      ),
    },
  ],
  steps: [
    {
      title: 'Starting the engine',
      text:
        'Key on: the fuel pump hums to pressurise the injectors and the dash lights up. With the gearbox in neutral (or the clutch pulled and side stand up), the starter spins the crankshaft. The ECU reads crank position, fires the injectors and spark plugs, and the parallel twin catches – pistons begin their four-stroke cycle.',
      focus: ['battery', 'crankshaft', 'pistons', 'ecu', 'fuel-pump', 'throttle-body', 'cylinder-head'],
      explode: 0.4,
      animate: true,
    },
    {
      title: 'Clutch & sequential gear shift',
      text:
        'Pull the clutch lever: the cable lifts the pressure plate and the wet plates separate, so the engine spins without driving the gearbox. Click the gear lever: the shift drum rotates one step and its grooves slide a selector fork, locking a new gear pair to its shaft. Pattern is 1–N–2–3–4–5–6; neutral sits a half-click between 1st and 2nd, which is why it is easiest to find while rolling. Release the clutch smoothly through the friction zone.',
      focus: ['clutch-lever', 'clutch-pack', 'clutch-basket', 'gear-lever', 'shift-drum', 'gearbox-gears'],
      explode: 0.7,
      animate: true,
    },
    {
      title: 'Chain final drive',
      text:
        'The gearbox output shaft turns the 15-tooth front sprocket, which pulls the top run of the 520 O-ring chain. The chain turns the 43-tooth rear sprocket on the rear wheel – a 2.87:1 reduction that multiplies torque. The chain needs a little slack because the swingarm moves up and down.',
      focus: ['front-sprocket', 'chain', 'rear-sprocket', 'rear-wheel', 'swingarm'],
      explode: 0.35,
      animate: true,
    },
    {
      title: 'Braking',
      text:
        'Squeeze the right lever: the master cylinder pressurises brake fluid, which travels through the lines to two radial four-piston calipers that clamp the 320 mm front discs. Weight shifts forward under braking, so the front does most of the work; the foot-operated rear brake adds stability. ABS stops either wheel locking.',
      focus: ['front-master-cylinder', 'brake-lines', 'front-calipers', 'front-discs', 'rear-master-cylinder', 'rear-caliper', 'rear-disc'],
      explode: 0.4,
      animate: true,
    },
    {
      title: 'Suspension',
      text:
        'Up front, upside-down telescopic forks let the wheel move about 120 mm, with springs holding the bike up and oil damping controlling the speed. At the rear, the swingarm pivots and a rising-rate linkage compresses the single monoshock – soft for small ripples, firm for big hits.',
      focus: ['fork-stanchions', 'fork-sliders', 'triple-clamps', 'rear-shock', 'shock-linkage', 'swingarm'],
      explode: 0.45,
      animate: true,
    },
    {
      title: 'Steering & countersteering',
      text:
        'The fork pivots in the steering head, which is tilted back 24° (rake). That tilt puts the tyre contact patch about 100 mm behind the steering axis (trail), so the front wheel self-centres like a shopping-trolley caster. Above walking pace you steer by countersteering: push the right bar forward to lean and turn right, push the left bar to go left.',
      focus: ['steering-head', 'triple-clamps', 'handlebar', 'front-wheel', 'front-tyre'],
      explode: 0.2,
      animate: false,
    },
    {
      title: 'Electrical charging',
      text:
        'The crank spins a magnet rotor around the stator coils, generating alternating current. The regulator-rectifier converts it to about 14 V DC, which recharges the battery and powers the ECU, lights and dash through the wiring harness.',
      focus: ['stator', 'regulator-rectifier', 'battery', 'wiring-harness', 'ecu', 'headlight', 'tail-light', 'instrument-cluster'],
      explode: 0.55,
      animate: true,
    },
    {
      title: 'Fuel in, exhaust out',
      text:
        'Air is drawn through the air box filter, past the throttle butterflies where injectors add a fine mist of petrol from the in-tank pump. After combustion, hot gas leaves through the stainless headers, is cleaned by the catalyst in the collector, and is quietened by the muffler.',
      focus: ['air-box', 'throttle-body', 'fuel-tank', 'fuel-pump', 'exhaust-header', 'muffler'],
      explode: 0.5,
      animate: true,
    },
  ],
};
