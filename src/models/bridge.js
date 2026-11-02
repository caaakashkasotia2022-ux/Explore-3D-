import { M } from '../three/materials.js';

/*
 * Twin-pylon cable-stayed road bridge over a river.
 * Deck runs along X from x = -32.4 to +32.4 (main span 32 m between pylons at
 * x = ±16, side spans 16.4 m with auxiliary piers at x = ±24.5, abutments at ±32.4).
 * Approach embankments continue to x = ±41. River water fills y = 0 .. 1.2 between
 * the banks (|x| < 21); bank ground level is y = 2.
 *
 * Deck section (Z): carriageway |z| < 7.5 (4 x 3.5 m lanes + edge strips),
 * footpaths 7.5 .. 9.4, deck slab edge at ±10, twin steel edge box girders at ±9.2.
 * H-shaped pylons: legs at z = ±11.2 (outside the deck), top at y = 31.
 * Two cable planes (z ≈ ±9.9 at the deck, ±10.5 at the pylon), semi-fan arrangement.
 */

const PI = Math.PI;
const PX = 16; // pylon x
const QX = 24.5; // auxiliary pier x
const AX = 32.4; // deck end / abutment x
const GB = 8.5; // girder bottom
const GT = 9.7; // girder top / slab soffit
const ST = 9.95; // slab top
const RT = 10.03; // road surface
const FT = 10.2; // footpath top
const LEG_Z = 11.2;
const LEG_H = 29; // pylon leg height above pile cap (y 2 .. 31)

// ---- materials -----------------------------------------------------------
const pylonConcrete = M.concrete('#cfccc4');
const concrete = M.concrete();
const darkConcrete = M.concrete('#8f9194');
const girderSteel = M.steel('#5d6f80');
const cableMat = M.plastic('#eef1f4');
const anchorSteel = M.steel('#7b8590');
const asphalt = M.concrete('#2b2d31');
const white = M.plastic('#f2f2f2');
const yellow = M.plastic('#f2c230');
const galv = M.brushed('#b8bec6');
const alu = M.aluminium();
const water = { color: '#2f6fa8', metalness: 0, roughness: 0.12, opacity: 0.55, clearcoat: 0.6 };
const rubber = M.rubber();
const iron = M.castIron();

// ---- helpers -------------------------------------------------------------
const r3 = (v) => +v.toFixed(3);
const lerp3 = (a, b, t) => a.map((v, i) => r3(v + (b[i] - v) * t));
const cylX = (x0, x1, y, z, r, mat, seg = 10) => ({
  type: 'cylinder', radius: r, height: r3(x1 - x0), segments: seg,
  rotation: [0, 0, PI / 2], position: [r3((x0 + x1) / 2), y, z], material: mat,
});
const vCyl = (x, z, y0, y1, r, mat, seg = 12) => ({
  type: 'cylinder', radius: r, height: r3(y1 - y0), segments: seg,
  position: [x, r3((y0 + y1) / 2), z], material: mat,
});

/** Cable geometry for one fan: pylon at px, cables going in direction dir (+1 east / -1 west). */
function stayEnds(px, dir) {
  const out = [];
  for (const plane of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      out.push({
        top: [r3(px + dir * 0.6), r3(21 + 1.5 * i), plane * 10.5],
        bot: [r3(px + dir * (3 + 2.5 * i)), 10.0, plane * 9.9],
        i,
      });
    }
  }
  return out;
}
const stayShapes = (px, dir) =>
  stayEnds(px, dir).map(({ top, bot, i }) => ({
    type: 'tube', points: [top, bot], radius: r3(0.075 + 0.008 * i), segments: 2, radialSegments: 8, material: cableMat,
  }));

/** Simple car facing +X; origin at road level under the car centre. */
function carShapes(color) {
  return [
    { type: 'box', size: [4.3, 0.75, 1.8], radius: 0.12, position: [0, 0.65, 0], material: M.paint(color) },
    { type: 'box', size: [2.3, 0.6, 1.6], radius: 0.1, position: [-0.2, 1.3, 0], material: M.glass('#25313d') },
    { type: 'cylinder', radius: 0.34, height: 0.24, segments: 14, rotation: [PI / 2, 0, 0], position: [-1.35, 0.34, 0.82], array: { count: 2, offset: [2.7, 0, 0] }, material: rubber },
    { type: 'cylinder', radius: 0.34, height: 0.24, segments: 14, rotation: [PI / 2, 0, 0], position: [-1.35, 0.34, -0.82], array: { count: 2, offset: [2.7, 0, 0] }, material: rubber },
    { type: 'box', size: [0.05, 0.14, 0.4], position: [2.16, 0.72, -0.6], array: { count: 2, offset: [0, 0, 1.2] }, material: M.light('#fff6d8', 2) },
  ];
}

const lightXs = [-36, -24, -8, 8, 24, 36];
const bearingXs = [-32, -QX, -PX, PX, QX, 32];

// ---- model-level lists ---------------------------------------------------
const stages = [
  { id: 1, name: 'Foundations', text: 'Cofferdams are built in the river, bored piles are drilled deep into rock and massive pile caps are cast on top. Pier and abutment foundations go in on the banks.' },
  { id: 2, name: 'Abutments, piers & approaches', text: 'Abutments and auxiliary piers rise from their foundations. Behind each abutment, reinforced-earth retaining walls and compacted fill build up the approach embankments.' },
  { id: 3, name: 'Pylons', text: 'The concrete pylon legs are cast in 4 m lifts with self-climbing formwork. Cross-beams tie the legs together and steel anchor boxes are embedded in the pylon heads; bearings are set on the cross-beams.' },
  { id: 4, name: 'Balanced cantilever deck & stays', text: 'Deck segments are lifted into place one at a time on each side of each pylon, keeping the pylon balanced. As each segment is bolted on, its pair of stay cables is installed and tensioned, until the two cantilevers meet at mid-span.' },
  { id: 5, name: 'Surfacing & finishes', text: 'Waterproofing and asphalt are laid, expansion joints, barriers, parapets, footpaths, drainage, lighting and cable dampers are installed, and the lanes are marked.' },
  { id: 6, name: 'Load test & opening', text: 'Loaded trucks are parked at measured positions to check deflections against the design, the cable forces are fine-tuned, and the bridge opens to traffic.' },
];

const systems = [
  { id: 'foundations', name: 'Foundations & Ground', color: '#8d6e63' },
  { id: 'substructure', name: 'Substructure', color: '#90a4ae' },
  { id: 'superstructure', name: 'Pylons & Superstructure', color: '#5c7cfa' },
  { id: 'cables', name: 'Cable System', color: '#ffd43b' },
  { id: 'deck', name: 'Deck & Roadway', color: '#495057' },
  { id: 'safety', name: 'Safety & Services', color: '#ff6b6b' },
  { id: 'traffic', name: 'Traffic', color: '#38d9a9' },
];

const parts = [];

// =========================================================================
// FOUNDATIONS & GROUND
// =========================================================================
parts.push({
  id: 'river-water',
  name: 'River',
  system: 'foundations',
  position: [0, 0, 0],
  explode: [0, -0.5, 0],
  ghost: true,
  stage: 1,
  shapes: [{ type: 'box', size: [42, 1.2, 60], position: [0, 0.6, 0], material: water }],
  info: {
    what: 'The river the bridge crosses. Shown see-through so you can see the foundations under the water.',
    location: 'Between the two riverbanks, flowing along the Z direction under the main span.',
    purpose: 'The obstacle the bridge exists to cross. Its width, depth, floods and boat traffic decide how long the main span must be and how high the deck must sit.',
    how: 'Engineers study river levels and flood records to set the deck height above the highest expected flood (plus clearance for boats). They also check how fast water flows around the piers, because fast water can wash away the riverbed (scour).',
    connections: ['pylon-pile-caps', 'pylon-piles', 'riverbanks'],
    examples: 'Navigation channels on rivers like the Thames, Rhine or Hooghly set minimum clearances for ships under bridges.',
    advanced: 'Hydraulic design uses a design flood (often a 100-year return period, Q100, checked against Q200/Q500 for scour). Scour depth at piers is estimated with methods such as HEC-18 (CSU equation) and is typically 1.5–2.5× the pier width; foundations are founded well below it or protected with rip-rap. Pier noses are shaped to reduce the horseshoe vortex, and ship-impact forces (EN 1991-1-7 / AASHTO) may require fenders or protective islands.',
    facts: ['Scour — water digging out soil around foundations — is the most common cause of bridge collapse worldwide.'],
  },
});

