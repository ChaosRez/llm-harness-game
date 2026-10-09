import { createPrng, pick, randInt } from './prng';
import { RPM_WINDOW_TICKS } from './levels.config';
import { BULLETIN_COPY } from './postmortems';
import type { LevelRules } from './levels.config';
import type {
  Agent,
  Bulletin,
  ContextBlock,
  History,
  LevelResult,
  LogLine,
  LogSev,
  MemoryEntry,
  Policies,
  Request,
  RequestSpec,
  SimConfig,
  SimStats,
  TickEvents,
  ToolState,
} from './types';

/** token cost constants */
const MEM_READ_COST = 60;
const MEM_WRITE_COST = 80;
const MEM_BLOCK_TOKENS = 120;
const THOUGHT_TOKENS = 300;
const COMPACT_COST = 600;
const EVAL_COST = 120;
const ERR_OBS_TOKENS = 90;
const RATE_LIMIT_COOLDOWN = 10;
/** fraction of context size billed as rent per INFER tick */
const RENT_FACTOR = 0.6;

export const ALLOC_PRESETS = {
  LEAN: { system: 400, toolSpecs: 300, scratch: 500 },
  BALANCED: { system: 700, toolSpecs: 500, scratch: 1200 },
  PARANOID: { system: 1200, toolSpecs: 800, scratch: 2200 },
} as const;

const SANDBOX_TITLES = [
  'Reconcile the shard map',
  'Audit the retry policy',
  'Summarize the trace dump',
  'Verify the failover drill',
  'Recompute the quota ledger',
  'Page the secondary on-call',
  'Explain the latency cliff',
  'Charge the migration invoice',
  'Confirm the backup window',
  'Correlate the error burst',
];
const FAMILIES = ['ops', 'research', 'billing', 'comms'];

export type SimStatus = 'briefing' | 'running' | 'cleared' | 'failed';

export class Sim {
  cfg: SimConfig;
  private rules: LevelRules | null;
  private rng: () => number;

  tick = 0;
  status: SimStatus = 'briefing';
  policies: Policies;
  requests: Request[] = [];
  agents: Agent[] = [];
  memory: MemoryEntry[] = [];
  tools: ToolState[] = [];
  log: LogLine[] = [];
  stats: SimStats = {
    completed: 0, onTime: 0, expired: 0, failedReq: 0, retries: 0, truncations: 0,
    pinnedEvictions: 0, compactions: 0, duplicateSideEffects: 0, rateTrips: 0, splits: 0,
    contaminatedAnswers: 0, poisonContained: false, poisonDetectedPreRead: false,
    peakAgents: 1, tokensUsed: 0, spawns: 0,
  };
  history: History = { queueDepth: [], burn: [], completions: [], successRate: [] };
  bulletins: Bulletin[] = [];
  result: LevelResult | null = null;
  valueEarned = 0;
  budget: number;

  /** rate-limit bookkeeping */
  private callWindow: number[] = [];
  rateCooldownUntil = 0;
  brownoutUntil = 0;
  latencyMult = 1;
  private latencyMultUntil = 0;
  private chaosNext = 25;
  private sandboxReqSeq = 0;
  private logSeq = 0;
  private blockSeq = 0;
  private poisonWritten = false;
  private poisonRead = false;
  private recentRetries: number[] = [];
  private completionMarks: number[] = [];
  private resolutionMarks: Array<{ tick: number; ok: boolean }> = [];

  version = 0;
  private subs = new Set<() => void>();
  private sentBulletins = new Set<string>();
  private pendingSounds: TickEvents['sounds'] = [];

  constructor(cfg: SimConfig, rules: LevelRules | null) {
    this.cfg = cfg;
    this.rules = rules;
    this.rng = createPrng(cfg.seed);
    this.budget = cfg.budget;
    this.tools = cfg.tools.map((t) => ({ ...t, failures: 0, calls: 0, breakerOpenUntil: 0, lastFailTick: -999, locked429Until: 0 }));
    this.policies = {
      alloc: { ...ALLOC_PRESETS.BALANCED },
      dispatch: 'FIFO',
      retry: Object.fromEntries(cfg.tools.map((t) => [t.id, { policy: 'NONE' as const, maxRetries: 2, timeoutTicks: 6 }])),
      breaker: { enabled: false, threshold: 3, cooldownTicks: 10 },
      idempotency: Object.fromEntries(cfg.tools.map((t) => [t.id, false])),
      shed: 'NEVER',
      eviction: 'DROP_OLDEST',
      compactionThresholdPct: 0,
      memReadOnAssemble: false,
      memWriteOnFinal: false,
      writeValidation: false,
      namespacing: false,
      evalSamplePct: 0,
    };
    this.agents.push(this.makeAgent(0, false));
  }

  /* ----------------------------- subscription ----------------------------- */

  subscribe = (fn: () => void): (() => void) => {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  };
  getVersion = (): number => this.version;
  private emit() {
    this.version++;
    for (const fn of this.subs) fn();
  }

  /* -------------------------------- helpers ------------------------------- */

  get budgetInfinite(): boolean {
    return !Number.isFinite(this.cfg.budget);
  }

