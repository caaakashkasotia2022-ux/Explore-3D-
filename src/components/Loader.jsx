export default function Loader({ label = 'Loading…', progress }) {
  return (
    <div className="loader-wrap" role="status" aria-live="polite">
      <div className="loader">
        <div className="spinner" />
        <span>{label}</span>
        {progress != null && <div className="progress" style={{ width: 180 }}><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
      </div>
    </div>
  );
}
