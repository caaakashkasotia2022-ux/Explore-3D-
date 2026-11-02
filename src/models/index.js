// Registry of built-in models. Model data is code-split: each loads on demand.
const files = import.meta.glob(['./*.js', '!./index.js']);
const lazy = (file) => () => (files[file] ? files[file]() : Promise.reject(new Error('This model is not available yet.')));

export const MODELS = {
  human: { id: 'human', name: 'Human Body', category: 'human', load: lazy('./human.js') },
  car: { id: 'car', name: 'Sports Coupe', category: 'cars', load: lazy('./car.js') },
  engine: { id: 'engine', name: 'Inline-4 Engine', category: 'cars', load: lazy('./engine.js') },
  motorcycle: { id: 'motorcycle', name: 'Sport Motorcycle', category: 'motorcycles', load: lazy('./motorcycle.js') },
  building: { id: 'building', name: 'Modern Office Building', category: 'buildings', load: lazy('./building.js') },
  bridge: { id: 'bridge', name: 'Cable-Stayed Bridge', category: 'buildings', load: lazy('./bridge.js') },
  road: { id: 'road', name: 'Road Construction', category: 'buildings', load: lazy('./road.js') },
  phone: { id: 'phone', name: 'Smartphone', category: 'appliances', load: lazy('./phone.js') },
  charger: { id: 'charger', name: 'USB-C Charger', category: 'appliances', load: lazy('./charger.js') },
  printer: { id: 'printer', name: 'Inkjet Printer', category: 'appliances', load: lazy('./printer.js') },
  tv: { id: 'tv', name: 'LED Television', category: 'appliances', load: lazy('./tv.js') },
  ac: { id: 'ac', name: 'Split Air Conditioner', category: 'appliances', load: lazy('./ac.js') },
  fridge: { id: 'fridge', name: 'Refrigerator', category: 'appliances', load: lazy('./fridge.js') },
  fan: { id: 'fan', name: 'Ceiling Fan', category: 'appliances', load: lazy('./fan.js') },
  iron: { id: 'iron', name: 'Steam Iron', category: 'appliances', load: lazy('./iron.js') },
};

export const CATEGORIES = [
  {
    id: 'human',
    path: '/human-body',
    name: 'Human Body',
    blurb: 'Skeleton, muscles, organs, nerves and vessels — layer by layer.',
    models: ['human'],
    accent: '#ff4d8d',
    icon: 'body',
  },
  {
    id: 'cars',
    path: '/cars',
    name: 'Cars',
    blurb: 'Engine, transmission, suspension, brakes and electrics, exploded.',
    models: ['car', 'engine'],
    accent: '#4cc9f0',
    icon: 'car',
  },
  {
    id: 'motorcycles',
    path: '/motorcycles',
    name: 'Motorcycles',
    blurb: 'Engine, gearbox, clutch, chain drive, forks and brakes.',
    models: ['motorcycle'],
    accent: '#ffb547',
    icon: 'bike',
  },
  {
    id: 'buildings',
    path: '/buildings',
    name: 'Buildings & Infrastructure',
    blurb: 'Buildings floor by floor, a cable-stayed bridge and a road cut open layer by layer.',
    models: ['building', 'bridge', 'road'],
    accent: '#3ddc97',
    icon: 'building',
  },
  {
    id: 'appliances',
    path: '/appliances',
    name: 'Appliances & Electronics',
    blurb: 'Phone, charger, printer, TV, AC, fridge, fan and iron — opened up.',
    models: ['phone', 'charger', 'printer', 'tv', 'ac', 'fridge', 'fan', 'iron'],
    accent: '#7b5cff',
    icon: 'plug',
  },
];

const loaded = new Map();
export async function loadModel(id) {
  if (loaded.has(id)) return loaded.get(id);
  const entry = MODELS[id];
  if (!entry) throw new Error(`Unknown model "${id}"`);
  const mod = await entry.load();
  const model = prepareModel(mod.default);
  loaded.set(id, model);
  return model;
}

/** Fills defaults and builds lookup tables used by the viewer. */
export function prepareModel(model) {
  const systems = model.systems || [];
  const sysById = Object.fromEntries(systems.map((s) => [s.id, s]));
  const partById = {};
  for (const p of model.parts) {
    p.position = p.position || [0, 0, 0];
    p.explode = p.explode || [0, 0, 0];
    p.info = p.info || {};
    partById[p.id] = p;
  }
  return { explodeScale: 1, steps: [], ...model, sysById, partById };
}
