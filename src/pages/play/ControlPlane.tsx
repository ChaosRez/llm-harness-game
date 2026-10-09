import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Sim } from '@/game/engine';
import { ALLOC_PRESETS } from '@/game/engine';
import { useSimVersion } from './useEngine';
import { Bar, Sparkline, fmt } from './widgets';
import { COLORS } from '@/lib/palette';
import type { DispatchPolicy, EvictionPolicy, RetryPolicy, ShedPolicy } from '@/game/types';

type TabId = 'dispatch' | 'reliability' | 'memory' | 'budgets';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'dispatch', label: 'DISPATCH' },
  { id: 'reliability', label: 'RELIABILITY' },
  { id: 'memory', label: 'MEMORY' },
  { id: 'budgets', label: 'BUDGETS' },
];

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="border-b border-line/60 px-3 py-2 last:border-b-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-low">{label}</span>
        {hint && <span className="font-mono text-[9px] text-text-low" title={hint}>?</span>}
      </div>
      {children}
    </div>
  );
}

function Slider({ value, min, max, step = 1, onChange, format, disabled }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-none bg-bg-2 accent-[#57E39A] disabled:opacity-40"
        aria-label="slider"
      />
      <span className="w-16 text-right font-mono text-[11px] tabular-nums text-text-hi">{format ? format(value) : value}</span>
    </div>
  );
}

function RadioRow<T extends string>({ options, value, onChange, desc }: { options: readonly T[]; value: T; onChange: (v: T) => void; desc?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          title={desc?.[o]}
          className={`rounded-[2px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
            value === o ? 'border-signal-green text-signal-green' : 'border-line text-text-mid hover:border-text-low hover:text-text-hi'
          }`}
        >
          {o.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} title={hint} className="flex w-full items-center justify-between py-0.5 text-left" aria-pressed={checked}>
      <span className="font-mono text-[11px] text-text-mid">{label}</span>
      <span className={`flex h-3.5 w-7 items-center rounded-full border px-0.5 transition-colors ${checked ? 'justify-end border-signal-green bg-signal-green/20' : 'justify-start border-line bg-bg-2'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${checked ? 'bg-signal-green' : 'bg-text-low'}`} />
      </span>
    </button>
  );
}

function AllocSliders({ sim }: { sim: Sim }) {
  useSimVersion(sim);
  const { alloc } = sim.policies;
  const total = alloc.system + alloc.toolSpecs + alloc.scratch;
  const over = total > sim.cfg.contextWindow;
  return (
    <>
      <Row label="CONTEXT ALLOCATOR — per-request window budget" hint="Rent: re-billed per INFER tick">
        <div className="mb-2 flex gap-1">
          {(Object.keys(ALLOC_PRESETS) as Array<keyof typeof ALLOC_PRESETS>).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => sim.setAlloc({ ...ALLOC_PRESETS[p] })}
              className="rounded-[2px] border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-mid hover:border-signal-green hover:text-text-hi"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Slider value={alloc.system} min={200} max={2400} step={50} onChange={(v) => sim.setAlloc({ ...alloc, system: v })} format={(v) => `${v} sys`} />
          <Slider value={alloc.toolSpecs} min={0} max={1600} step={50} onChange={(v) => sim.setAlloc({ ...alloc, toolSpecs: v })} format={(v) => `${v} tools`} />
          <Slider value={alloc.scratch} min={200} max={3200} step={50} onChange={(v) => sim.setAlloc({ ...alloc, scratch: v })} format={(v) => `${v} scr`} />
        </div>
        <div className="mt-1.5">
          <Bar value={Math.min(1, total / sim.cfg.contextWindow)} color={over ? COLORS.signalRed : COLORS.signalGreen} height={4} />
          <p className={`mt-0.5 font-mono text-[10px] tabular-nums ${over ? 'text-signal-red' : 'text-text-low'}`}>
            TOTAL {fmt(total)} / {fmt(sim.cfg.contextWindow)}{over ? ' — OVER WINDOW, instant truncation' : ''}
          </p>
        </div>
      </Row>
    </>
  );
}

