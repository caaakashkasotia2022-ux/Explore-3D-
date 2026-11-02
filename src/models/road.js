import { M } from '../three/materials.js';

/*
 * A 30 m (X) x 22 m (Z) segment of a modern urban dual carriageway, cut away to
 * show the pavement structure and the services buried beneath it.
 *
 * Finished road surface at y = 2.0. Layers (realistic thicknesses, flexible pavement):
 *   wearing course (BC)    1.95 – 2.00   50 mm
 *   tack coat              1.94 – 1.95   (drawn 10 mm, really a film)
 *   binder course (DBM)    1.84 – 1.94   100 mm
 *   prime coat             1.83 – 1.84   (drawn 10 mm)
 *   base course (WMM)      1.58 – 1.83   250 mm
 *   sub-base (GSB)         1.38 – 1.58   200 mm
 *   geotextile             1.37 – 1.38
 *   compacted subgrade     0.87 – 1.37   500 mm
 *   natural ground         0.00 – 0.87 (and up to 1.85 under the footpaths)
 *
 * Section (Z): median |z| < 1.0, carriageways 1.0 .. 8.25 (2 x 3.5 m lanes each way),
 * gutters 8.25 .. 8.65, kerbs 8.65 .. 8.8, footpaths 8.8 .. 11.
 * The +X end is a stepped cutaway: each lower layer extends a little further.
 * Right-hand traffic: +X-bound traffic uses the z < 0 carriageway.
 */

const PI = Math.PI;
const X0 = -15; // start of segment
const ROAD_END = 12; // where surface items stop (stepped cutaway beyond)
const LEN = ROAD_END - X0; // 27 m
const XC = (X0 + ROAD_END) / 2; // -1.5

// ---- materials -----------------------------------------------------------
const asphaltWear = M.concrete('#2b2d31');
const asphaltBinder = M.concrete('#3b3a38');
const wmm = M.concrete('#8a8378');
const gsb = M.concrete('#a39276');
const compacted = M.concrete('#7a5c40');
const concrete = M.concrete();
const kerbConcrete = M.concrete('#c9c6bf');
const white = M.plastic('#f2f2f2');
const yellow = M.plastic('#f2c230');
const iron = M.castIron();
const galv = M.brushed('#b8bec6');
const rubber = M.rubber();
const leaf = { color: '#3f7d3a', metalness: 0, roughness: 0.85 };

// ---- helpers -------------------------------------------------------------
const r3 = (v) => +v.toFixed(3);
/** Pavement layer box from x = X0 to xEnd, between y0 and y1, across |z| < halfW. */
const layer = (xEnd, y0, y1, halfW, material) => ({
  type: 'box', size: [r3(xEnd - X0), r3(y1 - y0), r3(2 * halfW)], position: [r3((X0 + xEnd) / 2), r3((y0 + y1) / 2), 0], material,
});
const pipeX = (y, z, r, mat, seg = 16, x0 = -15, x1 = 15) => ({
  type: 'cylinder', radius: r, height: r3(x1 - x0), segments: seg, rotation: [0, 0, PI / 2], position: [r3((x0 + x1) / 2), y, z], material: mat,
});
const vCyl = (x, z, y0, y1, r, mat, seg = 16) => ({
  type: 'cylinder', radius: r, height: r3(y1 - y0), segments: seg, position: [x, r3((y0 + y1) / 2), z], material: mat,
});

function carShapes(color) {
  return [
    { type: 'box', size: [4.3, 0.75, 1.8], radius: 0.12, position: [0, 0.65, 0], material: M.paint(color) },
    { type: 'box', size: [2.3, 0.6, 1.6], radius: 0.1, position: [-0.2, 1.3, 0], material: M.glass('#25313d') },
    { type: 'cylinder', radius: 0.34, height: 0.24, segments: 14, rotation: [PI / 2, 0, 0], position: [-1.35, 0.34, 0.82], array: { count: 2, offset: [2.7, 0, 0] }, material: rubber },
    { type: 'cylinder', radius: 0.34, height: 0.24, segments: 14, rotation: [PI / 2, 0, 0], position: [-1.35, 0.34, -0.82], array: { count: 2, offset: [2.7, 0, 0] }, material: rubber },
    { type: 'box', size: [0.05, 0.14, 0.4], position: [2.16, 0.72, -0.6], array: { count: 2, offset: [0, 0, 1.2] }, material: M.light('#fff6d8', 2) },
  ];
}

// ---- model-level lists ---------------------------------------------------
const stages = [
  { id: 1, name: 'Clearing & excavation', text: 'The corridor is surveyed and set out, vegetation and topsoil are stripped, and the ground is excavated (or filled) to formation level.' },
  { id: 2, name: 'Subgrade compaction', text: 'The top 500 mm of earth is placed in layers, watered to the right moisture and rolled until it reaches the specified density — the foundation of the road.' },
  { id: 3, name: 'Utilities & drainage', text: 'Before any pavement goes down, trenches are dug for storm drains, the sewer, water and gas mains and cable ducts. Manholes and gullies are built and the trenches backfilled and re-compacted.' },
  { id: 4, name: 'Sub-base', text: 'A geotextile separator is rolled out, then granular sub-base is spread and compacted to drain water and spread load.' },
  { id: 5, name: 'Base course', text: 'Wet-mix macadam (crushed stone) is laid by paver and compacted. Kerbs, gutters and the footpath base are set to line and level.' },
  { id: 6, name: 'Prime coat', text: 'A thin bitumen prime coat is sprayed on the granular base to seal it and bond it to the asphalt.' },
  { id: 7, name: 'Binder course', text: 'Hot dense bituminous macadam is laid by paver and rolled while still hot.' },
  { id: 8, name: 'Wearing course', text: 'A tack coat is sprayed and the final, smooth, skid-resistant bituminous concrete surface is laid and compacted.' },
  { id: 9, name: 'Markings & furniture', text: 'Paving, the median and planting, lane markings, road studs, lights, signals, signs and the crash barrier are installed.' },
  { id: 10, name: 'Open to traffic', text: 'After final inspection and safety audit, the road opens to traffic.' },
];

const systems = [
  { id: 'earthworks', name: 'Earthworks', color: '#8d6e63' },
  { id: 'pavement', name: 'Pavement Layers', color: '#868e96' },
  { id: 'drainage', name: 'Drainage', color: '#4dabf7' },
  { id: 'utilities', name: 'Utilities', color: '#f59f00' },
  { id: 'furniture', name: 'Road Furniture & Safety', color: '#ff6b6b' },
  { id: 'traffic', name: 'Traffic', color: '#38d9a9' },
];

const parts = [];

// =========================================================================
// EARTHWORKS
// =========================================================================
parts.push({
  id: 'natural-subgrade',
  name: 'Natural Ground',
  system: 'earthworks',
  position: [0, 0, 0],
  explode: [0, -1, 0],
  ghost: true,
  stage: 1,
  shapes: [
    { type: 'box', size: [30, 0.87, 22], position: [0, 0.435, 0], material: M.soil() },
    { type: 'box', size: [30, 0.98, 2], position: [0, 1.36, 10], material: M.soil() },
    { type: 'box', size: [30, 0.98, 2], position: [0, 1.36, -10], material: M.soil() },
  ],
  info: {
    what: 'The existing earth the road is built on, after topsoil has been stripped and the ground excavated to level.',
    location: 'At the bottom of the cutaway, under all the pavement layers, and up to footpath level at the sides where the utilities are buried.',
    purpose: 'Every road ultimately rests on the ground. Its strength decides how thick all the layers above it need to be.',
    how: 'Engineers test samples of the soil (for example with the CBR test) to measure how much it resists being squashed. Weak soil needs thicker pavement layers on top to spread wheel loads more widely before they reach it.',
    connections: ['compacted-subgrade', 'storm-drains', 'sewer', 'water-main', 'gas-main'],
    examples: 'Clay soils swell when wet and shrink when dry; sandy soils drain well but can be loose. Black cotton soil in India is notoriously expansive and needs special treatment.',
    advanced: 'Soil is classified (IS 1498 / AASHTO M145 / USCS) and its soaked CBR (California Bearing Ratio, IS 2720-16 / ASTM D1883) measured: < 3% is very poor, 5–10% fair, > 15% good. Expansive clays (high plasticity index) may be replaced or stabilised with lime/cement. Groundwater level is critical — a high water table weakens the subgrade and may require sub-surface drains.',
    facts: ['CBR compares a soil\'s strength to that of a standard crushed Californian limestone, which counts as 100%.'],
  },
});

