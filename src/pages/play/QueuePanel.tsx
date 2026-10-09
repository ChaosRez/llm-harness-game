import { AnimatePresence, motion } from 'framer-motion';
import type { Request } from '@/game/types';
import type { Sim } from '@/game/engine';
import { useSimVersion } from './useEngine';
import { Sparkline } from './widgets';
import { COLORS } from '@/lib/palette';

interface QueuePanelProps {
  sim: Sim;
  selectedReqId: string | null;
  onSelectReq: (id: string | null) => void;
  manual: boolean;
}

function deadlineColor(req: Request, tick: number): string {
  const frac = Math.max(0, (req.deadlineTick - tick) / Math.max(1, req.deadlineSlack));
  if (frac > 0.5) return COLORS.signalGreen;
  if (frac > 0.2) return COLORS.signalAmber;
  return COLORS.signalRed;
}

/** Incoming queue, 240px left panel (game.md §3). Click = pick up for manual assign. */
export default function QueuePanel({ sim, selectedReqId, onSelectReq, manual }: QueuePanelProps) {
  useSimVersion(sim);
  const active = sim.requests.filter((r) => r.state === 'queued' || r.state === 'running');
  const queued = active.filter((r) => r.state === 'queued');
  const running = active.filter((r) => r.state === 'running');

  return (
    <aside className="flex h-full flex-col border-r border-line bg-bg-1">
      <header className="flex flex-none items-center justify-between border-b border-line px-3 py-2">
        <span className="eyebrow">INCOMING QUEUE</span>
        <Sparkline data={sim.history.queueDepth} width={40} height={16} color={COLORS.signalGreen} />
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {[...queued, ...running].map((req) => {
            const left = req.deadlineTick - sim.tick;
            const pct = Math.max(0, Math.min(1, left / Math.max(1, req.deadlineSlack)));
            const isQueued = req.state === 'queued';
            const selected = selectedReqId === req.id;
            return (
              <motion.button
                key={req.id}
                type="button"
                layout="position"
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: isQueued ? 1 : 0.75 }}
                exit={{ x: -8, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                disabled={!manual || !isQueued}
                onClick={() => onSelectReq(selected ? null : req.id)}
                onKeyDown={(e) => {
                  if (manual && isQueued && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelectReq(selected ? null : req.id);
                  }
                }}
                className={`block w-full rounded-[2px] border bg-bg-2 p-2 text-left transition-colors duration-150 ${
                  selected
                    ? 'border-signal-amber'
                    : isQueued
                      ? 'border-line hover:border-signal-green'
                      : 'border-line border-l-2 border-l-signal-green opacity-80'
                } ${manual && isQueued ? 'cursor-pointer' : 'cursor-default'}`}
                aria-pressed={selected}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-text-hi">{req.id}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-low">
                    {isQueued ? (selected ? 'PICKED UP' : 'QUEUED') : 'ASSIGNED'}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[13px] leading-snug text-text-mid">{req.title}</p>
                <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-text-low">
                  <span>{req.requiredTools.length > 0 ? req.requiredTools.join(' · ') : 'reasoning'}</span>
                  <span className="text-signal-amber">VALUE {req.tokenValue}</span>
                </div>
                <div className="mt-1.5 h-0.5 w-full bg-bg-0">
                  <div
                    className="h-full"
                    style={{ width: `${pct * 100}%`, background: deadlineColor(req, sim.tick), transition: 'width 600ms linear' }}
                  />
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
        {active.length === 0 && (
          <p className="px-1 pt-4 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">
            queue depth 0 — awaiting arrivals
          </p>
        )}
      </div>
      <footer className="flex-none border-t border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-low">
        depth {queued.length} · {manual ? 'manual dispatch' : sim.policies.dispatch}
      </footer>
    </aside>
  );
}