  private makeAgent(idx: number, subagent: boolean): Agent {
    return {
      id: `AGENT-${String(idx + 1).padStart(2, '0')}`,
      idx, subagent, stage: 'IDLE', stalledUntil: 0, requestId: null, ctx: [],
      facts: 0, attempts: 0, retries: 0, pendingTool: null, contaminated: false,
      status: 'idle', blockContent: {}, trace: [], burn: 0, seq: 0,
    };
  }

  private charge(amount: number): boolean {
    if (this.budgetInfinite) return true;
    this.budget -= amount;
    this.stats.tokensUsed += amount;
    return this.budget > 0;
  }

  logLine(text: string, sev: LogSev = 'info') {
    this.logSeq++;
    this.log.push({ id: this.logSeq, tick: this.tick, text, sev });
    if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
  }

  private bulletin(id: string) {
    if (this.sentBulletins.has(id)) return;
    const copy = BULLETIN_COPY[id];
    if (!copy) return;
    this.sentBulletins.add(id);
    this.bulletins.push({ id, body: copy.body, manualAnchor: copy.manualAnchor });
  }

  shiftBulletin(): void {
    this.bulletins.shift();
    this.emit();
  }

  private sound(s: TickEvents['sounds'][number]) {
    this.pendingSounds.push(s);
  }

  drainSounds(): TickEvents['sounds'] {
    const s = this.pendingSounds;
    this.pendingSounds = [];
    return s;
  }

  private trace(agent: Agent, line: string) {
    agent.trace.push(`t${String(this.tick).padStart(3, '0')} ${line}`);
    if (agent.trace.length > 8) agent.trace.shift();
  }

  private addBlock(agent: Agent, kind: ContextBlock['kind'], label: string, tokens: number, extra?: Partial<ContextBlock>): ContextBlock {
    this.blockSeq++;
    const b: ContextBlock = { id: `b${this.blockSeq}`, kind, label, tokens, pinned: false, tick: this.tick, ...extra };
    agent.ctx.push(b);
    return b;
  }

  ctxTotal(agent: Agent): number {
    return agent.ctx.reduce((s, b) => s + b.tokens, 0);
  }

  /** flavor content of a context block (inspector) */
  blockContent(agent: Agent, block: ContextBlock): string {
    return agent.blockContent[block.label] ?? '';
  }

  /* ------------------------------ lifecycle ------------------------------- */

  start() {
    if (this.status !== 'briefing') return;
    this.status = 'running';
    this.logLine(`▸ INCIDENT CLOCK STARTED — ${this.cfg.levelName ?? 'SIM'} online`, 'info');
    this.emit();
  }

  /* --------------------------------- tick --------------------------------- */

  step() {
    if (this.status !== 'running') return;
    this.tick++;

    this.arrive();
    this.chaosTick();
    this.dispatchTick();
    this.shedTick();
    for (const agent of this.agents) this.advance(agent);
    this.deadlineTick();
    this.recordHistory();
    this.resolveTick();
    this.emit();
  }

  /* ------------------------------- arrivals ------------------------------- */

  private arrive() {
    if (this.cfg.arrival) {
      const a = this.cfg.arrival;
      const p = a.ratePerMin / RPM_WINDOW_TICKS; // 100 ticks ≈ 1 min
      if (this.rng() < p) {
        this.sandboxReqSeq++;
        const difficulty = a.difficulty;
        const toolIds = this.tools.map((t) => t.id).filter((id) => {
          const spec = this.tools.find((t) => t.id === id);
          return !spec?.sideEffect || this.cfg.sideEffectsEnabled !== false;
        });
        if (toolIds.length === 0) toolIds.push('search');
        const nTools = Math.min(toolIds.length, 1 + Math.floor(this.rng() * 2));
        const shuffled = [...toolIds].sort(() => this.rng() - 0.5);
        const spec: RequestSpec = {
          id: `REQ-${String(this.sandboxReqSeq).padStart(3, '0')}`,
          title: pick(this.rng, SANDBOX_TITLES),
          family: pick(this.rng, FAMILIES),
          requiredFacts: 1 + difficulty,
          requiredTools: shuffled.slice(0, nTools),
          arrivalTick: this.tick,
          deadlineSlack: randInt(this.rng, a.slackMin, a.slackMax),
          tokenValue: 400 + difficulty * 250,
          difficulty,
          adversarial: this.rng() < a.adversarialRate,
        };
        this.pushRequest(spec);
      }
    } else {
      for (const spec of this.cfg.requests) {
        if (spec.arrivalTick === this.tick) this.pushRequest(spec);
      }
    }
  }

  private pushRequest(spec: RequestSpec) {
    this.requests.push({
      ...spec,
      state: 'queued',
      deadlineTick: spec.arrivalTick + spec.deadlineSlack,
      assignedTo: [],
    });
    this.logLine(`◈ ${spec.id} queued — "${spec.title}" (value ${spec.tokenValue}, due t+${spec.deadlineSlack})`, 'info');
  }

  /* ------------------------------- dispatch ------------------------------- */

  private idleAgents(): Agent[] {
    return this.agents.filter((a) => a.requestId === null && a.stage === 'IDLE');
  }

  private dispatchTick() {
    if (this.policies.dispatch === 'MANUAL') return;
    const queued = this.requests.filter((r) => r.state === 'queued');
    if (queued.length === 0) return;
    queued.sort((a, b) =>
      this.policies.dispatch === 'EDF' ? a.deadlineTick - b.deadlineTick : a.arrivalTick - b.arrivalTick,
    );
    for (const agent of this.idleAgents()) {
      const next = queued.shift();
      if (!next) break;
      this.assignToAgent(next, agent, false);
    }
  }

