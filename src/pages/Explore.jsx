import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Workspace from '../components/viewer/Workspace.jsx';
import Loader from '../components/Loader.jsx';
import Icon from '../components/Icon.jsx';
import { loadModel, MODELS, CATEGORIES } from '../models/index.js';
import { getProject, saveProject } from '../lib/projects.js';
import { useApp } from '../store/appStore.js';

/** Loads a built-in model (optionally restoring a saved project) into the workspace. */
export function ModelExplorer({ modelId, switcher }) {
  const [params] = useSearchParams();
  const projectId = params.get('project');
  const [state, setState] = useState({ status: 'loading' });
  const toast = useApp((s) => s.toast);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    Promise.all([loadModel(modelId), projectId ? getProject(projectId) : null])
      .then(([model, project]) => alive && setState({ status: 'ready', model, project }))
      .catch((e) => alive && setState({ status: 'error', error: e.message }));
    return () => { alive = false; };
  }, [modelId, projectId]);

  if (state.status === 'loading') {
    return <div className="workspace" style={{ display: 'block' }}><Loader label={`Loading ${MODELS[modelId]?.name || 'model'}…`} /></div>;
  }
  if (state.status === 'error') {
    return (
      <div className="container page-head">
        <span className="eyebrow">Could not load model</span>
        <h1>Something went wrong</h1>
        <p>{state.error}</p>
        <Link className="btn" to="/">Back home</Link>
      </div>
    );
  }

  const { model, project } = state;
  const onSave = async () => {
    const name = window.prompt('Project name', project?.name || `${model.name} – ${new Date().toLocaleDateString()}`);
    if (!name) return;
    try {
      await saveProject({ name, modelId: model.id, id: project?.id });
      toast(`Saved “${name}” to My Projects`, 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Workspace
      model={model}
      initialState={project?.state}
      onSave={onSave}
      header={
        <>
          <span className="eyebrow">{CATEGORIES.find((c) => c.id === model.category)?.name}{project ? ` · ${project.name}` : ''}</span>
          <h1>{model.name}</h1>
          <p>{model.tagline || model.description}</p>
          {switcher}
        </>
      }
    />
  );
}

export default function Explore() {
  const { modelId } = useParams();
  if (!MODELS[modelId]) {
    return (
      <div className="container page-head">
        <h1>Model not found</h1>
        <p>There is no model called “{modelId}”.</p>
        <Link className="btn" to="/"><Icon name="chevronL" /> Home</Link>
      </div>
    );
  }
  return <ModelExplorer modelId={modelId} />;
}
