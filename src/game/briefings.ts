import type { LevelId } from '@/lib/progress';

export interface Briefing {
  copy: string;
  hint: string;
  win: string;
  stars: [string, string, string];
}

/** Level briefing copy (levels.md §2) — shown in the incident briefing modal. */
export const BRIEFINGS: Record<LevelId, Briefing> = {
  l1: {
    copy: 'Welcome to the floor. Requests arrive on the left; your single agent node sits center stage. For each request you must allocate its context window: system prompt, tool specs, working scratch. Every token you load is rent you pay on every subsequent model call. Under-allocate and the agent answers blind. Over-allocate and you burn budget per tick. Hit BEGIN, watch the loop spin: ASSEMBLE → INFER → OBSERVE. The loop ends when the agent emits a final answer — or when you run out of money.',
    hint: 'The scratch pad is cheapest per byte of capability. Start with 60% system+tools, 40% scratch.',
    win: 'Complete 3 requests before the global token budget (24,000 tok) runs out.',
    stars: ['finish', '≤ 18,000 tok spent', 'zero truncated contexts'],
  },
  l2: {
    copy: 'Requests now need tools — search, calculator, file read. The model decides *when* to call; you decide *what it may call* and what happens on failure. Each tool has latency measured in ticks and a 20% failure rate. Set a retry policy per tool: none, fixed, or backoff. Watch INFER → TOOL CALL → OBSERVE cycle until the agent has enough to answer. Deadlines are now ticking — a retry storm on one request starves the rest of your budget.',
    hint: 'Backoff retries cost more time but convert better than fixed retries under correlated failures.',
    win: 'Complete 5 of 6 requests; each requires ≥1 tool call.',
    stars: ['5/6 complete', '6/6 complete', '≤ 3 total retries'],
  },
  l3: {
    copy: 'These requests are long: multi-part research tasks whose working state will overflow the window. You now control eviction policy (drop-oldest, drop-largest, pin-important) and one new verb: COMPACT — spend tokens to summarize the oldest half of context into a quarter of the space. You also get a memory store (teal): cheap, persistent, but reads and writes cost ticks and the agent only uses what you wire in. Decide what deserves to be remembered twice.',
    hint: 'Compact early at 70% saturation. Waiting for 95% forces a bigger, lossier summary.',
    win: 'Complete 4 long multi-step requests without a truncation failure.',
    stars: ['finish', '≤ 2 compactions per request', 'zero pinned-fact evictions'],
  },
  l4: {
    copy: 'Arrival rate just went bimodal — bursts of three. You can now SPAWN SUBAGENT: a fresh node with its own inner loop, its own context, its own budget draw. Subagents cost a fixed spawn fee plus their burn. The dispatcher is yours to configure: FIFO, earliest-deadline-first, or manual drag-to-assign. Beware: assigning the same request twice splits the brain — two agents, one task, double cost, and their answers must be reconciled. The queue is your friend; a request waiting in queue costs nothing.',
    hint: 'EDF beats FIFO under mixed deadlines. Two subagents cover this level if you keep the queue shallow.',
    win: 'Clear all 8 requests with ≥ 6 before deadline.',
    stars: ['6/8 on time', '8/8 on time', '≤ 2 subagents peak'],
  },
  l5: {
    copy: 'The tool provider now enforces a rate limit — exceed it and every call 429s for 10 ticks. Two new tools have side effects: send_email and charge_card. Retry a timed-out charge and the customer pays twice, unless you attach an idempotency key (new per-tool toggle). You also get a CIRCUIT BREAKER: after N failures, stop calling for M ticks and fail fast. A queue under overload needs a policy: shed load, or shed dignity.',
    hint: 'Cap concurrency at 2, enable the breaker at 3 failures, and always key your charges.',
    win: 'Clear 6 of 8 requests. Do not trip the provider-wide rate limit more than once.',
    stars: ['finish', 'zero rate-limit trips', 'zero duplicate side-effects'],
  },
  l6: {
    copy: 'Final incident. Shared memory is on and agents trust it. One incoming request is adversarial: its tool results inject a false "fact" into the store, and every later agent that reads it will confidently repeat the lie. Your new instruments: an EVAL SAMPLER (grade n% of outputs — costs budget, catches wrongness late) and WRITE VALIDATION (schema-check memory writes — costs ticks, catches poison early). You cannot see which request is hostile. Design for containment: namespaces, validation, and the humility to distrust your own store.',
    hint: 'Namespace memory per request-family and validate writes. Evals tell you *that* you’re wrong, never *where*.',
    win: 'Clear 7 of 8 requests with the poisoned one contained (quarantined or rejected).',
    stars: ['finish', '≤ 1 contaminated answer', 'poison detected before first read'],
  },
};

/** rotating teaching footer lines for the inspector drawer, per level */
export const INSPECTOR_WISDOM: Record<LevelId, string[]> = {
  l1: [
    'stateless node ⇒ everything it "remembers" is in the bar above',
    'context is re-billed per INFER tick — the window is rent, not a purchase',
  ],
  l2: [
    'a tool call is an RPC: latency, failure modes, and retries',
    'retry NONE means one fault becomes a blind answer',
  ],
  l3: [
    'compaction ≈ garbage collection: pay tokens, keep the facts, drop the bytes',
    'evicted facts are forgotten — the agent will not know what it lost',
  ],
  l4: [
    'the queue decouples arrival from service — a waiting request costs nothing',
    'assigning twice splits the brain: double cost, one answer reconciled away',
  ],
  l5: [
    'a 429 is the provider shedding YOUR load — back off or break the circuit',
    'timeouts are ambiguous: the charge may have happened. Key it or eat it twice.',
  ],
  l6: [
    'you cannot eyeball shared state — validate writes, namespace reads',
    'evals are monitoring: they tell you that you are wrong, never where',
  ],
};
