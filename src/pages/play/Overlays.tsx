import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import type { Sim } from '@/game/engine';
import type { Briefing } from '@/game/briefings';
import { fmt } from './widgets';

function Backdrop({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-bg-0/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </motion.div>
  );
}

const panelAnim = {
  initial: { scale: 0.96, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.97, opacity: 0 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

export function BriefingOverlay({ sim, label, briefing, onBegin }: { sim: Sim; label: string; briefing: Briefing; onBegin: () => void }) {
  return (
    <Backdrop label="Incident briefing">
      <motion.div {...panelAnim} className="max-h-[85dvh] w-[min(640px,100%)] overflow-y-auto rounded-[2px] border border-line bg-bg-1">
        <header className="border-b border-line px-6 py-4">
          <h2 className="font-mono text-[13px] font-bold uppercase tracking-[0.12em] text-signal-green">
            ▸ Incident briefing — {label}
          </h2>
        </header>
        <div className="space-y-4 px-6 py-5">
          <p className="text-[15px] leading-relaxed text-text-mid">{briefing.copy}</p>
          <div className="rounded-[2px] border border-line bg-bg-2 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">WIN</p>
            <p className="mt-0.5 font-mono text-[12px] text-text-hi">{briefing.win}</p>
            <div className="mt-2 space-y-0.5 font-mono text-[11px] text-text-mid">
              {briefing.stars.map((s, i) => (
                <p key={i}><span className="text-signal-amber">{'★'.repeat(i + 1)}{'☆'.repeat(2 - i)}</span> {s}</p>
              ))}
            </div>
          </div>
          <div className="border-l-2 border-signal-amber bg-bg-2 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal-amber">HINT</p>
            <p className="mt-0.5 font-mono text-[12px] text-text-mid">{briefing.hint}</p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-low">
            deterministic seed {sim.cfg.seed} — the post-mortem timeline replays faithfully
          </p>
        </div>
        <footer className="flex items-center gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onBegin}
            data-cursor-label="PLAY▶"
            className="animate-boot-flash rounded-[2px] bg-signal-green px-6 py-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-bg-0 transition duration-150 hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
          >
            ▶ Begin
          </button>
          <Link to="/levels" className="rounded-[2px] border border-line px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.08em] text-text-mid hover:border-signal-green hover:text-text-hi">
            ← Campaign
          </Link>
        </footer>
      </motion.div>
    </Backdrop>
  );
}

export function ClearOverlay({ sim, levelNum, onReplay }: { sim: Sim; levelNum: number; onReplay: () => void }) {
  const stars = sim.result?.stars ?? 0;
  const s = sim.stats;
  const nextId = `l${levelNum + 1}`;
  const hasNext = levelNum < 6;
  return (
    <Backdrop label="Incident resolved">
      <motion.div {...panelAnim} className="w-[min(560px,100%)] rounded-[2px] border border-signal-green bg-bg-1" style={{ boxShadow: '0 0 24px rgba(87,227,154,.15)' }}>
        <div className="px-6 pb-6 pt-8 text-center">
          <h2 className="glow-text-green font-display text-[44px] font-bold leading-none text-signal-green">✔ INCIDENT RESOLVED</h2>
          <div className="mt-4 flex items-center justify-center gap-2" aria-label={`${stars} of 3 stars`}>
            {[1, 2, 3].map((i) => (
              <motion.span
                key={i}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.25, duration: 0.25 }}
                className={`font-display text-4xl ${i <= stars ? 'text-signal-amber' : 'text-line'}`}
              >
                ★
              </motion.span>
            ))}
          </div>
          <div className="mx-auto mt-6 grid max-w-[420px] grid-cols-2 gap-x-6 gap-y-1 text-left font-mono text-[12px] tabular-nums text-text-mid">
            <span>tokens used</span><span className="text-right text-text-hi">{fmt(s.tokensUsed)}</span>
            <span>deadlines met</span><span className="text-right text-text-hi">{s.onTime}</span>
            <span>retries</span><span className="text-right text-text-hi">{s.retries}</span>
            <span>truncations</span><span className="text-right text-text-hi">{s.truncations}</span>
            <span>peak agents</span><span className="text-right text-text-hi">{s.peakAgents}</span>
            <span>value earned</span><span className="text-right text-signal-green">{fmt(sim.valueEarned)}</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {hasNext && (
              <Link
                to={`/play/${nextId}`}
                data-cursor-label="PLAY▶"
                className="rounded-[2px] bg-signal-green px-6 py-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-bg-0 transition hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
              >
                ▶ Next incident
              </Link>
            )}
            <button type="button" onClick={onReplay} className="rounded-[2px] border border-line px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.08em] text-text-mid hover:border-signal-green hover:text-text-hi">
              Replay
            </button>
            <Link to="/levels" className="rounded-[2px] border border-line px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.08em] text-text-mid hover:border-signal-green hover:text-text-hi">
              Campaign
            </Link>
          </div>
        </div>
      </motion.div>
    </Backdrop>
  );
}