parts.push({
  id: 'riverbanks',
  name: 'Riverbanks & Ground',
  system: 'foundations',
  position: [0, 0, 0],
  explode: [0, -1, 0],
  ghost: true,
  stage: 1,
  shapes: [
    { type: 'box', size: [20, 2, 60], position: [-31, 1, 0], material: M.soil() },
    { type: 'box', size: [20, 2, 60], position: [31, 1, 0], material: M.soil() },
  ],
  info: {
    what: 'The natural ground on each side of the river — layers of soil, sand and clay sitting on rock.',
    location: 'Both banks, from the water\'s edge outwards. Shown see-through so the buried foundations are visible.',
    purpose: 'Supports the abutments, auxiliary piers and approach embankments, and ultimately receives all of the bridge\'s load.',
    how: 'Boreholes and soil tests before design tell engineers how strong each layer is. Weak upper soils are bypassed with piles that reach the stronger ground or rock below.',
    connections: ['abutment-west', 'abutment-east', 'pier-foundations', 'approach-embankments'],
    examples: 'Riverbanks are often soft alluvial deposits (silt, sand, clay) laid down by floods — which is why most river bridges stand on piles.',
    advanced: 'Ground investigation: boreholes with SPT N-values, CPTs and rock coring (RQD, UCS). Alluvium may have undrained shear strength cu of only 20–50 kPa, so embankment loads cause consolidation settlement that is often accelerated with wick drains and surcharging before the approach is paved. Bank slope stability (Bishop method, FoS ≥ 1.3–1.5) is checked for rapid drawdown after floods.',
    facts: ['Riverbank soils can settle for years after an embankment is built on them, which is why approach slabs are used.'],
  },
});

parts.push({
  id: 'pylon-piles',
  name: 'Pylon Bored Piles',
  system: 'foundations',
  position: [0, 0, 0],
  explode: [0, -4, 0],
  stage: 1,
  shapes: [-PX, PX].flatMap((px) =>
    [-2.6, 0, 2.6].map((dx) => ({
      type: 'cylinder', radius: 0.6, height: 0.8, segments: 14, position: [px + dx, 0.4, -10.5],
      array: { count: 6, offset: [0, 0, 4.2] }, material: darkConcrete,
    })),
  ),
  info: {
    what: 'Large-diameter reinforced-concrete columns drilled deep into the riverbed under each pylon — 18 per pylon here.',
    location: 'Under the pylon pile caps, beneath the river. Only the top 0.8 m is drawn; real piles go tens of metres down to rock.',
    purpose: 'The pylons carry almost the entire weight of the deck through the stay cables. Piles take that huge force down through soft river sediment to strong rock.',
    how: 'A steel casing is driven into the riverbed, soil is drilled out from inside, a steel reinforcement cage is lowered in and concrete is poured from the bottom up through a pipe (tremie), pushing the water out. The pile then resists load by friction along its sides and bearing at its tip.',
    connections: ['pylon-pile-caps', 'river-water', 'pylon-west', 'pylon-east'],
    examples: 'The Rion–Antirion bridge in Greece and Mumbai\'s Bandra–Worli Sea Link both stand on large bored piles or caissons in water.',
    advanced: '1.2 m Ø bored cast-in-situ piles, C35/45 concrete placed by tremie, socketed 3–5 m into rock. Each pylon carries roughly the sum of the vertical stay components plus self-weight (here on the order of 40–60 MN), shared by 18 piles → ~3 MN per pile plus moments from wind and braking, which put the outer rows into higher compression or even tension. Pile groups are checked for block failure, negative skin friction, scour (piles must still work with the top several metres of riverbed washed away) and lateral load (p-y curves). Cross-hole sonic logging verifies concrete integrity.',
    facts: ['Concrete for underwater piles is poured through a pipe kept buried in fresh concrete, so it never mixes with the water.'],
  },
});

parts.push({
  id: 'pylon-pile-caps',
  name: 'Pylon Pile Caps',
  system: 'foundations',
  position: [0, 0, 0],
  explode: [0, -2.5, 0],
  stage: 1,
  shapes: [-PX, PX].map((px) => ({ type: 'box', size: [8, 1.2, 26], position: [px, 1.4, 0], material: concrete })),
  info: {
    what: 'Thick blocks of reinforced concrete that join the tops of all the piles under each pylon.',
    location: 'At water level, directly under each pylon, on top of the pile group.',
    purpose: 'Spreads the pylon\'s enormous load evenly into all 18 piles and makes them act together as one stiff foundation. Also protects the pylon base from floating debris and boats.',
    how: 'A watertight box (cofferdam) is built around the pile heads, water is pumped out, a concrete seal is placed, then a dense cage of steel reinforcement is fixed and the cap is poured — often in several layers to control heat.',
    connections: ['pylon-piles', 'pylon-west', 'pylon-east', 'river-water'],
    examples: 'Every large river bridge pier has one; on sea bridges they are often precast on shore and floated out.',
    advanced: 'Shown 1.2 m thick for clarity; real caps for this size are typically 3–4 m deep. Designed by strut-and-tie method: compressive struts run from the pylon legs down to each pile head, balanced by heavy bottom tension reinforcement (often 32–40 mm bars in multiple layers). Mass concrete pours need thermal control (low-heat cement, GGBS/fly ash, cooling pipes) to keep the core-to-surface temperature difference below ~20 °C and avoid early thermal cracking.',
    facts: ['Big pile caps can contain thousands of cubic metres of concrete poured continuously over more than a day.'],
  },
});

parts.push({
  id: 'pier-foundations',
  name: 'Auxiliary Pier Foundations',
  system: 'foundations',
  position: [0, 0, 0],
  explode: [0, -3, 0],
  stage: 1,
  shapes: [-QX, QX].flatMap((qx) => [
    { type: 'box', size: [4, 1, 16], position: [qx, 1.5, 0], material: concrete },
    { type: 'cylinder', radius: 0.45, height: 1, segments: 12, position: [qx - 1.2, 0.5, -6], array: { count: 4, offset: [0, 0, 4] }, material: darkConcrete },
    { type: 'cylinder', radius: 0.45, height: 1, segments: 12, position: [qx + 1.2, 0.5, -6], array: { count: 4, offset: [0, 0, 4] }, material: darkConcrete },
  ]),
  info: {
    what: 'A pile cap on 8 piles under each auxiliary (side-span) pier, buried in the riverbank.',
    location: 'On both banks, 8.5 m outward from each pylon, under the auxiliary piers.',
    purpose: 'Carries the load of the auxiliary pier — which can push down or pull up — into the ground.',
    how: 'Same process as the pylon foundations but on dry land: piles are bored, cut down to level, and a reinforced cap is cast over them.',
    connections: ['aux-piers', 'riverbanks'],
    examples: 'Side-span piers are common on cable-stayed bridges, e.g. the Pont de Normandie and Stonecutters Bridge.',
    advanced: 'Because back-stay cables anchor the deck near these piers, live load on the main span can lift the side span, so the auxiliary pier and its piles may see uplift (tension). Piles are then designed for tension capacity (shaft friction only, with reduced factors) and the bearings above may need hold-down anchors or the deck needs counterweight ballast.',
    facts: ['Some cable-stayed bridges fill side-span deck boxes with concrete ballast to stop them lifting.'],
  },
});

// =========================================================================
// SUBSTRUCTURE
// =========================================================================
for (const [side, sx] of [['west', -1], ['east', 1]]) {
  parts.push({
    id: `abutment-${side}`,
    name: `Abutment (${side === 'west' ? 'West' : 'East'})`,
    system: 'substructure',
    position: [sx * 32.6, 0, 0],
    explode: [sx * 3, -0.5, 0],
    stage: 2,
    shapes: [
      { type: 'box', size: [4, 1, 22], position: [sx * 0.4, 1.5, 0], material: concrete },
      { type: 'box', size: [1.4, 6.2, 21], position: [-sx * 0.3, 5.1, 0], material: concrete },
      { type: 'box', size: [0.4, 1.75, 21], position: [sx * 0.2, 9.075, 0], material: concrete },
      { type: 'box', size: [1.4, 0.15, 21], position: [-sx * 0.3, 8.125, 0], material: darkConcrete },
    ],
    info: {
      what: `The end support of the bridge on the ${side} bank — a concrete wall that holds up the deck end and retains the earth behind it.`,
      location: `At the ${side} end of the deck (x ≈ ${sx * 32.6} m), where the bridge meets the approach embankment.`,
      purpose: 'Supports the end of the deck on bearings, holds back the soil of the approach road, and provides the gap where the deck can expand and contract.',
      how: 'A footing spreads load into the ground; the stem wall rises to a bearing shelf where the deck sits on bearings. A short ballast (back) wall at the top retains the road fill and forms one side of the expansion joint.',
      connections: ['bearings', 'expansion-joints', 'approach-embankments', 'approach-slabs', 'riverbanks'],
      examples: 'Every beam or cable-stayed bridge has abutments at its ends; on many motorway bridges they are hidden behind sloping embankments.',
      advanced: 'The abutment carries vertical deck reaction plus horizontal earth pressure (at-rest K0 ≈ 1 − sin φ\' ≈ 0.5, increased by compaction and traffic surcharge ~10–20 kPa) and braking/thermal forces from the bearings. Checks: sliding, overturning, bearing pressure and pile capacity. The bearing shelf is sized for minimum seat length (e.g. AASHTO N = 200 + 0.0017L + 0.0067H mm) to prevent unseating in earthquakes. Drainage weep holes and granular backfill prevent water pressure build-up.',
      facts: ['On a cable-stayed bridge the end supports often have to hold the deck down, not just hold it up.'],
    },
  });
}

