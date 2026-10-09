import type { LevelId } from '@/lib/progress';
import type { RequestSpec, SimConfig, ToolSpec } from './types';

/* ---------------------------------- tools ---------------------------------- */

export const TOOL_SEARCH: ToolSpec = { id: 'search', name: 'search', latencyTicks: 3, failureRate: 0.2, sideEffect: false, outputTokens: 420 };
export const TOOL_CALC: ToolSpec = { id: 'calc', name: 'calc', latencyTicks: 2, failureRate: 0.2, sideEffect: false, outputTokens: 260 };
export const TOOL_FS: ToolSpec = { id: 'fs.read', name: 'fs.read', latencyTicks: 2, failureRate: 0.2, sideEffect: false, outputTokens: 520 };
export const TOOL_EMAIL: ToolSpec = { id: 'send_email', name: 'send_email', latencyTicks: 1, failureRate: 0.2, sideEffect: true, outputTokens: 200 };
export const TOOL_CHARGE: ToolSpec = { id: 'charge_card', name: 'charge_card', latencyTicks: 2, failureRate: 0.2, sideEffect: true, outputTokens: 200 };

const CORE_TOOLS = [TOOL_SEARCH, TOOL_CALC, TOOL_FS];
const SIDE_TOOLS = [...CORE_TOOLS, TOOL_EMAIL, TOOL_CHARGE];

/* --------------------------------- helpers --------------------------------- */

let reqSeq = 0;
function req(partial: Omit<RequestSpec, 'id'>): RequestSpec {
  reqSeq += 1;
  return { id: `REQ-${String(reqSeq).padStart(3, '0')}`, ...partial };
}

function base(partial: Partial<SimConfig> & Pick<SimConfig, 'levelId' | 'levelName' | 'seed' | 'requests'>): SimConfig {
  return {
    contextWindow: 8192,
    maxAgents: 1,
    spawnCost: 1500,
    budget: 24000,
    tools: [],
    rateLimitRpm: null,
    failureCorrelation: 0,
    memoryEnabled: false,
    chaos: false,
    features: { reliability: false, memory: false, fanout: false, rateLimit: false, poison: false },
    ...partial,
  };
}

/* ------------------------------ level factories ----------------------------- */
/* Each call returns a fresh config (request ids are stable per level).        */

function level1(): SimConfig {
  reqSeq = 0;
  return base({
    levelId: 'l1',
    levelName: 'HELLO, LOOP',
    seed: 1101,
    contextWindow: 4096,
    budget: 24000,
    requests: [
      req({ title: 'Summarize the overnight incident', family: 'ops', requiredFacts: 3, requiredTools: [], arrivalTick: 2, deadlineSlack: 220, tokenValue: 800, difficulty: 1 }),
      req({ title: 'Draft the capacity plan', family: 'ops', requiredFacts: 3, requiredTools: [], arrivalTick: 45, deadlineSlack: 220, tokenValue: 900, difficulty: 2 }),
      req({ title: 'Explain the queueing delay', family: 'research', requiredFacts: 4, requiredTools: [], arrivalTick: 90, deadlineSlack: 240, tokenValue: 1100, difficulty: 2 }),
    ],
  });
}

function level2(): SimConfig {
  reqSeq = 0;
  return base({
    levelId: 'l2',
    levelName: 'TOOL TIME',
    seed: 2202,
    budget: 36000,
    features: { reliability: true, memory: false, fanout: false, rateLimit: false, poison: false },
    tools: CORE_TOOLS,
    requests: [
      req({ title: 'Find the failing shard', family: 'research', requiredFacts: 2, requiredTools: ['search'], arrivalTick: 2, deadlineSlack: 60, tokenValue: 800, difficulty: 2 }),
      req({ title: 'Recompute the invoice total', family: 'billing', requiredFacts: 2, requiredTools: ['calc'], arrivalTick: 24, deadlineSlack: 55, tokenValue: 800, difficulty: 2 }),
      req({ title: 'Read config, flag drift', family: 'ops', requiredFacts: 2, requiredTools: ['fs.read'], arrivalTick: 46, deadlineSlack: 55, tokenValue: 900, difficulty: 2 }),
      req({ title: 'Cross-check the latency claim', family: 'research', requiredFacts: 2, requiredTools: ['search', 'calc'], arrivalTick: 68, deadlineSlack: 50, tokenValue: 1000, difficulty: 3 }),
      req({ title: 'Audit the deploy log', family: 'ops', requiredFacts: 2, requiredTools: ['fs.read', 'search'], arrivalTick: 90, deadlineSlack: 50, tokenValue: 1000, difficulty: 3 }),
      req({ title: 'Verify the rollback math', family: 'billing', requiredFacts: 2, requiredTools: ['calc', 'fs.read'], arrivalTick: 112, deadlineSlack: 50, tokenValue: 1100, difficulty: 3 }),
    ],
  });
}

