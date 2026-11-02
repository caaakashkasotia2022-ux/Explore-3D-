import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../store/appStore.js';
import { api } from '../lib/api.js';
import Icon from './Icon.jsx';

export default function AuthModal() {
  const { authOpen, openAuth, setAuth, toast } = useApp();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: form });
      setAuth(res.user, res.token);
      openAuth(false);
      toast(`Welcome${mode === 'login' ? ' back' : ''}, ${res.user.name}!`, 'success');
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {authOpen && (
        <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && openAuth(false)}>
          <motion.form className="modal panel" role="dialog" aria-modal="true" aria-labelledby="auth-title" onSubmit={submit}
            initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="auth-title">{mode === 'login' ? 'Sign in' : 'Create your account'}</h3>
              <button type="button" className="icon-btn" onClick={() => openAuth(false)} aria-label="Close"><Icon name="close" /></button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>Save projects and uploaded models to your account and open them on any device.</p>
            {mode === 'register' && (
              <div className="form-row"><label htmlFor="a-name">Name</label><input id="a-name" className="input" value={form.name} onChange={set('name')} autoComplete="name" /></div>
            )}
            <div className="form-row"><label htmlFor="a-email">Email</label><input id="a-email" className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" autoFocus /></div>
            <div className="form-row"><label htmlFor="a-pw">Password</label><input id="a-pw" className="input" type="password" required minLength={mode === 'register' ? 8 : undefined} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
            {error && <p className="error-text" role="alert">{error}</p>}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
            <p className="tiny" style={{ textAlign: 'center', marginTop: 14 }}>
              {mode === 'login' ? 'New here? ' : 'Already have an account? '}
              <button type="button" className="btn-ghost" style={{ border: 0, background: 'none', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                {mode === 'login' ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
