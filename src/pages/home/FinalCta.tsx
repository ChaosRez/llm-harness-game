import { useRef } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HEADING = 'Take the controls.';

/** Section 7 — Final CTA (home.md §7). */
export default function FinalCta() {
  const secRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;
      const tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        scrollTrigger: { trigger: secRef.current, start: 'top 70%' },
      });
      tl.from('.cta-char', {
        y: 30,
        opacity: 0,
        rotateX: 60,
        duration: 0.5,
        stagger: 0.024,
        transformOrigin: '50% 100%',
      });
      tl.from('.cta-sub', { y: 20, opacity: 0, duration: 0.4 }, '+=0.2');
      tl.from('.cta-btn', { scale: 0.94, opacity: 0, duration: 0.35 }, '-=0.15');
    },
    { scope: secRef },
  );

  return (
    <section ref={secRef} className="rack-grid-faint relative border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-6 py-40 text-center max-md:py-24">
        <p className="eyebrow">06 // DEPLOY</p>
        <h2
          className="mt-6 font-display text-[44px] font-bold leading-none text-text-hi md:text-[64px]"
          style={{ perspective: 600 }}
          aria-label={HEADING}
        >
          {HEADING.split('').map((ch, i) => (
            <span key={i} className="cta-char inline-block will-change-transform" aria-hidden="true">
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h2>
        <p className="cta-sub mt-6 max-w-[52ch] text-[17px] text-text-mid">
          No installs. No API keys. The cluster is simulated, the failures are real.
        </p>
        <div className="cta-btn mt-10">
          <Link
            to="/levels"
            data-cursor-label="PLAY▶"
            className="glow-cta inline-block rounded-[2px] bg-signal-green px-14 py-5 font-mono text-[16px] font-medium uppercase tracking-[0.08em] text-bg-0 transition duration-150 hover:-translate-y-px hover:brightness-110 active:scale-[0.97] active:animate-boot-flash"
          >
            ▶ Initialize campaign
          </Link>
        </div>
        <p className="cta-sub mt-8 font-mono text-[12px] uppercase tracking-[0.12em] text-text-low">
          best played by people who have paged someone at 3AM
        </p>
      </div>
    </section>
  );
}
