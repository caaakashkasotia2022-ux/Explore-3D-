import { M } from '../three/materials.js';

/*
 * 4-storey reinforced-concrete frame, mixed-use / office building.
 * Footprint 12 m (X) x 9 m (Z), floor-to-floor 3.4 m.
 * The finished ground level of the building sits at y = 2.0 so that the
 * foundations (piles, pile caps, grade beams) occupy y = 0 .. 2.0 inside a
 * translucent soil block. Front façade (curtain wall + entrance) faces +Z.
 *
 * Column grid: X = -6, -2, 2, 6  /  Z = -4.5, 0, 4.5  (4 m x 4.5 m bays).
 * Stair + lift core in the back-left bay (x -6..-2, z -4.5..0).
 * Service risers sit just right of the core (x ≈ -2.1 .. -1.0).
 */

const PI = Math.PI;
const G = 2.0; // finished ground level
const H = 3.4; // floor-to-floor height
const SLAB = 0.25;
const CLEAR = H - SLAB; // 3.15 m slab top to slab soffit
const base = (i) => +(G + (i - 1) * H).toFixed(3); // top of floor slab of level i (1..4), 5 = roof
const EY = 2.5; // vertical explode per floor
const ey = (i) => i * EY;
const LEVEL = { 1: 'Ground Floor', 2: 'First Floor', 3: 'Second Floor', 4: 'Third Floor' };
const LEVELS = [1, 2, 3, 4];

// ---- materials -----------------------------------------------------------
const concrete = M.concrete();
const concreteDark = M.concrete('#8f9194');
const slabConcrete = M.concrete('#b9bbbe');
const brick = M.brick();
const glass = M.glass('#9fd3ff');
const steel = M.steel();
const alu = M.aluminium();
const red = M.paint('#c62828');
const drainGrey = M.plastic('#5d6670');

// ---- helpers -------------------------------------------------------------
/** A straight wall along `axis` ('x' or 'z') at coordinate `fixed`, from `a` to `b`, with openings. */
function wallRun(axis, fixed, a, b, openings, { h = CLEAR, t = 0.3, sill = 0.9, head = 2.3, mat = brick } = {}) {
  const shapes = [];
  const mk = (a0, a1, y0, y1) => {
    const len = +(a1 - a0).toFixed(3);
    const mid = +((a0 + a1) / 2).toFixed(3);
    const hy = +(y1 - y0).toFixed(3);
    const cy = +((y0 + y1) / 2).toFixed(3);
    return axis === 'x'
      ? { type: 'box', size: [len, hy, t], position: [mid, cy, fixed], material: mat }
      : { type: 'box', size: [t, hy, len], position: [fixed, cy, mid], material: mat };
  };
  let cur = a;
  for (const o of [...openings].sort((p, q) => p.c - q.c)) {
    const o0 = o.c - o.w / 2;
    const o1 = o.c + o.w / 2;
    const s = o.sill ?? sill;
    const hd = o.head ?? head;
    if (o0 > cur) shapes.push(mk(cur, o0, 0, h));
    if (s > 0) shapes.push(mk(o0, o1, 0, s));
    if (hd < h) shapes.push(mk(o0, o1, hd, h));
    cur = o1;
  }
  if (cur < b) shapes.push(mk(cur, b, 0, h));
  return shapes;
}

/** Glass pane + aluminium frame filling an opening in a wall along `axis` at `fixed`. */
function windowShapes(axis, fixed, c, w = 1.6, sill = 0.9, head = 2.3) {
  const hgt = head - sill;
  const cy = (sill + head) / 2;
  const P = (along, y) => (axis === 'x' ? [c + along, y, fixed] : [fixed, y, c + along]);
  const S = (along, y, thick) => (axis === 'x' ? [along, y, thick] : [thick, y, along]);
  const f = 0.06;
  return [
    { type: 'box', size: S(w - 0.04, hgt - 0.04, 0.024), position: P(0, cy), material: glass },
    { type: 'box', size: S(w, f, 0.1), position: P(0, sill + f / 2), material: alu },
    { type: 'box', size: S(w, f, 0.1), position: P(0, head - f / 2), material: alu },
    { type: 'box', size: S(f, hgt, 0.1), position: P(-w / 2 + f / 2, cy), material: alu },
    { type: 'box', size: S(f, hgt, 0.1), position: P(w / 2 - f / 2, cy), material: alu },
    { type: 'box', size: S(0.05, hgt, 0.08), position: P(0, cy), material: alu },
  ];
}

const hCylX = (x0, x1, y, z, r, mat, seg = 10) => ({
  type: 'cylinder', radius: r, height: +(x1 - x0).toFixed(3), segments: seg,
  rotation: [0, 0, PI / 2], position: [+((x0 + x1) / 2).toFixed(3), y, z], material: mat,
});
const hCylZ = (z0, z1, y, x, r, mat, seg = 10) => ({
  type: 'cylinder', radius: r, height: +(z1 - z0).toFixed(3), segments: seg,
  rotation: [PI / 2, 0, 0], position: [x, y, +((z0 + z1) / 2).toFixed(3)], material: mat,
});
const vCyl = (x, z, y0, y1, r, mat, seg = 12) => ({
  type: 'cylinder', radius: r, height: +(y1 - y0).toFixed(3), segments: seg,
  position: [x, +((y0 + y1) / 2).toFixed(3), z], material: mat,
});

// Slab with openings for the lift shaft (x -5.8..-4.0, z -4.3..-2.3) and stair (x -4..-2.2, z -4.3..-0.2)
const slabShapes = (t = SLAB, mat = slabConcrete) => [
  { type: 'box', size: [8.4, t, 9.4], position: [2.0, -t / 2, 0], material: mat },
  { type: 'box', size: [4.0, t, 4.9], position: [-4.2, -t / 2, 2.25], material: mat },
  { type: 'box', size: [2.2, t, 2.1], position: [-5.1, -t / 2, -1.25], material: mat },
  { type: 'box', size: [0.4, t, 2.4], position: [-6.0, -t / 2, -3.5], material: mat },
  { type: 'box', size: [3.6, t, 0.4], position: [-4.0, -t / 2, -4.5], material: mat },
];

// ---- model-level lists ---------------------------------------------------
const floors = [
  { id: 0, name: 'Foundation' },
  { id: 1, name: 'Ground floor' },
  { id: 2, name: 'First floor' },
  { id: 3, name: 'Second floor' },
  { id: 4, name: 'Third floor' },
  { id: 5, name: 'Roof' },
];

const stages = [
  { id: 1, name: 'Site prep & excavation', text: 'The site is surveyed, cleared and set out. Topsoil is stripped and the ground is excavated to formation level so the foundations can be built.' },
  { id: 2, name: 'Piles & pile caps', text: 'Bored piles are drilled and concreted around a steel cage, then thick reinforced pile caps are cast on top of each group of piles.' },
  { id: 3, name: 'Grade beams & ground slab', text: 'Ground beams tie the pile caps together and the ground-bearing slab is poured over a compacted sub-base and damp-proof membrane.' },
  { id: 4, name: 'Frame: Ground & First floor', text: 'Column cages are fixed, formwork is erected and columns, beams and the core walls are cast for the lower two storeys.' },
  { id: 5, name: 'Frame: Second & Third floor', text: 'The frame climbs: columns, beams and core walls for the upper storeys are cast floor by floor, each once the level below has gained strength.' },
  { id: 6, name: 'Suspended slabs & roof slab', text: 'Suspended floor slabs and the roof slab are poured on falsework and propped until the concrete reaches its striking strength.' },
  { id: 7, name: 'Building envelope', text: 'The building is made weather-tight: masonry walls, windows, the glazed curtain wall, the parapet, entrance canopy and doors.' },
  { id: 8, name: 'MEP services', text: 'Mechanical, electrical and plumbing (MEP) trades install risers, pipework, ductwork, cable trays, sprinklers and the lift.' },
  { id: 9, name: 'Roof plant & finishes', text: 'Rooftop plant (air-handling unit, tank, solar PV) is craned in, internal partitions and finishes complete the building.' },
];

const systems = [
  { id: 'ground', name: 'Ground & Foundations', color: '#8d6e63' },
  { id: 'frame', name: 'Structural Frame', color: '#90a4ae' },
  { id: 'core', name: 'Core & Vertical Circulation', color: '#7e57c2' },
  { id: 'envelope', name: 'Building Envelope', color: '#4fc3f7' },
  { id: 'roof', name: 'Roof & Plant', color: '#ffb74d' },
  { id: 'plumbing', name: 'Plumbing & Drainage', color: '#42a5f5' },
  { id: 'electrical', name: 'Electrical', color: '#fdd835' },
  { id: 'hvac', name: 'HVAC', color: '#66bb6a' },
  { id: 'fire', name: 'Fire Protection', color: '#e53935' },
];

const parts = [];

// =========================================================================
// FOUNDATIONS (floor 0)
// =========================================================================
const colX = [-6, -2, 2, 6];
const colZ = [-4.5, 0, 4.5];

parts.push({
  id: 'soil',
  name: 'Soil & Excavation',
  system: 'ground',
  position: [0, 1.0, 0],
  explode: [0, -3, 0],
  ghost: true,
  floor: 0,
  stage: 1,
  shapes: [{ type: 'box', size: [22, 2.0, 18], material: M.soil() }],
  info: {
    what: 'The ground the building stands on — layers of soil, clay and gravel that ultimately carry the whole weight of the building.',
    location: 'Everything below the finished ground level (shown here as a see-through block from y = 0 to y = 2 m).',
    purpose: 'Soil is the final "support" in the load path: every kilogram of the building must be resisted by the ground without it squashing or sliding.',
    how: 'Before design, engineers drill boreholes and test samples. Soft topsoil is stripped away, the site is excavated, and the foundations are built down to soil (or rock) strong enough to carry the loads safely.',
    connections: ['piles', 'pile-caps', 'grade-beams', 'ground-slab'],
    examples: 'Clay, sand, gravel and rock behave very differently — London clay, Mexico City lake beds and Manhattan schist all need different foundation solutions.',
    advanced: 'A geotechnical site investigation (boreholes, SPT N-values, CPT, triaxial tests) gives shear strength (cu, φ\'), stiffness and groundwater level. Allowable bearing pressure on firm clay is typically 100–150 kPa versus >1 MPa on rock. Under Eurocode 7 (EN 1997) both ULS (bearing/sliding) and SLS (settlement, often limited to ~25 mm total and 1/500 angular distortion) must be checked. Weak near-surface soil here makes piled foundations the economic choice.',
    facts: ['The Leaning Tower of Pisa leans because its shallow 3 m foundation sits on soft, compressible clay.', 'Soil investigation usually costs well under 1% of a project, but ground problems cause a large share of construction overruns.'],
  },
});

parts.push({
  id: 'piles',
  name: 'Bored Concrete Piles',
  system: 'ground',
  position: [0, 0, 0],
  explode: [0, -2, 0],
  floor: 0,
  stage: 2,
  shapes: colZ.map((z) => ({
    type: 'cylinder', radius: 0.3, height: 1.2, segments: 14, position: [-6, 0.6, z],
    array: { count: 4, offset: [4, 0, 0] }, material: concreteDark,
  })),
  info: {
    what: 'Piles are long columns of reinforced concrete cast deep into the ground, one under every building column.',
    location: 'Below each pile cap, buried in the soil (only the top part is shown — real piles here would be 12–20 m long).',
    purpose: 'They carry the building\'s weight down through weak upper soil to stronger layers, and prevent the building from settling unevenly.',
    how: 'A rig drills a hole, a steel cage is lowered in and concrete is pumped in from the bottom up. The pile resists load by friction along its sides (shaft friction) plus bearing at its tip (end bearing).',
    connections: ['pile-caps', 'pile-rebar-cage', 'soil'],
    examples: 'Skyscrapers, bridges, offshore wind turbines and houses on soft clay all rely on piles.',
    advanced: '600 mm Ø CFA/bored piles, C32/40 concrete, 75 mm cover. Capacity Q = Qs + Qb: in clay Qs = α·cu·πD·L (α ≈ 0.5) and Qb = 9·cu·Ab. A 600 mm pile 15 m long in stiff clay (cu ≈ 100 kPa) gives a characteristic resistance of about 1,600 kN; EC7 model and partial factors (γs, γb, ξ) reduce the design value. Integrity testing (sonic echo / CSL) and a static or dynamic load test verify the installed piles.',
    facts: ['Venice is built largely on wooden piles driven over 1,000 years ago.', 'Piles under the Burj Khalifa are 1.5 m wide and over 40 m long.'],
  },
});

