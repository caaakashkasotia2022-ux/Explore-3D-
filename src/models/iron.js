import { M } from '../three/materials.js';

/*
 * Steam iron, modelled at 5× real size (real iron ≈ 0.28 × 0.12 × 0.15 m; here 1.4 × 0.6 × 0.75 m)
 * so the small internals are easy to see and click. Soleplate sits on y = 0, tip points +X,
 * heel (where it stands on end) at −X.
 *
 * Top-view outlines are drawn in XY (x = length, y = width) and laid flat with LAY_FLAT,
 * which maps outline y → world z and extrusion depth → world y.
 */

const PI = Math.PI;
const LAY_FLAT = [PI / 2, 0, 0];
const DOUBLE = (m) => ({ ...m, side: 'double' });

/** Classic iron planform: parallel heel section with rounded corners, tapering to a pointed nose. */
function ironOutline({ hw, heelX, tipX, flat = 0.3, cr = 0.05, n = 22, scaleY = 1 }) {
  const xs = heelX + flat * (tipX - heelX);
  const w = (x) => {
    if (x <= xs) return hw;
    const t = Math.min(1, (x - xs) / (tipX - xs));
    return hw * Math.pow(1 - Math.pow(t, 1.8), 0.75);
  };
  const side = [];
  for (let i = 1; i <= n; i++) {
    const x = heelX + cr + (tipX - heelX - cr) * Math.sin((PI / 2) * (i / n));
    side.push([x, w(x)]);
  }
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const a = PI + (i / 4) * (PI / 2);
    pts.push([heelX + cr + cr * Math.cos(a), -(hw - cr) + cr * Math.sin(a)]);
  }
  side.forEach(([x, y]) => pts.push([x, -y]));
  for (let i = side.length - 2; i >= 0; i--) pts.push([side[i][0], side[i][1]]);
  for (let i = 0; i <= 4; i++) {
    const a = PI / 2 + (i / 4) * (PI / 2);
    pts.push([heelX + cr + cr * Math.cos(a), hw - cr + cr * Math.sin(a)]);
  }
  return { pts: pts.map(([x, y]) => [x, y * scaleY]), w };
}

const SOLE = ironOutline({ hw: 0.3, heelX: -0.68, tipX: 0.7, flat: 0.32, cr: 0.06 });
const CHAMBER = ironOutline({ hw: 0.12, heelX: -0.02, tipX: 0.4, flat: 0.25, cr: 0.03 });
const TANK = ironOutline({ hw: 0.2, heelX: -0.04, tipX: 0.52, flat: 0.2, cr: 0.04, n: 18 });
const WATER = ironOutline({ hw: 0.175, heelX: -0.02, tipX: 0.47, flat: 0.2, cr: 0.03, n: 18 });
const SHELL = [
  ironOutline({ hw: 0.29, heelX: -0.67, tipX: 0.68, flat: 0.32, cr: 0.07 }),
  ironOutline({ hw: 0.255, heelX: -0.66, tipX: 0.6, flat: 0.3, cr: 0.07 }),
  ironOutline({ hw: 0.2, heelX: -0.64, tipX: 0.42, flat: 0.32, cr: 0.07 }),
];

/** Sheathed element path: follows the soleplate edge inset, both cold ends at the heel. */
const ELEMENT_EL = ironOutline({ hw: 0.215, heelX: -0.55, tipX: 0.56, flat: 0.25, cr: 0.0 });
const elementPts = (() => {
  const pts = [[-0.56, 0, -0.07], [-0.5, 0, -0.16], [-0.43, 0, -0.205]];
  const n = 14;
  const right = [];
  for (let i = 0; i <= n; i++) {
    const x = -0.36 + (0.53 + 0.36) * Math.sin((PI / 2) * (i / n));
    right.push([x, 0, -ELEMENT_EL.w(x)]);
  }
  pts.push(...right, [0.56, 0, 0]);
  for (let i = right.length - 1; i >= 0; i--) pts.push([right[i][0], 0, -right[i][2]]);
  pts.push([-0.43, 0, 0.205], [-0.5, 0, 0.16], [-0.56, 0, 0.07]);
  return pts;
})();

const SOLE_TOP = 0.06;
const shell = (o) => ({ ...M.plastic('#1f8a9e'), clearcoat: 0.8, clearcoatRoughness: 0.15, opacity: o });

/** Steam-hole rows on the soleplate face: [x0, z, count, dx]. */
const HOLE_ROWS = [
  [-0.42, 0, 9, 0.12], [-0.3, 0.1, 6, 0.12], [-0.3, -0.1, 6, 0.12],
  [-0.4, 0.2, 4, 0.13], [-0.4, -0.2, 4, 0.13],
];