interface ControlPlaneProps {
  sim: Sim;
  /** level number 1..6; 99 = sandbox (everything unlocked) */
  levelNum: number;
}

/** Right control plane, 300px (game.md §5). Tabs unlock by level. */
export default function ControlPlane({ sim, levelNum }: ControlPlaneProps) {
  useSimVersion(sim);
  const [tab, setTab] = useState<TabId>('dispatch');
  const sandbox = levelNum >= 99;
  const unlocked = (t: TabId): boolean => {
    if (sandbox) return true;
    if (t === 'reliability') return levelNum >= 2;
    if (t === 'memory') return levelNum >= 3;
    return true;
  };
  const advReliability = sandbox || levelNum >= 5;
  const advMemory = sandbox || levelNum >= 6;
  const fanout = sandbox || sim.cfg.features.fanout;

  const p = sim.policies;

  return (
    <aside className="flex h-full flex-col border-l border-line bg-bg-1">
      <nav className="flex flex-none border-b border-line" role="tablist" aria-label="Control plane">
        {TABS.map((t) => {
          const ok = unlocked(t.id);
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              disabled={!ok}
              title={ok ? undefined : `UNLOCKS AT L0${t.id === 'reliability' ? 2 : 3}`}
              onClick={() => setTab(t.id)}
              className={`flex-1 border-r border-line px-1 py-2 font-mono text-[10px] uppercase tracking-[0.1em] last:border-r-0 ${
                !ok ? 'cursor-not-allowed text-text-low/50' : tab === t.id ? 'bg-bg-2 text-signal-green' : 'text-text-low hover:text-text-hi'
              }`}
            >
              {ok ? t.label : `🔒 ${t.label.slice(0, 4)}…`}
            </button>
          );
        })}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === 'dispatch' && (
              <>
                {fanout && (
                  <Row label="DISPATCHER POLICY">
                    <RadioRow<DispatchPolicy>
                      options={['FIFO', 'EDF', 'MANUAL'] as const}
                      value={p.dispatch}
                      onChange={(v) => sim.setPolicies({ dispatch: v })}
                      desc={{ FIFO: 'first in, first out', EDF: 'earliest deadline first — best under mixed slack', MANUAL: 'click a queue card, then a node' }}
                    />
                  </Row>
                )}
                {fanout && (
                  <Row label="SUBAGENTS">
                    <button
                      type="button"
                      onClick={() => sim.spawnAgent()}
                      disabled={sim.agents.length >= sim.cfg.maxAgents || (!sim.budgetInfinite && sim.budget < sim.cfg.spawnCost)}
                      className="w-full rounded-[2px] bg-signal-green px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-bg-0 transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        sim.agents.length >= sim.cfg.maxAgents
                          ? `node cap reached (${sim.cfg.maxAgents})`
                          : !sim.budgetInfinite && sim.budget < sim.cfg.spawnCost
                            ? 'insufficient budget'
                            : 'spawn a fresh stateless node'
                      }
                    >
                      ▸ SPAWN SUBAGENT — −{fmt(sim.cfg.spawnCost)} tok
                    </button>
                    <p className="mt-1 font-mono text-[10px] text-text-low">
                      {sim.agents.length}/{sim.cfg.maxAgents} nodes online · own context, own burn
                    </p>
                  </Row>
                )}
                <AllocSliders sim={sim} />
              </>
            )}

            {tab === 'reliability' && (
              <>
                {sim.tools.length === 0 && <p className="p-3 font-mono text-[11px] text-text-low">no tools provisioned in this incident.</p>}
                {sim.tools.map((t) => {
                  const pol = p.retry[t.id];
                  return (
                    <Row key={t.id} label={`${t.name} — retry policy`} hint="a tool call is an RPC">
                      <RadioRow<RetryPolicy>
                        options={['NONE', 'FIXED', 'BACKOFF'] as const}
                        value={pol.policy}
                        onChange={(v) => sim.setRetry(t.id, { policy: v })}
                        desc={{ NONE: 'one fault = blind answer', FIXED: `retry up to ×${pol.maxRetries} immediately`, BACKOFF: 'wait 2^attempt ticks; best under correlated failure' }}
                      />
                      {pol.policy === 'FIXED' && (
                        <div className="mt-1.5">
                          <Slider value={pol.maxRetries} min={1} max={5} onChange={(v) => sim.setRetry(t.id, { maxRetries: v })} format={(v) => `×${v}`} />
                        </div>
                      )}
                      <div className="mt-1.5">
                        <Slider value={pol.timeoutTicks} min={2} max={10} onChange={(v) => sim.setRetry(t.id, { timeoutTicks: v })} format={(v) => `${v}t timeout`} />
                      </div>
                    </Row>
                  );
                })}
                {advReliability && (
                  <>
                    <Row label="CIRCUIT BREAKER" hint="fail fast instead of stampeding a down provider">
                      <Toggle
                        checked={p.breaker.enabled}
                        onChange={(v) => sim.setPolicies({ breaker: { ...p.breaker, enabled: v } })}
                        label={`open after ${p.breaker.threshold} failures, for ${p.breaker.cooldownTicks} ticks`}
                      />
                      {p.breaker.enabled && (
                        <div className="mt-1 space-y-1.5">
                          <Slider value={p.breaker.threshold} min={2} max={6} onChange={(v) => sim.setPolicies({ breaker: { ...p.breaker, threshold: v } })} format={(v) => `${v} fails`} />
                          <Slider value={p.breaker.cooldownTicks} min={5} max={20} onChange={(v) => sim.setPolicies({ breaker: { ...p.breaker, cooldownTicks: v } })} format={(v) => `${v}t open`} />
                        </div>
                      )}
                    </Row>
                    {sim.tools.some((t) => t.sideEffect) && (
                      <Row label="IDEMPOTENCY KEYS" hint="dedupe retries on a key; without it, a retried timeout charges twice">
                        {sim.tools.filter((t) => t.sideEffect).map((t) => (
                          <Toggle
                            key={t.id}
                            checked={p.idempotency[t.id] ?? false}
                            onChange={(v) => sim.setPolicies({ idempotency: { ...p.idempotency, [t.id]: v } })}
                            label={`${t.name} ${p.idempotency[t.id] ? '— keyed ✔' : '— UNKEYED ⚠'}`}
                          />
                        ))}
                      </Row>
                    )}
                    <Row label="LOAD SHED POLICY" hint="a queue under overload needs a policy">
                      <RadioRow<ShedPolicy>
                        options={['NEVER', 'SHED_LOWEST_VALUE', 'SHED_OLDEST'] as const}
                        value={p.shed}
                        onChange={(v) => sim.setPolicies({ shed: v })}
                      />
                    </Row>
                  </>
                )}
              </>
            )}

            {tab === 'memory' && (
              <>
                <Row label="EVICTION POLICY" hint="truncation is silent data loss">
                  <RadioRow<EvictionPolicy>
                    options={['DROP_OLDEST', 'DROP_LARGEST', 'PIN_FACTS'] as const}
                    value={p.eviction}
                    onChange={(v) => sim.setPolicies({ eviction: v })}
                    desc={{ DROP_OLDEST: 'evict oldest unpinned block', DROP_LARGEST: 'evict the biggest block', PIN_FACTS: 'pinned facts never evict' }}
                  />
                </Row>
                <Row label="COMPACTION — summarize oldest half → ¼ space">
                  <button
                    type="button"
                    onClick={() => sim.agents.forEach((a) => a.requestId && sim.compactAgent(a.id))}
                    className="w-full rounded-[2px] border border-signal-teal px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-signal-teal transition hover:bg-signal-teal/10"
                  >
                    ◈ COMPACT NOW (−600 tok)
                  </button>
                  <div className="mt-1.5">
                    <Slider
                      value={p.compactionThresholdPct}
                      min={0}
                      max={95}
                      step={5}
                      onChange={(v) => sim.setPolicies({ compactionThresholdPct: v })}
                      format={(v) => (v === 0 ? 'manual' : `auto @${v}%`)}
                    />
                  </div>
                </Row>
                <Row label="MEMORY WIRING" hint="the agent only uses what you wire in">
                  <Toggle checked={p.memReadOnAssemble} onChange={(v) => sim.setPolicies({ memReadOnAssemble: v })} label="read on assemble (−60 tok/read)" />
                  <Toggle checked={p.memWriteOnFinal} onChange={(v) => sim.setPolicies({ memWriteOnFinal: v })} label="write on final (−80 tok/write)" />
                </Row>
                {advMemory && (
                  <Row label="CONTAINMENT" hint="design for untrusted writes">
                    <Toggle checked={p.writeValidation} onChange={(v) => sim.setPolicies({ writeValidation: v })} label="write validation (+1 tick/write)" hint="schema-check memory writes; catches poison early" />
                    <Toggle checked={p.namespacing} onChange={(v) => sim.setPolicies({ namespacing: v })} label="namespace per request-family" hint="one family's writes can't leak into another's reads" />
                    <div className="mt-1">
                      <Slider value={p.evalSamplePct} min={0} max={100} step={5} onChange={(v) => sim.setPolicies({ evalSamplePct: v })} format={(v) => `eval ${v}%`} />
                      <p className="font-mono text-[9px] text-text-low">grade {p.evalSamplePct}% of outputs, −120 tok each — catches wrongness late</p>
                    </div>
                  </Row>
                )}
              </>
            )}

            {tab === 'budgets' && <BudgetsTab sim={sim} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}