parts.push({
  id: 'approach-embankments',
  name: 'Approach Embankments',
  system: 'substructure',
  position: [0, 0, 0],
  explode: [0, -1, 0],
  stage: 2,
  shapes: [-37, 37].map((x) => ({ type: 'box', size: [8, 7.6, 20.8], position: [x, 5.8, 0], material: M.soil() })),
  info: {
    what: 'Ramps of compacted earth fill that lift the road from ground level up to the height of the bridge deck.',
    location: 'Behind both abutments, from x = ±33 m outward.',
    purpose: 'Provides a cheap, solid road approach so the expensive bridge structure only needs to span the river itself.',
    how: 'Selected granular soil is spread in 200–300 mm layers and each layer is rolled until dense. Testing each layer ensures it will not settle later under traffic.',
    connections: ['retaining-walls', 'approach-slabs', 'abutment-west', 'abutment-east'],
    examples: 'Most highway bridges have earth approaches — look for the grassy or walled ramps leading up to them.',
    advanced: 'Fill compacted to ≥95–97% of maximum dry density (modified Proctor), with tighter control and free-draining granular material within ~1.5× the abutment height behind the wall. Total and differential settlement of embankments on soft alluvium can reach hundreds of mm; ground improvement (prefabricated vertical drains, stone columns) and surcharge preloading are used to reduce post-construction settlement to < 25–50 mm and avoid the "bump at the end of the bridge".',
    facts: ['The "bump" you feel driving onto many bridges is usually caused by the embankment settling, not the bridge.'],
  },
});

parts.push({
  id: 'retaining-walls',
  name: 'Reinforced-Earth Retaining Walls',
  system: 'substructure',
  position: [0, 0, 0],
  explode: [0, -1, 0],
  stage: 2,
  shapes: [-37, 37].flatMap((x) =>
    [-10.6, 10.6].flatMap((z) => [
      { type: 'box', size: [8, 7.6, 0.3], position: [x, 5.8, z], material: M.concrete('#bdbab2') },
      { type: 'box', size: [8, 0.3, 0.5], position: [x, 9.75, z], material: concrete },
      { type: 'box', size: [0.05, 7.6, 0.34], position: [x - 3.2, 5.8, z], array: { count: 5, offset: [1.6, 0, 0] }, material: darkConcrete },
      { type: 'box', size: [8, 0.05, 0.34], position: [x, 3.6, z], array: { count: 3, offset: [0, 2, 0] }, material: darkConcrete },
    ]),
  ),
  info: {
    what: 'Vertical walls of precast concrete panels that hold the sides of the approach embankments, instead of letting the earth slope out.',
    location: 'Along both sides of both approach embankments.',
    purpose: 'Saves land: a vertical wall takes far less space than a sloping earth bank, which matters in towns and next to rivers.',
    how: 'Panels are stood up row by row while fill is placed behind them. Steel or polymer strips attached to the back of each panel are buried in the compacted fill; friction between the strips and the soil holds the panels in place, turning the fill into a stable "reinforced earth" block.',
    connections: ['approach-embankments', 'abutment-west', 'abutment-east'],
    examples: 'Reinforced-earth walls (the cross-shaped or square panel pattern) are on almost every modern flyover and highway ramp.',
    advanced: 'Mechanically stabilised earth (MSE) walls, invented by Henri Vidal (Terre Armée, 1960s). Design checks external stability (sliding, overturning, bearing) and internal stability: each reinforcement layer must resist the tension T = K·σv·Sv·Sh without rupture (with corrosion allowance for galvanised steel strips) or pull-out (frictional resistance beyond the active Rankine/coherent-gravity failure surface). Reinforcement length is typically ≥ 0.7 H. The 1.6 m × 1.5 m panel joints shown are open-jointed with geotextile behind to let water out but keep fill in.',
    facts: ['Reinforced earth walls flex slightly, so they cope with settlement far better than rigid concrete walls.'],
  },
});

parts.push({
  id: 'aux-piers',
  name: 'Auxiliary Piers',
  system: 'substructure',
  position: [0, 0, 0],
  explode: [0, -1.5, 0],
  stage: 2,
  shapes: [-QX, QX].flatMap((qx) => [
    vCyl(qx, -5.5, 2, 7.6, 0.8, concrete, 24),
    vCyl(qx, 5.5, 2, 7.6, 0.8, concrete, 24),
    { type: 'box', size: [2, 0.6, 20.4], position: [qx, 7.9, 0], material: concrete },
  ]),
  info: {
    what: 'Intermediate concrete supports in each side span, made of two round columns and a cross-head beam.',
    location: 'On both riverbanks, between each pylon and the abutment (x = ±24.5 m).',
    purpose: 'Stiffen the side spans. They hold the deck where the back-stay cables pull, so the pylon top cannot swing towards the main span when heavy traffic is on it.',
    how: 'The columns carry deck load down to the pier foundation. Because the back stays are effectively "anchored" through the deck to these piers, the whole system becomes much stiffer — the main span deflects far less under traffic.',
    connections: ['pier-foundations', 'bearings', 'edge-girders', 'stays-west-back', 'stays-east-back'],
    examples: 'Seen on the Pont de Normandie (France) and the Øresund Bridge approaches.',
    advanced: 'Without auxiliary piers the pylon-top horizontal displacement is governed by the bending stiffness of a long side-span deck; with them, the back stays act almost like rigid ties, reducing main-span live-load deflection by often 30–50% and lowering pylon moments. The pier reaction alternates between compression and uplift depending on load pattern, so the bearings may be tension (uplift-restraint) bearings or the side span is ballasted.',
    facts: ['A small pier in the side span can make a long main span dramatically stiffer.'],
  },
});

parts.push({
  id: 'bearings',
  name: 'Pot Bearings',
  system: 'substructure',
  position: [0, 0, 0],
  explode: [0, 1.5, 0],
  stage: 3,
  shapes: bearingXs.flatMap((x) =>
    [-9.2, 9.2].flatMap((z) => [
      { type: 'cylinder', radius: 0.45, height: 0.2, segments: 16, position: [x, 8.3, z], material: M.steel('#9aa3ad') },
      { type: 'box', size: [1, 0.1, 1], position: [x, 8.45, z], material: M.metal('#c9ced4') },
    ]),
  ),
  info: {
    what: 'Steel-and-rubber "cushions" on which the deck rests at every support — 12 in total.',
    location: 'Between the deck edge girders and the support below: on the abutments, the auxiliary piers and the pylon lower cross-beams.',
    purpose: 'Pass the deck\'s weight to the supports while letting it slide and rotate slightly as it expands in heat, shrinks in cold and bends under traffic.',
    how: 'A pot bearing has a steel pot holding a disc of rubber that behaves like a fluid under pressure, allowing small rotations. On top, a polished stainless-steel plate slides on a low-friction PTFE (Teflon) pad so the deck can move lengthways. Some bearings are fixed, some slide in one direction, some in all directions.',
    connections: ['edge-girders', 'abutment-west', 'abutment-east', 'aux-piers', 'pylon-west', 'pylon-east', 'expansion-joints'],
    examples: 'Look under any concrete flyover: the deck sits on small square pads or steel bearings on top of each pier.',
    advanced: 'Thermal movement ΔL = α·ΔT·L. With the deck fixed longitudinally at one pylon, the far abutment is ~48 m away: steel α = 12×10⁻⁶ /°C, ΔT ≈ 60 °C → ΔL ≈ 35 mm, plus creep/shrinkage of the concrete slab. PTFE on stainless steel friction μ ≈ 0.03–0.06 at low temperature (EN 1337-2), so a sliding bearing still transmits a small horizontal force. The elastomer in the pot (EN 1337-5) is at ~ 35–60 MPa contact pressure and permits rotations of ~0.01 rad. Bearings must be replaceable, so jacking points are provided on the cross-beams.',
    facts: ['A bridge "breathes": a 1 km steel deck can change length by around half a metre between winter and summer.'],
  },
});