parts.push({
  id: 'pile-rebar-cage',
  name: 'Pile Reinforcement Cage',
  system: 'ground',
  position: [6, 0, 4.5],
  explode: [2.5, -1.5, 2.5],
  hiddenByDefault: true,
  floor: 0,
  stage: 2,
  shapes: [
    { type: 'cylinder', radius: 0.012, height: 1.3, segments: 6, position: [0.22, 0.65, 0], array: { count: 8, rotation: [0, PI / 4, 0] }, material: M.rebar() },
    { type: 'torus', radius: 0.22, tube: 0.006, radialSegments: 4, tubularSegments: 24, rotation: [PI / 2, 0, 0], position: [0, 0.08, 0], array: { count: 7, offset: [0, 0.2, 0] }, material: M.rebar() },
  ],
  info: {
    what: 'A cylindrical "skeleton" of steel bars placed inside a pile before the concrete is poured.',
    location: 'Inside the pile shaft, with a layer of concrete cover around it (shown at the front-right pile).',
    purpose: 'Concrete is strong in compression but weak in tension; the steel resists bending, tension and handling forces and holds the pile together.',
    how: 'Long vertical bars are tied or welded to circular links (or a continuous helix). Plastic spacers keep the cage centred so concrete fully surrounds it.',
    connections: ['piles', 'pile-caps'],
    examples: 'Every reinforced concrete pile, column and diaphragm wall uses a similar cage.',
    advanced: 'Typical cage: 8 No. H16 (B500B, fyk = 500 MPa) longitudinal bars with H10 helical links at 200 mm pitch, 75 mm nominal cover for cast-against-ground concrete (EN 1992-1-1 §4.4.1). Starter bars project ~600 mm (one tension lap/anchorage length, ≈40Ø) into the pile cap to transfer tension from lateral and uplift loads.',
    facts: ['The ribs on rebar help it grip the concrete — this bond is what makes reinforced concrete work.'],
  },
});

parts.push({
  id: 'pile-caps',
  name: 'Pile Caps',
  system: 'ground',
  position: [0, 0, 0],
  explode: [0, -1.2, 0],
  floor: 0,
  stage: 2,
  shapes: colZ.map((z) => ({
    type: 'box', size: [1.1, 0.6, 1.1], position: [-6, 1.5, z],
    array: { count: 4, offset: [4, 0, 0] }, material: concreteDark,
  })),
  info: {
    what: 'Thick blocks of reinforced concrete that sit on top of the piles, one under each column.',
    location: 'Just below the ground slab, directly beneath every column of the frame.',
    purpose: 'They spread the concentrated force from a column safely into the pile(s) below and tie the pile head to the structure.',
    how: 'The column\'s starter bars are cast into the cap. Inside the cap the load flows diagonally (like an invisible strut) from the column down to the pile, while bottom steel holds the "tie" together.',
    connections: ['piles', 'grade-beams', 'columns-l1', 'pile-rebar-cage'],
    examples: 'Bridge piers, tower cranes and warehouse columns all sit on pile caps.',
    advanced: '1100 x 1100 x 600 mm caps, C32/40, 75 mm bottom cover. Designed with the strut-and-tie method (EN 1992-1-1 §6.5) or as a deep beam; punching shear at the column perimeter and at the pile perimeter must be checked. Interior caps carry ≈1,000 kN at ULS (4 levels x ≈18 m² tributary area x ≈14 kPa). A ±75 mm pile installation tolerance is allowed for by checking eccentric moments.',
    facts: ['Large bridge pile caps can be over 3 m thick and need thousands of tonnes of concrete poured in one go.'],
  },
});

parts.push({
  id: 'grade-beams',
  name: 'Ground (Grade) Beams',
  system: 'ground',
  position: [0, 0, 0],
  explode: [0, -0.8, 0],
  floor: 0,
  stage: 3,
  shapes: [
    ...colZ.map((z) => ({ type: 'box', size: [12, 0.5, 0.35], position: [0, 1.55, z], material: concreteDark })),
    { type: 'box', size: [0.35, 0.5, 9], position: [-6, 1.55, 0], array: { count: 4, offset: [4, 0, 0] }, material: concreteDark },
  ],
  info: {
    what: 'Reinforced concrete beams at ground level that link all the pile caps together in a grid.',
    location: 'Between the pile caps, just under the ground-floor slab and below the external walls.',
    purpose: 'They tie the foundations together so they act as one unit, carry the weight of the ground-floor walls, and resist sideways forces and uneven settlement.',
    how: 'Each beam spans from cap to cap like a bridge. Load from walls above bends the beam, and the steel at top and bottom resists the bending. Because they connect every cap, a single weak pile cannot let one column drop on its own.',
    connections: ['pile-caps', 'ground-slab', 'external-walls-l1'],
    examples: 'Common on clay sites where the ground can swell and shrink; houses on piles use the same idea.',
    advanced: '350 x 500 mm C32/40 beams, designed as continuous members spanning 4.0 m / 4.5 m between caps. They also restrain pile caps against eccentric moments (pile out-of-position) and provide the tie required for robustness (EN 1992-1-1 §9.10). On shrinkable clay a compressible void former (e.g. 150 mm Cellcore) is placed beneath them to isolate heave pressures.',
    facts: ['Ground beams are sometimes called "tie beams" because one of their main jobs is tying the foundations together.'],
  },
});

// =========================================================================
// FRAME (columns, beams, slabs)
// =========================================================================
parts.push({
  id: 'ground-slab',
  name: 'Ground-Bearing Slab',
  system: 'frame',
  position: [0, G, 0],
  explode: [0, ey(1) - 1.0, 0],
  floor: 1,
  stage: 3,
  shapes: [
    { type: 'box', size: [12.4, 0.2, 9.4], position: [0, -0.1, 0], material: slabConcrete },
    { type: 'box', size: [12.4, 0.04, 9.4], position: [0, -0.22, 0], material: M.plastic('#1f3b57') },
  ],
  info: {
    what: 'The concrete floor of the ground storey, laid directly on prepared ground.',
    location: 'At finished ground level (y = 2 m), over the grade beams and pile caps.',
    purpose: 'Provides the ground-floor surface, keeps moisture and ground gases out, and ties the column bases together.',
    how: 'The ground is compacted, a layer of crushed stone (sub-base) and insulation is laid, then a plastic damp-proof membrane (dark layer) and finally the steel-mesh-reinforced concrete slab is poured and power-floated smooth.',
    connections: ['grade-beams', 'pile-caps', 'columns-l1', 'core-walls-l1'],
    examples: 'Warehouse floors, garages and most ground floors in commercial buildings.',
    advanced: '200 mm C30/37 slab with A393 mesh top and bottom, over 1200-gauge DPM, 100 mm PIR insulation (floor U-value ≈ 0.15 W/m²K) and 150 mm Type 1 sub-base. Designed to TR34 for point and racking loads; sawn contraction joints at ~6 m centres control shrinkage cracking. A radon/methane barrier may be added depending on the ground-gas risk assessment.',
    facts: ['Concrete keeps gaining strength for months; design strength is specified at 28 days.'],
  },
});

const colShapes = (h) => colZ.map((z) => ({
  type: 'box', size: [0.4, h, 0.4], position: [-6, h / 2, z],
  array: { count: 4, offset: [4, 0, 0] }, material: concrete,
}));

const beamShapes = () => [
  ...colZ.map((z) => ({ type: 'box', size: [12.4, 0.5, 0.3], position: [0, CLEAR - 0.25, z], material: concrete })),
  { type: 'box', size: [0.3, 0.5, 9.4], position: [-6, CLEAR - 0.25, 0], array: { count: 4, offset: [4, 0, 0] }, material: concrete },
];

for (const i of LEVELS) {
  const levelsAbove = 5 - i; // floors + roof supported
  const kN = levelsAbove * 250;
  const st = i <= 2 ? 4 : 5;
  parts.push({
    id: `columns-l${i}`,
    name: `Columns — ${LEVEL[i]}`,
    system: 'frame',
    position: [0, base(i), 0],
    explode: [0, ey(i), 0],
    floor: i,
    stage: st,
    shapes: colShapes(CLEAR),
    info: {
      what: `Twelve vertical reinforced-concrete columns that hold up everything above the ${LEVEL[i].toLowerCase()}.`,
      location: `On a regular 4 m x 4.5 m grid across the ${LEVEL[i].toLowerCase()}, from the floor slab up to the beams.`,
      purpose: `They collect the weight of ${levelsAbove === 1 ? 'the roof' : `${levelsAbove - 1} floor(s) plus the roof`} and pass it straight down to the ${i === 1 ? 'pile caps and foundations' : 'columns of the floor below'}.`,
      how: 'Beams and slabs push down on the top of each column. The column is squeezed (compression) and transfers that force vertically. Steel bars inside stop it buckling or cracking if it is also bent by wind or uneven loads.',
      connections: [i === 1 ? 'pile-caps' : `columns-l${i - 1}`, `beams-l${i}`, i === 4 ? 'roof-slab' : `columns-l${i + 1}`, ...(i === 1 ? ['column-rebar-cage'] : [])],
      examples: 'The same column-and-beam "skeleton" is used in car parks, schools, hospitals and most mid-rise offices.',
      advanced: `400 x 400 mm C32/40 columns (fck = 32 MPa), 4 No. H25 + 4 No. H20 longitudinal bars, H10 links at 300 mm, 35 mm nominal cover (XC1 exposure, R60 fire). An interior column here carries roughly ${kN} kN at ULS (${levelsAbove} level(s) x 18 m² tributary area x ~14 kPa, from 1.35Gk + 1.5Qk). Squash capacity ≈ 0.567·fck·Ac + 0.87·fyk·As ≈ 3,800 kN, so they are lightly stressed; slenderness λ = l0/i ≈ 27 < λlim, so second-order effects can be ignored (EN 1992-1-1 §5.8.3). ${i === 1 ? 'Ground-floor columns carry the most load of all.' : 'Load reduces up the building, so upper columns could be smaller or use less steel.'}`,
      facts: i === 1
        ? ['Ground-floor columns carry the most load — the reason ancient columns get thicker at the bottom.', 'Columns are cast in "lifts", one storey at a time, using steel or plywood formwork.']
        : ['Each floor up, the columns carry about one floor less load.'],
    },
  });

  parts.push({
    id: `beams-l${i}`,
    name: `Beams — ${i === 4 ? 'Roof Level' : `Under ${LEVEL[i + 1]}`}`,
    system: 'frame',
    position: [0, base(i), 0],
    explode: [0, ey(i) + 0.4, 0],
    floor: i,
    stage: st,
    shapes: beamShapes(),
    info: {
      what: `Horizontal reinforced-concrete beams that run between the columns at the top of the ${LEVEL[i].toLowerCase()}.`,
      location: `Just under the ${i === 4 ? 'roof slab' : `${LEVEL[i + 1].toLowerCase()} slab`}, spanning column to column in both directions on every grid line.`,
      purpose: `They collect load from the ${i === 4 ? 'roof' : 'floor'} slab above and carry it sideways to the columns, and they stiffen the frame against wind.`,
      how: 'The slab rests on the beams. A loaded beam bends: its top is squeezed and its bottom is stretched. Steel bars in the bottom take the tension at mid-span, bars in the top take it over the columns, and shear links (stirrups) stop diagonal cracks near the supports.',
      connections: [`columns-l${i}`, i === 4 ? 'roof-slab' : `slab-l${i + 1}`, ...(i < 4 ? [`columns-l${i + 1}`] : [])],
      examples: 'Beams appear everywhere from timber floor joists to steel I-beams in bridges.',
      advanced: '300 x 500 mm downstand beams (overall depth incl. slab), C32/40, monolithic with the slab so they act as T-beams (effective flange width per EN 1992-1-1 §5.3.2.1). Span/depth ≈ 9 — well within deflection limits (span/250 total, span/500 after finishes). Typical reinforcement: 3 No. H20 bottom, 2 No. H16 top over supports, H8 links at 150–200 mm. Beam-column joints are detailed so the frame works as a moment frame for lateral (wind) load, together with the concrete core.',
      facts: ['Beams are deeper than they are wide because bending strength grows with depth squared.'],
    },
  });
}