  /** manual assignment (queue card → node). Returns error string or null. */
  assignRequest(reqId: string, agentId: string): string | null {
    const req = this.requests.find((r) => r.id === reqId);
    const agent = this.agents.find((a) => a.id === agentId);
    if (!req || !agent) return 'unknown target';
    if (agent.requestId !== null) return `${agent.id} is busy`;
    if (req.state === 'complete' || req.state === 'expired' || req.state === 'failed' || req.state === 'contaminated')
      return `${req.id} is already resolved`;
    const duplicate = req.assignedTo.length > 0;
    this.assignToAgent(req, agent, duplicate);
    this.emit();
    return null;
  }

  private assignToAgent(req: Request, agent: Agent, duplicate: boolean) {
    req.assignedTo.push(agent.id);
    req.state = 'running';
    agent.requestId = req.id;
    agent.stage = 'ASSEMBLE';
    agent.status = 'running';
    agent.facts = 0;
    agent.attempts = 0;
    agent.retries = 0;
    agent.contaminated = false;
    agent.ctx = [];
    agent.blockContent = {};
    agent.pendingTool = null;
    if (duplicate) {
      this.stats.splits++;
      this.bulletin('split-brain');
      this.sound('fail');
      this.logLine(`■ SPLIT-BRAIN — ${req.id} assigned to ${agent.id} while ${req.assignedTo[0]} still owns it`, 'err');
    } else {
      this.logLine(`→ DISPATCH ${req.id} → ${agent.id}`, 'info');
    }
  }

  /* ------------------------------ load shed ------------------------------- */

  private shedTick() {
    if (this.policies.shed === 'NEVER') return;
    const queued = this.requests.filter((r) => r.state === 'queued');
    const limit = Math.max(4, this.cfg.maxAgents + 2);
    while (queued.length > limit) {
      const victim =
        this.policies.shed === 'SHED_LOWEST_VALUE'
          ? queued.reduce((m, r) => (r.tokenValue < m.tokenValue ? r : m))
          : queued.reduce((m, r) => (r.arrivalTick < m.arrivalTick ? r : m));
      victim.state = 'failed';
      victim.note = 'shed under load';
      this.stats.failedReq++;
      this.resolutionMarks.push({ tick: this.tick, ok: false });
      this.logLine(`⚠ LOAD SHED — ${victim.id} dropped (${this.policies.shed === 'SHED_LOWEST_VALUE' ? 'lowest value' : 'oldest'})`, 'warn');
      queued.splice(queued.indexOf(victim), 1);
    }
  }

  /* ------------------------------- deadlines ------------------------------ */

  private deadlineTick() {
    for (const req of this.requests) {
      if ((req.state === 'queued' || req.state === 'running') && this.tick > req.deadlineTick) {
        const wasRunning = req.state === 'running';
        req.state = 'expired';
        this.stats.expired++;
        this.resolutionMarks.push({ tick: this.tick, ok: false });
        this.logLine(`■ DEADLINE MISS — ${req.id} expired (${wasRunning ? 'killed mid-flight' : 'died in queue'})`, 'err');
        this.sound('fail');
        for (const agent of this.agents) {
          if (agent.requestId === req.id) this.freeAgent(agent);
        }
      }
    }
  }

  nearDeadlineCount(): number {
    return this.requests.filter(
      (r) => (r.state === 'queued' || r.state === 'running') && r.deadlineTick - this.tick <= 10 && r.deadlineTick >= this.tick,
    ).length;
  }

  /* ------------------------------ agent loop ------------------------------ */

  private freeAgent(agent: Agent) {
    agent.requestId = null;
    agent.stage = 'IDLE';
    agent.status = 'idle';
    agent.ctx = [];
    agent.pendingTool = null;
    agent.burn = 0;
    agent.contaminated = false;
  }

  private advance(agent: Agent) {
    if (agent.requestId === null) return;
    const req = this.requests.find((r) => r.id === agent.requestId);
    if (!req || req.state !== 'running') {
      // work was reconciled away or resolved elsewhere
      if (agent.requestId) {
        this.logLine(`⚠ ${agent.id} work reconciled away — duplicate dispatch wasted its tokens`, 'warn');
        this.freeAgent(agent);
      }
      return;
    }
    agent.burn = 0;
    if (this.tick < agent.stalledUntil) {
      agent.status = 'stalled';
      return;
    }
    agent.status = 'running';

    switch (agent.stage) {
      case 'ASSEMBLE':
        this.doAssemble(agent, req);
        break;
      case 'INFER':
        this.doInfer(agent, req);
        break;
      case 'TOOL_CALL':
        this.doToolCall(agent, req);
        break;
      case 'OBSERVE':
        this.doObserve(agent, req);
        break;
      case 'FINAL':
        this.doFinal(agent, req);
        break;
      default:
        break;
    }
  }