// =========================================================================
// PYLONS & SUPERSTRUCTURE
// =========================================================================
const legOutline = [[-1.3, 0], [1.3, 0], [0.8, LEG_H], [-0.8, LEG_H]];
for (const [side, sx] of [['west', -1], ['east', 1]]) {
  parts.push({
    id: `pylon-${side}`,
    name: `Pylon (${side === 'west' ? 'West' : 'East'})`,
    system: 'superstructure',
    position: [sx * PX, 0, 0],
    explode: [sx * 4, 0, 0],
    stage: 3,
    shapes: [
      { type: 'extrude', outline: legOutline, depth: 1.6, position: [0, 2, -LEG_Z], material: pylonConcrete },
      { type: 'extrude', outline: legOutline, depth: 1.6, position: [0, 2, LEG_Z], material: pylonConcrete },
      { type: 'box', size: [2.4, 1.2, 23.6], position: [0, 7.6, 0], material: pylonConcrete },
      { type: 'box', size: [1.6, 1.6, 22], position: [0, 29.6, 0], material: pylonConcrete },
      { type: 'box', size: [1.8, 0.3, 1.8], position: [0, 31.15, -LEG_Z], material: darkConcrete },
      { type: 'box', size: [1.8, 0.3, 1.8], position: [0, 31.15, LEG_Z], material: darkConcrete },
    ],
    info: {
      what: `The ${side} tower of the bridge: an H-shaped concrete frame 29 m tall with two legs, a lower cross-beam under the deck and an upper cross-beam at the top.`,
      location: `Standing on its pile cap in the river at x = ${sx * PX} m. The legs rise on either side of the deck, outside the traffic lanes.`,
      purpose: 'Holds up the stay cables, which in turn hold up the deck. It collects the weight of the deck and traffic and sends it straight down into the foundations.',
      how: 'Each cable pulls the pylon top down and sideways. Cables on the main-span side and the back-span side pull in opposite directions, so their sideways pulls cancel and what remains is a large downward squeeze (compression) — which concrete handles very well. The lower cross-beam also carries the deck directly on bearings.',
      connections: ['pylon-pile-caps', `stays-${side}-main`, `stays-${side}-back`, 'pylon-anchorages', 'bearings', 'aviation-lights'],
      examples: 'H-shaped pylons: Pont de Normandie (inverted Y), Vidyasagar Setu in Kolkata (H-ish), Øresund Bridge (twin columns). A-shaped: Sunshine Skyway (single), Millau (inverted Y).',
      advanced: 'C50/60 high-strength concrete, slip- or jump-formed in ~4 m lifts. Axial force ≈ Σ T_i·sin θ_i (main + back stays) plus self-weight; unbalanced live load produces leg bending, amplified by P-Δ second-order effects, so the pylon is checked for buckling with geometric non-linearity. Out-of-plane, the H-frame acts as a portal: transverse wind on the cables and pylon is resisted by frame action through the cross-beams. The legs taper from 2.6 m to 1.6 m because axial force and moment reduce towards the top. Construction-stage checks are critical: during balanced cantilevering, a missing segment on one side creates large unbalanced moments.',
      facts: ['The pylons of Russia\'s Russky Bridge stand 320 m tall — taller than the Eiffel Tower\'s original height.', 'Concrete is excellent in compression, which is why most modern pylons are concrete rather than steel.'],
    },
  });
}

parts.push({
  id: 'edge-girders',
  name: 'Steel Edge Box Girders',
  system: 'superstructure',
  position: [0, 0, 0],
  explode: [0, 3.5, 0],
  stage: 4,
  shapes: [-9.2, 9.2].flatMap((z) => [
    { type: 'box', size: [2 * AX, 1.2, 1.2], position: [0, 9.1, z], material: girderSteel },
    { type: 'box', size: [2 * AX, 0.04, 1.5], position: [0, GB + 0.02, z], material: girderSteel },
  ]),
  info: {
    what: 'Two long steel box beams running the full length of the bridge, one along each edge of the deck.',
    location: 'Under each side of the deck slab, directly in line with the cable planes, sitting on the bearings.',
    purpose: 'The backbone of the deck. They receive the stay cable forces, carry the deck between cable anchor points and transfer loads to the bearings.',
    how: 'Each stay pulls up on the girder every 2.5 m. Between these points the girder works like a continuous beam on many elastic supports, so it only needs to be shallow. The horizontal part of every cable force squeezes the girder lengthways, so near the pylons it is in strong compression.',
    connections: ['cross-girders', 'deck-slab', 'deck-anchorages', 'bearings', 'aux-piers'],
    examples: 'Edge-girder (twin girder) decks are used on the Rama VIII Bridge (Bangkok) and many medium-span cable-stayed bridges.',
    advanced: 'S355/S460 steel boxes, about 1.2 m deep — a span-to-depth ratio of ~27 for the 32 m main span (cable-stayed decks commonly reach 1/100 to 1/300 of span on long bridges). Design actions: global axial compression from stay horizontal components (accumulating towards the pylon, N = Σ T_i cos θ_i), local bending between stays, and torsion from eccentric traffic. The deck is analysed as a beam on elastic supports with stay stiffness k = E·A·sin²θ/L. Plates are stiffened against local buckling (EN 1993-1-5), and fatigue details at anchor brackets are checked against stress ranges from live load (EN 1993-1-9).',
    facts: ['Because stays support the deck every few metres, cable-stayed decks can be remarkably slim for their span.'],
  },
});

parts.push({
  id: 'cross-girders',
  name: 'Cross Girders',
  system: 'superstructure',
  position: [0, 0, 0],
  explode: [0, 3, 0],
  stage: 4,
  shapes: [{ type: 'box', size: [0.4, 1.0, 17.2], position: [-32, 9.2, 0], array: { count: 17, offset: [4, 0, 0] }, material: M.steel('#6c7c8b') }],
  info: {
    what: 'Steel beams spanning across the bridge between the two edge girders, every 4 m.',
    location: 'Under the deck slab, perpendicular to the road, connecting the left and right edge girders.',
    purpose: 'Support the concrete deck slab across the width of the bridge and carry wheel loads out to the edge girders and cables.',
    how: 'A truck\'s weight goes into the slab, the slab spans between cross girders, and each cross girder carries its share sideways to the two edge girders where the cables hold it up. They also tie the edge girders together so the deck acts as one unit.',
    connections: ['edge-girders', 'deck-slab', 'drainage-scuppers'],
    examples: 'A ladder-deck: the edge girders are the rails, the cross girders are the rungs.',
    advanced: '1.0 m deep welded I-section cross girders at 4 m centres span ~18.4 m between edge girders. They act compositely with the slab via shear studs (19 mm Ø headed studs, EN 1994-2). Design moment M ≈ wL²/8 for slab + surfacing dead load plus concentrated tandem axle loads (e.g. Eurocode LM1: 300 kN axles in lane 1). The open ladder arrangement has low torsional stiffness, which is acceptable here because the two cable planes provide torsional restraint.',
    facts: ['Cross girders are often bolted to the edge girders on site, so deck segments can be delivered in pieces.'],
  },
});

parts.push({
  id: 'deck-slab',
  name: 'Concrete Deck Slab',
  system: 'deck',
  position: [0, 0, 0],
  explode: [0, 5, 0],
  stage: 4,
  shapes: [{ type: 'box', size: [2 * AX, 0.25, 20], position: [0, r3((GT + ST) / 2), 0], material: M.concrete('#b9bbbe') }],
  info: {
    what: 'A 250 mm-thick reinforced-concrete slab that forms the floor of the bridge.',
    location: 'On top of the cross girders and edge girders, spanning the full 20 m width of the deck.',
    purpose: 'Provides the surface that carries traffic and footpaths, and acts together with the steel girders to make a stiff composite deck.',
    how: 'Precast concrete panels are laid on the steel girders and joined with concrete poured in place over steel shear studs, locking slab and steel together. Wheel loads bend the slab between cross girders, and the slab passes them on.',
    connections: ['cross-girders', 'edge-girders', 'asphalt-surfacing', 'footpaths', 'drainage-scuppers'],
    examples: 'Steel–concrete composite decks are used on bridges like the Øresund and the Second Hooghly (Vidyasagar Setu).',
    advanced: 'C40/50 concrete with top and bottom mesh (e.g. 16 mm @ 150 mm) and 40–50 mm cover, waterproofed before surfacing to protect against de-icing salts. The slab also participates in global axial compression from the stays, which is beneficial (it closes cracks), but long-term creep and shrinkage transfer force from the concrete to the steel over time, changing cable forces — engineers allow for this in the cable tensioning plan. Deck self-weight is around 6 kN/m² plus ~2 kN/m² surfacing.',
    facts: ['The concrete slab is heavy, but that weight helps damp out wind-induced vibrations.'],
  },
});

// =========================================================================
// CABLE SYSTEM
// =========================================================================
const stayInfo = (side, which) => {
  const main = which === 'main';
  return {
    what: `Twelve high-strength steel stay cables (six in each of the two cable planes) running from the ${side} pylon to the ${main ? 'main span' : 'side (back) span'} of the deck.`,
    location: `Between the top of the ${side} pylon and the deck, on the ${main ? 'river (main-span) side' : 'bank (side-span) side'}.`,
    purpose: main
      ? 'Hold up the main span over the river. Each cable carries the weight of about 2.5 m of deck plus the traffic on it, back up to the pylon.'
      : 'Balance the main-span cables. They pull the pylon top back towards the bank, so the pylon is squeezed straight down instead of being bent towards the river.',
    how: main
      ? 'The deck wants to sag; each cable is tensioned so it pulls the deck up at its anchor point. The cable force splits into an upward part (holding the deck) and a horizontal part (squeezing the deck towards the pylon). Shallower, longer cables need more tension for the same lift.'
      : 'They are anchored into the side span near the auxiliary pier. When a truck is in the middle of the river span, the pylon wants to lean forward; the back stays resist this, with the side span and pier acting as an anchor.',
    connections: [`pylon-${side}`, 'pylon-anchorages', 'deck-anchorages', 'edge-girders', 'cable-dampers', ...(main ? [] : ['aux-piers'])],
    examples: 'This "semi-fan" layout (anchors spread over the top part of the pylon) is used on most modern cable-stayed bridges, e.g. the Pont de Normandie and the Bandra–Worli Sea Link.',
    advanced: 'Parallel-strand stays: bundles of 15.7 mm 7-wire strands (UTS 1860 MPa), each strand individually galvanised, waxed and PE-coated, inside an HDPE outer sheath with a helical fillet to suppress rain–wind vibration. Tension T = V / sin θ: the flattest cable here (θ ≈ 37°) needs ~1.7× the tension of a vertical hanger for the same vertical load. Design stress under SLS is limited to ~45% UTS (fib / PTI DC45.1 / EN 1993-1-11), fatigue tested to 2 million cycles at Δσ ≈ 200 MPa. Strands are stressed one by one with mono-strand jacks using the "isotension" method so every strand ends with equal force; cable forces are tuned at the end of construction to achieve the target deck profile. Cable sag reduces the effective stiffness: Ernst modulus E_eq = E / (1 + (γL_h)²E/(12σ³)).',
    facts: main
      ? ['Each strand can be removed and replaced individually without closing the bridge.', 'A 1104 m main span is held up entirely by stays on Russia\'s Russky Bridge.']
      : ['Back stays are often the most heavily loaded cables on a cable-stayed bridge.'],
  };
};

