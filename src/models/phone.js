import { M } from '../three/materials.js';

/*
 * Modern flagship smartphone, modelled at 10× real size (real ≈ 147 × 71 × 8 mm,
 * here 1.47 m tall × 0.71 m wide × 0.08 m deep). It stands upright on its bottom
 * edge (y = 0), screen facing +Z, back glass facing -Z.
 *
 * Front-to-back layer stack (z, metres at 10×):
 *   cover glass 0.0378 · touch layer 0.0315 · OLED 0.0255 · mid-frame 0.020 ·
 *   vapour chamber 0.0145 · chips 0.006–0.0105 · logic board 0.002 · shield cans -0.004 ·
 *   battery -0.0055 · wireless coil / NFC -0.032 · back glass -0.0378
 * The rear camera island is in the upper +X corner (top-left when seen from the back).
 */

const PI = Math.PI;
const Y0 = 0.735; // vertical centre of the phone
const ALONG_Z = [PI / 2, 0, 0]; // turns a Y-axis cylinder so its axis points along Z
const ALONG_X = [0, 0, PI / 2]; // turns a Y-axis cylinder so its axis points along X

/** Rounded-rectangle outline (CCW), centred on (cx, cy). */
function rrect(w, h, r, seg = 6, cx = 0, cy = 0) {
  const hw = w / 2;
  const hh = h / 2;
  r = Math.min(r, hw, hh);
  const corners = [[hw - r, hh - r, 0], [-hw + r, hh - r, PI / 2], [-hw + r, -hh + r, PI], [hw - r, -hh + r, 1.5 * PI]];
  const pts = [];
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (PI / 2);
      pts.push([cx + x + r * Math.cos(a), cy + y + r * Math.sin(a)]);
    }
  }
  return pts;
}

/** Rounded slab (XY outline, thickness along Z) whose final size includes the bevel. */
function slab(w, h, r, depth, bevel = 0, extra = {}) {
  return {
    type: 'extrude',
    outline: rrect(w - 2 * bevel, h - 2 * bevel, Math.max(r - bevel, 0.0005), 8),
    depth: Math.max(depth - 2 * bevel, 0.0002),
    bevel,
    ...extra,
  };
}

/** Rounded rectangle path starting at the bottom-centre gap, going CCW, ending at the other side of the gap. */
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

/** A rounded-rectangle band (frame) as one outline: outer loop, then inner loop reversed, joined at a bottom gap. */
function bandOutline(w, h, r, wall, gap) {
  const outer = openRRect(w, h, r, gap);
  const inner = openRRect(w - 2 * wall, h - 2 * wall, Math.max(r - wall, 0.004), gap).reverse();
  return [...outer, ...inner];
}

/** Convert world-space points into a part's local space. */
const rel = (pts, o) => pts.map(([x, y, z]) => [x - o[0], y - o[1], z - o[2]]);
const rel2 = (pts, o) => pts.map(([x, y]) => [x - o[0], y - o[1]]);

// ---------------------------------------------------------------- materials
const GLASS = M.glass('#d6ecff');
const BACK_GLASS = { color: '#c7cbd3', metalness: 0.15, roughness: 0.55, clearcoat: 0.8, clearcoatRoughness: 0.4, opacity: 0.42 };
const OLED_PANEL = { color: '#06080d', metalness: 0.2, roughness: 0.2, clearcoat: 1 };
const WALLPAPER = { color: '#0b1838', emissive: '#1b3f9a', emissiveIntensity: 0.75, roughness: 0.3 };
const PCB = M.plastic('#173a2b');
const CHIP = M.plastic('#15171b');
const CHIP_LID = M.brushed('#a7adb5');
const POLYIMIDE = { color: '#c98a2e', metalness: 0.25, roughness: 0.42, emissive: '#7a3d00', emissiveIntensity: 0.15 };
const COIL = { ...M.copper(), emissive: '#ff7a2f', emissiveIntensity: 0.2 };
const FERRITE = { color: '#2b2c30', metalness: 0.25, roughness: 0.72 };
const GOLD = { color: '#d4a52c', metalness: 1, roughness: 0.25 };
const BLACK = M.plastic('#121317');
const LENS = { color: '#0a0f22', metalness: 0.4, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 };
const SENSOR_DIE = { color: '#4a3570', metalness: 0.7, roughness: 0.15, clearcoat: 1 };
const MAGNET = M.metal('#8e949c');
const SHIELD = M.brushed('#bfc4ca');

// ---------------------------------------------------------------- home-screen icons
const ICON_COLORS = ['#34c759', '#0a84ff', '#ff9f0a', '#ff375f', '#bf5af2'];
const iconShapes = [];
ICON_COLORS.forEach((c, r) => {
  iconShapes.push({
    type: 'extrude', outline: rrect(0.115, 0.115, 0.03, 4), depth: 0.0006,
    position: [-0.21, 0.46 - r * 0.165, 0.0029], array: { count: 4, offset: [0.14, 0, 0] },
    material: M.light(c, 0.55),
  });
});
iconShapes.push(
  { type: 'extrude', outline: rrect(0.62, 0.17, 0.06, 6), depth: 0.0004, position: [0, -0.585, 0.0027],
    material: { color: '#2a3550', emissive: '#3a4d7a', emissiveIntensity: 0.5, roughness: 0.4 } },
  { type: 'extrude', outline: rrect(0.115, 0.115, 0.03, 4), depth: 0.0006,
    position: [-0.21, -0.585, 0.003], array: { count: 4, offset: [0.14, 0, 0] }, material: M.light('#e5e5ea', 0.45) },
);

// ---------------------------------------------------------------- logic board outline (L-shape around the camera)
const BOARD_O = [-0.1, 1.15, 0.002];
const BOARD_OUTLINE = rel2([[-0.31, 0.95], [0.31, 0.95], [0.31, 1.08], [0.01, 1.08], [0.01, 1.37], [-0.31, 1.37]], BOARD_O);

// ---------------------------------------------------------------- camera module
const CAM = [0.17, 1.235]; // camera island centre (x, y)
const LENSES = [
  { dx: -0.07, dy: 0.07, r: 0.058, sensor: [0.1, 0.078] }, // main (wide)
  { dx: -0.07, dy: -0.07, r: 0.05, sensor: [0.07, 0.055] }, // ultra-wide
  { dx: 0.075, dy: 0.0, r: 0.05, sensor: [0.06, 0.046] }, // telephoto
];
const lensShapes = [];
for (const l of LENSES) {
  lensShapes.push(
    { type: 'cylinder', radius: l.r, height: 0.051, rotation: ALONG_Z, position: [l.dx, l.dy, -0.0215], material: M.metal('#2f333a') },
    { type: 'cylinder', radius: l.r * 0.8, height: 0.002, rotation: ALONG_Z, position: [l.dx, l.dy, -0.0478], material: LENS },
    { type: 'sphere', radius: l.r * 0.55, scale: [1, 1, 0.22], position: [l.dx, l.dy, -0.0472], material: { ...LENS, color: '#1b2a55' } },
    { type: 'torus', radius: l.r + 0.002, tube: 0.0045, radialSegments: 10, position: [l.dx, l.dy, -0.0455], material: M.chrome() },
  );
}
const sensorShapes = [];
for (const l of LENSES) {
  const [sw, sh] = l.sensor;
  sensorShapes.push(
    { type: 'box', size: [sw + 0.02, sh + 0.02, 0.002], position: [l.dx, l.dy, 0.001], material: PCB },
    { type: 'box', size: [sw + 0.008, sh + 0.008, 0.0015], position: [l.dx, l.dy, -0.0008], material: CHIP },
    { type: 'box', size: [sw, sh, 0.0006], position: [l.dx, l.dy, -0.0018], material: SENSOR_DIE },
  );
}

// ---------------------------------------------------------------- wireless charging coil
const COIL_C = [0, 0.7, -0.032];
const coilShapes = [
  { type: 'cylinder', radius: 0.205, height: 0.0012, segments: 64, rotation: ALONG_Z, position: [0, 0, 0.0024], material: FERRITE },
];
for (let i = 0; i < 11; i++) {
  coilShapes.push({ type: 'torus', radius: 0.07 + i * 0.012, tube: 0.0017, radialSegments: 6, tubularSegments: 72, material: COIL });
}
coilShapes.push(
  { type: 'tube', points: [[0.07, 0, 0], [0.04, -0.04, 0.001], [0.03, -0.2, 0.001], [0.03, -0.25, 0.002]], radius: 0.0022, radialSegments: 6, material: COIL },
  { type: 'box', size: [0.05, 0.03, 0.002], position: [0.03, -0.26, 0.002], material: POLYIMIDE },
);

// ---------------------------------------------------------------- NFC loops
const NFC_C = [-0.02, 0.99, -0.032];
const nfcShapes = [{ type: 'box', size: [0.5, 0.1, 0.0008], material: POLYIMIDE }];
for (let k = 0; k < 3; k++) {
  const pts = rrect(0.47 - k * 0.022, 0.08 - k * 0.022, 0.02 - k * 0.005, 4).map(([x, y]) => [x, y, -0.0008]);
  nfcShapes.push({ type: 'tube', points: pts, closed: true, radius: 0.0011, segments: 160, radialSegments: 5, material: COIL });
}

// ---------------------------------------------------------------- flex cables (world space, part at origin)
const FLEX = { ...POLYIMIDE };
const flexShapes = [
  // display flex: from the bottom of the OLED, folded back and up the right side to the board
  { type: 'tube', points: [[0.12, 0.045, 0.024], [0.12, 0.016, 0.019], [0.13, 0.04, 0.0145], [0.3, 0.11, 0.0145], [0.312, 0.5, 0.0145], [0.3, 0.92, 0.0145], [0.27, 0.985, 0.009]],
    radius: 0.0032, radialSegments: 6, material: FLEX },
  // lower (dock) flex: USB-C, bottom mic and speaker up the left side to the board
  { type: 'tube', points: [[-0.05, 0.075, 0.0145], [-0.2, 0.1, 0.0145], [-0.308, 0.16, 0.0145], [-0.31, 0.6, 0.0145], [-0.295, 0.93, 0.012], [-0.27, 0.975, 0.0085]],
    radius: 0.0032, radialSegments: 6, material: FLEX },
  // battery flex
  { type: 'tube', points: [[-0.03, 0.91, 0.012], [-0.04, 0.94, 0.012], [-0.05, 0.965, 0.0085]], radius: 0.004, radialSegments: 6, material: FLEX },
  // camera flex
  { type: 'tube', points: [[0.1, 1.12, 0.009], [0.04, 1.085, 0.0095], [0.0, 1.06, 0.0085]], radius: 0.003, radialSegments: 6, material: FLEX },
  // front sensor flex
  { type: 'tube', points: [[-0.03, 1.345, 0.012], [-0.045, 1.33, 0.0105], [-0.06, 1.31, 0.0085]], radius: 0.003, radialSegments: 6, material: FLEX },
  // board-to-board connectors
  { type: 'box', size: [0.04, 0.018, 0.004], position: [0.27, 0.985, 0.0075], material: BLACK },
  { type: 'box', size: [0.04, 0.018, 0.004], position: [-0.27, 0.975, 0.0075], material: BLACK },
  { type: 'box', size: [0.05, 0.02, 0.004], position: [-0.05, 0.965, 0.0075], material: BLACK },
  { type: 'box', size: [0.03, 0.015, 0.004], position: [0.0, 1.06, 0.0075], material: BLACK },
];

