import { Check } from 'lucide-react';
import type { Sim } from '@/game/engine';
import type { Policies } from '@/game/types';
import type { SandboxParams } from './params';

export interface ExperimentCtx {
  sim: Sim;
  params: SandboxParams;
  /** ticks at which rate-limit trips occurred */
  tripTicks: number[];
  /** tick when write validation was enabled (null = off) */
  validationSince: number | null;
}

export interface Experiment {
  id: string;
  title: string;
  line: string;
  verifyWhen: string;
  config: Partial<SandboxParams>;
  policies?: Partial<Policies>;
  retry?: { policy: 'FIXED' | 'BACKOFF' | 'NONE'; maxRetries: number };
  verify: (ctx: ExperimentCtx) => boolean;
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'retry-storm',
    title: 'Cause a retry storm',
    line: 'failure 40%, correlation 100%, retries FIXED×5, no breaker. Watch 429s cascade.',
    verifyWhen: '≥2 rate-limit trips in 60 ticks',
    config: { toolFailureRate: 0.4, failureCorrelation: 1, rateLimitRpm: 20, arrivalRate: 6, maxAgents: 4 },
    policies: { breaker: { enabled: false, threshold: 3, cooldownTicks: 10 } },
    retry: { policy: 'FIXED', maxRetries: 5 },
    verify: ({ tripTicks, sim }) => tripTicks.filter((t) => t > sim.tick - 60).length >= 2,
  },
  {
    id: 'starve-queue',
    title: 'Starve the queue',
    line: 'max agents 1, arrival 8/min. Watch depth climb, deadlines die.',
    verifyWhen: 'queue depth ≥ 6',
    config: { maxAgents: 1, arrivalRate: 8, difficulty: 3 },
    verify: ({ sim }) => sim.history.queueDepth.slice(-60).some((d) => d >= 6),
  },
  {
    id: 'charge-twice',
    title: 'Charge twice',
    line: 'side-effects on, idempotency off, failure 30%. Catch a duplicate charge_card.',
    verifyWhen: 'a DUPLICATE SIDE-EFFECT log line',
    config: { sideEffectTools: true, toolFailureRate: 0.3, arrivalRate: 5, difficulty: 2 },
    policies: { idempotency: { send_email: false, charge_card: false } },
    retry: { policy: 'FIXED', maxRetries: 3 },
    verify: ({ sim }) => sim.stats.duplicateSideEffects >= 1,
  },
  {
    id: 'poison-well',
    title: 'Poison the well',
    line: 'adversarial 20%, memory on, validation off, namespaces off. Catch a ☣ contaminated answer.',
    verifyWhen: 'a contaminated answer ships',
    config: { adversarialRate: 0.2, memoryEnabled: true, writeValidation: false, namespacing: false, arrivalRate: 5 },
    policies: { writeValidation: false, namespacing: false, memReadOnAssemble: true, memWriteOnFinal: true },
    verify: ({ sim }) => sim.stats.contaminatedAnswers >= 1,
  },
  {
    id: 'fix-well',
    title: 'Fix the well',
    line: 'same config + write validation ON. Verify zero contamination over 100 ticks.',
    verifyWhen: '100 clean ticks with validation on',
    config: { adversarialRate: 0.2, memoryEnabled: true, writeValidation: true, namespacing: false, arrivalRate: 5 },
    policies: { writeValidation: true, memReadOnAssemble: true, memWriteOnFinal: true },
    verify: ({ sim, validationSince }) =>
      validationSince !== null && sim.tick - validationSince >= 100 && sim.stats.contaminatedAnswers === 0,
  },
  {
    id: 'buy-out',
    title: 'Buy your way out',
    line: 'budget ∞, window 32k. Observe: money doesn’t fix throughput — only architecture does.',
    verifyWhen: 'success rate < 90% despite ∞ budget',
    config: { budgetInfinite: true, contextWindow: 32768, arrivalRate: 10, toolFailureRate: 0.45, maxAgents: 2, deadlineSlack: 24 },
    verify: ({ sim, params }) => {
      const resolved = sim.stats.completed + sim.stats.expired + sim.stats.failedReq + sim.stats.contaminatedAnswers;
      const sr = sim.history.successRate[sim.history.successRate.length - 1] ?? 100;
      return params.budgetInfinite && resolved >= 5 && sr < 90;
    },
  },
];

interface ExperimentsProps {
  done: Set<string>;
  onLoad: (e: Experiment) => void;
}

/** Guided experiments checklist (sandbox.md §6). */
export default function Experiments({ done, onLoad }: ExperimentsProps) {
  return (
    <div className="border-b border-line">
      <header className="px-3 py-2">
        <span className="eyebrow">EXPERIMENTS — break things on purpose</span>
      </header>
      <ul className="max-h-[220px] overflow-y-auto px-3 pb-2">
        {EXPERIMENTS.map((e) => {
          const isDone = done.has(e.id);
          return (
            <li key={e.id} className="relative mb-1.5 rounded-[2px] border border-line bg-bg-2 p-2 last:mb-0">
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 flex h-3.5 w-3.5 flex-none items-center justify-center rounded-[1px] border ${isDone ? 'border-signal-green bg-signal-green/20 text-signal-green' : 'border-line text-transparent'}`}>
                  <Check size={10} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-mono text-[12px] font-bold uppercase tracking-[0.06em] ${isDone ? 'text-signal-green line-through decoration-signal-green/60' : 'text-text-hi'}`}>
                    {e.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-text-mid">{e.line}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-low">verified when: {e.verifyWhen}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onLoad(e)}
                  className="flex-none rounded-[2px] border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-signal-amber hover:border-signal-amber"
                >
                  Load config
                </button>
              </div>
              {isDone && (
                <span className="absolute -right-1 -top-1 rotate-[-6deg] rounded-[2px] border border-signal-green px-1 font-mono text-[8px] font-bold uppercase text-signal-green">
                  verified
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
