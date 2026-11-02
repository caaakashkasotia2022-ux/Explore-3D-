# Model definition schema

Every explorable object is a plain JS module in `src/models/` that default-exports a
model definition. The viewer (`src/components/viewer/`) renders it, animates exploded
views, handles selection, and feeds the explanation panel. No GLB file is needed for
built-in models, but `gltf`-based models are supported too (see `src/lib/gltfModel.js`).

Units: metres. Y is up. Ground is y = 0 (the model should sit on / above it).
Vehicles face **+X** (front of the car points to +X), left side is +Z.

```js
import { M } from '../three/materials.js';

export default {
  id: 'car',                         // url id: /explore/car
  name: 'Sports Coupe',
  category: 'cars',                  // human | cars | motorcycles | buildings
  tagline: 'One-line hook',
  description: 'Two or three sentences shown above the viewer.',
  camera: { position: [6, 3, 7], target: [0, 0.7, 0] },
  explodeScale: 1,                   // global multiplier on every part's explode vector
  systems: [                         // groups shown in the component list (order = display order)
    { id: 'engine', name: 'Engine', color: '#ff7a45' },
  ],
  parts: [
    {
      id: 'engine-block',            // unique, kebab-case
      name: 'Engine Block',
      system: 'engine',              // must match a systems[].id
      position: [1.2, 0.6, 0],       // part origin (the group); shapes are relative to it
      explode: [0, 1.2, 0],          // offset (metres) at 100% exploded view
      shapes: [
        { type: 'box', size: [0.6, 0.45, 0.5], radius: 0.03, material: M.castIron() },
        { type: 'cylinder', radius: 0.07, height: 0.1, position: [0, 0.26, -0.15],
          array: { count: 4, offset: [0, 0, 0.1] }, material: M.metal() },
      ],
      anim: { type: 'piston', axis: 'y', amplitude: 0.05, speed: 6, phase: 0 }, // optional, see below
      hiddenByDefault: false,        // optional
      ghost: false,                  // optional – rendered semi-transparent by default (e.g. skin, car shell)
      floor: 2, stage: 3,            // optional – buildings: floor index & construction stage
      info: {
        what: 'Beginner: what it is (1–2 sentences).',
        location: 'Where it sits in the object.',
        purpose: 'What it is for.',
        how: 'How it works, step by step, simple language.',
        connections: ['crankshaft', 'cylinder-head'], // part ids (rendered as links) or plain strings
        examples: 'Everyday examples / practical applications.',
        advanced: 'Technical explanation for the Advanced toggle (materials, numbers, physics).',
        facts: ['Optional short fun/key facts'],
      },
    },
  ],
  steps: [                           // "How it works" guided, step-by-step animation
    { title: 'Intake', text: 'Plain-language step text.', focus: ['intake-manifold'], explode: 0, animate: true },
  ],
};
```

## Optional model-level fields
- `floors: [{ id: 0, name: 'Foundation' }, { id: 1, name: 'Ground floor' }, ...]` – enables the
  floor-by-floor slider; parts with `floor` above the slider value are hidden.
- `stages: [{ id: 1, name: 'Excavation & piles', text: '...' }, ...]` – enables the
  construction-sequence animation; parts appear (grow from the ground) in `stage` order.
- `layers: [{ id: 'skin', name: 'Skin', systems: ['integumentary'] }, ...]` – quick layer
  presets (human body: Skin / Muscles / Skeleton / Organs / Nerves / Vessels).

## Shapes
See the doc-comment at the top of `src/three/geometry.js` for all shape types and params.
Every shape may also take `position`, `rotation` (radians), `scale`, `material` and `array`.

## Animations (`anim`)
| type      | params                                         | effect |
|-----------|------------------------------------------------|--------|
| `spin`    | `axis` ('x'/'y'/'z'), `speed` (rad/s)          | continuous rotation (wheels, fans, crankshaft) |
| `piston`  | `axis`, `amplitude`, `speed`, `phase` (rad)    | sinusoidal back-and-forth translation |
| `pulse`   | `amount` (0.05 = ±5 %), `speed` (Hz)            | heartbeat-like scaling |
| `breathe` | `amount`, `speed`                               | slow, smooth scale (lungs) |
| `rock`    | `axis`, `amplitude` (rad), `speed`, `phase`    | oscillating rotation (rocker arms, pedals, suspension arms) |
| `flow`    | `speed`                                        | emissive shimmer (nerves, electricity, fluid) |

Animations play when the viewer's "Animate" is on, scaled by the Animation Speed slider.

## Validation
`node scripts/validate-models.mjs` checks ids, systems, info fields, connection ids and
builds every geometry. Run it after editing a model.
