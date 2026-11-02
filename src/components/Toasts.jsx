import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../store/appStore.js';
import Icon from './Icon.jsx';

export default function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className={`toast panel ${t.type}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
            <Icon name={t.type === 'error' ? 'alert' : t.type === 'success' ? 'check' : 'info'} />
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
