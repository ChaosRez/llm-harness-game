/**
 * Field Manual content (manual.md). Diagram station/component detail copy,
 * the harness↔datacenter translation table, and the failure-mode glossary.
 */

export interface StationDetail {
  id: string;
  name: string;
  body: string;
  failures: string[];
  dsNote: string;
}

/** §1 — inner loop stations, copy verbatim from manual.md §1. */
export const STATIONS: StationDetail[] = [
  {
    id: 'assemble',
    name: 'ASSEMBLE',
    body: 'The harness packs the context window: system prompt, tool specs, retrieved memory, conversation so far. The model sees nothing else. Under-pack and it hallucinates; over-pack and you pay rent on every token, every call.',
    failures: ['missing context', 'budget burn'],
    dsNote: 'like cold-starting a stateless worker from a config store on every invocation.',
  },
  {
    id: 'infer',
    name: 'INFER',
    body: 'One forward pass. Pure compute: weights in, logits out. No memory of any previous call — "memory" is whatever ASSEMBLE put in the window.',
    failures: ['latency', 'cost per call'],
    dsNote: 'a stateless compute node behind a load balancer.',
  },
  {
    id: 'tool-call',
    name: 'TOOL CALL',
    body: 'The model emits a structured request; the harness validates, dispatches to a real tool, waits. Tools are RPCs: they have latency, they fail, and some have side effects that retries will happily double-apply.',
    failures: ['timeout', '429', 'duplicate side-effect'],
    dsNote: 'an RPC without idempotency is a liability.',
  },
  {
    id: 'observe',
    name: 'OBSERVE',
    body: 'The tool result is appended to context and the loop repeats. Observations accumulate until the window saturates — then something must be compacted, evicted, or forgotten.',
    failures: ['context overflow', 'silent truncation'],
    dsNote: 'append-only log until the disk fills; then you need compaction.',
  },
];

export interface ComponentDetail {
  id: string;
  name: string;
  blurb: string;
  body: string;
}

/** §2 — outer loop components. MEMORY STORE copy verbatim from manual.md §2. */
export const COMPONENTS: ComponentDetail[] = [
  {
    id: 'dispatcher',
    name: 'DISPATCHER',
    blurb: 'assigns queue items to agents — FIFO/EDF/manual',
    body: 'The scheduler. Pulls work off the queue and hands it to an agent — first-in-first-out, earliest-deadline-first, or your own drag-to-assign judgment. It owns the ownership ledger: one request, one agent, or you get split-brain.',
  },
  {
    id: 'queue',
    name: 'QUEUE',
    blurb: 'decouples arrival from service; backlog is latency',
    body: 'A buffer between bursty arrivals and finite workers. A request waiting in queue costs nothing but time — depth is latency you have already committed to. When arrival rate beats service rate, the queue is where backpressure shows up first.',
  },
  {
    id: 'agents',
    name: 'AGENT ×4',
    blurb: 'each a mini inner-loop ring, pulsing',
    body: 'Stateless compute with a rented memory. Each agent runs its own inner loop — ASSEMBLE → INFER → TOOL CALL → OBSERVE — on its own context and its own slice of the budget. Spawning one costs a fee plus its burn; killing one loses its working state.',
  },
  {
    id: 'tools',
    name: 'TOOLS',
    blurb: 'rate-limited RPCs',
    body: 'The outside world, behind a provider quota. Every call has latency and a failure rate; some have side effects. Exceed the rate limit and every caller eats 429s together — correlated failure, courtesy of your retry policy.',
  },
  {
    id: 'memory',
    name: 'MEMORY STORE',
    blurb: 'shared state — trust boundary',
    body: 'External state so agents can exceed their window and share findings. Also a trust boundary: one poisoned write, N contaminated readers. Validate writes; namespace tenants.',
  },
  {
    id: 'eval',
    name: 'EVAL HARNESS',
    blurb: 'sampling outputs — your monitoring',
    body: 'Grades a sample of outputs against expectations. Costs budget, catches wrongness late, and never tells you where the fault entered — only that it did. Monitoring, not prevention.',
  },
];

export interface TranslationRow {
  harness: string;
  datacenter: string;
  why: string;
}

