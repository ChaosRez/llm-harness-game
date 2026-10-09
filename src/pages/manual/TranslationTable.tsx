import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { TRANSLATION_ROWS } from '@/pages/manual/manualData';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Manual §3 — the harness ↔ datacenter translation table.
 * Rows stagger in (x -24→0 + fade); hover: left cell green / right cell amber.
 */
export default function TranslationTable() {
  const secRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.tr-row', {
        x: -24,
        opacity: 0,
        duration: 0.35,
        stagger: 0.07,
        ease: 'expo.out',
        scrollTrigger: { trigger: secRef.current, start: 'top 80%', once: true },
      });
    },
    { scope: secRef },
  );

  return (
    <section id="translation" ref={secRef} className="mx-auto max-w-[960px] scroll-mt-20 px-6 py-24 md:py-32">
      <p className="eyebrow">03 // TRANSLATION LAYER</p>
      <h2 className="mt-4 font-display text-[36px] font-bold tracking-[-0.02em] text-text-hi md:text-[44px]">
        You already know this system.
      </h2>

      <div className="mt-12 border border-line">
        {/* header row */}
        <div className="hidden grid-cols-2 border-b border-line bg-bg-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-low md:grid">
          <div className="px-5 py-3">IN THE HARNESS</div>
          <div className="border-l border-line px-5 py-3">IN YOUR DATACENTER</div>
        </div>

        {TRANSLATION_ROWS.map((row) => (
          <div
            key={row.harness}
            className="tr-row group grid border-b border-line transition-colors duration-150 last:border-b-0 hover:bg-bg-2 md:grid-cols-2"
          >
            <div className="px-5 pt-4 pb-1 md:py-4">
              <span className="font-mono text-[14px] text-text-mid transition-colors duration-150 group-hover:text-signal-green">
                {row.harness}
              </span>
              <span className="mx-2 text-text-low md:hidden" aria-hidden="true">↔</span>
              <span className="font-mono text-[14px] text-text-mid transition-colors duration-150 group-hover:text-signal-amber md:hidden">
                {row.datacenter}
              </span>
            </div>
            <div className="hidden border-l border-line px-5 py-4 md:block">
              <span className="font-mono text-[14px] text-text-mid transition-colors duration-150 group-hover:text-signal-amber">
                {row.datacenter}
              </span>
            </div>
            <p className="px-5 pb-4 text-[13px] text-text-low md:col-span-2 md:border-t md:border-line/50 md:pt-2 md:pb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">WHY&nbsp;</span>
              {row.why}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[15px] text-text-mid">
        Heard a term in a post-mortem?{' '}
        <a href="#glossary" className="text-signal-teal underline-offset-4 transition-colors duration-150 hover:underline">
          It&rsquo;s in the glossary ↓
        </a>
      </p>
    </section>
  );
}
