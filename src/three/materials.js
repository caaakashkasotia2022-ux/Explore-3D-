/**
 * Material presets. Each returns a plain object consumed by <Part/> to build a
 * MeshPhysicalMaterial. Keys: color, metalness, roughness, clearcoat,
 * clearcoatRoughness, transmission, thickness, ior, opacity, emissive,
 * emissiveIntensity, sheen, side ('double').
 */
export const M = {
  paint: (color = '#c1121f') => ({ color, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }),
  metal: (color = '#9aa3ad') => ({ color, metalness: 0.9, roughness: 0.32 }),
  brushed: (color = '#b8bec6') => ({ color, metalness: 0.85, roughness: 0.45 }),
  chrome: () => ({ color: '#e8edf2', metalness: 1, roughness: 0.08 }),
  castIron: () => ({ color: '#5b5f66', metalness: 0.7, roughness: 0.6 }),
  aluminium: () => ({ color: '#c9ced4', metalness: 0.8, roughness: 0.35 }),
  copper: () => ({ color: '#c87533', metalness: 0.95, roughness: 0.3 }),
  brass: () => ({ color: '#c9a227', metalness: 0.9, roughness: 0.3 }),
  rubber: () => ({ color: '#1b1c1f', metalness: 0, roughness: 0.92 }),
  plastic: (color = '#2a2d33') => ({ color, metalness: 0.05, roughness: 0.5, clearcoat: 0.3 }),
  leather: (color = '#2b1d16') => ({ color, metalness: 0, roughness: 0.65, sheen: 0.5 }),
  glass: (color = '#9fd3ff') => ({ color, metalness: 0, roughness: 0.04, transmission: 0.92, thickness: 0.05, ior: 1.5, opacity: 0.35 }),
  light: (color = '#fff6d8', intensity = 2.5) => ({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.2 }),

  // Anatomy
  skin: () => ({ color: '#e8b89a', metalness: 0, roughness: 0.55, opacity: 0.16, sheen: 0.6, transmission: 0.2 }),
  bone: () => ({ color: '#ece3cf', metalness: 0, roughness: 0.55, clearcoat: 0.15 }),
  muscle: (color = '#b3343a') => ({ color, metalness: 0, roughness: 0.48, clearcoat: 0.45, clearcoatRoughness: 0.35, sheen: 0.4 }),
  organ: (color = '#c0392b') => ({ color, metalness: 0, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
  nerve: (color = '#f5d76e') => ({ color, metalness: 0, roughness: 0.4, emissive: color, emissiveIntensity: 0.25 }),
  artery: () => ({ color: '#d0202f', metalness: 0, roughness: 0.35, clearcoat: 0.6 }),
  vein: () => ({ color: '#2f55c9', metalness: 0, roughness: 0.35, clearcoat: 0.6 }),

  // Building
  concrete: (color = '#a7a9ac') => ({ color, metalness: 0, roughness: 0.92 }),
  rebar: () => ({ color: '#7b4b2a', metalness: 0.7, roughness: 0.6 }),
  steel: (color = '#6f7885') => ({ color, metalness: 0.75, roughness: 0.4 }),
  brick: (color = '#a4543a') => ({ color, metalness: 0, roughness: 0.85 }),
  plaster: (color = '#ebe7df') => ({ color, metalness: 0, roughness: 0.8 }),
  wood: (color = '#9b6b43') => ({ color, metalness: 0, roughness: 0.7 }),
  soil: () => ({ color: '#6b4f35', metalness: 0, roughness: 1 }),
  pipeHot: () => ({ color: '#d64545', metalness: 0.3, roughness: 0.4 }),
  pipeCold: () => ({ color: '#3a7bd5', metalness: 0.3, roughness: 0.4 }),
  wire: (color = '#f4c430') => ({ color, metalness: 0.2, roughness: 0.45 }),
};
