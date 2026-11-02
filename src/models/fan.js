import { M } from '../three/materials.js';

/*
 * Ceiling fan, 1200 mm (48") sweep, outer-rotor PSC induction motor (the classic
 * design used in most of Asia and in budget fans everywhere).
 * Fan axis = world Y through the origin. Ceiling underside at y = 1.0, blades at y ≈ 0.59.
 *
 * Rotating assembly (rotor, both motor covers, blade irons, blades, blade screws) all
 * share SPIN, so it turns as one body. Negative speed = clockwise seen from above
 * (counter-clockwise seen from the floor – "summer"/downdraft direction). The stator,
 * shaft, downrod and light kit stay still, exactly as in a real outer-rotor fan.
 */

const PI = Math.PI;
const TAU = PI * 2;
const FLAT = [PI / 2, 0, 0]; // lays an XY torus/ring flat (axis = Y)
const SPEED = -3;
const SPIN = { type: 'spin', axis: 'y', speed: SPEED };
const BLADE_Y = 0.592;
const PITCH = -0.2; // ≈11.5° blade pitch, leading edge up → air pushed down
const DOUBLE = (m) => ({ ...m, side: 'double' });

/** Euler XYZ angles equivalent to Ry(theta) · Rx(a): tilt about the blade axis first, then sweep around Y. */
function rotYX(theta, a) {
  const st = Math.sin(theta), ct = Math.cos(theta), sa = Math.sin(a), ca = Math.cos(a);
  return [Math.atan2(sa, ct * ca), Math.asin(Math.max(-1, Math.min(1, st * ca))), Math.atan2(-st * sa, ct)];
}

/** Blade planform in XY: x = distance from the axis, y = chord. Rounded tip. */
const BLADE_OUTLINE = (() => {
  const pts = [[0.18, -0.028], [0.215, -0.04], [0.26, -0.05], [0.33, -0.056], [0.545, -0.057]];
  for (let i = 1; i < 12; i++) {
    const a = -PI / 2 + (i / 12) * PI;
    pts.push([0.545 + 0.057 * Math.cos(a), 0.057 * Math.sin(a)]);
  }
  pts.push([0.545, 0.057], [0.33, 0.056], [0.26, 0.05], [0.215, 0.04], [0.18, 0.028]);
  return pts;
})();

/** Blade iron side profile (XY): bolts under the motor, steps up, runs out under the blade root. */
const IRON_OUTLINE = [
  [0.085, -0.017], [0.128, -0.017], [0.158, -0.003], [0.282, -0.003], [0.29, 0.0005],
  [0.282, 0.004], [0.155, 0.004], [0.125, -0.01], [0.085, -0.01],
];

const TOP_COVER = [[0.13, 0], [0.132, 0.012], [0.124, 0.03], [0.1, 0.05], [0.06, 0.062], [0.032, 0.066], [0.028, 0.07]];
const BOTTOM_COVER = [[0.028, -0.066], [0.05, -0.064], [0.08, -0.058], [0.104, -0.048], [0.12, -0.034], [0.129, -0.016], [0.13, 0]];
const RING = (ri, ro, h) => [[ri, -h / 2], [ro, -h / 2], [ro, h / 2], [ri, h / 2], [ri, -h / 2]];

const nickel = (o = 1) => ({ ...M.brushed('#b9bdc2'), opacity: o });
const coverMat = DOUBLE({ ...M.brushed('#c3c6ca'), opacity: 0.4 });
const copper = { ...M.copper(), emissive: '#ff7a20', emissiveIntensity: 0.12 };

function bearingShapes() {
  return [
    { type: 'lathe', points: RING(0.019, 0.026, 0.01), segments: 32, material: M.chrome() },
    { type: 'lathe', points: RING(0.009, 0.014, 0.01), segments: 32, material: M.chrome() },
    { type: 'sphere', radius: 0.0036, widthSegments: 12, heightSegments: 8, position: [0.0165, 0, 0],
      array: { count: 8, rotation: [0, TAU / 8, 0] }, material: M.metal('#d6dbe0') },
    { type: 'torus', radius: 0.0165, tube: 0.0012, radialSegments: 4, tubularSegments: 40, rotation: FLAT,
      position: [0, 0.0038, 0], material: M.brass() },
  ];
}

const blades = [0, 1, 2].map((i) => {
  const theta = (i * TAU) / 3;
  const dir = [Math.cos(theta), 0, -Math.sin(theta)];
  return {
    id: `blade-${i + 1}`,
    name: `Blade ${i + 1}`,
    system: 'rotating',
    position: [0, BLADE_Y, 0],
    explode: [dir[0] * 0.38, -0.22, dir[2] * 0.38],
    anim: SPIN,
    shapes: [
      { type: 'extrude', outline: BLADE_OUTLINE, depth: 0.006, bevel: 0.002, rotation: rotYX(theta, -PI / 2 + PITCH),
        material: { ...M.wood('#6e4528'), clearcoat: 0.6, clearcoatRoughness: 0.3, roughness: 0.45 } },
    ],
    info: {
      what: `One of the three fan blades – a thin, slightly tilted paddle that ${i === 0 ? 'moves' : 'helps move'} the air.`,
      location: `Bolted on top of blade iron ${i + 1}, sticking out sideways from the motor at ${i * 120}° around the circle.`,
      purpose: 'Pushes air downwards as it sweeps around, creating the cooling breeze you feel underneath.',
      how: 'Each blade is twisted a little (pitched) so its front edge is higher than its back edge. As it sweeps round, the tilted surface shoves the air in front of it downward – like a hand paddling water – and lower pressure above pulls fresh air in from the ceiling side.',
      connections: ['blade-irons', 'blade-screws', 'rotor', `blade-${((i + 1) % 3) + 1}`],
      examples: 'Aircraft propellers, boat propellers and the blades of a desk fan or wind turbine all work on the same tilted-surface principle (wind turbines just run it in reverse).',
      advanced: 'Blades are pressed aluminium, MDF/plywood or ABS, ~420 mm long on a 1200 mm sweep with ~10–14° pitch. Air delivery (BEE/IS 374 rating) is ~210–230 m³/min (CMM) at ~350 rpm. Higher pitch moves more air per turn but needs more torque, so pitch is matched to the motor. All three blades must be within a few grams of each other – an imbalance as small as 5 g at the tip causes visible wobble, fixed with clip-on balancing weights.',
      facts: i === 0
        ? ['A ceiling fan does not cool the air – it cools you by speeding up sweat evaporation, which feels about 2–3 °C cooler.']
        : i === 1
          ? ['More blades are not automatically better: 3-blade fans usually move more air than 5-blade ones at the same power, because each blade drags less.']
          : ['Reversing the fan (on fans that allow it) gently pulls air up in winter, pushing warm ceiling air back down the walls.'],
    },
  };
});

