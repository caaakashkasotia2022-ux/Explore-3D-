import * as THREE from 'three';
import { prepareModel } from '../models/index.js';

/** Load an image URL / data URL into an HTMLImageElement. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image. It may be corrupted or in an unsupported format.'));
    img.src = src;
  });
}

/** Downscale (and re-encode) large images before upload so analysis is fast and under API limits. */
export async function prepareForUpload(file, maxSide = 2048) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 4.5 * 1024 * 1024) return { blob: file, width: img.naturalWidth, height: img.naturalHeight };
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    return { blob, width: c.width, height: c.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read the image.'));
    r.readAsDataURL(blob);
  });
}

/** Small JPEG data URL of an image, for keeping it inside a browser-saved project. */
export function imageToDataURL(img, maxSide = 1024) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

/** Offline, client-side image statistics: used when AI analysis is unavailable. */
export function imageStats(img) {
  const W = 160;
  const H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  let lum = 0;
  let edges = 0;
  const buckets = new Map();
  const L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    L[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    lum += L[i];
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    const gx = L[i + 1] - L[i - 1];
    const gy = L[i + W] - L[i - W];
    if (Math.hypot(gx, gy) > 0.12) edges++;
  }
  const palette = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => ({
    color: `rgb(${((k >> 6) & 7) * 36 + 18}, ${((k >> 3) & 7) * 36 + 18}, ${(k & 7) * 36 + 18})`,
    share: n / (W * H),
  }));
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    brightness: lum / (W * H),
    detail: edges / (W * H),
    palette,
  };
}

/** Sample a blurred luminance height field from a region of the image. */
function heightField(img, region, cols, rows) {
  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const ctx = c.getContext('2d');
  ctx.filter = 'blur(1.5px)';
  const sx = region.x * img.naturalWidth;
  const sy = region.y * img.naturalHeight;
  const sw = Math.max(1, region.w * img.naturalWidth);
  const sh = Math.max(1, region.h * img.naturalHeight);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
  const d = ctx.getImageData(0, 0, cols, rows).data;
  const h = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) h[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  return h;
}

/**
 * Relief geometry for a normalised image region: a plane whose vertices are pushed
 * forward by brightness (a crude depth cue) and domed towards the centre, with UVs
 * mapped back onto the original photo.
 */
function reliefGeometry(img, region, size, depth, dome) {
  const aspect = (region.w * img.naturalWidth) / (region.h * img.naturalHeight);
  const w = aspect >= 1 ? size : size * aspect;
  const h = aspect >= 1 ? size / aspect : size;
  const cols = Math.max(8, Math.round(110 * Math.sqrt(region.w)));
  const rows = Math.max(8, Math.round(cols / aspect));
  const geo = new THREE.PlaneGeometry(w, h, cols - 1, rows - 1);
  const hf = heightField(img, region, cols, rows);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const gx = Math.round(u * (cols - 1));
    const gy = Math.round((1 - v) * (rows - 1));
    const lum = hf[gy * cols + gx];
    const cx = u - 0.5;
    const cy = v - 0.5;
    const bulge = Math.max(0, 1 - (cx * cx + cy * cy) * 3.2);
    pos.setZ(i, lum * depth + bulge * dome);
    uv.setXY(i, region.x + u * region.w, 1 - (region.y + (1 - v) * region.h));
  }
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

/**
 * Builds an explorable, *estimated* 2.5D model from an image + (optional) AI analysis.
 * Each detected object and component becomes a selectable layer that "explodes" forward.
 */