function BudgetsTab({ sim }: { sim: Sim }) {
  useSimVersion(sim);
  const burnAvg = sim.history.burn.slice(-20).reduce((s, v) => s + v, 0) / Math.max(1, Math.min(20, sim.history.burn.length));
  const depleteTick = !sim.budgetInfinite && burnAvg > 0 ? sim.tick + Math.round(sim.budget / burnAvg) : null;
  const lastDeadline = sim.requests.reduce((m, r) => Math.max(m, r.deadlineTick), 0);
  const s = sim.stats;
  return (
    <>
      <Row label="GLOBAL BUDGET">
        <Bar value={sim.budgetInfinite ? 1 : Math.max(0, sim.budget / sim.cfg.budget)} flash={!sim.budgetInfinite} />
        <p className="mt-1 font-mono text-[11px] tabular-nums text-signal-amber">
          {sim.budgetInfinite ? '∞ (money is not your problem)' : `${fmt(Math.max(0, sim.budget))} / ${fmt(sim.cfg.budget)} tok`}
        </p>
      </Row>
      <Row label="BURN RATE tok/tick">
        <Sparkline data={sim.history.burn} width={240} height={40} color={COLORS.signalAmber} area />
        <p className="mt-1 font-mono text-[11px] tabular-nums text-text-mid">−{fmt(Math.round(burnAvg))} tok/tick (avg 20t)</p>
      </Row>
      <Row label="PROJECTED DEPLETION">
        <p className={`font-mono text-[13px] tabular-nums ${depleteTick !== null && depleteTick < lastDeadline ? 'text-signal-red' : 'text-text-hi'}`}>
          {depleteTick === null ? '— stable' : `DEPLETES @ TICK ${String(depleteTick).padStart(3, '0')}`}
        </p>
        {depleteTick !== null && lastDeadline > 0 && depleteTick < lastDeadline && (
          <p className="font-mono text-[10px] text-signal-red">before the last deadline — cut rent or finish faster</p>
        )}
      </Row>
      <Row label="LEDGER">
        <div className="grid grid-cols-2 gap-x-3 font-mono text-[10px] tabular-nums text-text-mid">
          <span>value earned</span><span className="text-right text-signal-green">{fmt(sim.valueEarned)}</span>
          <span>tokens used</span><span className="text-right">{fmt(s.tokensUsed)}</span>
          <span>retries</span><span className="text-right">{s.retries}</span>
          <span>truncations</span><span className="text-right">{s.truncations}</span>
          <span>compactions</span><span className="text-right">{s.compactions}</span>
          <span>rate-limit trips</span><span className="text-right">{s.rateTrips}</span>
          <span>dup side-effects</span><span className="text-right">{s.duplicateSideEffects}</span>
          <span>peak agents</span><span className="text-right">{s.peakAgents}</span>
        </div>
      </Row>
    </>
  );
}
