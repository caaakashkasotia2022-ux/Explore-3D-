import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { listProjects, deleteProject, renameProject } from '../lib/projects.js';
import { CATEGORIES, MODELS } from '../models/index.js';
import { useApp } from '../store/appStore.js';

const openUrl = (p) => {
  if (p.modelId === 'upload') return `/upload?project=${p.id}`;
  const cat = CATEGORIES.find((c) => c.models.includes(p.modelId));
  return `${cat?.path || `/explore/${p.modelId}`}?model=${p.modelId}&project=${p.id}`;
};

export default function Projects() {
  const { user, openAuth, toast, accounts } = useApp();
  const [state, setState] = useState({ status: 'loading', list: [] });

  const load = () => {
    setState((s) => ({ ...s, status: 'loading' }));
    listProjects()
      .then((list) => setState({ status: 'ready', list }))
      .catch((e) => setState({ status: 'error', list: [], error: e.message }));
  };
  useEffect(load, [user]);

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.name}”? This cannot be undone.`)) return;
    try { await deleteProject(p.id); toast('Project deleted', 'success'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };
  const rename = async (p) => {
    const name = window.prompt('Rename project', p.name);
    if (!name || name === p.name) return;
    try { await renameProject(p.id, name); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow">My Projects</span>
          <h1>Your saved explorations</h1>
          <p>Save any view — camera angle, exploded state, hidden parts, selection and section cut — with the <Icon name="save" size={15} /> button in the viewer.</p>
        </div>
        {user ? <span className="chip ok"><Icon name="check" size={14} /> Synced to {user.email}</span>
          : accounts && <button className="btn" onClick={() => openAuth(true)}><Icon name="user" /> Sign in to sync across devices</button>}
      </div>

      {!user && <p className="tiny" style={{ marginTop: -10, marginBottom: 18 }}>Not signed in — projects are stored in this browser only.</p>}

      {state.status === 'loading' && (
        <div className="proj-grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 16 }} />)}</div>
      )}
      {state.status === 'error' && <div className="panel upload-error" role="alert"><Icon name="alert" /><div><b>Could not load projects</b><p>{state.error}</p></div><button className="btn" onClick={load}>Retry</button></div>}
      {state.status === 'ready' && state.list.length === 0 && (
        <div className="panel empty">
          <Icon name="folder" size={40} />
          <h3>No projects yet</h3>
          <p className="muted">Open any model, set up the view you want and press Save.</p>
          <div className="hero-ctas" style={{ justifyContent: 'center' }}>
            <Link to="/human-body" className="btn btn-primary">Start Exploring</Link>
            <Link to="/upload" className="btn">Upload an image</Link>
          </div>
        </div>
      )}
      {state.status === 'ready' && state.list.length > 0 && (
        <div className="proj-grid">
          {state.list.map((p) => (
            <div key={p.id} className="proj panel">
              <Link to={openUrl(p)} className="thumb">{p.thumbnail ? <img src={p.thumbnail} alt="" /> : <Icon name="cube" size={40} />}</Link>
              <div className="meta">
                <b>{p.name}</b>
                <span className="tiny">{p.modelId === 'upload' ? 'Uploaded image' : MODELS[p.modelId]?.name} · {new Date(p.updatedAt || p.createdAt).toLocaleString()}</span>
                <div className="row">
                  <Link to={openUrl(p)} className="btn btn-sm btn-primary">Open</Link>
                  <button className="btn btn-sm" onClick={() => rename(p)}>Rename</button>
                  <span style={{ flex: 1 }} />
                  <button className="icon-btn" onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><Icon name="trash" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