parts.push({
  id: 'compacted-subgrade',
  name: 'Compacted Subgrade',
  system: 'earthworks',
  position: [0, 0, 0],
  explode: [0, 0.6, 0],
  stage: 2,
  shapes: [layer(14.4, 0.87, 1.37, 9.0, compacted)],
  info: {
    what: 'The top 500 mm of earth beneath the road, carefully placed in layers and rolled very dense.',
    location: 'Directly beneath the geotextile and sub-base, across the full width of the carriageway.',
    purpose: 'Forms a strong, uniform platform for the pavement. Well-compacted soil does not settle or rut under traffic.',
    how: 'Soil is spread in layers about 200–250 mm thick, sprinkled with water to its "optimum moisture content", then rolled by heavy vibratory rollers until tests show it is dense enough. The top is trimmed to the right level and camber.',
    connections: ['natural-subgrade', 'geotextile', 'sub-base'],
    examples: 'Sheepsfoot rollers knead clay soils; smooth vibratory drum rollers are used for sandy and granular soils.',
    advanced: 'MoRTH (Section 305) requires the 500 mm subgrade to be compacted to ≥ 97% of maximum dry density (modified Proctor, IS 2720-8) with a minimum design CBR, typically ≥ 8% for major roads (IRC:37-2018 uses the effective resilient modulus MR = 10·CBR MPa for CBR ≤ 5, 17.6·CBR^0.64 above). Field density is checked by sand replacement or nuclear gauge at a fixed frequency per 1,000 m². Plate load or light weight deflectometer tests may also verify stiffness.',
    facts: ['A few percent less compaction can dramatically shorten a road\'s life.'],
  },
});

// =========================================================================
// PAVEMENT LAYERS (stepped cutaway at +X)
// =========================================================================
parts.push({
  id: 'geotextile',
  name: 'Geotextile Separator',
  system: 'pavement',
  position: [0, 0, 0],
  explode: [0, 1.2, 0],
  stage: 4,
  shapes: [layer(14.2, 1.37, 1.38, 9.0, M.plastic('#e8e2d2'))],
  info: {
    what: 'A tough, felt-like synthetic fabric laid on top of the compacted subgrade.',
    location: 'Between the compacted subgrade and the granular sub-base.',
    purpose: 'Stops fine clay from being pumped up into the stone layers (and stones from punching down into the clay), so the drainage layers stay clean and strong.',
    how: 'Water can pass through the fabric but soil particles cannot. It is unrolled with overlaps, and the sub-base is spread over it without driving directly on the fabric.',
    connections: ['compacted-subgrade', 'sub-base'],
    examples: 'Geotextiles are also used under railway ballast, behind retaining walls and in coastal protection.',
    advanced: 'Non-woven needle-punched polypropylene, ~200–300 g/m², selected for survivability (AASHTO M288 Class 1–2), apparent opening size O90 suited to the soil, and permittivity higher than the soil. Mechanism: separation and filtration; with weak subgrades (CBR < 3%) a geogrid may be added for reinforcement.',
    facts: ['Without separation, a granular layer can lose much of its thickness into soft clay within a few years.'],
  },
});

parts.push({
  id: 'sub-base',
  name: 'Granular Sub-base (GSB)',
  system: 'pavement',
  position: [0, 0, 0],
  explode: [0, 1.8, 0],
  stage: 4,
  shapes: [layer(13.8, 1.38, 1.58, 9.0, gsb)],
  info: {
    what: 'A 200 mm layer of graded gravel and crushed stone with some sand.',
    location: 'On top of the geotextile, under the base course.',
    purpose: 'Spreads wheel loads further over the subgrade, drains away water that gets into the pavement, and gives a stable platform to build the base on.',
    how: 'The mix is spread by grader, watered and compacted by rollers. Its open structure lets water drain sideways to the edges and out of the road.',
    connections: ['geotextile', 'base-course', 'compacted-subgrade'],
    examples: 'Sub-base gravel is the same type of material used for compacted gravel driveways and site roads.',
    advanced: 'MoRTH Section 401 GSB (close/coarse graded), compacted to ≥ 98% MDD, minimum CBR 30% (IRC:37 recommends 200 mm for most traffic levels). A drainage layer variant (open-graded) has permeability > 300 m/day. Its resilient modulus is computed from the subgrade modulus: E_gran = 0.2·h^0.45·MR_subgrade (IRC:37-2018).',
    facts: ['Water is a road\'s greatest enemy — a saturated base can lose more than half its strength.'],
  },
});

parts.push({
  id: 'base-course',
  name: 'Base Course (Wet Mix Macadam)',
  system: 'pavement',
  position: [0, 0, 0],
  explode: [0, 2.6, 0],
  stage: 5,
  shapes: [layer(13.2, 1.58, 1.83, 9.0, wmm)],
  info: {
    what: 'A 250 mm layer of crushed stone mixed with water, the main structural layer under the asphalt.',
    location: 'Above the sub-base and below the prime coat and asphalt layers.',
    purpose: 'Carries and spreads the high stresses directly under the wheels so the softer layers below are not overloaded.',
    how: 'Graded crushed rock and stone dust are mixed with exactly the right amount of water in a plant, laid by a paver to an even thickness and compacted until the angular stones lock tightly together.',
    connections: ['sub-base', 'prime-coat', 'binder-course', 'kerbs'],
    examples: 'Called WMM in India, Type 1/crushed rock base in the UK and "aggregate base" in the US.',
    advanced: 'MoRTH Section 406 WMM, 53 mm down to dust, laid in two 125 mm lifts compacted to ≥ 98% MDD (modified Proctor). Aggregate impact value < 30%, flakiness + elongation < 35%. For heavy traffic (> 50 msa), cement-treated base (CTB) with a crack-relief layer may replace WMM. Layer stiffness is typically 200–450 MPa.',
    facts: ['Angular crushed stone locks together far better than round river gravel, which is why base layers use crushed rock.'],
  },
});

parts.push({
  id: 'prime-coat',
  name: 'Prime Coat',
  system: 'pavement',
  position: [0, 0, 0],
  explode: [0, 3.3, 0],
  stage: 6,
  shapes: [layer(12.9, 1.83, 1.84, 8.25, M.concrete('#4a3b2e'))],
  info: {
    what: 'A thin spray of low-viscosity bitumen on the top of the granular base. (Drawn much thicker than it really is.)',
    location: 'On the surface of the base course, under the binder course.',
    purpose: 'Seals and binds the loose surface of the stone base and helps the first asphalt layer stick to it.',
    how: 'A distributor truck sprays the liquid bitumen evenly. It soaks a few millimetres into the base, coating the dust and fines, and is left to cure (typically 24 hours) before asphalt is laid.',
    connections: ['base-course', 'binder-course'],
    examples: 'You may see a brown, shiny road surface with no asphalt on it yet — that is a freshly primed base.',
    advanced: 'MoRTH Section 502: slow-setting bitumen emulsion (SS1) or medium-curing cutback (MC-30), 0.6–0.9 kg/m² for low-porosity WMM and 0.9–1.2 kg/m² for porous surfaces. The surface is broomed clean and lightly dampened first; penetration of 3–10 mm is the goal.',
    facts: ['A prime coat is only a film about a millimetre or two thick.'],
  },
});

parts.push({
  id: 'binder-course',
  name: 'Binder Course (DBM)',
  system: 'pavement',
  position: [0, 0, 0],
  explode: [0, 4.0, 0],
  stage: 7,
  shapes: [layer(12.6, 1.84, 1.94, 8.25, asphaltBinder)],
  info: {
    what: 'A 100 mm layer of hot asphalt made of graded stone and bitumen — the structural asphalt layer.',
    location: 'On the primed base, under the tack coat and wearing course.',
    purpose: 'Carries traffic stresses and resists the bending that happens every time a wheel passes, while spreading load to the base.',
    how: 'Stone and bitumen are heated and mixed at a hot-mix plant (~150–165 °C), trucked to site, spread by a paver and compacted by steel and pneumatic-tyred rollers before it cools.',
    connections: ['prime-coat', 'tack-coat', 'wearing-course', 'base-course'],
    examples: 'Called Dense Bituminous Macadam (DBM) in India and the UK, and "intermediate" or binder course in the US.',
    advanced: 'MoRTH Section 505 DBM grading-2 (nominal max aggregate 26.5 mm), VG-30 or VG-40 bitumen (IS 73) at ~4.5–5% by mix weight, designed by Marshall (stability ≥ 12 kN, air voids 3–5%) or Superpave. IRC:37-2018 checks it against bottom-up fatigue cracking (horizontal tensile strain at the bottom of the asphalt) and against rutting (vertical compressive strain on top of the subgrade) using a linear-elastic layered analysis (IITPAVE).',
    facts: ['Asphalt is a "viscoelastic" material: stiff in cold weather and under fast traffic, softer in heat and under slow, heavy trucks.'],
  },
});