parts.push({
  id: 'column-rebar-cage',
  name: 'Column Reinforcement Cage',
  system: 'frame',
  position: [6, G, 4.5],
  explode: [2.5, ey(1), 2.5],
  hiddenByDefault: true,
  floor: 1,
  stage: 4,
  shapes: [
    { type: 'cylinder', radius: 0.012, height: 3.6, segments: 6, position: [-0.14, 1.8, -0.14], array: { count: 3, offset: [0.14, 0, 0] }, material: M.rebar() },
    { type: 'cylinder', radius: 0.012, height: 3.6, segments: 6, position: [-0.14, 1.8, 0.14], array: { count: 3, offset: [0.14, 0, 0] }, material: M.rebar() },
    { type: 'cylinder', radius: 0.012, height: 3.6, segments: 6, position: [-0.14, 1.8, 0], material: M.rebar() },
    { type: 'cylinder', radius: 0.012, height: 3.6, segments: 6, position: [0.14, 1.8, 0], material: M.rebar() },
    { type: 'box', size: [0.3, 0.014, 0.3], position: [0, 0.15, 0], array: { count: 11, offset: [0, 0.3, 0] }, material: M.rebar() },
  ],
  info: {
    what: 'The steel "skeleton" of a column: long vertical bars wrapped by square hoops called links.',
    location: 'Inside the front-right ground-floor column; the bars continue up past the next floor to lap with the column above.',
    purpose: 'The vertical bars help carry load and resist bending; the links stop the bars buckling outwards and confine the concrete.',
    how: 'Fixers tie the bars and links together with wire, plastic spacers keep the cage 35 mm from the formwork, then concrete is poured around it. Bars projecting from the top (starter bars) are lapped with the next cage.',
    connections: ['columns-l1', 'pile-caps', 'beams-l1'],
    examples: 'You can see cages sticking out of unfinished concrete buildings on construction sites around the world.',
    advanced: '8 No. H20–H25 B500B bars (≥ 4 bars, As,min = max(0.10·NEd/fyd, 0.002·Ac) per EN 1992-1-1 §9.5.2), H10 links at max spacing min(20Ø, b, 400 mm) reduced by 0.6 within 400 mm of beams/slabs and at laps. Lap length ≈ 1.0–1.5 x anchorage length (~40Ø–50Ø). Nominal cover cnom = cmin + Δcdev = 25 + 10 = 35 mm for XC1 / R60.',
    facts: ['Steel and concrete expand almost equally with temperature, which is why they work so well together.'],
  },
});

for (const i of [2, 3, 4]) {
  parts.push({
    id: `slab-l${i}`,
    name: `Floor Slab — ${LEVEL[i]}`,
    system: 'frame',
    position: [0, base(i), 0],
    explode: [0, ey(i) - 0.3, 0],
    floor: i,
    stage: 6,
    shapes: slabShapes(),
    info: {
      what: `The flat reinforced-concrete floor of the ${LEVEL[i].toLowerCase()} — what people walk on.`,
      location: `Level ${i}, ${(base(i) - G).toFixed(1)} m above ground, spanning between the beams. Openings are left for the stair and lift.`,
      purpose: 'Carries people, furniture and partitions, and acts as a stiff horizontal "diaphragm" that ties the columns together and shares wind load with the core.',
      how: 'Loads on the slab bend it between beams; steel mesh in the bottom resists the tension at mid-span and steel in the top resists it over the beams. The slab passes its load to the beams, which pass it to the columns.',
      connections: [`beams-l${i - 1}`, `columns-l${i}`, `columns-l${i - 1}`, 'core-walls-l' + i],
      examples: 'Most offices, apartments and car parks use concrete floor slabs; some use precast hollow-core planks or composite steel decks instead.',
      advanced: '250 mm C32/40 two-way spanning slab (4.0 x 4.5 m panels), 25 mm cover, B500B mesh/bars (e.g. H12@200 B1/B2, H12@150 top over beams). Design loads: self-weight 6.25 kPa + 1.5 kPa finishes/services + 1.0 kPa partitions (Gk), office imposed load 3.0 kPa (Qk, EN 1991-1-1 Cat. B). ULS ≈ 1.35·8.75 + 1.5·3.0 ≈ 16.3 kPa. 250 mm also gives ~REI 120 fire resistance and good acoustic separation (Rw > 55 dB). Openings are trimmed with extra bars around their edges.',
      facts: ['A 250 mm concrete slab weighs about 600 kg per square metre.'],
    },
  });
}

parts.push({
  id: 'roof-slab',
  name: 'Roof Slab & Waterproofing',
  system: 'roof',
  position: [0, base(5), 0],
  explode: [0, ey(5) - 0.5, 0],
  floor: 5,
  stage: 6,
  shapes: [
    { type: 'box', size: [10.2, SLAB, 9.4], position: [1.1, -SLAB / 2, 0], material: slabConcrete },
    { type: 'box', size: [2.2, SLAB, 7.0], position: [-5.1, -SLAB / 2, 1.2], material: slabConcrete },
    { type: 'box', size: [0.4, SLAB, 2.4], position: [-6.0, -SLAB / 2, -3.5], material: slabConcrete },
    { type: 'box', size: [1.8, SLAB, 0.4], position: [-4.9, -SLAB / 2, -4.5], material: slabConcrete },
    { type: 'box', size: [11.8, 0.1, 8.8], position: [0.2, 0.05, -0.1], material: M.plastic('#3b3f45') },
  ],
  info: {
    what: 'The top concrete slab of the building, covered with insulation and a waterproof membrane.',
    location: 'At roof level, 13.6 m above ground, on top of the third-floor beams.',
    purpose: 'Keeps rain out, insulates the building, and supports rooftop plant such as the HVAC unit, water tank and solar panels.',
    how: 'The structural slab carries loads like any floor. On top, a "warm roof" build-up is laid: vapour control layer, rigid insulation boards cut to a slight slope (fall) and a waterproof membrane, so rainwater runs to outlets.',
    connections: ['beams-l4', 'columns-l4', 'parapet', 'hvac-unit', 'water-tank', 'solar-panels', 'lift-overrun'],
    examples: 'Flat roofs are common on offices, shopping centres and apartment blocks — and are increasingly used for roof gardens and PV.',
    advanced: '250 mm C32/40 slab designed for 1.5 kPa finishes + 0.6 kPa maintenance imposed load (EN 1991-1-1 Cat. H) plus local plant loads (AHU ≈ 2 t on a steel grillage) and snow (EN 1991-1-3). Warm-roof build-up: bitumen VCL, 150 mm tapered PIR (λ = 0.022 W/mK) giving U ≈ 0.15 W/m²K, single-ply or 2-layer reinforced bitumen membrane, minimum finished fall 1:80 (BS 6229). The roof slab also acts as a diaphragm transferring wind load to the core.',
    facts: ['Flat roofs are never perfectly flat — they are built with a gentle slope so water drains away.'],
  },
});

// =========================================================================
// CORE: walls, stairs, lift
// =========================================================================
const coreWall = (opts) => ({ t: 0.2, mat: concrete, ...opts });
const coreShapes = () => [
  ...wallRun('x', -4.2, -5.8, -2.2, [], coreWall()),
  ...wallRun('z', -5.7, -4.3, -0.2, [], coreWall()),
  ...wallRun('z', -2.3, -4.3, -0.2, [], coreWall()),
  ...wallRun('x', -0.3, -5.8, -2.2, [{ c: -4.9, w: 1.2, sill: 0, head: 2.2 }, { c: -3.1, w: 1.4, sill: 0, head: 2.2 }], coreWall()),
  ...wallRun('z', -4.0, -4.3, -2.3, [], coreWall()),
  ...wallRun('x', -2.3, -5.8, -4.0, [{ c: -4.9, w: 0.9, sill: 0, head: 2.1 }], coreWall()),
];

for (const i of LEVELS) {
  parts.push({
    id: `core-walls-l${i}`,
    name: `Stair & Lift Core — ${LEVEL[i]}`,
    system: 'core',
    position: [0, base(i), 0],
    explode: [-1.5, ey(i), -0.5],
    floor: i,
    stage: i <= 2 ? 4 : 5,
    shapes: coreShapes(),
    info: {
      what: 'A box of thick concrete walls that encloses the staircase and the lift shaft.',
      location: `Back-left corner of the ${LEVEL[i].toLowerCase()}, between gridlines x = -6 to -2 and z = -4.5 to 0.`,
      purpose: 'It is the building\'s backbone against wind and earthquakes, and a protected fire-escape route for the stair and lift.',
      how: 'Wind pushes on the façade; the floor slabs carry that sideways force to the core, whose long walls act like a giant vertical cantilever fixed into the foundations. The walls also carry their share of vertical load.',
      connections: [`stairs-l${Math.min(i, 3)}`, 'lift-car', i === 1 ? 'ground-slab' : `slab-l${i}`, i === 1 ? 'pile-caps' : `core-walls-l${i - 1}`, ...(i < 4 ? [`core-walls-l${i + 1}`] : ['lift-overrun'])],
      examples: 'Nearly every tall building — from 4-storey offices to the Shard — has one or more concrete cores, often built first by slip-forming.',
      advanced: '200 mm C32/40 walls with H12@200 each face (vertical As,min = 0.002Ac, EN 1992-1-1 §9.6), 30 mm cover. Wind (EN 1991-1-4, vb,0 ≈ 22–26 m/s → peak pressure ≈ 0.8–1.0 kPa) gives a base shear of ~100–120 kN on the 12 m face; the core\'s high flexural stiffness (I of a 4 x 4 m box) keeps storey drift well under h/500. The walls are 2-hour fire-rated (REI 120) and the stair is a protected escape route with pressurised or naturally vented lobby per building regulations.',
      facts: ['Cores are often slip-formed: the formwork climbs continuously, day and night, at up to 300 mm per hour.'],
    },
  });
}

const stairShapes = () => {
  const r = H / 20; // riser 0.17
  const g = 0.28; // going
  const fl = 10 * g; // flight length 2.8
  const ang = Math.atan2(H / 2, fl);
  const waistLen = Math.hypot(H / 2, fl) + 0.2;
  return [
    // floor landing at the bottom (front of the stair)
    { type: 'box', size: [1.8, 0.2, 0.4], position: [-3.1, -0.1, -0.4], material: concrete },
    // flight A rising toward -Z
    { type: 'box', size: [0.85, r, g], position: [-3.55, r / 2, -0.6 - g / 2], array: { count: 10, offset: [0, r, -g] }, material: concrete },
    { type: 'box', size: [0.85, 0.15, waistLen], position: [-3.55, H / 4 - 0.12, -0.6 - fl / 2], rotation: [ang, 0, 0], material: concrete },
    // half landing
    { type: 'box', size: [1.8, 0.2, 0.9], position: [-3.1, H / 2 - 0.1, -0.6 - fl - 0.45], material: concrete },
    // flight B rising toward +Z
    { type: 'box', size: [0.85, r, g], position: [-2.65, H / 2 + r / 2, -0.6 - fl + g / 2], array: { count: 10, offset: [0, r, g] }, material: concrete },
    { type: 'box', size: [0.85, 0.15, waistLen], position: [-2.65, (3 * H) / 4 - 0.12, -0.6 - fl / 2], rotation: [-ang, 0, 0], material: concrete },
    // handrail
    { type: 'box', size: [0.04, 0.04, waistLen], position: [-3.1, H / 4 + 0.95, -0.6 - fl / 2], rotation: [ang, 0, 0], material: steel },
    { type: 'box', size: [0.04, 0.04, waistLen], position: [-3.1, (3 * H) / 4 + 0.95, -0.6 - fl / 2], rotation: [-ang, 0, 0], material: steel },
  ];
};