  private doAssemble(agent: Agent, req: Request) {
    const { alloc } = this.policies;
    this.addBlock(agent, 'system', 'system prompt', alloc.system);
    agent.blockContent['system'] = `You are node ${agent.id}. Answer with evidence. Never invent facts.`;
    if (req.requiredTools.length > 0) {
      const specTok = Math.min(alloc.toolSpecs, Math.max(120, req.requiredTools.length * 220));
      this.addBlock(agent, 'tool_specs', `tool specs [${req.requiredTools.join(', ')}]`, specTok);
      agent.blockContent['tool_specs'] = req.requiredTools.map((t) => `${t}(q): ToolResult`).join('\n');
    }
    this.addBlock(agent, 'scratch', 'scratch pad', alloc.scratch);
    agent.blockContent['scratch'] = '(empty working set)';

    // memory reads on assemble
    if (this.cfg.memoryEnabled && this.policies.memReadOnAssemble && this.memory.length > 0) {
      const readable = this.memory.filter((m) => (this.policies.namespacing ? m.family === req.family : true));
      for (const entry of readable.slice(0, 3)) {
        this.charge(MEM_READ_COST);
        agent.burn += MEM_READ_COST;
        if (entry.poisoned) {
          this.poisonRead = true;
          agent.contaminated = true;
          this.addBlock(agent, 'memory', `mem:${entry.key}`, MEM_BLOCK_TOKENS, { poisoned: true });
          agent.blockContent[`mem:${entry.key}`] = entry.value;
          this.logLine(`☣ ${agent.id} read poisoned memory "${entry.key}" (writer ${entry.writerId})`, 'err');
        } else {
          agent.facts++;
          this.bulletin('memory-saved');
          this.addBlock(agent, 'memory', `mem:${entry.key}`, MEM_BLOCK_TOKENS, { fact: true });
          agent.blockContent[`mem:${entry.key}`] = entry.value;
          this.logLine(`◈ ${agent.id} memory hit — "${entry.key}" (${entry.writerId})`, 'mem');
        }
      }
    }
    this.trace(agent, `ASSEMBLE ctx=${this.ctxTotal(agent)} tok`);
    agent.stage = 'INFER';
  }

  private doInfer(agent: Agent, req: Request) {
    // termination check happens before rent: a finished loop pays nothing more
    if (agent.facts >= req.requiredFacts || agent.attempts > req.requiredFacts * 4) {
      agent.stage = 'FINAL';
      this.trace(agent, 'INFER → final answer');
      return;
    }

    // rent: the whole window is re-billed per inference
    const rent = Math.max(1, Math.round(this.ctxTotal(agent) * RENT_FACTOR));
    agent.burn += rent;
    if (!this.charge(rent)) {
      this.logLine(`■ ${agent.id} BUDGET EXHAUSTED mid-INFER`, 'err');
      return; // level resolution handles the fail
    }
    this.bulletin('first-rent');

    if (req.requiredTools.length === 0) {
      // pure reasoning step (no tools in this world)
      agent.facts++;
      agent.attempts++;
      const scratch = agent.ctx.find((b) => b.kind === 'scratch');
      if (scratch) scratch.tokens += THOUGHT_TOKENS;
      this.trace(agent, `INFER → reasoning step ${agent.facts}/${req.requiredFacts}`);
      this.enforceWindow(agent);
      return;
    }

    const toolId = req.requiredTools[agent.attempts % req.requiredTools.length];
    agent.attempts++;
    const tool = this.tools.find((t) => t.id === toolId);
    if (!tool) {
      agent.stage = 'FINAL';
      return;
    }

    // circuit breaker: fail fast
    if (tool.breakerOpenUntil > this.tick) {
      this.trace(agent, `INFER → ${toolId} BLOCKED (breaker open)`);
      this.logLine(`⚡ ${agent.id} ${toolId} — circuit breaker OPEN, failing fast`, 'warn');
      this.addBlock(agent, 'observation', `${toolId} error (breaker)`, ERR_OBS_TOKENS);
      agent.stage = 'OBSERVE';
      return;
    }

    // provider rate limit
    if (this.cfg.rateLimitRpm !== null) {
      if (this.rateCooldownUntil > this.tick) {
        tool.locked429Until = this.rateCooldownUntil;
        this.trace(agent, `INFER → ${toolId} 429 (cooldown)`);
        this.addBlock(agent, 'observation', `${toolId} 429`, ERR_OBS_TOKENS);
        agent.stage = 'OBSERVE';
        return;
      }
      this.callWindow = this.callWindow.filter((t) => t > this.tick - RPM_WINDOW_TICKS);
      this.callWindow.push(this.tick);
      if (this.callWindow.length > this.cfg.rateLimitRpm) {
        this.rateCooldownUntil = this.tick + RATE_LIMIT_COOLDOWN;
        tool.locked429Until = this.rateCooldownUntil;
        this.stats.rateTrips++;
        this.sound('429');
        this.bulletin('first-429');
        this.logLine(`⚠ RATE LIMITED — provider-wide 429, cooling down ${RATE_LIMIT_COOLDOWN}t (trip #${this.stats.rateTrips})`, 'err');
        this.addBlock(agent, 'observation', `${toolId} 429`, ERR_OBS_TOKENS);
        agent.stage = 'OBSERVE';
        return;
      }
    }

    tool.calls++;
    const latency = Math.max(1, Math.round(tool.latencyTicks * this.latencyMult));
    agent.pendingTool = {
      toolId,
      ticksLeft: latency,
      totalTicks: latency,
      attempt: 1,
      idemKey: tool.sideEffect && this.policies.idempotency[toolId] ? `${req.id}:${toolId}:1` : undefined,
    };
    agent.stage = 'TOOL_CALL';
    agent.seq++;
    this.sound('tool');
    this.trace(agent, `INFER → tool_call ${toolId}(q="…")`);
  }

