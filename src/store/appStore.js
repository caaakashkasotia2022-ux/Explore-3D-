import { create } from 'zustand';

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

let toastId = 0;

export const useApp = create((set, get) => ({
  theme: document.documentElement.dataset.theme || 'dark',
  user: read('e3d-user', null),
  token: read('e3d-token', null),
  authOpen: false,
  toasts: [],
  quality: read('e3d-quality', 'high'),
  accounts: true, // false when the backend has no user database (e.g. static/Vercel hosting)

  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('e3d-theme', theme); } catch { /* ignore */ }
    set({ theme });
  },
  setQuality: (quality) => { write('e3d-quality', quality); set({ quality }); },
  setAuth: (user, token) => { write('e3d-user', user); write('e3d-token', token); set({ user, token }); },
  logout: () => { write('e3d-user', null); write('e3d-token', null); set({ user: null, token: null }); },
  openAuth: (authOpen = true) => set({ authOpen }),
  toast: (message, type = 'info', ms = 4200) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
  },
}));