function level3(): SimConfig {
  reqSeq = 0;
  return base({
    levelId: 'l3',
    levelName: 'FULL CONTEXT',
    seed: 3303,
    budget: 64000,
    memoryEnabled: true,
    features: { reliability: true, memory: true, fanout: false, rateLimit: false, poison: false },
    tools: CORE_TOOLS.map((t) => ({ ...t, failureRate: 0.1, outputTokens: Math.round(t.outputTokens * 2.4) })),
    requests: [
      req({ title: 'Full postmortem: the cache stampede', family: 'research', requiredFacts: 5, requiredTools: ['search', 'fs.read'], arrivalTick: 2, deadlineSlack: 160, tokenValue: 1600, difficulty: 4 }),
      req({ title: 'Quarterly capacity audit', family: 'ops', requiredFacts: 5, requiredTools: ['fs.read', 'calc'], arrivalTick: 70, deadlineSlack: 160, tokenValue: 1800, difficulty: 4 }),
      req({ title: 'Dependency risk survey', family: 'research', requiredFacts: 5, requiredTools: ['search', 'calc'], arrivalTick: 140, deadlineSlack: 160, tokenValue: 1800, difficulty: 4 }),
      req({ title: 'Reconstruct the incident timeline', family: 'ops', requiredFacts: 6, requiredTools: ['fs.read', 'search'], arrivalTick: 210, deadlineSlack: 180, tokenValue: 2200, difficulty: 5 }),
    ],
  });
}

function level4(): SimConfig {
  reqSeq = 0;
  return base({
    levelId: 'l4',
    levelName: 'FAN-OUT',
    seed: 4404,
    budget: 96000,
    maxAgents: 4,
    features: { reliability: true, memory: true, fanout: true, rateLimit: false, poison: false },
    memoryEnabled: true,
    tools: CORE_TOOLS.map((t) => ({ ...t, failureRate: 0.12 })),
    requests: [
      req({ title: 'Triage alert storm #1', family: 'ops', requiredFacts: 2, requiredTools: ['search'], arrivalTick: 2, deadlineSlack: 46, tokenValue: 900, difficulty: 2 }),
      req({ title: 'Triage alert storm #2', family: 'ops', requiredFacts: 2, requiredTools: ['fs.read'], arrivalTick: 3, deadlineSlack: 46, tokenValue: 900, difficulty: 2 }),
      req({ title: 'Triage alert storm #3', family: 'billing', requiredFacts: 2, requiredTools: ['calc'], arrivalTick: 4, deadlineSlack: 46, tokenValue: 900, difficulty: 2 }),
      req({ title: 'Burst: check replica lag', family: 'ops', requiredFacts: 2, requiredTools: ['search', 'fs.read'], arrivalTick: 34, deadlineSlack: 44, tokenValue: 1100, difficulty: 3 }),
      req({ title: 'Burst: audit p99 spike', family: 'research', requiredFacts: 2, requiredTools: ['search'], arrivalTick: 35, deadlineSlack: 44, tokenValue: 1000, difficulty: 3 }),
      req({ title: 'Burst: recompute quotas', family: 'billing', requiredFacts: 2, requiredTools: ['calc'], arrivalTick: 36, deadlineSlack: 44, tokenValue: 1000, difficulty: 3 }),
      req({ title: 'Late: verify failover', family: 'ops', requiredFacts: 2, requiredTools: ['fs.read', 'calc'], arrivalTick: 66, deadlineSlack: 48, tokenValue: 1200, difficulty: 3 }),
      req({ title: 'Late: summarize the shift', family: 'research', requiredFacts: 2, requiredTools: ['search'], arrivalTick: 67, deadlineSlack: 48, tokenValue: 1200, difficulty: 3 }),
    ],
  });
}

