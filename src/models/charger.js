import { M } from '../three/materials.js';

/*
 * 65 W USB-C GaN wall charger, modelled at 8× real size (real body ≈ 42 × 42 × 37 mm,
 * here 0.34 × 0.34 × 0.30 m). It sits on its base (y = 0); the US-style AC prongs stick
 * out of the back (-Z) and the USB-C socket is on the front face (+Z).
 *
 * Inside: one horizontal main PCB (top surface y = 0.0364) carrying the input filter at
 * the back, the bulk capacitors on the left, the GaN switches + heat spreader on the right
 * and the flyback transformer in the middle, straddling the primary/secondary isolation
 * slot at z ≈ 0.06. A vertical daughter board at the front carries the USB-PD controller
 * and USB-C receptacle.
 */

const PI = Math.PI;
const Y0 = 0.0364; // top surface of the main PCB
const FLAT = [PI / 2, 0, 0]; // lays an XY outline / extrude flat in the XZ plane (outline y → world z)
const ALONG_X = [0, 0, PI / 2]; // Y-axis cylinder → X axis
const ALONG_Z = [PI / 2, 0, 0]; // Y-axis cylinder → Z axis

/** Rounded-rectangle outline (CCW). */
function rrect(w, h, r, seg = 6) {
  const hw = w / 2;
  const hh = h / 2;
  r = Math.min(r, hw, hh);
  const corners = [[hw - r, hh - r, 0], [-hw + r, hh - r, PI / 2], [-hw + r, -hh + r, PI], [hw - r, -hh + r, 1.5 * PI]];
  const pts = [];
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (PI / 2);
      pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
    }
  }
  return pts;
}

/** Rounded rectangle path that starts and ends either side of a small gap on its -y edge. */
function openRRect(w, h, r, gap, seg = 8) {
  const hw = w / 2;
  const hh = h / 2;
  const C = { 0: [hw - r, hh - r, 0], 1: [-hw + r, hh - r, PI / 2], 2: [-hw + r, -hh + r, PI], 3: [hw - r, -hh + r, 1.5 * PI] };
  const pts = [[gap, -hh]];
  for (const k of [3, 0, 1, 2]) {
    const [x, y, a0] = C[k];
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (PI / 2);
      pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
    }
  }
  pts.push([-gap, -hh]);
  return pts;
}

/** Hollow rounded-rectangle wall (outer loop + reversed inner loop joined by a hairline gap). */
function wallOutline(w, h, r, wall) {
  return [...openRRect(w, h, r, 0.0015), ...openRRect(w - 2 * wall, h - 2 * wall, r - wall, 0.0015).reverse()];
}

/** Torus loop wrapped around a ring core (core axis = Z) at angle a. */
function loopAround(R, a, loopR, tube, material) {
  return {
    type: 'torus', radius: loopR, tube, radialSegments: 6, tubularSegments: 20,
    position: [R * Math.cos(a), R * Math.sin(a), 0], rotation: [-PI / 2, -a, 0], material,
  };
}

/** Pair of vertical component legs going down into the PCB. */
const legs = (dx, y, h, z = 0, r = 0.0016) => ({
  type: 'cylinder', radius: r, height: h, segments: 8, position: [-dx, y, z], array: { count: 2, offset: [2 * dx, 0, 0] }, material: M.metal('#c9ced4'),
});

// ---------------------------------------------------------------- materials
const SHELL = M.plastic('#f1f1ee');
const FR4 = M.plastic('#1d5c3c');
const IC = M.plastic('#16171b');
const FERRITE = { color: '#3a3b3f', metalness: 0.2, roughness: 0.78 };
const ENAMEL = { ...M.copper(), emissive: '#ff7a2f', emissiveIntensity: 0.22 };
const TIW = { color: '#e8c440', metalness: 0.1, roughness: 0.45, clearcoat: 0.4, emissive: '#ffb703', emissiveIntensity: 0.2 };
const GAN = { ...IC, emissive: '#7b5cff', emissiveIntensity: 0.25 };
const HOT = { ...IC, emissive: '#ff6b3d', emissiveIntensity: 0.2 };
const SLEEVE = { color: '#1d3a6b', metalness: 0.2, roughness: 0.45, clearcoat: 0.5 };
const POLYCAP = { color: '#5b3c88', metalness: 0.3, roughness: 0.4, clearcoat: 0.5 };
const GOLD = { color: '#d4a52c', metalness: 1, roughness: 0.25 };

// ---------------------------------------------------------------- common-mode choke shapes
const CHOKE_R = 0.026;
const chokeShapes = [{ type: 'torus', radius: CHOKE_R, tube: 0.011, radialSegments: 14, tubularSegments: 48, material: FERRITE }];
for (let i = 0; i < 7; i++) {
  const t = -1.05 + (i / 6) * 2.1;
  chokeShapes.push(loopAround(CHOKE_R, t, 0.0135, 0.0022, ENAMEL));
  chokeShapes.push(loopAround(CHOKE_R, PI + t, 0.0135, 0.0022, ENAMEL));
}
chokeShapes.push({ type: 'cylinder', radius: 0.0014, height: 0.012, segments: 8, position: [-0.03, -0.036, 0], array: { count: 4, offset: [0.02, 0, 0] }, material: M.copper() });

// ---------------------------------------------------------------- main PCB copper pours & isolation slot
const pcbShapes = [
  { type: 'extrude', outline: rrect(0.31, 0.27, 0.03, 6), depth: 0.0128, rotation: FLAT, material: FR4 },
  { type: 'box', size: [0.12, 0.0008, 0.05], position: [-0.06, 0.0066, -0.1], material: M.copper() },
  { type: 'box', size: [0.05, 0.0008, 0.11], position: [0.125, 0.0066, 0.0], material: M.copper() },
  { type: 'box', size: [0.1, 0.0008, 0.05], position: [0.0, 0.0066, 0.105], material: M.copper() },
  // isolation slot (milled gap) between primary and secondary
  { type: 'box', size: [0.105, 0.0136, 0.005], position: [-0.1, 0, 0.065], material: { color: '#050505', roughness: 1 } },
  { type: 'box', size: [0.06, 0.0136, 0.005], position: [0.125, 0, 0.066], material: { color: '#050505', roughness: 1 } },
];