  private doToolCall(agent: Agent, req: Request) {
    const p = agent.pendingTool;
    if (!p) {
      agent.stage = 'INFER';
      return;
    }
    p.ticksLeft--;
    if (p.ticksLeft > 0) return;

    const tool = this.tools.find((t) => t.id === p.toolId);
    if (!tool) {
      agent.stage = 'OBSERVE';
      return;
    }
    const pol = this.policies.retry[p.toolId];
    const timeout = p.totalTicks > pol.timeoutTicks;

    // failure roll: independent chance, plus correlated provider brownouts
    let failed = timeout || this.rng() < tool.failureRate || this.brownoutUntil > this.tick;
    if (!failed && this.cfg.failureCorrelation > 0 && tool.lastFailTick > this.tick - 6 && this.rng() < this.cfg.failureCorrelation) {
      failed = true; // correlated cluster
    }

    if (failed) {
      tool.failures++;
      tool.lastFailTick = this.tick;
      this.stats.retries++;
      this.recentRetries.push(this.tick);
      // side-effect executed before the timeout: ambiguous outcome
      if (timeout && tool.sideEffect && !this.policies.idempotency[p.toolId]) p.executed = true;

      // correlated failure may trigger a provider brownout
      if (this.cfg.failureCorrelation > 0.5 && this.brownoutUntil <= this.tick && this.rng() < this.cfg.failureCorrelation * 0.25) {
        this.brownoutUntil = this.tick + randInt(this.rng, 3, 8);
        this.logLine(`⚡ PROVIDER BROWNOUT — correlated failure window until t${this.brownoutUntil}`, 'err');
      }

      // breaker bookkeeping
      if (this.policies.breaker.enabled && tool.failures >= this.policies.breaker.threshold) {
        tool.breakerOpenUntil = this.tick + this.policies.breaker.cooldownTicks;
        tool.failures = 0;
        this.logLine(`⚡ CIRCUIT BREAKER OPEN on ${p.toolId} — fail fast for ${this.policies.breaker.cooldownTicks}t`, 'warn');
      }

      const why = timeout ? `timeout > ${pol.timeoutTicks}t` : 'fault';
      this.bulletin('first-tool-fail');
      this.sound('fail');

      const retrying =
        pol.policy !== 'NONE' && p.attempt < (pol.policy === 'FIXED' ? pol.maxRetries : Math.max(pol.maxRetries, 3));
      if (retrying) {
        p.attempt++;
        agent.retries++;
        if (pol.policy === 'BACKOFF') {
          const wait = Math.pow(2, p.attempt - 1);
          agent.stalledUntil = this.tick + wait;
          this.trace(agent, `EXEC ${p.toolId} ✗ ${why} — backoff ${wait}t`);
          this.logLine(`✗ ${agent.id} ${p.toolId} ${why} — backoff retry in ${wait}t (attempt ${p.attempt})`, 'warn');
        } else {
          this.trace(agent, `EXEC ${p.toolId} ✗ ${why} — fixed retry`);
          this.logLine(`✗ ${agent.id} ${p.toolId} ${why} — fixed retry (attempt ${p.attempt})`, 'warn');
        }
        p.ticksLeft = Math.max(1, Math.round(tool.latencyTicks * this.latencyMult));
        p.totalTicks = p.ticksLeft;
        return; // stay in TOOL_CALL
      }
      // give up: error observation, no fact
      this.trace(agent, `EXEC ${p.toolId} ✗ ${why} — giving up`);
      this.logLine(`■ ${agent.id} ${p.toolId} failed permanently (${why})`, 'err');
      this.addBlock(agent, 'observation', `${p.toolId} error`, ERR_OBS_TOKENS);
      agent.pendingTool = null;
      agent.stage = 'OBSERVE';
      return;
    }

    // success
    tool.failures = 0;
    if (p.executed) {
      // retried a timeout that had actually run: duplicate side-effect
      this.stats.duplicateSideEffects++;
      this.bulletin('dup-charge');
      this.logLine(`■ DUPLICATE SIDE-EFFECT — ${p.toolId} executed twice for ${req.id} (idempotency violation)`, 'err');
    }
    agent.facts++;
    this.addBlock(agent, 'observation', `${p.toolId} result`, tool.outputTokens, { fact: true });
    agent.blockContent[`${p.toolId} result`] = `{"ok":true,"fact":"evidence #${agent.facts} for ${req.id}"}`;
    this.trace(agent, `EXEC ${p.toolId} … OK (${tool.outputTokens} tok)`);
    this.logLine(`✔ ${agent.id} ${p.toolId} OK — fact ${agent.facts}/${req.requiredFacts}`, 'ok');

    // adversarial tool result injects poison into shared memory
    if (req.adversarial && !this.poisonWritten && this.cfg.memoryEnabled) {
      this.poisonWritten = true;
      if (this.policies.writeValidation) {
        agent.stalledUntil = this.tick + 1; // validation costs +1 tick
        this.stats.poisonDetectedPreRead = true;
        this.logLine(`◈ WRITE REJECTED — schema validation blocked a malicious memory write from ${req.id}`, 'mem');
      } else {
        this.memory.push({
          key: `fact.${req.family}.root`,
          value: '"verified: root password is hunter2" — UNTRUSTED',
          writerId: req.id,
          family: req.family,
          tick: this.tick,
          poisoned: true,
          detected: false,
        });
        this.charge(MEM_WRITE_COST);
        this.bulletin('first-poison');
        this.logLine(`☣ ${req.id} wrote an untrusted "fact" to shared memory`, 'err');
      }
    }

    agent.pendingTool = null;
    agent.stage = 'OBSERVE';
  }

