import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TITLE = 'READ THE WIRING';

export const RAIL_SECTIONS = [
  { id: 'anatomy-inner', label: '01 ANATOMY: INNER' },
  { id: 'anatomy-outer', label: '02 ANATOMY: OUTER' },
  { id: 'translation', label: '03 TRANSLATION' },
  { id: 'glossary', label: '04 GLOSSARY' },
] as const;

interface ManualHeaderProps {
  onNavigate: (id: string) => void;
}

/**
 * Manual §0 — header band (manual-header.png at 30%, rack-grid overlay,
 * ken-burns) + fixed left progress rail with scroll-spy markers.
 */
export default function ManualHeader({ onNavigate }: ManualHeaderProps) {
  const bandRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>(RAIL_SECTIONS[0].id);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!reduced) {
        // slow ken-burns on the header image (20s, alternate)
        gsap.to('.mh-img', { scale: 1.06, duration: 20, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        // H1 char stagger (26ms)
        gsap.from('.mh-char', { y: 32, opacity: 0, rotateX: 50, duration: 0.5, stagger: 0.026, ease: 'expo.out' });
        gsap.from('.mh-sub', { y: 24, opacity: 0, duration: 0.45, delay: 0.2, ease: 'expo.out' });
      }

      // rail fill scrubs with page scroll
      if (fillRef.current) {
        gsap.fromTo(
          fillRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            transformOrigin: 'top',
            scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
          },
        );
      }
    },
    { scope: bandRef },
  );

  // scroll-spy for rail markers
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: '-30% 0px -55% 0px' },
    );
    for (const s of RAIL_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section
        ref={bandRef}
        className="relative h-[320px] overflow-hidden border-b border-line"
        aria-label="Field Manual header"
      >
        <img
          src="/manual-header.png"
          alt=""
          className="mh-img absolute inset-0 h-full w-full object-cover opacity-30"
        />
        {/* bg-0 → transparent vertical gradient + rack grid over the image */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-0 via-bg-0/40 to-transparent" aria-hidden="true" />
        <div className="rack-grid absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto flex h-full max-w-[1200px] flex-col justify-end px-6 pb-10">
          <p className="eyebrow">{'// FIELD MANUAL · REV 1.0'}</p>
          <h1
            className="mt-4 font-display text-[48px] font-bold leading-[0.95] tracking-[-0.02em] text-text-hi md:text-[64px]"
            aria-label={TITLE}
          >
            {TITLE.split('').map((ch, i) => (
              <span key={i} aria-hidden="true" className="mh-char inline-block [transform-origin:50%_100%]">
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </h1>
          <p className="mh-sub mt-4 max-w-[560px] text-[18px] text-text-mid">
            Everything the game teaches, written down. Keep it open in a second tab.
          </p>
        </div>
      </section>

      {/* Progress rail — fixed left edge, desktop ≥1280px only */}
      <nav
        className="fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 xl:block"
        aria-label="Manual sections"
      >
        <div className="relative flex flex-col gap-8 pl-5">
          {/* track + teal fill */}
          <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-line" aria-hidden="true">
            <div ref={fillRef} className="h-full w-full origin-top bg-signal-teal" style={{ transform: 'scaleY(0)' }} />
          </div>
          {RAIL_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onNavigate(s.id)}
              className={cn(
                'group flex items-center gap-2 text-left font-mono text-[11px] tracking-[0.12em] transition-colors duration-150',
                active === s.id ? 'text-signal-teal' : 'text-text-low hover:text-text-mid',
              )}
            >
              <span
                className={cn(
                  'inline-block h-1.5 w-1.5 rounded-full transition-colors duration-150',
                  active === s.id ? 'bg-signal-teal' : 'bg-line group-hover:bg-text-low',
                )}
                aria-hidden="true"
              />
              {s.label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
