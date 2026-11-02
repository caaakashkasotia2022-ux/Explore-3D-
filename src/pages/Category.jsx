import { useSearchParams } from 'react-router-dom';
import { ModelExplorer } from './Explore.jsx';
import Icon from '../components/Icon.jsx';
import { CATEGORIES, MODELS } from '../models/index.js';

export default function Category({ id }) {
  const cat = CATEGORIES.find((c) => c.id === id);
  const [params, setParams] = useSearchParams();
  const modelId = cat.models.includes(params.get('model')) ? params.get('model') : cat.models[0];

  let switcher = null;
  if (cat.models.length > 3) {
    // Many models: a compact dropdown keeps every option reachable.
    switcher = (
      <div className="model-switch">
        <label className="model-select">
          <span className="tiny">Model</span>
          <select value={modelId} onChange={(e) => setParams({ model: e.target.value })} aria-label={`Choose a ${cat.name} model`}>
            {cat.models.map((m) => <option key={m} value={m}>{MODELS[m].name}</option>)}
          </select>
          <Icon name="chevronD" size={16} />
        </label>
      </div>
    );
  } else if (cat.models.length > 1) {
    switcher = (
      <div className="model-switch">
        {cat.models.map((m) => (
          <button key={m} className={`btn btn-sm ${m === modelId ? 'btn-primary' : ''}`} onClick={() => setParams({ model: m })}>
            {MODELS[m].name}
          </button>
        ))}
      </div>
    );
  }

  return <ModelExplorer key={modelId} modelId={modelId} switcher={switcher} />;
}
