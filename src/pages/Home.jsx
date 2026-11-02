import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ModelPreview from '../components/ModelPreview.jsx';
import Icon from '../components/Icon.jsx';
import { CATEGORIES } from '../models/index.js';

gsap.registerPlugin(ScrollTrigger);

const STORY = [
  { t: 0, title: 'One engine. 44 parts.', text: 'A complete inline-four petrol engine, modelled component by component — from the oil pan to the ignition coils.' },
  { t: 0.25, title: 'Pull it apart', text: 'Scroll to explode it. Every part slides out along its assembly path so you can see how the engine is stacked together.' },
  { t: 0.5, title: 'See the hidden parts', text: 'Pistons, connecting rods, crankshaft, camshafts and valves — the moving heart of the engine, normally sealed inside the block.' },
  { t: 0.75, title: 'Understand how it works', text: 'In the explorer, click any part for a plain-language explanation, switch to Advanced for engineering detail, or ask the AI tutor.' },
];

const FEATURES = [
  ['explode', 'Animated exploded views', 'Components fly apart and re-assemble along their real assembly paths, at any amount you like.'],
  ['sparkles', 'AI-powered explanations', 'What it is, where it is, how it works and what it connects to — in beginner or advanced language, plus an AI tutor for follow-up questions.'],
  ['section', 'Cutaways & X-ray', 'Slice through any model on any axis, or fade everything except the part you are studying.'],
  ['play', 'Step-by-step animations', 'Guided tours show a heartbeat, a four-stroke cycle, a chain drive or how loads travel to a building’s foundations.'],
  ['image', 'Your own images & models', 'Upload a photo for AI object and component detection with an estimated 3D reconstruction — or open your own GLB/OBJ.'],
  ['keyboard', 'Mouse, touch & keyboard', 'Rotate, pan, zoom and explore with any input. Full-screen mode, labels and a searchable component list.'],
];

