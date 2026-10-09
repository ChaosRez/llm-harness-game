import { motion } from 'framer-motion';
import { COLORS } from '@/lib/palette';
import type { Sim } from '@/game/engine';
import AgentNode from './AgentNode';
import { useSimVersion } from './useEngine';

interface StageProps {
  sim: Sim;
  reducedMotion: boolean;
  fanout: boolean;
  selectedReqId: string | null;
  onAssign: (agentId: string) => void;
  onInspect: (agentId: string) => void;
}

function ToolRail({ sim }: { sim: Sim }) {
  useSimVersion(sim);
  const inFlight = new Map<string, number>();
  for (const a of sim.agents) {
    if (a.pendingTool) inFlight.set(a.pendingTool.toolId, (inFlight.get(a.pendingTool.toolId) ?? 0) + 1);
  }
  const rpmLimit = sim.cfg.rateLimitRpm;
  const rpmUsed = sim.rpmUsed();

  return (
    <div className="flex flex-none flex-wrap items-center gap-2 border-t border-line bg-bg-1 px-3 py-2">
      <span className="eyebrow mr-1">TOOL RAIL</span>
      {sim.tools.length === 0 && (
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-low">no tools provisioned — pure reasoning</span>
      )}
      {sim.tools.map((t) => {
        const active = inFlight.has(t.id);
        const locked = t.locked429Until > sim.tick;
        const breakerOpen = t.breakerOpenUntil > sim.tick;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-[2px] border px-2 py-1 font-mono text-[11px] transition-colors duration-200 ${
              locked || breakerOpen
                ? 'border-signal-red text-signal-red'
                : active
                  ? 'border-signal-green text-text-hi'
                  : 'border-line text-text-mid'
            }`}
            style={active && !locked && !breakerOpen ? { boxShadow: '0 0 16px rgba(87,227,154,.2)' } : undefined}
            title={`${t.name} — latency ${t.latencyTicks}t · failure ${Math.round(t.failureRate * 100)}%${t.sideEffect ? ' · SIDE EFFECTS' : ''}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'animate-pulse-dot' : ''}`} style={{ background: locked || breakerOpen ? COLORS.signalRed : active ? COLORS.signalGreen : COLORS.textLow }} />
            {t.name}
            {t.sideEffect && <span className="text-signal-amber">⚡</span>}
            <span className="text-text-low">{t.latencyTicks}t</span>
            <span className="text-text-low">{Math.round(t.failureRate * 100)}%</span>
            {locked && <span className="bg-signal-red px-1 font-bold text-bg-0">429</span>}
            {!locked && breakerOpen && <span className="text-signal-red">OPEN</span>}
          </div>
        );
      })}
      {rpmLimit !== null && (
        <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-text-low">
          <span>RPM</span>
          <span className="flex h-2 overflow-hidden rounded-[1px] bg-bg-2" style={{ width: 60 }}>
            <span
              style={{
                width: `${Math.min(100, (rpmUsed / rpmLimit) * 100)}%`,
                background: rpmUsed / rpmLimit > 0.8 ? COLORS.signalRed : COLORS.signalAmber,
                transition: 'width 300ms linear',
              }}
            />
          </span>
          <span className={rpmUsed / rpmLimit > 0.8 ? 'text-signal-red' : 'text-text-mid'}>
            {rpmUsed}/{rpmLimit}
          </span>
        </div>
      )}
    </div>
  );
}

function MemoryStore({ sim }: { sim: Sim }) {
  useSimVersion(sim);
  return (
    <div className="pointer-events-auto w-[240px] rounded-[2px] border border-signal-teal/40 bg-bg-1/95" style={{ boxShadow: '0 0 24px rgba(87,199,184,.08)' }}>
      <header className="border-b border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-signal-teal">
        MEMORY STORE
      </header>
      <div className="max-h-[130px] overflow-y-auto p-1.5">
        {sim.memory.length === 0 && (
          <p className="px-1 py-1 font-mono text-[10px] text-text-low">empty — wire reads/writes in MEMORY tab</p>
        )}
        {sim.memory.slice(-8).map((m) => (
          <div key={`${m.key}:${m.tick}`} className="truncate px-1 py-0.5 font-mono text-[10px] text-text-mid" title={`${m.key} — ${m.value} (writer ${m.writerId})`}>
            {m.poisoned && m.detected ? (
              <span className="text-signal-red">☣ POISONED </span>
            ) : (
              <span className="text-signal-teal">◈ </span>
            )}
            {m.key} <span className="text-text-low">· {m.writerId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Center stage — the datacenter floor (game.md §4). */
export default function Stage({ sim, reducedMotion, fanout, selectedReqId, onAssign, onInspect }: StageProps) {
  useSimVersion(sim);
  const emptySlots = Math.max(0, sim.cfg.maxAgents - sim.agents.length);
  const budgetDead = !sim.budgetInfinite && sim.budget <= 0;

  return (
    <section className="rack-grid scanlines relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-0">
      <div className="relative flex-1 overflow-y-auto p-4">
        <div className="flex flex-wrap items-start gap-4">
          {sim.agents.map((agent) => (
            <div key={agent.id} style={budgetDead ? { opacity: 0.4 } : undefined}>
              <AgentNode
                sim={sim}
                agent={agent}
                reducedMotion={reducedMotion}
                assignTarget={selectedReqId !== null && agent.requestId === null}
                onClick={() => {
                  if (selectedReqId && agent.requestId === null) onAssign(agent.id);
                  else onInspect(agent.id);
                }}
              />
            </div>
          ))}
          {fanout &&
            Array.from({ length: emptySlots }).map((_, i) => (
              <button
                key={`slot-${i}`}
                type="button"
                onClick={() => sim.spawnAgent()}
                className="flex h-[210px] w-[300px] flex-none items-center justify-center rounded-[2px] border border-dashed border-line font-mono text-[11px] uppercase tracking-[0.12em] text-text-low transition-colors hover:border-signal-green hover:text-signal-green"
              >
                + SPAWN SLOT (−{sim.cfg.spawnCost} tok)
              </button>
            ))}
        </div>
        {sim.cfg.memoryEnabled && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pointer-events-none absolute right-3 top-3">
            <MemoryStore sim={sim} />
          </motion.div>
        )}
      </div>
      <ToolRail sim={sim} />
    </section>
  );
}
