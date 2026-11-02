import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page-head" style={{ textAlign: 'center', paddingTop: 120 }}>
      <span className="eyebrow">404</span>
      <h1>This part isn’t in the model.</h1>
      <p style={{ marginInline: 'auto' }}>The page you’re looking for doesn’t exist.</p>
      <Link className="btn btn-primary" to="/" style={{ marginTop: 20 }}>Back to Home</Link>
    </div>
  );
}