parts.push({
  id: 'tack-coat',
  name: 'Tack Coat',
  system: 'pavement',
  position: [0, 0, 0],
  explode: [0, 4.7, 0],
  stage: 8,
  shapes: [layer(12.3, 1.94, 1.95, 8.25, M.concrete('#1e1b18'))],
  info: {
    what: 'A very light spray of bitumen emulsion between the two asphalt layers. (Drawn thicker than it really is.)',
    location: 'On top of the binder course, under the wearing course.',
    purpose: 'Glues the wearing course to the binder course so the two act as one thick layer instead of sliding over each other.',
    how: 'A sprayer applies a thin, even film. The emulsion "breaks" (turns from brown to black as the water evaporates) within minutes, and then the next asphalt layer is laid.',
    connections: ['binder-course', 'wearing-course'],
    examples: 'Poor tack is a common cause of "slippage cracks" — crescent-shaped cracks where cars brake or turn.',
    advanced: 'MoRTH Section 503: rapid-setting emulsion RS-1, about 0.20–0.30 kg/m² on a new bituminous surface (higher on old, porous or milled surfaces). Full bond roughly halves the critical tensile strain compared with an unbonded interface, greatly extending fatigue life.',
    facts: ['If two asphalt layers are not bonded, the pavement can behave as if it were a lot thinner.'],
  },
});

parts.push({
  id: 'wearing-course',
  name: 'Wearing Course (Bituminous Concrete)',
  system: 'pavement',
  position: [0, 0, 0],
  explode: [0, 5.4, 0],
  stage: 8,
  shapes: [layer(ROAD_END, 1.95, 2.0, 8.25, asphaltWear)],
  info: {
    what: 'The top 50 mm of the road: smooth, dense, black asphalt that tyres actually touch.',
    location: 'The uppermost pavement layer across both carriageways.',
    purpose: 'Gives a smooth, quiet, skid-resistant and waterproof surface, and protects the layers below from water and wear.',
    how: 'A fine, tightly graded hot mix is laid by paver and compacted while hot. The surface is shaped with a camber so rain runs off to the gutters. When it wears out, only this layer needs to be milled off and replaced.',
    connections: ['tack-coat', 'binder-course', 'lane-markings', 'road-studs', 'gutters'],
    examples: 'Stone mastic asphalt (SMA) and porous asphalt are alternative wearing courses used for durability and noise reduction.',
    advanced: 'MoRTH Section 507 Bituminous Concrete grading-2 (13.2 mm nominal), VG-30/VG-40 or polymer-modified bitumen (PMB-40) — in Superpave terms a PG 70-22 or 76-22 binder for hot climates. Air voids 3–5% after compaction (≥ 92–93% of theoretical max density on site), laid at ~140–160 °C. Camber/crossfall: 2.5% for bituminous surfaces in high rainfall areas, 2.0% in low rainfall (IRC:SP:73); it is drawn flat here for clarity. Skid resistance is measured with a British pendulum or SCRIM; surface regularity with a bump integrator (e.g. ≤ 2,000 mm/km).',
    facts: ['Fresh asphalt is laid at about 150 °C — hot enough to soften a shoe sole.', 'Asphalt is the world\'s most recycled material in some countries: old surfacing is milled and reused in new mix.'],
  },
});

// =========================================================================
// DRAINAGE
// =========================================================================
parts.push({
  id: 'gutters',
  name: 'Gutters (Kerb Channels)',
  system: 'drainage',
  position: [0, 0, 0],
  explode: [0, 5.4, 0],
  stage: 5,
  shapes: [-1, 1].map((s) => ({ type: 'box', size: [LEN, 0.17, 0.4], position: [XC, 1.915, s * 8.45], material: concrete })),
  info: {
    what: 'Smooth concrete channels along the edge of the road, next to the kerb.',
    location: 'At both outer edges of the carriageway, between the asphalt and the kerbs.',
    purpose: 'Collect rainwater that runs off the cambered road and carry it along to the gullies.',
    how: 'Because the road slopes down to the sides, rain flows across the lanes into the gutter. The gutter also falls gently along the road, so water travels to the next gully grating.',
    connections: ['gullies', 'kerbs', 'wearing-course'],
    examples: 'In heavy rain you can see water streaming along the gutter towards a drain.',
    advanced: 'Gutter flow is checked with Manning\'s / Izzard\'s equation Q = (0.376/n)·Sx^(5/3)·S^(1/2)·T^(8/3) to keep the spread of water (T) into the traffic lane below a limit (often ≤ 1–1.5 m) during the design storm. A minimum longitudinal gradient of ~0.3–0.5% is required for self-cleansing.',
    facts: ['Gutters are designed so water never spreads more than about a metre into the traffic lane in a design storm.'],
  },
});

parts.push({
  id: 'gullies',
  name: 'Gullies (Catch Basins)',
  system: 'drainage',
  position: [0, 0, 0],
  explode: [0, -1.5, 0],
  stage: 3,
  shapes: [-1, 1].flatMap((s) => [
    { type: 'box', size: [0.55, 0.75, 0.45], position: [-6, 1.6, s * 8.45], array: { count: 2, offset: [12, 0, 0] }, material: concrete },
    { type: 'box', size: [0.6, 0.03, 0.4], position: [-6, 2.0, s * 8.45], array: { count: 2, offset: [12, 0, 0] }, material: iron },
    { type: 'tube', points: [[-6, 1.3, s * 8.45], [-6, 0.9, s * 8.3], [-6, 0.65, s * 8.0]], radius: 0.07, segments: 8, radialSegments: 8, material: M.plastic('#8a8f96') },
    { type: 'tube', points: [[6, 1.3, s * 8.45], [6, 0.9, s * 8.3], [6, 0.65, s * 8.0]], radius: 0.07, segments: 8, radialSegments: 8, material: M.plastic('#8a8f96') },
  ]),
  info: {
    what: 'Concrete pits with cast-iron gratings in the gutter that let rainwater fall from the road into the drains.',
    location: 'In both gutters, at x = −6 m and +6 m, connected by short pipes to the storm drains below.',
    purpose: 'Take surface water off the road quickly to prevent flooding and aquaplaning.',
    how: 'Water pours through the grating into the pit. Grit and leaves settle in the bottom (the "pot") instead of blocking the pipe, and the cleaner water flows out through the connecting pipe into the storm drain.',
    connections: ['gutters', 'storm-drains', 'kerbs'],
    examples: 'The rectangular iron grates beside kerbs in every town are gully gratings.',
    advanced: 'Spacing from the rational method Q = C·i·A/360 (Q m³/s, i mm/h, A ha) with runoff coefficient C ≈ 0.9 for asphalt, against the grating\'s interception efficiency. Gratings are load class D400 (EN 124, 400 kN test load) in carriageways, with bars set at an angle to the traffic so bicycle wheels cannot drop in. Gully pots are emptied by suction tanker 1–2 times a year.',
    facts: ['Gully gratings are rated to survive a 40-tonne test load.'],
  },
});

parts.push({
  id: 'storm-drains',
  name: 'Storm Drains',
  system: 'drainage',
  position: [0, 0, 0],
  explode: [0, -2, 0],
  stage: 3,
  shapes: [pipeX(0.5, -8.0, 0.3, concrete, 20), pipeX(0.5, 8.0, 0.3, concrete, 20)],
  info: {
    what: 'Large 600 mm concrete pipes running under each side of the road that carry rainwater away.',
    location: 'Under the outer edge of each carriageway, about 1.5 m below the surface.',
    purpose: 'Carry the rainwater collected by the gullies to a river, pond or treatment facility so streets do not flood.',
    how: 'The pipes slope gently so water flows by gravity. Gullies feed into them along the road, and manholes give access for cleaning and inspection.',
    connections: ['gullies', 'manholes', 'natural-subgrade'],
    examples: 'Storm drains in many cities discharge straight into rivers — which is why "only rain down the drain" signs are painted next to them.',
    advanced: 'Reinforced concrete NP3/NP4 pipes (IS 458) or class-rated RCP, sized by Manning\'s equation V = (1/n)·R^(2/3)·S^(1/2) (n ≈ 0.013 for concrete) for a 2–5-year design storm in urban areas, with a minimum self-cleansing velocity of ~0.9 m/s and max ~3 m/s to avoid abrasion. Bedding class (granular bedding, haunching) controls the pipe\'s load capacity under traffic and fill.',
    facts: ['Many older cities use "combined sewers" that carry rainwater and sewage in the same pipe, which can overflow in storms.'],
  },
});