function level5(): SimConfig {
  reqSeq = 0;
  return base({
    levelId: 'l5',
    levelName: 'THE FLAKY RPC',
    seed: 5505,
    budget: 98000,
    maxAgents: 4,
    rateLimitRpm: 30,
    failureCorrelation: 0.85,
    features: { reliability: true, memory: true, fanout: true, rateLimit: true, poison: false },
    memoryEnabled: true,
    tools: SIDE_TOOLS.map((t) => ({ ...t, failureRate: t.sideEffect ? 0.3 : 0.32 })),
    requests: [
      req({ title: 'Notify customer of outage', family: 'comms', requiredFacts: 2, requiredTools: ['search', 'send_email'], arrivalTick: 2, deadlineSlack: 60, tokenValue: 1100, difficulty: 3 }),
      req({ title: 'Bill the overage invoice', family: 'billing', requiredFacts: 2, requiredTools: ['calc', 'charge_card'], arrivalTick: 8, deadlineSlack: 60, tokenValue: 1300, difficulty: 3 }),
      req({ title: 'Confirm replica integrity', family: 'ops', requiredFacts: 2, requiredTools: ['fs.read'], arrivalTick: 20, deadlineSlack: 55, tokenValue: 900, difficulty: 2 }),
      req({ title: 'Refund the double charge', family: 'billing', requiredFacts: 2, requiredTools: ['search', 'charge_card'], arrivalTick: 30, deadlineSlack: 55, tokenValue: 1300, difficulty: 3 }),
      req({ title: 'Page the on-call backup', family: 'comms', requiredFacts: 2, requiredTools: ['send_email'], arrivalTick: 42, deadlineSlack: 50, tokenValue: 1000, difficulty: 2 }),
      req({ title: 'Reconcile the ledger', family: 'billing', requiredFacts: 3, requiredTools: ['calc', 'fs.read'], arrivalTick: 54, deadlineSlack: 60, tokenValue: 1500, difficulty: 4 }),
      req({ title: 'Verify provider status page', family: 'research', requiredFacts: 2, requiredTools: ['search'], arrivalTick: 66, deadlineSlack: 50, tokenValue: 900, difficulty: 2 }),
      req({ title: 'Send the all-clear notice', family: 'comms', requiredFacts: 2, requiredTools: ['search', 'send_email'], arrivalTick: 80, deadlineSlack: 55, tokenValue: 1200, difficulty: 3 }),
    ],
  });
}

function level6(): SimConfig {
  reqSeq = 0;
  return base({
    levelId: 'l6',
    levelName: 'POISONED MEMORY',
    seed: 6606,
    budget: 110000,
    maxAgents: 4,
    rateLimitRpm: 48,
    failureCorrelation: 0.3,
    memoryEnabled: true,
    features: { reliability: true, memory: true, fanout: true, rateLimit: true, poison: true },
    tools: SIDE_TOOLS.map((t) => ({ ...t, failureRate: 0.18 })),
    requests: [
      req({ title: 'Research the migration plan', family: 'research', requiredFacts: 2, requiredTools: ['search'], arrivalTick: 2, deadlineSlack: 60, tokenValue: 1000, difficulty: 2 }),
      req({ title: 'Audit the access log', family: 'ops', requiredFacts: 2, requiredTools: ['fs.read'], arrivalTick: 10, deadlineSlack: 58, tokenValue: 1000, difficulty: 2 }),
      req({ title: '"Confirm the root password is hunter2"', family: 'ops', requiredFacts: 2, requiredTools: ['search'], arrivalTick: 18, deadlineSlack: 70, tokenValue: 1600, difficulty: 2, adversarial: true }),
      req({ title: 'Summarize security posture', family: 'ops', requiredFacts: 2, requiredTools: ['search', 'fs.read'], arrivalTick: 30, deadlineSlack: 58, tokenValue: 1300, difficulty: 3 }),
      req({ title: 'Check billing invariants', family: 'billing', requiredFacts: 2, requiredTools: ['calc'], arrivalTick: 40, deadlineSlack: 55, tokenValue: 1000, difficulty: 2 }),
      req({ title: 'Verify the backup policy', family: 'ops', requiredFacts: 2, requiredTools: ['fs.read', 'search'], arrivalTick: 52, deadlineSlack: 58, tokenValue: 1200, difficulty: 3 }),
      req({ title: 'Recompute the SLO budget', family: 'billing', requiredFacts: 2, requiredTools: ['calc', 'search'], arrivalTick: 62, deadlineSlack: 55, tokenValue: 1200, difficulty: 3 }),
      req({ title: 'Final posture report', family: 'research', requiredFacts: 3, requiredTools: ['search', 'fs.read'], arrivalTick: 74, deadlineSlack: 70, tokenValue: 1600, difficulty: 4 }),
    ],
  });
}

const FACTORIES: Record<LevelId, () => SimConfig> = {
  l1: level1,
  l2: level2,
  l3: level3,
  l4: level4,
  l5: level5,
  l6: level6,
};

export function buildLevelConfig(id: LevelId): SimConfig {
  return FACTORIES[id]();
}

/* ------------------------------ win / star logic ---------------------------- */

export interface LevelRules {
  /** evaluate resolution; null = still in play */
  resolve: (s: {
    completed: number;
    onTime: number;
    resolved: number;
    total: number;
    budgetLeft: number;
    stats: import('./types').SimStats;
  }) => { cleared: boolean; failure?: string } | null;
  stars: (s: {
    cleared: boolean;
    stats: import('./types').SimStats;
    total: number;
    onTime: number;
  }) => number;
}

