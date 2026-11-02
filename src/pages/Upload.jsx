import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon.jsx';
import Workspace from '../components/viewer/Workspace.jsx';
import { api, getHealth, uploadWithProgress } from '../lib/api.js';
import { blobToDataURL, buildImageModel, imageStats, imageToDataURL, loadImage, prepareForUpload } from '../lib/imageModel.js';
import { loadModelFile } from '../lib/fileModel.js';
import { getProject, saveProject } from '../lib/projects.js';
import { CATEGORIES, MODELS } from '../models/index.js';
import { useApp } from '../store/appStore.js';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 10;
const STAGES = [
  ['prepare', 'Preparing image'],
  ['upload', 'Uploading securely'],
  ['analyze', 'AI vision analysis'],
  ['build', 'Building 3D model'],
];

export default function Upload() {
  const [params] = useSearchParams();
  const [job, setJob] = useState(null); // { stage, progress, error, preview, upload, analysis, offline, stats, img }
  const [view, setView] = useState('analysis'); // analysis | 3d
  const [model, setModel] = useState(null);
  const [fileModel, setFileModel] = useState(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [health, setHealth] = useState(null);
  const [restoreState, setRestoreState] = useState(null);
  const toast = useApp((s) => s.toast);
  const abort = useRef(false);

  useEffect(() => { getHealth(true).then(setHealth); }, []);

  // Re-open a saved image project.
  useEffect(() => {
    const pid = params.get('project');
    if (!pid) return;
    (async () => {
      const p = await getProject(pid);
      if (!p?.extra) return toast('That project could not be found.', 'error');
      setJob({ stage: 'build', progress: 0.9, preview: p.extra.imageUrl });
      try {
        const img = await loadImage(p.extra.imageUrl);
        const m = buildImageModel(img, p.extra.analysis, { id: `upload-${p.id}` });
        setJob({ stage: 'done', preview: p.extra.imageUrl, upload: { id: p.extra.uploadId, url: p.extra.imageUrl }, analysis: p.extra.analysis, img, offline: !p.extra.analysis, stats: imageStats(img), projectId: p.id, projectName: p.name });
        setModel(m);
        setRestoreState(p.state);
        setView('3d');
      } catch (e) {
        setJob({ stage: 'error', error: `Could not reopen this project: ${e.message}` });
      }
    })();
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(async (file) => {
    abort.current = false;
    setModel(null);
    setView('analysis');
    setRestoreState(null);
    if (!ACCEPT.includes(file.type)) {
      setJob({ stage: 'error', error: `“${file.name}” is not a supported image. Please use JPG, PNG or WEBP.` });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setJob({ stage: 'error', error: `This image is ${(file.size / 1048576).toFixed(1)} MB. The maximum is ${MAX_MB} MB.` });
      return;
    }
    const preview = URL.createObjectURL(file);
    const update = (patch) => !abort.current && setJob((j) => ({ ...j, ...patch }));
    setJob({ stage: 'prepare', progress: 0.05, preview });

    const server = await getHealth();
    // Hosted without file storage (e.g. Vercel): skip the upload and send the image straight to analysis.
    const stateless = server.ok && server.uploads === false;

    let img;
    let prepared;
    try {
      prepared = await prepareForUpload(file, stateless ? 1568 : 2048);
      img = await loadImage(preview);
    } catch (e) {
      update({ stage: 'error', error: e.message });
      return;
    }
    const stats = imageStats(img);
    update({ img, stats, stage: 'upload', progress: 0.1 });

    // Upload (server stores it); if the server is unreachable we continue locally.
    let upload = null;
    if (!stateless) {
      try {
        const fd = new FormData();
        fd.append('image', prepared.blob, file.name.replace(/\.[^.]+$/, '') + (prepared.blob === file ? '' : '.jpg'));
        upload = await uploadWithProgress('/uploads', fd, (p) => update({ progress: 0.1 + p * 0.3 }));
        update({ upload, progress: 0.4 });
      } catch (e) {
        if (e.code !== 'offline') { update({ stage: 'error', error: e.message }); return; }
        update({ offline: true, offlineReason: 'The Explore3D server is not reachable, so the image was processed only in your browser.' });
      }
    }

    // AI analysis
    let analysis = null;
    if (upload || (stateless && server.ai)) {
      update({ stage: 'analyze', progress: 0.45 });
      const tick = setInterval(() => setJob((j) => (j?.stage === 'analyze' ? { ...j, progress: Math.min(0.85, j.progress + 0.012) } : j)), 400);
      try {
        analysis = upload
          ? (await api(`/uploads/${upload.id}/analyze`, { method: 'POST' })).analysis
          : (await api('/analyze', { method: 'POST', body: { image: await blobToDataURL(prepared.blob) } })).analysis;
      } catch (e) {
        if (e.code === 'ai_unavailable' || e.status === 503) {
          update({ offline: true, offlineReason: `${e.message} Showing an offline analysis instead.` });
        } else {
          clearInterval(tick);
          update({ stage: 'error', error: e.message, retryable: true, file });
          return;
        }
      } finally {
        clearInterval(tick);
      }
    } else if (stateless) {
      update({ offline: true, offlineReason: 'AI analysis is not configured on this site, so this is an offline analysis.' });
    }

    update({ stage: 'build', progress: 0.9, analysis });
    await new Promise((r) => setTimeout(r, 50));
    try {
      const m = buildImageModel(img, analysis, { id: `upload-${upload?.id || Date.now()}` });
      setModel(m);
      update({ stage: 'done', progress: 1 });
    } catch (e) {
      update({ stage: 'error', error: `Could not build the 3D model: ${e.message}` });
    }
  }, []);

  const onSave = async () => {
    const name = window.prompt('Project name', job.projectName || job.analysis?.title || 'My image');
    if (!name) return;
    try {
      // Without server storage the image is kept with the project as a small data URL.
      const imageUrl = job.upload?.url || (job.img ? imageToDataURL(job.img, 1024) : null);
      if (!imageUrl) return toast('This image can no longer be saved — please upload it again.', 'error');
      await saveProject({ name, modelId: 'upload', id: job.projectId, extra: { uploadId: job.upload?.id || null, imageUrl, analysis: job.analysis || null } });
      toast(`Saved “${name}” to My Projects`, 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const onModelFile = async (file) => {
    setFileBusy(true);
    try {
      setFileModel(await loadModelFile(file));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setFileBusy(false);
    }
  };

  if (fileModel) {
    return (
      <Workspace
        model={fileModel}
        header={<><span className="eyebrow">Imported 3D file</span><h1>{fileModel.name}</h1><p>{fileModel.tagline}</p>
          <div className="model-switch"><button className="btn btn-sm" onClick={() => setFileModel(null)}><Icon name="chevronL" size={14} /> Back to upload</button></div></>}
      />
    );
  }

  if (model && view === '3d') {
    return (
      <Workspace
        model={model}
        initialState={restoreState}
        onSave={onSave}
        header={<><span className="eyebrow">Your image</span><h1>{model.name}</h1>
          <div className="model-switch"><button className="btn btn-sm" onClick={() => setView('analysis')}><Icon name="chevronL" size={14} /> Analysis</button></div></>}
        banner={<div className="estimate-banner" style={{ marginTop: 10 }} role="note"><Icon name="alert" /><span><b>Estimated reconstruction.</b> This 2.5D model is generated from one photo: depth comes from brightness and object outlines are AI-estimated boxes. It is not an exact 3D representation of your image.</span></div>}
      />
    );
  }

  return (
    <div className="container upload-page">
      <div className="page-head">
        <span className="eyebrow">Upload your image</span>
        <h1>Turn a photo into an <span className="grad-text">explorable model</span></h1>
        <p>Upload a JPG, PNG or WEBP. AI vision identifies the objects and components, then you can explore an estimated 3D reconstruction — or jump to a detailed library model.</p>
      </div>

      {health && !health.ai && (
        <div className="estimate-banner" style={{ maxWidth: 'none', marginBottom: 18 }} role="note">
          <Icon name="info" />
          <span>{health.ok ? 'AI analysis is not configured on this server (no Claude API key). ' : 'The Explore3D server is offline. '}You can still upload: you’ll get an offline image analysis, an estimated relief model, and can pick a library model manually.</span>
        </div>
      )}

      {!job || job.stage === 'error' ? (
        <>
          <DropZone onFile={run} />
          {job?.stage === 'error' && (
            <div className="panel upload-error" role="alert">
              <Icon name="alert" size={22} />
              <div style={{ flex: 1 }}>
                <b>We couldn’t process that image</b>
                <p>{job.error}</p>
              </div>
              {job.retryable && <button className="btn" onClick={() => run(job.file)}>Try again</button>}
            </div>
          )}
          <ModelFileDrop busy={fileBusy} onFile={onModelFile} />
        </>
      ) : job.stage !== 'done' ? (
        <Progress job={job} onCancel={() => { abort.current = true; setJob(null); }} />
      ) : (
        <Result job={job} model={model} onExplore={() => setView('3d')} onReset={() => { setJob(null); setModel(null); }} onSave={onSave} />
      )}
    </div>
  );
}

function DropZone({ onFile }) {
  const [drag, setDrag] = useState(false);
  const input = useRef();
  useEffect(() => {
    const onPaste = (e) => {
      const f = [...(e.clipboardData?.files || [])][0];
      if (f) onFile(f);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onFile]);
  return (
    <div
      className={`dropzone panel ${drag ? 'drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onClick={() => input.current.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
      aria-label="Upload an image"
    >
      <div className="drop-icon"><Icon name="upload" size={30} /></div>
      <h3>Drop an image here, click to browse, or paste</h3>
      <p className="muted">JPG, PNG or WEBP · up to {MAX_MB} MB · large images are resized to 2048 px</p>
      <div className="drop-ideas">
        {['A car engine bay', 'A motorcycle', 'An anatomy diagram', 'A building', 'A machine or gadget'].map((t) => <span key={t} className="chip">{t}</span>)}
      </div>
      <input ref={input} type="file" accept={ACCEPT.join(',')} hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f); }} />
    </div>
  );
}

function ModelFileDrop({ busy, onFile }) {
  const input = useRef();
  return (
    <div className="panel file-drop">
      <Icon name="cube" size={22} />
      <div style={{ flex: 1 }}>
        <b>Already have a 3D model?</b>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Open a .glb, .gltf (embedded) or .obj file — every mesh becomes an explorable, explodable component.</p>
      </div>
      <button className="btn" disabled={busy} onClick={() => input.current.click()}>{busy ? 'Loading…' : 'Open 3D file'}</button>
      <input ref={input} type="file" accept=".glb,.gltf,.obj" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f); }} />
    </div>
  );
}

function Progress({ job, onCancel }) {
  const idx = STAGES.findIndex(([k]) => k === job.stage);
  return (
    <div className="panel progress-card" aria-live="polite">
      {job.preview && <div className="progress-img"><img src={job.preview} alt="Your upload" /><div className="scanline" /></div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3>Processing your image…</h3>
        <ol className="stage-list">
          {STAGES.map(([k, label], i) => (
            <li key={k} className={i < idx ? 'done' : i === idx ? 'now' : ''}>
              <span className="stage-dot">{i < idx ? <Icon name="check" size={13} /> : i + 1}</span>
              {label}
              {i === idx && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginLeft: 8 }} />}
              {k === 'analyze' && job.offline && i <= idx && <span className="chip warn" style={{ marginLeft: 8 }}>offline</span>}
            </li>
          ))}
        </ol>
        <div className="progress"><div style={{ width: `${Math.round((job.progress || 0) * 100)}%` }} /></div>
        {job.stage === 'analyze' && <p className="tiny">AI vision is identifying objects and components. This usually takes 10–40 seconds.</p>}
        <button className="btn btn-sm btn-ghost" style={{ marginTop: 10 }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function Result({ job, model, onExplore, onReset, onSave }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(null);
  const a = job.analysis;
  const match = a && a.best_match !== 'none' ? MODELS[a.best_match] : null;
  const cat = match && CATEGORIES.find((c) => c.models.includes(match.id));

  return (
    <motion.div className="result-grid" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="panel annotated">
        <div className="annot-wrap">
          <img src={job.upload?.url || job.preview} alt={a?.title || 'Uploaded image'} />
          {a?.objects.map((o, i) => (
            <div key={i} className={`bbox ${hover === `o${i}` ? 'on' : ''}`} style={box(o.bbox)} onMouseEnter={() => setHover(`o${i}`)} onMouseLeave={() => setHover(null)}>
              <span>{o.name} · {Math.round(o.confidence * 100)}%</span>
            </div>
          ))}
          {a?.objects.flatMap((o, i) => o.components.map((c, j) => (
            <div key={`${i}-${j}`} className={`bbox comp ${hover === `c${i}-${j}` ? 'on' : ''} ${c.visible ? '' : 'hidden-comp'}`} style={box(c.bbox)} onMouseEnter={() => setHover(`c${i}-${j}`)} onMouseLeave={() => setHover(null)}>
              <span>{c.name}</span>
            </div>
          )))}
        </div>
        <p className="tiny" style={{ padding: '10px 14px', margin: 0 }}>
          {a ? 'Annotated 2D analysis · hover boxes or list items · dashed = estimated position of hidden parts' : 'Offline analysis — no object detection available'}
        </p>
      </div>

      <div className="result-side">
        <div className="panel result-card">
          <span className="eyebrow">{a ? 'AI analysis' : 'Offline analysis'}</span>
          <h2>{a?.title || 'Your image'}</h2>
          {a ? <p>{a.summary}</p> : <p className="muted">{job.offlineReason}</p>}
          {!a && job.stats && (
            <div className="stats">
              <div><b>{job.stats.width}×{job.stats.height}</b><span>pixels</span></div>
              <div><b>{Math.round(job.stats.brightness * 100)}%</b><span>brightness</span></div>
              <div><b>{Math.round(job.stats.detail * 100)}%</b><span>edge detail</span></div>
              <div className="palette">{job.stats.palette.map((p, i) => <i key={i} style={{ background: p.color, flex: p.share }} title={`${Math.round(p.share * 100)}%`} />)}</div>
            </div>
          )}

          {a && (
            <div className={`recon ${a.reconstruction.feasible ? '' : 'bad'}`}>
              <Icon name={a.reconstruction.feasible ? 'cube' : 'alert'} />
              <div>
                <b>3D reconstruction: {a.reconstruction.feasible ? `${a.reconstruction.quality} (estimated)` : 'not reliable'}</b>
                <p>{a.reconstruction.reason}</p>
              </div>
            </div>
          )}
          {!a && (
            <div className="recon bad">
              <Icon name="alert" />
              <div>
                <b>Limited analysis</b>
                <p>Without AI vision we can’t identify objects or parts. You can still explore a brightness-based relief of the whole image, or choose a detailed library model below.</p>
              </div>
            </div>
          )}

          <div className="result-actions">
            <button className="btn btn-primary" onClick={onExplore} disabled={!model}>
              <Icon name="cube" /> {a?.reconstruction.feasible === false ? 'View estimated relief anyway' : 'Explore estimated 3D model'}
            </button>
            <button className="btn" onClick={onSave}><Icon name="save" /> Save</button>
            <button className="btn btn-ghost" onClick={onReset}>New image</button>
          </div>
        </div>

        {match && (
          <div className="panel result-card match">
            <span className="eyebrow">Best library match · {Math.round(a.match_confidence * 100)}%</span>
            <h3>{match.name}</h3>
            <p className="muted">{a.match_reason}</p>
            <p className="tiny">Our hand-built model is a generic, accurate representation of this kind of object — not a copy of the one in your photo.</p>
            <button className="btn btn-primary" onClick={() => navigate(`${cat.path}?model=${match.id}`)}>Open detailed 3D model <Icon name="arrowR" /></button>
          </div>
        )}

        {(!match) && (
          <div className="panel result-card">
            <span className="eyebrow">Choose a model manually</span>
            <p className="muted" style={{ marginTop: 6 }}>{a ? 'No library model closely matches this image.' : 'Pick the closest detailed 3D model to keep exploring:'}</p>
            <div className="manual-pick">
              {Object.values(MODELS).map((m) => {
                const c = CATEGORIES.find((x) => x.models.includes(m.id));
                return <Link key={m.id} className="btn btn-sm" to={`${c.path}?model=${m.id}`}>{m.name}</Link>;
              })}
            </div>
          </div>
        )}

        {a?.objects.length > 0 && (
          <div className="panel result-card">
            <span className="eyebrow">Detected objects & components</span>
            <ul className="obj-list">
              {a.objects.map((o, i) => (
                <li key={i}>
                  <div className={`obj-name ${hover === `o${i}` ? 'on' : ''}`} onMouseEnter={() => setHover(`o${i}`)} onMouseLeave={() => setHover(null)}>
                    <b>{o.name}</b> <span className="chip">{o.category.replace('_', ' ')}</span>
                  </div>
                  <p className="muted">{o.description}</p>
                  <ul>
                    {o.components.map((c, j) => (
                      <li key={j} className={hover === `c${i}-${j}` ? 'on' : ''} onMouseEnter={() => setHover(`c${i}-${j}`)} onMouseLeave={() => setHover(null)}>
                        <b>{c.name}</b>{!c.visible && <span className="tiny"> (hidden – estimated)</span>} — {c.purpose}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const box = (b) => ({ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` });