parts.push({
  id: 'sewer',
  name: 'Sanitary Sewer',
  system: 'drainage',
  position: [0, 0, 0],
  explode: [0, -2.5, 0],
  stage: 3,
  shapes: [pipeX(0.4, -3.0, 0.3, M.concrete('#8f7f73'), 20)],
  info: {
    what: 'A separate 600 mm pipe carrying wastewater (sewage) from homes and businesses.',
    location: 'Deepest of all the services, under the inner +X-bound lane, about 1.6 m below the surface.',
    purpose: 'Takes used water from toilets, kitchens and factories to the sewage treatment plant, kept separate from rainwater.',
    how: 'House connections join the sewer, which slopes downhill so sewage flows by gravity. It is laid deepest so that every building\'s drain can fall into it. Manholes allow inspection and cleaning.',
    connections: ['manholes', 'natural-subgrade', 'water-main'],
    examples: 'Large cities have sewers big enough to walk through; local street sewers are typically 150–600 mm.',
    advanced: 'Designed for peak flow (CPHEEO manual: peak factor 2–3 × average) flowing at most ~0.8 full, minimum self-cleansing velocity 0.6 m/s at design peak (0.75–0.8 m/s for larger mains), and laid with the crown below water mains to avoid contamination (minimum ~0.3 m vertical / 3 m horizontal separation). Materials: RCC with sulphate-resisting cement or epoxy lining, uPVC, HDPE or vitrified clay — hydrogen sulphide (H₂S) corrosion of concrete crowns is a key durability issue.',
    facts: ['The sewer is usually the deepest pipe because sewage relies on gravity to flow.'],
  },
});

parts.push({
  id: 'manholes',
  name: 'Manholes',
  system: 'drainage',
  position: [0, 0, 0],
  explode: [0, -1, 0],
  stage: 3,
  shapes: [
    vCyl(3, -3.0, 0.1, 1.97, 0.55, M.concrete('#9a9c9f'), 20),
    vCyl(3, -3.0, 1.97, 2.01, 0.34, iron, 20),
    vCyl(-10, 8.0, 0.2, 1.88, 0.5, M.concrete('#9a9c9f'), 20),
    vCyl(-10, 8.0, 1.88, 2.01, 0.32, iron, 20),
  ],
  info: {
    what: 'Vertical concrete shafts with heavy iron covers that give access to the sewer and storm drain.',
    location: 'One on the sewer at x = 3 m in the inner lane, one on the storm drain at x = −10 m near the gutter.',
    purpose: 'Let workers and cameras reach the pipes for inspection, cleaning and repair, and join pipes where they change direction or size.',
    how: 'Precast concrete rings are stacked on a base with a shaped channel (benching) that guides flow. A tapered top and a cast-iron frame and cover sit flush with the road.',
    connections: ['sewer', 'storm-drains', 'wearing-course'],
    examples: 'Manhole covers are round so they cannot fall through their own opening.',
    advanced: 'Spacing typically 30 m for small sewers rising to 90–300 m for large ones, and at every change of direction, gradient or diameter (CPHEEO / EN 752). Covers are load class D400 for carriageways. Manholes in the wheel path are a known ride-quality and safety issue, so frames are set on bedding mortar and adjusted to exactly match the final surface level after paving.',
    facts: ['Round covers cannot drop into the shaft and can be rolled by one person.'],
  },
});

// =========================================================================
// UTILITIES
// =========================================================================
parts.push({
  id: 'water-main',
  name: 'Water Main',
  system: 'utilities',
  position: [0, 0, 0],
  explode: [0, -1.2, 3],
  stage: 3,
  shapes: [pipeX(1.2, 9.5, 0.15, M.pipeCold(), 18)],
  info: {
    what: 'A 300 mm pressurised pipe that supplies clean drinking water to the buildings along the street.',
    location: 'Under the north footpath, about 0.8 m below the paving.',
    purpose: 'Distributes treated water from the city network to homes, businesses and fire hydrants.',
    how: 'Water is pumped or fed from a high tank so it is under pressure; service pipes branch off to each property. Valves let sections be isolated for repair.',
    connections: ['sewer', 'telecom-ducts', 'footpaths'],
    examples: 'Fire hydrants on the footpath are connected directly to the water main below.',
    advanced: 'Ductile iron (IS 8329 / EN 545, K9) or HDPE PE100 PN10, designed for 10–25 m minimum residual head and fire flow. Minimum cover ~0.9–1.2 m (shallower under footpaths) to protect from traffic loads and frost; placed above and at least 3 m horizontally from sewers to avoid contamination. Thrust blocks restrain bends against internal pressure, and leakage (non-revenue water) is monitored by district metering.',
    facts: ['Many cities lose 20–40% of their treated water through leaks in old mains.'],
  },
});

parts.push({
  id: 'gas-main',
  name: 'Gas Main',
  system: 'utilities',
  position: [0, 0, 0],
  explode: [0, -1.2, -3],
  stage: 3,
  shapes: [pipeX(1.4, -9.5, 0.09, M.plastic('#f2c94c'), 16)],
  info: {
    what: 'A yellow polyethylene pipe carrying natural gas to buildings along the street.',
    location: 'Under the south footpath, about 0.7 m below the paving.',
    purpose: 'Supplies gas for cooking, heating and hot water.',
    how: 'Gas flows at low or medium pressure from a regulator station. Each building has a service pipe, a shut-off valve and a meter.',
    connections: ['power-ducts', 'footpaths'],
    examples: 'Yellow PE pipe is the standard colour for gas in the UK, Europe and India\'s city gas networks.',
    advanced: 'MDPE/HDPE PE100 SDR 11, ~180 mm, operating up to ~4 bar (medium pressure) and joined by electrofusion or butt fusion. Minimum cover typically 0.6 m under footways, 0.75 m under carriageways, with yellow warning tape ~300 mm above the pipe and separation from electrical cables to avoid damage from faults. Excavators must check utility records and use cable/pipe locators before digging.',
    facts: ['Natural gas has no smell — an odourant (mercaptan) is added so leaks can be detected by nose.'],
  },
});

parts.push({
  id: 'power-ducts',
  name: 'Electrical Ducts',
  system: 'utilities',
  position: [0, 0, 0],
  explode: [0, -1, -4.5],
  stage: 3,
  shapes: [
    pipeX(1.5, -10.25, 0.075, M.wire('#c0392b'), 12),
    pipeX(1.5, -10.45, 0.075, M.wire('#c0392b'), 12),
    pipeX(1.5, -10.65, 0.075, M.wire('#c0392b'), 12),
    { type: 'box', size: [30, 0.01, 0.6], position: [0, 1.75, -10.45], material: M.wire('#e74c3c') },
  ],
  info: {
    what: 'Plastic ducts carrying power cables, with a warning tape buried above them.',
    location: 'Under the outer part of the south footpath, about 0.6 m deep.',
    purpose: 'Bring electricity to buildings, street lights and traffic signals.',
    how: 'Cables are pulled through the ducts from pit to pit, so they can be replaced later without digging up the road. A bright warning tape above them alerts anyone digging.',
    connections: ['street-lights', 'traffic-signal', 'gas-main'],
    examples: 'Low-voltage (230/415 V) and 11 kV distribution cables commonly run under footpaths in cities.',
    advanced: 'HDPE/uPVC ducts (~150 mm) with drawpits every 30–50 m. 11 kV XLPE cables are laid at ~0.9–1.0 m depth and LV at ~0.6–0.75 m, with cable spacing chosen for thermal derating (soil thermal resistivity ~1.2–2.5 K·m/W). Concrete cover tiles or marker tape protect them, and separation from gas and telecom is maintained per IS 1255 / utility codes.',
    facts: ['Placing cables in ducts means they can be replaced later without digging up the street.'],
  },
});

