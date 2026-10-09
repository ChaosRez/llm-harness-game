import { useRef } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const ROWS: Array<{ harness: string; dc: string; accent: 'green' | 'amber' }> = [
  { harness: 'context window', dc: 'node memory', accent: 'green' },
  { harness: 'token budget', dc: 'bandwidth quota', accent: 'amber' },
  { harness: 'tool call', dc: 'RPC (fails, needs timeouts)', accent: 'green' },
  { harness: 'subagent', dc: 'worker node / fan-out', accent: 'amber' },
  { harness: 'shared memory', dc: 'external state store', accent: 'green' },
  { harness: 'the harness', dc: 'the control plane', accent: 'amber' },
];

/** Section 5 — "You Already Know This" analogy table (home.md §5). */
export default function AnalogyTable() {
  const secRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;
      gsap.from('.analogy-row', {
        x: -24,
        opacity: 0,
        duration: 0.4,
        stagger: 0.09,
        ease: 'expo.out',
        scrollTrigger: { trigger: secRef.current, start: 'top 70%' },
      });
    },
    { scope: secRef },
  );

  return (
    <section ref={secRef} className="border-t border-line">
      <div className="mx-auto max-w-[960px] px-6 py-32 max-md:py-18">
        <p className="eyebrow">05 // TRANSLATION LAYER</p>
        <h2 className="mt-4 font-display text-[28px] font-bold text-text-hi md:text-[36px]">
          You've operated this system before.
        </h2>

        <div className="mt-10 overflow-hidden rounded-[2px] border border-line">
          <div className="grid grid-cols-2 border-b border-line bg-bg-1 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-text-low">
            <span>In the harness</span>
            <span>In your datacenter</span>
          </div>
          {ROWS.map((r) => (
            <div
              key={r.harness}
              className="analogy-row group grid grid-cols-2 border-b border-line px-5 py-4 text-[16px] transition-colors duration-150 last:border-b-0 hover:bg-bg-2"
            >
              <span className="font-mono text-text-mid transition-colors duration-150 group-hover:text-signal-green">
                {r.harness}
              </span>
              <span className="text-text-mid transition-colors duration-150 group-hover:text-signal-amber">
                {r.dc}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-6 font-mono text-[13px] text-text-low">
          <Link
            to="/manual#translation"
            className="text-signal-teal transition-colors duration-150 hover:brightness-125"
          >
            Full translation table + failure glossary in the Field Manual →
          </Link>
        </p>
      </div>
    </section>
  );
}