for (const i of [1, 2, 3]) {
  parts.push({
    id: `stairs-l${i}`,
    name: `Staircase — ${LEVEL[i]} to ${LEVEL[i + 1]}`,
    system: 'core',
    position: [0, base(i), 0],
    explode: [2.2, ey(i) + 0.3, 0.6],
    floor: i,
    stage: i <= 2 ? 4 : 5,
    shapes: stairShapes(),
    info: {
      what: `A two-flight ("dog-leg") concrete staircase linking the ${LEVEL[i].toLowerCase()} and the ${LEVEL[i + 1].toLowerCase()}.`,
      location: 'Inside the concrete core, next to the lift shaft, with a half-landing at the back wall.',
      purpose: 'Everyday vertical circulation, and — most importantly — the protected escape route out of the building in a fire.',
      how: 'Each flight is an inclined concrete slab (the "waist") with steps formed on top. It spans from the floor landing to the half-landing, which is supported by the core walls. 10 risers of 170 mm climb half a storey, then the stair turns back.',
      connections: [`core-walls-l${i}`, `core-walls-l${i + 1}`, i === 1 ? 'ground-slab' : `slab-l${i}`, `slab-l${i + 1}`],
      examples: 'Dog-leg stairs are the standard escape stair in offices, schools and apartment blocks; they are often precast off-site and craned in.',
      advanced: 'Riser 170 mm, going 280 mm (2R + G = 620 mm, within the 550–700 mm comfort rule; pitch ≈ 31°, < 42° max for general access). Waist 150 mm C32/40 designed as a simply supported inclined slab for 4.0 kPa imposed load (EN 1991-1-1 Cat. C3 stairs). Clear width ≥ 1.0–1.1 m sized for evacuation; handrail 900–1000 mm high. Precast flights sit on neoprene bearings at landings for acoustic isolation.',
      facts: ['The relationship 2 x riser + going ≈ 600–630 mm comes from the length of an average human stride.'],
    },
  });
}

parts.push({
  id: 'lift-car',
  name: 'Lift (Elevator) Car',
  system: 'core',
  position: [-4.85, G + 5.1 + 1.15, -3.25],
  explode: [-4.5, 3, 0],
  floor: 4,
  stage: 8,
  anim: { type: 'piston', axis: 'y', amplitude: 5.1, speed: 0.35, phase: 0 },
  shapes: [
    { type: 'box', size: [1.3, 2.3, 1.4], material: M.brushed('#c6ccd3') },
    { type: 'box', size: [0.8, 2.0, 0.04], position: [0, -0.1, 0.72], material: M.chrome() },
    { type: 'box', size: [1.0, 0.1, 1.1], position: [0, 1.2, 0], material: M.steel('#3b4048') },
    { type: 'cylinder', radius: 0.01, height: 2.6, segments: 6, position: [-0.2, 2.55, 0], array: { count: 3, offset: [0.2, 0, 0] }, material: steel },
    { type: 'box', size: [0.6, 0.04, 0.6], position: [0, 1.13, 0], material: M.light() },
  ],
  info: {
    what: 'The cabin that carries people and goods up and down the building.',
    location: 'Inside the concrete lift shaft in the core, travelling between the ground and third floors.',
    purpose: 'Step-free access for everyone, including wheelchair users, and moving heavy items between floors.',
    how: 'Steel ropes (or belts) run over a motor-driven sheave at the top of the shaft to a heavy counterweight. The counterweight balances the car, so the motor only lifts the difference. Guide rails keep the car aligned and safety gear grips the rails if it ever overspeeds.',
    connections: ['core-walls-l1', 'core-walls-l4', 'lift-overrun', 'main-panel'],
    examples: 'Passenger lifts, goods lifts, hospital bed lifts and fire-fighting lifts.',
    advanced: 'Machine-room-less (MRL) traction lift, 8-person / 630 kg (EN 81-20), rated speed 1.0 m/s, 4 stops, gearless permanent-magnet motor in the shaft head. Counterweight = car weight + ~45% rated load. Car 1.1 x 1.4 m internal meets EN 81-70 accessibility Type 1. Pit depth ≈ 1.1 m and headroom (overrun) ≈ 3.6 m are needed; the shaft is a 2-hour fire-rated enclosure. Regenerative drives can return braking energy to the building supply.',
    facts: ['Elisha Otis\'s 1852 safety brake made tall buildings practical — passenger lifts are statistically safer than stairs.'],
  },
});

parts.push({
  id: 'lift-overrun',
  name: 'Lift Overrun & Motor Housing',
  system: 'core',
  position: [-4.9, base(5), -3.3],
  explode: [-1.5, ey(5) + 0.5, -0.5],
  floor: 5,
  stage: 6,
  shapes: [
    { type: 'box', size: [1.8, 2.0, 0.2], position: [0, 1.0, -0.9], material: concrete },
    { type: 'box', size: [1.8, 2.0, 0.2], position: [0, 1.0, 0.9], material: concrete },
    { type: 'box', size: [0.2, 2.0, 2.0], position: [-0.8, 1.0, 0], material: concrete },
    { type: 'box', size: [0.2, 2.0, 2.0], position: [0.8, 1.0, 0], material: concrete },
    { type: 'box', size: [2.0, 0.2, 2.2], position: [0, 2.1, 0], material: concrete },
    { type: 'box', size: [0.5, 0.4, 0.6], position: [0, 1.6, 0], material: M.paint('#2e7d32') },
  ],
  info: {
    what: 'A concrete box that sticks up above the roof over the lift shaft.',
    location: 'On the roof, directly above the lift shaft in the back-left corner.',
    purpose: 'Gives the lift car room to overtravel safely above the top floor and houses the traction motor (green) and its pulley.',
    how: 'The motor sits on a beam at the top of the shaft; ropes pass over its sheave down to the car and counterweight. The concrete walls are a continuation of the fire-rated lift shaft.',
    connections: ['lift-car', 'core-walls-l4', 'roof-slab'],
    examples: 'The small "boxes" you see on top of flat-roofed buildings are usually lift overruns or stair access housings.',
    advanced: 'EN 81-20 requires a refuge volume of at least 0.5 x 0.6 x 0.8 m on the car roof when the counterweight is fully compressed on its buffer, plus clear headroom — hence ~3.6 m from top-floor level to the shaft soffit for a 1 m/s lift. Hoist hook / lifting beam rated ~2 t is cast into the soffit for maintenance. Roof upstand ≥ 150 mm above finished roof prevents water ingress.',
    facts: ['Machine-room-less lifts have shrunk overruns dramatically compared with old rooftop motor rooms.'],
  },
});

// =========================================================================
// ENVELOPE
// =========================================================================
// External masonry walls on back (z = -4.6) and both sides (x = ±6.1). Front = curtain wall.
const extWallShapes = () => [
  ...wallRun('x', -4.6, -6.25, 6.25, [{ c: 0, w: 1.6 }, { c: 4, w: 1.6 }]),
  ...wallRun('z', 6.1, -4.45, 4.7, [{ c: -2.25, w: 1.6 }, { c: 2.25, w: 1.6 }]),
  ...wallRun('z', -6.1, -4.45, 4.7, [{ c: 2.25, w: 1.6 }]),
];
const winShapes = () => [
  ...windowShapes('x', -4.6, 0),
  ...windowShapes('x', -4.6, 4),
  ...windowShapes('z', 6.1, -2.25),
  ...windowShapes('z', 6.1, 2.25),
  ...windowShapes('z', -6.1, 2.25),
];

for (const i of LEVELS) {
  parts.push({
    id: `external-walls-l${i}`,
    name: `External Masonry Walls — ${LEVEL[i]}`,
    system: 'envelope',
    position: [0, base(i), 0],
    explode: [0, ey(i), -1.6],
    floor: i,
    stage: 7,
    shapes: extWallShapes(),
    info: {
      what: 'Brick-faced cavity walls that enclose the back and sides of the building between the columns.',
      location: `Around the back and side edges of the ${LEVEL[i].toLowerCase()}, sitting on the slab edge and the beams.`,
      purpose: 'Keep out rain, wind and noise, hold in heat, provide privacy, and frame the window openings. They are non-load-bearing "infill" — the concrete frame carries the building.',
      how: 'Each wall is two skins with a gap: an outer brick leaf that sheds rain, a cavity with insulation, and an inner blockwork leaf. Stainless-steel ties connect the leaves; steel angles fixed to the slab edge support the brickwork at every floor.',
      connections: [`windows-l${i}`, `columns-l${i}`, `beams-l${i}`, i === 1 ? 'grade-beams' : `slab-l${i}`],
      examples: 'Brick-clad concrete frames are common for offices, schools and apartments across Europe and Asia.',
      advanced: '102.5 mm facing brick + 100 mm partial-fill PIR cavity insulation + 50 mm clear cavity + 100 mm dense blockwork + plaster: U ≈ 0.18 W/m²K. Brickwork supported on stainless-steel shelf angles at each floor with a 10–15 mm compressible movement joint below to accommodate frame shortening (creep/shrinkage) and brick expansion; vertical movement joints every ~10–12 m. Wall ties at 900 x 450 mm (EN 845-1). Lintels or angle supports span the window heads.',
      facts: ['Clay bricks slowly expand for years after firing while concrete frames shrink — so movement joints are essential.'],
    },
  });

  parts.push({
    id: `windows-l${i}`,
    name: `Windows — ${LEVEL[i]}`,
    system: 'envelope',
    position: [0, base(i), 0],
    explode: [0, ey(i), -2.4],
    floor: i,
    stage: 7,
    shapes: winShapes(),
    info: {
      what: 'Aluminium-framed double-glazed windows set into the masonry walls.',
      location: `Five openings on the ${LEVEL[i].toLowerCase()}: two in the back wall, two on the right side and one on the left side.`,
      purpose: 'Let in daylight and fresh air and give views out, while still keeping heat in and rain out.',
      how: 'Two panes of glass are separated by a sealed gap filled with argon. The gap and a thin invisible metal-oxide coating slow heat loss. The aluminium frame has a plastic "thermal break" so heat cannot easily conduct through the metal.',
      connections: [`external-walls-l${i}`, `curtain-wall-l${i}`],
      examples: 'Double and triple glazing in homes, offices and schools.',
      advanced: 'Thermally broken aluminium frames, 4-16-4 mm double-glazed units with argon fill and low-e coating: centre-pane Ug ≈ 1.1 W/m²K, whole-window Uw ≈ 1.4 W/m²K, g-value ≈ 0.4. Sill 900 mm, head 2300 mm. Installed with a sub-sill, EPDM membranes lapped into the cavity tray and a cavity closer to avoid thermal bridging; air-tightness tested to EN 12207 class 4.',
      facts: ['A single-glazed window loses about 4–5 times more heat than a modern double-glazed one.'],
    },
  });

  // curtain wall on the front (+Z)
  const cwShapes = [
    { type: 'box', size: [12.4, 0.75, 0.03], position: [0, CLEAR - 0.1, 4.82], material: M.steel('#3a4048') },
    { type: 'box', size: [0.07, H, 0.16], position: [-6.2, H / 2, 4.88], array: { count: 9, offset: [1.55, 0, 0] }, material: steel },
    { type: 'box', size: [12.47, 0.07, 0.16], position: [0, 0.035, 4.88], material: steel },
    { type: 'box', size: [12.47, 0.07, 0.16], position: [0, 2.68, 4.88], material: steel },
  ];
  if (i === 1) {
    cwShapes.push(
      { type: 'box', size: [5.2, 2.65, 0.024], position: [-3.6, 1.325, 4.88], material: glass },
      { type: 'box', size: [5.2, 2.65, 0.024], position: [3.6, 1.325, 4.88], material: glass },
      { type: 'box', size: [2.0, 0.25, 0.024], position: [0, 2.525, 4.88], material: glass },
    );
  } else {
    cwShapes.push({ type: 'box', size: [12.4, 2.65, 0.024], position: [0, 1.325, 4.88], material: glass });
  }
  parts.push({
    id: `curtain-wall-l${i}`,
    name: `Glazed Curtain Wall — ${LEVEL[i]}`,
    system: 'envelope',
    position: [0, base(i), 0],
    explode: [0, ey(i), 1.8],
    floor: i,
    stage: 7,
    shapes: cwShapes,
    info: {
      what: 'A lightweight wall of glass held in a grid of metal mullions (vertical) and transoms (horizontal) across the whole front of the building.',
      location: `Hung on the front (street) face of the ${LEVEL[i].toLowerCase()}, just outside the slab edge.${i === 1 ? ' At ground level it frames the main entrance doors.' : ''}`,
      purpose: 'Floods the offices with daylight and gives the building its modern look, while keeping out weather. It carries only its own weight and wind load — not the floors.',
      how: 'Aluminium mullions are bolted to brackets on each slab edge and spliced between floors so they can move. Glass units sit in rubber gaskets with pressure plates; any water that gets past the outer seal drains out through the frame. The dark opaque "spandrel" band hides the slab and beams.',
      connections: [`slab-l${i === 1 ? 2 : i}`, `beams-l${i}`, `windows-l${i}`, ...(i === 1 ? ['entrance-door', 'entrance-canopy'] : [])],
      examples: 'Most glass office towers use stick-built or unitised curtain walls — e.g. the Seagram Building and Lever House in New York.',
      advanced: 'Stick system, 50–60 mm mullions at 1.55 m centres spanning 3.4 m floor-to-floor, designed for peak wind pressure ≈ ±1.0 kPa with deflection ≤ span/200 (EN 13830). Double-glazed units 6 mm toughened low-e / 16 mm argon / 6.8 mm laminated: Ug ≈ 1.0 W/m²K, overall Ucw ≈ 1.5–1.8 W/m²K, solar factor g ≈ 0.30–0.35 to limit overheating. Movement joints at each floor take ±15–20 mm slab-edge deflection and frame shortening. Spandrel panels are insulated and include a fire-stop between slab edge and façade to prevent floor-to-floor fire spread.',
      facts: ['It is called a "curtain" wall because it hangs off the structure like a curtain from a rail.', 'Glass is about 2.5 times denser than water — a large curtain wall panel can weigh over 500 kg.'],
    },
  });
}