export default {
  id: 'fan',
  name: 'Ceiling Fan',
  category: 'appliances',
  tagline: 'A spinning magnet trick that moves 200 cubic metres of air a minute.',
  description:
    'A 1200 mm (48") ceiling fan with an outer-rotor, capacitor-run induction motor – the outside of the motor spins around a fixed copper-wound core and carries the blades with it. Explode it to see how it hangs from the ceiling, how the motor is built, and follow the power from the switch to the breeze.',
  camera: { position: [1.5, 0.38, 1.75], target: [0, 0.7, 0] },
  explodeScale: 1,
  systems: [
    { id: 'mounting', name: 'Mounting', color: '#a3a8b3' },
    { id: 'motor', name: 'Motor', color: '#f4a261' },
    { id: 'rotating', name: 'Rotating Assembly', color: '#4cc9f0' },
    { id: 'electrical', name: 'Electrical', color: '#facc15' },
    { id: 'light', name: 'Light Kit', color: '#fde68a' },
  ],
  parts: [
    // ------------------------------------------------------------ mounting
    {
      id: 'ceiling-slab',
      name: 'Ceiling',
      system: 'mounting',
      position: [0, 1.04, 0],
      explode: [0, 0.35, 0],
      ghost: true,
      shapes: [
        { type: 'box', size: [1.5, 0.08, 1.5], radius: 0.01, material: M.plaster() },
        { type: 'cylinder', radius: 0.055, height: 0.05, position: [0, -0.012, 0], material: M.plastic('#8a8f98') },
      ],
      info: {
        what: 'The ceiling the fan hangs from, shown see-through, with an electrical box set into it.',
        location: 'At the very top. The fan bracket is screwed to it and the house wiring comes out of the round box in it.',
        purpose: 'Carries the full weight of the fan plus the twisting and wobbling forces it creates, and supplies mains power.',
        how: 'A fan must be fixed to something structural – a concrete slab hook or a joist – not just to plasterboard. The ceiling box holds the wiring connections and, in fan-rated boxes, takes the load too.',
        connections: ['mounting-bracket', 'wiring', 'safety-cable'],
        examples: 'In concrete homes fans hang from a hook cast into the slab; in timber homes from a "fan-rated" metal box screwed to a joist.',
        advanced: 'Fan-rated ceiling boxes (UL 514A in the US) are tested for ~16–32 kg static load plus dynamic loads. A running fan with a slightly unbalanced rotor applies a cyclic force at its rotation frequency (~5–6 Hz), which is why loose mounts loosen further over time. Minimum blade height above the floor is normally 2.1 m (7 ft); 2.4–2.7 m is ideal.',
        facts: ['Blades should be at least about 25–30 cm below the ceiling – too close and the fan starves itself of air.'],
      },
    },
    {
      id: 'mounting-bracket',
      name: 'Ceiling Mounting Bracket',
      system: 'mounting',
      position: [0, 0.985, 0],
      explode: [0, 0.25, 0],
      shapes: [
        { type: 'box', size: [0.17, 0.006, 0.05], radius: 0.002, position: [0, 0.012, 0], material: M.steel('#7d858f') },
        { type: 'box', size: [0.006, 0.048, 0.05], radius: 0.002, position: [-0.046, -0.012, 0], array: { count: 2, offset: [0.092, 0, 0] }, material: M.steel('#7d858f') },
        { type: 'box', size: [0.03, 0.005, 0.05], radius: 0.002, position: [-0.034, -0.036, 0], array: { count: 2, offset: [0.068, 0, 0] }, material: M.steel('#7d858f') },
        // anchor screws up into the ceiling
        { type: 'cylinder', radius: 0.0035, height: 0.05, position: [-0.068, 0.035, 0], array: { count: 2, offset: [0.136, 0, 0] }, material: M.chrome() },
        { type: 'cylinder', radius: 0.008, height: 0.003, position: [-0.068, 0.0165, 0], array: { count: 2, offset: [0.136, 0, 0] }, material: M.chrome() },
      ],
      info: {
        what: 'A bent steel bracket screwed to the ceiling that the whole fan hangs on.',
        location: 'Hidden inside the canopy, directly against the ceiling.',
        purpose: 'Gives the hanger ball a secure, cupped seat and spreads the fan’s weight into the ceiling fixings.',
        how: 'Two screws or bolts fix the flat top to the ceiling box. The bent-down legs end in a slotted lip; the ball on top of the downrod drops into the slot and rests there, free to tilt slightly so the fan always hangs straight down.',
        connections: ['ceiling-slab', 'hanger-ball', 'canopy', 'safety-cable'],
        examples: 'Older fans used a simple hook in the ceiling instead; the "ball and socket" bracket is now standard because it self-levels on sloped ceilings.',
        advanced: 'Typically 1.5–2 mm galvanised steel. The slot has a key that engages a tab on the hanger ball so the downrod cannot rotate (motor reaction torque would otherwise twist the wiring). Ball-and-socket mounting tolerates ceiling slopes up to about 30–35°; steeper ceilings need an angle adapter.',
        facts: ['The motor pushes back on its mount with the same torque it applies to the blades – the anti-rotation key stops the whole fan slowly twisting.'],
      },
    },
    {
      id: 'canopy',
      name: 'Canopy',
      system: 'mounting',
      position: [0, 0.95, 0],
      explode: [0, 0.12, 0],
      shapes: [
        { type: 'lathe', segments: 48, points: [[0.014, -0.05], [0.03, -0.05], [0.058, -0.042], [0.076, -0.02], [0.084, 0.015], [0.086, 0.043], [0.09, 0.048]],
          material: DOUBLE({ ...M.brushed('#c3c6ca'), opacity: 0.32 }) },
        { type: 'cylinder', radius: 0.019, height: 0.018, position: [0, -0.058, 0], material: nickel() },
        { type: 'torus', radius: 0.086, tube: 0.0025, radialSegments: 8, tubularSegments: 64, rotation: FLAT, position: [0, 0.046, 0], material: nickel(0.7) },
      ],
      info: {
        what: 'The decorative bell-shaped cover just under the ceiling.',
        location: 'Directly beneath the ceiling, wrapped around the bracket, hanger ball, capacitor and receiver (shown see-through).',
        purpose: 'Hides the bracket and wiring joints and keeps fingers and dust away from live connections.',
        how: 'After the fan is hung and wired, the canopy is slid up the downrod and screwed to the bracket. The small collar at its bottom closes the gap around the downrod.',
        connections: ['mounting-bracket', 'downrod', 'capacitor', 'remote-receiver'],
        examples: 'Many fans have room inside the canopy for a remote-control receiver, which is why remotes can often be retro-fitted.',
        advanced: 'Usually spun or deep-drawn steel or aluminium (sometimes ABS). It is not load-bearing; it is fixed with 2–3 screws to the bracket and should not touch the downrod, or it will rattle with the motor vibration.',
        facts: ['A rattling noise near the ceiling is very often just a loose canopy screw.'],
      },
    },
    {
      id: 'hanger-ball',
      name: 'Hanger Ball',
      system: 'mounting',
      position: [0, 0.952, 0],
      explode: [0, 0.08, 0],
      shapes: [
        { type: 'sphere', radius: 0.022, widthSegments: 32, heightSegments: 20, material: M.plastic('#2a2d33') },
        { type: 'box', size: [0.008, 0.016, 0.01], radius: 0.002, position: [0.024, -0.004, 0], material: M.plastic('#2a2d33') },
        { type: 'cylinder', radius: 0.003, height: 0.05, rotation: [0, 0, PI / 2], position: [0, -0.004, 0], material: M.chrome() },
      ],
      info: {
        what: 'A rubber-like ball fixed to the top of the downrod.',
        location: 'Sitting in the slot of the mounting bracket, inside the canopy.',
        purpose: 'Lets the fan hang perfectly vertical and absorbs vibration, like a hip joint for the fan.',
        how: 'The ball rests in the bracket’s cup. Because it can roll slightly, gravity always pulls the fan to hang straight, even on a sloping ceiling. A pin through the ball locks it to the downrod and a small tab locks it against turning.',
        connections: ['mounting-bracket', 'downrod', 'canopy'],
        examples: 'Ball joints in car suspension and shoulder joints in your body allow the same free tilting.',
        advanced: 'Made of glass-filled nylon or zinc with a rubber isolation layer. A cross pin (and set screw) through the downrod carries the full axial load in shear, so its pin must always be fitted with a cotter clip. The tab/key mates with the bracket slot to react motor torque.',
        facts: ['A fan wobble is rarely the ball – it is almost always unbalanced or bent blades.'],
      },
    },
    {
      id: 'downrod',
      name: 'Downrod',
      system: 'mounting',
      position: [0, 0.829, 0],
      explode: [0, 0.04, 0],
      shapes: [
        { type: 'cylinder', radius: 0.012, height: 0.258, segments: 32, material: M.brushed('#b9bdc2') },
        { type: 'cylinder', radius: 0.0125, height: 0.004, segments: 32, position: [0, -0.1, 0], material: M.brushed('#9aa0a6') },
      ],
      info: {
        what: 'A hollow metal pipe that the fan motor hangs from.',
        location: 'Between the hanger ball in the canopy and the motor coupling on top of the motor.',
        purpose: 'Sets how far the blades hang below the ceiling and carries the wires down to the motor inside it.',
        how: 'Its top is pinned to the hanger ball and its bottom is pinned and screwed into the motor coupling (yoke). The supply wires run down the hollow inside so they are protected from the spinning parts.',
        connections: ['hanger-ball', 'shaft', 'wiring', 'safety-cable', 'canopy'],
        examples: 'High-ceiling rooms use long downrods (60–150 cm); low rooms use a short one or a "hugger" mount with no downrod at all.',
        advanced: 'Usually 3/4" (≈20–25 mm OD) steel tube, 100–300 mm long as standard. Rule of thumb: downrod length ≈ ceiling height − 2.4 m (so blades sit ~2.1–2.4 m above the floor). Longer rods lower the natural pendulum frequency, so very long rods need careful balancing.',
        facts: ['Optimum airflow needs about 25–30 cm between blades and ceiling – the downrod guarantees it.'],
      },
    },
    {
      id: 'safety-cable',
      name: 'Safety Cable',
      system: 'mounting',
      position: [0, 0, 0],
      explode: [0.16, 0.1, 0],
      shapes: [
        { type: 'tube', radius: 0.0018, radialSegments: 6, segments: 120,
          points: [[0.03, 0.997, -0.015], [0.026, 0.96, -0.018], [0.02, 0.9, -0.019], [0.019, 0.8, -0.019], [0.02, 0.73, -0.018], [0.024, 0.712, -0.008], [0.026, 0.708, 0.006]],
          material: M.steel('#9aa3ad') },
        { type: 'torus', radius: 0.026, tube: 0.0018, radialSegments: 6, tubularSegments: 48, rotation: FLAT, position: [0, 0.708, 0], material: M.steel('#9aa3ad') },
        { type: 'cylinder', radius: 0.004, height: 0.008, position: [0.03, 0.992, -0.015], material: M.brass() },
      ],
      info: {
        what: 'A thin braided steel wire that acts as a back-up hanger.',
        location: 'Tied to the ceiling structure at the top and looped around the motor coupling below.',
        purpose: 'Catches the fan if the bracket, ball or downrod pin ever fails, so the fan cannot fall.',
        how: 'It hangs slightly slack and normally carries no load. If the main mounting breaks, the cable instantly takes the weight of the motor and blades.',
        connections: ['mounting-bracket', 'ceiling-slab', 'shaft', 'downrod'],
        examples: 'Required by many electrical codes and standards for ceiling fans, just as stage lights in theatres have safety chains.',
        advanced: 'Galvanised steel wire rope (~2 mm, breaking strength several hundred kg) secured with a crimp ferrule. It should be anchored independently of the bracket – ideally to the slab hook or joist – so a single failure cannot drop the fan.',
        facts: ['A falling 6 kg fan motor carries enough energy to cause serious injury – hence a second, independent support.'],
      },
    },

    // ------------------------------------------------------------ electrical
    {
      id: 'capacitor',
      name: 'Run Capacitor',
      system: 'electrical',
      position: [0.05, 0.94, 0],
      explode: [0.28, 0.14, 0],
      shapes: [
        { type: 'cylinder', radius: 0.013, height: 0.042, rotation: [PI / 2, 0, 0], material: M.plastic('#1e2024') },
        { type: 'cylinder', radius: 0.0132, height: 0.012, rotation: [PI / 2, 0, 0], material: M.plastic('#c7a33a') },
        { type: 'cylinder', radius: 0.011, height: 0.004, rotation: [PI / 2, 0, 0], position: [0, 0, 0.022], array: { count: 2, offset: [0, 0, -0.044] }, material: M.plastic('#3b3f46') },
      ],
      info: {
        what: 'A small cylinder that stores and releases electric charge – the component that gets the fan motor turning.',
        location: 'Inside the canopy near the ceiling (in some fans it sits on top of the motor instead).',
        purpose: 'Creates a second, time-shifted current in the motor’s auxiliary winding so the magnetic field rotates instead of just pulsing.',
        how: 'Single-phase mains only goes back and forth, which on its own cannot decide which way to turn a motor. The capacitor makes the current in the second winding peak a little earlier than in the main winding. The two windings, placed at 90° to each other, then produce a field that sweeps around in one direction and drags the rotor with it.',
        connections: ['stator-windings', 'remote-receiver', 'wiring'],
        examples: 'The same "run capacitors" are found in air-conditioner fans, pumps and washing machines. A fan that hums but will not start (or starts only when pushed) usually has a dead capacitor.',
        advanced: 'Metallised polypropylene film, typically 2.25–3.15 µF (2.5 µF common for 1200 mm fans), 440 V AC rating, ±5 %. This is a PSC (permanent split capacitor) motor: the capacitor stays in circuit all the time, giving the auxiliary winding a ~90° phase lead at the design operating point, so starting torque and running efficiency are both reasonable. Capacitance loss with age reduces speed long before total failure.',
        facts: ['Swapping a 3 µF capacitor for a 2 µF one makes the same fan run noticeably slower.', 'Capacitor-step speed regulators save energy; old resistor regulators wasted the excess as heat.'],
      },
    },
    {
      id: 'remote-receiver',
      name: 'Remote Receiver & Speed Regulator',
      system: 'electrical',
      position: [-0.05, 0.94, 0],
      explode: [-0.28, 0.14, 0],
      shapes: [
        { type: 'box', size: [0.026, 0.022, 0.06], radius: 0.003, material: M.plastic('#e4e5e7') },
        { type: 'box', size: [0.02, 0.002, 0.05], position: [0, 0.012, 0], material: M.plastic('#1f7a43') },
        { type: 'box', size: [0.008, 0.004, 0.008], position: [0, 0.015, -0.01], array: { count: 3, offset: [0, 0, 0.014] }, material: M.plastic('#15171a') },
        { type: 'tube', radius: 0.0008, radialSegments: 5, points: [[0, 0.01, 0.03], [0.005, 0.0, 0.05], [0.02, -0.02, 0.065], [0.03, -0.04, 0.06]], material: M.wire('#d9d9d9') },
      ],
      info: {
        what: 'A small control box that listens to the remote and sets the fan speed and light.',
        location: 'Inside the canopy, wired between the house supply and the motor.',
        purpose: 'Lets you choose speeds (usually 3–5) and switch the light without pull chains or a wall dimmer.',
        how: 'A radio (or infrared) receiver decodes the button you press. Small relays then switch different capacitors in series with the motor: a smaller capacitor lets less current through, so the motor produces less torque and settles at a lower speed. A separate relay or triac switches the light.',
        connections: ['capacitor', 'wiring', 'stator-windings', 'led-light', 'ceiling-slab'],
        examples: 'Wall-mounted "step" regulators in many homes do the same job with a rotary switch. Smart fans add Wi-Fi so speed can be set from an app.',
        advanced: 'Induction fans are slowed by reducing stator voltage (they are "slip-controlled"): capacitive droppers (e.g. 2.2/3.3/4.7 µF steps) or a triac phase-angle controller. Capacitive steps are near loss-free; triac control can cause motor hum. BLDC fans are different: their built-in driver changes the electronic commutation frequency, giving 5–6 efficient speeds at only ~5–30 W.',
        facts: ['Remote fans often use 433 MHz radio, so they work even through the canopy and walls.'],
      },
    },
    {
      id: 'wiring',
      name: 'Wiring',
      system: 'electrical',
      position: [0, 0, 0],
      explode: [0, 0.1, 0.2],
      anim: { type: 'flow', speed: 3 },
      shapes: [
        { type: 'tube', radius: 0.0022, radialSegments: 6, segments: 60,
          points: [[0.012, 1.0, 0.03], [0.01, 0.975, 0.035], [-0.03, 0.96, 0.03], [-0.05, 0.952, 0.02]],
          material: { ...M.wire('#8a4b20'), emissive: '#ff9d3a', emissiveIntensity: 0.25 } },
        { type: 'tube', radius: 0.0022, radialSegments: 6, segments: 60,
          points: [[-0.012, 1.0, 0.03], [-0.01, 0.975, 0.04], [0.02, 0.962, 0.035], [0.05, 0.955, 0.022]],
          material: { ...M.wire('#2f55c9'), emissive: '#5c8dff', emissiveIntensity: 0.25 } },
        { type: 'tube', radius: 0.002, radialSegments: 6, segments: 140,
          points: [[-0.05, 0.93, -0.03], [-0.02, 0.925, -0.01], [0.004, 0.91, -0.004], [0.004, 0.8, -0.004], [0.004, 0.7, -0.004], [0.004, 0.68, -0.006], [0.03, 0.668, -0.03], [0.05, 0.66, -0.04]],
          material: { ...M.wire('#c0392b'), emissive: '#ff5a3a', emissiveIntensity: 0.25 } },
        { type: 'tube', radius: 0.002, radialSegments: 6, segments: 140,
          points: [[0.05, 0.93, -0.024], [0.02, 0.925, -0.01], [-0.004, 0.91, 0.004], [-0.004, 0.8, 0.004], [-0.004, 0.7, 0.004], [-0.004, 0.68, 0.006], [-0.03, 0.668, 0.03], [-0.05, 0.66, 0.04]],
          material: { ...M.wire('#f4c430'), emissive: '#ffd84a', emissiveIntensity: 0.25 } },
      ],
      info: {
        what: 'The insulated copper wires that carry electricity from the house supply to the receiver, capacitor and motor windings.',
        location: 'From the ceiling box, through the canopy, down the inside of the hollow downrod and shaft, and out to the stator windings.',
        purpose: 'Delivers power to the motor and light while staying clear of every spinning part.',
        how: 'Live and neutral come from the ceiling. The live goes through the receiver/regulator, then splits: one path goes straight to the main winding, the other through the capacitor to the auxiliary winding. Because the shaft is fixed, the wires can run down its hollow centre without twisting.',
        connections: ['ceiling-slab', 'remote-receiver', 'capacitor', 'downrod', 'shaft', 'stator-windings', 'switch-housing'],
        examples: 'Fans usually have colour-coded leads: e.g. brown/black = live, blue/white = neutral, green/yellow = earth; a separate lead (often blue in US kits) feeds the light.',
        advanced: 'Leads are typically 0.75 mm² (18 AWG) multi-strand with 105 °C PVC or silicone insulation. A 75 W fan draws only ~0.33 A at 230 V (≈0.65 A at 120 V). The metal frame must be earthed (Class I) unless the fan is double-insulated (Class II).',
        facts: ['Power factor of a capacitor-run fan is high – about 0.95 – because the capacitor partly cancels the motor’s inductance.'],
      },
    },

    // ------------------------------------------------------------ motor (stationary)
    {
      id: 'shaft',
      name: 'Hollow Shaft & Coupling',
      system: 'motor',
      position: [0, 0.615, 0],
      explode: [0, 0.02, 0],
      shapes: [
        { type: 'cylinder', radius: 0.009, height: 0.17, segments: 24, material: M.steel('#8d96a1') },
        { type: 'cylinder', radius: 0.019, height: 0.03, segments: 32, position: [0, 0.092, 0], material: M.castIron() },
        { type: 'cylinder', radius: 0.0028, height: 0.05, rotation: [0, 0, PI / 2], position: [0, 0.095, 0], material: M.chrome() },
        { type: 'cylinder', radius: 0.012, height: 0.006, segments: 6, position: [0, -0.07, 0], material: M.chrome() },
      ],
      info: {
        what: 'The central steel axle of the motor. Unusually, in this type of fan it does NOT turn – everything else turns around it.',
        location: 'Running down the centre of the motor, from the coupling at the top (joined to the downrod) to the light kit underneath.',
        purpose: 'Holds the stator still, supports both bearings, and carries the wires down its hollow middle.',
        how: 'The downrod is pinned into the cast coupling (yoke) on top. The stator core is pressed onto the middle of the shaft, and the two ball bearings let the rotor and covers spin freely around it.',
        connections: ['downrod', 'stator-core', 'upper-bearing', 'lower-bearing', 'safety-cable', 'switch-housing'],
        examples: 'Bicycle hubs work the same way: the axle is clamped to the frame and the wheel spins around it.',
        advanced: 'Hollow EN8/C45 steel, ~12–17 mm at the bearing seats (e.g. 6201/6202 bearings), with a knurled section the stator is pressed onto. A stationary-shaft, outer-rotor layout gives a large rotor diameter – lots of torque at low speed – and lets wiring pass through without slip rings.',
        facts: ['Most ceiling fans have no gearbox – the motor is designed to turn directly at blade speed (~300–400 rpm).'],
      },
    },
    {
      id: 'stator-core',
      name: 'Stator Core',
      system: 'motor',
      position: [0, 0.62, 0],
      explode: [0, 0, 0],
      shapes: [
        { type: 'cylinder', radius: 0.082, height: 0.05, segments: 54, material: M.steel('#5d6670') },
        { type: 'torus', radius: 0.0822, tube: 0.0007, radialSegments: 4, tubularSegments: 72, rotation: FLAT, position: [0, -0.02, 0],
          array: { count: 9, offset: [0, 0.005, 0] }, material: M.steel('#434a53') },
        { type: 'box', size: [0.012, 0.0515, 0.006], position: [0.077, 0, 0], array: { count: 18, rotation: [0, TAU / 18, 0] }, material: M.plastic('#d8c27a') },
        { type: 'cylinder', radius: 0.024, height: 0.064, segments: 32, material: M.aluminium() },
      ],
      info: {
        what: 'The fixed, slotted iron core of the motor – the "stator" (the part that stays stationary).',
        location: 'In the middle of the motor, pressed onto the shaft and surrounded closely by the spinning rotor.',
        purpose: 'Holds the copper windings and guides their magnetic field straight across a tiny air gap into the rotor.',
        how: 'It is built from hundreds of thin steel sheets ("laminations") stacked and pressed together. Slots around the edge hold the coils. Iron conducts magnetic field thousands of times better than air, so the core concentrates the field exactly where it is needed.',
        connections: ['stator-windings', 'shaft', 'rotor'],
        examples: 'Every transformer, induction motor and alternator uses a laminated electrical-steel core.',
        advanced: 'Silicon (CRNGO) electrical steel, 0.35–0.5 mm laminations with insulating coating to block eddy currents; ~16–18 slots for a 14–18 pole winding. Air gap to the rotor is only ~0.3–0.5 mm. Core losses (hysteresis + eddy) are a few watts – a big part of why induction fans are less efficient than BLDC fans.',
        facts: ['The yellowish slot liners are insulating paper that stops the copper coils shorting against the iron.'],
      },
    },
    {
      id: 'stator-windings',
      name: 'Stator Windings',
      system: 'motor',
      position: [0, 0.62, 0],
      explode: [0, 0.07, 0],
      anim: { type: 'flow', speed: 4 },
      shapes: [
        { type: 'torus', radius: 0.012, tube: 0.0045, radialSegments: 6, tubularSegments: 24, scale: [1, 2.4, 1],
          rotation: [0, PI / 2 + PI / 18, 0], position: [0.07 * Math.cos(PI / 18), 0, -0.07 * Math.sin(PI / 18)],
          array: { count: 18, rotation: [0, TAU / 18, 0] }, material: copper },
        { type: 'torus', radius: 0.068, tube: 0.006, radialSegments: 8, tubularSegments: 72, rotation: FLAT, position: [0, 0.031, 0],
          array: { count: 2, offset: [0, -0.062, 0] }, material: copper },
      ],
      info: {
        what: 'Coils of enamelled copper wire wound into the stator slots – the electromagnets that drive the fan.',
        location: 'Wrapped through the slots of the stator core; their looped ends stick out above and below the core.',
        purpose: 'Turn electric current into a magnetic field that rotates around the motor.',
        how: 'There are two sets of coils: a main (running) winding and an auxiliary (starting) winding fed through the capacitor. Because their currents peak at different moments and the coils sit at different positions, the north and south poles they create appear to march around the stator – a rotating magnetic field.',
        connections: ['stator-core', 'capacitor', 'wiring', 'rotor', 'remote-receiver'],
        examples: 'Wound copper coils are the heart of electric motors in everything from drills to electric cars.',
        advanced: 'Class-F/H enamelled copper (~0.25–0.3 mm wire), two windings in space quadrature forming typically 14–18 poles. Synchronous speed n = 120·f / P → 375 rpm for 16 poles at 50 Hz; with slip the fan runs at ~330–360 rpm. Copper (I²R) loss is the largest loss in a ~75 W induction fan. A BLDC fan instead uses a 3-phase winding driven by an electronic inverter and permanent magnets in the rotor, cutting input to ~28–35 W for the same airflow.',
        facts: ['The windings of a fan can be several hundred metres of thin copper wire in total.'],
      },
    },

    // ------------------------------------------------------------ rotating assembly
    {
      id: 'rotor',
      name: 'Outer Rotor',
      system: 'rotating',
      position: [0, 0.62, 0],
      explode: [0, -0.15, 0],
      anim: SPIN,
      shapes: [
        { type: 'lathe', points: RING(0.0845, 0.1, 0.058), segments: 64, material: M.steel('#6f7885') },
        { type: 'torus', radius: 0.1002, tube: 0.0007, radialSegments: 4, tubularSegments: 72, rotation: FLAT, position: [0, -0.024, 0],
          array: { count: 9, offset: [0, 0.006, 0] }, material: M.steel('#4d555f') },
        { type: 'torus', radius: 0.092, tube: 0.0055, radialSegments: 8, tubularSegments: 72, rotation: FLAT, position: [0, 0.032, 0],
          array: { count: 2, offset: [0, -0.064, 0] }, material: M.aluminium() },
        { type: 'box', size: [0.004, 0.064, 0.005], position: [0.093, 0, 0], array: { count: 24, rotation: [0, TAU / 24, 0] }, material: M.aluminium() },
      ],
      info: {
        what: 'A heavy ring of laminated iron with aluminium bars cast through it, which spins around the stator.',
        location: 'Just outside the stator, clamped between the top and bottom motor covers.',
        purpose: 'The part the rotating magnetic field actually pushes – it turns the covers and the blades.',
        how: 'The rotating field sweeps across the aluminium bars and induces currents in them (that is why it is called an induction motor). Those currents make their own magnetic field, which is dragged along by the stator field. The rotor always runs a little slower than the field – this "slip" is what keeps the current, and so the torque, flowing.',
        connections: ['stator-core', 'stator-windings', 'top-cover', 'bottom-cover', 'blade-irons'],
        examples: 'The same squirrel-cage idea is used in most industrial motors, but there the rotor is on the inside. Outer-rotor designs are also used in drone motors and hub motors of e-bikes.',
        advanced: 'Squirrel-cage rotor with die-cast aluminium bars and end rings in a laminated steel ring. Putting the rotor outside gives a large radius (more torque per amp), a natural flywheel for smooth running and easy blade attachment. Slip at full speed is ~5–10 %; reducing stator voltage increases slip, which is how simple regulators slow the fan. In a BLDC fan this ring instead carries ferrite or NdFeB permanent magnets, so there are no rotor currents and no rotor copper/aluminium losses.',
        facts: ['If you could hold the rotor still, the windings would draw several times their normal current – which is why a jammed fan gets hot.'],
      },
    },
    {
      id: 'top-cover',
      name: 'Top Motor Cover',
      system: 'rotating',
      position: [0, 0.62, 0],
      explode: [0, 0.2, 0],
      anim: SPIN,
      shapes: [
        { type: 'lathe', points: TOP_COVER, segments: 64, material: coverMat },
        { type: 'torus', radius: 0.131, tube: 0.003, radialSegments: 8, tubularSegments: 80, rotation: FLAT, position: [0, 0.004, 0], material: nickel(0.6) },
        { type: 'box', size: [0.03, 0.002, 0.006], radius: 0.001, position: [0.085, 0.057, 0], rotation: [0, 0, -0.25],
          array: { count: 12, rotation: [0, TAU / 12, 0] }, material: DOUBLE({ ...M.plastic('#2a2d33'), opacity: 0.45 }) },
      ],
      info: {
        what: 'The upper half of the motor’s shell, shown semi-transparent so you can see inside.',
        location: 'On top of the motor, below the downrod coupling. It turns together with the rotor.',
        purpose: 'Holds the upper bearing, clamps the rotor, protects the windings and gives the fan its finished look.',
        how: 'The top and bottom covers are bolted together around the rotor ring, forming one rigid spinning body. Vent slots let heat from the windings escape. Its hub carries the outer ring of the upper bearing.',
        connections: ['rotor', 'bottom-cover', 'upper-bearing', 'shaft'],
        examples: 'On many Asian-style fans the entire motor body visibly spins; on many US-style fans a decorative stationary housing hides a spinning flywheel underneath.',
        advanced: 'Die-cast aluminium (ADC12) with powder-coat or plated finish. Aluminium conducts heat away from the stator (~120 W/m·K) and keeps rotating mass moderate. The bearing housings in both covers must be concentric within ~0.05 mm, or the air gap becomes uneven, causing noise and vibration.',
        facts: ['Motor-body temperature rise in a standard fan is limited to about 75 °C above room temperature by safety standards.'],
      },
    },
    {
      id: 'upper-bearing',
      name: 'Upper Ball Bearing',
      system: 'motor',
      position: [0, 0.665, 0],
      explode: [0, 0.1, 0],
      anim: { type: 'spin', axis: 'y', speed: SPEED * 0.4 },
      shapes: bearingShapes(),
      info: {
        what: 'A ring of steel balls between two hardened rings – it lets the motor body spin around the fixed shaft with almost no friction.',
        location: 'In the hub of the top cover, around the shaft.',
        purpose: 'Supports the weight of the rotor and blades and keeps the rotor exactly centred on the stator.',
        how: 'The inner ring is fixed to the shaft, the outer ring turns with the cover. The balls roll between them instead of sliding, and a cage keeps them evenly spaced. Grease sealed inside lubricates them for years.',
        connections: ['shaft', 'top-cover', 'lower-bearing', 'rotor'],
        examples: 'Skateboard wheels, bicycle hubs and computer cooling fans all rely on similar deep-groove ball bearings.',
        advanced: 'Typically a 6201ZZ or 6202ZZ deep-groove bearing (12/15 mm bore), shielded and greased for life. At 350 rpm and a few kg load it runs far below its rating, so life is limited mainly by grease ageing and dust. The cage (shown here turning at ~40 % of rotor speed) carries the balls around at roughly half the speed of the outer race.',
        facts: ['Cheap fans used plain bronze bushings needing oil; ball bearings made fans almost maintenance-free.'],
      },
    },
    {
      id: 'lower-bearing',
      name: 'Lower Ball Bearing',
      system: 'motor',
      position: [0, 0.575, 0],
      explode: [0, -0.22, 0],
      anim: { type: 'spin', axis: 'y', speed: SPEED * 0.4 },
      shapes: bearingShapes(),
      info: {
        what: 'The second ball bearing, at the bottom of the motor.',
        location: 'In the hub of the bottom cover, around the lower end of the shaft.',
        purpose: 'Together with the upper bearing it holds the spinning body straight so it cannot wobble or touch the stator.',
        how: 'Two bearings spaced apart act like two hands holding a stick – they resist tilting. The lower one takes mainly sideways (radial) load from any blade imbalance.',
        connections: ['shaft', 'bottom-cover', 'upper-bearing', 'rotor'],
        examples: 'Wheels on a car are held by a pair of bearings for the same reason.',
        advanced: 'A worn lower bearing is the usual cause of a grinding or ticking noise in an old fan. Bearings are normally pressed into the cover hubs with a light interference fit and retained with circlips; one bearing is axially fixed and the other allowed to float slightly for thermal expansion.',
        facts: ['A fan bearing can turn over 1 billion times across a 10-year life.'],
      },
    },
    {
      id: 'bottom-cover',
      name: 'Bottom Motor Cover',
      system: 'rotating',
      position: [0, 0.62, 0],
      explode: [0, -0.3, 0],
      anim: SPIN,
      shapes: [
        { type: 'lathe', points: BOTTOM_COVER, segments: 64, material: coverMat },
        { type: 'torus', radius: 0.13, tube: 0.003, radialSegments: 8, tubularSegments: 80, rotation: FLAT, position: [0, -0.004, 0], material: nickel(0.6) },
        { type: 'cylinder', radius: 0.0035, height: 0.012, position: [0.115, -0.008, 0], array: { count: 6, rotation: [0, TAU / 6, 0] }, material: M.chrome() },
      ],
      info: {
        what: 'The lower half of the motor shell (semi-transparent here).',
        location: 'Underneath the motor; the blade irons are bolted to it and the light kit hangs just below it.',
        purpose: 'Holds the lower bearing, closes the motor, and is the mounting point that carries the blade irons.',
        how: 'Six screws clamp it to the top cover with the rotor ring between them. When the rotor turns, the whole shell turns, and the blade irons bolted to it swing the blades around.',
        connections: ['top-cover', 'rotor', 'lower-bearing', 'blade-irons', 'switch-housing'],
        examples: 'Cleaning a fan usually means wiping the bottom cover and the top of the blades, where most dust settles.',
        advanced: 'Cast aluminium, machined bearing seat and blade-iron bosses. Because it is part of the rotating mass (~3–4 kg total), its balance matters: it is often dynamically balanced with the rotor before blades are added.',
        facts: ['The rotating parts of a typical ceiling fan weigh around 3–4 kg.'],
      },
    },
    {
      id: 'blade-irons',
      name: 'Blade Irons (Brackets)',
      system: 'rotating',
      position: [0, 0.58, 0],
      explode: [0, -0.22, 0],
      anim: SPIN,
      shapes: [
        { type: 'extrude', outline: IRON_OUTLINE, depth: 0.032, bevel: 0.002, array: { count: 3, rotation: [0, TAU / 3, 0] }, material: nickel() },
      ],
      info: {
        what: 'Three stamped metal arms that connect the blades to the motor.',
        location: 'Bolted underneath the bottom motor cover, reaching outward; each blade is screwed on top of one.',
        purpose: 'Transfer the motor’s turning force to the blades and set each blade’s height and pitch angle.',
        how: 'The inner end is screwed to the spinning motor body. The arm steps up and runs outward, and the blade root sits on its flat outer end. The angle at which the arm holds the blade sets the pitch.',
        connections: ['bottom-cover', 'rotor', 'blade-1', 'blade-2', 'blade-3', 'blade-screws'],
        examples: 'A bent blade iron is a common cause of fan wobble – the blade ends up at a different height or angle from the others.',
        advanced: 'Pressed steel or die-cast zinc/aluminium, ~3–5 mm thick, with rubber grommets in some designs to isolate vibration. They see a combined bending load from blade weight, centrifugal force (~20–40 N per blade at 350 rpm) and aerodynamic drag torque. Blade tracking tolerance is typically within ±3 mm at the tips.',
        facts: ['Measuring the height of each blade tip from the ceiling (blade "tracking") is the first step in fixing a wobble.'],
      },
    },
    ...blades,
    {
      id: 'blade-screws',
      name: 'Blade Screws',
      system: 'rotating',
      position: [0, BLADE_Y, 0],
      explode: [0, -0.08, 0],
      anim: SPIN,
      shapes: [
        { type: 'cylinder', radius: 0.0045, height: 0.03, segments: 12, position: [0.205, -0.006, 0],
          array: { count: 3, rotation: [0, TAU / 3, 0] }, material: M.chrome() },
        { type: 'cylinder', radius: 0.0045, height: 0.03, segments: 12, position: [0.258, -0.006, 0],
          array: { count: 3, rotation: [0, TAU / 3, 0] }, material: M.chrome() },
        { type: 'cylinder', radius: 0.0095, height: 0.004, segments: 20, position: [0.205, 0.0105, 0],
          array: { count: 3, rotation: [0, TAU / 3, 0] }, material: M.chrome() },
        { type: 'cylinder', radius: 0.0095, height: 0.004, segments: 20, position: [0.258, 0.0105, 0],
          array: { count: 3, rotation: [0, TAU / 3, 0] }, material: M.chrome() },
      ],
      info: {
        what: 'Small machine screws (with washers) that fix each blade to its blade iron.',
        location: 'Two per blade, through the blade root into the blade iron.',
        purpose: 'Clamp the blades firmly so they cannot shift, rattle or fly off.',
        how: 'Each screw passes through a hole in the blade and threads into the iron; a washer spreads the clamping force so the blade material is not crushed. Fans are designed so centrifugal force pulls the blade against the screws, not away from them.',
        connections: ['blade-1', 'blade-2', 'blade-3', 'blade-irons'],
        examples: 'Checking these screws once a year is the simplest fan maintenance – loose screws cause clicking and wobble.',
        advanced: 'Typically M5–M6 or #10-32 screws with fibre or rubber washers, often with thread-locking patch. Screws are loaded mostly in shear by centrifugal and drag forces; wood/MDF blades use metal inserts or wide washers to avoid creep loosening.',
        facts: ['A single loose blade screw can be heard as a regular tick every revolution – about 6 times a second.'],
      },
    },

    // ------------------------------------------------------------ light kit
    {
      id: 'switch-housing',
      name: 'Light-Kit Switch Housing',
      system: 'light',
      position: [0, 0.512, 0],
      explode: [0, -0.4, 0],
      shapes: [
        { type: 'lathe', segments: 48, points: [[0.0, -0.02], [0.045, -0.02], [0.047, -0.012], [0.04, 0.01], [0.022, 0.02], [0.013, 0.022]], material: nickel() },
        { type: 'tube', radius: 0.0012, radialSegments: 5, points: [[0.04, 0.0, 0], [0.06, -0.015, 0], [0.072, -0.04, 0], [0.074, -0.1, 0], [0.074, -0.13, 0]], material: M.brass() },
        { type: 'sphere', radius: 0.006, widthSegments: 16, heightSegments: 10, position: [0.074, -0.136, 0], material: M.brass() },
      ],
      info: {
        what: 'A small housing under the motor that holds the light’s connections and its pull-chain switch.',
        location: 'Screwed to the stationary bottom end of the shaft, just below the spinning bottom cover.',
        purpose: 'Joins the light kit to the fan and gives a manual on/off switch for the light.',
        how: 'The light wire comes down the hollow shaft into this housing. Pulling the chain turns a small rotary switch that connects or breaks the light circuit. Because it is fixed to the non-rotating shaft, it never spins.',
        connections: ['shaft', 'led-light', 'glass-bowl', 'wiring', 'bottom-cover'],
        examples: 'Many fans have two pull chains – one stepping through speeds and one for the light.',
        advanced: 'Stamped steel or zinc with a threaded 3/8"-IP nipple onto the shaft end. The pull switch is a ratchet rotary switch rated ~3 A/250 V. Remote-controlled fans often leave the chain in place but switched on permanently.',
        facts: ['Pull-chain switches are one of the most commonly replaced fan parts.'],
      },
    },
    {
      id: 'led-light',
      name: 'LED Light Module',
      system: 'light',
      position: [0, 0.488, 0],
      explode: [0, -0.48, 0],
      shapes: [
        { type: 'cylinder', radius: 0.044, height: 0.004, segments: 48, position: [0, 0.003, 0], material: M.aluminium() },
        { type: 'cylinder', radius: 0.04, height: 0.003, segments: 48, material: M.light('#fff3d6', 2.2) },
      ],
      info: {
        what: 'A flat disc of LEDs that lights the room below the fan.',
        location: 'Under the switch housing, inside the glass bowl.',
        purpose: 'Adds a ceiling light so the fan can replace an existing light fitting.',
        how: 'A small driver converts mains AC into a steady DC current for the LEDs. An aluminium plate behind them spreads out their heat, which keeps them bright and long-lived.',
        connections: ['switch-housing', 'glass-bowl', 'remote-receiver'],
        examples: 'Fan light kits used to take two or three incandescent bulbs (180 W!); LED modules give similar light from ~15–20 W.',
        advanced: '~15–24 W LED module, 1,200–2,000 lm, efficacy ~90–110 lm/W, CCT 3000–4000 K. Constant-current drivers with good PFC avoid flicker; some kits switch colour temperature by toggling the light power quickly.',
        facts: ['Some energy regulations cap fan light kits at about 190 W – a rule written for the old incandescent days.'],
      },
    },
    {
      id: 'glass-bowl',
      name: 'Glass Bowl Diffuser',
      system: 'light',
      position: [0, 0.49, 0],
      explode: [0, -0.56, 0],
      shapes: [
        { type: 'lathe', segments: 48, points: [[0.001, -0.052], [0.02, -0.05], [0.036, -0.043], [0.048, -0.031], [0.055, -0.016], [0.058, 0], [0.056, 0.004]],
          material: DOUBLE({ ...M.glass('#f6f1e6'), roughness: 0.35, opacity: 0.5 }) },
        { type: 'torus', radius: 0.057, tube: 0.0025, radialSegments: 8, tubularSegments: 48, rotation: FLAT, position: [0, 0.003, 0], material: nickel() },
      ],
      info: {
        what: 'A frosted glass cover over the light.',
        location: 'The lowest part of the fan, under the LED module.',
        purpose: 'Spreads the light evenly and hides the bright LED points to prevent glare.',
        how: 'The frosted (acid-etched or sand-blasted) surface scatters light in many directions, so the whole bowl glows softly instead of showing tiny dazzling dots.',
        connections: ['led-light', 'switch-housing'],
        examples: 'The same diffusers are used in pendant lights and bathroom fittings.',
        advanced: 'Soda-lime or opal glass ~2–3 mm thick, or polycarbonate for lighter weight. Diffuser transmission is ~70–85 %. It is held by a threaded finial or three thumb screws; the low mass keeps it from loading the switch housing.',
        facts: ['Opal glass gets its milky look from tiny particles that scatter light inside the glass itself.'],
      },
    },
  ],

  steps: [
    {
      title: '1 · Power in',
      text: 'Mains electricity comes from the ceiling box into the canopy. The remote receiver (or a wall regulator) decides how much voltage reaches the motor, then the current splits: straight into the main winding, and through the capacitor into the auxiliary winding.',
      focus: ['ceiling-slab', 'wiring', 'remote-receiver', 'capacitor', 'downrod'],
      explode: 0.25,
      animate: true,
    },
    {
      title: '2 · Magnetic field rotates',
      text: 'The capacitor makes the auxiliary winding’s current peak a quarter-cycle earlier than the main winding’s. With the two coil sets placed between each other around the stator, their combined magnetic poles march smoothly around the motor – a rotating magnetic field, made from plain single-phase power.',
      focus: ['stator-core', 'stator-windings', 'capacitor'],
      explode: 0.45,
      animate: true,
    },
    {
      title: '3 · Rotor spins',
      text: 'The moving field sweeps across the aluminium bars in the outer rotor and induces currents in them. Those currents feel a force that drags the rotor after the field. Because the rotor is outside the stator, the whole motor body – both covers – spins around the fixed shaft on its two ball bearings.',
      focus: ['rotor', 'top-cover', 'bottom-cover', 'upper-bearing', 'lower-bearing', 'shaft'],
      explode: 0.4,
      animate: true,
    },
    {
      title: '4 · Blades push air',
      text: 'The blade irons carry the turning force out to the three pitched blades. Each blade’s tilted surface shoves air downward as it sweeps round, creating a column of moving air – about 200+ cubic metres every minute for a 1200 mm fan – that cools you by speeding up evaporation from your skin.',
      focus: ['blade-irons', 'blade-1', 'blade-2', 'blade-3', 'blade-screws'],
      explode: 0.15,
      animate: true,
    },
    {
      title: '5 · Speed control',
      text: 'To slow down, the regulator puts a smaller capacitor (or a chopped voltage) in front of the motor. The weaker field lets the rotor slip further behind it, so the fan settles at a lower speed where the motor’s torque again matches the air resistance. BLDC fans do this electronically and use less than half the power.',
      focus: ['remote-receiver', 'capacitor', 'stator-windings', 'rotor'],
      explode: 0.3,
      animate: true,
    },
    {
      title: '6 · Hanging safely',
      text: 'All of this hangs from the ceiling bracket by the hanger ball, which lets the fan settle perfectly vertical. The anti-rotation key stops the motor’s reaction torque twisting the downrod, and an independent safety cable is ready to catch the fan if anything ever fails.',
      focus: ['mounting-bracket', 'hanger-ball', 'downrod', 'canopy', 'safety-cable'],
      explode: 0.3,
      animate: false,
    },
    {
      title: '7 · Light kit',
      text: 'Underneath, a light kit is screwed onto the stationary end of the shaft. Its wire comes down the hollow shaft, a pull chain or the remote switches it, and a frosted bowl softens the LED light.',
      focus: ['switch-housing', 'led-light', 'glass-bowl'],
      explode: 0.2,
      animate: true,
    },
  ],
};