parts.push({
  id: 'telecom-ducts',
  name: 'Telecom & Fibre Ducts',
  system: 'utilities',
  position: [0, 0, 0],
  explode: [0, -1, 4.5],
  stage: 3,
  shapes: [
    pipeX(1.55, 10.25, 0.05, M.plastic('#2f80ed'), 10),
    pipeX(1.55, 10.4, 0.05, M.plastic('#2f80ed'), 10),
    pipeX(1.42, 10.25, 0.05, M.plastic('#27ae60'), 10),
    pipeX(1.42, 10.4, 0.05, M.plastic('#27ae60'), 10),
  ],
  info: {
    what: 'A bundle of small plastic ducts holding optical fibre and telephone cables.',
    location: 'Under the outer part of the north footpath, about 0.6 m deep.',
    purpose: 'Carry internet, phone, CCTV and traffic-signal communication cables.',
    how: 'Fibre cables are blown or pulled through the ducts. Spare ducts are laid empty for future growth, so the footpath does not have to be dug up again.',
    connections: ['water-main', 'traffic-signal'],
    examples: 'The small square access covers on footpaths often lead to telecom chambers.',
    advanced: 'HDPE permanently lubricated ducts (40–50 mm) or microduct bundles, with fibre installed by air-blowing over several kilometres. Many cities now mandate "dig once" policies requiring spare ducts whenever a road is rebuilt, and utility corridors with defined depths and offsets for each service.',
    facts: ['A single hair-thin optical fibre can carry many terabits per second of data.'],
  },
});

// =========================================================================
// ROAD FURNITURE & SAFETY
// =========================================================================
parts.push({
  id: 'kerbs',
  name: 'Kerbs',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 5, 0],
  stage: 5,
  shapes: [-1, 1].map((s) => ({ type: 'box', size: [LEN + 0.5, 0.32, 0.15], position: [XC + 0.25, 1.99, s * 8.725], material: kerbConcrete })),
  info: {
    what: 'Precast concrete edge stones that separate the road from the footpath.',
    location: 'Along both outer edges of the carriageway, between the gutter and the footpath.',
    purpose: 'Define the edge of the road, guide vehicles, protect pedestrians, retain the footpath and form one side of the gutter.',
    how: 'Kerb units are set on a wet concrete bed to an exact line and level, with concrete "haunching" behind them so they cannot be pushed over. They stand 150 mm above the road surface.',
    connections: ['gutters', 'footpaths', 'base-course'],
    examples: 'Kerbs are dropped flush with the road at pedestrian crossings and driveways for wheelchairs and prams.',
    advanced: 'Precast M30–M40 concrete (IS 5758 / EN 1340), typically 150 mm upstand on urban roads (barrier kerbs) and lower "mountable" kerbs on medians. Laid on a C20 bed ≥ 150 mm thick with haunching to two-thirds of the face. Kerb height is a trade-off: high enough to deter vehicles, low enough not to cause tripping or vehicle vaulting at high speed.',
    facts: ['Dropped kerbs with tactile paving make crossings usable by wheelchair users and blind pedestrians.'],
  },
});

parts.push({
  id: 'footpath-base',
  name: 'Footpath Base & Bedding',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 2.6, 0],
  stage: 5,
  shapes: [-1, 1].flatMap((s) => [
    { type: 'box', size: [27.5, 0.19, 2.2], position: [-1.25, 1.945, s * 9.9], material: gsb },
    { type: 'box', size: [27.5, 0.03, 2.2], position: [-1.25, 2.055, s * 9.9], material: M.concrete('#d9c79e') },
  ]),
  info: {
    what: 'A layer of compacted granular base topped with a thin bed of sharp sand under the footpath paving.',
    location: 'Under the paving blocks on both footpaths, above the buried utilities.',
    purpose: 'Gives the paving blocks a firm, level, free-draining support so they do not sink or rock.',
    how: 'The granular base is compacted, then sand is screeded level. The blocks are laid on the sand and vibrated in, which also pushes sand up into the joints and locks the blocks together.',
    connections: ['footpaths', 'kerbs', 'water-main', 'gas-main'],
    examples: 'The same build-up is used for driveways and patios with block paving.',
    advanced: 'Typically 150–200 mm GSB/WMM compacted to ≥ 95–98% MDD, plus 20–40 mm compacted bedding sand (IRC:SP:63 / BS 7533). Footway design loads are much lower than carriageways, but occasional vehicle overrun at driveways requires a thicker base there.',
    facts: ['Block paving works because sand-filled joints lock the blocks together into a flexible "interlocking" surface.'],
  },
});

parts.push({
  id: 'footpaths',
  name: 'Footpaths (Paver Blocks)',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 3.4, 0],
  stage: 9,
  shapes: [-1, 1].flatMap((s) => [
    { type: 'box', size: [27.5, 0.08, 2.2], position: [-1.25, 2.11, s * 9.9], material: M.brick('#9c6b5a') },
    { type: 'box', size: [0.02, 0.081, 2.2], position: [-14.8, 2.11, s * 9.9], array: { count: 46, offset: [0.6, 0, 0] }, material: M.concrete('#7a5246') },
    { type: 'box', size: [1.2, 0.085, 0.6], position: [-10, 2.11, s * 9.2], material: M.plastic('#f2c94c') },
  ]),
  info: {
    what: 'Raised walkways paved with interlocking concrete blocks on both sides of the road.',
    location: 'Outside the kerbs along both edges of the road, 150 mm above the carriageway.',
    purpose: 'Give pedestrians a safe, separate space to walk, and cover the utility corridor underneath so it can be dug up and re-laid easily.',
    how: 'Concrete paver blocks are laid in a pattern on the sand bed, vibrated down and jointed with sand. Yellow tactile paving at the crossing tells blind and partially sighted people where the kerb is.',
    connections: ['footpath-base', 'kerbs', 'street-lights', 'zebra-crossing', 'water-main'],
    examples: 'Block-paved footpaths can be lifted block-by-block to repair a pipe and re-laid with no visible patch.',
    advanced: '80 mm interlocking concrete blocks (IS 15658, M30–M40, ≥ 30 MPa) in herringbone or stretcher bond, with crossfall of ~2% towards the road. Accessibility guidelines (e.g. IRC:103) call for clear widths of ≥ 1.8 m (2.5 m+ in busy areas), slopes ≤ 1:12 at ramps and continuous tactile guidance.',
    facts: ['Tactile "blister" paving at crossings was first developed in Japan in the 1960s.'],
  },
});

parts.push({
  id: 'median',
  name: 'Median Divider',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 6.5, 0],
  stage: 9,
  shapes: [
    { type: 'box', size: [LEN, 0.3, 0.15], position: [XC, 2.15, -0.925], material: kerbConcrete },
    { type: 'box', size: [LEN, 0.3, 0.15], position: [XC, 2.15, 0.925], material: kerbConcrete },
    { type: 'box', size: [LEN, 0.26, 1.7], position: [XC, 2.13, 0], material: M.soil() },
    { type: 'box', size: [16, 0.02, 1.7], position: [4, 2.27, 0], material: leaf },
  ],
  info: {
    what: 'A raised, kerbed strip of planted soil that separates the two directions of traffic.',
    location: 'Along the centre of the road, 2 m wide.',
    purpose: 'Prevents head-on collisions, gives pedestrians a refuge halfway across, reduces glare from oncoming headlights and adds greenery.',
    how: 'Mountable kerbs are set along both sides and the space between is filled with topsoil for planting. Where the median is narrow or traffic is fast, a crash barrier is fitted instead.',
    connections: ['median-plants', 'crash-barrier', 'lane-markings', 'zebra-crossing'],
    examples: 'Planted medians are common on urban arterials and boulevards worldwide.',
    advanced: 'Divided roads have dramatically lower head-on crash rates than undivided ones. Medians ≥ 1.2–2 m allow pedestrian refuge; landscaping must keep sight lines clear at junctions (plants < ~0.7 m high or trees with clear stems). Median drainage prevents water from the planted soil seeping into the pavement layers.',
    facts: ['A raised median with a pedestrian refuge can significantly reduce pedestrian crashes at crossings.'],
  },
});