parts.push({
  id: 'entrance-door',
  name: 'Main Entrance Doors',
  system: 'envelope',
  position: [0, G, 4.88],
  explode: [0, ey(1), 2.6],
  floor: 1,
  stage: 7,
  shapes: [
    { type: 'box', size: [0.96, 2.34, 0.03], position: [-0.5, 1.2, 0], material: glass },
    { type: 'box', size: [0.96, 2.34, 0.03], position: [0.5, 1.2, 0], material: glass },
    { type: 'box', size: [2.08, 0.08, 0.12], position: [0, 2.4, 0], material: steel },
    { type: 'box', size: [0.06, 2.4, 0.12], position: [-1.0, 1.2, 0], array: { count: 3, offset: [1.0, 0, 0] }, material: steel },
    { type: 'cylinder', radius: 0.018, height: 1.0, segments: 8, position: [-0.12, 1.1, 0.08], array: { count: 2, offset: [0.24, 0, 0] }, material: M.chrome() },
    { type: 'box', size: [2.2, 0.03, 1.4], position: [0, 0.015, 0.7], material: M.rubber() },
  ],
  info: {
    what: 'A pair of framed glass doors forming the main way into the building.',
    location: 'Centre of the front curtain wall on the ground floor, under the canopy.',
    purpose: 'Controlled access for people, a level threshold for wheelchairs, and a fire-exit route outwards.',
    how: 'Each leaf hangs on floor springs or pivots; a closer brings it back shut. Access control (card reader + electromagnetic lock) releases the door, and in a fire alarm the lock fails safe open. A recessed entrance mat removes dirt and water.',
    connections: ['curtain-wall-l1', 'entrance-canopy', 'ground-slab'],
    examples: 'Shopfronts, office lobbies, hotels; busier buildings use revolving doors to reduce draughts and heat loss.',
    advanced: '2.0 m x 2.4 m double leaf, 10 mm toughened/laminated safety glass (EN 12150 / EN 14449) in thermally broken aluminium. Clear opening ≥ 1000 mm per leaf (accessibility, BS 8300 / ADA 32" min), level threshold ≤ 15 mm upstand. Opening force ≤ 30 N. On the escape route, doors must open in the direction of escape with panic hardware (EN 1125) and the maglock must release on fire-alarm signal and power failure.',
    facts: ['Revolving doors can cut entrance air infiltration by up to ~8x compared with swing doors.'],
  },
});

parts.push({
  id: 'entrance-canopy',
  name: 'Entrance Canopy',
  system: 'envelope',
  position: [0, G, 0],
  explode: [0, ey(1) + 0.5, 3.2],
  floor: 1,
  stage: 7,
  shapes: [
    { type: 'box', size: [4.2, 0.18, 2.2], position: [0, 3.0, 5.95], material: M.steel('#42474f') },
    { type: 'box', size: [4.0, 0.03, 2.0], position: [0, 3.105, 5.95], material: glass },
    { type: 'cylinder', radius: 0.08, height: 2.95, segments: 12, position: [-1.9, 1.475, 6.85], array: { count: 2, offset: [3.8, 0, 0] }, material: steel },
    { type: 'box', size: [0.12, 0.06, 0.12], position: [0, 2.9, 6.9], material: M.light() },
  ],
  info: {
    what: 'A steel-and-glass roof projecting over the front door.',
    location: 'Ground floor, in front of the main entrance, supported by two slim steel posts.',
    purpose: 'Shelters people from rain while they enter, marks the entrance clearly, and holds an outdoor light.',
    how: 'A steel frame cantilevers from the façade and is propped at its front edge by two posts. A glass top lets daylight through while shedding rain to a hidden gutter.',
    connections: ['entrance-door', 'curtain-wall-l1', 'ground-slab'],
    examples: 'Hotel porte-cochères, station canopies and shop entrances.',
    advanced: 'RHS steel frame (S355, hot-dip galvanised + powder coat) with 13.5 mm laminated heat-strengthened glass (glazing overhead must be laminated so it is retained if broken). Designed for snow load and drifting against the façade (EN 1991-1-3), wind uplift, and a 0.6 kPa maintenance load. Thermally broken connection brackets avoid a cold bridge through the façade line.',
    facts: ['Overhead glass is always laminated — like a car windscreen it holds together if it cracks.'],
  },
});

parts.push({
  id: 'partitions-l2',
  name: 'Internal Partitions — First Floor',
  system: 'envelope',
  position: [0, base(2), 0],
  explode: [0, ey(2) + 0.6, 0],
  floor: 2,
  stage: 9,
  shapes: [
    ...wallRun('x', -2.9, -1.8, 2.0, [{ c: 0.2, w: 0.9, sill: 0, head: 2.1 }], { h: 2.35, t: 0.1, mat: M.plaster() }),
    ...wallRun('z', 2.0, -4.3, -0.6, [], { h: 2.35, t: 0.1, mat: M.plaster() }),
    ...wallRun('x', -0.6, 2.0, 5.85, [{ c: 3.0, w: 0.9, sill: 0, head: 2.1 }, { c: 4.75, w: 1.8, sill: 0.9, head: 2.1 }], { h: 2.35, t: 0.1, mat: M.plaster() }),
    { type: 'box', size: [1.8, 1.2, 0.02], position: [4.75, 1.5, -0.6], material: glass },
  ],
  info: {
    what: 'Light, non-structural walls dividing the open floor into a toilet block, a meeting room and open-plan office.',
    location: 'On the first floor, near the back of the building beside the core.',
    purpose: 'Create rooms for privacy and acoustics without adding load to the structure — they can be moved later as tenants change.',
    how: 'Steel studs are fixed between a floor track and a head track, filled with mineral wool for sound insulation and boarded both sides with plasterboard. A deflection head lets the slab above move without crushing the wall.',
    connections: ['slab-l2', 'plumbing-l2', 'hvac-ducts-l2'],
    examples: 'Office fit-outs, hotel rooms, hospital wards — nearly all modern internal walls are drywall partitions.',
    advanced: '70 mm C-studs at 600 mm centres, 2 x 12.5 mm plasterboard each side, 50 mm mineral wool: ≈ 100 mm thick, Rw ≈ 45–50 dB, 60 min fire resistance. Allowance in slab design: 1.0 kPa uniformly distributed partition load (or 0.8–1.2 kPa per EN 1991-1-1 §6.3.1.2 depending on self-weight per metre). Deflection head accommodates ~15–25 mm long-term slab deflection.',
    facts: ['"Category A" fit-out delivers an empty office; partitions usually arrive in the tenant\'s "Category B" fit-out.'],
  },
});

parts.push({
  id: 'parapet',
  name: 'Roof Parapet',
  system: 'roof',
  position: [0, base(5), 0],
  explode: [0, ey(5) + 0.2, 0],
  floor: 5,
  stage: 7,
  shapes: [
    { type: 'box', size: [12.5, 1.0, 0.2], position: [0, 0.5, 4.8], material: brick },
    { type: 'box', size: [12.5, 1.0, 0.3], position: [0, 0.5, -4.6], material: brick },
    { type: 'box', size: [0.3, 1.0, 9.15], position: [6.1, 0.5, 0.125], material: brick },
    { type: 'box', size: [0.3, 1.0, 9.15], position: [-6.1, 0.5, 0.125], material: brick },
    { type: 'box', size: [12.7, 0.06, 0.4], position: [0, 1.03, 4.8], material: alu },
    { type: 'box', size: [12.7, 0.06, 0.4], position: [0, 1.03, -4.6], material: alu },
    { type: 'box', size: [0.4, 0.06, 9.4], position: [6.1, 1.03, 0.1], material: alu },
    { type: 'box', size: [0.4, 0.06, 9.4], position: [-6.1, 1.03, 0.1], material: alu },
  ],
  info: {
    what: 'A low wall running around the edge of the flat roof, topped with a metal coping.',
    location: 'Perimeter of the roof, continuing the façade line up above the roof slab.',
    purpose: 'Protects people working on the roof from falling, hides rooftop plant, and gives a neat top edge to the façade.',
    how: 'The parapet sits on the roof slab edge. The waterproof membrane is turned up its inner face (an upstand) and tucked under the coping, which overhangs both sides with drip edges to throw water clear of the walls.',
    connections: ['roof-slab', 'external-walls-l4', 'curtain-wall-l4'],
    examples: 'Seen on most flat-roofed buildings, from Victorian terraces to modern offices.',
    advanced: '1.0–1.1 m high guarding (EN 1991-1-1 Table 6.12: 0.5–1.0 kN/m line load at top for maintenance roofs; Building Regs Part K min 1100 mm where general access). Membrane upstand ≥ 150 mm above finished roof. Parapets are exposed on both faces, so frost-resistant (F2) bricks, S-designation mortar and a DPC under the coping are specified; restraint ties back to the slab resist wind suction.',
    facts: ['Parapets were once required by fire codes to stop flames spreading from roof to roof.'],
  },
});

// =========================================================================
// ROOF PLANT
// =========================================================================
const RB = base(5) + 0.1; // top of roof finishes

parts.push({
  id: 'hvac-unit',
  name: 'Rooftop Air-Handling Unit',
  system: 'hvac',
  position: [2.0, RB, -2.0],
  explode: [0, ey(5) + 1.2, 0],
  floor: 5,
  stage: 9,
  shapes: [
    { type: 'box', size: [3.2, 0.15, 2.0], position: [0, 0.075, 0], material: steel },
    { type: 'box', size: [3.0, 1.4, 1.8], position: [0, 0.85, 0], radius: 0.04, material: M.metal('#cfd3d8') },
    { type: 'box', size: [0.04, 0.05, 1.5], position: [-1.52, 0.4, 0], array: { count: 9, offset: [0, 0.1, 0] }, material: M.steel('#545b65') },
    { type: 'box', size: [0.8, 0.9, 0.04], position: [-0.6, 0.85, 0.92], material: M.steel('#8a929c') },
    { type: 'cylinder', radius: 0.55, height: 0.05, segments: 20, position: [0.8, 1.56, 0], material: M.steel('#545b65') },
  ],
  info: {
    what: 'A big metal box on the roof that cleans, heats or cools and pushes fresh air into every floor.',
    location: 'On the roof slab, towards the back, on a steel base frame.',
    purpose: 'Provides ventilation (fresh air for people) and heating/cooling, distributing conditioned air through ducts on each floor.',
    how: 'Fans draw in outside air through louvres (grey slats), filters clean it, a heat-recovery wheel pre-warms it using outgoing stale air, and coils fed by a heat pump heat or cool it. The supply air then drops down the duct riser to each floor.',
    connections: ['hvac-fan', 'hvac-riser', 'roof-slab', 'main-panel'],
    examples: 'The large grey boxes on top of supermarkets, schools and offices are rooftop units or AHUs.',
    advanced: 'Packaged reversible heat-pump AHU (R32 / R454B), ≈ 1.8 m³/s supply (≈ 10 l/s per person + space conditioning for ~400 m² NIA per floor), EN 779/ISO 16890 ePM1 filtration, thermal wheel with ≥ 75% sensible efficiency, EC plug fans with specific fan power ≤ 1.6 W/(l/s). Operating weight ≈ 2,000 kg on anti-vibration mounts over a steel grillage that spreads load onto the beams. Controlled by the BMS with CO₂-based demand-controlled ventilation.',
    facts: ['Heat-recovery wheels can recapture around 80% of the heat in exhaust air.'],
  },
});