export default {
  id: 'iron',
  name: 'Steam Iron',
  category: 'appliances',
  tagline: 'A 2,000-watt hotplate with a kettle built in.',
  description:
    'A modern steam iron, shown at 5× real size (a real one is about 28 × 12 × 15 cm) so its small parts are easy to see. Explode it to find the cast-in heating element, the bimetal thermostat that holds the temperature, and the drip-feed steam system – then follow it from cold start to shot of steam.',
  camera: { position: [1.75, 1.2, 1.95], target: [0, 0.3, 0] },
  explodeScale: 1,
  systems: [
    { id: 'heating', name: 'Heating', color: '#ff7a45' },
    { id: 'steam', name: 'Steam & Water', color: '#4cc9f0' },
    { id: 'controls', name: 'Controls & Safety', color: '#facc15' },
    { id: 'body', name: 'Body', color: '#a78bfa' },
  ],
  parts: [
    // ------------------------------------------------------------ heating
    {
      id: 'soleplate',
      name: 'Soleplate',
      system: 'heating',
      position: [0, SOLE_TOP / 2, 0],
      explode: [0, -0.3, 0],
      shapes: [
        { type: 'extrude', outline: SOLE.pts, depth: 0.048, bevel: 0.006, rotation: LAY_FLAT, material: M.brushed('#c9cdd2') },
        ...HOLE_ROWS.map(([x0, z, count, dx]) => ({
          type: 'cylinder', radius: 0.014, height: 0.004, segments: 16, position: [x0, -0.0295, z],
          array: { count, offset: [dx, 0, 0] }, material: M.metal('#2a2d33'),
        })),
        // steam-distribution groove around the front
        { type: 'tube', radius: 0.004, radialSegments: 6, segments: 60,
          points: [[0.15, -0.029, -0.22], [0.42, -0.029, -0.14], [0.6, -0.029, -0.03], [0.6, -0.029, 0.03], [0.42, -0.029, 0.14], [0.15, -0.029, 0.22]],
          material: M.metal('#5b5f66') },
      ],
      info: {
        what: 'The flat, smooth metal base of the iron – the part that actually touches and presses the clothes.',
        location: 'The very bottom of the iron, pointed at the front and square at the heel.',
        purpose: 'Stores and spreads heat evenly, glides over fabric, and lets steam out through its holes.',
        how: 'It is a thick aluminium casting with the heating element cast into it, so heat flows straight in. A thin, hard, slippery coating on the bottom touches the cloth. Steam made in the chamber above escapes through the holes and grooves into the fabric. The pointed tip gets into collars and between buttons.',
        connections: ['heating-element', 'steam-chamber', 'thermostat', 'thermal-fuse', 'housing'],
        examples: 'Hair straighteners, sandwich presses and heat-press machines all use the same heated-plate idea.',
        advanced: 'Die-cast aluminium alloy (thermal conductivity ~150–200 W/m·K, vs ~16 for stainless steel) for fast, even heating, faced with a coating: polished/brushed stainless steel (hard, cheap), PTFE non-stick (slippery but scratches), sol-gel ceramic (smooth, ~250 °C limit), enamel, or anodised aluminium. Typical surface temperatures: ~110 °C (•, synthetics), ~150 °C (••, wool/silk), ~200 °C (•••, cotton/linen). Holes are placed so steam reaches the tip and edges where creases form.',
        facts: ['Soleplate mass is a trade-off: heavier plates hold temperature better when the steam is cooling them, but take longer to heat up.'],
      },
    },
    {
      id: 'heating-element',
      name: 'Heating Element',
      system: 'heating',
      position: [0, SOLE_TOP + 0.006, 0],
      explode: [0, -0.12, 0],
      anim: { type: 'flow', speed: 2 },
      shapes: [
        { type: 'tube', points: elementPts, radius: 0.019, radialSegments: 12, segments: 260,
          material: { color: '#8a4a2a', metalness: 0.5, roughness: 0.45, emissive: '#ff5a00', emissiveIntensity: 1.1 } },
        { type: 'cylinder', radius: 0.013, height: 0.07, position: [-0.56, 0.03, -0.07], array: { count: 2, offset: [0, 0, 0.14] }, material: M.metal('#9aa3ad') },
        { type: 'box', size: [0.03, 0.006, 0.03], position: [-0.56, 0.068, -0.07], array: { count: 2, offset: [0, 0, 0.14] }, material: M.brass() },
      ],
      info: {
        what: 'A metal tube containing a coiled resistance wire that gets hot when electricity flows through it – the iron’s "stove".',
        location: 'Cast into the top of the soleplate in a U-shape that follows its edge, with both connection ends at the heel.',
        purpose: 'Turns electrical energy into heat to warm the soleplate and boil water into steam.',
        how: 'Current is pushed through a thin nickel-chrome wire. The wire resists the flow, and that resistance turns electrical energy into heat (Joule heating). The wire sits in tightly packed white mineral powder that conducts heat but not electricity, inside a metal sheath that is cast into the aluminium.',
        connections: ['soleplate', 'thermostat', 'thermal-fuse', 'internal-wiring', 'steam-chamber'],
        examples: 'Kettles, ovens, water heaters and toasters use the same kind of "sheathed" or "Calrod" element.',
        advanced: 'Nichrome (Ni80Cr20) helix in compacted MgO inside a steel/aluminium sheath. Joule heating: P = V²/R, so a 2,200 W iron on 230 V has R = 230² / 2200 ≈ 24 Ω and draws I = P/V ≈ 9.6 A (on 120 V, ~1,500–1,800 W at ~8 Ω). Element surface reaches ~300–400 °C at full power; the U-shape around the edge compensates for higher heat loss at the plate edges and the cooling from steam.',
        facts: ['An iron uses about as much power as a fan heater – roughly 30 times a ceiling fan.', 'Element ends are "cold pins": the resistance wire stops short so the terminals stay cooler.'],
      },
    },
    {
      id: 'thermal-fuse',
      name: 'Thermal Fuse',
      system: 'controls',
      position: [-0.47, SOLE_TOP + 0.02, 0.11],
      explode: [0, 0.06, 0.32],
      shapes: [
        { type: 'capsule', radius: 0.012, length: 0.05, rotation: [0, 0, PI / 2], material: M.plastic('#d9d4c4') },
        { type: 'cylinder', radius: 0.002, height: 0.05, rotation: [0, 0, PI / 2], position: [-0.05, 0, 0], array: { count: 2, offset: [0.1, 0, 0] }, material: M.chrome() },
        { type: 'box', size: [0.08, 0.006, 0.04], radius: 0.002, position: [0, -0.014, 0], material: M.metal('#8b8f96') },
      ],
      info: {
        what: 'A tiny one-time safety switch that permanently cuts the power if the iron gets dangerously hot.',
        location: 'Clamped to the soleplate near the heel, wired in series with the heating element.',
        purpose: 'Last line of defence if the thermostat sticks closed – it stops the iron overheating and starting a fire.',
        how: 'Inside is a pellet that melts at a precise temperature. While solid, it holds a spring contact closed. If the soleplate overheats, the pellet melts, the spring snaps the contact open and the circuit is broken for good.',
        connections: ['soleplate', 'heating-element', 'thermostat', 'internal-wiring'],
        examples: 'Hair dryers, kettles, coffee makers and electric blankets all hide a thermal fuse.',
        advanced: 'Organic-pellet or alloy-type thermal cut-off (TCO), typically rated ~216–240 °C, 10–16 A, mounted in good thermal contact with the plate. Unlike the thermostat it is non-resetting by design: a blown TCO means a fault (usually a welded thermostat contact) that must be fixed. Required by IEC 60335-2-3 "abnormal operation" tests.',
        facts: ['If an iron suddenly never heats again, a blown thermal fuse is the most common cause.'],
      },
    },
    {
      id: 'thermostat',
      name: 'Bimetal Thermostat',
      system: 'controls',
      position: [-0.27, SOLE_TOP, 0],
      explode: [0, 0.2, -0.28],
      shapes: [
        { type: 'box', size: [0.14, 0.03, 0.11], radius: 0.006, position: [0, 0.015, 0], material: M.plastic('#efe9dc') },
        { type: 'box', size: [0.12, 0.006, 0.03], position: [0, 0.036, -0.02], material: M.copper() },
        { type: 'box', size: [0.12, 0.006, 0.03], position: [0, 0.042, -0.02], material: M.metal('#9aa3ad') },
        { type: 'box', size: [0.1, 0.004, 0.022], position: [0.01, 0.06, 0.025], material: M.brass() },
        { type: 'cylinder', radius: 0.008, height: 0.006, segments: 16, position: [0.05, 0.051, -0.02], material: M.chrome() },
        { type: 'cylinder', radius: 0.008, height: 0.006, segments: 16, position: [0.05, 0.057, 0.008], material: M.chrome() },
        { type: 'cylinder', radius: 0.008, height: 0.36, segments: 16, position: [0.0, 0.21, 0.04], material: M.metal('#9aa3ad') },
        { type: 'cylinder', radius: 0.012, height: 0.03, segments: 16, position: [0.0, 0.055, 0.04], material: M.plastic('#efe9dc') },
      ],
      info: {
        what: 'An automatic switch that turns the heating element on and off to hold the temperature you chose.',
        location: 'Screwed onto the middle of the soleplate under the temperature dial; a shaft runs up to the dial.',
        purpose: 'Keeps the soleplate near the set temperature so it is hot enough to remove creases but does not scorch the fabric.',
        how: 'Its key part is a bimetallic strip: two metals that expand by different amounts, bonded together. As the soleplate heats, the strip bends and, at the set temperature, pushes the contacts apart – power off. As the plate cools, the strip straightens, the contacts touch again – power on. Turning the dial moves the contacts closer or further, changing the temperature at which they open.',
        connections: ['temperature-dial', 'soleplate', 'heating-element', 'indicator-light', 'thermal-fuse', 'internal-wiring'],
        examples: 'Old room thermostats, toasters, electric kettles (the "click" when they switch off) and car indicator flashers use bimetal strips.',
        advanced: 'Typically a snap-action or creep bimetal (e.g. Invar/Ni-Cr-Fe pair) driving silver-alloy contacts rated ~10–16 A. It cycles with a hysteresis (differential) of about ±10–15 °C, so the plate temperature swings around the set point – you hear the click and see the light come on and off. Contact arcing at ~10 A is why thermostat contacts eventually weld or pit; electronic irons replace this with an NTC sensor and a triac for ±3–5 °C control.',
        facts: ['The tiny bend of the bimetal strip – often well under a millimetre – is enough to switch over 2,000 W.'],
      },
    },
    // ------------------------------------------------------------ steam & water
    {
      id: 'steam-chamber',
      name: 'Steam Chamber',
      system: 'steam',
      position: [0, SOLE_TOP + 0.02, 0],
      explode: [0, 0.05, 0],
      shapes: [
        { type: 'extrude', outline: CHAMBER.pts, depth: 0.03, bevel: 0.005, rotation: LAY_FLAT, material: M.metal('#7f868f') },
        { type: 'cylinder', radius: 0.03, height: 0.03, segments: 24, position: [0.1, 0.028, 0], material: M.metal('#7f868f') },
        { type: 'box', size: [0.004, 0.006, 0.17], position: [0.03, 0.022, 0], array: { count: 5, offset: [0.06, 0, 0] }, material: M.metal('#686e76') },
      ],
      info: {
        what: 'A small sealed pocket on top of the soleplate where water drops are boiled into steam.',
        location: 'In the middle-front of the soleplate, inside the loop of the heating element, below the water tank.',
        purpose: 'Flash-boils small amounts of water so the iron produces a steady flow of steam.',
        how: 'The steam valve lets water drip from the tank onto the very hot floor of the chamber. Each drop instantly boils, expands about 1,600 times in volume, and the steam is forced out through channels to the holes in the soleplate.',
        connections: ['soleplate', 'steam-valve', 'anti-drip-valve', 'shot-pump', 'heating-element'],
        examples: 'Flash-boiling water on a hot surface is the same thing you see when you sprinkle water on a hot pan.',
        advanced: 'Part of the soleplate casting, closed by a sealed cover plate. Its floor runs at ~150–200 °C, well above 100 °C so drops vaporise in the Leidenfrost-free regime (above ~200 °C drops would skate on a vapour film and spit). Evaporating water takes ~2.26 kJ/g, so continuous steam of 40 g/min absorbs ~1.7 kW – most of the element’s power. Typical rates: 30–50 g/min continuous, 150–250 g/min shot.',
        facts: ['Steam carries much more heat than hot air at the same temperature, which is why it relaxes fibres so quickly.'],
      },
    },
    {
      id: 'anti-drip-valve',
      name: 'Anti-Drip Valve',
      system: 'steam',
      position: [0.1, 0.135, 0],
      explode: [0, 0.15, 0.2],
      shapes: [
        { type: 'cylinder', radius: 0.022, height: 0.045, segments: 24, material: M.brass() },
        { type: 'cylinder', radius: 0.028, height: 0.006, segments: 24, position: [0, -0.02, 0], material: M.metal('#9aa3ad') },
        { type: 'cylinder', radius: 0.016, height: 0.004, segments: 24, position: [0, 0.025, 0], material: M.copper() },
      ],
      info: {
        what: 'A small heat-sensitive valve that stops water leaking out when the iron is not hot enough to make steam.',
        location: 'Between the bottom of the water tank and the steam chamber, at the drip inlet.',
        purpose: 'Prevents cold water spitting out of the soleplate holes and leaving spots on clothes at low temperatures.',
        how: 'A heat-sensitive disc or spring inside closes the passage while the soleplate is cool. Once the plate is hot enough to turn every drop into steam, it opens and lets water through.',
        connections: ['steam-chamber', 'steam-valve', 'water-tank', 'soleplate'],
        examples: 'Advertised on irons as "anti-drip" or "drip-stop".',
        advanced: 'Usually a bimetal snap disc or shape-memory spring that opens at roughly 100–130 °C. Without it, selecting steam at the silk setting (~110 °C) floods the chamber faster than it can boil, and droplets carry dissolved minerals onto the fabric.',
        facts: ['Water spots on silk from an old iron are usually caused by steaming below the boiling-safe temperature.'],
      },
    },
    {
      id: 'water-tank',
      name: 'Water Tank',
      system: 'steam',
      position: [0, 0.26, 0],
      explode: [-0.15, 0.4, 0],
      shapes: [
        { type: 'extrude', outline: TANK.pts, depth: 0.1, bevel: 0.02, rotation: LAY_FLAT, material: DOUBLE({ ...M.glass('#7cc6ff'), opacity: 0.3 }) },
        { type: 'extrude', outline: WATER.pts, depth: 0.06, bevel: 0.006, rotation: LAY_FLAT, position: [0, -0.03, 0], material: { ...M.glass('#2f8ee0'), opacity: 0.45, transmission: 0.6 } },
        { type: 'cylinder', radius: 0.03, height: 0.08, segments: 24, position: [0.43, 0.06, 0], material: DOUBLE({ ...M.glass('#7cc6ff'), opacity: 0.35 }) },
        { type: 'box', size: [0.25, 0.004, 0.006], position: [0.2, 0.05, -0.155], material: M.plastic('#f2f2f2') },
      ],
      info: {
        what: 'A see-through plastic reservoir that holds the water used for steam.',
        location: 'In the front half of the body, above the steam chamber and below the handle; the "MAX" line is on its side.',
        purpose: 'Stores water and feeds it, drop by drop, to the steam chamber and the spray nozzle.',
        how: 'You pour water in through the fill cap. Gravity pulls it down to the steam valve at the bottom of the tank; when the valve is open it drips into the hot chamber. Pumps also draw from it for the spray and shot of steam.',
        connections: ['fill-cap', 'steam-valve', 'anti-drip-valve', 'anti-calc', 'shot-pump', 'spray-nozzle', 'housing'],
        examples: 'Steam generators keep a big separate tank in the base; travel irons have a tiny one.',
        advanced: 'Moulded transparent PP/SAN or polycarbonate, ~250–350 ml on a real iron, welded or sealed to the body. At 40 g/min continuous steam, 300 ml lasts only about 7–8 minutes, which is why high-output "steam generators" use a separate 1–2 L boiler. Most manufacturers recommend tap water (or 50/50 with distilled in very hard areas) – fully demineralised water can make some irons spit.',
        facts: ['The iron gets lighter as you iron – a full tank adds about 0.3 kg.'],
      },
    },
    {
      id: 'fill-cap',
      name: 'Fill Cap',
      system: 'steam',
      position: [0.43, 0.345, 0],
      explode: [0.1, 0.7, 0],
      shapes: [
        { type: 'cylinder', radius: 0.045, height: 0.02, segments: 32, material: M.plastic('#e8eaec') },
        { type: 'box', size: [0.03, 0.012, 0.05], radius: 0.004, position: [0.045, 0.002, 0], material: M.plastic('#e8eaec') },
        { type: 'cylinder', radius: 0.006, height: 0.06, rotation: [PI / 2, 0, 0], position: [-0.045, 0, 0], material: M.plastic('#c9ccd0') },
      ],
      info: {
        what: 'A hinged flap that covers the water inlet.',
        location: 'On the top front of the iron, above the front end of the water tank.',
        purpose: 'Lets you fill the tank, then seals it so water does not slosh out when the iron is tilted.',
        how: 'Flip it open with a fingertip, pour water in from a jug or the supplied cup, and snap it shut. A soft seal under the flap keeps it watertight.',
        connections: ['water-tank', 'housing'],
        examples: 'Some irons have a wide "drop-in" door instead, or a fully removable tank.',
        advanced: 'A sprung or detented flap on a moulded hinge pin, with a silicone/TPE seal. It is placed near the nose because the iron is filled standing on its heel, which makes the front the top.',
        facts: ['Irons are filled standing on their heel so the opening points upward.'],
      },
    },
    {
      id: 'steam-valve',
      name: 'Steam Valve & Needle',
      system: 'steam',
      position: [0.1, 0, 0],
      explode: [0, 1.1, 0.12],
      anim: { type: 'piston', axis: 'y', amplitude: 0.006, speed: 2, phase: 0 },
      shapes: [
        { type: 'cylinder', radius: 0.008, height: 0.56, segments: 16, position: [0, 0.47, 0], material: M.chrome() },
        { type: 'cone', radius: 0.011, height: 0.03, segments: 16, rotation: [PI, 0, 0], position: [0, 0.2, 0], material: M.chrome() },
        { type: 'cylinder', radius: 0.02, height: 0.012, segments: 24, position: [0, 0.19, 0], material: M.brass() },
        { type: 'box', size: [0.1, 0.03, 0.06], radius: 0.012, position: [0, 0.76, 0], material: M.plastic('#2a2d33') },
        { type: 'box', size: [0.02, 0.012, 0.05], radius: 0.004, position: [0, 0.778, 0], material: M.plastic('#1f8a9e') },
      ],
      info: {
        what: 'A long needle valve, worked by the slider on the handle, that controls how fast water drips into the steam chamber.',
        location: 'The slider sits on top of the handle; the needle runs straight down through the tank to a seat at its bottom.',
        purpose: 'Sets the amount of steam – from off (dry ironing) to maximum.',
        how: 'Moving the slider lifts or lowers the needle. Its pointed tip sits in a small hole (the seat) in the tank floor. Lowered, it plugs the hole – no water, no steam. Raised, it lets drops through to the hot chamber; the higher it is, the more drops and the more steam.',
        connections: ['water-tank', 'steam-chamber', 'anti-drip-valve', 'anti-calc', 'handle'],
        examples: 'Needle valves meter fuel in carburettors and gas in camping stoves the same way.',
        advanced: 'A tapered stainless needle in a ~1 mm brass or plastic orifice gives a flow roughly proportional to lift. Continuous steam rate is typically adjustable 0–50 g/min. Limescale builds up around this orifice first, which is why many irons combine it with a self-clean/anti-calc pin that scrapes the hole each time the valve is operated.',
        facts: ['"Dry ironing" just means the needle is fully closed.'],
      },
    },
    {
      id: 'anti-calc',
      name: 'Anti-Calc Cartridge',
      system: 'steam',
      position: [0.2, 0.255, -0.09],
      explode: [-0.15, 0.55, -0.3],
      shapes: [
        { type: 'cylinder', radius: 0.034, height: 0.12, segments: 24, material: { ...M.plastic('#f0f0f0'), opacity: 0.8 } },
        { type: 'cylinder', radius: 0.036, height: 0.01, segments: 24, position: [0, 0.065, 0], material: M.plastic('#d93a3a') },
        { type: 'torus', radius: 0.034, tube: 0.002, radialSegments: 4, tubularSegments: 32, rotation: [PI / 2, 0, 0], position: [0, -0.04, 0], array: { count: 5, offset: [0, 0.02, 0] }, material: M.plastic('#c6c6c6') },
      ],
      info: {
        what: 'A small removable cartridge that reduces limescale (the chalky mineral deposits from hard water).',
        location: 'Standing inside the water tank, next to the steam-valve needle.',
        purpose: 'Stops minerals clogging the steam valve, chamber and soleplate holes, keeping steam output strong for longer.',
        how: 'As water passes through, resin beads inside swap the calcium and magnesium in the water for harmless sodium or hydrogen. With fewer of those minerals, less hard white scale forms when the water boils.',
        connections: ['water-tank', 'steam-valve', 'steam-chamber'],
        examples: 'Water-filter jugs and dishwasher salt work on the same ion-exchange idea.',
        advanced: 'Ion-exchange resin (weak-acid cation) that removes Ca²⁺/Mg²⁺ hardness; capacity is limited, so cartridges are replaced periodically. Other irons use a "self-clean" function (flushing the chamber with boiling water) or a "calc-collector" chamber you empty. Scale forms because CaCO₃ is less soluble in hot water: Ca(HCO₃)₂ → CaCO₃ + CO₂ + H₂O.',
        facts: ['Brown or white flakes shooting out of an iron are limescale broken loose from the steam chamber.'],
      },
    },
    {
      id: 'shot-pump',
      name: 'Steam-Burst Pump',
      system: 'steam',
      position: [0.24, 0, 0],
      explode: [0.12, 1.05, -0.2],
      anim: { type: 'piston', axis: 'y', amplitude: 0.01, speed: 3, phase: 0 },
      shapes: [
        { type: 'cylinder', radius: 0.026, height: 0.1, segments: 24, position: [0, 0.39, 0], material: M.plastic('#e4e5e7') },
        { type: 'cylinder', radius: 0.006, height: 0.29, segments: 12, position: [0, 0.585, 0], material: M.chrome() },
        { type: 'box', size: [0.06, 0.02, 0.06], radius: 0.009, position: [0, 0.74, 0], material: M.plastic('#ff8a3d') },
        { type: 'tube', radius: 0.006, radialSegments: 8, points: [[0, 0.34, 0], [-0.02, 0.25, 0.06], [-0.06, 0.16, 0.07], [-0.09, 0.115, 0.05]], material: M.plastic('#d0d3d6') },
      ],
      info: {
        what: 'A small hand pump, worked by a button on the handle, that delivers an extra-strong burst of steam.',
        location: 'Under the front of the handle, with its button on top and a pipe running down into the steam chamber.',
        purpose: 'Gives a powerful shot of steam for stubborn creases or vertical steaming of hanging clothes.',
        how: 'Pressing the button pushes a piston that forces a large squirt of water from the tank straight into the steam chamber. The hot soleplate turns it all to steam at once and it blasts out of the holes. One-way valves stop the steam pushing back.',
        connections: ['water-tank', 'steam-chamber', 'handle', 'spray-nozzle'],
        examples: 'Advertised as "shot of steam" or "steam boost"; the same button is used to steam curtains with the iron held upright.',
        advanced: 'Piston pump with duckbill/ball check valves delivering ~1–2 ml per stroke, giving burst rates of ~150–250 g/min. A burst cools the chamber sharply (≈2.6 kJ per gram from tap water), so repeated shots need a few seconds between presses to recover temperature – otherwise water spits out.',
        facts: ['Pressing the steam-burst button repeatedly too fast is the classic way to make an iron spit water.'],
      },
    },
    {
      id: 'spray-nozzle',
      name: 'Spray Pump & Nozzle',
      system: 'steam',
      position: [0.36, 0, 0],
      explode: [0.3, 1.0, 0.15],
      shapes: [
        { type: 'cylinder', radius: 0.022, height: 0.09, segments: 24, position: [0, 0.38, 0], material: M.plastic('#e4e5e7') },
        { type: 'cylinder', radius: 0.005, height: 0.23, segments: 12, position: [0, 0.54, 0], material: M.chrome() },
        { type: 'box', size: [0.05, 0.02, 0.05], radius: 0.008, position: [0, 0.665, 0], rotation: [0, 0, -0.5], material: M.plastic('#4cc9f0') },
        { type: 'tube', radius: 0.005, radialSegments: 8, points: [[0, 0.34, 0], [0.08, 0.31, -0.03], [0.17, 0.29, -0.05], [0.22, 0.285, -0.05]], material: M.plastic('#d0d3d6') },
        { type: 'cone', radius: 0.022, height: 0.04, segments: 20, rotation: [0, 0, -PI / 2], position: [0.235, 0.285, -0.05], material: M.plastic('#2a2d33') },
      ],
      info: {
        what: 'A small pump and nozzle that sprays a fine mist of cold water onto the fabric.',
        location: 'The nozzle pokes out of the nose of the iron; its pump sits under a button at the front of the handle.',
        purpose: 'Dampens very dry or heavily creased fabric so it is easier to press flat, even when not using steam.',
        how: 'Pressing the button squeezes a little piston pump that pulls water from the tank and forces it through a tiny swirl nozzle, which breaks it into a mist of droplets.',
        connections: ['water-tank', 'shot-pump', 'handle', 'housing'],
        examples: 'Trigger spray bottles and perfume atomisers use the same kind of pump.',
        advanced: 'A swirl-chamber atomising nozzle (~0.3–0.5 mm orifice) gives a hollow-cone spray of ~100 µm droplets. Spraying is especially useful for linen and cotton, where fibres need moisture plus heat (~200 °C) to reshape: water breaks the hydrogen bonds between cellulose chains and heat sets them in their new position.',
        facts: ['Ironing works because heat and moisture let fibre molecules slide and re-bond in a flat shape.'],
      },
    },

    // ------------------------------------------------------------ controls
    {
      id: 'temperature-dial',
      name: 'Temperature Dial',
      system: 'controls',
      position: [-0.27, 0.45, 0.04],
      explode: [0, 0.6, -0.45],
      shapes: [
        { type: 'cylinder', radius: 0.07, height: 0.035, segments: 48, material: M.plastic('#2a2d33') },
        { type: 'box', size: [0.006, 0.03, 0.014], position: [0.07, 0, 0], array: { count: 24, rotation: [0, (PI * 2) / 24, 0] }, material: M.plastic('#2a2d33') },
        { type: 'box', size: [0.07, 0.006, 0.012], radius: 0.002, position: [0.03, 0.019, 0], material: M.plastic('#ffffff') },
        { type: 'cylinder', radius: 0.006, height: 0.003, segments: 12, position: [-0.04, 0.019, -0.02], array: { count: 3, offset: [0.0, 0, 0.02] }, material: M.plastic('#ff5a3a') },
      ],
      info: {
        what: 'The round knob you turn to choose how hot the iron gets, marked with dots for different fabrics.',
        location: 'On the top of the body, under the rear of the handle.',
        purpose: 'Lets you match the heat to the fabric, so delicate synthetics are not melted and cotton gets enough heat.',
        how: 'Turning the dial turns a screw on a shaft that runs down to the thermostat. This changes how far the bimetal strip must bend before it opens the contacts – a higher setting means it must bend further, so the plate gets hotter.',
        connections: ['thermostat', 'indicator-light', 'housing'],
        examples: 'Clothing care labels show the same symbol: an iron with 1, 2 or 3 dots.',
        advanced: 'Care-label (ISO 3758) settings: • max ~110 °C (acrylic, nylon, polyester), •• ~150 °C (wool, silk, polyester blends), ••• ~200 °C (cotton, linen). A cam or fine-pitch screw converts ~270° of rotation into a fraction of a millimetre of contact travel. Newer "one temperature" irons skip the dial and hold ~150–170 °C electronically with high steam.',
        facts: ['Turning from high to low takes minutes to take effect – the heavy plate must cool down by itself.'],
      },
    },
    {
      id: 'indicator-light',
      name: 'Heating Indicator Light',
      system: 'controls',
      position: [-0.43, 0.432, 0.12],
      explode: [0, 0.6, 0.35],
      shapes: [
        { type: 'sphere', radius: 0.02, widthSegments: 20, heightSegments: 12, thetaLength: PI / 2, material: M.light('#ff7a1a', 3) },
        { type: 'cylinder', radius: 0.026, height: 0.006, segments: 24, position: [0, -0.002, 0], material: M.chrome() },
      ],
      info: {
        what: 'A small orange light that shows when the element is heating.',
        location: 'On the top of the body at the rear, behind the temperature dial.',
        purpose: 'Tells you whether the iron is still warming up; when it goes out, the soleplate has reached the set temperature.',
        how: 'The light is wired across the heating element, so it glows only while the thermostat contacts are closed and current is flowing. During ironing it blinks on and off as the thermostat cycles.',
        connections: ['thermostat', 'temperature-dial', 'control-pcb'],
        examples: 'Kettles, toasters and hair straighteners use the same "heating" pilot light.',
        advanced: 'Either a neon lamp with a ~150 kΩ series resistor (≈0.2 mA) or an LED with a capacitive or resistive dropper. On irons with auto-off, a second LED (often red) or a blinking pattern shows the shut-off state.',
        facts: ['Wait for the light to go out the first time before ironing – that is when the plate first reaches temperature.'],
      },
    },
    {
      id: 'control-pcb',
      name: 'Auto Shut-off PCB & Tilt Sensor',
      system: 'controls',
      position: [-0.55, 0.26, 0],
      explode: [-0.25, 0.45, 0],
      shapes: [
        { type: 'box', size: [0.012, 0.15, 0.24], position: [0, 0, 0], material: M.plastic('#1f7a43') },
        { type: 'box', size: [0.012, 0.03, 0.04], position: [0.012, 0.03, -0.06], material: M.plastic('#15171a') },
        { type: 'box', size: [0.02, 0.04, 0.03], position: [0.016, -0.03, 0.05], material: M.plastic('#2f55c9') },
        { type: 'cylinder', radius: 0.012, height: 0.035, segments: 16, rotation: [0, 0, PI / 2], position: [0.024, 0.035, 0.05], material: M.chrome() },
        { type: 'box', size: [0.012, 0.012, 0.012], position: [0.012, -0.05, -0.08], array: { count: 3, offset: [0, 0, 0.03] }, material: M.plastic('#c9a227') },
      ],
      info: {
        what: 'A small circuit board with a motion (tilt) sensor that switches the iron off if it is left unattended.',
        location: 'Standing upright inside the rear of the body, near the heel.',
        purpose: 'Prevents fires and damage if you forget the iron is on or knock it over.',
        how: 'A tiny tilt switch (a metal ball in a tube) tells the circuit whether the iron is moving and which way up it is. If it stays still on its heel for about 8 minutes, or lies flat or on its side for about 30 seconds, a relay cuts power to the element and the light flashes. Moving the iron switches it back on.',
        connections: ['thermostat', 'indicator-light', 'internal-wiring', 'power-cord'],
        examples: 'Heaters with tip-over switches and phones that rotate the screen use the same kind of orientation sensing.',
        advanced: 'A microcontroller reads a ball tilt switch (or MEMS accelerometer) and drives a 16 A relay or triac in series with the thermostat. Timings follow common safety practice (e.g. ~8 min on heel, ~30 s horizontal). The low-voltage supply is a capacitive dropper from mains – no transformer needed for a few mA.',
        facts: ['Auto shut-off became standard after unattended irons were found to be a significant cause of household fires.'],
      },
    },
    {
      id: 'internal-wiring',
      name: 'Internal Wiring',
      system: 'controls',
      position: [0, 0, 0],
      explode: [-0.1, 0.12, 0.38],
      anim: { type: 'flow', speed: 3 },
      shapes: [
        { type: 'tube', radius: 0.007, radialSegments: 6, segments: 80,
          points: [[-0.68, 0.17, 0.02], [-0.6, 0.2, 0.06], [-0.56, 0.24, 0.08]],
          material: { ...M.wire('#8a4b20'), emissive: '#ff9d3a', emissiveIntensity: 0.3 } },
        { type: 'tube', radius: 0.007, radialSegments: 6, segments: 80,
          points: [[-0.56, 0.22, 0.1], [-0.45, 0.16, 0.11], [-0.33, 0.12, 0.08], [-0.24, 0.115, 0.05]],
          material: { ...M.wire('#8a4b20'), emissive: '#ff9d3a', emissiveIntensity: 0.3 } },
        { type: 'tube', radius: 0.007, radialSegments: 6, segments: 80,
          points: [[-0.22, 0.12, -0.04], [-0.35, 0.13, -0.08], [-0.5, 0.135, -0.075], [-0.56, 0.135, -0.07]],
          material: { ...M.wire('#f4c430'), emissive: '#ffd84a', emissiveIntensity: 0.3 } },
        { type: 'tube', radius: 0.007, radialSegments: 6, segments: 80,
          points: [[-0.68, 0.17, -0.02], [-0.6, 0.15, 0.05], [-0.56, 0.135, 0.07]],
          material: { ...M.wire('#2f55c9'), emissive: '#5c8dff', emissiveIntensity: 0.3 } },
        { type: 'tube', radius: 0.006, radialSegments: 6, segments: 60,
          points: [[-0.42, 0.08, 0.11], [-0.38, 0.11, 0.1], [-0.33, 0.125, 0.085]],
          material: { ...M.wire('#d9d9d9'), emissive: '#ffffff', emissiveIntensity: 0.15 } },
      ],
      info: {
        what: 'Heat-resistant wires that link the power cord, electronics, thermostat, fuse and heating element.',
        location: 'Inside the rear of the body, between the cord entry at the heel and the element terminals.',
        purpose: 'Carry up to ~10 A safely in a very hot environment.',
        how: 'Live comes in from the cord, passes through the shut-off relay on the circuit board, then the thermostat and the thermal fuse, and into one end of the element; the other end of the element returns to neutral. Every safety device is in series, so any one of them can stop the current.',
        connections: ['power-cord', 'control-pcb', 'thermostat', 'thermal-fuse', 'heating-element'],
        examples: 'Ovens and kettles use similar silicone- or glass-fibre-insulated wire near hot parts.',
        advanced: 'Silicone-rubber or PTFE/fibreglass insulated wire rated 180–250 °C, 1.0–1.5 mm², connected with crimped or welded terminals (solder would melt near the element). The earth wire is bonded to the soleplate on Class I irons.',
        facts: ['Ordinary PVC wire softens at about 70–105 °C – far too low for inside an iron.'],
      },
    },

    // ------------------------------------------------------------ body
    {
      id: 'housing',
      name: 'Outer Housing',
      system: 'body',
      position: [0, 0, 0],
      explode: [0, 0.6, 0],
      ghost: true,
      shapes: [
        { type: 'extrude', outline: SHELL[0].pts, depth: 0.1, bevel: 0.02, rotation: LAY_FLAT, position: [0, 0.13, 0], material: shell(0.2) },
        { type: 'extrude', outline: SHELL[1].pts, depth: 0.08, bevel: 0.02, rotation: LAY_FLAT, position: [0, 0.26, 0], material: shell(0.2) },
        { type: 'extrude', outline: SHELL[2].pts, depth: 0.06, bevel: 0.02, rotation: LAY_FLAT, position: [0, 0.37, 0], material: shell(0.2) },
        { type: 'box', size: [0.42, 0.012, 0.012], radius: 0.005, position: [-0.41, 0.07, 0.302], array: { count: 2, offset: [0, 0, -0.604] }, material: { ...M.chrome(), opacity: 0.6 } },
      ],
      info: {
        what: 'The plastic shell that forms the body of the iron (shown see-through).',
        location: 'Surrounding everything above the soleplate, from the pointed nose to the flat heel.',
        purpose: 'Insulates you from hot and electrical parts, holds all the components in place and gives the iron its shape.',
        how: 'It is moulded in several pieces that clip and screw together over the tank, pumps and electronics. A gap and heat shield between the shell and the soleplate keep the plastic from getting too hot to touch.',
        connections: ['soleplate', 'handle', 'water-tank', 'heel-rest', 'temperature-dial', 'fill-cap', 'spray-nozzle'],
        examples: 'Many irons use a transparent front shell so you can see the water level.',
        advanced: 'Heat-resistant thermoplastics such as PBT-GF or PP-talc near the soleplate (≥150 °C service), with ABS/PC for upper trim. IEC 60335-2-3 limits the temperature of handles and surfaces you grip. The shell is fixed to the soleplate through insulating stand-offs; the lower edge often has a chrome or metal "skirt" trim.',
        facts: ['The cool plastic shell can sit just a few centimetres from a 200 °C plate.'],
      },
    },
    {
      id: 'handle',
      name: 'Handle',
      system: 'body',
      position: [0, 0, 0],
      explode: [0, 0.85, 0],
      shapes: [
        { type: 'tube', radius: 0.055, radialSegments: 16, segments: 90, scale: [1, 1, 0.8],
          points: [[-0.53, 0.38, 0], [-0.49, 0.56, 0], [-0.36, 0.68, 0], [-0.1, 0.71, 0], [0.18, 0.69, 0], [0.36, 0.6, 0], [0.47, 0.43, 0], [0.5, 0.36, 0]],
          material: M.plastic('#eef0f2') },
        { type: 'box', size: [0.4, 0.02, 0.07], radius: 0.009, position: [-0.12, 0.66, 0], material: M.rubber() },
      ],
      info: {
        what: 'The loop you hold to guide the iron, with the steam and spray controls under your thumb.',
        location: 'On top of the body, arching from the heel to just behind the nose.',
        purpose: 'Gives a comfortable, cool, insulated grip and puts the buttons within reach.',
        how: 'The handle is high above the hot soleplate and made from plastic that conducts heat poorly, so it stays cool. A soft-touch insert stops your hand slipping. The steam slider and the spray and burst buttons sit on top at the front.',
        connections: ['housing', 'steam-valve', 'shot-pump', 'spray-nozzle', 'temperature-dial'],
        examples: 'Cordless irons have a similar handle but lift off a hot charging base between strokes.',
        advanced: 'Ergonomics: the grip is ~30–35 mm thick (real size), angled so the wrist stays neutral while pushing. Safety standards limit handle temperature rise to about 35–40 K above room temperature during normal use.',
        facts: ['A typical iron weighs 1–1.6 kg – heavy enough to press, light enough not to tire your wrist.'],
      },
    },
    {
      id: 'heel-rest',
      name: 'Heel Rest',
      system: 'body',
      position: [-0.695, 0.25, 0],
      explode: [-0.35, 0, 0],
      shapes: [
        { type: 'box', size: [0.04, 0.38, 0.5], radius: 0.03, material: M.plastic('#2a2d33') },
        { type: 'box', size: [0.012, 0.04, 0.08], radius: 0.006, position: [-0.024, -0.15, -0.17], array: { count: 2, offset: [0, 0, 0.34] }, material: M.rubber() },
        { type: 'box', size: [0.012, 0.04, 0.08], radius: 0.006, position: [-0.024, 0.15, -0.17], array: { count: 2, offset: [0, 0, 0.34] }, material: M.rubber() },
      ],
      info: {
        what: 'The flat back end of the iron that it stands on when you are not ironing.',
        location: 'The rear face of the body, at the heel.',
        purpose: 'Lets you park the hot iron upright so the soleplate does not scorch the board or the clothes.',
        how: 'The iron is balanced so its centre of gravity sits above this wide, flat face. Rubber pads stop it sliding and keep heat from the body away from the ironing board.',
        connections: ['housing', 'power-cord', 'control-pcb'],
        examples: 'Steam generators and cordless irons use a separate base or rest instead.',
        advanced: 'Moulded heat-resistant plastic with TPE feet. Stability is tested by tilting the board; the rest must keep the iron upright with a full tank. The auto-off circuit uses this orientation (iron on its heel) to choose the longer ~8-minute timer.',
        facts: ['Always rest an iron on its heel – laying it flat even for a minute can scorch fabric at the cotton setting.'],
      },
    },
    {
      id: 'power-cord',
      name: 'Power Cord & Strain Relief',
      system: 'body',
      position: [0, 0, 0],
      explode: [-0.55, 0, 0],
      shapes: [
        { type: 'sphere', radius: 0.055, widthSegments: 24, heightSegments: 16, position: [-0.72, 0.17, 0], material: M.plastic('#2a2d33') },
        { type: 'cylinder', radiusTop: 0.045, radiusBottom: 0.032, height: 0.16, segments: 20, rotation: [0, 0, -PI / 2 - 0.25], position: [-0.83, 0.2, 0], material: M.plastic('#3b3f46') },
        { type: 'torus', radius: 0.039, tube: 0.006, radialSegments: 6, tubularSegments: 24, rotation: [PI / 2, 1.318, 0], position: [-0.785, 0.188, 0], array: { count: 4, offset: [-0.029, 0.0075, 0] }, material: M.plastic('#2a2d33') },
        { type: 'tube', radius: 0.028, radialSegments: 10, segments: 120,
          points: [[-0.9, 0.22, 0], [-1.02, 0.22, 0.03], [-1.12, 0.14, 0.1], [-1.2, 0.05, 0.2], [-1.28, 0.03, 0.34], [-1.32, 0.03, 0.5]],
          material: M.rubber() },
      ],
      info: {
        what: 'The flexible mains cable, with a swivel joint and a springy sleeve where it enters the iron.',
        location: 'Coming out of the heel at the back of the iron.',
        purpose: 'Brings mains electricity in, while surviving thousands of back-and-forth ironing strokes without breaking.',
        how: 'The ball-shaped swivel lets the cord turn left or right as you iron. The tapered rubber sleeve (strain relief) spreads the bending over a longer length so the copper strands inside do not crack at the entry point. A clamp inside means tugging the cord does not pull on the connections.',
        connections: ['internal-wiring', 'heel-rest', 'control-pcb'],
        examples: 'Phone chargers, hair dryers and laptop chargers all use a similar strain relief.',
        advanced: 'Typically 3-core 1.0 mm² (Europe) or 18/16 AWG (US) cord with a braided textile or rubber (H05RN-F/H05VV-F) jacket, 1.8–3 m long, rated for the ~10 A load. Flex-testing standards bend the cord ~10,000–20,000 times at the entry. 360° swivel joints reduce kinking; cordless irons avoid the cable entirely using a heated charging base.',
        facts: ['Most cord failures happen within a few centimetres of where it enters the appliance – exactly where the strain relief is.'],
      },
    },
  ],

  steps: [
    {
      title: '1 · Heating up',
      text: 'Plug in and turn the dial. Current flows through the cord, the shut-off relay, the closed thermostat contacts and the thermal fuse into the heating element. Its nickel-chrome wire resists the current and gets red hot (P = V²/R ≈ 2,200 W), and heat soaks into the aluminium soleplate. The orange light shows it is heating.',
      focus: ['power-cord', 'internal-wiring', 'heating-element', 'soleplate', 'indicator-light'],
      explode: 0.25,
      animate: true,
    },
    {
      title: '2 · Holding temperature',
      text: 'As the soleplate approaches the setting, the bimetal strip in the thermostat bends until it snaps the contacts apart – click, the light goes out. When the plate cools 10–15 °C, the strip relaxes and the contacts close again. The dial sets the point at which this happens.',
      focus: ['thermostat', 'temperature-dial', 'indicator-light', 'soleplate'],
      explode: 0.4,
      animate: true,
    },
    {
      title: '3 · Making steam',
      text: 'With the steam slider open, the needle lifts off its seat and water drips from the tank, through the anti-drip valve, onto the hot floor of the steam chamber. Each drop flash-boils, swelling about 1,600 times, and the steam is pushed out through the soleplate holes into the fabric.',
      focus: ['water-tank', 'steam-valve', 'anti-drip-valve', 'steam-chamber', 'soleplate', 'anti-calc'],
      explode: 0.45,
      animate: true,
    },
    {
      title: '4 · Steam burst & spray',
      text: 'For stubborn creases, the burst button pumps a big squirt of water straight into the chamber, which turns into a powerful shot of steam. The spray button instead sends a fine mist of cold water out of the nose to dampen dry fabric.',
      focus: ['shot-pump', 'spray-nozzle', 'water-tank', 'steam-chamber', 'handle'],
      explode: 0.45,
      animate: true,
    },
    {
      title: '5 · Safety shut-off',
      text: 'The circuit board watches a tilt sensor. Left still on its heel for about 8 minutes, or flat or tipped over for about 30 seconds, the iron switches its element off. If the thermostat ever fails and the plate overheats, the thermal fuse melts open and disconnects the power for good.',
      focus: ['control-pcb', 'thermal-fuse', 'thermostat', 'heel-rest', 'indicator-light'],
      explode: 0.4,
      animate: true,
    },
    {
      title: '6 · The body',
      text: 'A heat-resistant plastic shell holds it all together and keeps the hot parts away from your hand. The high, insulated handle stays cool, the heel lets the iron stand safely between strokes, and the swivel cord follows your arm.',
      focus: ['housing', 'handle', 'heel-rest', 'power-cord', 'fill-cap'],
      explode: 0.2,
      animate: false,
    },
  ],
};
