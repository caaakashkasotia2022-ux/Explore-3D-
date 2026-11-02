import { api } from './api.js';
import { useApp } from '../store/appStore.js';
import { useViewer } from '../store/viewerStore.js';

const KEY = 'e3d-projects';
const readLocal = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const writeLocal = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); }
  catch { throw new Error('Browser storage is full or unavailable — sign in to save projects to your account.'); }
};

/** Small JPEG of the current canvas for the project card. */
export function captureThumbnail(maxW = 480) {
  const canvas = document.querySelector('.stage canvas');
  if (!canvas) return null;
  try {
    const s = maxW / canvas.width;
    const c = document.createElement('canvas');
    c.width = maxW;
    c.height = Math.round(canvas.height * s);
    c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.75);
  } catch {
    return null;
  }
}

const signedIn = () => !!useApp.getState().token;

export async function listProjects() {
  if (signedIn()) {
    const { projects } = await api('/projects');
    return projects.map((p) => ({ ...p, where: 'cloud' }));
  }
  return readLocal().map((p) => ({ ...p, where: 'local' }));
}

export async function getProject(id) {
  if (signedIn()) {
    try { return (await api(`/projects/${id}`)).project; } catch { /* fall through to local */ }
  }
  return readLocal().find((p) => p.id === id) || null;
}

/** Saves the current viewer state. `extra` carries upload info for image-based models. */
export async function saveProject({ name, modelId, extra, id }) {
  const project = {
    name,
    modelId,
    state: useViewer.getState().snapshot(),
    thumbnail: captureThumbnail(),
    extra: extra || null,
  };
  if (signedIn()) {
    const res = id
      ? await api(`/projects/${id}`, { method: 'PUT', body: project })
      : await api('/projects', { method: 'POST', body: project });
    return res.project;
  }
  const list = readLocal();
  const now = new Date().toISOString();
  if (id) {
    const i = list.findIndex((p) => p.id === id);
    if (i >= 0) { list[i] = { ...list[i], ...project, updatedAt: now }; writeLocal(list); return list[i]; }
  }
  const saved = { ...project, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  writeLocal([saved, ...list]);
  return saved;
}

export async function deleteProject(id) {
  if (signedIn()) return api(`/projects/${id}`, { method: 'DELETE' });
  writeLocal(readLocal().filter((p) => p.id !== id));
}

export async function renameProject(id, name) {
  if (signedIn()) return api(`/projects/${id}`, { method: 'PUT', body: { name } });
  const list = readLocal();
  const p = list.find((x) => x.id === id);
  if (p) { p.name = name; p.updatedAt = new Date().toISOString(); writeLocal(list); }
}
