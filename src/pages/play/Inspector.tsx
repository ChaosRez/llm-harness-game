import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Sim } from '@/game/engine';
import { useSimVersion } from './useEngine';
import { fmt } from './widgets';

interface InspectorProps {
  sim: Sim;
  agentId: string | null;
  wisdom: string[];
  onClose: () => void;
}

/** Inspector drawer, 380px, slides over the control plane (game.md §6). */
export default function Inspector({ sim, agentId, wisdom, onClose }: InspectorProps) {
  useSimVersion(sim);
  const [confirmKill, setConfirmKill] = useState(false);
  const agent = sim.agents.find((a) => a.id === agentId) ?? null;
  const req = agent?.requestId ? sim.requests.find((r) => r.id === agent.requestId) : undefined;
  const tip = wisdom.length > 0 ? wisdom[(agent?.idx ?? 0) % wisdom.length] : '';

  return (
    <AnimatePresence>
      {agent && (
        <motion.aside
          key={agent.id}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute inset-y-0 right-0 z-40 flex w-[380px] max-w-full flex-col border-l border-line bg-bg-1"
          role="dialog"
          aria-label={`Inspector ${agent.id}`}
        >
          <header className="flex flex-none items-center justify-between border-b border-line px-4 py-2.5">
            <span className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-text-hi">
              {agent.id} {req ? <span className="text-text-low">· {req.id}</span> : <span className="text-text-low">· idle</span>}
            </span>
            <div className="flex items-center gap-2">
              {sim.agents.length > 1 && (
                confirmKill ? (
                  <button
                    type="button"
                    onClick={() => { sim.killAgent(agent.id); setConfirmKill(false); onClose(); }}
                    className="rounded-[2px] bg-signal-red px-2 py-1 font-mono text-[10px] font-bold uppercase text-bg-0"
                    title="kills mid-flight work; partial tokens lost"
                  >
                    CONFIRM KILL
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmKill(true)}
                    className="rounded-[2px] border border-signal-red px-2 py-1 font-mono text-[10px] uppercase text-signal-red hover:bg-signal-red/10"
                    title="kills mid-flight work; partial tokens lost"
                  >
                    Kill agent
                  </button>
                )
              )}
              <button type="button" onClick={onClose} aria-label="Close inspector" className="text-text-low hover:text-text-hi">
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <h3 className="eyebrow mb-2">CONTEXT INSPECTOR</h3>
            <ul className="space-y-1">
              {agent.ctx.length === 0 && <li className="font-mono text-[11px] text-text-low">window empty — node idle</li>}
              {agent.ctx.map((b, i) => (
                <motion.li
                  key={b.id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="rounded-[2px] border border-line bg-bg-2 p-2"
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-text-hi">
                      {b.pinned && <span className="text-signal-amber">● </span>}
                      {b.kind} · {b.label}
                    </span>
                    <span className="tabular-nums text-text-low">{fmt(b.tokens)} tok</span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-bg-0">
                    <div className="h-full bg-signal-green/70" style={{ width: `${Math.min(100, (b.tokens / sim.cfg.contextWindow) * 100)}%` }} />
                  </div>
                  {sim.blockContent(agent, b) && (
                    <p className="mt-1 whitespace-pre-wrap font-mono text-[10px] leading-snug text-text-low">{sim.blockContent(agent, b)}</p>
                  )}
                  {b.kind !== 'system' && (
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => sim.pinBlock(agent.id, b.id)}
                        className="rounded-[2px] border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase text-text-mid hover:border-signal-amber hover:text-signal-amber"
                      >
                        {b.pinned ? 'unpin' : 'pin'}
                      </button>
                      {b.kind !== 'tool_specs' && (
                        <button
                          type="button"
                          onClick={() => sim.evictBlock(agent.id, b.id)}
                          className="rounded-[2px] border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase text-signal-red hover:border-signal-red"
                        >
                          evict
                        </button>
                      )}
                    </div>
                  )}
                </motion.li>
              ))}
            </ul>

            <h3 className="eyebrow mb-2 mt-4">LOOP TRACE — last 8 ticks</h3>
            <ul className="space-y-0.5 font-mono text-[11px] text-text-mid">
              {agent.trace.length === 0 && <li className="text-text-low">no trace</li>}
              {agent.trace.map((t, i) => (
                <li key={`${t}-${i}`}>{t}</li>
              ))}
            </ul>

            <h3 className="eyebrow mb-2 mt-4">NODE ECONOMICS</h3>
            <div className="grid grid-cols-2 gap-x-3 font-mono text-[11px] tabular-nums text-text-mid">
              <span>burn</span><span className="text-right">−{fmt(agent.burn)} tok/tick</span>
              <span>value at stake</span><span className="text-right text-signal-amber">{req ? fmt(req.tokenValue) : '—'}</span>
              <span>retries</span><span className="text-right">{agent.retries}</span>
              <span>facts</span><span className="text-right">{agent.facts}{req ? `/${req.requiredFacts}` : ''}</span>
            </div>
          </div>

          <footer className="flex-none border-l-2 border-signal-teal bg-bg-2 px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-signal-teal">▸ field note</p>
            <p className="mt-0.5 font-mono text-[11px] leading-snug text-text-mid">{tip}</p>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
