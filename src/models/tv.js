import { M } from '../three/materials.js';

/*
 * 55-inch 4K LED-backlit LCD television (direct-lit, VA panel), real size.
 * Screen faces +Z, X is width, Y is up; the stand's feet sit on y = 0.
 *
 * The optical stack is built as a series of thin plates centred on the screen
 * centre (y = C). Layer thicknesses are slightly exaggerated (and the RGB stripes,
 * liquid-crystal molecules and TFT wiring are drawn hugely enlarged) so they are
 * visible. Exploding the model fans the stack out forward along +Z while the
 * electronics and back cover move backwards.
 */

const PI = Math.PI;
const C = 0.45; // screen centre height
const W = 1.228; // outer width
const H = 0.708; // outer height
const AW = 1.21; // panel / optical-layer width
const AH = 0.682; // panel / optical-layer height
const FACE_Z = [PI / 2, 0, 0]; // turns a Y-axis cylinder/cone/hemisphere to point along +Z
const DOUBLE = (m) => ({ ...m, side: 'double' });
const PCB = (c = '#1d5c3a') => ({ color: c, metalness: 0.1, roughness: 0.55, clearcoat: 0.4 });
const CHIP = { color: '#16181b', metalness: 0.2, roughness: 0.5 };
const FRAME = M.brushed('#3a3d42');
const SUBPIXEL = (c) => ({ color: c, metalness: 0, roughness: 0.35, emissive: c, emissiveIntensity: 0.35 });

/** Box spanning from point a to point b in the YZ plane (x fixed), with cross-section [w, t]. */
function bar(x, [ay, az], [by, bz], w, t, material) {
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dy, dz);
  return {
    type: 'box', size: [w, t, len], radius: Math.min(t, w) * 0.45,
    position: [x, (ay + by) / 2, (az + bz) / 2], rotation: [Math.atan2(-dy, dz), 0, 0], material,
  };
}

// ---------------------------------------------------------------- colour-filter stripes (R, G, B)
const STRIPE_PITCH = 0.012;
const stripeShapes = ['#ff2a2a', '#22e04a', '#2f5bff'].map((c, i) => ({
  type: 'box', size: [0.0036, AH - 0.004, 0.0003], position: [-0.598 + i * 0.004, 0, -0.0009],
  array: { count: 100, offset: [STRIPE_PITCH, 0, 0] }, material: SUBPIXEL(c),
}));

// ---------------------------------------------------------------- liquid-crystal molecules
// Rows tilt progressively from "standing up" (VA, no voltage = black) to "lying down" (full voltage = bright).
const lcShapes = [
  { type: 'box', size: [AW, AH, 0.0006], material: { color: '#b9f3e6', metalness: 0, roughness: 0.1, opacity: 0.22 } },
];
for (let r = 0; r < 12; r++) {
  const tiltAmt = (r / 11) * 1.25;
  lcShapes.push({
    type: 'cylinder', radius: 0.0011, height: 0.005, segments: 6,
    rotation: [PI / 2 - tiltAmt, 0, 0], position: [-0.58, -0.3 + r * 0.0545, 0],
    array: { count: 30, offset: [0.04, 0, 0] }, material: M.plastic('#5fd4bd'),
  });
}

// ---------------------------------------------------------------- direct-lit LED array
const LED_ROWS = 8;
const LED_COLS = 14;
const LED_PITCH = 0.085;
const LED_X0 = -((LED_COLS - 1) * LED_PITCH) / 2;
const LED_Y0 = -((LED_ROWS - 1) * LED_PITCH) / 2;
const ledShapes = [
  { type: 'box', size: [1.17, 0.012, 0.001], position: [0, LED_Y0, -0.0015], array: { count: LED_ROWS, offset: [0, LED_PITCH, 0] }, material: M.plastic('#efeee8') },
  { type: 'box', size: [0.012, 0.01, 0.003], position: [0.59, LED_Y0, -0.001], array: { count: LED_ROWS, offset: [0, LED_PITCH, 0] }, material: M.plastic('#f2f2f2') },
];
for (let r = 0; r < LED_ROWS; r++) {
  const y = LED_Y0 + r * LED_PITCH;
  ledShapes.push(
    { type: 'box', size: [0.007, 0.007, 0.0016], position: [LED_X0, y, -0.0003], array: { count: LED_COLS, offset: [LED_PITCH, 0, 0] }, material: M.plastic('#f2efe6') },
    { type: 'sphere', radius: 0.0065, widthSegments: 14, heightSegments: 6, thetaLength: PI / 2, rotation: FACE_Z, position: [LED_X0, y, 0.0005],
      array: { count: LED_COLS, offset: [LED_PITCH, 0, 0] }, material: M.light('#dce9ff', 2.2) },
  );
}

