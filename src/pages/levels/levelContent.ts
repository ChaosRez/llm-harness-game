import type { LevelId } from '@/lib/progress';

/**
 * Extended campaign content for the /levels board (levels.md §2).
 * Shared fields (name, tagline, tags, concept, win) live in src/lib/levels.ts;
 * this file owns the board-only copy: star thresholds, hazards, briefing, hint.
 */

export interface LevelBoardContent {
  stars: [string, string, string];
  hazards: string[];
  briefing: string;
  hint: string;
}

export const LEVEL_CONTENT: Record<LevelId, LevelBoardContent> = {
  l1: {
    stars: ['finish', '≤ 18,000 tok', 'zero truncated contexts.'],
    hazards: ['context overflow → silent truncation'],
    briefing:
      'Welcome to the floor. Requests arrive on the left; your single agent node sits center stage. For each request you must allocate its context window: system prompt, tool specs, working scratch. Every token you load is rent you pay on every subsequent model call. Under-allocate and the agent answers blind. Over-allocate and you burn budget per tick. Hit DISPATCH, watch the loop spin: ASSEMBLE → INFER → OBSERVE. The loop ends when the agent emits a final answer — or when you run out of money.',
    hint: 'The scratch pad is cheapest per byte of capability. Start with 60% system+tools, 40% scratch.',
  },
  l2: {
    stars: ['5/6', '6/6', '≤ 3 total retries.'],
    hazards: ['tool failure (20% per call)', 'tool latency (2–5 ticks)', 'deadline per request'],
    briefing:
      'Requests now need tools — search, calculator, file read. The model decides *when* to call; you decide *what it may call* and what happens on failure. Each tool has latency measured in ticks and a 20% failure rate. Set a retry policy per tool: none, fixed, or backoff. Watch INFER → TOOL CALL → OBSERVE cycle until the agent has enough to answer. Deadlines are now ticking — a retry storm on one request starves the rest of your budget.',
    hint: 'Backoff retries cost more time but convert better than fixed retries under correlated failures.',
  },
  l3: {
    stars: ['finish', '≤ 2 compactions per request', 'zero eviction of a "pinned" fact.'],
    hazards: ['context saturation', 'evicted facts are forgotten', 'memory store read/write cost'],
    briefing:
      'These requests are long: multi-part research tasks whose working state will overflow the window. You now control eviction policy (drop-oldest, drop-largest, pin-important) and one new verb: COMPACT — spend tokens to summarize the oldest half of context into a quarter of the space. You also get a memory store (teal): cheap, persistent, but reads and writes cost ticks and the agent only uses what you wire in. Decide what deserves to be remembered twice.',
    hint: 'Compact early at 70% saturation. Waiting for 95% forces a bigger, lossier summary.',
  },
  l4: {
    stars: ['6/8 on time', '8/8 on time', '≤ 2 subagents peak.'],
    hazards: ['concurrent arrivals', 'queue backlog', 'duplicate dispatch (split-brain!)'],
    briefing:
      'Arrival rate just went bimodal — bursts of three. You can now SPAWN SUBAGENT: a fresh node with its own inner loop, its own context, its own budget draw. Subagents cost a fixed spawn fee plus their burn. The dispatcher is yours to configure: FIFO, earliest-deadline-first, or manual drag-to-assign. Beware: assigning the same request twice splits the brain — two agents, one task, double cost, and their answers must be reconciled. The queue is your friend; a request waiting in queue costs nothing.',
    hint: 'EDF beats FIFO under mixed deadlines. Two subagents cover this level if you keep the queue shallow.',
  },
  l5: {
    stars: ['finish', 'zero rate-limit trips', 'zero duplicate side-effects.'],
    hazards: ['provider rate limit (RPM)', 'correlated tool failures', 'non-idempotent tools (send_email, charge_card)'],
    briefing:
      'The tool provider now enforces a rate limit — exceed it and every call 429s for 10 ticks. Two new tools have side effects: send_email and charge_card. Retry a timed-out charge and the customer pays twice, unless you attach an idempotency key (new per-tool toggle). You also get a CIRCUIT BREAKER: after N failures, stop calling for M ticks and fail fast. A queue under overload needs a policy: shed load, or shed dignity.',
    hint: 'Cap concurrency at 2, enable the breaker at 3 failures, and always key your charges.',
  },
  l6: {
    stars: ['finish', 'containment with ≤ 1 contaminated answer', 'poison detected before first read.'],
    hazards: [
      'adversarial request writes malicious "facts" to shared memory',
      'cross-request contamination',
      'silent wrongness',
    ],
    briefing:
      'Final incident. Shared memory is on and agents trust it. One incoming request is adversarial: its tool results inject a false "fact" into the store, and every later agent that reads it will confidently repeat the lie. Your new instruments: an EVAL SAMPLER (grade n% of outputs — costs budget, catches wrongness late) and WRITE VALIDATION (schema-check memory writes — costs ticks, catches poison early). You cannot see which request is hostile. Design for containment: namespaces, validation, and the humility to distrust your own store.',
    hint: "Namespace memory per request-family and validate writes. Evals tell you *that* you're wrong, never *where*.",
  },
};

/** One-line definitions for mechanic tag chips (levels.md — Interactions). */
export const TAG_DEFINITIONS: Record<string, string> = {
  'context assembly': 'packing the window: system prompt, tool specs, memory, history',
  termination: 'when the loop stops: final answer, budget out, or truncation failure',
  'token budget': 'total tokens you may spend — every call pays rent',
  'tool calls': 'structured RPCs the model emits; the harness executes',
  timeouts: 'a call that may have succeeded, but you stopped waiting',
  'retry policy': 'none / fixed / backoff — what happens when a tool fails',
  'context eviction': 'what gets dropped when the window fills',
  compaction: 'summarize old context into less space — GC for the window',
  'memory store': 'external persistent state; reads and writes cost ticks',
  subagents: 'fresh worker nodes with their own loop and budget draw',
  queue: 'decouples arrival from service; backlog is latency',
  scheduling: 'FIFO vs earliest-deadline-first vs manual drag-to-assign',
  deadlines: 'per-request tick countdowns; miss them and the request fails',
  'rate limits': 'provider quota — exceed it and everyone 429s',
  backpressure: 'slow consumers tell fast producers to wait',
  'circuit breaker': 'after N failures, stop calling for M ticks; fail fast',
  idempotency: 'keys that make at-least-once behave like exactly-once',
  'shared memory': 'state all agents trust — and can all be poisoned by',
  validation: 'schema-check memory writes before they land in the store',
  evals: "grade n% of outputs — your monitoring; tells you *that*, not *where*",
  'blast radius': 'how far one failure propagates through the fleet',
  'custom arrivals': 'script your own request traffic',
  'chaos injection': 'break things on purpose',
  'live telemetry': 'charts, not vibes',
};
