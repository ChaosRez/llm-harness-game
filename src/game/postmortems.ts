/** Post-mortem copy: every failure is a named DS concept (game.md §8). */

export interface PostMortemCopy {
  failure: string;
  concept: { name: string; definition: string };
  mitigations: string[];
  manualAnchor: string;
}

export const POST_MORTEMS: Record<string, PostMortemCopy> = {
  BUDGET_EXHAUSTED: {
    failure: 'BUDGET EXHAUSTED',
    concept: {
      name: 'rent-seeking context',
      definition:
        'Context is re-billed on every inference. Tokens loaded into the window are not a one-time cost — they are rent, charged per model call, forever.',
    },
    mitigations: [
      'Run the LEAN allocator preset: smaller system/scratch allocations lower per-tick rent.',
      'Compact context before saturation instead of letting the window grow unbounded.',
      'Finish requests fast — every extra loop iteration re-pays the whole window.',
    ],
    manualAnchor: 'glossary-context-window',
  },
  RETRY_STORM: {
    failure: 'RETRY STORM',
    concept: {
      name: 'retry storm',
      definition:
        'Retries multiply load exactly when the system is least able to serve it. Aggressive fixed retries turn a partial outage into a total one.',
    },
    mitigations: [
      'Use BACKOFF retry policy — wait 2^attempt ticks so failures de-correlate.',
      'Enable the CIRCUIT BREAKER (RELIABILITY tab) to fail fast after N failures.',
      'Cap max retries; an answer late is cheaper than an answer never.',
    ],
    manualAnchor: 'glossary-retry-storm',
  },
  THUNDERING_HERD: {
    failure: 'THUNDERING HERD',
    concept: {
      name: 'thundering herd / 429 cascade',
      definition:
        'Every agent retrying at once exceeds the provider rate limit; the resulting 429 lockout synchronizes them, so they all stampede again the moment it lifts.',
    },
    mitigations: [
      'Backoff with jitter spreads retries out; synchronized retries re-trip the limit.',
      'Open the circuit breaker before the provider does it for you.',
      'Fewer agents, deeper queue — the queue absorbs bursts for free.',
    ],
    manualAnchor: 'glossary-thundering-herd',
  },
  SPLIT_BRAIN: {
    failure: 'SPLIT-BRAIN',
    concept: {
      name: 'split-brain',
      definition:
        'Two agents assigned the same request both believe they own it. Double cost, divergent contexts, and one answer must be reconciled away.',
    },
    mitigations: [
      'One dispatcher, one decision: use FIFO/EDF policy instead of ad-hoc manual assignment.',
      'Check a request’s ASSIGNED state before dragging it onto a second node.',
      'Treat assignment as a lock — exactly-once dispatch, at-least-once execution.',
    ],
    manualAnchor: 'glossary-split-brain',
  },
  POISONED_CONTEXT: {
    failure: 'POISONED CONTEXT',
    concept: {
      name: 'poisoned shared state',
      definition:
        'A malicious write entered the shared memory store and every subsequent reader repeated it confidently. Shared state is a blast-radius multiplier.',
    },
    mitigations: [
      'Enable WRITE VALIDATION (MEMORY tab) — schema-check writes before they land.',
      'Enable NAMESPACE PER REQUEST so one request’s writes can’t leak into another’s reads.',
      'Run the EVAL SAMPLER — evals tell you that you are wrong, never where.',
    ],
    manualAnchor: 'glossary-poisoned-memory',
  },
  IDEMPOTENCY_VIOLATION: {
    failure: 'IDEMPOTENCY VIOLATION',
    concept: {
      name: 'idempotency violation',
      definition:
        'A timed-out charge_card call had already executed. The retry charged the customer twice. Without a dedupe key, at-least-once delivery means exactly-twice billing.',
    },
    mitigations: [
      'Toggle IDEMPOTENCY KEYS per side-effect tool (RELIABILITY tab).',
      'Treat timeouts as ambiguous: the call may have happened. Key it or don’t retry it.',
      'Prefer longer timeouts over blind retries for non-idempotent tools.',
    ],
    manualAnchor: 'glossary-idempotency',
  },
  BACKLOG_COLLAPSE: {
    failure: 'BACKLOG COLLAPSE',
    concept: {
      name: 'backpressure ignored',
      definition:
        'Requests arrived faster than one node could service them and the queue absorbed the difference — until deadlines started dying in line. Queueing delay is still latency.',
    },
    mitigations: [
      'SPAWN SUBAGENT before the queue is deep, not after — spawn latency is real.',
      'Switch dispatch to EDF so the tightest deadlines are served first.',
      'Set a load-shed policy: dropping low-value work beats missing everything.',
    ],
    manualAnchor: 'glossary-backpressure',
  },
  CONTEXT_SATURATED: {
    failure: 'CONTEXT SATURATED',
    concept: {
      name: 'lossy eviction',
      definition:
        'The window filled and the oldest observation was dropped — the agent forgot why it started. Truncation is silent data loss with a progress bar.',
    },
    mitigations: [
      'COMPACT early (≈70% saturation) — a small summary beats a big truncation.',
      'PIN facts the agent cannot afford to lose (inspector → PIN).',
      'Spill long-lived facts to the MEMORY store; reads are cheap, loss is not.',
    ],
    manualAnchor: 'glossary-context-window',
  },
  DEADLINE_MISS: {
    failure: 'DEADLINE MISS',
    concept: {
      name: 'scheduling failure',
      definition:
        'Work was schedulable but not scheduled: the wrong request held the node while a tighter deadline starved. Throughput without priority is just queueing.',
    },
    mitigations: [
      'Use EDF dispatch (DISPATCH tab) — earliest deadline first beats FIFO under mixed slack.',
      'Parallelize: one node is a single point of serialization.',
      'Watch the ⚠ NEAR DEADLINE HUD counter; it is your scheduling alarm.',
    ],
    manualAnchor: 'glossary-deadlines',
  },
  INSUFFICIENT_EVIDENCE: {
    failure: 'ANSWERED BLIND',
    concept: {
      name: 'under-provisioned context',
      definition:
        'The agent emitted a final answer without gathering the required facts. A stateless node knows only what you loaded — under-allocate and it hallucinates confidence.',
    },
    mitigations: [
      'Raise scratch/system allocation so the loop can run enough iterations.',
      'Allow retries: a failed tool call is recoverable, a blind answer is not.',
      'Check the context bar — an empty window is not a frugal one.',
    ],
    manualAnchor: 'glossary-inner-loop',
  },
};