/** §3 — translation table, verbatim from manual.md §3. */
export const TRANSLATION_ROWS: TranslationRow[] = [
  { harness: 'context window', datacenter: 'node memory', why: 'fixed, precious, and everything must fit' },
  { harness: 'token budget', datacenter: 'bandwidth quota', why: 'pay per byte, per call' },
  { harness: 'tool call', datacenter: 'RPC', why: 'latency, failure, timeouts, retries' },
  { harness: 'subagent', datacenter: 'worker node', why: 'fan-out for parallelism, pay spawn + burn' },
  { harness: 'shared memory', datacenter: 'external state store', why: 'trust boundary; validate writes' },
  { harness: 'dispatcher', datacenter: 'scheduler', why: 'FIFO vs EDF vs priority' },
  { harness: 'rate limit', datacenter: 'provider quota', why: 'exceed it and everyone 429s' },
  { harness: 'compaction', datacenter: 'GC / log compaction', why: 'reclaim space, lose fidelity' },
  { harness: 'eval sampling', datacenter: 'monitoring / canary analysis', why: "you can't fix what you don't grade" },
  { harness: 'the harness', datacenter: 'the control plane', why: 'the model is just a node' },
];

export interface GlossaryEntry {
  slug: string;
  term: string;
  definition: string;
  signature: string;
  mitigation: string;
}

/**
 * §4 — failure glossary, verbatim from manual.md §4.
 * Anchor ids: `glossary-<slug>` — deep-linked by the home failure ticker
 * (/manual#glossary-<slug>) and in-game post-mortems.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    slug: 'timeout',
    term: 'TIMEOUT',
    definition: 'A call that may have succeeded, but you stopped waiting.',
    signature: "Tool exceeds timeout ticks; the agent doesn't know if the side effect happened.",
    mitigation: 'Retry with idempotency keys; never assume failure.',
  },
  {
    slug: 'retry-storm',
    term: 'RETRY STORM',
    definition: 'Retries multiply load on an already-failing dependency.',
    signature: 'Fixed retries × correlated failures → tool rail goes red en masse.',
    mitigation: 'Backoff + jitter, cap concurrency.',
  },
  {
    slug: 'thundering-herd',
    term: 'THUNDERING HERD',
    definition: 'Every waiting client retries at the same instant.',
    signature: 'After a 429 cooldown ends, all queued agents fire simultaneously and re-trip the limit.',
    mitigation: 'Jitter, staggered wakeups.',
  },
  {
    slug: 'circuit-breaker',
    term: 'CIRCUIT BREAKER',
    definition: 'Stop calling a dead dependency; fail fast and recover.',
    signature: '`RELIABILITY` tab toggle — opens after N failures for M ticks.',
    mitigation: "It's the mitigation.",
  },
  {
    slug: 'backpressure',
    term: 'BACKPRESSURE',
    definition: 'Slow consumers must slow fast producers.',
    signature: 'Queue depth climbs when arrival > service; deadlines expire in queue.',
    mitigation: 'Load shedding, more workers, EDF.',
  },
  {
    slug: 'split-brain',
    term: 'SPLIT-BRAIN',
    definition: 'Two workers believe they own the same task.',
    signature: 'Double-assigning a request burns double tokens and returns two answers to reconcile.',
    mitigation: 'Single dispatcher, ownership ledger.',
  },
  {
    slug: 'idempotency-key',
    term: 'IDEMPOTENCY KEY',
    definition: 'Make "at-least-once" behave like "exactly-once".',
    signature: 'Retrying a timed-out `charge_card` without a key charges twice (`DUPLICATE SIDE-EFFECT` log, red).',
    mitigation: 'The key.',
  },
  {
    slug: 'poisoned-context',
    term: 'POISONED CONTEXT',
    definition: 'Untrusted content enters shared state and every reader trusts it.',
    signature: 'Adversarial write → memory store → contaminated answers; invisible until detected.',
    mitigation: 'Write validation, namespaces, eval sampling.',
  },
  {
    slug: 'cascading-failure',
    term: 'CASCADING FAILURE',
    definition: 'One slow component stalls everything upstream of it.',
    signature: 'A slow tool stalls its agent → queue backs up → deadlines die fleet-wide.',
    mitigation: 'Timeouts, bulkheads, isolation.',
  },
  {
    slug: 'tail-latency',
    term: 'TAIL LATENCY',
    definition: 'The p99 is the user experience at scale.',
    signature: 'One 8-tick tool call blows a tight deadline even at 90% success.',
    mitigation: 'Deadline-aware scheduling, hedged requests.',
  },
];