for (const [side, sx] of [['west', -1], ['east', 1]]) {
  for (const which of ['main', 'back']) {
    const dir = which === 'main' ? -sx : sx;
    parts.push({
      id: `stays-${side}-${which}`,
      name: `Stay Cables – ${side === 'west' ? 'West' : 'East'} ${which === 'main' ? 'Main Span' : 'Back Span'}`,
      system: 'cables',
      position: [0, 0, 0],
      explode: [sx * (which === 'main' ? 1 : 5), 7, 0],
      stage: 4,
      shapes: stayShapes(sx * PX, dir),
      info: stayInfo(side, which),
    });
  }
}

parts.push({
  id: 'pylon-anchorages',
  name: 'Pylon Cable Anchorages',
  system: 'cables',
  position: [0, 0, 0],
  explode: [0, 6, 0],
  stage: 3,
  shapes: [-PX, PX].flatMap((px) =>
    [-1, 1].flatMap((pl) => [
      { type: 'box', size: [1.3, 8.4, 0.25], position: [px, 24.75, pl * 10.27], material: anchorSteel },
      { type: 'cylinder', radius: 0.17, height: 0.35, segments: 10, rotation: [PI / 2, 0, 0], position: [px - 0.45, 21, pl * 10.05], array: { count: 6, offset: [0, 1.5, 0] }, material: M.steel('#9aa3ad') },
      { type: 'cylinder', radius: 0.17, height: 0.35, segments: 10, rotation: [PI / 2, 0, 0], position: [px + 0.45, 21, pl * 10.05], array: { count: 6, offset: [0, 1.5, 0] }, material: M.steel('#9aa3ad') },
    ]),
  ),
  info: {
    what: 'Steel anchor boxes built into the top of each pylon leg, where the upper ends of the stay cables are fixed.',
    location: 'On the inner faces of the pylon legs, from about 21 m to 29 m high.',
    purpose: 'Safely transfer each cable\'s huge pulling force into the concrete pylon, and give access for tensioning and inspecting the cables.',
    how: 'Each cable passes through a steel guide tube and ends in an anchor head — a thick steel block with wedges that grip every strand. The anchor bears on the steel box, which is bolted and welded to studs cast into the concrete, spreading the force into the pylon.',
    connections: ['pylon-west', 'pylon-east', 'stays-west-main', 'stays-west-back', 'stays-east-main', 'stays-east-back'],
    examples: 'Steel anchor boxes are used on the Stonecutters and Sutong bridges; some bridges instead loop cables over a saddle at the top.',
    advanced: 'The steel anchor box takes the horizontal components of opposing main- and back-span cables in tension, so the concrete does not have to; the vertical components go into the concrete via headed shear studs. Anchor heads use 3-part wedges on each strand with an anti-vandal cap filled with wax or grease. Anchorage zones are checked for bursting/splitting forces and for fatigue of the welds. Cable entry points have neoprene/elastomeric guides to stop bending fatigue at the anchor ("socket bending").',
    facts: ['Workers inside the pylon head can re-tension individual strands decades after the bridge opens.'],
  },
});

parts.push({
  id: 'deck-anchorages',
  name: 'Deck Cable Anchorages',
  system: 'cables',
  position: [0, 0, 0],
  explode: [0, 5.5, 0],
  stage: 4,
  shapes: [[-PX, 1], [-PX, -1], [PX, 1], [PX, -1]].flatMap(([px, dir]) =>
    [-1, 1].map((pl) => ({
      type: 'box', size: [0.6, 0.5, 0.3], position: [px + dir * 3, 9.85, pl * 9.95],
      array: { count: 6, offset: [dir * 2.5, 0, 0] }, material: anchorSteel,
    })),
  ),
  info: {
    what: 'Steel brackets on the outside of the edge girders where the lower ends of the cables are anchored — 48 in total.',
    location: 'Along both edges of the deck, every 2.5 m, either side of each pylon.',
    purpose: 'Connect the cables to the deck so each cable can lift its share of the deck, and provide the point where cables are tensioned.',
    how: 'The cable end passes through a steel tube welded to the girder and is locked by an anchor head with wedges. The bracket transfers the cable pull into the girder webs. Jacks pull the strands from here to set the force.',
    connections: ['edge-girders', 'stays-west-main', 'stays-west-back', 'stays-east-main', 'stays-east-back', 'cable-dampers'],
    examples: 'Anchor brackets are visible along the edges of most cable-stayed decks, often painted to match the girders.',
    advanced: 'Typical details are an anchor plate on a steel tube welded into the edge girder web with stiffeners, or "anchor pipe" details through the web. These are fatigue-critical: each passing truck changes the cable force by a few percent. Details are checked to EN 1993-1-9 categories and often fatigue-tested at full scale. Spacing of 2.5 m here is short; long-span bridges use 8–20 m along the deck.',
    facts: ['Cable forces are measured by vibrating the cable and timing its natural frequency, like tuning a guitar string.'],
  },
});

// Dampers on the three longest cables of every fan, near the deck anchor
const damperShapes = [];
for (const [px, dir] of [[-PX, 1], [-PX, -1], [PX, 1], [PX, -1]]) {
  for (const { top, bot, i } of stayEnds(px, dir)) {
    if (i < 3) continue;
    damperShapes.push({ type: 'tube', points: [lerp3(top, bot, 0.9), lerp3(top, bot, 0.965)], radius: 0.17, segments: 2, radialSegments: 10, material: M.steel('#8a96a3') });
  }
}
parts.push({
  id: 'cable-dampers',
  name: 'Cable Dampers',
  system: 'cables',
  position: [0, 0, 0],
  explode: [0, 6.5, 0],
  stage: 5,
  shapes: damperShapes,
  info: {
    what: 'Short, thicker tubes around the lower ends of the longest cables containing shock absorbers.',
    location: 'On the three longest cables of each fan, a couple of metres above the deck anchorages.',
    purpose: 'Stop the cables from vibrating violently in wind and rain. Without them, long cables can swing by a metre or more.',
    how: 'Like a car shock absorber, the damper turns the energy of cable movement into heat. Even a small amount of damping near the end of a long cable dramatically reduces vibration.',
    connections: ['stays-west-main', 'stays-west-back', 'stays-east-main', 'stays-east-back', 'deck-anchorages'],
    examples: 'Internal or external dampers are fitted to the cables of almost all major cable-stayed bridges, e.g. the Sutong Bridge in China.',
    advanced: 'Stay cables have very low inherent damping (logarithmic decrement ~0.1–0.5%), so they are prone to rain–wind induced vibration, vortex shedding, galloping of iced cables and parametric excitation from deck motion. Viscous or friction dampers placed at a distance a ≈ 2–5% of cable length from the anchor give maximum added damping ζ_max ≈ a/(2L) (Pacheco universal damping curve). Guidance (PTI, fib) targets a Scruton number Sc = mζ/(ρD²) > 10, with the helical fillet on the HDPE sheath further breaking up water rivulets that cause rain–wind vibration.',
    facts: ['Rain trickling down a cable can form a rivulet that changes its shape enough to make it "gallop" in the wind.'],
  },
});

// =========================================================================
// DECK & ROADWAY
// =========================================================================
parts.push({
  id: 'asphalt-surfacing',
  name: 'Asphalt Surfacing & Waterproofing',
  system: 'deck',
  position: [0, 0, 0],
  explode: [0, 6.5, 0],
  stage: 5,
  shapes: [
    { type: 'box', size: [2 * AX, 0.08, 15], position: [0, r3((ST + RT) / 2), 0], material: asphalt },
    { type: 'box', size: [8, 0.08, 15], position: [-37, r3((ST + RT) / 2), 0], material: asphalt },
    { type: 'box', size: [8, 0.08, 15], position: [37, r3((ST + RT) / 2), 0], material: asphalt },
  ],
  info: {
    what: 'The black road surface vehicles drive on — a thin layer of asphalt over a waterproof membrane.',
    location: 'On top of the deck slab, across the carriageway between the crash barriers, continuing onto the approaches.',
    purpose: 'Gives a smooth, skid-resistant, quiet driving surface and protects the concrete slab from water and de-icing salt.',
    how: 'A waterproofing membrane is bonded to the slab first. Then hot asphalt is spread and rolled. The road surface is gently sloped (crossfall) so rainwater runs to the edges and into the drains.',
    connections: ['deck-slab', 'lane-markings', 'expansion-joints', 'drainage-scuppers', 'crash-barriers'],
    examples: 'On steel orthotropic decks a special mastic asphalt is used because the steel flexes more than concrete.',
    advanced: 'Typical build-up: sprayed or sheet waterproofing membrane (~5 mm), 35 mm protective layer and 40–45 mm wearing course — ~80 mm total, adding ~1.9 kN/m² of dead load (designers often allow for a future overlay, i.e. a "surfacing allowance" of +40%). Polymer-modified bitumen (e.g. PMB 45/80 or PG 76-22) resists rutting under heavy, slow traffic on bridge decks. Crossfall is 2.5% to the edges.',
    facts: ['Resurfacing a bridge must be done carefully — extra asphalt layers add weight the bridge was not designed for.'],
  },
});