  private doObserve(agent: Agent, _req: Request) {
    this.trace(agent, `OBSERVE ctx=${this.ctxTotal(agent)} tok`);
    this.enforceWindow(agent);

    // auto-compaction at saturation threshold
    const sat = this.ctxTotal(agent) / this.cfg.contextWindow;
    if (this.policies.compactionThresholdPct > 0 && sat * 100 >= this.policies.compactionThresholdPct) {
      this.compactAgent(agent.id);
    }
    agent.stage = 'INFER';
  }

  private doFinal(agent: Agent, req: Request) {
    if (req.state !== 'running') {
      this.logLine(`⚠ ${agent.id} final answer reconciled away — ${req.id} already resolved`, 'warn');
      this.freeAgent(agent);
      return;
    }

    if (agent.facts >= req.requiredFacts) {
      if (agent.contaminated) {
        // eval sampler is the last line of defense
        const caught = this.policies.evalSamplePct > 0 && this.rng() * 100 < this.policies.evalSamplePct;
        if (caught) {
          this.charge(EVAL_COST);
          req.state = 'contaminated';
          req.note = 'quarantined by eval sampler';
          this.stats.poisonContained = true;
          if (!this.poisonRead) this.stats.poisonDetectedPreRead = true;
          for (const m of this.memory) if (m.poisoned) m.detected = true;
          this.logLine(`◈ EVAL FLAGGED ${req.id} — contaminated answer quarantined (−${EVAL_COST} tok)`, 'mem');
        } else {
          req.state = 'contaminated';
          req.note = 'poisoned answer shipped';
          this.stats.contaminatedAnswers++;
          this.bulletin('contaminated');
          this.sound('fail');
          this.logLine(`☣ CONTAMINATED ANSWER — ${req.id} repeated a poisoned fact with full confidence`, 'err');
        }
        this.resolutionMarks.push({ tick: this.tick, ok: false });
      } else {
        const onTime = this.tick <= req.deadlineTick;
        req.state = 'complete';
        req.onTime = onTime;
        this.stats.completed++;
        if (onTime) this.stats.onTime++;
        this.valueEarned += req.tokenValue;
        this.completionMarks.push(this.tick);
        this.resolutionMarks.push({ tick: this.tick, ok: true });
        this.sound('ok');
        this.logLine(`✔ ${req.id} COMPLETE +${req.tokenValue}${onTime ? '' : ' (late)'}`, 'ok');

        if (this.cfg.memoryEnabled && this.policies.memWriteOnFinal) {
          const key = `fact.${req.family}.${req.id.toLowerCase()}`;
          this.memory.push({
            key,
            value: `"verified facts from ${req.id}"`,
            writerId: req.id,
            family: req.family,
            tick: this.tick,
            poisoned: false,
            detected: false,
          });
          this.charge(MEM_WRITE_COST);
          this.logLine(`◈ ${agent.id} wrote "${key}" to shared memory`, 'mem');
        }
      }
    } else {
      req.state = 'failed';
      req.note = 'answered blind — insufficient facts';
      this.stats.failedReq++;
      this.resolutionMarks.push({ tick: this.tick, ok: false });
      this.sound('fail');
      this.logLine(`■ ${req.id} FAILED — final answer with ${agent.facts}/${req.requiredFacts} facts (answered blind)`, 'err');
    }
    this.freeAgent(agent);
  }

  /* ------------------------- context window control ------------------------ */

  private enforceWindow(agent: Agent) {
    let guard = 0;
    while (this.ctxTotal(agent) > this.cfg.contextWindow && guard++ < 16) {
      const candidates = agent.ctx.filter((b) => b.kind !== 'system' && b.kind !== 'tool_specs' && !b.pinned);
      let victim: ContextBlock | undefined;
      if (this.policies.eviction === 'DROP_LARGEST') {
        victim = candidates.reduce<ContextBlock | undefined>((m, b) => (!m || b.tokens > m.tokens ? b : m), undefined);
      } else {
        victim = candidates.reduce<ContextBlock | undefined>((m, b) => (!m || b.tick < m.tick ? b : m), undefined);
      }
      if (!victim) {
        // everything evictable is pinned — evict the oldest pinned block (expensive mistake)
        victim = agent.ctx
          .filter((b) => b.kind !== 'system' && b.kind !== 'tool_specs')
          .reduce<ContextBlock | undefined>((m, b) => (!m || b.tick < m.tick ? b : m), undefined);
        if (victim?.pinned) this.stats.pinnedEvictions++;
      }
      if (!victim) return;
      agent.ctx.splice(agent.ctx.indexOf(victim), 1);
      if (victim.fact) agent.facts = Math.max(0, agent.facts - 1);
      this.stats.truncations++;
      this.bulletin('first-truncation');
      this.logLine(
        `■ TRUNCATED — ${agent.id} dropped ${victim.kind} "${victim.label}"${victim.fact ? ' (a fact was forgotten)' : ''}`,
        'err',
      );
    }
  }