export function buildImageModel(img, analysis, { id = 'upload', name } = {}) {
  const texture = new THREE.Texture(img);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  const mat = (opacity = 1) => ({ color: '#ffffff', roughness: 0.75, metalness: 0, map: texture, opacity });

  const SIZE = 3;
  const aspect = img.naturalWidth / img.naturalHeight;
  const W = aspect >= 1 ? SIZE : SIZE * aspect;
  const H = aspect >= 1 ? SIZE / aspect : SIZE;
  const toWorld = (b) => [(b.x + b.w / 2 - 0.5) * W, H / 2 - (b.y + b.h / 2 - 0.5) * H + H / 2 + 0.1, 0];

  const parts = [{
    id: 'scene',
    name: 'Full image (backdrop)',
    system: 'scene',
    position: [0, H / 2 + 0.1, 0],
    explode: [0, 0, -0.6],
    shapes: [{ type: 'custom', geometry: reliefGeometry(img, { x: 0, y: 0, w: 1, h: 1 }, SIZE, 0.12, 0), material: mat(1) }],
    info: {
      what: analysis?.summary || 'Your uploaded image, turned into a shallow relief surface.',
      location: 'The whole picture, at the back of the scene.',
      purpose: 'Gives context: every detected object is lifted out of this backdrop as its own layer.',
      how: 'Brightness is used as a rough depth cue to push the surface forward. Real depth cannot be measured from a single photo, so this is only an approximation.',
      connections: (analysis?.objects || []).map((_, i) => `obj-${i}`),
      examples: 'Similar “2.5D” techniques are used for parallax photos and bas-relief carvings.',
      advanced: 'Monocular depth is ill-posed: a single view does not constrain hidden surfaces or absolute scale. Production systems use learned depth estimators or multi-view photogrammetry / NeRF / Gaussian splatting for true 3D reconstruction.',
    },
  }];

  const objects = analysis?.objects || [];
  objects.forEach((o, i) => {
    const [x, y] = toWorld(o.bbox);
    const objSize = Math.max(o.bbox.w * W, o.bbox.h * H);
    const angle = objects.length > 1 ? (i / (objects.length - 1) - 0.5) * 1.2 : 0;
    parts.push({
      id: `obj-${i}`,
      name: o.name,
      system: 'objects',
      position: [x, y, 0.06],
      explode: [Math.sin(angle) * 0.6, 0.15, 0.9],
      shapes: [{ type: 'custom', geometry: reliefGeometry(img, o.bbox, objSize, 0.16, objSize * 0.08), material: mat(1) }],
      info: {
        what: o.description,
        location: describeLocation(o.bbox),
        purpose: `Detected as “${o.category.replace('_', ' ')}” with ${Math.round(o.confidence * 100)}% confidence.`,
        how: o.components?.length ? `Made up of ${o.components.length} identified components: ${o.components.map((c) => c.name).join(', ')}. Select them to learn more.` : 'No sub-components were identified.',
        connections: (o.components || []).map((_, j) => `obj-${i}-c${j}`),
        examples: analysis?.match_reason || 'See the matched library model for a full 3D version.',
        advanced: 'This layer is a crop of your photo with brightness-based relief. Its outline is a bounding rectangle estimated by the AI, not a precise segmentation mask.',
      },
    });
    (o.components || []).forEach((c, j) => {
      const [cx, cy] = toWorld(c.bbox);
      const cSize = Math.max(c.bbox.w * W, c.bbox.h * H, 0.12);
      const dx = cx - x;
      const dy = cy - y;
      parts.push({
        id: `obj-${i}-c${j}`,
        name: c.name,
        system: 'components',
        position: [cx, cy, 0.14 + j * 0.004],
        explode: [Math.sin(angle) * 0.6 + dx * 0.9, 0.15 + dy * 0.9, 1.6 + (j % 3) * 0.25],
        shapes: [{ type: 'custom', geometry: reliefGeometry(img, c.bbox, cSize, 0.08, cSize * 0.12), material: mat(c.visible ? 1 : 0.55) }],
        info: {
          what: c.what,
          location: `${c.visible ? 'Visible' : 'Not directly visible (estimated position)'} – ${describeLocation(c.bbox)} of the image, part of the ${o.name}.`,
          purpose: c.purpose,
          how: c.how,
          connections: [`obj-${i}`, ...(o.components || []).filter((_, k) => k !== j).slice(0, 4).map((_, k) => `obj-${i}-c${k >= j ? k + 1 : k}`)],
          examples: `Found in ${o.name.toLowerCase()}s and similar ${o.category.replace('_', ' ')} designs.`,
          advanced: 'Description generated by AI vision from the photo. Verify safety-critical details against a technical reference.',
        },
      });
    });
  });

  return prepareModel({
    id,
    name: name || analysis?.title || 'Your image',
    category: 'upload',
    estimated: true,
    tagline: 'Estimated 2.5D reconstruction from a single image',
    description: analysis?.summary || 'An approximate relief model generated from your image.',
    camera: { position: [0, H / 2 + 0.4, 4.6], target: [0, H / 2 + 0.1, 0.3] },
    systems: [
      { id: 'scene', name: 'Scene', color: '#8a94b0' },
      { id: 'objects', name: 'Detected objects', color: '#4cc9f0' },
      { id: 'components', name: 'Components', color: '#ff4d8d' },
    ],
    parts,
    steps: objects.length
      ? objects.slice(0, 4).map((o, i) => ({
          title: o.name,
          text: o.description,
          focus: [`obj-${i}`, ...(o.components || []).map((_, j) => `obj-${i}-c${j}`)],
          explode: 0.8,
        }))
      : [],
  });
}

function describeLocation(b) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const v = cy < 0.33 ? 'top' : cy > 0.66 ? 'bottom' : 'middle';
  const h = cx < 0.33 ? 'left' : cx > 0.66 ? 'right' : 'centre';
  return v === 'middle' && h === 'centre' ? 'In the centre' : `In the ${v}-${h}`;
}