/** Ops-bulletin teaching copy keyed by trigger id (game.md §8). */
export const BULLETIN_COPY: Record<string, { body: string; manualAnchor?: string }> = {
  'first-truncation': {
    body: 'CONTEXT SATURATED — the oldest observation was dropped. The agent just forgot why it started. Pin critical facts or compact before 95%.',
    manualAnchor: 'glossary-context-window',
  },
  'first-rent': {
    body: 'RENT NOTICE — the whole context window is re-billed on every INFER tick. Every token you load is a token you keep paying for.',
    manualAnchor: 'glossary-context-window',
  },
  'first-tool-fail': {
    body: 'TOOL FAULT — a tool call is an RPC: it has latency and a failure rate. Set a retry policy in RELIABILITY, or the agent answers with nothing.',
    manualAnchor: 'glossary-tools',
  },
  'first-429': {
    body: 'RATE LIMITED — the provider rejected everyone for 10 ticks. Your retries are synchronized; they will stampede again when the window lifts.',
    manualAnchor: 'glossary-thundering-herd',
  },
  'first-spawn': {
    body: 'SUBAGENT ONLINE — a fresh stateless node with its own context, its own loop, its own draw on your budget. Fan-out is not free.',
    manualAnchor: 'glossary-subagents',
  },
  'split-brain': {
    body: 'SPLIT-BRAIN — two agents now own the same request. Double cost, and one answer will be reconciled away. Assignment is a lock.',
    manualAnchor: 'glossary-split-brain',
  },
  'first-poison': {
    body: 'UNTRUSTED WRITE — an adversarial request just wrote to shared memory. You cannot eyeball state; validate writes or namespace them.',
    manualAnchor: 'glossary-poisoned-memory',
  },
  'contaminated': {
    body: '☣ CONTAMINATED ANSWER — an agent repeated a poisoned "fact" with full confidence. Evals catch wrongness late; validation catches it early.',
    manualAnchor: 'glossary-poisoned-memory',
  },
  'dup-charge': {
    body: 'DUPLICATE SIDE-EFFECT — a retried timeout executed twice. The customer paid twice. Idempotency keys dedupe retries.',
    manualAnchor: 'glossary-idempotency',
  },
  'retry-storm': {
    body: 'RETRY STORM — retries are amplifying load during a failure window. Back off, or open the circuit breaker and fail fast.',
    manualAnchor: 'glossary-retry-storm',
  },
  'memory-saved': {
    body: 'MEMORY HIT — the store just answered a question the model would have burned tokens re-deriving. External state is the outer loop’s cache.',
    manualAnchor: 'glossary-memory',
  },
};
