import * as THREE from 'three';

/** Shared clipping plane for the section / cutaway view (updated by <SectionController/>). */
export const sectionPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
export const CLIP_PLANES = [sectionPlane];

const DEFAULT = { color: '#9aa3ad', metalness: 0.2, roughness: 0.5 };

export function makeMaterial(spec = DEFAULT, { ghost = false, fallbackColor } = {}) {
  const s = { ...DEFAULT, ...(fallbackColor && !spec.color ? { color: fallbackColor } : {}), ...spec };
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(s.color),
    metalness: s.metalness ?? 0,
    roughness: s.roughness ?? 0.5,
    clearcoat: s.clearcoat ?? 0,
    clearcoatRoughness: s.clearcoatRoughness ?? 0.1,
    sheen: s.sheen ?? 0,
    sheenColor: new THREE.Color(s.color).lerp(new THREE.Color('#ffffff'), 0.5),
    emissive: new THREE.Color(s.emissive || '#000000'),
    emissiveIntensity: s.emissiveIntensity ?? 1,
    map: s.map || null,
    side: s.side === 'double' || s.map ? THREE.DoubleSide : THREE.FrontSide,
    envMapIntensity: s.transmission ? 1.6 : 1,
  });
  if (s.map) m.map.colorSpace = THREE.SRGBColorSpace;
  let base = s.opacity ?? 1;
  if (ghost) base = Math.min(base, s.opacity ? s.opacity : 0.18);
  m.opacity = base;
  m.transparent = base < 0.99;
  m.depthWrite = base > 0.6;
  m.userData.baseOpacity = base;
  m.userData.baseEmissive = m.emissive.clone();
  m.userData.baseEmissiveIntensity = m.emissiveIntensity;
  m.userData.clipped = false;
  return m;
}

/** Fresnel rim shader used for the glowing highlight around selected / hovered parts. */
export function makeGlowMaterial(color = '#4cc9f0') {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      #include <clipping_planes_pars_vertex>
      void main() {
        vec3 p = position + normal * 0.004;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mvPosition.xyz);
        vW = (modelMatrix * vec4(p, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float scan = 0.5 + 0.5 * sin(vW.y * 40.0 - uTime * 4.0);
        float a = (f * 0.95 + 0.12 + scan * 0.08) * uIntensity;
        gl_FragColor = vec4(uColor * (1.2 + f), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}