parts.push({
  id: 'hvac-fan',
  name: 'Condenser / Exhaust Fan',
  system: 'hvac',
  position: [2.8, RB + 1.62, -2.0],
  explode: [0, ey(5) + 2.2, 0],
  floor: 5,
  stage: 9,
  anim: { type: 'spin', axis: 'y', speed: 6 },
  shapes: [
    { type: 'cylinder', radius: 0.08, height: 0.12, segments: 12, material: M.steel('#2b2f35') },
    { type: 'box', size: [0.42, 0.015, 0.14], position: [0.25, 0, 0], rotation: [0.35, 0, 0], array: { count: 4, rotation: [0, PI / 2, 0] }, material: M.aluminium() },
    { type: 'torus', radius: 0.5, tube: 0.015, radialSegments: 6, tubularSegments: 32, rotation: [PI / 2, 0, 0], position: [0, 0.06, 0], material: steel },
  ],
  info: {
    what: 'A large propeller fan on top of the air-handling unit.',
    location: 'On the roof of the AHU, blowing upwards.',
    purpose: 'Rejects heat from the refrigerant circuit (in cooling mode) by blowing outdoor air across the condenser coil.',
    how: 'An electric motor spins the blades, which pull air up through the coil beneath and discharge it vertically so the hot air does not recirculate back into the unit.',
    connections: ['hvac-unit', 'main-panel'],
    examples: 'The spinning fans on outdoor air-conditioning units at homes and shops.',
    advanced: '~800 mm axial fan with EC motor (variable speed via 0–10 V or Modbus), ≈ 2–3 m³/s, sound power controlled to meet boundary noise limits (e.g. BS 4142 rating level ≤ background). Head-pressure control slows the fan in cold weather to keep condensing pressure stable.',
    facts: ['Vertical discharge prevents "short-cycling" — the unit re-breathing its own warm exhaust.'],
  },
});

parts.push({
  id: 'water-tank',
  name: 'Rooftop Water Storage Tank',
  system: 'plumbing',
  position: [-3.0, RB, -3.4],
  explode: [0, ey(5) + 1.4, 0],
  floor: 5,
  stage: 9,
  shapes: [
    { type: 'box', size: [1.7, 0.4, 1.7], position: [0, 0.2, 0], material: steel },
    { type: 'cylinder', radius: 0.8, height: 1.6, segments: 24, position: [0, 1.2, 0], material: M.plastic('#2f6f8f') },
    { type: 'cylinder', radius: 0.25, height: 0.08, segments: 16, position: [0, 2.04, 0], material: M.plastic('#1f4f66') },
  ],
  info: {
    what: 'A large insulated tank storing cold water on the roof.',
    location: 'On a steel stand on the roof, above the stair core and next to the cold-water riser.',
    purpose: 'Stores a reserve of water so taps and toilets keep working at peak times or during a mains interruption, and provides gravity pressure to the floors below.',
    how: 'A booster pump fills the tank via the cold riser; a float valve stops it when full. Water then flows down by gravity (or via a pressure set) to each floor\'s branch pipes.',
    connections: ['cold-water-riser', 'roof-slab', 'plumbing-l4'],
    examples: 'Rooftop water tanks are iconic in New York, Mumbai and many hot-climate cities.',
    advanced: 'GRP/polyethylene sectional tank, ≈ 3 m³ (≈ 12–24 h storage for ~150 occupants at 15–20 l/person/day in offices; BS EN 806 / BS 8558). WRAS-approved, insulated and with a screened vent and overflow to prevent contamination; maintained under an L8 Legionella risk assessment (stored cold water < 20 °C). Full tank ≈ 3.2 t, so it is located over a beam/core wall.',
    facts: ['Many New York rooftop tanks are still made of cedar wood, which naturally insulates and resists rot.'],
  },
});

parts.push({
  id: 'solar-panels',
  name: 'Solar PV Array',
  system: 'electrical',
  position: [0, RB, 0],
  explode: [0, ey(5) + 1.8, 1.0],
  floor: 5,
  stage: 9,
  shapes: [
    { type: 'box', size: [1.0, 0.04, 1.6], position: [0.8, 0.55, 1.6], rotation: [-0.35, 0, 0], array: { count: 5, offset: [1.05, 0, 0] }, material: M.plastic('#1b2a4a') },
    { type: 'box', size: [1.0, 0.04, 1.6], position: [0.8, 0.55, 3.6], rotation: [-0.35, 0, 0], array: { count: 5, offset: [1.05, 0, 0] }, material: M.plastic('#1b2a4a') },
    { type: 'box', size: [5.4, 0.05, 0.05], position: [2.9, 0.3, 2.3], material: alu },
    { type: 'box', size: [5.4, 0.05, 0.05], position: [2.9, 0.8, 0.9], material: alu },
    { type: 'box', size: [5.4, 0.05, 0.05], position: [2.9, 0.3, 4.3], material: alu },
    { type: 'box', size: [5.4, 0.05, 0.05], position: [2.9, 0.8, 2.9], material: alu },
    { type: 'box', size: [5.6, 0.12, 0.25], position: [2.9, 0.06, 1.6], array: { count: 2, offset: [0, 0, 2.0] }, material: concreteDark },
  ],
  info: {
    what: 'Ten photovoltaic (PV) panels that turn sunlight into electricity.',
    location: 'On the front half of the roof, tilted towards the sun on aluminium frames weighted with concrete ballast.',
    purpose: 'Generate clean electricity on site to cut energy bills and carbon emissions.',
    how: 'Sunlight knocks electrons loose in silicon cells, creating direct current (DC). An inverter converts DC into alternating current (AC) matching the building supply, feeding the main panel.',
    connections: ['main-panel', 'electrical-riser', 'roof-slab'],
    examples: 'Rooftop solar on homes, warehouses, schools; solar farms in fields.',
    advanced: '10 x ~430 Wp monocrystalline modules ≈ 4.3 kWp, tilted ~20° to balance yield vs. wind load and row shading. Annual yield ≈ 900–1,100 kWh/kWp in central Europe → ~4,300 kWh/yr. Ballasted system (no roof penetrations) checked for wind uplift/sliding per EN 1991-1-4 and the roof\'s extra dead load (~0.15–0.25 kPa). String inverter with DC isolators; RCD/anti-islanding protection per EN 50549 / G99 connection rules.',
    facts: ['A typical solar panel converts about 20–22% of the sunlight hitting it into electricity.'],
  },
});

// =========================================================================
// PLUMBING
// =========================================================================
const RISER_TOP = base(5) + 0.4;

parts.push({
  id: 'cold-water-riser',
  name: 'Cold Water Riser',
  system: 'plumbing',
  position: [0, 0, 0],
  explode: [-0.5, 4, -7.0],
  floor: 1,
  stage: 8,
  shapes: [
    vCyl(-1.55, -3.95, 1.4, RISER_TOP, 0.04, M.pipeCold()),
    hCylX(-2.4, -1.55, RISER_TOP, -3.95, 0.04, M.pipeCold()),
    hCylZ(-3.95, -7.5, 1.4, -1.55, 0.04, M.pipeCold()),
    { type: 'box', size: [0.25, 0.35, 0.2], position: [-1.55, G + 0.5, -3.95], material: M.paint('#1f5fae') },
  ],
  info: {
    what: 'The main vertical pipe that carries fresh cold water up through the building.',
    location: 'In the service riser just to the right of the core, from the incoming main underground up to the roof tank.',
    purpose: 'Delivers drinking water to every floor\'s taps, toilets and kitchens, and fills the roof tank.',
    how: 'The water main enters below ground; a booster pump set (blue box) raises the pressure and pushes water up the riser. At each floor a branch with an isolation valve tees off. At the top it fills the storage tank.',
    connections: ['water-tank', 'plumbing-l1', 'plumbing-l2', 'plumbing-l3', 'plumbing-l4', 'hot-water-riser'],
    examples: 'Every multi-storey building has a cold water riser — tall towers split them into pressure zones.',
    advanced: '54 mm copper / PE-X riser sized by loading units (BS EN 806-3) at ≤ 1.5–2.0 m/s. Pressure needed at top outlet ≈ 1.0–1.5 bar plus static head (13.6 m ≈ 1.36 bar) and friction → booster set with variable-speed duty/standby pumps. Insulated to prevent condensation and heat gain (Legionella: keep < 20 °C). Pipes are sleeved and fire-stopped where they pass through each slab to maintain compartmentation.',
    facts: ['Every 10 m of height costs about 1 bar of water pressure.'],
  },
});

parts.push({
  id: 'hot-water-riser',
  name: 'Hot Water Flow & Return Riser',
  system: 'plumbing',
  position: [0, 0, 0],
  explode: [0, 4, -7.5],
  floor: 1,
  stage: 8,
  shapes: [
    vCyl(-1.3, -3.95, G + 0.3, base(4) + 2.5, 0.032, M.pipeHot()),
    vCyl(-1.3, -3.75, G + 0.3, base(4) + 2.5, 0.022, M.pipeHot()),
    { type: 'cylinder', radius: 0.28, height: 1.4, segments: 16, position: [-0.9, G + 0.7, -3.4], material: M.paint('#b71c1c') },
  ],
  info: {
    what: 'Insulated pipes that carry heated water up the building, with a second pipe bringing it back round.',
    location: 'In the riser beside the cold water pipe, starting from the water heater (red cylinder) on the ground floor.',
    purpose: 'Supplies hot water to washbasins and kitchens quickly and safely on every floor.',
    how: 'A water heater (cylinder) warms water to about 60 °C. A small pump circulates it up the flow pipe and back down the return pipe, so hot water is always waiting near each tap instead of going cold in the pipes.',
    connections: ['cold-water-riser', 'plumbing-l1', 'plumbing-l2', 'plumbing-l3', 'plumbing-l4'],
    examples: 'Hotels, hospitals and offices use circulating hot water; homes usually rely on a single run from the boiler or cylinder.',
    advanced: 'Secondary circulation: 60 °C storage, ≥ 55 °C at return (HSE L8 / ACoP for Legionella control, which multiplies between 20–45 °C). 300 l unvented cylinder heated by an air-source heat pump with immersion back-up for pasteurisation. Copper flow 35 mm / return 22 mm, insulated to BS 5422; thermostatic mixing valves (TMV3) at basins limit delivery to ~41–43 °C. Expansion and thermal movement handled by loops/bellows over the 11 m run.',
    facts: ['Hot water is stored at 60 °C mainly to kill Legionella bacteria, then mixed down to a safe temperature at the tap.'],
  },
});

parts.push({
  id: 'drainage-stack',
  name: 'Soil & Vent Stack',
  system: 'plumbing',
  position: [0, 0, 0],
  explode: [0.6, 4, -8.2],
  floor: 1,
  stage: 8,
  shapes: [
    vCyl(-1.0, -3.95, 1.4, RB + 0.9, 0.075, drainGrey),
    hCylZ(-3.95, -8.5, 1.4, -1.0, 0.075, drainGrey),
    { type: 'cylinder', radius: 0.4, height: 0.2, segments: 16, position: [-1.0, 1.4, -8.5], material: concreteDark },
    { type: 'cone', radius: 0.11, height: 0.18, segments: 12, position: [-1.0, RB + 0.95, -3.95], material: drainGrey },
  ],
  info: {
    what: 'A large vertical pipe that carries waste water and sewage down and out of the building, with its top open to the air above the roof.',
    location: 'In the service riser next to the water pipes, from the roof down through the ground slab to an underground drain and manhole.',
    purpose: 'Removes waste from toilets and basins on every floor, and ventilates the drainage so smells cannot get into the building.',
    how: 'Waste flows down by gravity. As it falls it pushes and pulls air; the open vent at the top lets air in and out so the water seals in each trap (the U-bend under a sink) are not sucked dry. At the bottom a long-radius bend turns it into the underground drain to the sewer.',
    connections: ['plumbing-l1', 'plumbing-l2', 'plumbing-l3', 'plumbing-l4', 'soil'],
    examples: 'The pipe poking out of the roof of almost every house is the top of a soil and vent stack.',
    advanced: '100–110 mm PVC-U/cast-iron stack (BS EN 12056-2, System III). Discharge units summed per floor; a 100 mm stack handles ≈ 4 l/s, ample for 4 toilet cores. Vent terminates ≥ 900 mm above any opening within 3 m. Base bend radius ≥ 200 mm to avoid back-pressure; the lowest branch connection kept ≥ 450 mm above the invert. Below ground: 100–150 mm drain at 1:40–1:80 to an inspection chamber; acoustic lagging and intumescent fire collars at each slab penetration.',
    facts: ['The water in a U-bend trap is the only thing keeping sewer gases out of a room.'],
  },
});