export default {
  id: 'phone',
  name: 'Smartphone',
  category: 'appliances',
  tagline: 'A supercomputer, camera, radio and battery stacked into 8 mm of glass and metal.',
  description:
    'A modern flagship smartphone, shown at 10× real size (the real phone is about 147 × 71 × 8 mm). Explode it to see how the cover glass, OLED screen, logic board, battery, cameras and antennas are stacked like a layer cake — then follow a touch, a photo, a call and a charge through the parts.',
  camera: { position: [1.9, 1.3, 2.3], target: [0, 0.72, 0] },
  explodeScale: 1,
  systems: [
    { id: 'display', name: 'Display & Touch', color: '#4cc9f0' },
    { id: 'structure', name: 'Structure & Housing', color: '#adb5bd' },
    { id: 'compute', name: 'Compute & Memory', color: '#7b5cff' },
    { id: 'power', name: 'Power & Charging', color: '#3ddc97' },
    { id: 'cameras', name: 'Cameras', color: '#ff9f43' },
    { id: 'audio', name: 'Audio', color: '#ff4d8d' },
    { id: 'connectivity', name: 'Connectivity', color: '#ffd166' },
    { id: 'sensors', name: 'Sensors & Haptics', color: '#06d6a0' },
  ],
  parts: [
    // ================================================================ DISPLAY
    {
      id: 'cover-glass',
      name: 'Cover Glass',
      system: 'display',
      position: [0, Y0, 0.0378],
      explode: [0, 0, 0.62],
      shapes: [slab(0.7, 1.46, 0.088, 0.0045, 0.0012, { material: GLASS })],
      info: {
        what: 'The tough, clear sheet of glass that forms the whole front of the phone. Everything you see and touch is underneath it.',
        location: 'The outermost front layer, glued into the edge of the metal frame.',
        purpose: 'Protects the fragile display from scratches and drops while letting light out and your finger’s electric field through.',
        how: 'The glass is chemically strengthened: it is soaked in hot molten salt so big potassium atoms swap in for smaller sodium atoms near the surface. The crowded surface is squeezed into compression, so a crack has to overcome that squeeze before it can grow. An oil-repelling coating on top helps fingerprints wipe off.',
        connections: ['touch-digitizer', 'oled-display', 'frame'],
        examples: 'Corning Gorilla Glass, Apple “Ceramic Shield”, the screen protector you add on top is a sacrificial copy of this layer.',
        advanced:
          'Alkali-aluminosilicate glass about 0.5–0.7 mm thick, ion-exchanged in molten KNO₃ at ~400 °C, giving a compressive-stress layer of roughly 700–900 MPa and 30–100 µm depth. Ceramic-type variants grow nano-crystals inside the glass for toughness. Scratch hardness is ~Mohs 6–7, so sand (quartz, Mohs 7) can still scratch it. An oleophobic fluoropolymer coating (a few nm) wears off over 1–2 years.',
        facts: ['Most drop damage starts at the corners, which is why phone corners are rounded and cases are thicker there.', 'The glass is under so much internal stress that a broken one shatters into a spider-web instead of falling apart.'],
      },
    },
    {
      id: 'touch-digitizer',
      name: 'Touch Sensor (Digitizer)',
      system: 'display',
      position: [0, Y0, 0.0315],
      explode: [0, 0, 0.52],
      anim: { type: 'flow', speed: 4 },
      shapes: [
        slab(0.682, 1.442, 0.08, 0.0006, 0, { material: { ...M.glass('#a8d8ff'), opacity: 0.22 } }),
        { type: 'box', size: [0.66, 0.003, 0.0004], position: [0, -0.66, 0.0005], array: { count: 23, offset: [0, 0.06, 0] },
          material: { color: '#7fd0ff', metalness: 0.5, roughness: 0.3, emissive: '#2a8fd8', emissiveIntensity: 0.5, opacity: 0.75 } },
        { type: 'box', size: [0.003, 1.4, 0.0004], position: [-0.3, 0, -0.0005], array: { count: 11, offset: [0.06, 0, 0] },
          material: { color: '#9ef0c8', metalness: 0.5, roughness: 0.3, emissive: '#25b37a', emissiveIntensity: 0.5, opacity: 0.75 } },
        { type: 'box', size: [0.12, 0.05, 0.0008], position: [-0.12, -0.7, 0], material: POLYIMIDE },
        { type: 'box', size: [0.04, 0.03, 0.0015], position: [-0.12, -0.7, -0.001], material: CHIP },
      ],
      info: {
        what: 'An invisible grid of transparent wires that senses exactly where your fingers touch the screen.',
        location: 'Between the cover glass and the OLED pixels (in modern phones it is printed directly on top of the OLED).',
        purpose: 'Turns taps, swipes and pinches into X/Y coordinates the processor can understand.',
        how: 'One set of lines runs across the screen and another runs up and down. A controller chip sends tiny signals down each row and listens on each column. Your finger is slightly conductive, so it “steals” some of the electric field where it touches; the controller sees the drop at that crossing point and calculates the position — for up to 10 fingers at once.',
        connections: ['cover-glass', 'oled-display', 'soc', 'flex-cables'],
        examples: 'Phones, tablets, laptop trackpads and car infotainment screens all use projected-capacitive touch. It is why a normal glove does not work but a “touchscreen glove” with conductive thread does.',
        advanced:
          'Projected-capacitive (PCAP) mutual-capacitance sensing. Electrodes are indium-tin-oxide or a fine metal mesh (~3–5 µm lines). Samsung-style “Y-OCTA” / on-cell designs pattern the electrodes on the OLED thin-film encapsulation, saving a separate film and ~0.1 mm. The controller scans at 120–240 Hz (up to ~480 Hz in gaming phones) and applies noise filtering because chargers and the display itself inject interference. Typical accuracy is ±1 mm.',
        facts: ['Water on the screen confuses the sensor because water is conductive too.', 'Each crossing point of the grid is effectively a tiny capacitor of only a few picofarads.'],
      },
    },
    {
      id: 'oled-display',
      name: 'OLED Display Panel',
      system: 'display',
      position: [0, Y0, 0.0255],
      explode: [0, 0, 0.42],
      shapes: [
        slab(0.684, 1.444, 0.082, 0.0045, 0.0008, { material: OLED_PANEL }),
        slab(0.664, 1.424, 0.075, 0.0004, 0, { position: [0, 0, 0.0024], material: WALLPAPER }),
        ...iconShapes,
        { type: 'capsule', radius: 0.03, length: 0.15, rotation: [0, 0, PI / 2], scale: [1, 1, 0.06], position: [-0.005, 0.635, 0.003], material: { color: '#000000', roughness: 0.3 } },
        // flexible bottom “bend” that folds the panel’s driver tail behind the screen
        { type: 'cylinder', radius: 0.004, height: 0.24, thetaLength: PI, rotation: [0, 0, -PI / 2], position: [0.12, -0.722, -0.004], material: OLED_PANEL },
      ],
      info: {
        what: 'The screen itself: millions of tiny red, green and blue lights that each switch on and off by themselves to make the picture.',
        location: 'Directly under the touch layer and cover glass, resting on the aluminium mid-frame.',
        purpose: 'Shows everything you see — text, photos, video — bright enough for sunlight while using as little battery as possible.',
        how: 'Every pixel has three sub-pixels made of organic (carbon-based) materials that glow when current flows through them. A grid of microscopic transistors behind them (the backplane) decides how much current each sub-pixel gets 60–120 times per second. Black pixels are simply switched off, which saves power and gives perfect contrast.',
        connections: ['touch-digitizer', 'cover-glass', 'mid-frame', 'soc', 'flex-cables'],
        examples: 'Flagship phones, smartwatches, OLED TVs. Older and cheaper phones use LCD screens with a backlight instead.',
        advanced:
          'AMOLED on a flexible polyimide substrate with an LTPO (low-temperature polycrystalline oxide) TFT backplane, letting refresh rate drop from 120 Hz to 1 Hz for always-on display. ~460 ppi, ~2.5–3 million pixels, peak brightness ~2000–3000 nits outdoors. OLED vs LCD: an LCD needs a constant LED backlight plus liquid-crystal shutters and two polarisers, so blacks leak light and the stack is thicker; OLED is self-emissive, thinner, bendable and has near-infinite contrast, but blue emitters age faster (burn-in) and brightness is often dimmed with PWM flicker. The bottom of the panel is folded 180° behind itself (the “pad bending”) so the driver IC hides under the screen and bezels can be ~1.5 mm.',
        facts: ['Dark mode genuinely saves battery on OLED screens because black pixels draw almost no power.', 'The panel is so thin and flexible that the same technology is used in folding phones.'],
      },
    },

    // ================================================================ STRUCTURE
    {
      id: 'frame',
      name: 'Metal Frame (Chassis)',
      system: 'structure',
      position: [0, Y0, 0],
      explode: [0, 0, 0],
      shapes: [
        { type: 'extrude', outline: bandOutline(0.702, 1.462, 0.086, 0.012, 0.052), depth: 0.064, bevel: 0.004, material: M.aluminium() },
        // frame material above and below the USB-C opening
        { type: 'box', size: [0.096, 0.02, 0.019], position: [0, -0.725, 0.0265], material: M.aluminium() },
        { type: 'box', size: [0.096, 0.02, 0.019], position: [0, -0.725, -0.0265], material: M.aluminium() },
      ],
      info: {
        what: 'The metal band that runs around the edge of the phone. It is the skeleton everything else is fixed to.',
        location: 'The outside edge of the phone, between the front and back glass.',
        purpose: 'Gives the phone its strength and stiffness, holds the glass panels, carries the buttons and doubles as the antennas.',
        how: 'It is machined from a single block of metal by computer-controlled cutters, which makes it very stiff. The glass panels are glued into ledges on its front and back. Thin plastic-filled gaps split the band into separate pieces so each piece can work as an antenna.',
        connections: ['mid-frame', 'cover-glass', 'back-glass', 'antenna-bands', 'volume-buttons', 'power-button', 'usb-c-port'],
        examples: 'Aluminium on most phones, stainless steel or titanium on “Pro” models. Laptops use the same CNC “unibody” approach.',
        advanced:
          'Typically 6000/7000-series aluminium (anodised for colour and hardness) or Grade 5 titanium (Ti-6Al-4V) bonded to an aluminium inner structure. CNC milling takes many hours per part. Rubber gaskets and adhesives at the seams achieve IP68 water resistance (e.g. 6 m for 30 min). The band is grounded to the logic board through spring contacts so its segments resonate at chosen frequencies.',
        facts: ['Titanium is about 45 % lighter than stainless steel for the same strength.', 'Bending a phone frame takes several hundred newtons — the glass usually cracks first.'],
      },
    },
    {
      id: 'mid-frame',
      name: 'Mid-frame Plate',
      system: 'structure',
      position: [0, 0.68, 0.02],
      explode: [0, 0, 0.24],
      shapes: [
        slab(0.672, 1.24, 0.07, 0.004, 0.0008, { material: M.brushed('#aeb4bc') }),
        { type: 'cylinder', radius: 0.008, height: 0.006, rotation: ALONG_Z, position: [-0.3, -0.58, -0.003], material: M.metal('#7d858f'),
          array: { count: 2, offset: [0.6, 0, 0] } },
        { type: 'cylinder', radius: 0.008, height: 0.006, rotation: ALONG_Z, position: [-0.3, 0.58, -0.003], material: M.metal('#7d858f'),
          array: { count: 2, offset: [0.6, 0, 0] } },
      ],
      info: {
        what: 'A thin metal plate that spans the inside of the phone like a floor between the screen and the electronics.',
        location: 'Directly behind the display, joined to the metal frame all the way round.',
        purpose: 'Supports the screen, stiffens the phone against bending, spreads heat and gives the electronics a solid ground plane.',
        how: 'The display is glued to its front face; the battery, board and speakers are screwed or glued to its back. Because metal conducts heat well it pulls warmth away from hot spots, and it shields the screen from radio noise.',
        connections: ['frame', 'oled-display', 'vapour-chamber', 'battery', 'logic-board'],
        examples: 'Laptops and tablets have the same idea: a “midframe” or “keyboard deck” that everything mounts to.',
        advanced:
          'Usually die-cast or stamped aluminium (sometimes partly recycled), 0.3–0.5 mm thick, with insert-moulded plastic and threaded bosses. It is bonded or welded to the outer band so the two act as one torsion box. In some designs the graphite heat-spreading sheets are laminated to it to move heat sideways toward the frame.',
        facts: ['The mid-frame makes the phone far stiffer than the glass and band alone.'],
      },
    },
    {
      id: 'back-glass',
      name: 'Back Glass & Camera Plateau',
      system: 'structure',
      position: [0, Y0, -0.0378],
      explode: [0, 0, -0.58],
      ghost: true,
      shapes: [
        slab(0.7, 1.46, 0.088, 0.0045, 0.0012, { material: BACK_GLASS }),
        slab(0.33, 0.33, 0.075, 0.004, 0.0012, { position: [CAM[0], CAM[1] - Y0, -0.0042], material: { ...BACK_GLASS, color: '#a9aeb7' } }),
      ],
      info: {
        what: 'The glass panel that forms the back of the phone, with a raised “plateau” where the cameras poke through.',
        location: 'The rearmost layer, glued into the back of the metal frame.',
        purpose: 'Seals and protects the inside of the phone and, unlike metal, lets the magnetic field from a wireless charger pass straight through.',
        how: 'A metal back would act like a shield: the charger’s changing magnetic field would make swirling “eddy” currents in it, wasting energy as heat. Glass is an insulator, so the field reaches the coil inside. The matte look comes from etching the surface into microscopic bumps that scatter light.',
        connections: ['frame', 'wireless-coil', 'magnet-ring', 'camera-lenses', 'flash-lidar'],
        examples: 'Almost every phone with wireless charging has a glass or plastic back; older all-metal phones could not charge wirelessly.',
        advanced:
          'Strengthened aluminosilicate glass, 0.5–0.7 mm, often with a textured (etched) finish and a coloured ink layer on the inside. It is bonded with pressure-sensitive adhesive. Since ~2023 several makers allow the back glass to be replaced separately with a modular frame design. It is shown semi-transparent here so you can see the parts underneath.',
        facts: ['Back glass is often more expensive to repair than the screen on older models because it was laser-welded on.'],
      },
    },
    {
      id: 'volume-buttons',
      name: 'Volume & Action Buttons',
      system: 'structure',
      position: [-0.358, 1.05, 0],
      explode: [-0.18, 0, 0],
      shapes: [
        { type: 'box', size: [0.012, 0.11, 0.024], radius: 0.005, position: [0, 0.07, 0], material: M.aluminium() },
        { type: 'box', size: [0.012, 0.11, 0.024], radius: 0.005, position: [0, -0.07, 0], material: M.aluminium() },
        { type: 'box', size: [0.012, 0.07, 0.024], radius: 0.005, position: [0, 0.24, 0], material: M.aluminium() },
        { type: 'box', size: [0.006, 0.36, 0.01], position: [0.012, 0.085, 0], material: POLYIMIDE },
      ],
      info: {
        what: 'The physical buttons on the left side: volume up, volume down and a programmable action/mute button.',
        location: 'Left edge of the frame, about two-thirds of the way up.',
        purpose: 'Give quick, eyes-free control of volume, silencing and shortcuts — even with gloves on.',
        how: 'Each button presses a tiny metal dome switch on a strip of flexible circuit inside the frame. When the dome snaps flat it closes a contact, the board registers a press, and the dome springs back for the next click.',
        connections: ['frame', 'flex-cables', 'logic-board'],
        examples: 'Volume rockers on phones, TV remotes and game controllers all use similar snap-dome switches.',
        advanced:
          'Stainless-steel snap domes give a defined click force (~1.6–2.5 N) and are rated for 100,000+ cycles. Buttons are sealed with silicone O-rings for water resistance. Some newer designs replace mechanical travel with pressure (force) sensors and haptic feedback, or add a capacitive surface to detect light touches and swipes.',
        facts: ['Pressing volume-up while taking a photo works as a shutter button.'],
      },
    },
    {
      id: 'power-button',
      name: 'Side (Power) Button',
      system: 'structure',
      position: [0.358, 1.08, 0],
      explode: [0.18, 0.04, 0],
      shapes: [
        { type: 'box', size: [0.012, 0.17, 0.024], radius: 0.005, material: M.aluminium() },
        { type: 'box', size: [0.006, 0.2, 0.01], position: [-0.012, 0, 0], material: POLYIMIDE },
      ],
      info: {
        what: 'The long button on the right side that wakes, locks and powers the phone.',
        location: 'Right edge of the frame, opposite the volume buttons.',
        purpose: 'Turns the screen on and off, confirms payments, calls an emergency SOS when held, and forces a restart.',
        how: 'Like the volume buttons, it presses a metal dome switch. Its signal goes to the power-management chip, which can wake the phone even when the main processor is asleep.',
        connections: ['frame', 'pmic', 'soc'],
        examples: 'Power buttons on laptops, consoles and smartwatches.',
        advanced:
          'Wired to an always-on input of the PMIC so a long press can trigger a hardware reset independent of software (a watchdog). Some Android phones build a capacitive fingerprint sensor into this button.',
        facts: ['Holding side + a volume button for a few seconds triggers emergency SOS on many phones.'],
      },
    },
    {
      id: 'sim-tray',
      name: 'SIM Tray',
      system: 'connectivity',
      position: [0.3, 0.78, 0],
      explode: [0.36, 0, 0],
      shapes: [
        { type: 'box', size: [0.105, 0.16, 0.012], radius: 0.004, material: M.brushed('#9aa1aa') },
        { type: 'box', size: [0.006, 0.165, 0.028], radius: 0.0028, position: [0.054, 0, 0], material: M.aluminium() },
        { type: 'box', size: [0.088, 0.123, 0.0016], radius: 0.0007, position: [-0.004, 0, 0.0065], material: M.plastic('#e8e6df') },
        { type: 'box', size: [0.05, 0.05, 0.0004], position: [-0.004, 0, 0.0075], material: GOLD },
        { type: 'cylinder', radius: 0.0035, height: 0.006, rotation: ALONG_X, position: [0.057, -0.06, 0], material: BLACK },
      ],
      info: {
        what: 'A small metal drawer that holds the SIM card — the chip that proves to the mobile network who you are.',
        location: 'Right side of the frame, below the side button; it slides into a slot beside the battery.',
        purpose: 'Lets you insert or swap a physical SIM card to connect to a mobile carrier.',
        how: 'Push a pin into the tiny hole and a lever pops the tray out. When the tray is in, springy gold contacts press against the SIM’s pads. The SIM contains a secure micro-chip holding your subscriber identity (IMSI) and secret keys used to log on to the network.',
        connections: ['modem', 'frame', 'logic-board'],
        examples: 'Nano-SIM in most phones; many newer phones use an eSIM — a soldered-in chip you program by scanning a QR code — and some have dropped the tray entirely.',
        advanced:
          'Nano-SIM (4FF) is 12.3 × 8.8 × 0.67 mm. The UICC runs a Java Card OS and performs AKA authentication: the network sends a random challenge, and the SIM computes a response with its secret key K, which never leaves the chip. The tray has a silicone gasket for IP68 sealing. eSIM (eUICC) chips are ~6 × 5 mm and can store several carrier profiles.',
        facts: ['A nano-SIM is about the size of your little-fingernail.', 'The SIM, not the phone, is what the carrier bills.'],
      },
    },

    // ================================================================ COMPUTE
    {
      id: 'logic-board',
      name: 'Logic Board (Mainboard)',
      system: 'compute',
      position: BOARD_O,
      explode: [-0.06, 0.06, 0.02],
      shapes: [
        { type: 'extrude', outline: BOARD_OUTLINE, depth: 0.0026, position: [0, 0, 0.0027], material: PCB },
        { type: 'extrude', outline: BOARD_OUTLINE, depth: 0.0026, position: [0, 0, -0.0027], material: PCB },
        // interposer walls between the two stacked boards
        { type: 'box', size: [0.6, 0.006, 0.003], position: [0.1, -0.195, 0], material: GOLD },
        { type: 'box', size: [0.006, 0.4, 0.003], position: [-0.205, 0.015, 0], material: GOLD },
        { type: 'box', size: [0.006, 0.4, 0.003], position: [0.105, 0.015, 0], material: GOLD },
        // tiny passive components
        { type: 'box', size: [0.008, 0.004, 0.002], position: [-0.19, -0.075, 0.0048], array: { count: 10, offset: [0.012, 0, 0] }, material: M.plastic('#8a6a45') },
        { type: 'box', size: [0.008, 0.004, 0.002], position: [-0.19, 0.205, 0.0048], array: { count: 12, offset: [0.012, 0, 0] }, material: M.plastic('#8a6a45') },
        { type: 'box', size: [0.004, 0.008, 0.002], position: [0.08, 0.03, 0.0048], array: { count: 8, offset: [0, 0.02, 0] }, material: M.plastic('#8a6a45') },
      ],
      info: {
        what: 'The phone’s main circuit board — the “motherboard” — on which the processor, memory, storage and radios are soldered.',
        location: 'The upper half of the phone, wrapped in an L-shape around the camera module and behind the mid-frame.',
        purpose: 'Connects every chip with thousands of microscopic copper wires and links to the screen, battery, cameras and ports.',
        how: 'It is a sandwich of many thin layers of copper wiring separated by insulation, joined by laser-drilled holes. In flagship phones two boards are stacked on top of each other with a ring-shaped “interposer” between them, doubling the space for chips in the same footprint.',
        connections: ['soc', 'ram', 'storage', 'modem', 'pmic', 'motion-sensors', 'shield-cans', 'flex-cables', 'battery'],
        examples: 'Every electronic device has a board like this; a phone board is one of the densest ever mass-produced.',
        advanced:
          'High-density interconnect (HDI) PCB with ~10–12 layers and “any-layer” stacked micro-vias (~75 µm), line widths down to ~30 µm. Substrate-like PCB (SLP) uses semi-additive processing for finer lines. Stacking two boards via an interposer saves ~15 % area for a bigger battery. Components as small as 01005 (0.4 × 0.2 mm) capacitors are placed by machines and reflow-soldered.',
        facts: ['A phone board can have well over 1,000 individual components.', 'Flagship boards are often smaller than a credit card at real size.'],
      },
    },
    {
      id: 'soc',
      name: 'System-on-Chip (Processor)',
      system: 'compute',
      position: [-0.15, 1.23, 0.00725],
      explode: [-0.05, 0.08, 0.09],
      anim: { type: 'flow', speed: 5 },
      shapes: [
        { type: 'box', size: [0.13, 0.13, 0.0008], position: [0, 0, -0.0009], material: M.plastic('#2c4a3a') },
        { type: 'box', size: [0.12, 0.12, 0.0022], radius: 0.001, material: { ...CHIP, emissive: '#5b3cff', emissiveIntensity: 0.25 } },
        { type: 'box', size: [0.005, 0.005, 0.0006], position: [-0.055, -0.055, 0.0011], material: GOLD },
      ],
      info: {
        what: 'The phone’s brain: a single chip that contains the main processor, graphics processor, AI engine and much more.',
        location: 'On the upper logic board, directly under the RAM chip and the vapour chamber.',
        purpose: 'Runs the operating system and apps, draws the graphics, processes photos and runs on-device AI — all while sipping battery.',
        how: 'Billions of microscopic transistors switch on and off billions of times per second. Different blocks specialise: big “performance” CPU cores for heavy work, small “efficiency” cores for background tasks, a GPU for graphics, a neural engine for AI, and an image processor for the camera. The chip moves work to whichever block can do it with the least energy.',
        connections: ['ram', 'storage', 'modem', 'pmic', 'vapour-chamber', 'logic-board', 'image-sensors', 'oled-display'],
        examples: 'Apple A-series, Qualcomm Snapdragon, Google Tensor, MediaTek Dimensity, Samsung Exynos.',
        advanced:
          'Built on 3 nm-class processes (e.g. TSMC N3E) with ~19–20 billion transistors in ~100 mm². Typical layout: 2 performance + 4 efficiency ARM-architecture CPU cores (big.LITTLE / heterogeneous), 5–6 core GPU with hardware ray-tracing, a 16-core NPU at ~35 TOPS, ISP, video codecs, display engine and a Secure Enclave for keys and biometrics. Dynamic voltage & frequency scaling runs cores from ~0.6 V to ~1.1 V and up to ~4 GHz; sustained performance is limited by the ~5–8 W the phone can shed as heat.',
        facts: ['A modern phone chip is faster than the world’s top supercomputers of the mid-1990s.', 'The “3 nm” name is marketing — the smallest real features are larger, but transistors are packed ~200 million per mm².'],
      },
    },
    {
      id: 'ram',
      name: 'RAM (Working Memory)',
      system: 'compute',
      position: [-0.15, 1.23, 0.0095],
      explode: [-0.05, 0.1, 0.13],
      shapes: [
        { type: 'box', size: [0.115, 0.115, 0.002], radius: 0.0008, material: CHIP },
        { type: 'box', size: [0.05, 0.02, 0.0004], position: [0.02, -0.035, 0.0011], material: M.plastic('#3a3d44') },
      ],
      info: {
        what: 'Fast, temporary memory where the phone keeps the apps and data it is using right now.',
        location: 'Stacked directly on top of the processor chip (“package-on-package”).',
        purpose: 'Gives the processor super-quick access to working data so apps open instantly and stay open in the background.',
        how: 'Each bit is stored as a tiny electric charge in a capacitor that slowly leaks, so the memory refreshes itself thousands of times a second. Because it needs power to hold data, everything in RAM is lost when the phone switches off. Sitting right on top of the processor keeps the wires short and fast.',
        connections: ['soc', 'storage', 'logic-board'],
        examples: '8 GB in typical flagships, 12–16 GB in some Android phones. Your laptop’s RAM sticks do the same job.',
        advanced:
          'LPDDR5X DRAM at up to ~8533 MT/s on a 64-bit bus (~68 GB/s). Package-on-package (PoP) stacking puts the DRAM directly above the SoC with solder balls around the edge, minimising trace length and power. LPDDR uses low 0.5 V I/O swings, deep sleep and partial-array self-refresh to save battery. More RAM matters increasingly for on-device AI models, which can need several GB.',
        facts: ['The RAM chip itself is built from several stacked silicon dies.'],
      },
    },
    {
      id: 'storage',
      name: 'Flash Storage (NAND)',
      system: 'compute',
      position: [-0.235, 1.015, 0.0075],
      explode: [-0.08, -0.04, 0.07],
      shapes: [
        { type: 'box', size: [0.1, 0.09, 0.003], radius: 0.001, material: CHIP },
        { type: 'box', size: [0.03, 0.012, 0.0004], position: [-0.025, 0.03, 0.0016], material: M.plastic('#5a5e66') },
      ],
      info: {
        what: 'The phone’s permanent memory, where apps, photos, music and the operating system are kept.',
        location: 'On the lower strip of the logic board, left side.',
        purpose: 'Stores data permanently, even when the phone is switched off.',
        how: 'Flash memory traps electrons in microscopic cells. The number of trapped electrons sets the stored value, and they stay put without power. A controller spreads writes evenly across the cells (wear levelling) because each cell can only be rewritten a limited number of times.',
        connections: ['soc', 'ram', 'logic-board'],
        examples: '128 GB to 1 TB in phones; SSDs, USB sticks and SD cards use the same NAND flash.',
        advanced:
          '3D TLC NAND (3 bits per cell) with 200+ vertically stacked layers, accessed through an NVMe-style controller over PCIe or UFS 4.0 (~4 GB/s reads). All data is encrypted on the fly with AES-256 using keys held in the SoC’s secure enclave, so a removed chip is unreadable. Endurance is ~1,000–3,000 program/erase cycles per cell, far more than a phone ever uses.',
        facts: ['A 1 TB chip holds around 250,000 photos.'],
      },
    },
    {
      id: 'shield-cans',
      name: 'EMI Shield Cans',
      system: 'compute',
      position: [0, 0, -0.004],
      explode: [-0.06, 0.06, -0.08],
      shapes: [
        { type: 'box', size: [0.29, 0.26, 0.004], radius: 0.0015, position: [-0.15, 1.225, 0], material: SHIELD },
        { type: 'box', size: [0.58, 0.1, 0.004], radius: 0.0015, position: [0, 1.015, 0], material: SHIELD },
        { type: 'cylinder', radius: 0.0025, height: 0.001, rotation: ALONG_Z, position: [-0.28, 1.12, -0.0021], material: M.metal('#7d858f'),
          array: { count: 6, offset: [0.05, 0, 0] } },
      ],
      info: {
        what: 'Thin metal lids soldered over groups of chips on the back of the logic board.',
        location: 'On the rear face of the logic board, between the board and the back glass.',
        purpose: 'Stop chips from leaking radio noise into each other and into the antennas — and keep outside interference out.',
        how: 'A closed metal box acts as a Faraday cage: electromagnetic waves hitting it induce currents in the metal that cancel the field inside. The cans here cover the radio front-end amplifiers, filters, audio and power circuits.',
        connections: ['logic-board', 'modem', 'pmic'],
        examples: 'Any wireless device — Wi-Fi routers, laptops, smart speakers — has shield cans over its radio chips.',
        advanced:
          'Stamped nickel-silver or tin-plated steel ~0.1–0.15 mm thick, either soldered directly or snapped onto a soldered fence. Thermal interface material is sometimes placed inside to also carry heat into the can. Shielding effectiveness of 40–60 dB is typical at cellular frequencies.',
        facts: ['Repair technicians have to peel these lids off with heat to reach the chips underneath.'],
      },
    },
    {
      id: 'vapour-chamber',
      name: 'Vapour Chamber & Graphite',
      system: 'compute',
      position: [-0.15, 1.15, 0.0145],
      explode: [-0.05, 0.05, 0.18],
      shapes: [
        slab(0.3, 0.38, 0.02, 0.003, 0.0006, { material: { ...M.copper(), roughness: 0.4 } }),
        slab(0.48, 0.6, 0.03, 0.0008, 0, { position: [0.12, -0.58, 0.0027], material: { color: '#3b3d42', metalness: 0.5, roughness: 0.5 } }),
      ],
      info: {
        what: 'A flat, sealed copper pocket with a little water inside, plus thin graphite sheets, that move heat away from the processor.',
        location: 'Pressed against the processor, sandwiched between the logic board and the mid-frame; graphite sheet behind the display area.',
        purpose: 'Stops the processor overheating so it can run fast for longer without the phone feeling hot in one spot.',
        how: 'The chamber is under a vacuum, so the water inside boils at body temperature. Above the hot chip the water evaporates, the vapour rushes to cooler areas and condenses back to liquid, releasing its heat. A wick soaks the liquid back to the hot spot to repeat the loop. Graphite sheets then spread that heat across the whole phone.',
        connections: ['soc', 'mid-frame', 'logic-board'],
        examples: 'Gaming laptops, graphics cards and many flagship phones use vapour chambers or heat pipes.',
        advanced:
          'Ultra-thin vapour chambers are ~0.3–0.4 mm thick with an effective thermal conductivity of several thousand W/m·K (copper alone is ~400). Pyrolytic graphite sheets conduct ~1,000–1,800 W/m·K in-plane but only ~5–15 W/m·K through their thickness, which is ideal for spreading. A phone can only shed ~5–8 W continuously, so the SoC throttles once the case reaches ~40–45 °C.',
        facts: ['Phones have no fans — every watt of heat leaves through the glass and frame.'],
      },
    },

    // ================================================================ POWER
    {
      id: 'battery',
      name: 'Lithium-ion Battery',
      system: 'power',
      position: [-0.03, 0.57, -0.0055],
      explode: [0, -0.05, -0.13],
      shapes: [
        { type: 'box', size: [0.5, 0.7, 0.044], radius: 0.012, material: { color: '#2a2c31', metalness: 0.6, roughness: 0.38 } },
        { type: 'box', size: [0.42, 0.5, 0.0006], position: [0, -0.02, -0.0223], material: M.plastic('#d4d8de') },
        { type: 'box', size: [0.2, 0.02, 0.012], position: [0, 0.345, 0.006], material: PCB },
        { type: 'box', size: [0.05, 0.08, 0.0006], position: [-0.12, -0.38, -0.022], array: { count: 3, offset: [0.12, 0, 0] }, material: M.plastic('#f2f2f2') },
      ],
      info: {
        what: 'The big flat rechargeable battery that powers everything. It takes up more space than any other part.',
        location: 'The lower two-thirds of the phone, behind the screen and in front of the wireless charging coil.',
        purpose: 'Stores electrical energy so the phone can run all day without a cable.',
        how: 'Inside are thin layers of two electrodes separated by a porous film soaked in electrolyte. Charging pushes lithium ions out of the cathode and packs them into the graphite anode; using the phone lets them flow back while electrons travel through the circuits, doing work. A protection circuit stops it being over-charged, over-drained or overheated.',
        connections: ['pmic', 'usb-c-port', 'wireless-coil', 'logic-board', 'flex-cables'],
        examples: 'The same lithium-ion chemistry powers laptops, e-bikes and electric cars — just in different shapes and sizes.',
        advanced:
          'A pouch cell: graphite (sometimes silicon-carbon) anode, high-voltage LiCoO₂ cathode, 3.85–3.89 V nominal, charged to ~4.45 V. Capacity ~3,300–5,000 mAh. Energy in Wh = V × Ah, e.g. 4,000 mAh × 3.87 V ≈ 15.5 Wh. Charged with CC/CV: constant current up to ~80 %, then constant voltage while current tapers. Expect ~80 % capacity after 500–1,000 full cycles; heat and sitting at 100 % accelerate wear. Pull-tab “stretch-release” adhesive lets repairers remove it safely.',
        facts: ['Lithium-ion batteries hate heat more than anything else — avoid charging in a hot car.', 'Airlines limit carry-on batteries to 100 Wh; a phone is around 15 Wh.'],
      },
    },
    {
      id: 'pmic',
      name: 'Power-management & Charger ICs',
      system: 'power',
      position: [0.07, 1.015, 0.0075],
      explode: [0.04, -0.04, 0.07],
      shapes: [
        { type: 'box', size: [0.08, 0.075, 0.003], radius: 0.001, material: CHIP },
        { type: 'box', size: [0.035, 0.035, 0.002], position: [0.18, 0, -0.0005], material: CHIP },
        { type: 'box', size: [0.012, 0.008, 0.004], position: [0.13, 0.025, 0], array: { count: 3, offset: [0, -0.022, 0] }, material: M.plastic('#55585f') },
      ],
      info: {
        what: 'Chips that manage power: they turn the battery’s single voltage into the many different voltages the other chips need, and control charging.',
        location: 'Lower strip of the logic board, right of centre.',
        purpose: 'Feed every chip exactly the voltage it needs, charge the battery safely and squeeze maximum life out of each charge.',
        how: 'Inside are many tiny switching converters that chop the battery voltage on and off very quickly and smooth it with small coils (inductors), producing lower voltages efficiently. The charger chip measures battery voltage, current and temperature and adjusts charging accordingly.',
        connections: ['battery', 'soc', 'usb-c-port', 'wireless-coil', 'power-button'],
        examples: 'Every laptop, tablet and smartwatch has PMICs; a phone may have three or four.',
        advanced:
          'The main PMIC provides ~10–20 buck converters and LDOs (0.5–1.8 V rails) at >90 % efficiency, with fine-grained DVFS so voltage tracks CPU frequency. A separate charger IC (often a switched-capacitor “divide-by-2” charger) accepts 9 V USB-PD input and halves it efficiently into the battery, enabling 25–45 W fast charging with less heat. It also implements a coulomb-counter “fuel gauge” that estimates remaining percentage.',
        facts: ['Optimised charging deliberately pauses at 80 % overnight to reduce battery wear.'],
      },
    },
    {
      id: 'wireless-coil',
      name: 'Wireless Charging Coil',
      system: 'power',
      position: COIL_C,
      explode: [0, 0, -0.32],
      anim: { type: 'flow', speed: 3 },
      shapes: coilShapes,
      info: {
        what: 'A flat spiral of copper wire that receives power from a wireless charging pad by magnetism.',
        location: 'Centred on the back of the phone, just inside the back glass, behind the battery.',
        purpose: 'Lets you charge just by laying the phone on a pad — no cable.',
        how: 'The pad has an identical coil driven with alternating current, creating a magnetic field that flips back and forth over 100,000 times a second. That changing field passes through the glass and induces a current in the phone’s coil (just like a transformer). A rectifier turns it into DC to charge the battery. A black ferrite sheet behind the coil guides the field and protects the battery from it.',
        connections: ['magnet-ring', 'back-glass', 'pmic', 'battery', 'nfc-antenna'],
        examples: 'Qi / Qi2 charging pads, MagSafe chargers, electric toothbrushes and induction hobs use the same principle.',
        advanced:
          'Qi inductive power transfer operates at ~110–205 kHz (Qi2 ~ 360 kHz) with Litz-wire coils to limit skin-effect losses. The receiver and transmitter talk by load-modulation “backscatter” to set power (5 W BPP, up to 15 W EPP / Qi2 MPP, 25 W in newer variants). Efficiency is ~60–75 % versus ~90 % for a cable, so more heat is produced; foreign-object detection stops coins or keys being heated.',
        facts: ['Wireless charging needs the coils aligned within a few millimetres, which is why magnets were added.'],
      },
    },
    {
      id: 'magnet-ring',
      name: 'Magnet Ring (MagSafe / Qi2)',
      system: 'power',
      position: COIL_C,
      explode: [0, 0, -0.4],
      shapes: [
        { type: 'box', size: [0.03, 0.012, 0.003], position: [0, 0.228, 0], array: { count: 18, rotation: [0, 0, (2 * PI) / 18] }, material: MAGNET },
        { type: 'box', size: [0.05, 0.016, 0.003], position: [0, -0.275, 0], material: MAGNET },
      ],
      info: {
        what: 'A ring of small, strong magnets around the charging coil, plus one alignment magnet below it.',
        location: 'Circling the wireless charging coil, just inside the back glass.',
        purpose: 'Snaps chargers and accessories into exactly the right place, so wireless charging is fast and efficient.',
        how: 'The magnets in the phone attract matching magnets in the charger, pulling the two coils perfectly into line. The separate small magnet below tells the accessory which way is “down” so it can’t sit rotated.',
        connections: ['wireless-coil', 'back-glass', 'nfc-antenna'],
        examples: 'MagSafe chargers, magnetic wallets, car mounts and Qi2 “Magnetic Power Profile” chargers.',
        advanced:
          'Arc-segment neodymium (NdFeB) magnets arranged in a ring of alternating polarity regions; the pattern ensures only correctly designed accessories lock on strongly. The accessory identifies itself through NFC so the phone can show an animation and adjust charging. Qi2 standardised this design (based on Apple’s MagSafe) in 2023.',
        facts: ['The magnets are weak enough not to harm credit-card magnetic stripes in most cases, but hotel key cards can be erased.'],
      },
    },
    {
      id: 'usb-c-port',
      name: 'USB-C Port',
      system: 'power',
      position: [0, 0.035, 0],
      explode: [0, -0.22, 0],
      shapes: [
        { type: 'box', size: [0.089, 0.07, 0.032], radius: 0.0125, material: M.chrome() },
        { type: 'box', size: [0.08, 0.002, 0.024], position: [0, -0.0345, 0], material: BLACK },
        { type: 'box', size: [0.066, 0.045, 0.007], position: [0, -0.012, 0], material: BLACK },
        { type: 'box', size: [0.0035, 0.025, 0.008], position: [-0.0275, -0.02, 0], array: { count: 12, offset: [0.005, 0, 0] }, material: GOLD },
        { type: 'box', size: [0.15, 0.04, 0.003], position: [0, 0.02, 0.0175], material: POLYIMIDE },
      ],
      info: {
        what: 'The reversible socket at the bottom of the phone for charging and data.',
        location: 'Centre of the bottom edge, between the loudspeaker and the haptic engine.',
        purpose: 'Charges the battery, transfers files, and can drive external displays and accessories.',
        how: 'A central tongue carries 24 contacts, 12 on each side, mirrored so the plug works either way up. Two “CC” pins tell the phone which way round the plug is and let the phone and charger agree a voltage and current before full power flows.',
        connections: ['pmic', 'battery', 'flex-cables', 'frame'],
        examples: 'Laptops, tablets, headphones, game controllers — USB-C is now required on phones sold in the EU.',
        advanced:
          'USB Type-C receptacle (8.4 × 2.6 mm opening). Data ranges from USB 2.0 (480 Mb/s) to USB 3.x / 10 Gb/s or Thunderbolt-class speeds. USB Power Delivery negotiates over the CC wire using BMC signalling; phones typically request 9 V at 2–3 A (≈20–27 W) or use PPS (programmable supply) for 25–45 W. The port is sealed with gaskets and has a mid-plate that resists the leverage of a yanked cable.',
        facts: ['USB-C is rated for about 10,000 plug-in cycles.'],
      },
    },
    {
      id: 'flex-cables',
      name: 'Flex Cables & Connectors',
      system: 'structure',
      position: [0, 0, 0],
      explode: [0, 0, 0.035],
      anim: { type: 'flow', speed: 3 },
      shapes: flexShapes,
      info: {
        what: 'Thin, bendy ribbons of printed wiring that link the screen, battery, cameras and port to the logic board.',
        location: 'Snaking around the inside of the phone and snapping into small connectors on the board.',
        purpose: 'Carry power and data between parts that sit in different places or need to fold.',
        how: 'Copper tracks are printed on a flexible plastic film (polyimide, the orange-gold material). Each end has a tiny press-fit connector that clicks onto a matching socket on the board — like a minuscule LEGO stud.',
        connections: ['logic-board', 'oled-display', 'battery', 'usb-c-port', 'image-sensors', 'face-id', 'microphones'],
        examples: 'Laptop hinges, camera lens barrels and printer heads all use flexible printed circuits.',
        advanced:
          'Flexible printed circuits (FPC) of 1–6 copper layers on 12–25 µm polyimide, sometimes with liquid-crystal-polymer layers for low-loss antenna feeds. Board-to-board connectors have pitches of ~0.35 mm. High-speed lines like the display (MIPI DSI) and cameras (MIPI C-PHY/D-PHY) run differential pairs at several Gb/s per lane.',
        facts: ['Disconnecting the battery flex first is step one in any safe phone repair.'],
      },
    },

    // ================================================================ CAMERAS
    {
      id: 'camera-lenses',
      name: 'Rear Camera Lenses',
      system: 'cameras',
      position: [CAM[0], CAM[1], 0],
      explode: [0.06, 0.1, -0.36],
      shapes: lensShapes,
      info: {
        what: 'Three tiny lens barrels — main, ultra-wide and telephoto — that focus light onto the image sensors.',
        location: 'The upper corner of the back (top-left when you look at the back), poking through the camera plateau.',
        purpose: 'Give you different fields of view, from wide landscapes to zoomed-in portraits, without a zoom lens that sticks out.',
        how: 'Each barrel holds a stack of 6–7 precisely shaped plastic lenses that bend light so it forms a sharp image on the sensor. A tiny electromagnetic motor moves the lenses back and forth to focus. The telephoto folds its light path sideways with a prism so it can have a long focal length inside a thin phone.',
        connections: ['image-sensors', 'ois-actuator', 'flash-lidar', 'back-glass'],
        examples: '“1×”, “0.5×” and “5×” buttons in the camera app switch between these three lenses.',
        advanced:
          'Main: ~24 mm-equivalent, f/1.6–1.8, 7-element aspheric plastic stack with an IR-cut filter. Ultra-wide: ~13 mm, f/2.2, 120° FoV. Telephoto: 77–120 mm equivalent using a folded “periscope/tetraprism” design. Autofocus uses a voice-coil motor (VCM) driven by phase-detection pixels on the sensor; sapphire crystal covers protect the outermost element.',
        facts: ['The plastic lens elements are moulded to sub-micrometre accuracy.'],
      },
    },
    {
      id: 'image-sensors',
      name: 'Image Sensors',
      system: 'cameras',
      position: [CAM[0], CAM[1], 0.0065],
      explode: [0.06, 0.1, 0.08],
      shapes: sensorShapes,
      info: {
        what: 'Silicon chips covered in millions of light-sensitive pixels that turn the image from each lens into numbers.',
        location: 'At the inner (screen-side) end of each camera lens barrel.',
        purpose: 'Capture the light that makes up every photo and video.',
        how: 'Each pixel is a photodiode: when light hits it, it releases electrons, and more light means more electrons. A colour filter grid (red, green, blue) above the pixels lets each one measure one colour. The chip reads out the charge of every pixel and converts it to a number; the image processor in the SoC rebuilds full colour and merges several frames to reduce noise.',
        connections: ['camera-lenses', 'ois-actuator', 'soc', 'flex-cables'],
        examples: 'The same CMOS sensor technology is used in DSLRs, webcams, car cameras and doorbells — just at different sizes.',
        advanced:
          'Stacked back-side-illuminated (BSI) CMOS: the pixel layer is bonded on top of a logic layer with ADCs and memory. Main sensors are ~1/1.3″ with 48–200 MP and 0.6–1.2 µm pixels that “bin” 4 into 1 (quad-Bayer) for 12 MP low-light shots. Readout feeds the SoC’s ISP over MIPI, enabling computational photography — multi-frame HDR, night mode, and Deep-Fusion-style pixel-level merging.',
        facts: ['When you press the shutter, the phone has often already captured several frames before and after.'],
      },
    },
    {
      id: 'ois-actuator',
      name: 'Optical Image Stabiliser',
      system: 'cameras',
      position: [CAM[0] + LENSES[0].dx, CAM[1] + LENSES[0].dy, 0.0],
      explode: [0.06, 0.1, -0.2],
      anim: { type: 'piston', axis: 'x', amplitude: 0.003, speed: 7 },
      shapes: [
        { type: 'box', size: [0.012, 0.045, 0.012], position: [-0.068, 0, 0], material: MAGNET, array: { count: 2, offset: [0.136, 0, 0] } },
        { type: 'box', size: [0.045, 0.012, 0.012], position: [0, -0.068, 0], material: MAGNET, array: { count: 2, offset: [0, 0.136, 0] } },
        { type: 'torus', radius: 0.012, tube: 0.0022, radialSegments: 8, tubularSegments: 32, rotation: [0, PI / 2, 0], position: [-0.06, 0, 0],
          array: { count: 2, offset: [0.12, 0, 0] }, material: COIL },
        { type: 'torus', radius: 0.012, tube: 0.0022, radialSegments: 8, tubularSegments: 32, rotation: [PI / 2, 0, 0], position: [0, -0.06, 0],
          array: { count: 2, offset: [0, 0.12, 0] }, material: COIL },
      ],
      info: {
        what: 'Tiny magnets and coils that shift the main camera’s sensor to cancel out the shaking of your hands.',
        location: 'Surrounding the main camera, between the lens barrel and the image sensor.',
        purpose: 'Keeps photos sharp in low light and videos smooth, by moving the sensor opposite to your hand’s wobble.',
        how: 'The gyroscope measures how the phone is rotating thousands of times a second. The stabiliser drives current through the coils; the magnetic push against the fixed magnets nudges the sensor a few micrometres in the opposite direction, so the image stays still on the sensor.',
        connections: ['image-sensors', 'camera-lenses', 'motion-sensors', 'soc'],
        examples: 'Camera lenses and DSLR bodies (“IBIS”), binoculars and drone gimbals use similar stabilisation.',
        advanced:
          'Sensor-shift OIS moves the sensor (rather than the lens) with voice-coil motors on ball or wire suspensions, compensating ~±1–2° of shake in X and Y at control-loop rates of several kHz, using Hall sensors for position feedback. It gives ~3–5 stops of stabilisation for stills. Video additionally uses electronic stabilisation (EIS) that crops and warps frames.',
        facts: ['The sensor moves only a few thousandths of a millimetre — far less than the width of a hair.'],
      },
    },
    {
      id: 'flash-lidar',
      name: 'Flash & LiDAR Scanner',
      system: 'cameras',
      position: [CAM[0], CAM[1], -0.04],
      explode: [0.14, 0.14, -0.44],
      shapes: [
        { type: 'cylinder', radius: 0.02, height: 0.009, rotation: ALONG_Z, position: [0.08, 0.09, 0], material: M.metal('#3a3e45') },
        { type: 'cylinder', radius: 0.016, height: 0.002, rotation: ALONG_Z, position: [0.08, 0.09, -0.0045], material: M.light('#fff2c4', 0.6) },
        { type: 'cylinder', radius: 0.022, height: 0.009, rotation: ALONG_Z, position: [0.08, -0.09, 0], material: BLACK },
        { type: 'cylinder', radius: 0.006, height: 0.002, rotation: ALONG_Z, position: [0.072, -0.09, -0.0045], material: LENS, array: { count: 2, offset: [0.016, 0, 0] } },
      ],
      info: {
        what: 'A bright LED flash for dark scenes, and a LiDAR depth scanner that measures distance with invisible laser light.',
        location: 'Beside the three lenses on the camera plateau.',
        purpose: 'The flash lights up dark scenes; LiDAR measures how far away things are for fast focus, portrait blur and augmented reality.',
        how: 'LiDAR fires short pulses of infrared light and times how long each takes to bounce back. Light travels about 30 cm per nanosecond, so the round-trip time gives the distance for every point, building a 3D depth map several times per second.',
        connections: ['camera-lenses', 'image-sensors', 'soc', 'back-glass'],
        examples: 'Self-driving cars, robot vacuums and AR measuring apps use LiDAR; the flash doubles as your torch.',
        advanced:
          'The flash uses several LEDs of different colour temperature (“True Tone”) mixed to match ambient light. Phone LiDAR is a direct time-of-flight (dToF) system: a VCSEL array emits 940 nm pulses through a diffractive element; a SPAD (single-photon avalanche diode) array times the returns with sub-nanosecond precision, ranging up to ~5 m.',
        facts: ['Night-mode portraits use LiDAR depth because the camera can’t see enough contrast to focus by itself.'],
      },
    },
    {
      id: 'front-camera',
      name: 'Front (Selfie) Camera',
      system: 'cameras',
      position: [0.075, 1.37, 0.016],
      explode: [0.08, 0.12, 0.32],
      shapes: [
        { type: 'box', size: [0.05, 0.05, 0.01], radius: 0.003, material: M.metal('#3a3e45') },
        { type: 'cylinder', radius: 0.02, height: 0.006, rotation: ALONG_Z, position: [0, 0, 0.007], material: BLACK },
        { type: 'cylinder', radius: 0.013, height: 0.002, rotation: ALONG_Z, position: [0, 0, 0.0105], material: LENS },
      ],
      info: {
        what: 'A small camera on the front of the phone, for selfies and video calls.',
        location: 'Behind the pill-shaped cut-out at the top of the screen.',
        purpose: 'Takes selfies, video calls and helps with face-based features.',
        how: 'It works just like the rear cameras — lens, autofocus motor and sensor — but is much smaller. It looks through a hole cut in the display, which is why there is a black island at the top of the screen.',
        connections: ['face-id', 'oled-display', 'soc', 'flex-cables'],
        examples: 'Video calls, selfies, scanning documents with the screen facing you.',
        advanced:
          'Typically 12 MP, f/1.9, ~23 mm equivalent with phase-detect autofocus. Some phones hide the camera under the OLED (“under-display camera”) by using a lower-density pixel area that lets light through, at some cost to image quality.',
        facts: ['The “Dynamic Island” idea turned the camera cut-out into a live status area.'],
      },
    },

    // ================================================================ SENSORS
    {
      id: 'face-id',
      name: 'Face-recognition Sensors',
      system: 'sensors',
      position: [-0.04, 1.37, 0.016],
      explode: [-0.08, 0.12, 0.32],
      shapes: [
        { type: 'box', size: [0.15, 0.05, 0.012], radius: 0.003, material: M.brushed('#8e959e') },
        { type: 'cylinder', radius: 0.014, height: 0.006, rotation: ALONG_Z, position: [-0.05, 0, 0.008], material: BLACK },
        { type: 'cylinder', radius: 0.009, height: 0.002, rotation: ALONG_Z, position: [-0.05, 0, 0.0115], material: { ...LENS, color: '#4a1f2c' } },
        { type: 'box', size: [0.016, 0.016, 0.005], radius: 0.001, position: [-0.015, 0, 0.008], material: { ...LENS, color: '#3a1a24' } },
        { type: 'cylinder', radius: 0.014, height: 0.006, rotation: ALONG_Z, position: [0.045, 0, 0.008], material: BLACK },
        { type: 'cylinder', radius: 0.009, height: 0.002, rotation: ALONG_Z, position: [0.045, 0, 0.0115], material: { ...LENS, color: '#4a1f2c' } },
        { type: 'box', size: [0.012, 0.012, 0.004], position: [0.015, 0.012, 0.008], material: CHIP },
      ],
      info: {
        what: 'A cluster of infrared sensors that recognise your face in 3D to unlock the phone — the face-based alternative to a fingerprint sensor.',
        location: 'Behind the black island at the top of the screen, beside the front camera.',
        purpose: 'Securely unlocks the phone, approves payments and fills passwords just by looking at it — even in the dark.',
        how: 'A dot projector shines tens of thousands of invisible infrared dots onto your face. An infrared camera photographs how the dots are spread out by the shape of your face, creating a 3D depth map. A flood light lets it see in darkness. The processor’s secure area compares this map with the one stored at setup. A small proximity / ambient-light sensor here also turns the screen off at your ear and sets auto-brightness.',
        connections: ['soc', 'front-camera', 'oled-display', 'flex-cables'],
        examples: 'Apple Face ID; many Android phones instead use an optical or ultrasonic fingerprint sensor under the screen.',
        advanced:
          'Structured light: a VCSEL at 940 nm passes through a diffractive optical element producing ~30,000 dots; the IR camera images the pattern and a neural network in the Secure Enclave builds and matches a mathematical face model that adapts over time. False-match rate is quoted at ~1 in 1,000,000 (vs ~1 in 50,000 for capacitive fingerprint). Ultrasonic under-display fingerprint sensors instead send sound pulses through the glass and map ridges in 3D.',
        facts: ['A phone camera can “see” the infrared dots, but your eyes cannot.'],
      },
    },
    {
      id: 'motion-sensors',
      name: 'Motion Sensors (IMU)',
      system: 'sensors',
      position: [0.17, 1.015, 0.007],
      explode: [0.08, -0.03, 0.07],
      shapes: [
        { type: 'box', size: [0.035, 0.03, 0.002], radius: 0.0006, material: CHIP },
        { type: 'box', size: [0.022, 0.022, 0.003], radius: 0.0006, position: [0, 0.038, 0], material: M.brushed('#c0c5cb') },
      ],
      info: {
        what: 'Tiny chips that sense movement, rotation, air pressure and direction.',
        location: 'On the lower strip of the logic board, near the centre of the phone.',
        purpose: 'Rotate the screen, count steps, stabilise photos, steer games, detect crashes or falls and help navigation.',
        how: 'Inside are microscopic silicon structures on springs (MEMS). When the phone accelerates, a tiny mass shifts and changes a capacitance that the chip measures. Gyroscopes use a vibrating mass that is pushed sideways when rotated (the Coriolis effect). The barometer measures air pressure to tell which floor you are on.',
        connections: ['soc', 'ois-actuator', 'logic-board'],
        examples: 'Screen auto-rotate, fitness tracking, compass and map orientation, car-crash and fall detection.',
        advanced:
          'A 6-axis IMU (3-axis accelerometer ±16 g + 3-axis gyroscope ±2000 °/s), plus high-g accelerometer (up to ~256 g) for crash detection, a magnetometer for the compass and a barometer resolving ~10 cm of altitude. Data is sampled at up to several kHz by a low-power always-on sensor hub so the main CPU can sleep.',
        facts: ['The moving parts inside an accelerometer are thinner than a red blood cell.'],
      },
    },
    {
      id: 'taptic-engine',
      name: 'Haptic Engine (Vibration Motor)',
      system: 'sensors',
      position: [0.18, 0.12, -0.004],
      explode: [0.12, -0.18, -0.04],
      anim: { type: 'piston', axis: 'x', amplitude: 0.004, speed: 30 },
      shapes: [
        { type: 'box', size: [0.22, 0.1, 0.03], radius: 0.006, material: M.brushed('#9aa1aa') },
        { type: 'box', size: [0.12, 0.07, 0.0012], position: [0, 0, 0.0152], material: M.plastic('#2a2d33') },
        { type: 'box', size: [0.03, 0.03, 0.002], position: [-0.12, 0.02, 0], material: POLYIMIDE },
      ],
      info: {
        what: 'A small motor that makes the crisp taps and buzzes you feel when typing, getting a notification or pressing a button.',
        location: 'Bottom of the phone, right of the USB-C port.',
        purpose: 'Gives physical feedback without sound — silent alerts, keyboard clicks and the feeling of “pressing” virtual buttons.',
        how: 'Inside, a heavy metal mass hangs on springs between magnets and a coil. Pulses of current push the mass back and forth very quickly. Because the phone pushes back on the mass, you feel the whole phone jolt — a sharp tick or a long rumble depending on the pulse pattern.',
        connections: ['soc', 'pmic', 'flex-cables'],
        examples: 'Game-controller rumble (HD rumble), smartwatch taps, trackpads that “click” without moving.',
        advanced:
          'A linear resonant actuator (LRA): a spring-mass system driven near its resonance (~150–200 Hz) by a voice coil, with a dedicated driver IC that brakes the mass actively for sharp start/stop (a few ms). Older phones used an eccentric rotating mass (ERM) motor — an off-centre weight on a DC motor — which is slower to spin up and gives a mushier buzz.',
        facts: ['The animation exaggerates the motion — the real mass moves well under a millimetre.'],
      },
    },

    // ================================================================ AUDIO
    {
      id: 'earpiece',
      name: 'Earpiece Speaker',
      system: 'audio',
      position: [0, 1.43, 0.016],
      explode: [0, 0.18, 0.3],
      anim: { type: 'pulse', amount: 0.03, speed: 3 },
      shapes: [
        { type: 'box', size: [0.14, 0.022, 0.012], radius: 0.004, material: BLACK },
        { type: 'box', size: [0.1, 0.006, 0.001], position: [0, 0.004, 0.0063], material: M.metal('#5a5f68') },
      ],
      info: {
        what: 'The small speaker at the top front that you hold to your ear during calls.',
        location: 'Top edge of the phone, behind a thin slot above the screen.',
        purpose: 'Plays the other person’s voice quietly into your ear; it also acts as the second channel for stereo sound.',
        how: 'An electrical signal flows through a coil attached to a thin diaphragm sitting next to a magnet. The changing current makes the coil push and pull against the magnet, vibrating the diaphragm to make sound waves.',
        connections: ['loudspeaker', 'microphones', 'soc', 'face-id'],
        examples: 'Landline handsets, earbuds and headphones use the same moving-coil (dynamic) speaker design.',
        advanced:
          'A micro dynamic driver (~12 × 3 mm real size) driven by a smart amplifier. When playing media it runs louder and is paired with the bottom loudspeaker for stereo, with DSP tuning to balance the two very different drivers. The proximity sensor beside it turns the touchscreen off at your ear.',
        facts: ['Turning the phone sideways for video gives you stereo from earpiece + loudspeaker.'],
      },
    },
    {
      id: 'loudspeaker',
      name: 'Loudspeaker',
      system: 'audio',
      position: [-0.19, 0.12, -0.004],
      explode: [-0.12, -0.18, -0.04],
      anim: { type: 'pulse', amount: 0.02, speed: 4 },
      shapes: [
        { type: 'box', size: [0.22, 0.13, 0.03], radius: 0.006, material: BLACK },
        { type: 'cylinder', radius: 0.05, height: 0.002, rotation: ALONG_Z, scale: [1.5, 1, 1], position: [0.0, 0.0, -0.0155], material: M.plastic('#2c3038') },
        { type: 'box', size: [0.12, 0.05, 0.02], radius: 0.004, position: [-0.02, -0.085, 0], material: BLACK },
      ],
      info: {
        what: 'The main speaker at the bottom of the phone for music, videos, ringtones and speakerphone.',
        location: 'Bottom left (seen from the front), firing out through the grille holes beside the USB-C port.',
        purpose: 'Produces loud sound without headphones.',
        how: 'A voice coil and magnet vibrate a small diaphragm, like the earpiece but bigger. It sits inside a sealed plastic “speaker box” whose trapped air acts as a spring, and a channel guides the sound to the holes on the bottom edge.',
        connections: ['earpiece', 'microphones', 'usb-c-port', 'soc'],
        examples: 'Bluetooth speakers and laptops use the same micro-speaker modules, often bigger.',
        advanced:
          'A rectangular micro-speaker (~ 11 × 15 mm real) with neodymium magnets, driven by a class-D “smart amp” at ~1–2 W. The amp monitors coil current and voltage to estimate diaphragm excursion and temperature in real time, so it can play louder without damage. Bass is limited by the tiny back volume (~1 cc); DSP boosts and limits frequencies accordingly.',
        facts: ['Some phones use the speaker’s vibration to shake water out after a swim.'],
      },
    },
    {
      id: 'microphones',
      name: 'Microphones',
      system: 'audio',
      position: [0, 0, 0],
      explode: [0, -0.08, 0.05],
      shapes: [
        { type: 'box', size: [0.035, 0.012, 0.026], radius: 0.002, position: [0.08, 0.03, -0.004], material: M.brushed('#c2c7cd') },
        { type: 'box', size: [0.035, 0.012, 0.026], radius: 0.002, position: [0.15, 1.432, 0.008], material: M.brushed('#c2c7cd') },
        { type: 'box', size: [0.035, 0.026, 0.012], radius: 0.002, position: [0.265, 1.075, -0.026], material: M.brushed('#c2c7cd') },
      ],
      info: {
        what: 'Three or four tiny microphones — at the bottom, top and next to the rear cameras.',
        location: 'Bottom edge (beside the port), top edge, and on the back near the camera.',
        purpose: 'Pick up your voice for calls, record sound for videos and filter out background noise.',
        how: 'Each microphone has a microscopic flexible membrane next to a fixed plate, forming a tiny capacitor. Sound waves wiggle the membrane, changing the capacitance, which a built-in chip converts to a digital signal. By comparing when the same sound reaches each mic, the phone can focus on your voice and cancel noise.',
        connections: ['soc', 'earpiece', 'loudspeaker', 'flex-cables'],
        examples: 'Smart speakers, earbuds with noise cancellation and laptops use arrays of MEMS microphones.',
        advanced:
          'MEMS capacitive microphones (~3.5 × 2.6 × 1 mm real) with ~65–70 dB SNR and PDM digital outputs. Beamforming and adaptive noise suppression use the time-of-arrival differences between mics; the rear mic also enables directional “audio zoom” in video and wind-noise reduction.',
        facts: ['The bottom grille on many phones is half speaker and half microphone.'],
      },
    },

    // ================================================================ CONNECTIVITY
    {
      id: 'modem',
      name: '5G Modem & RF Transceiver',
      system: 'connectivity',
      position: [-0.115, 1.015, 0.0075],
      explode: [0, -0.04, 0.07],
      shapes: [
        { type: 'box', size: [0.09, 0.09, 0.003], radius: 0.001, material: CHIP },
        { type: 'box', size: [0.05, 0.05, 0.002], radius: 0.0008, position: [0.08, 0, -0.0005], material: CHIP },
        { type: 'box', size: [0.03, 0.02, 0.0004], position: [-0.02, 0.025, 0.0016], material: M.plastic('#5a5e66') },
      ],
      info: {
        what: 'The chips that let your phone talk to mobile phone towers: they turn data into radio signals and back again.',
        location: 'Lower strip of the logic board, next to the storage chip; amplifiers and filters sit under the shield cans.',
        purpose: 'Makes calls and connects to mobile data — 4G LTE and 5G — wherever there is coverage.',
        how: 'The modem (baseband) encodes your data into patterns of radio-wave amplitude and phase. The transceiver turns those patterns into radio frequencies, power amplifiers boost them, and filters keep only the right band before they reach the antennas. Receiving works in reverse, pulling very weak signals out of noise.',
        connections: ['antenna-bands', 'soc', 'sim-tray', 'shield-cans', 'logic-board'],
        examples: 'Qualcomm Snapdragon X-series modems, Apple’s in-house C-series, MediaTek and Samsung modems.',
        advanced:
          '5G NR modems support sub-6 GHz (600 MHz–6 GHz) and, in some markets, mmWave (24–40 GHz with separate antenna modules). Techniques include OFDM, up to 1024-QAM, 4×4 MIMO and carrier aggregation of several bands, giving multi-Gb/s peaks. The RF front-end has dozens of SAW/BAW filters and envelope-tracking power amplifiers (up to ~23–26 dBm output).',
        facts: ['A phone can connect on more than 30 different frequency bands around the world.'],
      },
    },
    {
      id: 'antenna-bands',
      name: 'Antenna Bands (in the Frame)',
      system: 'connectivity',
      position: [0, Y0, 0],
      explode: [0, 0, 0],
      anim: { type: 'flow', speed: 2 },
      shapes: [
        { type: 'box', size: [0.022, 0.012, 0.064], position: [-0.3455, 0.6, 0], array: { count: 2, offset: [0.691, 0, 0] },
          material: { ...M.plastic('#4a4f57'), emissive: '#ffd166', emissiveIntensity: 0.12 } },
        { type: 'box', size: [0.022, 0.012, 0.064], position: [-0.3455, -0.6, 0], array: { count: 2, offset: [0.691, 0, 0] },
          material: { ...M.plastic('#4a4f57'), emissive: '#ffd166', emissiveIntensity: 0.12 } },
        { type: 'box', size: [0.012, 0.022, 0.064], position: [-0.2, 0.7245, 0], array: { count: 2, offset: [0.4, 0, 0] },
          material: { ...M.plastic('#4a4f57'), emissive: '#ffd166', emissiveIntensity: 0.12 } },
        { type: 'box', size: [0.012, 0.022, 0.064], position: [-0.2, -0.7245, 0], array: { count: 2, offset: [0.4, 0, 0] },
          material: { ...M.plastic('#4a4f57'), emissive: '#ffd166', emissiveIntensity: 0.12 } },
      ],
      info: {
        what: 'The thin plastic lines across the metal edge of the phone. They split the frame into separate pieces of metal that act as antennas.',
        location: 'Around the outer frame, near each corner.',
        purpose: 'Turn the frame itself into antennas for mobile, Wi-Fi, Bluetooth and GPS signals, while keeping a strong metal body.',
        how: 'A solid metal ring would block and short out radio waves. Cutting it into segments, insulated by plastic, lets each segment resonate like a tuning fork at certain radio frequencies. Small switching chips (“tuners”) change how each segment is connected so it can cover many bands.',
        connections: ['frame', 'modem', 'nfc-antenna', 'logic-board'],
        examples: 'Cellular (low/mid/high bands), Wi-Fi 6E/7, Bluetooth, GPS/GNSS and ultra-wideband all share these antennas.',
        advanced:
          'Typically 4–6 frame antennas plus internal LDS/FPC antennas. Low bands (600–960 MHz) need the longest segments; aperture tuners and impedance tuners retune them dynamically, and the modem switches between antennas when your hand covers one (“antenna diversity”). Wi-Fi uses 2.4/5/6 GHz, GNSS L1 + L5 (1575/1176 MHz) and UWB 6.5–8 GHz for precise item finding.',
        facts: ['The infamous 2010 “antennagate” happened because a hand could bridge two antenna segments.'],
      },
    },
    {
      id: 'nfc-antenna',
      name: 'NFC Antenna',
      system: 'connectivity',
      position: NFC_C,
      explode: [0, 0.06, -0.26],
      shapes: nfcShapes,
      info: {
        what: 'A flat loop antenna for very-short-range wireless — tap-to-pay, transit cards and pairing.',
        location: 'Just inside the back glass, above the wireless charging coil.',
        purpose: 'Lets you pay, open doors, ride transit and pair accessories by holding the phone near a reader.',
        how: 'The reader’s coil creates a magnetic field. When your phone’s loop comes within a few centimetres, the two loops couple like a weak transformer and exchange data by rapidly changing how much energy is drawn — no battery needed on the card side.',
        connections: ['wireless-coil', 'magnet-ring', 'soc', 'antenna-bands'],
        examples: 'Apple Pay / Google Pay, contactless transit cards, hotel keys, NFC tags.',
        advanced:
          'Near-field communication at 13.56 MHz (ISO/IEC 14443, ISO 15693, FeliCa), up to 424 kb/s, range < 4 cm by design. Payment credentials are stored in a tamper-resistant secure element and use one-time cryptograms, so the card number never leaves the phone.',
        facts: ['NFC is short-range on purpose: it makes eavesdropping on payments very difficult.'],
      },
    },
  ],
  steps: [
    {
      title: '1 · Touch to pixels',
      text: 'Your finger disturbs the electric field of the touch grid at one crossing point. The touch controller turns that into X/Y coordinates up to 240 times a second and sends them to the processor. The app decides what changes, the GPU draws the new frame, and the OLED backplane lights the matching pixels — all in a few tens of milliseconds.',
      focus: ['cover-glass', 'touch-digitizer', 'oled-display', 'soc', 'flex-cables'],
      explode: 0.35,
      animate: true,
    },
    {
      title: '2 · Thinking (the SoC)',
      text: 'The system-on-chip runs everything. Instructions and data stream from flash storage into the RAM stacked on top of it; efficiency cores handle background tasks and the big performance cores and neural engine wake for heavy work. The power chip raises and lowers voltages in microseconds, and the vapour chamber spreads the resulting heat into the mid-frame.',
      focus: ['soc', 'ram', 'storage', 'pmic', 'vapour-chamber', 'logic-board'],
      explode: 0.55,
      animate: true,
    },
    {
      title: '3 · Taking a photo',
      text: 'Light passes through the lens stack and lands on the image sensor, where millions of photodiodes convert it into electrical charge. The gyroscope reports hand shake and the stabiliser shifts the sensor to cancel it, while LiDAR measures distance for instant focus. The image processor in the SoC merges several frames into one sharp, low-noise photo.',
      focus: ['camera-lenses', 'image-sensors', 'ois-actuator', 'flash-lidar', 'motion-sensors', 'soc'],
      explode: 0.5,
      animate: true,
    },
    {
      title: '4 · Making a call',
      text: 'The microphones capture your voice and the SoC filters out background noise. The modem compresses and encodes it, the RF front-end amplifies it, and the frame’s antenna segments radiate it to the nearest tower. The reply comes back the same way in reverse and plays through the earpiece speaker, while the proximity sensor switches the screen off at your ear.',
      focus: ['microphones', 'modem', 'antenna-bands', 'sim-tray', 'earpiece', 'face-id'],
      explode: 0.3,
      animate: true,
    },
    {
      title: '5 · Charging',
      text: 'Plug in a cable and the USB-C CC pins negotiate a voltage (often 9 V) with the charger; or set the phone on a pad and the magnets align the coils so a fluctuating magnetic field induces current in the copper spiral. Either way, the charger IC converts the power and feeds the lithium-ion battery with constant current, then constant voltage as it fills.',
      focus: ['usb-c-port', 'wireless-coil', 'magnet-ring', 'pmic', 'battery'],
      explode: 0.45,
      animate: true,
    },
    {
      title: '6 · Feedback you can feel and hear',
      text: 'When you press a virtual button, the haptic engine’s spring-mounted mass is kicked and braked within milliseconds, so it feels like a real click. Sounds play from the bottom loudspeaker and the earpiece together for stereo, each driven by a smart amplifier that protects the tiny speakers.',
      focus: ['taptic-engine', 'loudspeaker', 'earpiece', 'volume-buttons', 'power-button'],
      explode: 0.25,
      animate: true,
    },
  ],
};