// ================================================================= model
export default {
  id: 'tv',
  name: 'LED Television',
  category: 'appliances',
  tagline: 'Millions of tiny light valves, each opening and closing 120 times a second.',
  description:
    'A 55-inch 4K LCD television with a direct-lit LED backlight, shown at real size. Explode it to fan out the paper-thin layers – polarisers, colour filters, liquid crystal, diffusers and LEDs – and follow light from the backlight to your eyes, then see the boards that turn a video signal into pixels.',
  camera: { position: [2.0, 1.15, 2.3], target: [0, 0.45, 0.2] },
  explodeScale: 1,
  systems: [
    { id: 'display', name: 'Display Layers (LCD Panel)', color: '#4cc9f0' },
    { id: 'backlight', name: 'Backlight', color: '#facc15' },
    { id: 'electronics', name: 'Electronics', color: '#a78bfa' },
    { id: 'audio', name: 'Audio', color: '#4ade80' },
    { id: 'structure', name: 'Structure', color: '#8b95a5' },
  ],
  parts: [
    // ------------------------------------------------------------ structure (front)
    {
      id: 'bezel',
      name: 'Front Bezel / Frame',
      system: 'structure',
      position: [0, C, 0],
      explode: [0, 0, 1.15],
      shapes: [
        { type: 'box', size: [W, 0.01, 0.041], radius: 0.003, position: [0, H / 2 - 0.005, -0.0095], material: FRAME },
        { type: 'box', size: [W, 0.016, 0.041], radius: 0.003, position: [0, -H / 2 + 0.008, -0.0095], material: FRAME },
        { type: 'box', size: [0.01, H - 0.02, 0.041], radius: 0.003, position: [-W / 2 + 0.005, 0, -0.0095], array: { count: 2, offset: [W - 0.01, 0, 0] }, material: FRAME },
        { type: 'box', size: [0.05, 0.005, 0.001], position: [0, -H / 2 + 0.008, 0.0112], material: M.chrome() },
      ],
      info: {
        what: 'The thin metal frame that wraps around the edges of the screen.',
        location: 'Around the outside edge of the TV’s front, with a slightly deeper strip (“chin”) along the bottom carrying the logo.',
        purpose: 'Holds the panel and optical layers together, protects the fragile glass edges and hides the wiring along them.',
        how: 'The frame clips or screws onto the back chassis, clamping every layer of the screen in a sandwich. Because everything inside is held by its edges, the frame must be stiff enough to stop the large glass sheets from flexing.',
        connections: ['front-polariser', 'back-chassis', 'middle-frame', 'ir-receiver', 'back-cover'],
        examples: 'Older TVs had 3–5 cm plastic bezels; modern “borderless” designs hide almost all of it, leaving under 1 cm.',
        advanced: 'Extruded or die-cast aluminium, anodised, ~5–10 mm visible width on a modern 55″ set. The frame also acts as an ESD and EMI path to ground. Tight tolerances matter: uneven clamping pressure on the panel causes “clouding” or light bleed at the corners because stressed glass becomes birefringent and leaks polarised light.',
        facts: ['Pressing hard on an LCD’s edge can make a visible glow appear – that is stress birefringence.'],
      },
    },

    // ------------------------------------------------------------ display (LCD open cell)
    {
      id: 'front-polariser',
      name: 'Front Polariser (with anti-glare)',
      system: 'display',
      position: [0, C, 0.0092],
      explode: [0, 0, 1.0],
      shapes: [
        { type: 'box', size: [AW, AH, 0.0008], material: { color: '#0d1016', metalness: 0.2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, opacity: 0.88 } },
      ],
      info: {
        what: 'A thin plastic filter film on the very front of the screen that only lets light vibrating in one direction pass through.',
        location: 'The outermost layer you touch, laminated onto the colour-filter glass.',
        purpose: 'Works with the rear polariser and the liquid crystal to turn each sub-pixel on or off; its surface treatment also cuts reflections.',
        how: 'Light is a wave that can vibrate in different directions. The rear polariser lets through only one direction. The liquid crystal can rotate that direction by different amounts. This front polariser is turned 90° to the rear one, so it blocks light that has not been rotated (black) and passes light that has (bright). Its matt or anti-reflection coating scatters room reflections.',
        connections: ['colour-filter', 'liquid-crystal', 'rear-polariser', 'bezel'],
        examples: 'Polarised sunglasses use the same film – try tilting your head while looking at an LCD with them on and the screen may go dark.',
        advanced: 'Iodine-doped PVA stretched ~5× so the polyiodide chains align and absorb light polarised along them (dichroic absorption), sandwiched between TAC or acrylic protective films. Single-sheet transmission ~42–44 % of unpolarised light with a polarisation efficiency > 99.9 %, which sets the contrast ceiling. Surface: anti-glare (micro-rough haze 2–25 %) or low-reflection AR multilayers (< 1 % reflectance). Compensation (retardation) films are often integrated to widen VA viewing angles.',
        facts: ['Two crossed polarisers block almost all light – the whole LCD idea is to “un-cross” them electrically, pixel by pixel.'],
      },
    },
    {
      id: 'colour-filter',
      name: 'Colour Filter Glass (RGB sub-pixels)',
      system: 'display',
      position: [0, C, 0.0075],
      explode: [0, 0, 0.9],
      shapes: [
        { type: 'box', size: [AW, AH, 0.0016], material: M.glass('#e8f0ff') },
        ...stripeShapes,
      ],
      info: {
        what: 'A glass sheet coated with millions of tiny red, green and blue filter stripes – one for every sub-pixel.',
        location: 'Just behind the front polariser, forming the front wall of the liquid-crystal sandwich.',
        purpose: 'Gives each sub-pixel its colour, so that mixing red, green and blue light in different amounts can make any colour.',
        how: 'Every pixel is split into three side-by-side sub-pixels behind red, green and blue filters. The backlight is white; each filter lets only its own colour through. By controlling how bright each sub-pixel is, the TV mixes the three into one colour that your eye sees as a single dot – e.g. red + green full and blue off looks yellow. The stripes here are drawn about 40× larger than real.',
        connections: ['front-polariser', 'liquid-crystal', 'tft-glass'],
        examples: 'Look at a TV with a magnifying glass or a phone macro lens and you can see the separate red, green and blue stripes.',
        advanced: 'Pigment-dispersed photoresists patterned by photolithography on ~0.5 mm alkali-free glass, separated by a black matrix (resin or Cr) that hides wiring and prevents colour mixing. A 55″ 4K panel has 3840 × 2160 × 3 ≈ 24.9 million sub-pixels at ~0.315 mm pixel pitch (~0.105 mm per sub-pixel). An ITO common electrode and photo-spacers (which set the ~3–4 µm cell gap) sit on top. Filter transmission is only ~25–30 %; combined with polarisers and aperture ratio, a typical LCD passes just ~5–7 % of the backlight.',
        facts: ['Over 90 % of the light made by the backlight never reaches your eyes.'],
      },
    },
    {
      id: 'liquid-crystal',
      name: 'Liquid Crystal Layer',
      system: 'display',
      position: [0, C, 0.0058],
      explode: [0, 0, 0.8],
      shapes: lcShapes,
      info: {
        what: 'A layer of special oily fluid, thinner than a hair, made of rod-shaped molecules that line up and can be turned by electricity.',
        location: 'Sealed in the 3–4 µm gap between the TFT glass and the colour-filter glass.',
        purpose: 'Acts as millions of tiny electrically-controlled light valves – it decides how much light each sub-pixel lets through.',
        how: 'The molecules naturally line up in a set pattern. When a voltage is applied across a sub-pixel, they tip over towards a new direction. This changes how they twist the vibration direction of light passing through, and so how much of it the front polariser lets out. No voltage = one extreme (black on this VA TV), full voltage = full brightness, and anything in between gives a grey level. The rods shown here tilt from upright (black) to lying down (bright).',
        connections: ['tft-glass', 'colour-filter', 'rear-polariser', 'front-polariser'],
        examples: 'Digital watches and calculators use simpler twisted-nematic LCDs; you can see segments darken when the crystals twist.',
        advanced: 'Nematic LC mixtures with dielectric anisotropy Δε and birefringence Δn ~0.1. TN: molecules twist 90° between plates (cheap, fast, poor angles). VA (most large TVs): negative-Δε molecules stand vertical with no field, giving very dark black and native contrast ~3,000–6,000:1; multi-domain VA improves viewing angles. IPS/FFS: molecules rotate in the plane of the glass for wide viewing angles but ~1,000–1,500:1 contrast. Grey-to-grey response is ~4–8 ms with overdrive (briefly over-voltaging to speed transitions), needed for 120 Hz panels (8.3 ms frame time).',
        facts: ['Liquid crystals were discovered in 1888 by Friedrich Reinitzer while studying cholesterol from carrots.'],
      },
    },
    {
      id: 'tft-glass',
      name: 'TFT Glass (Thin-Film Transistor array)',
      system: 'display',
      position: [0, C, 0.0042],
      explode: [0, 0, 0.7],
      shapes: [
        { type: 'box', size: [AW, AH, 0.0016], material: M.glass('#dfe9f5') },
        { type: 'box', size: [AW - 0.01, 0.0015, 0.0002], position: [0, -AH / 2 + 0.015, 0.0009], array: { count: 22, offset: [0, 0.03, 0] }, material: M.metal('#b0b6bf') },
        { type: 'box', size: [0.0015, AH - 0.01, 0.0002], position: [-0.585, 0, 0.0009], array: { count: 40, offset: [0.03, 0, 0] }, material: M.metal('#c9a227') },
      ],
      info: {
        what: 'The back glass of the LCD sandwich, covered in a microscopic grid of wires and one tiny transistor switch for every sub-pixel.',
        location: 'Behind the liquid-crystal layer, in front of the rear polariser.',
        purpose: 'Applies exactly the right voltage to each of the ~25 million sub-pixels, row by row, and holds it until the next frame.',
        how: 'Horizontal “gate” wires switch on one row of transistors at a time. While a row is on, vertical “data” wires load each sub-pixel’s brightness voltage onto a tiny transparent electrode and capacitor. The row then switches off, trapping the charge so the pixel keeps its brightness while the other 2,159 rows are written. This whole scan repeats 60–120 times a second.',
        connections: ['liquid-crystal', 'source-drivers', 'rear-polariser', 'tcon-board'],
        examples: 'The same active-matrix glass, at much higher density, drives phone and laptop screens and OLED displays.',
        advanced: 'Amorphous-silicon (a-Si:H) or IGZO oxide TFTs deposited on ~0.5 mm glass from mother-glass sheets as large as Gen 10.5 (2.94 × 3.37 m – eight 65″ panels each). 4K needs 2,160 gate lines and 3,840 × 3 = 11,520 data lines; at 120 Hz each row gets ~3.7 µs to charge. Gate drivers are usually integrated on the glass (GOA). Pixel electrodes are ITO; storage capacitors reduce kick-back and flicker. Lines are drawn ~100× larger than real here.',
        facts: ['A single 4K TV panel contains about 25 million transistors on its glass.'],
      },
    },
    {
      id: 'source-drivers',
      name: 'Source Driver ICs (COF) & X-board',
      system: 'display',
      position: [0, C, 0.0042],
      explode: [0, -0.04, 0.7],
      shapes: [
        { type: 'box', size: [0.035, 0.018, 0.0004], position: [-0.54, -AH / 2 - 0.004, 0], array: { count: 10, offset: [0.12, 0, 0] }, material: M.plastic('#c77d1a') },
        { type: 'box', size: [0.02, 0.003, 0.0012], position: [-0.54, -AH / 2 - 0.004, -0.0008], array: { count: 10, offset: [0.12, 0, 0] }, material: CHIP },
        { type: 'box', size: [0.66, 0.022, 0.0016], position: [0, -AH / 2 + 0.019, -0.0347], material: PCB() },
      ],
      info: {
        what: 'A row of small driver chips on flexible orange tapes bonded to the bottom edge of the panel, plus the long thin circuit board they connect to.',
        location: 'Along the bottom edge of the TFT glass, folded behind the screen and hidden by the bezel chin.',
        purpose: 'Convert the digital brightness value of every sub-pixel into the precise analogue voltage put onto the data wires.',
        how: 'The timing controller streams pixel values to each driver chip. Each chip handles about a thousand data wires: it collects one row of values, then at the start of the row-time it outputs a matching voltage on all its wires at once. Gamma reference voltages make the brightness steps look even to the human eye.',
        connections: ['tft-glass', 'tcon-board', 'panel-cable'],
        examples: 'Damaged driver tapes cause the classic faulty-TV symptom of vertical lines or a band of the picture missing.',
        advanced: 'Chip-on-film (COF) packages on polyimide tape, attached to the glass by anisotropic conductive film (ACF). Each IC has ~960–1,440 outputs with 8–10-bit DACs and polarity inversion (column/dot inversion) to avoid DC on the liquid crystal. Fed by point-to-point interfaces such as CEDS/USI-T or EPI from the T-con through the X-board (source PCB).',
        facts: ['A 4K panel needs about 12 source driver chips to cover its 11,520 data columns.'],
      },
    },
    {
      id: 'rear-polariser',
      name: 'Rear Polariser',
      system: 'display',
      position: [0, C, 0.0028],
      explode: [0, 0, 0.6],
      shapes: [
        { type: 'box', size: [AW, AH, 0.0006], material: { color: '#3b4250', metalness: 0.1, roughness: 0.25, opacity: 0.55 } },
      ],
      info: {
        what: 'A polarising film on the back of the TFT glass, rotated 90° to the front polariser.',
        location: 'The rearmost layer of the LCD panel, facing the backlight.',
        purpose: 'Turns the backlight’s jumbled (unpolarised) light into light vibrating in one direction, ready for the liquid crystal to control.',
        how: 'It absorbs all light vibrating across its axis and passes light vibrating along it – so at least half the backlight is lost here. The liquid crystal then rotates that polarised light by an amount set by the pixel voltage, and the front polariser decides how much gets out.',
        connections: ['tft-glass', 'liquid-crystal', 'front-polariser', 'prism-films'],
        examples: 'Two polariser sheets crossed at 90° look black; rotate one and they become clear – the basic LCD effect.',
        advanced: 'Same iodine-PVA construction as the front polariser but without anti-glare treatment; often combined with a reflective polariser (DBEF) underneath so the “wrong” polarisation is reflected back into the backlight and recycled instead of absorbed, raising brightness by ~30–60 %. Polariser axes are typically at 0°/90° for VA panels with compensation films for off-axis contrast.',
        facts: ['Without reflective-polariser recycling, more than half the backlight would be wasted at this single layer.'],
      },
    },

    // ------------------------------------------------------------ structure (middle frame) + backlight films
    {
      id: 'middle-frame',
      name: 'Middle Frame (Panel Holder)',
      system: 'structure',
      position: [0, C, 0.0016],
      explode: [0, 0, 0.51],
      shapes: [
        { type: 'box', size: [AW, 0.008, 0.0012], position: [0, AH / 2 - 0.004, 0], array: { count: 2, offset: [0, -AH + 0.008, 0] }, material: M.plastic('#1b1d21') },
        { type: 'box', size: [0.008, AH - 0.016, 0.0012], position: [-AW / 2 + 0.004, 0, 0], array: { count: 2, offset: [AW - 0.008, 0, 0] }, material: M.plastic('#1b1d21') },
      ],
      info: {
        what: 'A black plastic rectangle that the LCD panel rests on.',
        location: 'Between the backlight films and the rear polariser, around the screen edges.',
        purpose: 'Holds the LCD panel at the right distance from the optical films and stops the films from shifting.',
        how: 'The films and diffuser plate are trapped behind it, and the glass panel sits on its front ledge with soft cushion tape. The bezel then clamps the panel against it.',
        connections: ['back-chassis', 'bezel', 'prism-films', 'rear-polariser'],
        examples: 'Like the mount that holds a photo in a picture frame.',
        advanced: 'Moulded PC or PC/ABS (often black to absorb stray light and prevent edge glow), with locating pins for the films and a foam or rubber cushion to isolate the panel from chassis stress. Some ultra-thin designs merge this into the back chassis or bond the panel directly (“frameless”).',
        facts: ['Its black colour stops light leaking around the edges, which would show as a glow on dark scenes.'],
      },
    },
    {
      id: 'prism-films',
      name: 'Brightness Enhancement (Prism) Films',
      system: 'backlight',
      position: [0, C, 0],
      explode: [0, 0, 0.43],
      shapes: [
        { type: 'box', size: [AW - 0.004, AH - 0.004, 0.0003], position: [0, 0, -0.0004], array: { count: 2, offset: [0, 0, 0.0008] }, material: { color: '#eef4fb', metalness: 0, roughness: 0.3, opacity: 0.45 } },
        { type: 'box', size: [AW - 0.01, 0.0012, 0.0003], position: [0, -AH / 2 + 0.01, 0.0007], array: { count: 40, offset: [0, (AH - 0.02) / 39, 0] }, material: M.plastic('#d4e3f2') },
        { type: 'box', size: [0.0012, AH - 0.01, 0.0003], position: [-AW / 2 + 0.01, 0, -0.0001], array: { count: 60, offset: [(AW - 0.02) / 59, 0, 0] }, material: M.plastic('#d4e3f2') },
      ],
      info: {
        what: 'Two clear plastic sheets covered in microscopic ridges (prisms), crossed at 90° to each other.',
        location: 'Between the diffuser sheet and the LCD panel.',
        purpose: 'Bend more of the backlight forward towards the viewer, making the screen noticeably brighter for the same power.',
        how: 'Light leaving the diffuser goes in all directions. The tiny prism ridges refract light that is heading forward-ish so it comes out straight ahead, and reflect light at steep angles back into the backlight, where it bounces off the reflector and gets another chance. One sheet concentrates light vertically, the crossed sheet horizontally.',
        connections: ['diffuser-sheet', 'rear-polariser', 'reflector-sheet', 'middle-frame'],
        examples: 'The same “BEF” films are inside laptop screens, phone LCDs and car dashboards.',
        advanced: '90° acrylic prism arrays (~24–50 µm pitch) cast on PET. A single sheet gives ~1.5–1.6× on-axis gain, crossed sheets ~2×, by narrowing the emission cone and recycling. Often combined with a reflective polariser (DBEF/APF) for another ~1.3–1.6×. Ridges here are drawn hundreds of times larger than real; real ones are invisible to the eye but make the film look shimmery.',
        facts: ['Thanks to light recycling, prism films can almost double brightness without adding a single LED.'],
      },
    },
    {
      id: 'diffuser-sheet',
      name: 'Diffuser Sheet',
      system: 'backlight',
      position: [0, C, -0.0015],
      explode: [0, 0, 0.34],
      shapes: [
        { type: 'box', size: [AW - 0.004, AH - 0.004, 0.0003], material: { color: '#f6f8fa', metalness: 0, roughness: 0.7, opacity: 0.6 } },
      ],
      info: {
        what: 'A thin, milky plastic film that softens and evens out the light.',
        location: 'On the front of the diffuser plate, behind the prism films.',
        purpose: 'Hides any remaining bright spots from the LEDs and spreads light evenly before it reaches the prism films.',
        how: 'Tiny beads in its coating scatter light in many directions, blending the output of neighbouring LEDs into a smooth, uniform glow – a bit like frosted glass in a bathroom window.',
        connections: ['diffuser-plate', 'prism-films', 'led-backlight'],
        examples: 'Frosted lamp shades and the white cover on office ceiling panels do the same job.',
        advanced: 'PET base film (~100–200 µm) with a bead-filled acrylic coating (haze > 85 %), sometimes also a bottom diffuser and a top “protective” diffuser above the prism films to hide prism moiré. Each extra film costs ~5–10 % brightness, so designers trade uniformity against efficiency.',
        facts: ['Without diffusers you would see a grid of bright dots – one for every LED – behind the picture.'],
      },
    },
    {
      id: 'diffuser-plate',
      name: 'Diffuser Plate',
      system: 'backlight',
      position: [0, C, -0.0035],
      explode: [0, 0, 0.25],
      shapes: [
        { type: 'box', size: [AW, AH, 0.002], material: { color: '#f4f6f8', metalness: 0, roughness: 0.6, opacity: 0.72 } },
      ],
      info: {
        what: 'A stiff, milky-white plastic sheet a couple of millimetres thick.',
        location: 'About 1.5–2 cm in front of the LEDs, resting on small support pins.',
        purpose: 'Turns the grid of bright LED points into a broad, even sheet of light and gives the soft films something rigid to lie on.',
        how: 'Light from each LED enters the plate and is scattered many times by particles inside it, so by the time it comes out of the front it has blended with light from neighbouring LEDs. The gap between the LEDs and the plate (the “optical distance”) also lets each LED’s cone of light spread and overlap.',
        connections: ['led-backlight', 'diffuser-sheet', 'reflector-sheet', 'back-chassis'],
        examples: 'An LED ceiling panel uses an almost identical diffuser plate.',
        advanced: '1.5–2 mm PS, PMMA or PC with scattering particles (e.g. silicone or PMMA beads), transmission ~55–65 %. Optical distance (OD) ~10–25 mm for direct-lit TVs with wide-angle secondary lenses; mini-LED designs reduce OD to a few mm by using thousands of LEDs. Plate warping from heat and humidity is a known cause of uneven “mura”.',
        facts: ['The bigger the gap between LEDs and diffuser, the fewer LEDs are needed – but the thicker the TV.'],
      },
    },

    // ------------------------------------------------------------ backlight
    {
      id: 'led-backlight',
      name: 'LED Backlight Array',
      system: 'backlight',
      position: [0, C, -0.022],
      explode: [0, 0, 0.15],
      anim: { type: 'flow', speed: 1.5 },
      shapes: ledShapes,
      info: {
        what: 'Rows of small, very bright white LEDs on strip circuit boards that light the whole screen from behind.',
        location: 'On the back chassis, spread in a grid behind the whole picture (a “direct-lit” or “full-array” backlight).',
        purpose: 'Provide all of the TV’s light – the LCD itself only blocks or passes it.',
        how: 'Each LED is a blue-emitting chip coated with phosphor that turns part of the blue into red and green, giving white. A small dome lens over every LED throws its light sideways so neighbouring LEDs overlap evenly. The power board drives them with a constant current; dimming them in zones that show dark parts of the picture (local dimming) deepens blacks and saves power.',
        connections: ['reflector-sheet', 'diffuser-plate', 'power-board', 'back-chassis', 'main-board'],
        examples: 'Cheaper TVs put a few LEDs along the edges (“edge-lit”) instead; premium “mini-LED” TVs use thousands of tiny LEDs and hundreds of dimming zones.',
        advanced: 'Mid-power InGaN LEDs (~450 nm blue) with YAG or KSF/β-SiAlON phosphors, or blue LEDs plus a quantum-dot film (QLED) for a wider colour gamut (~90 %+ DCI-P3). Here 8 strips × 14 LEDs = 112 LEDs; full-array local dimming (FALD) groups them into dimming zones (tens to hundreds; mini-LED 1,000–5,000) driven by PWM or analogue current from constant-current boost drivers. HDR TVs reach ~600–1,500 nits peak (HDR10 is mastered up to 1,000–4,000 nits, with a 10,000-nit format limit). Backlight is typically the largest power load: ~60–120 W of a ~100–150 W TV.',
        facts: ['Most TV failures with “sound but no picture” are a dead backlight LED – the LEDs are wired in series, so one failure darkens the whole string.'],
      },
    },
    {
      id: 'reflector-sheet',
      name: 'Reflector Sheet & Support Pins',
      system: 'backlight',
      position: [0, C, -0.0255],
      explode: [0, 0, 0.07],
      shapes: [
        { type: 'box', size: [AW - 0.01, AH - 0.01, 0.0003], material: { color: '#ffffff', metalness: 0, roughness: 0.35 } },
        { type: 'cone', radius: 0.005, height: 0.021, segments: 16, rotation: FACE_Z, position: [-0.3, -LED_PITCH, 0.0105], array: { count: 3, offset: [0.3, 0, 0] }, material: M.plastic('#f4f4f4') },
        { type: 'cone', radius: 0.005, height: 0.021, segments: 16, rotation: FACE_Z, position: [-0.3, LED_PITCH, 0.0105], array: { count: 3, offset: [0.3, 0, 0] }, material: M.plastic('#f4f4f4') },
      ],
      info: {
        what: 'A brilliant-white plastic sheet lining the back of the backlight, with holes for each LED, plus little white pins that hold up the diffuser plate.',
        location: 'Directly on the back chassis, behind and around the LEDs.',
        purpose: 'Bounces every stray ray of light back towards the screen so almost none is wasted.',
        how: 'Light that heads backwards – or that the films reflect back – hits this sheet and is scattered forward again. Light can bounce between the films and reflector several times before escaping through the front, which also helps even out the brightness.',
        connections: ['led-backlight', 'diffuser-plate', 'back-chassis', 'prism-films'],
        examples: 'The white inside of a light box or a photographer’s reflector board uses the same idea.',
        advanced: 'Micro-voided white PET (~188–250 µm) with ~95–97 % diffuse reflectance, or specular multilayer enhanced specular reflector (ESR, ~98 %). Because light recycles many times through the stack, each percent of reflectance raises screen brightness noticeably. The conical pins keep the optical distance uniform and are tiny and white so they do not cast shadows.',
        facts: ['A few percent better reflectance here can raise the whole screen’s brightness by around 10 %.'],
      },
    },
    {
      id: 'back-chassis',
      name: 'Back Chassis (Metal Tray)',
      system: 'structure',
      position: [0, C, -0.0275],
      explode: [0, 0, 0],
      shapes: [
        { type: 'box', size: [AW - 0.01, AH - 0.01, 0.0008], material: M.metal('#a3abb4') },
        { type: 'box', size: [AW - 0.01, 0.001, 0.025], position: [0, AH / 2 - 0.005, 0.0125], array: { count: 2, offset: [0, -AH + 0.01, 0] }, material: M.metal('#a3abb4') },
        { type: 'box', size: [0.001, AH - 0.01, 0.025], position: [-AW / 2 + 0.005, 0, 0.0125], array: { count: 2, offset: [AW - 0.01, 0, 0] }, material: M.metal('#a3abb4') },
        { type: 'box', size: [1.0, 0.02, 0.003], radius: 0.001, position: [0, -0.21, -0.0015], array: { count: 4, offset: [0, 0.14, 0] }, material: M.metal('#949ca6') },
      ],
      info: {
        what: 'A shallow sheet-steel tray that forms the TV’s backbone.',
        location: 'Behind the backlight, the middle layer of the whole TV; the circuit boards are screwed to its back.',
        purpose: 'Holds the LED strips and optical stack, keeps the large screen flat, spreads the LEDs’ heat and gives the boards and wall mount something solid to attach to.',
        how: 'Pressed ribs stamped into the steel make the thin sheet stiff, like corrugated cardboard. The LED strips are screwed or taped to its inside, so heat from the LEDs flows into the metal and spreads out over its large area to cool.',
        connections: ['reflector-sheet', 'led-backlight', 'middle-frame', 'bezel', 'vesa-mount', 'main-board', 'power-board', 'tcon-board', 'back-cover'],
        examples: 'Like the floor pan of a car body – stiffness from shape, not thickness.',
        advanced: 'Electro-galvanised steel (SECC) ~0.6–1.0 mm or aluminium in thin premium designs. It is the main heat sink for ~60–120 W of LED power; poor thermal contact shortens LED life (lumen depreciation roughly doubles per +10 °C junction temperature). It also forms a grounded EMI shield between the panel and the switching power supply.',
        facts: ['A 55″ TV’s metal back tray often weighs more than the glass panel in front of it.'],
      },
    },
    {
      id: 'vesa-mount',
      name: 'VESA Wall-mount Points',
      system: 'structure',
      position: [0, C, -0.05],
      explode: [0, 0, -0.12],
      shapes: [
        { type: 'cylinder', radius: 0.009, height: 0.044, segments: 20, rotation: FACE_Z, position: [-0.15, -0.15, 0], array: { count: 2, offset: [0.3, 0, 0] }, material: M.brass() },
        { type: 'cylinder', radius: 0.009, height: 0.044, segments: 20, rotation: FACE_Z, position: [-0.15, 0.15, 0], array: { count: 2, offset: [0.3, 0, 0] }, material: M.brass() },
        { type: 'cylinder', radius: 0.0035, height: 0.002, segments: 12, rotation: FACE_Z, position: [-0.15, -0.15, -0.0222], array: { count: 2, offset: [0.3, 0, 0] }, material: CHIP },
        { type: 'cylinder', radius: 0.0035, height: 0.002, segments: 12, rotation: FACE_Z, position: [-0.15, 0.15, -0.0222], array: { count: 2, offset: [0.3, 0, 0] }, material: CHIP },
        { type: 'box', size: [0.04, 0.36, 0.0015], position: [-0.15, 0, 0.021], array: { count: 2, offset: [0.3, 0, 0] }, material: M.steel() },
      ],
      info: {
        what: 'Four threaded metal inserts in a 300 × 300 mm square on the back of the TV for attaching a wall bracket.',
        location: 'Centre of the back, passing through the back cover into steel reinforcing strips on the chassis.',
        purpose: 'Give a strong, standardised way to hang the TV on a wall or arm.',
        how: 'Bolts from the wall bracket screw into the inserts. The reinforcing strips spread the TV’s weight into the chassis, so the thin back cover never carries the load.',
        connections: ['back-chassis', 'back-cover', 'stand'],
        examples: 'Any “VESA 300 × 300” wall bracket from any brand will fit, because the pattern is an industry standard.',
        advanced: 'VESA MIS-F (Flat Display Mounting Interface): 55″ TVs commonly use 300 × 300, 300 × 200 or 400 × 300 mm with M6 or M8 threads; screw depth is limited (e.g. 10–15 mm) to avoid puncturing the panel. Load-bearing inserts are steel or brass PEM nuts clinched into the chassis reinforcement.',
        facts: ['VESA stands for Video Electronics Standards Association – the same group behind DisplayPort.'],
      },
    },

    // ------------------------------------------------------------ electronics
    {
      id: 'tcon-board',
      name: 'T-con (Timing Controller) Board',
      system: 'electronics',
      position: [0, 0.2, -0.033],
      explode: [0, -0.05, -0.28],
      shapes: [
        { type: 'box', size: [0.2, 0.07, 0.0016], material: PCB() },
        { type: 'box', size: [0.025, 0.025, 0.002], position: [0, 0.005, -0.0018], material: CHIP },
        { type: 'box', size: [0.012, 0.008, 0.002], position: [0.04, 0.01, -0.0018], array: { count: 2, offset: [0.02, 0, 0] }, material: CHIP },
        { type: 'box', size: [0.035, 0.008, 0.005], position: [-0.06, 0.025, -0.0033], material: M.plastic('#f2f2f2') },
        { type: 'box', size: [0.03, 0.006, 0.004], position: [-0.05, -0.03, -0.0028], array: { count: 2, offset: [0.1, 0, 0] }, material: M.plastic('#f2f2f2') },
        { type: 'box', size: [0.03, 0.05, 0.0004], position: [-0.05, -0.055, 0.0012], array: { count: 2, offset: [0.1, 0, 0] }, material: M.plastic('#c77d1a') },
      ],
      info: {
        what: 'A small circuit board that acts as the panel’s conductor, telling the driver chips what to draw and when.',
        location: 'Behind the chassis, low in the centre, just above the panel’s bottom edge.',
        purpose: 'Converts the finished video frames from the main board into the exact timing signals and pixel data the panel’s drivers need.',
        how: 'It receives the picture over a fast cable from the main board, adjusts it to suit this particular panel (fine-tuning brightness steps and speeding up pixel changes), then sends each row’s data to the source drivers while triggering the gate drivers to switch on one row after another.',
        connections: ['main-board', 'panel-cable', 'source-drivers', 'tft-glass', 'power-board'],
        examples: 'A faulty T-con often causes a washed-out, inverted or garbled picture while the sound and menus still work.',
        advanced: 'T-con ASIC receives V-by-One HS (8 lanes × ~3 Gbit/s for 4K120) or LVDS on lower-resolution sets; outputs to source drivers via CEDS / USI-T / EPI point-to-point links. Functions: overdrive LUTs, gamma and De-mura correction (per-panel compensation of brightness unevenness measured in the factory), dithering 10→8 bit, and generation of gate clocks for GOA. A PMIC on board makes the panel voltages (AVDD ~15–17 V, VGH ~+30 V, VGL ~−8 V, VCOM).',
        facts: ['Every panel is photographed in the factory so its T-con can be loaded with a correction map for its own tiny flaws.'],
      },
    },
    {
      id: 'panel-cable',
      name: 'Panel Data Cable (V-by-One)',
      system: 'electronics',
      position: [0.12, 0.25, -0.042],
      explode: [0.03, -0.02, -0.26],
      shapes: [
        { type: 'tube', radius: 0.0025, radialSegments: 8, points: [[0.07, 0.04, 0], [0.04, 0.0, -0.004], [-0.02, -0.03, -0.002], [-0.06, -0.035, 0.004]], array: { count: 3, offset: [0, 0.006, 0] }, material: M.plastic('#d8d8d8') },
      ],
      info: {
        what: 'A thin multi-wire cable carrying the picture from the main board to the T-con board.',
        location: 'Behind the chassis, running between the main board and the T-con.',
        purpose: 'Carries billions of bits per second of uncompressed pixel data to the panel electronics.',
        how: 'Each frame’s pixels are sent as fast electrical pulses over several pairs of wires at once. Each pair carries a signal and its mirror image (differential signalling), so interference picked up equally on both cancels out.',
        connections: ['main-board', 'tcon-board'],
        examples: 'A loose panel cable can cause flickering lines or a black screen with working sound.',
        advanced: 'V-by-One HS: 8 lanes for 4K60 (16 for 4K120) at up to ~3.75 Gbit/s per lane with 8b/10b coding and embedded clock, over a fine-pitch FFC/micro-coax harness. 4K 120 Hz 10-bit RGB needs ~30 Gbit/s raw. Older full-HD sets used LVDS with a separate clock pair.',
        facts: ['A 4K picture at 120 Hz is roughly 30 gigabits of data every second – about 4 GB per second.'],
      },
    },
    {
      id: 'main-board',
      name: 'Main Board (SoC & HDMI ports)',
      system: 'electronics',
      position: [0.3, 0.32, -0.033],
      explode: [0.15, 0.02, -0.33],
      shapes: [
        { type: 'box', size: [0.24, 0.16, 0.0016], material: PCB() },
        { type: 'box', size: [0.05, 0.05, 0.004], position: [-0.02, 0.01, -0.0028], material: M.aluminium() },
        { type: 'box', size: [0.05, 0.002, 0.01], position: [-0.02, -0.0125, -0.0098], array: { count: 10, offset: [0, 0.005, 0] }, material: M.aluminium() },
        { type: 'box', size: [0.022, 0.014, 0.0015], position: [-0.08, 0.05, -0.0016], array: { count: 2, offset: [0, -0.025, 0] }, material: CHIP },
        { type: 'box', size: [0.016, 0.016, 0.0015], position: [-0.08, -0.04, -0.0016], material: CHIP },
        { type: 'box', size: [0.05, 0.035, 0.01], position: [0.04, -0.05, -0.0058], material: M.metal('#c9ced4') },
        { type: 'box', size: [0.015, 0.016, 0.0075], position: [0.1225, 0.06, -0.0046], array: { count: 3, offset: [0, -0.025, 0] }, material: M.metal('#c9ced4') },
        { type: 'box', size: [0.004, 0.012, 0.0035], position: [0.129, 0.06, -0.0046], array: { count: 3, offset: [0, -0.025, 0] }, material: CHIP },
        { type: 'box', size: [0.014, 0.013, 0.006], position: [0.1225, -0.02, -0.0038], array: { count: 2, offset: [0, -0.02, 0] }, material: M.metal('#b8bec6') },
        { type: 'box', size: [0.006, 0.006, 0.0012], position: [0.04, 0.04, -0.0014], array: { count: 4, offset: [0.012, 0, 0] }, material: CHIP },
      ],
      info: {
        what: 'The TV’s computer: a circuit board with the main processor (SoC), memory, TV tuner and the HDMI and USB sockets.',
        location: 'Behind the chassis on the right, with its ports facing out of the side of the back cover.',
        purpose: 'Receives every picture source – aerial, HDMI, streaming apps – decodes it, improves it, adds menus and sends the finished frames to the panel; it also runs the smart-TV software and audio.',
        how: 'Signals arrive from HDMI, the tuner or the internet. The SoC decompresses the video, scales it to 4K, sharpens it, smooths motion, applies HDR tone-mapping, draws the menus on top and sends each frame to the T-con. It also decodes the sound and drives the speakers through an amplifier, and works out the local-dimming pattern for the backlight.',
        connections: ['tcon-board', 'panel-cable', 'power-board', 'wifi-module', 'speaker-left', 'speaker-right', 'ir-receiver', 'control-button', 'led-backlight'],
        examples: 'Netflix, YouTube and the TV’s home screen all run on this board; firmware updates replace its software.',
        advanced: 'Quad-core ARM SoC (e.g. Cortex-A55/A73) with a GPU, hardware decoders for HEVC, VP9 and AV1 up to 4K120, a picture-quality engine (MEMC frame interpolation, noise reduction, upscaling, HDR10/HLG/Dolby Vision tone-mapping), 2–4 GB DDR4 and 8–32 GB eMMC. HDMI 2.1 ports support FRL up to 48 Gbit/s, 4K 120 Hz, VRR, ALLM and eARC to a soundbar. Integrated class-D audio amp (2 × 10 W) and a DVB-T2/C/S2 or ATSC 3.0 tuner can.',
        facts: ['A modern smart-TV processor is roughly as powerful as a mid-range smartphone from a few years earlier.'],
      },
    },
    {
      id: 'wifi-module',
      name: 'Wi-Fi & Bluetooth Module',
      system: 'electronics',
      position: [0.3, 0.44, -0.034],
      explode: [0.12, 0.08, -0.3],
      shapes: [
        { type: 'box', size: [0.05, 0.03, 0.0012], material: PCB('#1a4f8a') },
        { type: 'box', size: [0.022, 0.018, 0.003], position: [-0.008, 0, -0.002], material: M.metal('#c9ced4') },
        { type: 'tube', radius: 0.0012, radialSegments: 6, points: [[0.018, 0.01, -0.002], [0.03, 0.06, -0.006], [0.06, 0.14, -0.006]], material: M.plastic('#1b1c1f') },
        { type: 'box', size: [0.03, 0.006, 0.001], position: [0.06, 0.15, -0.006], material: M.copper() },
      ],
      info: {
        what: 'A small plug-in radio board for wireless internet and Bluetooth.',
        location: 'Above the main board, with thin antenna wires running up to where the metal chassis does not block the signal.',
        purpose: 'Connects the TV to your home Wi-Fi for streaming and to Bluetooth devices such as headphones and the voice remote.',
        how: 'A radio chip under the metal shield exchanges data with your router using 2.4 GHz and 5 GHz radio waves, and with Bluetooth gadgets at 2.4 GHz. It passes the data to the main board over a USB or PCIe link.',
        connections: ['main-board', 'back-cover'],
        examples: 'Streaming 4K video, casting from a phone and pairing wireless headphones all use this module.',
        advanced: 'Typically a Wi-Fi 5/6 (802.11ac/ax) 2×2 MIMO + Bluetooth 5.x combo; 4K HDR streams need ~15–25 Mbit/s sustained. Antennas are flexible PCB or stamped-metal types placed near the plastic edges, since the steel chassis and back cover hardware would detune them.',
        facts: ['The plastic back cover exists partly because a full metal back would block Wi-Fi.'],
      },
    },
    {
      id: 'power-board',
      name: 'Power Supply & LED Driver Board',
      system: 'electronics',
      position: [-0.3, 0.32, -0.033],
      explode: [-0.15, 0.02, -0.33],
      shapes: [
        { type: 'box', size: [0.24, 0.17, 0.0016], material: PCB('#6b5530') },
        { type: 'cylinder', radius: 0.011, height: 0.03, rotation: [PI / 2, 0, 0], position: [-0.05, 0.03, -0.0158], material: M.plastic('#1b2b5a') },
        { type: 'cylinder', radius: 0.008, height: 0.022, rotation: [PI / 2, 0, 0], position: [0.06, -0.05, -0.0118], array: { count: 3, offset: [0.018, 0, 0] }, material: M.plastic('#1b1c1f') },
        { type: 'box', size: [0.03, 0.03, 0.02], radius: 0.003, position: [0.0, 0.03, -0.0108], array: { count: 2, offset: [0.045, 0, 0] }, material: M.plastic('#e8c53a') },
        { type: 'box', size: [0.08, 0.003, 0.02], position: [-0.02, -0.02, -0.0108], array: { count: 2, offset: [0, -0.03, 0] }, material: M.aluminium() },
        { type: 'box', size: [0.02, 0.03, 0.012], position: [-0.11, 0.05, -0.0068], material: M.plastic('#f2f2f2') },
        { type: 'box', size: [0.012, 0.004, 0.004], position: [-0.09, -0.06, -0.0028], material: M.glass('#dde') },
      ],
      info: {
        what: 'The board that turns mains electricity into the low DC voltages the TV needs and drives the LED backlight.',
        location: 'Behind the chassis on the left, where the mains power cord plugs in.',
        purpose: 'Powers everything inside the TV and controls the current through the LED strings, which sets the screen brightness.',
        how: 'Mains AC is filtered, rectified to DC and corrected so the TV draws current smoothly. A switching converter chops it at high frequency through compact transformers to make isolated 12–24 V outputs for the boards and speakers. A separate LED-driver section boosts the voltage to run the LED strings at a precisely controlled current, dimming them on command from the main board.',
        connections: ['main-board', 'led-backlight', 'tcon-board', 'speaker-left', 'speaker-right', 'back-chassis'],
        examples: 'Many “TV won’t turn on, standby light blinks” repairs are a failed capacitor on this board.',
        advanced: '100–240 VAC input with EMI filter, active PFC boost stage (~390 V DC bus; required above 75 W by EN 61000-3-2), then an LLC resonant half-bridge for high efficiency (~90 %+). A standby flyback keeps < 0.5 W in standby (EU regulation) so the IR receiver can wake the TV. LED drivers are constant-current boost converters (string voltages ~60–200 V) with PWM or analogue dimming per zone. Combined boards are called “IP boards” (integrated power).',
        facts: ['The big blue capacitor can stay charged to hundreds of volts after unplugging – never touch a TV power board.'],
      },
    },
    {
      id: 'ir-receiver',
      name: 'IR Receiver & Standby LED',
      system: 'electronics',
      position: [0, 0.089, -0.002],
      explode: [0, -0.08, 0.3],
      shapes: [
        { type: 'box', size: [0.06, 0.012, 0.022], radius: 0.004, material: M.plastic('#15171a') },
        { type: 'box', size: [0.012, 0.007, 0.002], position: [-0.012, 0, 0.011], material: { color: '#5a0f14', metalness: 0, roughness: 0.15, opacity: 0.85 } },
        { type: 'cylinder', radius: 0.0018, height: 0.002, rotation: FACE_Z, position: [0.012, 0, 0.011], material: M.light('#ff3b30', 1.4) },
      ],
      info: {
        what: 'A small pod under the screen containing an infrared light sensor, a standby light and often an ambient light sensor.',
        location: 'Hanging just below the centre of the bottom bezel, facing the viewer.',
        purpose: 'Receives commands from the remote control and shows whether the TV is on or in standby.',
        how: 'Pressing a remote button flashes an invisible infrared LED in a coded pattern of pulses. This sensor ignores ordinary room light and only responds to light flickering at 38,000 times a second, decodes the pattern and tells the main board which button was pressed. A light sensor next to it can automatically dim the picture in a dark room.',
        connections: ['main-board', 'power-board', 'bezel'],
        examples: 'Point a phone camera at a TV remote while pressing a button – the camera can see the IR flashes your eye cannot.',
        advanced: 'Integrated photodiode + AGC + band-pass + demodulator (TSOP-style) for 36–40 kHz carriers at ~940 nm; protocols include NEC, RC-5/RC-6 and vendor variants. It is powered from the standby rail so it works while the TV is “off”. Many newer remotes use Bluetooth LE for voice, with IR kept for power-on and universal remotes.',
        facts: ['Remote-control infrared is around 940 nm – just beyond red, invisible to us but visible to most phone cameras.'],
      },
    },
    {
      id: 'control-button',
      name: 'Control Joystick / Power Button',
      system: 'electronics',
      position: [0.1, 0.088, -0.036],
      explode: [0.05, -0.08, -0.15],
      shapes: [
        { type: 'box', size: [0.04, 0.008, 0.02], radius: 0.002, material: M.plastic('#202328') },
        { type: 'cylinder', radius: 0.004, height: 0.008, position: [0, -0.008, 0], material: M.plastic('#3a3f47') },
      ],
      info: {
        what: 'A small multi-direction button underneath the TV for use without the remote.',
        location: 'On the underside of the TV, behind the bottom edge.',
        purpose: 'Lets you switch the TV on and off, change input or adjust volume when the remote is lost.',
        how: 'Pressing it switches the TV on; nudging it left, right, forward or back moves through a simple menu. Each direction closes a different little switch read by the main board.',
        connections: ['main-board', 'ir-receiver'],
        examples: 'The one button you hunt for under the screen when the remote batteries have died.',
        advanced: 'A 5-way tactile switch (or a single button cycling functions) wired to the SoC’s GPIO/ADC via the IR board. It is monitored on the standby rail so it can wake the TV from < 0.5 W standby.',
        facts: ['Placing the button underneath keeps the front and sides of the TV completely clean.'],
      },
    },

    // ------------------------------------------------------------ audio
    ...[-1, 1].map((side) => ({
      id: side < 0 ? 'speaker-left' : 'speaker-right',
      name: side < 0 ? 'Left Speaker' : 'Right Speaker',
      system: 'audio',
      position: [side * 0.41, 0.165, -0.047],
      explode: [side * 0.08, -0.05, -0.22],
      shapes: [
        { type: 'box', size: [0.12, 0.028, 0.035], radius: 0.006, material: M.plastic('#202328') },
        { type: 'cylinder', radius: 0.012, height: 0.003, scale: [2.2, 1, 1], position: [0, -0.0145, 0], material: M.metal('#5a5f66') },
        { type: 'box', size: [0.012, 0.012, 0.006], position: [-side * 0.065, 0.004, 0], material: M.plastic('#f2f2f2') },
      ],
      info: {
        what: `The ${side < 0 ? 'left' : 'right'} built-in loudspeaker in a small sealed plastic box.`,
        location: `Low on the ${side < 0 ? 'left' : 'right'} of the back, behind the screen, firing downwards.`,
        purpose: `Produces the ${side < 0 ? 'left' : 'right'} stereo channel of the TV sound.`,
        how: 'An amplifier on the main board sends an electrical copy of the sound to a coil attached to a light cone. The coil sits in a magnet’s field, so the changing current pushes the cone back and forth, pushing the air and making sound waves. Because the TV is so thin, the speaker points down and bounces sound off the table towards you.',
        connections: ['main-board', side < 0 ? 'speaker-right' : 'speaker-left', 'power-board', 'back-cover'],
        examples: 'Many people add a soundbar connected by HDMI eARC, because there is so little room for big speakers in a thin TV.',
        advanced: 'Full-range oval drivers (~30 × 80 mm) of ~8 Ω, typically 10 W each from a class-D amplifier, in a small sealed or bass-reflex enclosure, sometimes with a passive radiator. DSP applies EQ, virtual-surround and dynamic bass limiting to protect the tiny drivers. Frequency response is roughly 100 Hz–20 kHz; real bass needs a bigger box.',
        facts: ['Sound from a downward-firing speaker reflects off your TV cabinet – placing the TV on a hard surface makes it clearer.'],
      },
    })),

    // ------------------------------------------------------------ structure (rear + stand)
    {
      id: 'back-cover',
      name: 'Back Cover',
      system: 'structure',
      position: [0, C, -0.03],
      explode: [0, 0, -0.55],
      ghost: true,
      shapes: [
        { type: 'box', size: [W - 0.004, H - 0.004, 0.012], radius: 0.004, position: [0, 0, -0.006], material: M.plastic('#1c1f24') },
        { type: 'box', size: [0.96, 0.5, 0.04], radius: 0.015, position: [0, -0.08, -0.022], material: M.plastic('#1c1f24') },
      ],
      info: {
        what: 'The moulded plastic shell covering the whole back of the TV.',
        location: 'The rear of the TV; the thicker central “hump” houses the circuit boards and speakers.',
        purpose: 'Protects the electronics and you – keeping fingers away from mains voltages – while letting heat, Wi-Fi signals and sound out.',
        how: 'It screws onto the back chassis. The edges are very thin where only the panel is; the electronics live in a deeper section in the lower middle. Vents let warm air rise out, openings expose the ports, and holes line up with the wall-mount inserts.',
        connections: ['back-chassis', 'cooling-vents', 'vesa-mount', 'main-board', 'power-board', 'speaker-left', 'speaker-right'],
        examples: 'The textured black back you see when hanging a TV on the wall.',
        advanced: 'Injection-moulded ABS, PC/ABS or HIPS (often with recycled content), ~2 mm wall, UL94 V-0 near the power supply, with ribs and bosses for screws. Must meet IEC 62368-1 safety (no access to hazardous voltage, fire enclosure). Plastic rather than metal keeps weight down and lets Wi-Fi and Bluetooth through.',
        facts: ['Most of a modern TV’s visible “thickness” is this cover’s hump – the panel itself is under 1.5 cm.'],
      },
    },
    {
      id: 'cooling-vents',
      name: 'Cooling Vents',
      system: 'structure',
      position: [0, 0, -0.052],
      explode: [0, 0, -0.55],
      shapes: [
        { type: 'box', size: [0.05, 0.002, 0.004], position: [-0.4225, 0.621, 0], array: { count: 14, offset: [0.065, 0, 0] }, material: M.plastic('#0c0d10') },
        { type: 'box', size: [0.04, 0.002, 0.004], position: [-0.27, 0.119, 0], array: { count: 10, offset: [0.06, 0, 0] }, material: M.plastic('#0c0d10') },
      ],
      info: {
        what: 'Rows of slots on the top and bottom of the back cover’s hump.',
        location: 'Along the upper and lower edges of the back cover’s deeper central section.',
        purpose: 'Let cool air in at the bottom and warm air out at the top, so the electronics stay at a safe temperature without a noisy fan.',
        how: 'The boards and LEDs warm the air inside. Warm air is lighter, so it rises and escapes through the top slots, pulling cooler room air in through the bottom ones – natural convection, like a chimney.',
        connections: ['back-cover', 'power-board', 'main-board'],
        examples: 'Never push a TV tight into a closed cabinet or cover the top vents – it can overheat and shorten its life.',
        advanced: 'A 55″ LED TV dissipates ~80–150 W while showing bright content. Fanless convection keeps component temperatures ~20–40 °C above ambient; electrolytic-capacitor life roughly halves for every 10 °C rise (Arrhenius rule), so vent area and board placement directly affect reliability. Slot size is kept small to meet safety-standard finger-probe and fire-enclosure rules.',
        facts: ['TVs have no fans – the vents work purely because hot air rises.'],
      },
    },
    {
      id: 'stand',
      name: 'Stand / Feet',
      system: 'structure',
      position: [0, 0, 0],
      explode: [0, 0, -0.2],
      shapes: [
        ...[-0.52, 0.52].flatMap((x) => [
          bar(x, [0.096, -0.045], [0.006, 0.12], 0.03, 0.012, M.metal('#2f3237')),
          bar(x, [0.096, -0.045], [0.006, -0.17], 0.03, 0.012, M.metal('#2f3237')),
          { type: 'box', size: [0.05, 0.08, 0.004], radius: 0.0015, position: [x, 0.13, -0.046], material: M.metal('#2f3237') },
          { type: 'box', size: [0.034, 0.004, 0.03], position: [x, 0.002, 0.11], material: M.rubber() },
          { type: 'box', size: [0.034, 0.004, 0.03], position: [x, 0.002, -0.16], material: M.rubber() },
        ]),
      ],
      info: {
        what: 'Two slim metal feet that hold the TV upright on a table.',
        location: 'Under the left and right ends of the TV, screwed into its back.',
        purpose: 'Support the TV’s weight and keep it from tipping forward or backward.',
        how: 'Each foot is a wide “V” that reaches out in front of and behind the screen, so the TV’s centre of gravity always sits safely between the contact points. Rubber pads stop scratches and sliding.',
        connections: ['back-chassis', 'back-cover', 'vesa-mount'],
        examples: 'Some TVs use a single central pedestal instead – useful if your TV bench is narrower than the screen.',
        advanced: 'Die-cast aluminium or zinc, or stamped steel, sized for a ~15–18 kg TV with a tip-over safety margin (e.g. IEC 62368-1 stability test: 10° tilt without falling, plus a horizontal push). Wide-set feet need a bench almost as wide as the TV; anti-tip straps are recommended where children are present.',
        facts: ['A 55″ TV weighs about the same as a large dog – roughly 15–20 kg with its stand.'],
      },
    },
  ],

  steps: [
    {
      title: '1 · Light source',
      text: 'Everything starts at the back. The power board drives a precise current through rows of white LEDs. Each LED is a blue chip with a phosphor coating that converts part of the blue into red and green, making white light. With local dimming, LEDs behind dark parts of the picture are turned down.',
      focus: ['led-backlight', 'reflector-sheet', 'power-board', 'back-chassis'],
      explode: 0.35,
      animate: true,
    },
    {
      title: '2 · Diffusing & focusing light',
      text: 'The diffuser plate and sheet blend the LED points into one smooth glow, while the white reflector recycles light that bounces backwards. Crossed prism films then steer the light straight towards the viewer, nearly doubling brightness.',
      focus: ['diffuser-plate', 'diffuser-sheet', 'prism-films', 'reflector-sheet'],
      explode: 0.5,
      animate: true,
    },
    {
      title: '3 · Polarising',
      text: 'The rear polariser lets through only light vibrating in one direction – at least half the light is lost here. The front polariser is turned 90°, so with nothing in between, no light would get out at all.',
      focus: ['rear-polariser', 'front-polariser'],
      explode: 0.6,
      animate: false,
    },
    {
      title: '4 · Liquid crystals turn',
      text: 'The TFT glass applies a voltage to each of ~25 million sub-pixels, row by row, 120 times a second. The liquid-crystal molecules tilt by an amount that depends on the voltage, rotating the light’s vibration so more or less of it passes the front polariser – a tiny light valve for every sub-pixel.',
      focus: ['liquid-crystal', 'tft-glass', 'source-drivers'],
      explode: 0.6,
      animate: false,
    },
    {
      title: '5 · Colour filters',
      text: 'Each pixel is three sub-pixels behind red, green and blue filters. By setting how much light each lets through, the TV mixes any colour – from far away your eye blends the three into a single dot.',
      focus: ['colour-filter', 'front-polariser'],
      explode: 0.6,
      animate: false,
    },
    {
      title: '6 · Signal processing',
      text: 'Video arrives over HDMI, aerial or Wi-Fi. The main board’s processor decodes it, upscales it to 4K, applies HDR tone-mapping and motion smoothing, then streams finished frames over the panel cable to the T-con, which drives the source and gate drivers in perfect time.',
      focus: ['main-board', 'wifi-module', 'panel-cable', 'tcon-board', 'source-drivers', 'ir-receiver'],
      explode: 0.4,
      animate: false,
    },
    {
      title: '7 · Sound, power & cooling',
      text: 'An amplifier on the main board drives two downward-firing speakers. Meanwhile, about 100 W of heat from the LEDs and boards spreads through the steel chassis and escapes by convection through the vents – no fan needed.',
      focus: ['speaker-left', 'speaker-right', 'power-board', 'cooling-vents', 'back-cover'],
      explode: 0.3,
      animate: false,
    },
  ],
};