parts.push({
  id: 'lane-markings',
  name: 'Lane Markings',
  system: 'deck',
  position: [0, 0, 0],
  explode: [0, 7.5, 0],
  stage: 5,
  shapes: [
    { type: 'box', size: [3, 0.012, 0.15], position: [-39, RT + 0.006, -3.6], array: { count: 14, offset: [6, 0, 0] }, material: white },
    { type: 'box', size: [3, 0.012, 0.15], position: [-39, RT + 0.006, 3.6], array: { count: 14, offset: [6, 0, 0] }, material: white },
    { type: 'box', size: [81, 0.012, 0.2], position: [0, RT + 0.006, -7.0], material: white },
    { type: 'box', size: [81, 0.012, 0.2], position: [0, RT + 0.006, 7.0], material: white },
    { type: 'box', size: [81, 0.012, 0.12], position: [0, RT + 0.006, -0.13], material: yellow },
    { type: 'box', size: [81, 0.012, 0.12], position: [0, RT + 0.006, 0.13], material: yellow },
  ],
  info: {
    what: 'Painted lines on the road: dashed white lane lines, solid white edge lines and a double yellow centre line.',
    location: 'On the asphalt surface along the whole bridge and approaches.',
    purpose: 'Guide drivers into lanes, separate the two directions of traffic and show where the edge of the carriageway is — even at night and in rain.',
    how: 'Hot thermoplastic paint is sprayed or screeded onto the road and tiny glass beads are dropped onto it while it is still soft. The beads reflect car headlights back to the driver.',
    connections: ['asphalt-surfacing', 'crash-barriers'],
    examples: 'A double solid centre line means no overtaking — common on bridges, where there is no room for error.',
    advanced: 'Thermoplastic markings ~2.5–3 mm thick, applied at ~200 °C, with drop-on glass beads (refractive index ~1.5) giving retroreflectivity of ≥150–300 mcd·m⁻²·lx⁻¹ when new (EN 1436 class R3–R5). Lane widths here are 3.5 m. On bridges, raised profiled "rumble" edge lines may be used to alert drivers drifting towards the barrier.',
    facts: ['Road-marking glass beads work like millions of tiny cat\'s-eye reflectors.'],
  },
});

parts.push({
  id: 'footpaths',
  name: 'Footpaths',
  system: 'deck',
  position: [0, 0, 0],
  explode: [0, 6.5, 0],
  stage: 5,
  shapes: [-1, 1].flatMap((pl) => [
    { type: 'box', size: [2 * AX, 0.25, 1.9], position: [0, r3((ST + FT) / 2), pl * 8.45], material: M.concrete('#c4bfb3') },
    { type: 'box', size: [8, 0.6, 1.9], position: [-37, 9.9, pl * 8.45], material: M.concrete('#c4bfb3') },
    { type: 'box', size: [8, 0.6, 1.9], position: [37, 9.9, pl * 8.45], material: M.concrete('#c4bfb3') },
  ]),
  info: {
    what: 'Raised walkways for pedestrians and cyclists along both sides of the bridge.',
    location: 'Between the crash barriers and the outer parapets, on each edge of the deck.',
    purpose: 'Let people cross the river safely on foot or by bike, separated from fast traffic.',
    how: 'A raised concrete strip with a kerb is cast on the deck slab. The steel crash barrier protects walkers from vehicles, and the parapet stops them falling over the edge. Service ducts for lighting cables often run inside the footpath.',
    connections: ['deck-slab', 'crash-barriers', 'parapets', 'street-lights'],
    examples: 'Many city bridges, like the Golden Jubilee footbridges in London, put pedestrians on the outside of the cable planes.',
    advanced: 'Designed for crowd loading of 5 kN/m² (EN 1991-2 / AASHTO 4.3 kPa pedestrian load) — dense crowds can weigh more per square metre than cars. Pedestrian comfort criteria limit vertical deck acceleration (e.g. < 0.5–0.7 m/s²) for frequencies in the walking range (1.6–2.4 Hz). Ducts within the footpath carry lighting, communication and monitoring cables.',
    facts: ['London\'s Millennium Bridge had to be fitted with dampers after people\'s footsteps synchronised with its sway in 2000.'],
  },
});

parts.push({
  id: 'expansion-joints',
  name: 'Expansion Joints',
  system: 'deck',
  position: [0, 0, 0],
  explode: [0, 7, 0],
  stage: 5,
  shapes: [-1, 1].flatMap((sx) => [
    { type: 'box', size: [0.12, 0.1, 18.8], position: [sx * 32.42, 9.99, 0], material: M.steel('#9aa3ad') },
    { type: 'box', size: [0.12, 0.1, 18.8], position: [sx * 32.58, 9.99, 0], material: M.steel('#9aa3ad') },
    { type: 'box', size: [0.06, 0.06, 18.8], position: [sx * 32.5, 9.98, 0], material: rubber },
  ]),
  info: {
    what: 'Steel-edged gaps across the road at each end of the bridge, sealed with a rubber strip.',
    location: 'At both ends of the deck, where it meets the abutment ballast wall.',
    purpose: 'Allow the deck to grow and shrink with temperature while giving vehicles a continuous, watertight surface.',
    how: 'Two steel edge rails are fixed — one to the deck, one to the abutment. A rubber seal clipped between them stretches and squeezes as the gap opens in winter and closes in summer, and stops water and grit falling onto the bearings.',
    connections: ['abutment-west', 'abutment-east', 'bearings', 'asphalt-surfacing', 'approach-slabs'],
    examples: 'The "clunk-clunk" you hear driving onto a bridge is usually the expansion joint.',
    advanced: 'Single-gap strip-seal joints accommodate up to ~80 mm of movement; longer bridges use modular joints (multiple steel lamellae, 160–1000+ mm) or finger joints. Required movement = thermal (α·ΔT·L, here ≈ ±18 mm about a mid temperature) + creep/shrinkage + braking/seismic. Joints are fatigue-loaded by every axle and are among the most maintenance-intensive bridge components, which is why designers increasingly prefer integral (jointless) abutments on short bridges.',
    facts: ['Expansion joints usually need replacing every 15–30 years, far sooner than the bridge itself.'],
  },
});

parts.push({
  id: 'approach-slabs',
  name: 'Approach Slabs',
  system: 'deck',
  position: [0, 0, 0],
  explode: [0, 5.5, 0],
  stage: 5,
  shapes: [-37, 37].map((x) => ({ type: 'box', size: [8, 0.35, 15], position: [x, 9.775, 0], material: concrete })),
  info: {
    what: 'Reinforced-concrete slabs under the road surface just behind each abutment.',
    location: 'On top of the approach embankments, hinged to the abutment ballast wall.',
    purpose: 'Bridge over any settlement of the embankment fill so the road stays smooth where the rigid bridge meets the softer ground.',
    how: 'One end rests on a ledge of the abutment; the other end lies on the fill. If the fill settles, the slab tilts gently instead of leaving a step in the road.',
    connections: ['abutment-west', 'abutment-east', 'approach-embankments', 'expansion-joints'],
    examples: 'Used at the ends of most highway bridges built on embankments.',
    advanced: 'Typically 300–400 mm thick, 4–8 m long, designed as a simply supported slab assuming loss of soil support over part of its length. A gradient change of < 1/200 is a common target for ride quality. Dowels at the hinge allow rotation; the slab is placed on a lean concrete blinding over well-compacted granular fill.',
    facts: ['Approach slabs are a cheap fix for the "bump at the end of the bridge" problem.'],
  },
});