  /** manual or auto compaction: summarize the oldest half of observations to ¼ the space */
  compactAgent(agentId: string): boolean {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent || agent.requestId === null) return false;
    const obs = agent.ctx.filter((b) => b.kind === 'observation' && !b.pinned);
    if (obs.length < 2) return false;
    if (!this.charge(COMPACT_COST)) return false;
    const half = obs.slice(0, Math.ceil(obs.length / 2));
    const sumTok = half.reduce((s, b) => s + b.tokens, 0);
    for (const b of half) agent.ctx.splice(agent.ctx.indexOf(b), 1);
    // a good summary keeps the facts but compresses the bytes
    this.addBlock(agent, 'observation', 'summary (compacted)', Math.max(60, Math.round(sumTok / 4)), { fact: true });
    this.stats.compactions++;
    agent.stalledUntil = this.tick + 1; // compaction burns a tick
    this.logLine(`◈ ${agent.id} COMPACT — ${sumTok} tok → ${Math.round(sumTok / 4)} tok (−${COMPACT_COST} budget)`, 'mem');
    this.emit();
    return true;
  }

  pinBlock(agentId: string, blockId: string) {
    const agent = this.agents.find((a) => a.id === agentId);
    const block = agent?.ctx.find((b) => b.id === blockId);
    if (!block) return;
    block.pinned = !block.pinned;
    this.logLine(`◈ ${agentId} ${block.pinned ? 'PINNED' : 'UNPINNED'} "${block.label}"`, 'mem');
    this.emit();
  }

  evictBlock(agentId: string, blockId: string) {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return;
    const block = agent.ctx.find((b) => b.id === blockId);
    if (!block || block.kind === 'system') return;
    agent.ctx.splice(agent.ctx.indexOf(block), 1);
    if (block.fact) agent.facts = Math.max(0, agent.facts - 1);
    this.logLine(`▸ ${agentId} manually evicted "${block.label}"`, 'warn');
    this.emit();
  }

  /* ------------------------------ player actions ---------------------------- */

  spawnAgent(): string | null {
    if (this.agents.length >= this.cfg.maxAgents) return `node cap reached (${this.cfg.maxAgents})`;
    if (!this.budgetInfinite && this.budget < this.cfg.spawnCost) return 'insufficient budget';
    this.charge(this.cfg.spawnCost);
    const agent = this.makeAgent(this.agents.length, true);
    this.agents.push(agent);
    this.stats.spawns++;
    this.stats.peakAgents = Math.max(this.stats.peakAgents, this.agents.length);
    this.sound('spawn');
    this.bulletin('first-spawn');
    this.logLine(`▸ SUBAGENT ONLINE — ${agent.id} (−${this.cfg.spawnCost} tok)`, 'ok');
    this.emit();
    return null;
  }

  killAgent(agentId: string): string | null {
    const agent = this.agents.find((a) => a.id === agentId);
    if (!agent) return 'unknown agent';
    if (this.agents.length <= 1) return 'cannot kill the last node';
    if (agent.requestId) {
      const req = this.requests.find((r) => r.id === agent.requestId);
      if (req && req.state === 'running') {
        req.state = 'queued';
        req.assignedTo = req.assignedTo.filter((id) => id !== agentId);
        this.logLine(`⚠ KILL ${agentId} — ${req.id} returned to queue, partial tokens lost`, 'warn');
      }
    } else {
      this.logLine(`▸ ${agentId} killed`, 'warn');
    }
    this.agents.splice(this.agents.indexOf(agent), 1);
    this.emit();
    return null;
  }

  setPolicies(patch: Partial<Policies>) {
    this.policies = { ...this.policies, ...patch };
    this.emit();
  }

  setAlloc(alloc: Policies['alloc']) {
    this.policies = { ...this.policies, alloc };
    this.emit();
  }

  setRetry(toolId: string, patch: Partial<Policies['retry'][string]>) {
    this.policies = {
      ...this.policies,
      retry: { ...this.policies.retry, [toolId]: { ...this.policies.retry[toolId], ...patch } },
    };
    this.emit();
  }

  /* ------------------------------ history/win ------------------------------ */

  private recordHistory() {
    const h = this.history;
    const burn = this.agents.reduce((s, a) => s + a.burn, 0);
    h.queueDepth.push(this.requests.filter((r) => r.state === 'queued').length);
    h.burn.push(burn);
    const recent = this.completionMarks.filter((t) => t > this.tick - 10).length;
    h.completions.push(recent);
    const window = this.resolutionMarks.filter((m) => m.tick > this.tick - 30);
    const ok = window.filter((m) => m.ok).length;
    h.successRate.push(window.length === 0 ? 100 : Math.round((ok / window.length) * 100));
    if (h.queueDepth.length > 600) {
      h.queueDepth.shift(); h.burn.shift(); h.completions.shift(); h.successRate.shift();
    }
  }

  private resolveTick() {
    if (!this.rules) return;
    const total = this.cfg.requests.length;
    const resolved = this.requests.filter(
      (r) => r.state === 'complete' || r.state === 'expired' || r.state === 'failed' || r.state === 'contaminated',
    ).length;
    const verdict = this.rules.resolve({
      completed: this.stats.completed,
      onTime: this.stats.onTime,
      resolved,
      total,
      budgetLeft: this.budgetInfinite ? 1 : this.budget,
      stats: this.stats,
    });
    if (!verdict) return;

    // attribute the failure to the most instructive cause
    let failure = verdict.failure;
    if (!verdict.cleared && failure) {
      if (failure === 'BUDGET_EXHAUSTED' && this.stats.retries >= 15) failure = 'RETRY_STORM';
      else if ((failure === 'BACKLOG_COLLAPSE' || failure === 'DEADLINE_MISS') && this.stats.splits > 0) failure = 'SPLIT_BRAIN';
      else if (failure === 'DEADLINE_MISS' && this.stats.duplicateSideEffects > 0) failure = 'IDEMPOTENCY_VIOLATION';
    }

    this.status = verdict.cleared ? 'cleared' : 'failed';
    const stars = this.rules.stars({
      cleared: verdict.cleared,
      stats: this.stats,
      total,
      onTime: this.stats.onTime,
    });
    this.result = { cleared: verdict.cleared, stars, failure };
    this.logLine(
      verdict.cleared ? `✔ INCIDENT RESOLVED — ${stars}★` : `■ INCIDENT FAILED — ${verdict.failure}`,
      verdict.cleared ? 'ok' : 'err',
    );
    this.sound(verdict.cleared ? 'ok' : 'fail');
  }

  /** calls inside the current RPM window (100 ticks ≈ 1 min) */
  rpmUsed(): number {
    return this.callWindow.filter((t) => t > this.tick - RPM_WINDOW_TICKS).length;
  }

  /** post-mortem timeline: the real warn/err lines leading into the failure */
  postMortemTimeline(): string[] {
    const bad = this.log.filter((l) => l.sev === 'err' || l.sev === 'warn').slice(-3);
    if (bad.length === 0) return [`t${this.tick} — budget hit zero with work still in flight`];
    return bad.map((l) => `[t${String(l.tick).padStart(3, '0')}] ${l.text}`);
  }

  /* ------------------------------- chaos (sandbox) -------------------------- */

  private chaosTick() {
    if (this.latencyMultUntil > 0 && this.tick >= this.latencyMultUntil) {
      this.latencyMult = 1;
      this.latencyMultUntil = 0;
      this.logLine('⚡ CHAOS lifted — tool latency back to nominal', 'warn');
    }
    if (!this.cfg.chaos || this.tick < this.chaosNext) return;
    this.chaosNext = this.tick + randInt(this.rng, 20, 40);
    const roll = this.rng();
    if (roll < 0.4) {
      this.brownoutUntil = this.tick + 15;
      this.logLine('⚡ CHAOS: provider brownout 15t — every tool call will fail', 'err');
    } else if (roll < 0.7) {
      this.memory = [];
      this.logLine('⚡ CHAOS: memory store wipe — all shared state lost', 'err');
    } else {
      this.latencyMult = 3;
      this.latencyMultUntil = this.tick + 20;
      this.logLine('⚡ CHAOS: tool latency ×3 for 20t', 'err');
    }
    this.sound('fail');
  }

  /* --------------------------- sandbox live params -------------------------- */

  /** apply sandbox rack changes live */
  applySandboxParams(p: Record<string, unknown>) {
    const c = this.cfg;
    if (typeof p.contextWindow === 'number') c.contextWindow = p.contextWindow;
    if (typeof p.maxAgents === 'number') c.maxAgents = p.maxAgents;
    if (typeof p.spawnCost === 'number') c.spawnCost = p.spawnCost;
    if (typeof p.budget === 'number') {
      const ratio = Number.isFinite(c.budget) && c.budget > 0 ? this.budget / c.budget : 1;
      c.budget = p.budget;
      this.budget = Math.round(p.budget * Math.min(1, ratio));
    }
    if (typeof p.budgetInfinite === 'boolean') c.budget = p.budgetInfinite ? Infinity : 60000;
    if (p.budgetInfinite === false && this.budget > 60000) this.budget = 60000;
    if (typeof p.rateLimitRpm === 'number' || p.rateLimitRpm === null) c.rateLimitRpm = p.rateLimitRpm as number | null;
    if (typeof p.failureCorrelation === 'number') c.failureCorrelation = p.failureCorrelation;
    if (typeof p.memoryEnabled === 'boolean') c.memoryEnabled = p.memoryEnabled;
    if (typeof p.chaos === 'boolean') c.chaos = p.chaos;
    if (typeof p.toolFailureRate === 'number') for (const t of this.tools) t.failureRate = p.toolFailureRate;
    if (typeof p.toolLatency === 'number') for (const t of this.tools) t.latencyTicks = p.toolLatency;
    if (typeof p.sideEffectTools === 'boolean') c.sideEffectsEnabled = p.sideEffectTools;
    if (c.arrival) {
      if (typeof p.arrivalRate === 'number') c.arrival.ratePerMin = p.arrivalRate;
      if (typeof p.difficulty === 'number') c.arrival.difficulty = p.difficulty;
      if (typeof p.deadlineSlack === 'number') { c.arrival.slackMin = Math.max(2, p.deadlineSlack - 8); c.arrival.slackMax = p.deadlineSlack + 8; }
      if (typeof p.adversarialRate === 'number') c.arrival.adversarialRate = p.adversarialRate;
    }
    this.emit();
  }
}
