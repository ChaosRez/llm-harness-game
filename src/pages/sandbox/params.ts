import { COLORS } from '@/lib/palette';

/** Full sandbox parameter space (sandbox.md §3). Persisted in th_sandbox_v1. */
export interface SandboxParams {
  arrivalRate: number; // req/min 0..12
  difficulty: number; // 1..5
  deadlineSlack: number; // ticks 2..20 (+ spread)
  adversarialRate: number; // 0..0.3
  contextWindow: number; // 2048..32768
  maxAgents: number; // 1..6
  spawnCost: number; // 0..3000
  budget: number; // 8000..100000
  budgetInfinite: boolean;
  toolFailureRate: number; // 0..0.6
  failureCorrelation: number; // 0..1
  toolLatency: number; // 1..8
  rateLimitRpm: number | null; // null = off, 10..120
  sideEffectTools: boolean;
  memoryEnabled: boolean;
  writeValidation: boolean;
  namespacing: boolean;
  evalSamplePct: number; // 0..100
  chaos: boolean;
}

export const DEFAULT_PARAMS: SandboxParams = {
  arrivalRate: 3,
  difficulty: 2,
  deadlineSlack: 40,
  adversarialRate: 0,
  contextWindow: 8192,
  maxAgents: 3,
  spawnCost: 1500,
  budget: 60000,
  budgetInfinite: false,
  toolFailureRate: 0.2,
  failureCorrelation: 0,
  toolLatency: 3,
  rateLimitRpm: null,
  sideEffectTools: false,
  memoryEnabled: true,
  writeValidation: false,
  namespacing: false,
  evalSamplePct: 0,
  chaos: false,
};

export interface Preset {
  id: string;
  name: string;
  desc: string;
  params: Partial<SandboxParams>;
}

export const PRESETS: Preset[] = [
  {
    id: 'calm',
    name: 'CALM TUESDAY',
    desc: 'defaults; everything nominal',
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: 'blackfriday',
    name: 'BLACK FRIDAY',
    desc: 'arrival 10/min, tight deadlines, tight budget — queueing & scheduling',
    params: { ...DEFAULT_PARAMS, arrivalRate: 10, deadlineSlack: 18, budget: 40000, maxAgents: 4 },
  },
  {
    id: 'flaky',
    name: 'FLAKY PROVIDER',
    desc: 'failure 45%, correlation 90%, RPM 30 — breaker & idempotency',
    params: { ...DEFAULT_PARAMS, toolFailureRate: 0.45, failureCorrelation: 0.9, rateLimitRpm: 30, sideEffectTools: true },
  },
  {
    id: 'adversarial',
    name: 'ADVERSARIAL USER',
    desc: 'adversarial 25%, memory on, validation off — containment',
    params: { ...DEFAULT_PARAMS, adversarialRate: 0.25, memoryEnabled: true, writeValidation: false, namespacing: false },
  },
  {
    id: 'chaos',
    name: '⚡ CHAOS',
    desc: 'randomized everything + fault injection every 20–40 ticks',
    params: {
      arrivalRate: 6,
      difficulty: 3,
      deadlineSlack: 30,
      adversarialRate: 0.15,
      contextWindow: 8192,
      maxAgents: 4,
      spawnCost: 1500,
      budget: 80000,
      budgetInfinite: false,
      toolFailureRate: 0.35,
      failureCorrelation: 0.7,
      toolLatency: 4,
      rateLimitRpm: 40,
      sideEffectTools: true,
      memoryEnabled: true,
      writeValidation: false,
      namespacing: false,
      evalSamplePct: 0,
      chaos: true,
    },
  },
];

/** sliders get a hover accent — amber in the lab (orchestration color) */
export const RACK_ACCENT = COLORS.signalAmber;