// =========================================================================
// SAFETY & SERVICES
// =========================================================================
parts.push({
  id: 'crash-barriers',
  name: 'Crash Barriers',
  system: 'safety',
  position: [0, 0, 0],
  explode: [0, 8, 0],
  stage: 5,
  shapes: [-1, 1].flatMap((pl) => [
    { type: 'box', size: [80.8, 0.32, 0.08], position: [0, 10.6, pl * 7.3], material: galv },
    { type: 'box', size: [0.15, 0.72, 0.15], position: [-40, RT + 0.36, pl * 7.4], array: { count: 41, offset: [2, 0, 0] }, material: galv },
  ]),
  info: {
    what: 'Galvanised steel W-beam safety rails on posts along each edge of the carriageway.',
    location: 'Between the outer traffic lanes and the footpaths, along the full bridge and approaches.',
    purpose: 'Stop an out-of-control vehicle from mounting the footpath or hitting the cables, and guide it back towards the road.',
    how: 'When a car hits the rail, the corrugated steel beam stretches like a ribbon while the posts bend, absorbing energy and redirecting the vehicle along the barrier instead of letting it go through.',
    connections: ['footpaths', 'asphalt-surfacing', 'lane-markings', 'parapets'],
    examples: 'The same W-beam guardrail lines motorways worldwide; on bridges, heavier concrete or steel parapets are often used.',
    advanced: 'Barriers are crash-tested to a containment level: EN 1317 (N2, H1–H4b) or AASHTO MASH test levels (TL-3: 2,270 kg pickup at 100 km/h, 25°; TL-5 includes a 36 t tractor-trailer). Performance is described by working width (lateral deflection) and the acceleration severity index (ASI) for occupants. On bridges the barrier must be anchored into the deck through post base plates designed so the deck is not damaged before the posts yield.',
    facts: ['A good barrier is designed to fail in a controlled way — it deforms so the people inside the car do not.'],
  },
});

parts.push({
  id: 'parapets',
  name: 'Pedestrian Parapets',
  system: 'safety',
  position: [0, 0, 0],
  explode: [0, 8.5, 0],
  stage: 5,
  shapes: [-1, 1].flatMap((pl) => [
    { type: 'box', size: [80.8, 0.08, 0.08], position: [0, 11.35, pl * 9.3], material: alu },
    { type: 'box', size: [80.8, 0.05, 0.05], position: [0, 10.75, pl * 9.3], material: alu },
    { type: 'box', size: [0.08, 1.15, 0.08], position: [-40, 10.775, pl * 9.3], array: { count: 41, offset: [2, 0, 0] }, material: alu },
  ]),
  info: {
    what: 'Aluminium railings along the outer edge of each footpath.',
    location: 'At the outer edges of the deck, beside the stay cable anchorages.',
    purpose: 'Stop pedestrians and cyclists from falling off the bridge.',
    how: 'Vertical posts bolted to the deck support horizontal rails at hand height. They are designed to resist people leaning or pushing on them.',
    connections: ['footpaths', 'crash-barriers', 'street-lights'],
    examples: 'Pedestrian parapets range from simple rails to glass panels or mesh screens on high bridges.',
    advanced: 'Height ≥ 1.15 m for pedestrians, ≥ 1.4 m where cyclists use the bridge (common national guidance). Designed for a horizontal line load at the top rail of ~1.0–1.5 kN/m (EN 1991-2 §4.8), and infill must not allow a 100 mm sphere through (child safety). Aluminium is used for its corrosion resistance and low weight.',
    facts: ['Bridge parapets are higher where cyclists use them, because a cyclist\'s centre of gravity is higher.'],
  },
});

parts.push({
  id: 'street-lights',
  name: 'Street Lights',
  system: 'safety',
  position: [0, 0, 0],
  explode: [0, 10, 0],
  stage: 5,
  shapes: [-1, 1].flatMap((pl) =>
    lightXs.flatMap((x, k) => {
      const xx = x + (pl > 0 ? 4 : 0) * (k % 2 ? -1 : 1);
      return [
        { type: 'cylinder', radiusTop: 0.07, radiusBottom: 0.12, height: 8, segments: 8, position: [xx, FT + 4, pl * 8.9], material: galv },
        { type: 'tube', points: [[xx, FT + 7.9, pl * 8.9], [xx, FT + 8.1, pl * 8.2], [xx, FT + 8.0, pl * 7.5]], radius: 0.05, segments: 6, radialSegments: 6, material: galv },
        { type: 'box', size: [0.4, 0.12, 0.7], position: [xx, FT + 7.95, pl * 7.4], material: M.light() },
      ];
    }),
  ),
  info: {
    what: 'LED lamp posts along both footpaths that light the road and walkways at night.',
    location: 'On the outer edge of each footpath, staggered along the bridge and approaches.',
    purpose: 'Let drivers see the road, markings and obstacles at night, and make the footpaths safe for pedestrians.',
    how: 'Power runs through ducts in the footpath to each pole. A photocell or central control switches the LED lantern on at dusk; the lantern\'s optics spread light evenly across the lanes.',
    connections: ['footpaths', 'parapets', 'aviation-lights'],
    examples: 'Many landmark bridges also have decorative floodlighting of the pylons and cables.',
    advanced: 'LED lanterns (~100–150 W, ~120 lm/W) on 8 m poles, designed to EN 13201 lighting classes (e.g. M2: average road luminance ≥ 1.5 cd/m², overall uniformity ≥ 0.4). On bridges, poles are a wind-fatigue concern: vortex shedding can cause cracking at the base weld, so base details and damping are checked. Lighting columns on the deck must also be passively safe or protected behind the crash barrier.',
    facts: ['Bridge lamp posts can fatigue and crack from years of gentle swaying in wind.'],
  },
});

parts.push({
  id: 'drainage-scuppers',
  name: 'Drainage Scuppers',
  system: 'safety',
  position: [0, 0, 0],
  explode: [0, 5.5, 0],
  stage: 5,
  shapes: [-1, 1].flatMap((pl) => [
    { type: 'box', size: [0.5, 0.02, 0.3], position: [-30, RT + 0.01, pl * 7.05], array: { count: 11, offset: [6, 0, 0] }, material: iron },
    { type: 'cylinder', radius: 0.1, height: 1.7, segments: 8, position: [-30, 9.1, pl * 7.05], array: { count: 11, offset: [6, 0, 0] }, material: M.plastic('#5d6670') },
  ]),
  info: {
    what: 'Small cast-iron gratings at the road edge with pipes that drain rainwater off the deck.',
    location: 'Along both gutters of the carriageway, next to the crash barriers, every 6 m.',
    purpose: 'Remove rainwater quickly so it does not pond on the road (risking aquaplaning) or soak into the deck and corrode it.',
    how: 'The road crossfall sends water to the edges; it flows along the gutter into the gratings and down pipes. On a river bridge the water is usually collected in a carrier pipe and treated before discharge, so oil from the road does not pollute the river.',
    connections: ['asphalt-surfacing', 'deck-slab', 'cross-girders'],
    examples: 'You can spot scuppers as small grates along the kerb line of most bridges.',
    advanced: 'Spacing from the rational method Q = C·i·A with flow width on the road limited (e.g. ≤ 1.0–1.5 m spread) under the design storm. Downpipes must be ≥ 150 mm to prevent blockage, discharge clear of the girders to avoid corrosion staining, and are connected to a longitudinal carrier pipe draining to the abutment where silt/oil interceptors protect the watercourse.',
    facts: ['Poor drainage is a leading cause of corrosion damage on bridges.'],
  },
});

parts.push({
  id: 'aviation-lights',
  name: 'Aviation Warning Lights',
  system: 'safety',
  position: [0, 0, 0],
  explode: [0, 9, 0],
  stage: 5,
  shapes: [-PX, PX].flatMap((px) =>
    [-LEG_Z, LEG_Z].map((z) => ({ type: 'sphere', radius: 0.25, widthSegments: 12, heightSegments: 8, position: [px, 31.5, z], material: M.light('#ff3b30', 3) })),
  ),
  info: {
    what: 'Red obstruction lights on top of each pylon leg.',
    location: 'At the very tops of the four pylon legs, 31.5 m above the river.',
    purpose: 'Warn low-flying aircraft and helicopters of the tall pylons at night and in poor visibility.',
    how: 'Steady or flashing red LED lights are switched on automatically at dusk. Very tall structures use flashing white lights by day too.',
    connections: ['pylon-west', 'pylon-east', 'street-lights'],
    examples: 'You see the same red lights on tall chimneys, masts, wind turbines and skyscrapers.',
    advanced: 'Required by ICAO Annex 14 / national aviation authorities for obstacles above about 45–150 m, or near airports/helicopter routes. Low-intensity type A/B lights are steady red (≥ 10–32 cd); taller structures need medium-intensity flashing red (2,000 cd) or white lights. Redundant lamps and monitored power supplies are typical.',
    facts: ['Aviation lights on very tall bridges may flash in sync so pilots read them as one obstacle.'],
  },
});

// =========================================================================
// TRAFFIC
// =========================================================================
parts.push({
  id: 'car-1',
  name: 'Car (eastbound)',
  system: 'traffic',
  position: [0, RT, -1.8],
  explode: [0, 10, 0],
  stage: 6,
  shapes: carShapes('#c1121f'),
  anim: { type: 'piston', axis: 'x', amplitude: 26, speed: 0.25, phase: 0 },
  info: {
    what: 'A passenger car crossing the bridge — part of the "live load" the bridge is designed for.',
    location: 'In the inner eastbound lane.',
    purpose: 'Shows how traffic loads travel across the deck. Moving loads are what make a bridge bend, vibrate and fatigue.',
    how: 'The car\'s weight presses on the asphalt, slab and cross girders, then to the edge girders, up the nearest cables to the pylon and down into the foundations. As it moves, the load shifts from cable to cable.',
    connections: ['asphalt-surfacing', 'deck-slab', 'stays-west-main', 'stays-east-main'],
    examples: 'A car weighs 1–2 tonnes — tiny compared with the deck itself, which weighs several thousand tonnes.',
    advanced: 'Codes model traffic with notional loads rather than real cars: Eurocode LM1 uses a tandem of 2 × 300 kN axles plus 9 kN/m² in lane 1; AASHTO HL-93 uses a 325 kN design truck plus 9.3 kN/m lane load; India\'s IRC uses Class 70R and Class A loading. Dynamic amplification (impact) of 10–30% accounts for bouncing over joints and surface roughness.',
    facts: ['For a cable-stayed bridge the deck\'s own weight is usually much larger than the traffic it carries.'],
  },
});