const shrubXs = [-2.6, -0.4, 1.8, 6.2, 8.4, 10.6];
parts.push({
  id: 'median-plants',
  name: 'Median Planting',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 7.5, 0],
  stage: 9,
  shapes: [
    ...shrubXs.map((x) => ({ type: 'organic', radius: 0.38, detail: 2, noise: 0.12, position: [x, 2.55, 0], material: leaf })),
    vCyl(4.0, 0, 2.27, 4.3, 0.1, M.wood('#6b4a2f'), 8),
    { type: 'organic', radius: 1.1, detail: 3, noise: 0.15, position: [4.0, 4.9, 0], material: M.plastic('#2f6b30') },
  ],
  info: {
    what: 'Low shrubs and a small tree planted in the median.',
    location: 'In the soil of the median strip.',
    purpose: 'Reduce headlight glare at night, improve the look of the street, give shade and absorb some rainwater and pollution.',
    how: 'Shrubs are kept low so drivers and pedestrians can still see each other. Trees are chosen with deep roots and placed away from buried pipes and sight lines.',
    connections: ['median'],
    examples: 'Oleander and bougainvillea are common glare-screen shrubs on Indian medians; many European boulevards use rows of plane trees.',
    advanced: 'Planting must preserve stopping and intersection sight distance (typically keeping foliage below ~0.6–0.9 m near junctions). Tree trunks on medians are fixed hazards at higher speeds, so clear-zone rules apply (≥ 3 m offset or barrier protection on fast roads). Root barriers protect the pavement and utilities; species are chosen for drought and pollution tolerance.',
    facts: ['Street trees can lower nearby surface temperatures by several degrees in summer.'],
  },
});

parts.push({
  id: 'crash-barrier',
  name: 'Median Crash Barrier',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 7, 0],
  stage: 9,
  shapes: [
    { type: 'box', size: [10.5, 0.32, 0.06], position: [-9.6, 2.85, -0.2], material: galv },
    { type: 'box', size: [10.5, 0.32, 0.06], position: [-9.6, 2.85, 0.2], material: galv },
    { type: 'box', size: [0.15, 0.85, 0.15], position: [-14.6, 2.7, 0], array: { count: 6, offset: [2, 0, 0] }, material: galv },
  ],
  info: {
    what: 'A double-sided steel W-beam guardrail along part of the median.',
    location: 'On the median from the western end up to the planted section.',
    purpose: 'Stops vehicles crossing the median into oncoming traffic where the median is too narrow to rely on kerbs and planting.',
    how: 'If a vehicle hits it, the corrugated rail stretches and the posts bend, absorbing energy and steering the vehicle back along the barrier.',
    connections: ['median', 'lane-markings'],
    examples: 'W-beam guardrail is the most common safety barrier on highways; concrete "New Jersey" barriers are used where deflection space is limited.',
    advanced: 'Galvanised W-beam (2.5–3 mm steel) on posts at 2 m centres, rail centre ~550–600 mm above the road. Tested to EN 1317 (e.g. N2) or MASH TL-3; its working width (deflection) must fit within the median. End terminals must be crashworthy (flared or energy-absorbing) — blunt ends can spear a vehicle.',
    facts: ['Barrier ends are one of the most dangerous objects on a road unless they are properly designed.'],
  },
});

parts.push({
  id: 'lane-markings',
  name: 'Lane Markings',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 6.2, 0],
  stage: 9,
  shapes: [
    { type: 'box', size: [2.5, 0.006, 0.15], position: [-13.5, 2.003, -4.75], array: { count: 5, offset: [6, 0, 0] }, material: white },
    { type: 'box', size: [2.5, 0.006, 0.15], position: [-13.5, 2.003, 4.75], array: { count: 5, offset: [6, 0, 0] }, material: white },
    { type: 'box', size: [LEN, 0.006, 0.15], position: [XC, 2.003, -8.1], material: white },
    { type: 'box', size: [LEN, 0.006, 0.15], position: [XC, 2.003, 8.1], material: white },
    { type: 'box', size: [LEN, 0.006, 0.15], position: [XC, 2.003, -1.35], material: yellow },
    { type: 'box', size: [LEN, 0.006, 0.15], position: [XC, 2.003, 1.35], material: yellow },
    { type: 'box', size: [0.3, 0.006, 6.9], position: [-12.2, 2.003, -4.8], material: white },
    { type: 'box', size: [0.3, 0.006, 6.9], position: [-7.8, 2.003, 4.8], material: white },
  ],
  info: {
    what: 'White and yellow lines painted on the road: dashed lane lines, edge lines, median edge lines and stop lines.',
    location: 'On the wearing course across both carriageways.',
    purpose: 'Organise traffic into lanes, mark the edges of the road, and show where vehicles must stop before the crossing.',
    how: 'Hot thermoplastic paint is applied in a thin strip by a marking machine and glass beads are scattered on top to reflect headlights back at night.',
    connections: ['wearing-course', 'road-studs', 'zebra-crossing', 'median'],
    examples: 'Dashed lines can be crossed to change lanes; solid lines should not be crossed.',
    advanced: 'Hot-applied thermoplastic 2.5 mm thick (IRC:35-2015), lane lines 150 mm wide with 3 m marks and 4.5–6 m gaps (drawn slightly shorter here), stop lines 200–300 mm. Retroreflectivity of ≥ 150–300 mcd·m⁻²·lx⁻¹ new, restriped when it drops below ~80–100. Skid resistance of markings matters for motorcyclists (≥ 45 BPN).',
    facts: ['Yellow lines next to a median often mean "do not cross" in many countries.'],
  },
});

parts.push({
  id: 'zebra-crossing',
  name: 'Zebra Crossing',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 6.2, 0],
  stage: 9,
  shapes: [
    { type: 'box', size: [3, 0.006, 0.5], position: [-10, 2.003, -7.75], array: { count: 7, offset: [0, 0, 1.0] }, material: white },
    { type: 'box', size: [3, 0.006, 0.5], position: [-10, 2.003, 1.75], array: { count: 7, offset: [0, 0, 1.0] }, material: white },
  ],
  info: {
    what: 'Wide white stripes across the road marking a pedestrian crossing.',
    location: 'Across both carriageways at x ≈ −10 m, next to the traffic signal.',
    purpose: 'Shows pedestrians where to cross and tells drivers to give way to people on the crossing.',
    how: 'The bold stripes are easy to see from a distance. Here the crossing is signal-controlled; the median acts as a refuge so people can cross one direction at a time.',
    connections: ['traffic-signal', 'lane-markings', 'footpaths', 'median'],
    examples: 'The UK introduced zebra crossings in 1951; the Abbey Road crossing is famous from a Beatles album cover.',
    advanced: 'IRC:35 specifies stripes 500 mm wide with 500 mm gaps, crossing width ≥ 2.5–4 m depending on pedestrian flow, placed with a stop line 1.5–3 m before it. Stripes run parallel to traffic so tyres pass between them, reducing wear and improving grip.',
    facts: ['Zebra stripes are laid parallel to traffic so wheels roll between them, keeping them from wearing out quickly.'],
  },
});

parts.push({
  id: 'road-studs',
  name: 'Road Studs (Cat\'s Eyes)',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 6.6, 0],
  stage: 9,
  shapes: [
    { type: 'box', size: [0.12, 0.03, 0.1], position: [-10.5, 2.015, -4.75], array: { count: 4, offset: [6, 0, 0] }, material: M.light('#ffffff', 1.6) },
    { type: 'box', size: [0.12, 0.03, 0.1], position: [-10.5, 2.015, 4.75], array: { count: 4, offset: [6, 0, 0] }, material: M.light('#ffffff', 1.6) },
    { type: 'box', size: [0.12, 0.03, 0.1], position: [-14, 2.015, -1.55], array: { count: 9, offset: [3, 0, 0] }, material: M.light('#ffb020', 1.6) },
    { type: 'box', size: [0.12, 0.03, 0.1], position: [-14, 2.015, 1.55], array: { count: 9, offset: [3, 0, 0] }, material: M.light('#ffb020', 1.6) },
  ],
  info: {
    what: 'Small reflective or solar-powered markers set into the road surface.',
    location: 'In the gaps between lane-line dashes (white) and along the median edge (amber).',
    purpose: 'Make lanes and edges visible at night and in rain, when painted lines become hard to see under a film of water.',
    how: 'Passive studs contain reflectors that bounce headlights back to the driver; solar studs charge by day and flash LEDs at night. Raised studs also give a rumble when driven over.',
    connections: ['lane-markings', 'wearing-course', 'median'],
    examples: 'Colour codes commonly used: white for lane lines, amber/yellow for the median edge, red for the left edge (in left-hand-traffic countries), green at junctions.',
    advanced: 'Retroreflective studs to EN 1463 / IRC:SP:73 placed every 9–18 m on lane lines; solar LED studs give visibility of several hundred metres. Studs are bonded with bitumen or epoxy adhesive in a drilled recess so snowploughs and tyres do not dislodge them.',
    facts: ['Percy Shaw invented the cat\'s eye in 1934 after seeing his headlights reflected in a real cat\'s eyes.'],
  },
});