export function FailOverlay({ failure, onRetry, onPostMortem }: { failure: string; onRetry: () => void; onPostMortem: () => void }) {
  return (
    <Backdrop label="Incident failed">
      <motion.div {...panelAnim} className="w-[min(520px,100%)] rounded-[2px] border border-signal-red bg-bg-1" style={{ boxShadow: '0 0 24px rgba(228,87,79,.18)' }}>
        <div className="px-6 pb-6 pt-8 text-center">
          <h2 className="font-display text-[40px] font-bold leading-none text-signal-red">■ INCIDENT FAILED</h2>
          <p className="mt-3 font-mono text-[13px] uppercase tracking-[0.12em] text-signal-red">{failure}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={onRetry} className="rounded-[2px] bg-signal-green px-6 py-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-bg-0 transition hover:-translate-y-px hover:brightness-110 active:scale-[0.97]">
              ▶ Retry
            </button>
            <button type="button" onClick={onPostMortem} className="rounded-[2px] border border-signal-red px-5 py-2.5 font-mono text-[13px] uppercase tracking-[0.08em] text-signal-red hover:bg-signal-red/10">
              View post-mortem
            </button>
          </div>
        </div>
      </motion.div>
    </Backdrop>
  );
}

export function MenuDrawer({ open, onClose, onRestart }: { open: boolean; onClose: () => void; onRestart: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <Backdrop label="Menu">
          <motion.div {...panelAnim} className="w-[min(320px,100%)] rounded-[2px] border border-line bg-bg-1" onClick={(e) => e.stopPropagation()}>
            <header className="border-b border-line px-5 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-text-low">// MENU</header>
            <div className="flex flex-col gap-1 p-3">
              <button type="button" onClick={() => { onRestart(); onClose(); }} className="rounded-[2px] border border-line px-4 py-2 text-left font-mono text-[12px] uppercase text-text-mid hover:border-signal-green hover:text-text-hi">
                ↻ Restart
              </button>
              <Link to="/levels" onClick={onClose} className="rounded-[2px] border border-line px-4 py-2 font-mono text-[12px] uppercase text-text-mid hover:border-signal-green hover:text-text-hi">
                ◈ Level select
              </Link>
              <Link to="/manual" onClick={onClose} className="rounded-[2px] border border-line px-4 py-2 font-mono text-[12px] uppercase text-text-mid hover:border-signal-green hover:text-text-hi">
                ◈ Field manual
              </Link>
              <Link to="/" onClick={onClose} className="rounded-[2px] border border-signal-red/60 px-4 py-2 font-mono text-[12px] uppercase text-signal-red hover:bg-signal-red/10">
                ■ Quit to base
              </Link>
            </div>
          </motion.div>
        </Backdrop>
      )}
    </AnimatePresence>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ['SPACE', 'pause / resume'],
  ['1 / 2 / 3', 'speed 1× / 2× / 4×'],
  ['N', 'spawn subagent (when unlocked)'],
  ['I', 'toggle inspector for selected node'],
  ['L', 'toggle event log'],
  ['ESC', 'close drawer / overlay'],
  ['ENTER', 'pick up focused queue card, drop on node'],
  ['?', 'this help'],
];

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <Backdrop label="Keyboard shortcuts">
          <motion.div {...panelAnim} className="w-[min(420px,100%)] rounded-[2px] border border-line bg-bg-1">
            <header className="border-b border-line px-5 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-text-low">// KEYBOARD</header>
            <ul className="p-5">
              {SHORTCUTS.map(([k, d]) => (
                <li key={k} className="flex items-center justify-between border-b border-line/50 py-1.5 font-mono text-[12px] last:border-b-0">
                  <kbd className="rounded-[2px] border border-line bg-bg-2 px-1.5 py-0.5 text-[11px] text-signal-green">{k}</kbd>
                  <span className="text-text-mid">{d}</span>
                </li>
              ))}
            </ul>
            <footer className="border-t border-line px-5 py-3">
              <button type="button" onClick={onClose} className="w-full rounded-[2px] border border-line px-4 py-2 font-mono text-[12px] uppercase text-text-mid hover:border-signal-green hover:text-text-hi">
                Close
              </button>
            </footer>
          </motion.div>
        </Backdrop>
      )}
    </AnimatePresence>
  );
}