export default function Home() {
  const story = useRef();
  const explodeRef = useRef(0);
  const [storyIdx, setStoryIdx] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
      });
      gsap.fromTo('.hero-copy > *', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', delay: 0.1 });
      ScrollTrigger.create({
        trigger: story.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          // Explode during the first 70 % of the section, hold, then begin re-assembly.
          explodeRef.current = p < 0.7 ? gsap.parseEase('power2.inOut')(p / 0.7) * 0.75 : 0.75 - (p - 0.7) * 1.2;
          setStoryProgress(p);
          setStoryIdx(STORY.reduce((idx, s, i) => (p >= s.t ? i : idx), 0));
        },
      });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => () => ScrollTrigger.getAll().forEach((t) => t.kill()), []);

  return (
    <div className="home">
      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Interactive 3D learning platform</span>
          <h1>
            <span>Explore Everything.</span>
            <span>Understand Anything.</span>
            <span className="grad-text">In 3D.</span>
          </h1>
          <p className="lead">Discover the hidden structures, components, and working mechanisms of the world around you through interactive 3D exploration.</p>
          <div className="hero-ctas">
            <Link to="/human-body" className="btn btn-primary btn-lg">Start Exploring <Icon name="arrowR" /></Link>
            <Link to="/upload" className="btn btn-lg"><Icon name="upload" /> Upload Your Image</Link>
          </div>
          <div className="hero-stats">
            <div><b>15</b><span>Detailed models</span></div>
            <div><b>590+</b><span>Explained parts</span></div>
            <div><b>108</b><span>Guided animations</span></div>
          </div>
        </div>
        <div className="hero-canvas">
          <HeroModel />
        </div>
        <div className="scroll-cue">Scroll</div>
      </section>

      {/* ---------------- Categories ---------------- */}
      <section className="section container" id="categories">
        <div className="section-head reveal">
          <h2>Pick a world to take apart.</h2>
          <p>Each category is a live 3D model — rotate it, explode it, slice it, and click any component to learn what it does.</p>
        </div>
        <div className="cat-grid">
          {CATEGORIES.map((c, i) => (
            <motion.div key={c.id} className="reveal" style={{ '--c': c.accent }} whileHover="hover">
              <Link to={c.path} className="cat-card panel" style={{ '--c': c.accent }}>
                <div className="cat-3d">
                  <ModelPreview modelId={c.id === 'cars' ? 'car' : c.models[0]} autoExplode={0.6} rotate={0.3 + i * 0.03} fit={c.id === 'buildings' || c.id === 'human' ? 0.92 : 1.15} />
                </div>
                <div className="cat-body">
                  <h3><Icon name={c.icon} size={22} style={{ color: c.accent }} /> {c.name}</h3>
                  <p>{c.blurb}</p>
                  <span className="go">Explore {c.name.toLowerCase()} <Icon name="arrowR" size={16} /></span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        <Link to="/upload" className="panel cat-card upload-card reveal" style={{ '--c': 'var(--accent-2)', minHeight: 0, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 20, padding: '22px 24px' }}>
          <div className="drop-icon" style={{ margin: 0, flex: 'none' }}><Icon name="upload" size={28} /></div>
          <div className="cat-body" style={{ padding: 0 }}>
            <h3>Upload Your Image</h3>
            <p>Photograph an engine, a bike, an appliance, a building or a diagram. AI identifies its objects and components and builds an explorable, estimated 3D model.</p>
          </div>
          <span className="btn btn-primary">Try it <Icon name="arrowR" /></span>
        </Link>
      </section>

      {/* ---------------- Scroll-driven exploded engine ---------------- */}
      <section className="explode-story" ref={story} aria-label="Scroll to explode the engine">
        <div className="explode-sticky container">
          <div>
            <span className="eyebrow">Scroll-powered exploded view</span>
            <div className="story-steps">
              {STORY.map((s, i) => (
                <div key={i} className={`story-step ${i === storyIdx ? 'on' : ''}`} aria-hidden={i !== storyIdx}>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
            <div className="story-bar">
              {STORY.map((s, i) => {
                const next = STORY[i + 1]?.t ?? 1;
                const fill = Math.min(1, Math.max(0, (storyProgress - s.t) / (next - s.t)));
                return <i key={i}><b style={{ transform: `scaleX(${fill})` }} /></i>;
              })}
            </div>
            <Link to="/cars?model=engine" className="btn" style={{ marginTop: 26 }}>Open the engine explorer <Icon name="arrowR" /></Link>
          </div>
          <div className="story-canvas">
            <ModelPreview modelId="engine" explodeRef={explodeRef} rotate={0.12} fit={0.9} cameraDir={[1, 0.55, 1.2]} />
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="section container">
        <div className="section-head reveal">
          <h2>Not a gallery. A <span className="grad-text">workbench.</span></h2>
          <p>Everything is genuinely interactive and explained — built for students, engineers, medical learners and the endlessly curious.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map(([icon, title, text]) => (
            <div className="feature panel reveal" key={title}>
              <div className="f-icon"><Icon name={icon} size={22} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>

        <div className="cta-band panel reveal">
          <div>
            <span className="eyebrow">Upload your image</span>
            <h2>Got something you want to understand?</h2>
            <p>Snap a photo. We’ll identify what’s in it, explain each component, and build an estimated 3D model you can pull apart — clearly labelled as an estimate.</p>
            <div className="hero-ctas">
              <Link to="/upload" className="btn btn-primary btn-lg"><Icon name="upload" /> Upload an image</Link>
              <Link to="/human-body" className="btn btn-lg">Start Exploring</Link>
            </div>
          </div>
          <div className="cta-steps">
            <div><b>1</b> Upload a JPG, PNG or WEBP</div>
            <div><b>2</b> AI detects objects & components</div>
            <div><b>3</b> Explore the annotated analysis</div>
            <div><b>4</b> Open the estimated or library 3D model</div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <span>© {new Date().getFullYear()} Explore3D · Learn how things work.</span>
          <span>Models are educational simplifications — not for medical or engineering decisions.</span>
        </div>
      </footer>
    </div>
  );
}

/** Hero: the human body if available, otherwise the engine. Slowly rotates and "breathes" apart. */
function HeroModel() {
  const [id, setId] = useState('human');
  const [chips, setChips] = useState(false);
  return (
    <>
      <ModelPreview key={id} modelId={id} autoExplode={id === 'human' ? 0.45 : 0.5} rotate={0.22} fit={id === 'human' ? 0.88 : 0.95} cameraDir={[0.25, 0.12, 1]} onLoaded={() => setChips(true)} style={{}} />
      <FallbackSwitch id={id} onFail={() => setId('engine')} />
      {chips && id === 'human' && (
        <>
          <motion.div className="float-chip panel" style={{ top: '18%', right: '8%', '--c': '#ff4d8d' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}><i />Heart · 60–100 bpm</motion.div>
          <motion.div className="float-chip panel" style={{ top: '42%', left: '4%', '--c': '#4cc9f0' }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}><i />Lungs · ~6 L capacity</motion.div>
          <motion.div className="float-chip panel" style={{ bottom: '20%', right: '10%', '--c': '#ffb547' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }}><i />206 bones</motion.div>
        </>
      )}
    </>
  );
}

function FallbackSwitch({ id, onFail }) {
  useEffect(() => {
    if (id !== 'human') return;
    import('../models/index.js').then(({ loadModel }) => loadModel('human').catch(onFail));
  }, [id, onFail]);
  return null;
}
