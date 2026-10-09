import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STATEMENT = 'The model remembers nothing. Everything it knows must be re-assembled — every single tick.';

/** Section 2 — The Problem ("Statelessness", home.md §2). */
export default function Problem() {
  const secRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      // Statement: word-level scrub reveal (opacity 0.15 → 1)
      gsap.fromTo(
        '.stmt-word',
        { opacity: 0.15 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: {
            trigger: '.stmt',
            start: 'top 80%',
            end: 'top 20%',
            scrub: true,
          },
        },
      );
      // Columns slide up + fade
      gsap.from('.problem-col', {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.problem-cols', start: 'top 75%' },
      });
      // Rotated annotation fades in last
      gsap.from('.problem-annot', {
        opacity: 0,
        duration: 0.2,
        scrollTrigger: { trigger: '.problem-cols', start: 'top 60%' },
      });
    },
    { scope: secRef },
  );

  return (
    <section ref={secRef} className="rack-grid relative border-t border-line">
      <div className="relative mx-auto max-w-[880px] px-6 py-32 max-md:py-18">
        <p className="eyebrow">01 // THE CONSTRAINT</p>
        <h2 className="stmt mt-6 font-display text-[32px] font-bold leading-[1.15] text-text-hi md:text-[44px]">
          {STATEMENT.split(' ').map((w, i) => (
            <span key={i} className="stmt-word inline-block">
              {w}&nbsp;
            </span>
          ))}
        </h2>

        <div className="problem-cols mt-14 grid gap-12 md:grid-cols-2">
          <p className="problem-col text-[17px] leading-[1.6] text-text-mid">
            An LLM call is pure compute: weights in, logits out. No memory, no state, no idea it was ever
            called before. Whatever "memory" a product seems to have is reconstructed by the machinery
            around the model.
          </p>
          <p className="problem-col text-[17px] leading-[1.6] text-text-mid">
            That machinery is the harness. Context assembly, tool execution, retries, budgets, subagents,
            queues. If you have operated distributed systems, you already understand it — you just haven't
            seen the wiring diagram.
          </p>
        </div>

        {/* Side annotation (desktop only) */}
        <div
          className="problem-annot absolute -right-24 top-1/2 hidden origin-center rotate-90 font-mono text-[11px] tracking-[0.12em] text-text-low lg:block"
          aria-hidden="true"
        >
          statelessness is a property of the node, not the system
        </div>
      </div>
    </section>
  );
}