for (const i of LEVELS) {
  parts.push({
    id: `plumbing-l${i}`,
    name: `Plumbing Branches & Fixtures — ${LEVEL[i]}`,
    system: 'plumbing',
    position: [0, base(i), 0],
    explode: [0, ey(i) + 0.9, -0.8],
    floor: i,
    stage: 8,
    shapes: [
      hCylX(-1.55, 1.8, 2.45, -3.95, 0.022, M.pipeCold(), 8),
      hCylX(-1.3, 1.8, 2.35, -3.75, 0.018, M.pipeHot(), 8),
      hCylX(-1.0, 1.6, 0.12, -4.15, 0.05, drainGrey, 10),
      vCyl(0.4, -3.95, 0.9, 2.45, 0.012, M.pipeCold(), 6),
      vCyl(1.2, -3.95, 0.9, 2.45, 0.012, M.pipeCold(), 6),
      vCyl(0.5, -3.75, 0.9, 2.35, 0.012, M.pipeHot(), 6),
      vCyl(1.3, -3.75, 0.9, 2.35, 0.012, M.pipeHot(), 6),
      { type: 'box', size: [0.55, 0.15, 0.42], position: [0.4, 0.85, -4.15], array: { count: 2, offset: [0.8, 0, 0] }, radius: 0.04, material: M.plaster('#f6f6f4') },
      { type: 'box', size: [0.18, 0.75, 0.18], position: [0.4, 0.4, -4.2], array: { count: 2, offset: [0.8, 0, 0] }, material: M.plaster('#f6f6f4') },
    ],
    info: {
      what: `The horizontal water and waste pipes that serve the washbasins on the ${LEVEL[i].toLowerCase()}.`,
      location: `Running from the risers along the back wall of the ${LEVEL[i].toLowerCase()} to the toilet block; supply pipes at ceiling level, waste pipe at floor level.`,
      purpose: 'Bring hot and cold water to each fixture and take the used water away to the drainage stack.',
      how: 'Cold (blue) and hot (red) branches tee off the risers through isolation valves and drop down to the taps. Waste from each basin runs through a trap into the grey branch pipe, which slopes gently towards the stack so it drains by gravity.',
      connections: ['cold-water-riser', 'hot-water-riser', 'drainage-stack', i === 1 ? 'ground-slab' : `slab-l${i}`, ...(i === 2 ? ['partitions-l2'] : [])],
      examples: 'Toilet cores in offices, bathrooms in apartments and kitchens in restaurants all use the same branch-and-riser layout.',
      advanced: 'Copper 22/15 mm branches with floor-level isolation & check valves; dead legs kept short (≤ 2–3 m, or trace-heated) to meet Legionella guidance. Waste branches 40–50 mm at 18–90 mm/m fall (BS EN 12056-2), maximum unvented branch lengths observed or air-admittance valves fitted. Fixture counts per BS 6465-1 (e.g. ~1 WC + 1 basin per 25 office occupants per gender). Pipework is supported at 1.5–2.5 m and penetrations fire-stopped.',
      facts: ['Waste pipes are laid at a slope of roughly 1–2 cm per metre: too flat and solids settle, too steep and water outruns the solids.'],
    },
  });
}

// =========================================================================
// ELECTRICAL
// =========================================================================
parts.push({
  id: 'main-panel',
  name: 'Main Electrical Switchboard',
  system: 'electrical',
  position: [-2.0, G, -1.1],
  explode: [0, ey(1), -8.6],
  floor: 1,
  stage: 8,
  shapes: [
    { type: 'box', size: [0.35, 2.0, 1.0], position: [0, 1.0, 0], material: M.paint('#7d8590') },
    { type: 'box', size: [0.02, 0.08, 0.3], position: [0.185, 1.5, -0.2], array: { count: 3, offset: [0, -0.35, 0] }, material: M.light('#7dff8a', 1.2) },
    { type: 'box', size: [0.02, 1.8, 0.02], position: [0.185, 1.0, 0], material: M.steel('#2b2f35') },
  ],
  info: {
    what: 'The main switchboard where electricity enters the building and is split up into circuits.',
    location: 'Ground floor, against the outside of the core, at the foot of the electrical riser.',
    purpose: 'Receives the incoming supply (and solar PV), measures it, protects every circuit with breakers, and sends power up to each floor.',
    how: 'The utility cable enters through a meter and a main switch. Copper busbars inside distribute power to circuit breakers; each breaker feeds a sub-main up the riser to a floor distribution board. If a fault draws too much current, the breaker trips instantly.',
    connections: ['electrical-riser', 'solar-panels', 'hvac-unit', 'lift-car', 'cable-trays-l1'],
    examples: 'The "fuse box" or consumer unit in a home is a miniature version of this.',
    advanced: 'Form 4 type 2 LV switchboard (IEC 61439-2), 400/230 V TN-C-S, ≈ 250 A 3-phase incomer for a ~1,600 m² office (≈ 60–80 W/m² peak incl. HVAC). Moulded-case breakers with discrimination (selectivity) to downstream MCBs; RCD/RCBO protection on final circuits per BS 7671 / IEC 60364; surge protection (SPD Type 1+2). Fire-alarm and life-safety loads (sprinkler pump, fire-fighting lift, smoke control) on separate secure supplies. Metering includes sub-meters per tenant/floor and PV export.',
    facts: ['The building\'s whole electrical system is designed so a fault trips the smallest breaker closest to it, not the whole building.'],
  },
});

parts.push({
  id: 'electrical-riser',
  name: 'Electrical Busbar Riser',
  system: 'electrical',
  position: [0, 0, 0],
  explode: [0, 4, -9.2],
  floor: 1,
  stage: 8,
  anim: { type: 'flow', speed: 2 },
  shapes: [
    { type: 'box', size: [0.12, base(5) - (G + 2.0), 0.3], position: [-2.1, (G + 2.0 + base(5)) / 2, -1.1], material: M.wire() },
    { type: 'box', size: [0.2, 0.5, 0.4], position: [-2.05, base(2) + 1.4, -1.1], array: { count: 3, offset: [0, H, 0] }, material: M.paint('#7d8590') },
  ],
  info: {
    what: 'A vertical enclosed copper busbar that carries electricity from the main switchboard up through every floor.',
    location: 'In the service riser beside the core, rising from the top of the main switchboard to roof level.',
    purpose: 'Distributes power to each floor\'s distribution board (grey boxes) and to rooftop plant, with a tap-off at every level.',
    how: 'Thick copper bars inside a steel casing carry high current with little loss. At each floor a plug-in tap-off unit connects to the floor distribution board, which feeds the lighting and power circuits running along the cable trays.',
    connections: ['main-panel', 'cable-trays-l1', 'cable-trays-l2', 'cable-trays-l3', 'cable-trays-l4', 'solar-panels'],
    examples: 'Rising mains in apartment blocks, busbar trunking in factories and data centres.',
    advanced: 'Rising-main busbar trunking (IEC 61439-6), 250 A, 4-pole + PE, sandwich construction for low impedance; voltage drop held ≤ 3% to the last tap-off (BS 7671 Appx 4 allows ≤ 5% total for power). Fire barriers at each slab penetration maintain the floor compartmentation; the riser cupboard is a fire-rated shaft. Tap-offs feed 100 A TP&N floor DBs with sub-metering.',
    facts: ['Busbars can carry far more current than cables of the same size and are easy to tap into at every floor.'],
  },
});

for (const i of LEVELS) {
  parts.push({
    id: `cable-trays-l${i}`,
    name: `Cable Trays & Lighting — ${LEVEL[i]}`,
    system: 'electrical',
    position: [0, base(i), 0],
    explode: [0, ey(i) + 1.3, 0],
    floor: i,
    stage: 8,
    shapes: [
      { type: 'box', size: [7.9, 0.06, 0.3], position: [1.9, 2.62, -1.1], material: M.brushed('#9aa1aa') },
      { type: 'box', size: [0.3, 0.06, 5.1], position: [4.0, 2.62, 1.45], material: M.brushed('#9aa1aa') },
      hCylX(-2.0, 5.8, 2.67, -1.1, 0.03, M.wire(), 6),
      hCylZ(-1.1, 4.0, 2.67, 4.0, 0.025, M.wire('#e65100'), 6),
      { type: 'box', size: [0.6, 0.05, 0.6], position: [-0.8, 2.33, -0.8], array: { count: 4, offset: [2.0, 0, 0] }, material: M.light() },
      { type: 'box', size: [0.6, 0.05, 0.6], position: [-0.8, 2.33, 1.6], array: { count: 4, offset: [2.0, 0, 0] }, material: M.light() },
      { type: 'box', size: [0.6, 0.05, 0.6], position: [-0.8, 2.33, 3.6], array: { count: 4, offset: [2.0, 0, 0] }, material: M.light() },
    ],
    info: {
      what: `Metal trays carrying power and data cables across the ceiling of the ${LEVEL[i].toLowerCase()}, plus the LED light panels they feed.`,
      location: `In the ceiling void of the ${LEVEL[i].toLowerCase()}, running from the electrical riser across the floor; light panels sit in the suspended ceiling grid.`,
      purpose: 'Support and organise cables so they are protected, easy to add to and kept apart from other services; provide comfortable, efficient lighting.',
      how: 'Cables leave the floor distribution board, lie on the perforated steel trays and drop down to lights, sockets and equipment. Each LED panel converts electricity to light with a small driver; sensors dim them when daylight or nobody is present.',
      connections: ['electrical-riser', `hvac-ducts-l${i}`, `sprinklers-l${i}`, ...(i === 1 ? ['main-panel'] : [])],
      examples: 'Look up in a car park, warehouse or unfinished office and you will see cable trays and ladder racks.',
      advanced: 'Hot-dip galvanised perforated tray (EN 61537), sized with ≥ 25% spare capacity; LV power segregated from data/ELV (EN 50174-2). Lighting: 600 x 600 mm LED panels, ≈ 30–35 W, ≥ 120 lm/W, UGR < 19, maintained 500 lux on the working plane (EN 12464-1) → LPD ≈ 6–8 W/m². DALI control with PIR presence detection and daylight dimming near the façade. Emergency luminaires with 3-hour batteries (EN 1838 / BS 5266) on escape routes.',
      facts: ['LED lighting uses roughly one-fifth of the energy of the old fluorescent tubes it replaced in offices.'],
    },
  });
}

// =========================================================================
// HVAC
// =========================================================================
parts.push({
  id: 'hvac-riser',
  name: 'Supply Air Duct Riser',
  system: 'hvac',
  position: [0, 0, 0],
  explode: [2.5, 4, -10],
  floor: 1,
  stage: 8,
  shapes: [
    { type: 'box', size: [0.5, RB + 0.55 - (G + 2.3), 0.5], position: [-1.2, (G + 2.3 + RB + 0.55) / 2, -2.5], material: M.brushed() },
    { type: 'box', size: [2.0, 0.5, 0.5], position: [-0.2, RB + 0.3, -2.5], material: M.brushed() },
  ],
  info: {
    what: 'A large vertical sheet-metal duct that carries conditioned air from the rooftop unit down to every floor.',
    location: 'In the service shaft beside the core, from the roof AHU down to the ground-floor ceiling.',
    purpose: 'The "trunk" of the air distribution system — every floor\'s ducts branch off it.',
    how: 'The AHU fan pressurises the duct. Air flows down the riser and is split off at each floor through a fire/smoke damper into the horizontal ductwork. A separate extract riser (not shown) brings stale air back up.',
    connections: ['hvac-unit', 'hvac-ducts-l1', 'hvac-ducts-l2', 'hvac-ducts-l3', 'hvac-ducts-l4'],
    examples: 'Ventilation shafts in shopping centres, hospitals and offices.',
    advanced: 'Galvanised steel duct (DW/144 / EN 1507), ≈ 0.5 x 0.5 m at the top carrying ~1.8 m³/s at ≈ 7 m/s (risers typically 6–8 m/s to limit noise). Externally insulated, with fire dampers (EN 15650, E60–E120) at every compartment floor or within a fire-rated shaft. Pressure losses (ΔP ≈ 1 Pa/m straight duct + fittings) are summed to size the AHU fan.',
    facts: ['Doubling the air speed in a duct roughly quadruples the pressure loss — and the noise.'],
  },
});

