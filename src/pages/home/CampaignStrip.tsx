import { useRef } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import HexBadge from '@/components/HexBadge';
import { LEVELS } from '@/lib/levels';
import { getLevelStatus, getStars } from '@/lib/progress';
import type { LevelId } from '@/lib/progress';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, useGSAP);

function Stars({ id }: { id: LevelId }) {
  const stars = getStars(id);
  return (
    <span className="flex gap-1" aria-label={`${stars} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 16 16" width={14} height={14} fill="none" aria-hidden="true">
          <path
            d="M8 1.8 L10 6 L14.6 6.5 L11.2 9.7 L12.2 14.2 L8 11.9 L3.8 14.2 L4.8 9.7 L1.4 6.5 L6 6 Z"
            stroke={i < stars ? '#57E39A' : '#5C655D'}
            fill={i < stars ? '#57E39A' : 'none'}
            strokeWidth={1}
            opacity={i < stars ? 1 : 0.6}
          />
        </svg>
      ))}
    </span>
  );
}

/** Section 4 — Campaign strip (home.md §4): pinned horizontal scroll. */
export default function CampaignStrip() {
  const secRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || window.innerWidth < 768) return; // static vertical grid

      const track = trackRef.current;
      const sec = secRef.current;
      if (!track || !sec) return;

      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 48);

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // tilt ±1.5° based on velocity
            const rot = gsap.utils.clamp(-1.5, 1.5, self.getVelocity() / -1200);
            gsap.to('.lvl-card', { rotation: rot, duration: 0.3, overwrite: 'auto' });
          },
          onScrubComplete: () => gsap.to('.lvl-card', { rotation: 0, duration: 0.4, overwrite: 'auto' }),
        },
      });
      return () => tween.scrollTrigger?.kill();
    },
    { scope: secRef },
  );

  return (
    <section ref={secRef} className="relative overflow-hidden border-t border-line bg-bg-0">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col justify-center px-6 py-20">
        <p className="eyebrow">04 // CAMPAIGN</p>
        <h2 className="mt-4 font-display text-[28px] font-bold text-text-hi md:text-[36px]">
          Six incidents. Escalating blast radius.
        </h2>

        <div
          ref={trackRef}
          className="mt-12 flex flex-wrap gap-6 max-md:flex-col md:flex-nowrap md:will-change-transform"
        >
          {LEVELS.map((lvl) => {
            const status = getLevelStatus(lvl.id);
            const locked = status === 'LOCKED';
            const inner = (
              <>
                <HexBadge n={lvl.n} size={72} locked={locked} />
                <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">
                  Level 0{lvl.n}
                </div>
                <h3 className={cn('mt-1 font-display text-[24px] font-bold', locked ? 'text-text-low' : 'text-text-hi')}>
                  {lvl.name}
                </h3>
                <p className="mt-2 text-[14px] leading-snug text-text-mid">{lvl.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {lvl.tags.map((t) => (
                    <span
                      key={t}
                      className="border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-mid"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-between pt-5">
                  <Stars id={lvl.id} />
                  <span
                    className={cn(
                      'font-mono text-[10px] uppercase tracking-[0.12em]',
                      status === 'CLEARED' && 'text-signal-green',
                      status === 'READY' && 'text-signal-amber',
                      status === 'LOCKED' && 'text-text-low',
                    )}
                  >
                    Status: {status}
                  </span>
                </div>
              </>
            );
            const cardCls = cn(
              'lvl-card group flex h-[420px] w-full flex-col rounded-[2px] border border-line bg-bg-1 p-6 transition-[border-color,box-shadow] duration-200 md:w-[320px] md:flex-none',
              !locked && 'hover:-translate-y-1.5 hover:border-signal-green hover:shadow-glow-green',
            );
            return locked ? (
              <div key={lvl.id} className={cardCls} aria-disabled="true">
                {inner}
              </div>
            ) : (
              <Link key={lvl.id} to={`/play/${lvl.id}`} className={cardCls} data-cursor-label="PLAY▶">
                {inner}
              </Link>
            );
          })}

          {/* End card — sandbox */}
          <Link
            to="/sandbox"
            data-cursor-label="OPEN"
            className="lvl-card flex h-[420px] w-full flex-col items-start justify-center rounded-[2px] border border-signal-amber/60 bg-bg-1 p-6 transition duration-200 hover:-translate-y-1.5 hover:border-signal-amber hover:shadow-glow-amber md:w-[320px] md:flex-none"
          >
            <span className="font-display text-[40px] font-bold text-signal-amber">∷</span>
            <h3 className="mt-4 font-display text-[24px] font-bold text-text-hi">+ SANDBOX</h3>
            <p className="mt-2 text-[14px] text-text-mid">Break things on purpose.</p>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-signal-amber">
              No win condition. All the knobs. →
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
