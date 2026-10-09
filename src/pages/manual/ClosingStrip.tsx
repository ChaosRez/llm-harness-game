import { useRef } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HEADING = 'Now go break it yourself.';

/** Manual §5 — closing strip: heading word stagger + two CTAs. */
export default function ClosingStrip() {
  const secRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.cs-word', {
        y: 20,
        opacity: 0,
        duration: 0.35,
        stagger: 0.04,
        ease: 'expo.out',
        scrollTrigger: { trigger: secRef.current, start: 'top 70%', once: true },
      });
      gsap.from('.cs-cta', {
        y: 16,
        opacity: 0,
        duration: 0.35,
        stagger: 0.15,
        ease: 'expo.out',
        scrollTrigger: { trigger: secRef.current, start: 'top 70%', once: true },
      });
    },
    { scope: secRef },
  );

  return (
    <section ref={secRef} className="border-t border-line">
      <div className="mx-auto flex max-w-[960px] flex-col items-center px-6 py-24 text-center md:py-32">
        <h3 className="font-display text-[28px] font-bold tracking-[-0.02em] text-text-hi" aria-label={HEADING}>
          {HEADING.split(' ').map((w, i) => (
            <span key={i} aria-hidden="true" className="cs-word inline-block">
              {w}
              {i < HEADING.split(' ').length - 1 ? ' ' : ''}
            </span>
          ))}
        </h3>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/levels"
            data-cursor-label="GO▶"
            className="cs-cta rounded-[2px] bg-signal-green px-6 py-3 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-bg-0 transition duration-150 hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
          >
            ▶ Initialize Campaign
          </Link>
          <Link
            to="/sandbox"
            data-cursor-label="GO▶"
            className="cs-cta rounded-[2px] border border-line px-6 py-3 font-mono text-[13px] uppercase tracking-[0.08em] text-text-mid transition duration-150 hover:-translate-y-px hover:border-signal-amber hover:text-signal-amber active:scale-[0.97]"
          >
            Enter the Lab
          </Link>
        </div>
      </div>
    </section>
  );
}
