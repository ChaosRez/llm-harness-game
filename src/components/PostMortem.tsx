import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';

export interface PostMortemProps {
  open: boolean;
  /** failure name, e.g. 'RETRY STORM' */
  failure: string;
  /** timeline recap lines — what happened */
  timeline: string[];
  /** distributed-systems concept this failure maps to */
  concept: { name: string; definition: string };
  /** mitigation bullets */
  mitigations: string[];
  onRetry: () => void;
  /** manual anchor for "READ IN MANUAL" (default: glossary root) */
  manualAnchor?: string;
  onClose?: () => void;
}

/**
 * Post-Mortem modal (design.md §8) — the actual lesson. Center modal,
 * 640px, red border, backdrop blur. Enter: scale 0.96→1, 250ms.
 */
export default function PostMortem({
  open,
  failure,
  timeline,
  concept,
  mitigations,
  onRetry,
  manualAnchor = 'glossary',
  onClose,
}: PostMortemProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-bg-0/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Post-mortem: ${failure}`}
        >
          <motion.div
            className="max-h-[85dvh] w-[min(640px,100%)] overflow-y-auto rounded-[2px] border border-signal-red bg-bg-1 shadow-glow-red"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="border-b border-line px-6 py-4">
              <h2 className="font-mono text-[13px] font-bold uppercase tracking-[0.12em] text-signal-red">
                ■ Post-mortem — {failure}
              </h2>
            </header>

            <div className="space-y-6 px-6 py-5">
              <section>
                <h3 className="eyebrow mb-2">What happened</h3>
                <ul className="space-y-1.5 font-mono text-[13px] leading-relaxed text-text-mid">
                  {timeline.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-text-low">{String(i + 1).padStart(2, '0')}</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="eyebrow mb-2">The concept</h3>
                <p className="text-[15px] text-text-mid">
                  <span className="font-mono font-bold text-signal-amber">{concept.name}</span>
                  {' — '}
                  {concept.definition}
                </p>
              </section>

              <section>
                <h3 className="eyebrow mb-2">How to mitigate</h3>
                <ul className="space-y-1.5 text-[15px] text-text-mid">
                  {mitigations.map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-signal-green">▸</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <footer className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={onRetry}
                data-cursor-label="RTRY"
                className="rounded-[2px] bg-signal-green px-5 py-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-bg-0 transition duration-150 hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
              >
                ▶ Retry level
              </button>
              <Link
                to={`/manual#${manualAnchor}`}
                className="rounded-[2px] border border-line px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.08em] text-text-mid transition-colors duration-150 hover:border-signal-green hover:text-text-hi"
              >
                Read in manual
              </Link>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