for (const i of LEVELS) {
  parts.push({
    id: `hvac-ducts-l${i}`,
    name: `HVAC Ductwork — ${LEVEL[i]}`,
    system: 'hvac',
    position: [0, base(i), 0],
    explode: [0, ey(i) + 0.9, 0],
    floor: i,
    stage: 8,
    shapes: [
      { type: 'box', size: [6.7, 0.3, 0.5], position: [2.15, 2.5, -2.5], material: M.brushed() },
      { type: 'box', size: [0.3, 0.2, 6.0], position: [0.8, 2.45, 0.6], array: { count: 2, offset: [3.0, 0, 0] }, material: M.brushed() },
      { type: 'box', size: [0.45, 0.05, 0.45], position: [0.8, 2.33, -0.2], array: { count: 3, offset: [0, 0, 2.0] }, material: M.plastic('#e9edf0') },
      { type: 'box', size: [0.45, 0.05, 0.45], position: [3.8, 2.33, -0.2], array: { count: 3, offset: [0, 0, 2.0] }, material: M.plastic('#e9edf0') },
    ],
    info: {
      what: `Sheet-metal ducts that spread fresh, conditioned air across the ${LEVEL[i].toLowerCase()}.`,
      location: `In the ceiling void of the ${LEVEL[i].toLowerCase()}: a main duct along the back of the floor with two branches running towards the front, ending in ceiling diffusers (white squares).`,
      purpose: 'Deliver fresh air for breathing and keep every part of the floor at a comfortable temperature.',
      how: 'Air from the riser flows along the main duct, divides into the branches and leaves through ceiling diffusers, which spread it sideways along the ceiling so it mixes gently without draughts. Stale air is drawn back through return grilles.',
      connections: ['hvac-riser', 'hvac-unit', `cable-trays-l${i}`, `sprinklers-l${i}`, ...(i === 2 ? ['partitions-l2'] : [])],
      examples: 'The grilles in office and shop ceilings, cinemas and aircraft cabins all come from similar duct systems.',
      advanced: 'Variable-air-volume (VAV) system with terminal boxes per zone; supply ≈ 0.45 m³/s per floor (≈ 10–12 l/s per person outdoor air + cooling load ≈ 40–50 W/m²) at 14–16 °C in cooling. Ducts sized by equal-friction (~0.8–1 Pa/m), velocities 4–6 m/s in mains, 2–3 m/s at branches. Diffuser throw selected to keep occupied-zone air speed < 0.25 m/s (ISO 7730 / EN 16798 Cat II). Ducts are DW/144 class B airtight and lagged where they could condense.',
      facts: ['People exhale CO₂ — ventilation rates are often controlled by CO₂ sensors kept below about 1,000 ppm.'],
    },
  });
}

// =========================================================================
// FIRE PROTECTION
// =========================================================================
parts.push({
  id: 'sprinkler-riser',
  name: 'Sprinkler Riser & Alarm Valve',
  system: 'fire',
  position: [0, 0, 0],
  explode: [1.5, 4, -9.6],
  floor: 1,
  stage: 8,
  shapes: [
    vCyl(-1.7, -1.7, 1.4, base(4) + 2.7, 0.055, red),
    { type: 'box', size: [0.3, 0.5, 0.25], position: [-1.7, G + 0.6, -1.7], material: red },
    { type: 'cylinder', radius: 0.14, height: 0.04, segments: 16, position: [-1.7, G + 1.0, -1.55], rotation: [PI / 2, 0, 0], material: M.paint('#1a1a1a') },
  ],
  info: {
    what: 'The red vertical pipe that feeds water to the sprinklers on every floor, with its control and alarm valve at the bottom.',
    location: 'Next to the core and electrical riser, from below the ground slab up to the third-floor ceiling.',
    purpose: 'Keeps the whole sprinkler system full of pressurised water, ready to fight a fire automatically.',
    how: 'Water is held at pressure in the pipes. When a sprinkler head opens, water flows; the alarm valve detects this flow, rings a gong and signals the fire alarm panel while water keeps flowing to the open head.',
    connections: ['sprinklers-l1', 'sprinklers-l2', 'sprinklers-l3', 'sprinklers-l4', 'main-panel'],
    examples: 'Required in most tall buildings, warehouses, shopping centres and hotels.',
    advanced: 'Wet-pipe system to EN 12845 / NFPA 13, Ordinary Hazard Group 1 for offices: design density 5 mm/min over 72 m², ≈ 1,000 l/min for 60 min → ~60 m³ supply (sprinkler tank + duty/standby pumps or town main if adequate). 80 mm riser with alarm valve set, water-motor gong, flow switch and pressure gauges; floor subsidiary valves with flow switches identify the alarm zone. Pipework is red, steel, grooved or screwed joints.',
    facts: ['Sprinklers are not set off by smoke — each head responds to heat individually.'],
  },
});

for (const i of LEVELS) {
  parts.push({
    id: `sprinklers-l${i}`,
    name: `Sprinkler Mains & Heads — ${LEVEL[i]}`,
    system: 'fire',
    position: [0, base(i), 0],
    explode: [0, ey(i) + 1.6, 0],
    floor: i,
    stage: 8,
    shapes: [
      hCylZ(-1.7, 2.6, 2.75, -1.7, 0.04, red, 8),
      hCylX(-1.7, 5.6, 2.75, 2.6, 0.04, red, 8),
      { type: 'cylinder', radius: 0.022, height: 3.0, segments: 6, rotation: [PI / 2, 0, 0], position: [0, 2.75, 2.6], array: { count: 3, offset: [2.4, 0, 0] }, material: red },
      { type: 'cone', radius: 0.035, height: 0.07, segments: 8, rotation: [PI, 0, 0], position: [0, 2.69, 1.4], array: { count: 3, offset: [2.4, 0, 0] }, material: M.brass() },
      { type: 'cone', radius: 0.035, height: 0.07, segments: 8, rotation: [PI, 0, 0], position: [0, 2.69, 3.8], array: { count: 3, offset: [2.4, 0, 0] }, material: M.brass() },
    ],
    info: {
      what: `The red sprinkler pipes and heat-activated sprinkler heads in the ceiling of the ${LEVEL[i].toLowerCase()}.`,
      location: `Ceiling void of the ${LEVEL[i].toLowerCase()}: a cross main from the riser feeds range pipes, each carrying sprinkler heads.`,
      purpose: 'Put out or control a fire automatically at its source, often before the fire brigade arrives.',
      how: 'Each head is plugged by a small glass bulb of liquid. Heat from a fire expands the liquid until the bulb bursts at about 68 °C, releasing water onto a deflector that sprays it over the fire. Only the heads near the fire open.',
      connections: ['sprinkler-riser', `cable-trays-l${i}`, `hvac-ducts-l${i}`],
      examples: 'The small metal nozzles in hotel rooms, offices and shop ceilings.',
      advanced: 'Quick-response pendent heads (K80, 68 °C red bulb, RTI < 50), max coverage ≈ 12 m² per head and ≤ 4.0 m spacing for OH1 (EN 12845). Range pipes 25–32 mm, cross main 50–65 mm, hydraulically calculated so the most remote 72 m² area receives 5 mm/min. Pipes are braced and hung independently of other services and coordinated in the ceiling void with ducts and trays.',
      facts: ['In buildings with sprinklers, most fires are controlled by just one or two heads.', 'The bulb colour shows the temperature rating: red = 68 °C, yellow = 79 °C.'],
    },
  });
}

// =========================================================================
// MODEL
// =========================================================================
const frameAll = [...LEVELS.map((i) => `columns-l${i}`), ...LEVELS.map((i) => `beams-l${i}`)];

export default {
  id: 'building',
  name: 'Modern Office Building',
  category: 'buildings',
  tagline: 'A 4-storey concrete-frame office, from piles to rooftop plant.',
  description:
    'A reinforced-concrete-frame mixed-use office building, 12 m x 9 m on plan with four storeys. Peel it apart floor by floor, watch it go up stage by stage, and trace how loads, water, power and air move through it.',
  camera: { position: [22, 16, 24], target: [0, 8, 0] },
  explodeScale: 1,
  floors,
  stages,
  systems,
  parts,
  steps: [
    {
      title: 'How loads travel to the ground',
      text: 'Every load — people, furniture, rain, the building\'s own weight — follows a "load path": slab → beams → columns → pile caps → piles → soil. Wind pushes sideways on the façade; the floor slabs pass it to the stiff concrete core, which carries it down to the foundations.',
      focus: ['slab-l3', 'beams-l2', 'columns-l2', 'columns-l1', 'pile-caps', 'piles', 'core-walls-l2'],
      explode: 0.3,
      animate: false,
    },
    {
      title: 'Foundations',
      text: 'The upper soil is too weak, so bored concrete piles reach down to firmer ground. Thick pile caps spread each column\'s load into the piles, and ground beams tie every cap together. The ground-floor slab sits on top, over a damp-proof membrane.',
      focus: ['soil', 'piles', 'pile-caps', 'grade-beams', 'ground-slab'],
      explode: 0.6,
      animate: false,
    },
    {
      title: 'Frame: columns, beams and slabs',
      text: 'A grid of 400 mm concrete columns supports downstand beams, which carry 250 mm floor slabs. Cast together, they form a rigid frame. Lower columns carry more floors, so they carry the most load.',
      focus: [...frameAll, 'slab-l2', 'slab-l3', 'slab-l4', 'roof-slab'],
      explode: 0.5,
      animate: false,
    },
    {
      title: 'Building envelope',
      text: 'The frame is wrapped to keep weather out and heat in: insulated brick cavity walls with double-glazed windows on three sides and a glass curtain wall on the street front. The parapet finishes the roof edge and the canopy marks the entrance.',
      focus: [
        ...LEVELS.map((i) => `curtain-wall-l${i}`), ...LEVELS.map((i) => `external-walls-l${i}`),
        ...LEVELS.map((i) => `windows-l${i}`), 'parapet', 'entrance-canopy', 'entrance-door',
      ],
      explode: 0.7,
      animate: false,
    },
    {
      title: 'Plumbing',
      text: 'A booster pump pushes cold water up the blue riser to the roof tank and each floor; heated water circulates continuously in the red loop. Used water drains by gravity down the grey soil stack to the sewer, while its open top lets air in so traps stay sealed.',
      focus: ['cold-water-riser', 'hot-water-riser', 'drainage-stack', 'water-tank', ...LEVELS.map((i) => `plumbing-l${i}`)],
      explode: 0.6,
      animate: true,
    },
    {
      title: 'Electrical',
      text: 'Power enters at the main switchboard, joined by solar PV from the roof. A busbar riser carries it up the building; at each floor a distribution board feeds cables along trays to LED lights and sockets.',
      focus: ['main-panel', 'electrical-riser', 'solar-panels', ...LEVELS.map((i) => `cable-trays-l${i}`)],
      explode: 0.6,
      animate: true,
    },
    {
      title: 'HVAC & fire protection',
      text: 'The rooftop air-handling unit filters, heats or cools fresh air and sends it down the duct riser into each floor\'s ductwork and ceiling diffusers. Alongside, red sprinkler pipes stand ready: heat bursts a sprinkler bulb and water sprays only where the fire is.',
      focus: ['hvac-unit', 'hvac-fan', 'hvac-riser', ...LEVELS.map((i) => `hvac-ducts-l${i}`), 'sprinkler-riser', ...LEVELS.map((i) => `sprinklers-l${i}`)],
      explode: 0.6,
      animate: true,
    },
    {
      title: 'Vertical circulation',
      text: 'The concrete core holds a dog-leg stair — the protected fire-escape route — and the lift shaft. The lift car, balanced by a counterweight, glides between floors driven by a motor in the overrun above the roof.',
      focus: [...LEVELS.map((i) => `core-walls-l${i}`), 'stairs-l1', 'stairs-l2', 'stairs-l3', 'lift-car', 'lift-overrun'],
      explode: 0.4,
      animate: true,
    },
  ],
};
