import { Link } from 'react-router';

const TERMS = [
  'TIMEOUT',
  'RETRY STORM',
  'THUNDERING HERD',
  'SPLIT-BRAIN',
  'POISONED CONTEXT',
  'CASCADING FAILURE',
  'BACKPRESSURE',
  'IDEMPOTENCY KEY',
  'CIRCUIT BREAKER',
  'TAIL LATENCY',
];

const slug = (t: string) => t.toLowerCase().replace(/[^a-z]+/g, '-');

function TickerItems() {
  return (
    <>
      {TERMS.map((t) => (
        <span key={t} className="flex items-center">
          <Link
            to={`/manual#glossary-${slug(t)}`}
            className="text-text-mid transition-colors duration-150 hover:text-signal-red"
          >
            {t}
          </Link>
          <span className="mx-5 text-text-low" aria-hidden="true">
            ·
          </span>
        </span>
      ))}
    </>
  );
}

/** Section 6 — Failure ticker (home.md §6): infinite marquee, pauses on hover. */
export default function FailureTicker() {
  return (
    <section
      className="marquee-band flex h-16 items-center overflow-hidden border-y border-line bg-bg-1"
      aria-label="Failure modes glossary"
    >
      <div className="marquee-track flex w-max whitespace-nowrap font-mono text-[14px] tracking-[0.06em]">
        {/* duplicated content for a seamless 40s linear wrap */}
        <div className="flex items-center">
          <TickerItems />
        </div>
        <div className="flex items-center" aria-hidden="true">
          <TickerItems />
        </div>
      </div>
    </section>
  );
}
