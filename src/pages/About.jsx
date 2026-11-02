import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="page-head">
        <span className="eyebrow">About Explore3D</span>
        <h1>Making complex things <span className="grad-text">easy to understand</span></h1>
        <p>Explore3D is an interactive 3D learning platform. Instead of flat diagrams, you take real structures apart — the human body, cars, motorcycles, buildings, bridges, roads and everyday appliances like phones, TVs, fridges and ACs — and learn what every component is, where it sits, and how it works with the others.</p>
      </div>
      <div className="about-grid">
        <div className="panel">
          <h3>Who it’s for</h3>
          <ul>
            <li><b>Students</b> — anatomy, mechanics, electronics and construction, seen from every angle.</li>
            <li><b>Professionals & engineers</b> — switch to Advanced mode for technical detail.</li>
            <li><b>Curious learners</b> — upload a photo of anything and start asking questions.</li>
          </ul>
        </div>
        <div className="panel">
          <h3>How the models work</h3>
          <p>Each library model is built component-by-component, with real assembly-path explode vectors, working animations and hand-written explanations at two levels. They are accurate educational simplifications — not CAD-precise replicas or medical references.</p>
        </div>
        <div className="panel">
          <h3>Estimates, honestly labelled</h3>
          <p>A single photo cannot reveal hidden geometry, so image-based 3D models are always marked as <b>estimated reconstructions</b>, and the app falls back to an annotated 2D analysis or a matching library model when a reliable 3D model isn’t possible.</p>
        </div>
        <div className="panel">
          <h3>Technology</h3>
          <p>React, React Three Fiber / Three.js with physically-based materials, GSAP and Framer Motion for motion, and a Node.js API with SQLite storage for accounts, uploads and saved projects. Your own GLB, GLTF and OBJ files can be explored too.</p>
        </div>
        <div className="panel">
          <h3>Controls</h3>
          <p>Mouse: drag to rotate, scroll to zoom, right-drag to pan, double-click to focus. Touch: one finger rotates, pinch zooms, two fingers pan. Keyboard: arrows rotate, WASD pans, +/− zoom, E explode, T transparency, L labels, R reset, F full screen, Space animate.</p>
        </div>
        <div className="panel">
          <h3>Privacy</h3>
          <p>Uploaded images are stored under random, unguessable file names and, if AI analysis is enabled on the site, are only sent to the AI service for analysis. Accounts use salted scrypt password hashes. Projects saved without an account stay in your browser.</p>
        </div>
      </div>
      <div style={{ marginTop: 30, display: 'flex', gap: 12 }}>
        <Link to="/human-body" className="btn btn-primary">Start Exploring</Link>
        <Link to="/upload" className="btn">Upload an image</Link>
      </div>
    </div>
  );
}