parts.push({
  id: 'car-2',
  name: 'Car (westbound)',
  system: 'traffic',
  position: [0, RT, 5.4],
  explode: [0, 10, 0],
  stage: 6,
  shapes: carShapes('#1c6dd0').map((s) => ({ ...s, position: [-s.position[0], s.position[1], -s.position[2]], ...(s.array ? { array: { ...s.array, offset: s.array.offset.map((v) => -v) } } : {}) })),
  anim: { type: 'piston', axis: 'x', amplitude: 24, speed: 0.3, phase: 2.2 },
  info: {
    what: 'A second car heading the other way, in the outer westbound lane.',
    location: 'In the outer westbound lane, near the footpath.',
    purpose: 'Shows how traffic on one side of the bridge loads one cable plane more than the other, twisting the deck.',
    how: 'A load near one edge pushes that edge girder down more than the other. The deck twists slightly, and the cable plane on that side carries more force. The cross girders and two cable planes together resist the twist.',
    connections: ['edge-girders', 'cross-girders', 'crash-barriers'],
    examples: 'Engineers check "eccentric" load cases where all heavy lanes are on one side of the bridge.',
    advanced: 'Torsion from eccentric live load is resisted by differential cable forces in the two planes (a couple of T × lever arm ~18.4 m). Two-plane cable systems are torsionally stiff, which also raises the torsional natural frequency and helps aerodynamic stability (flutter resistance depends on the ratio of torsional to vertical frequency, ideally > 2).',
    facts: ['Single-plane cable-stayed bridges need a stiff box-girder deck to resist this twisting.'],
  },
});

parts.push({
  id: 'truck',
  name: 'Truck (eastbound)',
  system: 'traffic',
  position: [0, RT, -5.4],
  explode: [0, 10, 0],
  stage: 6,
  shapes: [
    { type: 'box', size: [2, 2.2, 2.3], radius: 0.12, position: [3.3, 1.55, 0], material: M.paint('#f4a259') },
    { type: 'box', size: [0.05, 0.9, 2.0], position: [4.31, 2.0, 0], material: M.glass('#25313d') },
    { type: 'box', size: [6.6, 2.8, 2.4], position: [-1.2, 1.95, 0], material: M.plastic('#e9ecef') },
    { type: 'cylinder', radius: 0.48, height: 0.3, segments: 14, rotation: [PI / 2, 0, 0], position: [-3.6, 0.48, 1.05], array: { count: 2, offset: [1.1, 0, 0] }, material: rubber },
    { type: 'cylinder', radius: 0.48, height: 0.3, segments: 14, rotation: [PI / 2, 0, 0], position: [-3.6, 0.48, -1.05], array: { count: 2, offset: [1.1, 0, 0] }, material: rubber },
    { type: 'cylinder', radius: 0.48, height: 0.3, segments: 14, rotation: [PI / 2, 0, 0], position: [3.3, 0.48, 1.05], material: rubber },
    { type: 'cylinder', radius: 0.48, height: 0.3, segments: 14, rotation: [PI / 2, 0, 0], position: [3.3, 0.48, -1.05], material: rubber },
  ],
  anim: { type: 'piston', axis: 'x', amplitude: 22, speed: 0.2, phase: 4 },
  info: {
    what: 'A heavy goods vehicle — the kind of load that matters most for bridge design.',
    location: 'In the outer (slow) eastbound lane.',
    purpose: 'Heavy axles control the design of the deck slab, cross girders and the fatigue life of cables and joints.',
    how: 'Each truck axle presses hard on a small patch of road. The slab spreads this to the cross girders; as the truck rolls along, every cable it passes is stretched a little more, then relaxes — millions of times over the bridge\'s life.',
    connections: ['deck-slab', 'cross-girders', 'expansion-joints', 'deck-anchorages'],
    examples: 'Before opening, bridges are often load-tested with trucks of known weight parked at marked positions.',
    advanced: 'Fatigue design uses a fatigue load model (EN 1991-2 FLM3/FLM4, AASHTO fatigue truck) and Miner\'s rule over a 100–120-year design life; cable stress ranges from each truck pass are a few tens of MPa. Load testing measures deflections with surveying/GNSS and strains with gauges to verify the analysis model before opening. Many modern bridges have permanent structural health monitoring (accelerometers, weigh-in-motion, cable load cells).',
    facts: ['A single 10-tonne axle does roughly as much fatigue damage to a road or deck as thousands of car axles.'],
  },
});

// =========================================================================
export default {
  id: 'bridge',
  name: 'Cable-Stayed Bridge',
  category: 'buildings',
  tagline: 'Twin H-pylons, fan stays and a steel–concrete deck over a river.',
  description:
    'A 65 m cable-stayed road bridge with two concrete pylons, 48 stay cables and a composite steel–concrete deck. Explode it to see how the cables hang the deck from the pylons, follow the load path down into the piled foundations, and replay the balanced-cantilever construction sequence.',
  camera: { position: [52, 36, 58], target: [0, 10, 0] },
  explodeScale: 1,
  stages,
  systems,
  parts,
  steps: [
    {
      title: 'Meet the bridge',
      text: 'A cable-stayed bridge hangs its deck directly from tall towers called pylons using straight steel cables (stays). Unlike a suspension bridge, there is no main cable and no huge ground anchors — the deck itself holds the system together.',
      focus: ['pylon-west', 'pylon-east', 'stays-west-main', 'stays-west-back', 'stays-east-main', 'stays-east-back', 'edge-girders', 'deck-slab'],
      explode: 0,
      animate: true,
    },
    {
      title: 'Loads on the deck',
      text: 'Vehicles, people, wind and the deck\'s own weight all press on the road. The asphalt and concrete slab spread wheel loads to the cross girders, which carry them sideways to the two steel edge girders.',
      focus: ['car-1', 'car-2', 'truck', 'asphalt-surfacing', 'deck-slab', 'cross-girders', 'edge-girders'],
      explode: 0.35,
      animate: true,
    },
    {
      title: 'Stays carry the deck',
      text: 'Every 2.5 m a stay cable lifts the edge girder. Each cable pulls upward (holding the deck) and inward towards the pylon, which squeezes the deck lengthways. Flatter cables need more tension for the same lift.',
      focus: ['stays-west-main', 'stays-east-main', 'deck-anchorages', 'pylon-anchorages', 'edge-girders'],
      explode: 0.4,
      animate: true,
    },
    {
      title: 'Pylons in compression',
      text: 'Main-span and back-span cables pull the pylon top in opposite directions, so the sideways pulls cancel and the pylon is pushed straight down — pure compression, which concrete handles best. The auxiliary piers anchor the back stays so the pylons cannot lean towards the river.',
      focus: ['pylon-west', 'pylon-east', 'stays-west-back', 'stays-east-back', 'aux-piers', 'pylon-anchorages'],
      explode: 0.4,
      animate: false,
    },
    {
      title: 'Into the foundations',
      text: 'Each pylon delivers thousands of tonnes onto its pile cap, which spreads the load into 18 bored piles socketed into rock below the riverbed. The abutments and auxiliary piers stand on their own piled foundations on the banks.',
      focus: ['pylon-pile-caps', 'pylon-piles', 'pier-foundations', 'abutment-west', 'abutment-east', 'river-water', 'riverbanks'],
      explode: 0.7,
      animate: false,
    },
    {
      title: 'Expansion & bearings',
      text: 'Steel grows in the summer sun and shrinks on winter nights. The deck sits on sliding pot bearings and meets the road at expansion joints, so it can move a few centimetres without straining the pylons or abutments.',
      focus: ['bearings', 'expansion-joints', 'abutment-west', 'abutment-east', 'approach-slabs'],
      explode: 0.5,
      animate: false,
    },
    {
      title: 'Wind & vibration',
      text: 'Wind can make slender decks and cables oscillate. The twin cable planes make the deck stiff against twisting (preventing flutter), the heavy concrete slab adds mass, and dampers on the longest cables soak up rain-and-wind vibration.',
      focus: ['cable-dampers', 'stays-west-main', 'stays-east-main', 'edge-girders', 'deck-slab'],
      explode: 0.3,
      animate: false,
    },
    {
      title: 'Building it',
      text: 'After the foundations and pylons, the deck grows outwards from each pylon in balanced cantilever: a segment is lifted on one side, then the other, and each pair of stays is tensioned before the next. The two arms meet at mid-span, then surfacing, barriers and lighting finish the bridge. Use the construction slider to replay it.',
      focus: ['pylon-west', 'pylon-east', 'edge-girders', 'cross-girders', 'stays-west-main', 'stays-east-main', 'stays-west-back', 'stays-east-back'],
      explode: 0,
      animate: false,
    },
  ],
};