export default {
  id: 'charger',
  name: 'USB-C Charger',
  category: 'appliances',
  tagline: 'How a cube the size of a matchbox turns 230 V AC into a safe 5–20 V DC for your phone or laptop.',
  description:
    'A 65 W gallium-nitride (GaN) USB-C wall charger, shown at 8× real size (the real one is roughly 42 × 42 × 37 mm). Follow the energy from the wall prongs through filtering, rectification, high-frequency switching and a tiny transformer, to the USB-PD chip that agrees the exact voltage with your device.',
  camera: { position: [0.85, 0.62, 0.95], target: [0, 0.16, -0.02] },
  explodeScale: 1,
  systems: [
    { id: 'housing', name: 'Housing & Thermal', color: '#adb5bd' },
    { id: 'input', name: 'Input & Protection', color: '#ff4d6d' },
    { id: 'rectification', name: 'Rectification', color: '#ff9f43' },
    { id: 'switching', name: 'Switching & Transformer', color: '#7b5cff' },
    { id: 'output', name: 'Output & Control', color: '#3ddc97' },
  ],
  parts: [
    // ================================================================ HOUSING
    {
      id: 'housing-top',
      name: 'Housing – Top Shell',
      system: 'housing',
      position: [0, 0, 0],
      explode: [0, 0.6, 0],
      ghost: true,
      shapes: [
        { type: 'extrude', outline: wallOutline(0.34, 0.3, 0.05, 0.01), depth: 0.17, rotation: FLAT, position: [0, 0.235, 0], material: SHELL },
        { type: 'extrude', outline: rrect(0.328, 0.288, 0.044, 8), depth: 0.008, bevel: 0.006, rotation: FLAT, position: [0, 0.33, 0], material: SHELL },
      ],
      info: {
        what: 'The upper half of the plastic case — the part you hold. It is shown see-through so you can look inside.',
        location: 'The top and upper sides of the charger, with the USB-C opening on the front.',
        purpose: 'Keeps fingers away from the dangerous mains voltage inside, resists fire and helps get rid of heat.',
        how: 'The two shells are pressed together and welded with ultrasonic vibration, which melts the plastic seam so the case can’t be opened by hand. Thick walls and careful spacing keep high-voltage parts far enough from the surface that you can’t get a shock.',
        connections: ['housing-bottom', 'heat-spreader', 'usb-c-port', 'potting'],
        examples: 'Laptop power bricks, phone chargers and power-tool battery chargers all use flame-retardant polycarbonate shells.',
        advanced:
          'Polycarbonate (or PC/ABS) with UL 94 V-0 flame rating, meeting IEC 62368-1 for double/reinforced insulation (Class II, no earth pin). The case surface must stay below ~77 °C for plastic you touch briefly (IEC 62368 TS limits), which is the real constraint on how small a 65 W charger can be. Ultrasonic welding at ~20–40 kHz fuses the joint without glue.',
        facts: ['A charger that gets a little warm is normal — at 93 % efficiency, 65 W out means ~5 W of heat.'],
      },
    },
    {
      id: 'housing-bottom',
      name: 'Housing – Base Shell',
      system: 'housing',
      position: [0, 0, 0],
      explode: [0, 0, 0],
      ghost: true,
      shapes: [
        { type: 'extrude', outline: rrect(0.332, 0.292, 0.046, 8), depth: 0.004, bevel: 0.004, rotation: FLAT, position: [0, 0.006, 0], material: SHELL },
        { type: 'extrude', outline: wallOutline(0.34, 0.3, 0.05, 0.01), depth: 0.14, rotation: FLAT, position: [0, 0.08, 0], material: SHELL },
        { type: 'cylinder', radius: 0.018, height: 0.012, segments: 16, position: [-0.13, 0.018, -0.11], array: { count: 2, offset: [0.26, 0, 0] }, material: SHELL },
      ],
      info: {
        what: 'The lower half of the case, which holds the circuit board and the folding prongs.',
        location: 'The base and lower sides of the charger.',
        purpose: 'Supports the main circuit board on small posts and anchors the prongs so they can take the force of being plugged in and pulled out.',
        how: 'The board drops onto moulded posts; the prong hinge clips into the back wall. Once the top shell is welded on, everything is locked in place.',
        connections: ['housing-top', 'main-pcb', 'ac-prongs', 'potting'],
        examples: 'Any sealed consumer power supply.',
        advanced:
          'Wall thickness ~1–1.5 mm real. Creepage (distance along a surface) and clearance (through air) between mains and the user-touchable USB-C shell must be ≥ ~6–8 mm for reinforced insulation at 240 V; much of the internal layout is dictated by these rules.',
        facts: ['Folding prongs are the reason many chargers have a slot moulded into the back shell.'],
      },
    },
    {
      id: 'ac-prongs',
      name: 'AC Prongs & Contacts',
      system: 'input',
      position: [0, 0.19, -0.15],
      explode: [0, 0, -0.2],
      shapes: [
        { type: 'box', size: [0.012, 0.05, 0.127], radius: 0.003, position: [-0.051, 0, -0.0635], array: { count: 2, offset: [0.102, 0, 0] }, material: M.metal('#d8dbde') },
        { type: 'cylinder', radius: 0.004, height: 0.014, segments: 12, rotation: ALONG_X, position: [-0.051, 0, -0.105], array: { count: 2, offset: [0.102, 0, 0] }, material: { color: '#1a1a1a', roughness: 0.9 } },
        { type: 'cylinder', radius: 0.016, height: 0.15, rotation: ALONG_X, position: [0, 0, 0.018], material: M.plastic('#2a2d33') },
        { type: 'box', size: [0.014, 0.15, 0.008], position: [-0.051, -0.08, 0.022], array: { count: 2, offset: [0.102, 0, 0] }, material: M.brass() },
      ],
      info: {
        what: 'The two metal blades that plug into the wall socket, plus the springy brass strips that carry the power down to the circuit board.',
        location: 'Sticking out of the back of the charger; they fold flat into the case for travel.',
        purpose: 'Bring mains electricity (around 120 V or 230 V AC) into the charger.',
        how: 'In the socket, spring contacts grip the blades. Current flows through the blades, across the hinge and down the brass strips to the board’s input. Alternating current (AC) reverses direction 50 or 60 times every second.',
        connections: ['fuse', 'housing-bottom', 'main-pcb'],
        examples: 'US/Japan Type A (two flat blades), UK Type G (three rectangular pins), EU Type C (two round pins). Many travel chargers have swappable plug heads.',
        advanced:
          'NEMA 1-15 blades are 6.3 × 1.5 mm, 15.9 mm long and 12.7 mm apart, made of nickel-plated brass. The charger is “universal input”: 100–240 V AC, 50/60 Hz. No earth pin is needed because the design is Class II (double insulated). The holes in US blades let the socket’s contacts click into place for better grip.',
        facts: ['Mains peaks are higher than the label: 230 V AC actually swings to ±325 V.'],
      },
    },

    // ================================================================ INPUT & PROTECTION
    {
      id: 'fuse',
      name: 'Fuse',
      system: 'input',
      position: [-0.11, Y0 + 0.016, -0.125],
      explode: [-0.05, 0.18, -0.14],
      shapes: [
        { type: 'cylinder', radius: 0.011, height: 0.05, rotation: ALONG_X, material: { ...M.glass('#e8f4ff'), opacity: 0.45 } },
        { type: 'cylinder', radius: 0.0012, height: 0.05, rotation: ALONG_X, material: M.chrome() },
        { type: 'cylinder', radius: 0.012, height: 0.01, rotation: ALONG_X, position: [-0.027, 0, 0], array: { count: 2, offset: [0.054, 0, 0] }, material: M.chrome() },
        legs(0.03, -0.012, 0.012),
      ],
      info: {
        what: 'A thin wire inside a tube that melts and breaks the circuit if far too much current flows.',
        location: 'The very first part on the circuit board, right after the prongs.',
        purpose: 'A last line of defence: if something inside fails and shorts out, the fuse blows so the charger can’t catch fire.',
        how: 'Current heats any wire a little. The fuse wire is designed to stay intact in normal use but melt within moments if current climbs to several times its rating, opening the circuit permanently.',
        connections: ['ac-prongs', 'mov-varistor', 'common-mode-choke'],
        examples: 'Plug-top fuses in UK plugs, car blade fuses, fuses inside microwaves and TVs.',
        advanced:
          'Typically a 2–3.15 A, 250 V time-lag (slow-blow) fuse, so it ignores the large inrush current when the bulk capacitors first charge (tens of amps for a few ms) but still clears a sustained fault. Its I²t rating is chosen against the inrush. It is non-resettable; a blown fuse means the charger has a real fault and should be discarded.',
        facts: ['A fuse never “just blows” in a charger — it means something else has already failed.'],
      },
    },
    {
      id: 'mov-varistor',
      name: 'Surge Protector (MOV)',
      system: 'input',
      position: [-0.115, Y0 + 0.045, -0.08],
      explode: [-0.12, 0.2, -0.06],
      shapes: [
        { type: 'cylinder', radius: 0.03, height: 0.012, rotation: ALONG_Z, material: M.plastic('#2b5fb8') },
        legs(0.012, -0.038, 0.016),
      ],
      info: {
        what: 'A blue disc that absorbs voltage spikes from the mains, such as those caused by lightning or big motors switching off.',
        location: 'Just after the fuse, across the two mains wires.',
        purpose: 'Protects the delicate parts downstream from brief but dangerous surges of high voltage.',
        how: 'At normal voltage it barely conducts. When a spike pushes the voltage above its threshold, its resistance suddenly drops and it soaks up the extra energy as heat, clamping the voltage until the spike passes.',
        connections: ['fuse', 'x-capacitor', 'bridge-rectifier'],
        examples: 'Surge-protector power strips are full of these discs.',
        advanced:
          'A metal-oxide varistor made of sintered zinc-oxide grains whose boundaries behave like back-to-back diodes. For 240 V mains a ~470 V (clamping ~775 V) part is typical, rated for surges of several hundred amps (8/20 µs). It is designed to pass IEC 61000-4-5 surge tests (1–2 kV). Each big surge slightly degrades it.',
        facts: ['Many small chargers omit the MOV and rely on the bulk capacitor to absorb surges.'],
      },
    },
    {
      id: 'common-mode-choke',
      name: 'Common-mode Choke (EMI Filter)',
      system: 'input',
      position: [-0.005, Y0 + 0.042, -0.1],
      explode: [0, 0.22, -0.16],
      anim: { type: 'flow', speed: 2.5 },
      shapes: chokeShapes,
      info: {
        what: 'A ring of magnetic material with two copper coils wound on it. It is part of the noise filter at the input.',
        location: 'Near the back of the board, just after the fuse.',
        purpose: 'Stops high-frequency electrical noise created by the charger from escaping back into your home wiring and interfering with radios and other devices.',
        how: 'The mains current goes out through one coil and back through the other, so their magnetic fields cancel and it passes freely. Noise, however, tends to travel in the same direction on both wires at once (“common mode”); then the fields add up, and the choke presents a high resistance that blocks it.',
        connections: ['fuse', 'x-capacitor', 'y-capacitor', 'bridge-rectifier'],
        examples: 'The lump on a laptop or monitor cable is a ferrite choke doing the same job.',
        advanced:
          'High-permeability MnZn ferrite toroid with two bifilar-separated windings, typically 5–30 mH of common-mode inductance. Together with the X and Y capacitors it forms a π/LC filter so the charger meets conducted-emission limits (CISPR 32 / FCC Part 15 Class B, 150 kHz–30 MHz). Higher switching frequencies (enabled by GaN) shift the noise up, which can make the filter smaller.',
        facts: ['Without EMI filtering, a cheap charger can wipe out AM radio and even disturb touchscreens.'],
      },
    },
    {
      id: 'x-capacitor',
      name: 'X Safety Capacitor',
      system: 'input',
      position: [0.105, Y0 + 0.026, -0.105],
      explode: [0.06, 0.2, -0.14],
      shapes: [
        { type: 'box', size: [0.07, 0.048, 0.03], radius: 0.004, material: M.plastic('#e9c46a') },
        legs(0.025, -0.028, 0.01),
      ],
      info: {
        what: 'A yellow film capacitor connected directly across the two mains wires.',
        location: 'At the back-right of the board, beside the choke.',
        purpose: 'Short-circuits high-frequency noise between the two wires so it can’t get out through the plug.',
        how: 'A capacitor blocks slow 50/60 Hz mains but lets fast noise currents pass easily. Sitting across the line, it gives the noise a shortcut that returns it inside the charger instead of out into the wall.',
        connections: ['common-mode-choke', 'mov-varistor', 'bridge-rectifier'],
        examples: 'Found in almost every mains-powered appliance input filter.',
        advanced:
          'An X2-class self-healing metallised polypropylene capacitor (~0.1–0.47 µF, 275–310 V AC). “X” class means safe to fail across the line; if the dielectric punctures, the thin metal film evaporates around the fault and it keeps working. A bleeder resistor or X-cap discharge IC empties it within 1 s of unplugging so the prongs can’t shock you.',
        facts: ['That’s why touching a charger’s prongs right after unplugging is safe — the X cap has already been discharged.'],
      },
    },

    // ================================================================ RECTIFICATION
    {
      id: 'bridge-rectifier',
      name: 'Bridge Rectifier',
      system: 'rectification',
      position: [0.13, Y0 + 0.028, -0.07],
      explode: [0.14, 0.18, -0.06],
      anim: { type: 'flow', speed: 4 },
      shapes: [
        { type: 'box', size: [0.05, 0.04, 0.012], radius: 0.002, material: HOT },
        { type: 'cylinder', radius: 0.0015, height: 0.014, segments: 8, position: [-0.018, -0.026, 0], array: { count: 4, offset: [0.012, 0, 0] }, material: M.metal('#c9ced4') },
      ],
      info: {
        what: 'Four diodes in one black package that turn alternating current into one-way current.',
        location: 'Right side of the input section, between the filter and the big capacitors.',
        purpose: 'Converts the wall’s AC (which keeps reversing) into DC (which flows one way) so it can be stored and switched.',
        how: 'Diodes are one-way valves for electricity. Four of them are arranged in a diamond so that whichever way the mains is pushing, current is always steered out of the “+” terminal and back in at the “–” terminal. The result is a bumpy, always-positive voltage.',
        connections: ['x-capacitor', 'bulk-capacitors', 'common-mode-choke', 'mov-varistor'],
        examples: 'Every AC-to-DC power supply, from LED bulbs to PC power units, starts with a rectifier.',
        advanced:
          'Full-wave bridge rated ~600 V / 2–4 A (e.g. a GBU or MBS package). Output peaks at √2 × V_rms: ~170 V from 120 V mains, ~325 V from 230 V, with ripple at twice line frequency (100/120 Hz). Two diodes conduct at a time, each dropping ~0.9 V, so it loses a watt or so at full load. Above 75 W input, regulations (IEC 61000-3-2) require a PFC boost stage after the bridge to draw sinusoidal current; at 65 W it is usually omitted.',
        facts: ['Turn the bridge around and the bulk capacitors would explode — polarity matters.'],
      },
    },
    {
      id: 'bulk-capacitors',
      name: 'Bulk Capacitors',
      system: 'rectification',
      position: [-0.12, Y0, 0],
      explode: [-0.16, 0.14, 0],
      shapes: [
        { type: 'cylinder', radius: 0.03, height: 0.19, position: [0, 0.097, -0.035], array: { count: 2, offset: [0, 0, 0.063] }, material: SLEEVE },
        { type: 'cylinder', radius: 0.0302, height: 0.19, thetaLength: 0.7, position: [0, 0.097, -0.035], array: { count: 2, offset: [0, 0, 0.063] }, material: M.plastic('#c9d6ea') },
        { type: 'cylinder', radius: 0.027, height: 0.002, position: [0, 0.193, -0.035], array: { count: 2, offset: [0, 0, 0.063] }, material: M.aluminium() },
        { type: 'box', size: [0.036, 0.0012, 0.002], position: [0, 0.1945, -0.035], array: { count: 2, offset: [0, 0, 0.063] }, material: M.metal('#7d858f') },
        { type: 'box', size: [0.002, 0.0012, 0.036], position: [0, 0.1945, -0.035], array: { count: 2, offset: [0, 0, 0.063] }, material: M.metal('#7d858f') },
      ],
      info: {
        what: 'The two tall cylinders — high-voltage electrolytic capacitors that store energy like small, fast buckets.',
        location: 'Standing up on the left side of the board, the tallest parts in the charger.',
        purpose: 'Smooth the bumpy rectified mains into steady high-voltage DC (~170–340 V) and keep the charger running between the mains peaks.',
        how: 'They charge up at each peak of the mains waveform and then supply the current while the mains voltage dips, like a water tower that keeps pressure steady between pump strokes. The cross scored on top is a safety vent that splits open gently if the capacitor ever fails.',
        connections: ['bridge-rectifier', 'primary-winding', 'gan-transistors', 'primary-controller'],
        examples: 'The “cans” you see in every power supply, amplifier and TV are electrolytic capacitors.',
        advanced:
          'Aluminium electrolytic, 400 V rated, typically 2 × 22–33 µF for 65 W. The capacitance is sized for minimum valley voltage at 90 V AC input (~100 V) and for hold-up time. Ripple current heats them and electrolyte slowly dries out, so their life (e.g. 2,000–5,000 h at 105 °C, doubling for each 10 °C cooler) usually limits charger lifetime. They hold a dangerous charge for some time after unplugging.',
        facts: ['These are the largest parts in a charger — GaN’s higher frequency shrinks the transformer, but not these.'],
      },
    },

    // ================================================================ SWITCHING & TRANSFORMER
    {
      id: 'primary-controller',
      name: 'Primary Controller IC (PWM/ACF)',
      system: 'switching',
      position: [-0.065, Y0 + 0.003, -0.05],
      explode: [-0.06, 0.22, -0.04],
      shapes: [
        { type: 'box', size: [0.04, 0.006, 0.03], radius: 0.001, material: IC },
        { type: 'box', size: [0.003, 0.002, 0.006], position: [-0.0165, -0.002, -0.018], array: { count: 8, offset: [0.0047, 0, 0] }, material: M.metal('#c9ced4') },
        { type: 'box', size: [0.003, 0.002, 0.006], position: [-0.0165, -0.002, 0.018], array: { count: 8, offset: [0.0047, 0, 0] }, material: M.metal('#c9ced4') },
        { type: 'cylinder', radius: 0.002, height: 0.001, segments: 10, position: [-0.014, 0.0035, -0.008], material: M.plastic('#3a3d44') },
      ],
      info: {
        what: 'The control chip that decides exactly when to switch the GaN transistors on and off.',
        location: 'On the primary (high-voltage) side of the board, beside the bulk capacitors.',
        purpose: 'Keeps the output voltage correct whatever the load or mains voltage, and protects against faults.',
        how: 'It listens to the feedback signal coming across the optocoupler. If the output is too low it makes each “on” pulse longer or more frequent; if too high, shorter. It also watches the switch current every cycle and shuts down on overload, overheating or over-voltage. With nothing plugged in it switches only in short bursts to save energy.',
        connections: ['gan-transistors', 'optocoupler', 'bulk-capacitors', 'primary-winding'],
        examples: 'Controllers from Power Integrations, ON Semi, Infineon, Navitas and others; some GaN chargers integrate controller and GaN switch in one package.',
        advanced:
          'Common topologies: quasi-resonant (QR) flyback, which turns on at the valley of the drain ringing to cut losses, or active-clamp flyback (ACF), which recycles leakage energy and achieves zero-voltage switching (ZVS). Switching frequency ~100–300 kHz for QR, up to ~1 MHz for ACF. It implements burst mode for <75 mW no-load consumption (US DoE Level VI, EU CoC Tier 2). Above 75 W, a separate PFC controller (CCM/CrM boost) is added before the flyback.',
        facts: ['The controller restarts itself many times per second during a short circuit (“hiccup mode”) rather than staying on.'],
      },
    },
    {
      id: 'gan-transistors',
      name: 'GaN Power Transistors',
      system: 'switching',
      position: [0.125, Y0 + 0.004, -0.005],
      explode: [0.16, 0.18, -0.02],
      anim: { type: 'flow', speed: 7 },
      shapes: [
        { type: 'box', size: [0.04, 0.008, 0.048], radius: 0.0012, position: [0, 0, -0.025], array: { count: 2, offset: [0, 0, 0.055] }, material: GAN },
        { type: 'box', size: [0.012, 0.0006, 0.012], position: [-0.008, 0.0042, -0.033], array: { count: 2, offset: [0, 0, 0.055] }, material: M.metal('#5a5f68') },
      ],
      info: {
        what: 'The power switches at the heart of the charger, made from gallium nitride instead of ordinary silicon.',
        location: 'On the primary side next to the transformer, under the thermal pad and heat spreader.',
        purpose: 'Chop the high-voltage DC into very fast pulses that drive the transformer — hundreds of thousands of times per second.',
        how: 'A transistor is an electrically controlled switch. Every time it turns on, current builds up in the transformer; when it turns off, that energy is released to the output. GaN switches turn on and off much faster and waste less energy in each switch than silicon, so the charger can run at a higher frequency. Higher frequency means each pulse carries less energy, so the transformer and capacitors can be much smaller.',
        connections: ['primary-controller', 'primary-winding', 'bulk-capacitors', 'thermal-pad', 'heat-spreader'],
        examples: 'GaN chargers from Anker, Apple, Samsung, Ugreen; GaN is also used in 5G base stations, lidar and electric-car chargers.',
        advanced:
          'Enhancement-mode 650 V GaN-on-Si high-electron-mobility transistors (HEMTs), ~100–200 mΩ. GaN’s 3.4 eV bandgap (silicon: 1.1 eV) gives ~10× higher critical field, so a GaN die is far smaller for the same voltage, with very low gate charge and output capacitance and zero reverse-recovery charge. This enables 300 kHz–1 MHz soft-switched operation at ~93–95 % efficiency, reaching ~1.5–2 W/cm³ power density versus ~0.5 W/cm³ for older silicon bricks. In an active-clamp flyback, a second (high-side) GaN switch drives the clamp capacitor.',
        facts: ['Gallium nitride is the same material that makes blue LEDs — its inventors won the 2014 Nobel Prize in Physics.', 'GaN is why a 65 W laptop charger now fits in your pocket.'],
      },
    },
    {
      id: 'transformer-core',
      name: 'Transformer Ferrite Core',
      system: 'switching',
      position: [0.03, Y0, 0.02],
      explode: [0, 0.18, 0],
      shapes: [
        { type: 'box', size: [0.12, 0.016, 0.1], radius: 0.003, position: [0, 0.01, 0], material: FERRITE },
        { type: 'box', size: [0.12, 0.016, 0.1], radius: 0.003, position: [0, 0.112, 0], material: FERRITE },
        { type: 'box', size: [0.016, 0.088, 0.1], radius: 0.002, position: [-0.052, 0.061, 0], array: { count: 2, offset: [0.104, 0, 0] }, material: FERRITE },
        { type: 'cylinder', radius: 0.02, height: 0.086, position: [0, 0.061, 0], material: FERRITE },
        { type: 'cylinder', radius: 0.04, height: 0.003, position: [0, 0.0195, 0], array: { count: 2, offset: [0, 0.083, 0] }, material: M.plastic('#2a2d33') },
        { type: 'cylinder', radius: 0.0215, height: 0.084, open: true, position: [0, 0.061, 0], material: M.plastic('#2a2d33') },
      ],
      info: {
        what: 'Dark grey blocks of magnetic ceramic (ferrite) that wrap around the transformer’s copper windings.',
        location: 'The centre of the board, straddling the gap between the high-voltage and low-voltage sides.',
        purpose: 'Guides and stores the magnetic energy that carries power from the primary winding to the secondary winding — with no electrical connection between them.',
        how: 'When current flows in the primary coil, it magnetises the core. The core concentrates that magnetism through the secondary coil. Because the only link is magnetic, the dangerous mains side is completely isolated from the USB cable you touch. A tiny air gap in the centre leg stores energy in this design (a “flyback” transformer).',
        connections: ['primary-winding', 'secondary-winding', 'gan-transistors', 'sync-rectifier'],
        examples: 'Ferrite-core transformers are in every switch-mode power supply; heavy iron-core transformers were used in old 50 Hz chargers.',
        advanced:
          'MnZn power ferrite (e.g. Ferroxcube 3C95 / TDK PC95-class) in an RM, EQ or ATQ shape, or a planar core with PCB windings. In a flyback, energy E = ½·L·I² is stored mostly in the gapped centre leg during the on-time and released in the off-time. Core loss rises steeply with frequency and flux swing (Steinmetz equation), so the design balances frequency (smaller core) against loss. At 50 Hz the same power would need a laminated-iron core ~20–50× larger.',
        facts: ['Ferrite is a ceramic: it doesn’t conduct electricity, so the core itself doesn’t waste energy on eddy currents.'],
      },
    },
    {
      id: 'primary-winding',
      name: 'Primary Winding',
      system: 'switching',
      position: [0.03, Y0 + 0.061, 0.02],
      explode: [0, 0.3, 0],
      anim: { type: 'flow', speed: 5 },
      shapes: [
        { type: 'helix', radius: 0.026, height: 0.07, turns: 12, tube: 0.0027, material: ENAMEL },
        { type: 'tube', points: [[0.026, -0.035, 0], [0.03, -0.045, -0.02], [0.03, -0.058, -0.045]], radius: 0.0018, radialSegments: 6, material: ENAMEL },
      ],
      info: {
        what: 'The inner coil of thin copper wire on the high-voltage (mains) side of the transformer.',
        location: 'Wound around the centre leg of the ferrite core, closest to it.',
        purpose: 'Turns the pulses from the GaN switches into a changing magnetic field in the core.',
        how: 'Each time the GaN switch turns on, the full high-voltage DC is applied across this coil and current builds up, magnetising the core. When the switch turns off, the current stops and the stored magnetic energy pushes current out of the secondary winding instead.',
        connections: ['transformer-core', 'secondary-winding', 'gan-transistors', 'bulk-capacitors'],
        examples: 'Ignition coils in cars, camera-flash chargers and old TV “flyback” transformers work on the same principle.',
        advanced:
          'Typically 20–40 turns of enamelled or Litz wire with ~300–600 µH magnetising inductance. Skin depth in copper at 200 kHz is only ~0.15 mm, so stranded Litz wire (many insulated strands) reduces AC resistance. The primary is often split in two halves sandwiching the secondary (“interleaving”) to lower leakage inductance, which otherwise causes voltage spikes that must be clamped.',
        facts: ['Flyback transformers don’t transfer energy at the same instant like a normal transformer — they store it, then “fly it back”.'],
      },
    },
    {
      id: 'secondary-winding',
      name: 'Secondary Winding',
      system: 'switching',
      position: [0.03, Y0 + 0.061, 0.02],
      explode: [0, 0.4, 0.04],
      anim: { type: 'flow', speed: 5 },
      shapes: [
        { type: 'torus', radius: 0.034, tube: 0.0045, radialSegments: 10, tubularSegments: 48, rotation: [PI / 2, 0, 0], position: [0, -0.026, 0], array: { count: 5, offset: [0, 0.013, 0] }, material: TIW },
        { type: 'tube', points: [[0.034, 0.026, 0.0], [0.04, 0.0, 0.03], [0.05, -0.04, 0.05], [0.06, -0.058, 0.065]], radius: 0.003, radialSegments: 6, material: TIW },
      ],
      info: {
        what: 'A few turns of thick, triple-insulated (yellow) wire on the low-voltage side of the transformer.',
        location: 'Wound around the primary winding in the transformer; its ends go to the output side of the board.',
        purpose: 'Collects the transformer’s energy and delivers it as low-voltage current (5–20 V) to the output.',
        how: 'When the GaN switch turns off, the magnetic energy in the core drives current out of this winding through the synchronous rectifier into the output capacitors. Because it has far fewer turns than the primary, the voltage is stepped down and the current is stepped up.',
        connections: ['transformer-core', 'primary-winding', 'sync-rectifier', 'output-capacitors'],
        examples: 'Any step-down transformer has a low-turn, thick-wire secondary.',
        advanced:
          'Typically 3–6 turns giving a turns ratio around 5:1–8:1, chosen so the reflected output voltage keeps the GaN switch stress below ~500 V at 264 V AC input. Triple-insulated wire (TIW) provides reinforced insulation (≥ 3 kV) on its own, removing the need for margin tape and making the transformer smaller. It carries several amps of high-frequency ripple, so wide or paralleled conductors are used.',
        facts: ['The yellow wire is triple-insulated so that a single nick in the insulation can never connect mains to your USB cable.'],
      },
    },
    {
      id: 'y-capacitor',
      name: 'Y Safety Capacitor',
      system: 'input',
      position: [-0.042, Y0 + 0.035, 0.062],
      explode: [-0.1, 0.2, 0.06],
      shapes: [
        { type: 'cylinder', radius: 0.022, height: 0.008, rotation: ALONG_X, material: M.plastic('#3b6fd8') },
        { type: 'cylinder', radius: 0.0014, height: 0.022, segments: 8, position: [0, -0.024, -0.012], array: { count: 2, offset: [0, 0, 0.024] }, material: M.metal('#c9ced4') },
      ],
      info: {
        what: 'A small blue disc capacitor that bridges the gap between the mains side and the USB side.',
        location: 'Right across the isolation slot in the board, next to the transformer.',
        purpose: 'Gives switching noise that leaks across the transformer a short path home, so it doesn’t ride out along your USB cable as interference.',
        how: 'The transformer’s windings act like a tiny capacitor too, coupling high-frequency noise to the output side. The Y capacitor returns that noise to the primary side in a controlled way. Its value is kept tiny so only a harmless trickle of mains current can ever flow through it.',
        connections: ['common-mode-choke', 'transformer-core', 'main-pcb'],
        examples: 'The slight “tingle” some people feel from a metal laptop on a charger comes from Y-capacitor leakage current.',
        advanced:
          'A Y1-rated ceramic capacitor (~470 pF–2.2 nF, 400–500 V AC, tested at up to 8 kV) designed to fail open, never short. Leakage is limited to < 0.25 mA for Class II equipment. It works with the common-mode choke to suppress common-mode EMI. Touch-screen “jitter” while charging can be caused by this common-mode noise.',
        facts: ['“Y” class capacitors are the only parts allowed to bridge the isolation barrier, apart from the transformer and optocoupler.'],
      },
    },

    // ================================================================ OUTPUT & CONTROL
    {
      id: 'optocoupler',
      name: 'Optocoupler (Feedback)',
      system: 'output',
      position: [-0.068, Y0 + 0.006, 0.06],
      explode: [-0.14, 0.24, 0.1],
      anim: { type: 'flow', speed: 3 },
      shapes: [
        { type: 'box', size: [0.026, 0.012, 0.04], radius: 0.0015, material: { ...M.plastic('#f2f2ee'), emissive: '#ff4d6d', emissiveIntensity: 0.12 } },
        { type: 'box', size: [0.003, 0.012, 0.003], position: [-0.006, -0.004, -0.022], array: { count: 2, offset: [0.012, 0, 0] }, material: M.metal('#c9ced4') },
        { type: 'box', size: [0.003, 0.012, 0.003], position: [-0.006, -0.004, 0.022], array: { count: 2, offset: [0.012, 0, 0] }, material: M.metal('#c9ced4') },
      ],
      info: {
        what: 'A tiny chip containing an LED and a light sensor, used to send a signal across the safety gap using light.',
        location: 'Straddling the isolation slot, with two legs on each side.',
        purpose: 'Tells the primary controller whether the output voltage is too high or too low — without any electrical connection between the two sides.',
        how: 'On the output side, the circuit lights the internal LED brighter when the voltage is too high. On the mains side, a phototransistor senses the light and passes a signal to the controller, which then shortens the switching pulses. Light crosses the gap, electricity cannot.',
        connections: ['primary-controller', 'usb-pd-controller', 'sync-rectifier', 'main-pcb'],
        examples: 'Optocouplers isolate signals in industrial controls, medical devices and inverters.',
        advanced:
          'A 4-pin optocoupler (LED + phototransistor) rated for ~5 kV RMS isolation with a defined current-transfer ratio (CTR). On the secondary side, a shunt reference (TL431-style) or the USB-PD controller’s own error amplifier drives the LED; the PD controller changes the reference to set 5, 9, 15 or 20 V. Some newer designs replace the optocoupler with a magnetic or capacitive digital isolator, or primary-side regulation.',
        facts: ['There’s a little glowing LED inside your charger that you will never see.'],
      },
    },
    {
      id: 'sync-rectifier',
      name: 'Synchronous Rectifier MOSFET',
      system: 'output',
      position: [0.115, Y0 + 0.004, 0.085],
      explode: [0.14, 0.18, 0.12],
      anim: { type: 'flow', speed: 5 },
      shapes: [
        { type: 'box', size: [0.04, 0.008, 0.03], radius: 0.0012, material: HOT },
        { type: 'box', size: [0.02, 0.005, 0.015], radius: 0.0008, position: [-0.035, 0, 0], material: IC },
      ],
      info: {
        what: 'A low-voltage transistor that acts as a super-efficient one-way valve on the output side.',
        location: 'On the low-voltage side of the board, next to the transformer’s secondary winding.',
        purpose: 'Turns the transformer’s pulses back into one-way (DC) current while wasting very little energy as heat.',
        how: 'A plain diode would do the job but loses about half a volt, which becomes heat. Instead, a small controller chip watches the voltage and switches this transistor on exactly when current should flow and off when it should stop — perfectly synchronised with the transformer, so it behaves like a near-perfect diode.',
        connections: ['secondary-winding', 'output-capacitors', 'optocoupler'],
        examples: 'Synchronous rectification is used in nearly every efficient PC power supply, laptop charger and phone charger today.',
        advanced:
          'A 100–150 V silicon MOSFET with ~5–10 mΩ R_DS(on), driven by an SR controller that senses drain–source voltage. Losses: a Schottky diode at 3.25 A dissipates ≈0.45 V × 3.25 A ≈ 1.5 W, while the MOSFET dissipates ≈3.25² × 0.008 ≈ 0.08 W — a big win in a sealed, hot box. Turn-off must happen before the primary switch turns on again, especially in continuous-conduction mode.',
        facts: ['Switching from diodes to synchronous rectifiers raised charger efficiency by several percent.'],
      },
    },
    {
      id: 'output-capacitors',
      name: 'Output Capacitors',
      system: 'output',
      position: [0, Y0, 0.12],
      explode: [0, 0.14, 0.14],
      shapes: [
        { type: 'cylinder', radius: 0.018, height: 0.06, position: [0.13, 0.03, -0.005], material: POLYCAP },
        { type: 'cylinder', radius: 0.018, height: 0.06, position: [-0.125, 0.03, -0.01], material: POLYCAP },
        { type: 'cylinder', radius: 0.0165, height: 0.002, position: [0.13, 0.061, -0.005], material: M.aluminium() },
        { type: 'cylinder', radius: 0.0165, height: 0.002, position: [-0.125, 0.061, -0.01], material: M.aluminium() },
        { type: 'box', size: [0.012, 0.006, 0.007], radius: 0.001, position: [-0.055, 0.003, -0.04], array: { count: 7, offset: [0.018, 0, 0] }, material: M.plastic('#8a6a45') },
      ],
      info: {
        what: 'Low-voltage capacitors (purple cans and small brown chips) that smooth the output into clean, steady DC.',
        location: 'On the output side of the board, near the front.',
        purpose: 'Remove the ripple left over from the high-frequency pulses so your device gets a steady voltage.',
        how: 'They fill up during each pulse from the transformer and release charge between pulses, evening out the voltage. Lots of small ceramic capacitors handle the fastest ripple, the larger polymer cans handle bigger surges such as when a laptop suddenly starts drawing more power.',
        connections: ['sync-rectifier', 'secondary-winding', 'usb-pd-controller', 'output-pcb'],
        examples: 'Solid polymer capacitors are common on PC motherboards around the CPU.',
        advanced:
          'Solid aluminium-polymer capacitors (~25 V, a few hundred µF each) with ESR of ~10–20 mΩ, plus multilayer ceramic (MLCC) X5R/X7R capacitors. Rated 25 V because the output can rise to 20 V (or 21 V with PPS). Polymer caps don’t dry out like wet electrolytics, so they cope with heat better. USB-PD requires output ripple below ~150 mV peak-to-peak.',
        facts: ['Wet electrolytic output caps that bulged and leaked were the classic failure of cheap chargers.'],
      },
    },
    {
      id: 'usb-pd-controller',
      name: 'USB Power Delivery Controller',
      system: 'output',
      position: [0, 0.15, 0.0906],
      explode: [0, 0.14, 0.14],
      anim: { type: 'flow', speed: 3 },
      shapes: [
        { type: 'box', size: [0.035, 0.035, 0.006], radius: 0.001, material: { ...IC, emissive: '#3ddc97', emissiveIntensity: 0.2 } },
        { type: 'box', size: [0.025, 0.02, 0.005], radius: 0.0008, position: [0, -0.05, 0.0005], material: IC },
        { type: 'box', size: [0.012, 0.006, 0.003], position: [0.03, -0.05, 0.0015], material: M.plastic('#3a3d44') },
      ],
      info: {
        what: 'A small chip that “talks” to your phone or laptop through the USB-C cable to agree how much power to send.',
        location: 'On the back of the small vertical output board, right behind the USB-C socket.',
        purpose: 'Lets one charger safely power everything from earbuds (5 V) to a laptop (20 V) by negotiating the right voltage.',
        how: 'When you plug in, only safe 5 V is supplied. The chip sends the device a list of what it can offer — e.g. 5 V, 9 V, 15 V, 20 V. The device replies with what it wants, the chip changes the feedback signal so the whole charger moves to that voltage, then turns on the output switch. It keeps monitoring for overcurrent and overheating and can shut everything off instantly.',
        connections: ['usb-c-port', 'optocoupler', 'output-capacitors', 'output-pcb'],
        examples: 'Laptops, phones, tablets, Nintendo Switch and many monitors negotiate USB-PD.',
        advanced:
          'USB-PD messages travel on the CC wire as 300 kb/s BMC-encoded packets. A 65 W charger typically advertises fixed PDOs of 5 V/3 A, 9 V/3 A, 15 V/3 A and 20 V/3.25 A, plus PPS (Programmable Power Supply) from ~3.3–21 V in 20 mV / 50 mA steps used by phones for direct battery charging. Above 3 A the cable must contain an e-marker chip (5 A cables). PD 3.1 adds Extended Power Range (28/36/48 V, up to 240 W). The chip also drives a VBUS load-switch MOSFET and reads an NTC thermistor for over-temperature protection.',
        facts: ['A USB-C charger outputs nothing on VBUS until a device is detected, so the socket is “dead” when empty.'],
      },
    },
    {
      id: 'usb-c-port',
      name: 'USB-C Receptacle',
      system: 'output',
      position: [0, 0.24, 0.12],
      explode: [0, 0.08, 0.36],
      shapes: [
        { type: 'box', size: [0.0716, 0.0264, 0.06], radius: 0.012, material: M.chrome() },
        { type: 'box', size: [0.066, 0.021, 0.0004], position: [0, 0, 0.0302], material: { color: '#050505', roughness: 1 } },
        { type: 'box', size: [0.0536, 0.0056, 0.04], radius: 0.001, position: [0, 0, 0.011], material: M.plastic('#202226') },
        { type: 'box', size: [0.0022, 0.0006, 0.016], position: [-0.0242, 0.0031, 0.022], array: { count: 12, offset: [0.0044, 0, 0] }, material: GOLD },
        { type: 'box', size: [0.0022, 0.0006, 0.016], position: [-0.0242, -0.0031, 0.022], array: { count: 12, offset: [0.0044, 0, 0] }, material: GOLD },
      ],
      info: {
        what: 'The reversible socket you plug the cable into.',
        location: 'The front face of the charger, mounted through the vertical output board.',
        purpose: 'Delivers the DC power — and the “conversation” wires for USB-PD — to the cable.',
        how: 'The tongue inside has 12 contacts on each side, mirrored so the plug can go in either way up. Several pins carry power (VBUS and ground) and two “CC” pins detect the cable and carry the USB-PD messages.',
        connections: ['usb-pd-controller', 'output-pcb', 'housing-top'],
        examples: 'The same connector is on phones, laptops, tablets, headphones and game consoles.',
        advanced:
          'A 24-pin USB Type-C receptacle (opening 8.34 × 2.56 mm real) rated 5 A on VBUS. A source uses Rp pull-ups on CC1/CC2 to advertise default/1.5 A/3 A current; the sink’s Rd pull-down tells the charger a device is attached and which way round. The charger only switches VBUS on after attach detection, and supports 5–20 V under SPR (up to 100 W) or up to 48 V under EPR.',
        facts: ['A dual-port charger has one PD controller per port (or a shared one) that splits the total power between them.'],
      },
    },
    {
      id: 'output-pcb',
      name: 'Output Daughter Board',
      system: 'output',
      position: [0, 0.163, 0.1],
      explode: [0, 0.08, 0.22],
      shapes: [
        { type: 'extrude', outline: rrect(0.15, 0.254, 0.012, 4), depth: 0.0128, material: FR4 },
        { type: 'box', size: [0.074, 0.03, 0.0134], position: [0, 0.077, 0], material: { color: '#050505', roughness: 1 } },
        { type: 'box', size: [0.004, 0.012, 0.004], position: [-0.06, -0.133, 0], array: { count: 8, offset: [0.017, 0, 0] }, material: M.metal('#c9ced4') },
      ],
      info: {
        what: 'A small vertical circuit board at the front of the charger that carries the USB-C socket and its control chip.',
        location: 'Standing upright at the front, plugged into the main board below.',
        purpose: 'Saves space by using the height of the case, and keeps the low-voltage output circuitry away from the mains side.',
        how: 'A row of pins solders it to the main board, carrying the DC output and feedback signals. Mounting the socket on a vertical board lets it face out of the front of the case.',
        connections: ['main-pcb', 'usb-c-port', 'usb-pd-controller', 'output-capacitors'],
        examples: '3D board stacking like this is common in compact chargers and other dense gadgets.',
        advanced:
          'Small chargers often use 3–4 boards (main, primary-side vertical, output) and even flexible or ceramic substrates to fill the volume efficiently. The board carries the VBUS switch, current-sense resistor, CC routing and ESD protection diodes.',
        facts: ['Chargers are a 3D puzzle: designers count cubic millimetres, not just board area.'],
      },
    },
    {
      id: 'main-pcb',
      name: 'Main Circuit Board',
      system: 'output',
      position: [0, 0.03, 0],
      explode: [0, 0.05, 0],
      shapes: pcbShapes,
      info: {
        what: 'The green fibreglass board that holds and connects almost every component.',
        location: 'Lying flat across the bottom of the charger.',
        purpose: 'Connects the parts with copper tracks and keeps the dangerous mains side safely separated from the USB side.',
        how: 'Copper sheets on the board form wide “roads” for current, and also spread heat. A slot is milled right through the board (the black line) between the high-voltage and low-voltage halves, so even if dust and moisture collect, electricity can’t creep across the surface.',
        connections: ['output-pcb', 'transformer-core', 'optocoupler', 'y-capacitor', 'housing-bottom'],
        examples: 'Every electronic device has PCBs; power boards use thicker copper than logic boards.',
        advanced:
          'FR-4 glass-epoxy, often 2 oz (70 µm) copper for current and heat spreading. The isolation slot increases creepage distance to ≥ 6.4–8 mm for reinforced insulation at 250 V (IEC 62368-1, pollution degree 2). Only the transformer, optocoupler and Y-capacitor are allowed to bridge the gap. GaN layouts minimise the high-di/dt “hot loop” area to reduce ringing and EMI.',
        facts: ['The isolation slot is one of the main differences between a safe charger and a dangerous counterfeit.'],
      },
    },

    // ================================================================ HOUSING / THERMAL
    {
      id: 'thermal-pad',
      name: 'Thermal Pad',
      system: 'housing',
      position: [0.125, Y0 + 0.011, 0.0025],
      explode: [0.2, 0.26, 0],
      shapes: [{ type: 'box', size: [0.05, 0.006, 0.11], radius: 0.002, material: { color: '#4f8fd0', metalness: 0, roughness: 0.9 } }],
      info: {
        what: 'A soft, squishy, blue silicone pad that sits on top of the GaN transistors.',
        location: 'Between the GaN transistors and the aluminium heat spreader.',
        purpose: 'Fills the microscopic air gaps between the hot chips and the heat spreader so heat can flow out easily.',
        how: 'Air is a very poor conductor of heat. The pad squeezes into every bump on both surfaces, replacing air with a filled silicone that conducts heat much better, while also electrically insulating the chips.',
        connections: ['gan-transistors', 'heat-spreader'],
        examples: 'Thermal pads sit on laptop SSDs and graphics-card memory chips.',
        advanced:
          'Ceramic-filled silicone gap filler, ~1–6 W/m·K (air ≈ 0.026 W/m·K), 0.5–1.5 mm thick, with high dielectric strength (> 5 kV/mm). The thermal resistance of the junction-to-case path sets the GaN die temperature, which must stay well below ~150 °C.',
        facts: ['Thermal pad conducts heat ~100× better than air.'],
      },
    },
    {
      id: 'heat-spreader',
      name: 'Heat Spreader',
      system: 'housing',
      position: [0.125, Y0 + 0.0155, 0.0025],
      explode: [0.26, 0.3, 0],
      shapes: [
        { type: 'box', size: [0.06, 0.003, 0.12], material: M.aluminium() },
        { type: 'box', size: [0.003, 0.26, 0.12], position: [0.0315, 0.1285, 0], material: M.aluminium() },
      ],
      info: {
        what: 'A bent sheet of aluminium that carries heat from the hottest chips to the inside of the case.',
        location: 'Over the GaN transistors and up the inside of the right-hand wall.',
        purpose: 'Spreads concentrated heat over a large area so the case warms evenly instead of having one scorching hot spot.',
        how: 'Heat flows from the GaN chips through the thermal pad into the aluminium, which conducts it sideways quickly. The large vertical face then passes it to the case wall, which radiates and convects it to the room.',
        connections: ['thermal-pad', 'gan-transistors', 'housing-top'],
        examples: 'Heat sinks and spreaders in routers, game consoles and LED bulbs.',
        advanced:
          'Aluminium (~200 W/m·K) or copper (~400 W/m·K), sometimes combined with graphite sheets. In a sealed 65 W charger, ~4–5 W of loss must leave through ~70 cm² of case surface by natural convection and radiation, which limits case temperature rise to ~40 K above ambient.',
        facts: ['Some chargers sense their own temperature and lower output power if they get too hot.'],
      },
    },
    {
      id: 'potting',
      name: 'Potting Compound',
      system: 'housing',
      position: [0, 0.085, 0],
      explode: [-0.4, 0.2, 0],
      ghost: true,
      shapes: [{ type: 'box', size: [0.31, 0.09, 0.27], radius: 0.02, material: { color: '#8a7d62', roughness: 0.8, opacity: 0.22 } }],
      info: {
        what: 'A rubbery filler poured in around the lower components and left to set (shown as a translucent block).',
        location: 'Filling the space around the components on the main board, inside the case.',
        purpose: 'Carries heat from the components to the case, adds electrical insulation and protects against vibration and moisture.',
        how: 'Liquid silicone or polyurethane is poured in and cures into a solid gel. Because it touches both the hot parts and the case, heat no longer has to cross an insulating air gap.',
        connections: ['main-pcb', 'housing-top', 'housing-bottom', 'gan-transistors'],
        examples: 'Potting is used in LED drivers, outdoor electronics, ignition modules and many high-density chargers.',
        advanced:
          'Thermally conductive (≈0.5–1.5 W/m·K) two-part silicone or polyurethane, degassed under vacuum to avoid voids. Not every charger is potted — it adds weight and cost and makes repair impossible — but it allows higher power density in very small cases.',
        facts: ['A potted charger can’t be opened without destroying it.'],
      },
    },
  ],
  steps: [
    {
      title: '1 · AC in & protection',
      text: 'Mains electricity (100–240 V AC, reversing 50–60 times a second) enters through the prongs. It passes the fuse, which would blow on a serious fault, and the surge protector, which clamps lightning spikes. The common-mode choke and the X and Y capacitors block high-frequency noise from leaking back into your home wiring.',
      focus: ['ac-prongs', 'fuse', 'mov-varistor', 'common-mode-choke', 'x-capacitor', 'y-capacitor'],
      explode: 0.4,
      animate: true,
    },
    {
      title: '2 · Rectify',
      text: 'The bridge rectifier’s four diodes flip every negative half of the AC wave positive. The big bulk capacitors fill up at each peak and smooth the result into high-voltage DC — about 170 V on 120 V mains or 325 V on 230 V mains.',
      focus: ['bridge-rectifier', 'bulk-capacitors'],
      explode: 0.4,
      animate: true,
    },
    {
      title: '3 · Switch & transform',
      text: 'The GaN transistors switch that DC on and off hundreds of thousands of times a second, under command of the controller IC. Each “on” pulse stores energy in the transformer’s gapped ferrite core via the primary winding; each “off” releases it into the secondary winding at a much lower voltage. The magnetic link means there is no electrical connection between the mains and your device.',
      focus: ['gan-transistors', 'primary-controller', 'transformer-core', 'primary-winding', 'secondary-winding'],
      explode: 0.55,
      animate: true,
    },
    {
      title: '4 · Rectify again & smooth',
      text: 'The secondary winding’s pulses pass through the synchronous rectifier MOSFET — a transistor timed to act like a near-perfect diode — and into the output capacitors, which smooth them into clean DC. The optocoupler sends a light signal back across the isolation slot so the controller can hold the voltage exactly on target.',
      focus: ['sync-rectifier', 'output-capacitors', 'optocoupler', 'main-pcb'],
      explode: 0.4,
      animate: true,
    },
    {
      title: '5 · Negotiate USB-PD',
      text: 'When you plug in a cable, only 5 V is offered. The USB-PD controller sends the device a menu of 5, 9, 15 and 20 V options over the CC wire; the device picks one, the controller nudges the feedback loop to that voltage, then switches the output on through the USB-C socket. A laptop might take 20 V × 3.25 A = 65 W; a phone often 9 V × 2.2 A ≈ 20 W.',
      focus: ['usb-pd-controller', 'usb-c-port', 'output-pcb', 'optocoupler'],
      explode: 0.45,
      animate: true,
    },
    {
      title: '6 · Keep it cool',
      text: 'Even at ~94 % efficiency, about 4 W becomes heat. The thermal pad and aluminium heat spreader pull it away from the GaN chips, potting compound conducts it from the components to the case, and the case surface sheds it into the air — keeping the outside below safe touch temperatures.',
      focus: ['thermal-pad', 'heat-spreader', 'potting', 'gan-transistors', 'housing-top'],
      explode: 0.5,
      animate: true,
    },
  ],
};