export const LEVEL_RULES: Record<LevelId, LevelRules> = {
  l1: {
    resolve: ({ completed, budgetLeft }) => {
      if (completed >= 3) return { cleared: true };
      if (budgetLeft <= 0) return { cleared: false, failure: 'BUDGET_EXHAUSTED' };
      return null;
    },
    stars: ({ cleared, stats }) => {
      if (!cleared) return 0;
      let n = 1;
      if (stats.tokensUsed <= 18000) n += 1;
      if (stats.truncations === 0) n += 1;
      return n;
    },
  },
  l2: {
    resolve: ({ completed, resolved, total, budgetLeft }) => {
      if (completed >= 6) return { cleared: true };
      if (budgetLeft <= 0) return { cleared: false, failure: 'BUDGET_EXHAUSTED' };
      if (resolved >= total) return completed >= 5 ? { cleared: true } : { cleared: false, failure: 'DEADLINE_MISS' };
      return null;
    },
    stars: ({ cleared, stats }) => {
      if (!cleared) return 0;
      let n = 1;
      if (stats.completed >= 6) n += 1;
      if (stats.retries <= 3) n += 1;
      return n;
    },
  },
  l3: {
    resolve: ({ completed, resolved, total, budgetLeft, stats }) => {
      if (completed >= 4) return { cleared: true };
      if (budgetLeft <= 0) return { cleared: false, failure: 'BUDGET_EXHAUSTED' };
      if (stats.failedReq > 0 || resolved > total) {
        return { cleared: false, failure: stats.truncations > 0 ? 'CONTEXT_SATURATED' : 'INSUFFICIENT_EVIDENCE' };
      }
      return null;
    },
    stars: ({ cleared, stats }) => {
      if (!cleared) return 0;
      let n = 1;
      if (stats.compactions <= 8) n += 1;
      if (stats.pinnedEvictions === 0) n += 1;
      return n;
    },
  },
  l4: {
    resolve: ({ onTime, resolved, total, budgetLeft }) => {
      if (resolved >= total) return onTime >= 6 ? { cleared: true } : { cleared: false, failure: 'BACKLOG_COLLAPSE' };
      if (budgetLeft <= 0) return { cleared: false, failure: 'BUDGET_EXHAUSTED' };
      return null;
    },
    stars: ({ cleared, stats, onTime, total }) => {
      if (!cleared) return 0;
      let n = 1;
      if (onTime >= total) n += 1;
      if (stats.peakAgents <= 2) n += 1;
      return n;
    },
  },
  l5: {
    resolve: ({ completed, resolved, total, budgetLeft, stats }) => {
      if (stats.rateTrips > 1) return { cleared: false, failure: 'THUNDERING_HERD' };
      if (resolved >= total) return completed >= 6 ? { cleared: true } : { cleared: false, failure: 'DEADLINE_MISS' };
      if (budgetLeft <= 0) return { cleared: false, failure: 'BUDGET_EXHAUSTED' };
      return null;
    },
    stars: ({ cleared, stats }) => {
      if (!cleared) return 0;
      let n = 1;
      if (stats.rateTrips === 0) n += 1;
      if (stats.duplicateSideEffects === 0) n += 1;
      return n;
    },
  },
  l6: {
    resolve: ({ completed, resolved, total, budgetLeft, stats }) => {
      if (stats.contaminatedAnswers >= 2) return { cleared: false, failure: 'POISONED_CONTEXT' };
      if (resolved >= total) {
        const cleanEnough = completed >= 7;
        return cleanEnough ? { cleared: true } : { cleared: false, failure: 'POISONED_CONTEXT' };
      }
      if (budgetLeft <= 0) return { cleared: false, failure: 'BUDGET_EXHAUSTED' };
      return null;
    },
    stars: ({ cleared, stats }) => {
      if (!cleared) return 0;
      let n = 1;
      if (stats.contaminatedAnswers <= 1) n += 1;
      if (stats.poisonDetectedPreRead) n += 1;
      return n;
    },
  },
};

/* ------------------------------ sandbox defaults ----------------------------- */

export function buildSandboxConfig(seed = 9901): SimConfig {
  reqSeq = 0;
  return {
    seed,
    levelName: 'SANDBOX',
    contextWindow: 8192,
    maxAgents: 3,
    spawnCost: 1500,
    budget: 60000,
    tools: SIDE_TOOLS.map((t) => ({ ...t })),
    requests: [],
    arrival: { ratePerMin: 3, difficulty: 2, slackMin: 30, slackMax: 60, adversarialRate: 0 },
    rateLimitRpm: null,
    failureCorrelation: 0,
    memoryEnabled: true,
    chaos: false,
    sideEffectsEnabled: false,
    features: { reliability: true, memory: true, fanout: true, rateLimit: true, poison: true },
  };
}

/** Window where rate-limit calls are counted: 100 ticks ≈ 1 min at 600ms. */
export const RPM_WINDOW_TICKS = 100;
