import type { LevelId } from '@/lib/progress';

export interface LevelInfo {
  id: LevelId;
  n: number;
  name: string;
  tagline: string;
  tags: string[];
  concept: string;
  win: string;
}

/** Campaign level data (levels.md) — shared by home strip and levels page. */
export const LEVELS: LevelInfo[] = [
  {
    id: 'l1',
    n: 1,
    name: 'HELLO, LOOP',
    tagline: 'One request. One agent. Learn the loop before it learns you.',
    tags: ['context assembly', 'termination', 'token budget'],
    concept: 'the model is stateless — context IS memory',
    win: 'Complete 3 requests before the global token budget (24,000 tok) runs out.',
  },
  {
    id: 'l2',
    n: 2,
    name: 'TOOL TIME',
    tagline: "The model can't fetch, calculate, or read files. Your tools can. They also fail.",
    tags: ['tool calls', 'timeouts', 'retry policy'],
    concept: 'a tool call is an RPC: latency, failure modes, and retries',
    win: 'Complete 5 of 6 requests; each requires ≥1 tool call.',
  },
  {
    id: 'l3',
    n: 3,
    name: 'FULL CONTEXT',
    tagline: "The conversation got long. The window didn't get bigger.",
    tags: ['context eviction', 'compaction', 'memory store'],
    concept: 'context window ≈ node memory; compaction ≈ GC; memory store ≈ external state',
    win: 'Complete 4 long multi-step requests without a truncation failure.',
  },
  {
    id: 'l4',
    n: 4,
    name: 'FAN-OUT',
    tagline: 'Six requests at once. One agent is a single point of everything.',
    tags: ['subagents', 'queue', 'scheduling', 'deadlines'],
    concept: 'subagents ≈ worker fan-out; the queue decouples arrival from service',
    win: 'Clear all 8 requests with ≥ 6 before deadline.',
  },
  {
    id: 'l5',
    n: 5,
    name: 'THE FLAKY RPC',
    tagline: 'The provider is down for everyone. Your retries are making it worse.',
    tags: ['rate limits', 'backpressure', 'circuit breaker', 'idempotency'],
    concept: 'retry storms + thundering herd; idempotency keys for non-idempotent tools',
    win: 'Clear 6 of 8 requests. Do not trip the provider-wide rate limit more than once.',
  },
  {
    id: 'l6',
    n: 6,
    name: 'POISONED MEMORY',
    tagline: 'One of these requests is not like the others. It is inside your memory store.',
    tags: ['shared memory', 'validation', 'evals', 'blast radius'],
    concept: 'poisoned shared state → cascading failure; evals as your monitoring',
    win: 'Clear 7 of 8 requests with the poisoned one contained (quarantined or rejected).',
  },
];