const lights = [[-8, 1], [4, 1], [-2, -1], [9, -1]];
parts.push({
  id: 'street-lights',
  name: 'Street Lights',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 8, 0],
  stage: 9,
  shapes: lights.flatMap(([x, s]) => [
    { type: 'box', size: [0.4, 0.3, 0.4], position: [x, 2.3, s * 10.6], material: concrete },
    { type: 'cylinder', radiusTop: 0.07, radiusBottom: 0.12, height: 8, segments: 10, position: [x, 6.15, s * 10.6], material: galv },
    { type: 'tube', points: [[x, 10.05, s * 10.6], [x, 10.3, s * 9.8], [x, 10.25, s * 8.9]], radius: 0.05, segments: 8, radialSegments: 6, material: galv },
    { type: 'box', size: [0.45, 0.12, 0.8], position: [x, 10.2, s * 8.7], material: M.light() },
  ]),
  info: {
    what: 'Tall LED lamp posts that light the road and footpaths at night.',
    location: 'On the outer edge of both footpaths, staggered along the road.',
    purpose: 'Help drivers see the road, pedestrians and obstacles, and make the street feel safe for people walking.',
    how: 'Power comes from the underground electrical ducts. A light sensor or central management system turns the lanterns on at dusk and can dim them late at night to save energy.',
    connections: ['power-ducts', 'footpaths', 'traffic-signal'],
    examples: 'Many cities have replaced orange sodium lamps with white LEDs, cutting energy use by half or more.',
    advanced: 'LED lanterns of ~100–150 W on 8–10 m poles, spaced ~3–3.5× mounting height in a staggered arrangement. Designed to EN 13201 / IS 1944 classes (e.g. M3: average luminance ≥ 1.0 cd/m², uniformity U0 ≥ 0.4, threshold increment (glare) ≤ 15%). Poles are founded on concrete bases and placed ≥ 0.5–0.6 m behind the kerb face.',
    facts: ['Switching to LED street lights often halves a city\'s street-lighting energy bill.'],
  },
});

parts.push({
  id: 'traffic-signal',
  name: 'Traffic Signal',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 8, 0],
  stage: 9,
  shapes: [
    { type: 'box', size: [0.5, 0.3, 0.5], position: [-12.6, 2.3, -10.2], material: concrete },
    { type: 'cylinder', radius: 0.11, height: 5.4, segments: 12, position: [-12.6, 4.85, -10.2], material: galv },
    { type: 'cylinder', radius: 0.07, height: 6.4, segments: 10, rotation: [PI / 2, 0, 0], position: [-12.6, 7.4, -7.0], material: galv },
    { type: 'box', size: [0.35, 1.05, 0.4], position: [-12.7, 6.9, -5.0], material: M.plastic('#1c1c1c') },
    { type: 'box', size: [0.35, 1.05, 0.4], position: [-12.7, 3.6, -10.2], material: M.plastic('#1c1c1c') },
    { type: 'sphere', radius: 0.11, widthSegments: 12, heightSegments: 8, position: [-12.88, 7.22, -5.0], material: M.light('#ff3b30', 3) },
    { type: 'sphere', radius: 0.11, widthSegments: 12, heightSegments: 8, position: [-12.88, 6.9, -5.0], material: M.plastic('#5a4a10') },
    { type: 'sphere', radius: 0.11, widthSegments: 12, heightSegments: 8, position: [-12.88, 6.58, -5.0], material: M.plastic('#123d1c') },
    { type: 'sphere', radius: 0.11, widthSegments: 12, heightSegments: 8, position: [-12.88, 3.92, -10.2], material: M.light('#ff3b30', 3) },
    { type: 'sphere', radius: 0.11, widthSegments: 12, heightSegments: 8, position: [-12.88, 3.6, -10.2], material: M.plastic('#5a4a10') },
    { type: 'sphere', radius: 0.11, widthSegments: 12, heightSegments: 8, position: [-12.88, 3.28, -10.2], material: M.plastic('#123d1c') },
  ],
  info: {
    what: 'A pole-mounted signal with a mast arm reaching over the lanes, controlling traffic at the pedestrian crossing.',
    location: 'On the south footpath at x ≈ −12.6 m, facing traffic heading in the +X direction.',
    purpose: 'Stops traffic in turn so pedestrians can cross safely, and organises vehicles at the crossing.',
    how: 'A controller in a roadside cabinet switches the LED lights through green, amber and red. Pedestrians press a button (or are detected), and the controller gives them a "walk" phase after a safe amber and all-red interval.',
    connections: ['zebra-crossing', 'power-ducts', 'telecom-ducts', 'lane-markings'],
    examples: 'Modern "adaptive" signals (SCOOT, SCATS) adjust timings in real time using vehicle detectors.',
    advanced: 'LED signal heads (200–300 mm lenses) to IRC:93 / EN 12368. Fixed-time cycles are often set with Webster\'s formula C₀ = (1.5L + 5)/(1 − Y) (L = lost time, Y = sum of critical flow ratios), typically 60–120 s. Amber time ~3 s + all-red clearance; pedestrian green based on a walking speed of ~1.0–1.2 m/s across the crossing. Detectors can be inductive loops in the asphalt, radar or video.',
    facts: ['The first electric traffic light was installed in Cleveland, Ohio, in 1914.'],
  },
});

parts.push({
  id: 'signboard',
  name: 'Direction Signboard',
  system: 'furniture',
  position: [0, 0, 0],
  explode: [0, 8, 0],
  stage: 9,
  shapes: [
    vCyl(8, 9.75, 2.15, 5.0, 0.06, galv, 8),
    vCyl(8, 10.65, 2.15, 5.0, 0.06, galv, 8),
    { type: 'box', size: [0.06, 1.2, 1.5], position: [7.95, 4.4, 10.2], material: M.paint('#1f6f43') },
    { type: 'box', size: [0.065, 1.0, 1.3], position: [7.95, 4.4, 10.2], material: M.plastic('#f2f2f2') },
    { type: 'box', size: [0.07, 0.9, 1.2], position: [7.95, 4.4, 10.2], material: M.paint('#1f6f43') },
  ],
  info: {
    what: 'A green direction sign on two posts beside the road.',
    location: 'On the north footpath at x ≈ 8 m, facing traffic travelling in the −X direction.',
    purpose: 'Tells drivers about destinations and routes ahead early enough for them to choose their lane.',
    how: 'The sign face is covered in retroreflective sheeting that bounces headlight beams back towards the driver, so it is readable at night without its own lighting.',
    connections: ['footpaths', 'lane-markings'],
    examples: 'Green signs typically show direction on main roads, blue on motorways/expressways in some countries, brown for tourist destinations.',
    advanced: 'Retroreflective microprismatic sheeting (IRC:67 / ASTM D4956 Type IX or XI). Letter height is chosen for reading distance at the design speed (roughly 1 cm per 6–8 m of legibility). Posts are frangible or breakaway, or placed outside the clear zone, so a car hitting them is not stopped abruptly.',
    facts: ['Sign posts are often designed to snap off cleanly when hit, to protect the car\'s occupants.'],
  },
});

// =========================================================================
// TRAFFIC
// =========================================================================
const mirror = (shapes) => shapes.map((s) => ({ ...s, position: [-s.position[0], s.position[1], -s.position[2]], ...(s.array ? { array: { ...s.array, offset: s.array.offset.map((v) => -v) } } : {}) }));

