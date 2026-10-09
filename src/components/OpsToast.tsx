import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface OpsToastProps {
  /** unique id — changing it re-arms the toast */
  id: string | number;
  /** teaching copy, ~16px body */
  body: string;
  /** optional header override (default 'OPS BULLETIN') */
  title?: string;
  /** manual anchor for "tell me more", e.g. 'glossary-backpressure' → /manual#glossary-backpressure */
  manualAnchor?: string;
  /** auto-dismiss ms (default 9000); 0 disables */
  duration?: number;
  onDismiss?: () => void;
}

/**
 * Teaching toast ("ops bulletin", design.md §8): slides up bottom-right,
 * teal left border, auto-dismiss with progress hairline.
 */
export default function OpsToast(props: OpsToastProps) {
  // key remount re-arms the toast when a new bulletin (id) arrives
  return <ToastInner key={String(props.id)} {...props} />;
}

function ToastInner({
  id,
  body,
  title = 'OPS BULLETIN',
  manualAnchor,
  duration = 9000,
  onDismiss,
}: OpsToastProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (duration <= 0) return;
    const t = window.setTimeout(() => setOpen(false), duration);
    return () => window.clearTimeout(t);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {open && (
        <motion.aside
          key={id}
          role="status"
          className="fixed bottom-6 right-6 z-[70] w-[min(92vw,380px)] overflow-hidden rounded-[2px] border border-line border-l-2 border-l-signal-teal bg-bg-2 shadow-glow-green"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 12, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal-teal">
              ▸ {title}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dismiss bulletin"
              className="text-text-low transition-colors duration-150 hover:text-text-hi"
            >
              <X size={14} />
            </button>
          </div>
          <p className="px-4 pb-3 pt-2 text-[14px] leading-relaxed text-text-mid">{body}</p>
          {manualAnchor && (
            <div className="px-4 pb-3">
              <a
                href={`/manual#${manualAnchor}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[12px] uppercase tracking-[0.12em] text-signal-teal hover:brightness-125"
              >
                Tell me more →
              </a>
            </div>
          )}
          {duration > 0 && (
            <motion.div
              key={`bar-${String(id)}`}
              className="h-px bg-signal-teal/60"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
            />
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
