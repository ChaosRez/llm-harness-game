/** Core simulation types for THE_HARNESS (game.md §0). Pure TS — no React. */

export type StageKind = 'IDLE' | 'ASSEMBLE' | 'INFER' | 'TOOL_CALL' | 'OBSERVE' | 'FINAL';

export type RetryPolicy = 'NONE' | 'FIXED' | 'BACKOFF';
export type DispatchPolicy = 'FIFO' | 'EDF' | 'MANUAL';
export type EvictionPolicy = 'DROP_OLDEST' | 'DROP_LARGEST' | 'PIN_FACTS';
export type ShedPolicy = 'NEVER' | 'SHED_LOWEST_VALUE' | 'SHED_OLDEST';

export type LogSev = 'info' | 'ok' | 'warn' | 'err' | 'mem';

export interface ToolSpec {
  id: string;
  name: string;
  latencyTicks: number;
  failureRate: number;
  sideEffect: boolean;
  /** tokens appended to context on success */
  outputTokens: number;
}

export interface RequestSpec {
  id: string;
  title: string;
  family: string;
  requiredFacts: number;
  requiredTools: string[];
  arrivalTick: number;
  deadlineSlack: number;
  tokenValue: number;
  difficulty: number;
  adversarial?: boolean;
}

export type RequestState =
  | 'queued'
  | 'assigned'
  | 'running'
  | 'complete'
  | 'expired'
  | 'failed'
  | 'contaminated';

export interface Request extends RequestSpec {
  state: RequestState;
  deadlineTick: number;
  assignedTo: string[];
  onTime?: boolean;
  note?: string;
}

export type BlockKind = 'system' | 'tool_specs' | 'scratch' | 'observation' | 'memory';

export interface ContextBlock {
  id: string;
  kind: BlockKind;
  label: string;
  tokens: number;
  pinned: boolean;
  tick: number;
  /** block carries a fact toward completion */
  fact?: boolean;
  /** block came from a poisoned memory read */
  poisoned?: boolean;
}

export interface PendingTool {
  toolId: string;
  ticksLeft: number;
  totalTicks: number;
  attempt: number;
  idemKey?: string;
  /** side-effect actually executed before a timeout — retrying duplicates it */
  executed?: boolean;
}

export interface Agent {
  id: string;
  idx: number;
  subagent: boolean;
  stage: StageKind;
  /** ticks spent stalled (backoff) */
  stalledUntil: number;
  requestId: string | null;
  ctx: ContextBlock[];
  facts: number;
  attempts: number;
  retries: number;
  pendingTool: PendingTool | null;
  contaminated: boolean;
  status: 'running' | 'stalled' | 'failed' | 'idle';
  /** per-block content flavor lines for the inspector */
  blockContent: Record<string, string>;
  trace: string[];
  burn: number;
  seq: number;
}

export interface MemoryEntry {
  key: string;
  value: string;
  writerId: string;
  family: string;
  tick: number;
  poisoned: boolean;
  detected: boolean;
}

export interface ToolState extends ToolSpec {
  failures: number;
  calls: number;
  breakerOpenUntil: number;
  lastFailTick: number;
  /** ticks of recent 429 lockout for display */
  locked429Until: number;
}

export interface LogLine {
  id: number;
  tick: number;
  text: string;
  sev: LogSev;
}

export interface Bulletin {
  id: string;
  body: string;
  manualAnchor?: string;
}

export interface Policies {
  alloc: { system: number; toolSpecs: number; scratch: number };
  dispatch: DispatchPolicy;
  retry: Record<string, { policy: RetryPolicy; maxRetries: number; timeoutTicks: number }>;
  breaker: { enabled: boolean; threshold: number; cooldownTicks: number };
  idempotency: Record<string, boolean>;
  shed: ShedPolicy;
  eviction: EvictionPolicy;
  /** auto-compact at this saturation % (0 = manual only) */
  compactionThresholdPct: number;
  memReadOnAssemble: boolean;
  memWriteOnFinal: boolean;
  writeValidation: boolean;
  namespacing: boolean;
  evalSamplePct: number;
}

export interface SimStats {
  completed: number;
  onTime: number;
  expired: number;
  failedReq: number;
  retries: number;
  truncations: number;
  pinnedEvictions: number;
  compactions: number;
  duplicateSideEffects: number;
  rateTrips: number;
  splits: number;
  contaminatedAnswers: number;
  poisonContained: boolean;
  poisonDetectedPreRead: boolean;
  peakAgents: number;
  tokensUsed: number;
  spawns: number;
}

export interface LevelResult {
  cleared: boolean;
  stars: number;
  failure?: string; // post-mortem key
}

export interface SimConfig {
  seed: number;
  levelId?: string;
  levelName?: string;
  contextWindow: number;
  maxAgents: number;
  spawnCost: number;
  budget: number; // use Infinity for sandbox ∞
  tools: ToolSpec[];
  requests: RequestSpec[];
  /** sandbox: generated arrivals instead of a fixed schedule */
  arrival?: {
    ratePerMin: number;
    difficulty: number;
    slackMin: number;
    slackMax: number;
    adversarialRate: number; // 0..0.3
  };
  rateLimitRpm: number | null;
  failureCorrelation: number; // 0..1
  memoryEnabled: boolean;
  chaos: boolean;
  /** sandbox toggle: include send_email / charge_card in generated requests */
  sideEffectsEnabled?: boolean;
  features: {
    reliability: boolean;
    memory: boolean;
    fanout: boolean;
    rateLimit: boolean;
    poison: boolean;
  };
}

export interface TickEvents {
  sounds: Array<'tick' | 'tool' | 'ok' | 'fail' | 'spawn' | '429'>;
  /** set when level resolves */
  result?: LevelResult;
}

export interface History {
  queueDepth: number[];
  burn: number[];
  completions: number[]; // completions in last 10 ticks (rolling value per tick)
  successRate: number[]; // 0..100 rolling
}