parts.push({
  id: 'car-1',
  name: 'Car (+X-bound)',
  system: 'traffic',
  position: [XC, 2.0, -3.0],
  explode: [0, 9, 0],
  stage: 10,
  shapes: carShapes('#c1121f'),
  anim: { type: 'piston', axis: 'x', amplitude: 10, speed: 0.4, phase: 0 },
  info: {
    what: 'A passenger car driving along the inner lane.',
    location: 'In the inner lane of the +X-bound carriageway.',
    purpose: 'Represents the light traffic the road carries. Cars cause very little structural damage to a pavement — it is heavy axles that matter.',
    how: 'Each tyre presses on a small patch of asphalt. The layers below spread the pressure so that by the time it reaches the subgrade it is only a small fraction of the tyre pressure.',
    connections: ['wearing-course', 'lane-markings', 'manholes'],
    examples: 'A typical car axle carries about 0.5–0.8 tonnes.',
    advanced: 'By the AASHO Road Test "fourth power law", relative damage ≈ (axle load / 80 kN standard axle)⁴. A 7 kN car axle does about (7/80)⁴ ≈ 0.00006 of the damage of one standard axle, so pavement design traffic (msa — million standard axles) is governed almost entirely by commercial vehicles.',
    facts: ['One heavy truck axle can do as much road damage as many thousands of cars.'],
  },
});

parts.push({
  id: 'car-2',
  name: 'Car (−X-bound)',
  system: 'traffic',
  position: [XC, 2.0, 6.5],
  explode: [0, 9, 0],
  stage: 10,
  shapes: mirror(carShapes('#1c6dd0')),
  anim: { type: 'piston', axis: 'x', amplitude: 10, speed: 0.5, phase: 2 },
  info: {
    what: 'A second car travelling the other way.',
    location: 'In the outer lane of the −X-bound carriageway, near the kerb.',
    purpose: 'Shows the opposite traffic direction, separated by the median.',
    how: 'Vehicles keep to the right here; the median and its kerbs stop them drifting into opposing traffic.',
    connections: ['median', 'gutters', 'gullies'],
    examples: 'Outer lanes near the gutter can collect standing water in poor drainage — a cause of splashing and aquaplaning.',
    advanced: 'Lane distribution factors in design (IRC:37: e.g. 75% of commercial traffic in the design lane of a two-lane carriageway in each direction) reflect that heavy vehicles mostly use the outer (slow) lane, so it ruts and cracks first.',
    facts: ['The outer lane of a busy road usually wears out first because trucks use it most.'],
  },
});

parts.push({
  id: 'truck',
  name: 'Truck (+X-bound)',
  system: 'traffic',
  position: [XC, 2.0, -6.5],
  explode: [0, 9, 0],
  stage: 10,
  shapes: [
    { type: 'box', size: [2, 2.2, 2.3], radius: 0.12, position: [3.3, 1.55, 0], material: M.paint('#f4a259') },
    { type: 'box', size: [0.05, 0.9, 2.0], position: [4.31, 2.0, 0], material: M.glass('#25313d') },
    { type: 'box', size: [5.6, 2.6, 2.4], position: [-0.8, 1.85, 0], material: M.plastic('#e9ecef') },
    { type: 'cylinder', radius: 0.48, height: 0.3, segments: 14, rotation: [PI / 2, 0, 0], position: [-2.6, 0.48, 1.05], array: { count: 2, offset: [1.1, 0, 0] }, material: rubber },
    { type: 'cylinder', radius: 0.48, height: 0.3, segments: 14, rotation: [PI / 2, 0, 0], position: [-2.6, 0.48, -1.05], array: { count: 2, offset: [1.1, 0, 0] }, material: rubber },
    { type: 'cylinder', radius: 0.48, height: 0.3, segments: 14, rotation: [PI / 2, 0, 0], position: [3.3, 0.48, 1.05], material: rubber },
    { type: 'cylinder', radius: 0.48, height: 0.3, segments: 14, rotation: [PI / 2, 0, 0], position: [3.3, 0.48, -1.05], material: rubber },
  ],
  anim: { type: 'piston', axis: 'x', amplitude: 8, speed: 0.3, phase: 4 },
  info: {
    what: 'A loaded goods truck in the outer lane — the vehicle that really determines how thick the pavement must be.',
    location: 'In the outer (slow) lane of the +X-bound carriageway.',
    purpose: 'Represents the heavy commercial traffic the pavement is designed around.',
    how: 'Every pass of a heavy axle bends the asphalt layers very slightly. Over millions of passes this causes fatigue cracking at the bottom of the asphalt and permanent deformation (rutting) in the layers below — exactly what the layered design is meant to control.',
    connections: ['wearing-course', 'binder-course', 'base-course', 'compacted-subgrade'],
    examples: 'In India the legal single-axle limit is about 10.2 t; in Europe 10–11.5 t.',
    advanced: 'A 10.2 t single axle ≈ (100/80)⁴ ≈ 2.4 standard axles; overloaded axles (e.g. 13 t → ~6.8 ESAL) do disproportionate damage. IRC:37-2018 design traffic N = 365·[(1+r)ⁿ − 1]/r · A · D · F (A = initial CVPD, D = lane distribution, F = vehicle damage factor). Typical design here: subgrade CBR 8%, 50 msa → BC 50 + DBM 100 + WMM 250 + GSB 200 mm (similar to IRC catalogue outputs).',
    facts: ['Overloaded trucks are one of the biggest causes of premature road failure.'],
  },
});

// =========================================================================
export default {
  id: 'road',
  name: 'Road Construction',
  category: 'buildings',
  tagline: 'Peel back an urban street: from compacted soil to asphalt, pipes and paint.',
  description:
    'A 30 m segment of a modern urban dual carriageway, cut away at one end to reveal its layered flexible pavement. Explode it like a layer cake, replay the construction sequence, and discover the drains, sewers, water, gas, power and fibre hidden beneath your feet.',
  camera: { position: [28, 16, 24], target: [1, 2, 0] },
  explodeScale: 1,
  stages,
  systems,
  parts,
  steps: [
    {
      title: 'Why layers?',
      text: 'A truck tyre presses on the road at about the same pressure as the air in it — far too much for soil to bear. A flexible pavement stacks layers of decreasing strength: each one spreads the load wider, so by the time it reaches the soil the pressure is small enough to carry safely.',
      focus: ['wearing-course', 'binder-course', 'base-course', 'sub-base', 'compacted-subgrade', 'truck'],
      explode: 0.6,
      animate: true,
    },
    {
      title: 'Subgrade',
      text: 'Everything rests on the soil. Its strength is measured with the CBR test; the top 500 mm is laid in layers and compacted to at least 97% of its maximum density so it will not settle or rut.',
      focus: ['natural-subgrade', 'compacted-subgrade'],
      explode: 0.5,
      animate: false,
    },
    {
      title: 'Granular layers',
      text: 'A geotextile keeps clay out of the stone layers. Then 200 mm of granular sub-base and 250 mm of wet-mix macadam (crushed rock) are compacted. They spread load and drain away any water that gets in.',
      focus: ['geotextile', 'sub-base', 'base-course', 'prime-coat'],
      explode: 0.7,
      animate: false,
    },
    {
      title: 'Asphalt layers',
      text: 'A prime coat seals the stone base. Then 100 mm of dense bituminous macadam (the binder course) and 50 mm of bituminous concrete (the wearing course) are laid hot and rolled, glued together by a thin tack coat. The surface is cambered so rain runs off.',
      focus: ['prime-coat', 'binder-course', 'tack-coat', 'wearing-course'],
      explode: 0.8,
      animate: false,
    },
    {
      title: 'Drainage',
      text: 'Water weakens roads, so it must be removed fast. Rain runs to the gutters, drops through gully gratings, and flows by gravity in large storm drains. A separate, deeper sewer carries wastewater; manholes give access to both.',
      focus: ['gutters', 'gullies', 'storm-drains', 'manholes', 'sewer'],
      explode: 0.5,
      animate: false,
    },
    {
      title: 'Utilities beneath',
      text: 'Under the footpaths run the city\'s lifelines: a blue water main and fibre ducts on one side, a yellow gas main and power ducts on the other. Putting them under the footpath means they can be repaired without digging up the carriageway.',
      focus: ['water-main', 'gas-main', 'power-ducts', 'telecom-ducts', 'footpath-base', 'footpaths'],
      explode: 0.6,
      animate: false,
    },
    {
      title: 'Markings & safety',
      text: 'Lane lines, stop lines and a zebra crossing organise traffic; road studs glow in headlights. Kerbs and the median separate people and opposing traffic, the crash barrier protects the narrow section, and signals, signs and street lights complete the road.',
      focus: ['lane-markings', 'zebra-crossing', 'road-studs', 'kerbs', 'median', 'median-plants', 'crash-barrier', 'traffic-signal', 'signboard', 'street-lights'],
      explode: 0.3,
      animate: true,
    },
  ],
};
