import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Nav from './components/Nav.jsx';
import Toasts from './components/Toasts.jsx';
import AuthModal from './components/AuthModal.jsx';
import Loader from './components/Loader.jsx';
import { getHealth } from './lib/api.js';
import { useApp } from './store/appStore.js';

const Home = lazy(() => import('./pages/Home.jsx'));
const Category = lazy(() => import('./pages/Category.jsx'));
const Explore = lazy(() => import('./pages/Explore.jsx'));
const Upload = lazy(() => import('./pages/Upload.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => { getHealth().then((h) => useApp.setState({ accounts: !!h.ok && h.accounts !== false, ai: !!h.ok && !!h.ai })); }, []);

  return (
    <>
      <Nav />
      <main>
        <Suspense fallback={<div style={{ position: 'relative', height: '60vh' }}><Loader label="Loading…" /></div>}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname.split('/')[1] || 'home'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/human-body" element={<Category id="human" />} />
                <Route path="/cars" element={<Category id="cars" />} />
                <Route path="/motorcycles" element={<Category id="motorcycles" />} />
                <Route path="/buildings" element={<Category id="buildings" />} />
                <Route path="/appliances" element={<Category id="appliances" />} />
                <Route path="/explore/:modelId" element={<Explore />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      <Toasts />
      <AuthModal />
    </>
  );
}
