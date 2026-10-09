import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, TextPlugin, useGSAP);

const ClusterScene = lazy(() => import('@/pages/home/ClusterScene'));

const TITLE = 'THE HARNESS';
const EYEBROW = '// AN OPERATIONS GAME ABOUT LLM HARNESS ARCHITECTURE';

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Bottom HUD strip: four live-feel counters with tabular numerals. */
function HudStrip() {
  const [tick, setTick] = useState(4812);
  const [tokens, setTokens] = useState(1024);
  const [queue, setQueue] = useState(3);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1); // 2/s
      setTokens(Math.round(1024 * (0.85 + Math.random() * 0.3)));
      setQueue((q) => (Math.random() < 0.15 ? Math.min(4, Math.max(2, q + (Math.random() < 0.5 ? -1 : 1))) : q));
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const cells: Array<{ label: string; value: string; live?: boolean }> = [
    { label: 'TICK', value: tick.toLocaleString('en-US').padStart(6, '0'), live: true },
    { label: 'TOKENS/S', value: tokens.toLocaleString('en-US'), live: true },
    { label: 'QUEUE_DEPTH', value: String(queue).padStart(2, '0'), live: true },
    { label: 'FLEET', value: '4/4 OK' },
  ];

  return (
    <div className="hud-strip absolute inset-x-0 bottom-0 z-20 border-t border-line bg-bg-0/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-10 gap-y-2 px-6 py-3">
        {cells.map((c) => (
          <div key={c.label} className="flex items-baseline gap-2 font-mono text-[12px] tracking-[0.08em]">
            <span className="text-text-low">{c.label}</span>
            <span key={c.value} className={c.live ? 'digit-flash text-text-hi' : 'text-signal-green'}>
              {c.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** WebGL fallback: 3 constant-speed CSS dots over the static backdrop. */
function FallbackPackets() {
  const dots = [
    { top: '30%', duration: '9s', delay: '0s', color: 'bg-signal-green' },
    { top: '55%', duration: '12s', delay: '-4s', color: 'bg-signal-green' },
    { top: '42%', duration: '10s', delay: '-7s', color: 'bg-signal-amber' },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className={`packet-drift absolute h-1 w-1 rounded-full ${d.color}`}
          style={{ top: d.top, animationDuration: d.duration, animationDelay: d.delay }}
        />
      ))}
    </div>
  );
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [webgl] = useState(webglAvailable);
  const [inView, setInView] = useState(true);

  // Pause the render loop once the hero leaves the viewport
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      // (1) HUD strip slides up + fades
      tl.from('.hud-strip', { yPercent: 100, opacity: 0, duration: 0.3 }, 0.1);
      // (2) eyebrow types in
      tl.fromTo(
        '.hero-eyebrow-text',
        { text: '' },
        { text: EYEBROW, duration: EYEBROW.length * 0.018, ease: 'none' },
        0.2,
      );
      // (3) title chars stagger in
      tl.from(
        '.hero-char',
        { y: 40, opacity: 0, rotateX: 60, duration: 0.6, stagger: 0.028, transformOrigin: '50% 100%' },
        0.55,
      );
      // (4) subhead words
      tl.from('.hero-word', { y: 12, opacity: 0, duration: 0.4, stagger: 0.03 }, 1.15);
      // (5) CTAs pop
      tl.from('.hero-cta', { scale: 0.94, opacity: 0, duration: 0.35, stagger: 0.08 }, 1.5);
      tl.from('.hero-body, .hero-cue', { opacity: 0, duration: 0.4 }, 1.6);

      // On scroll: content parallax (0.4x) + fade by 60% viewport
      gsap.to(contentRef.current, {
        y: -window.innerHeight * 0.24,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: heroRef.current, start: 'top top', end: '60% top', scrub: true },
      });
    },
    { scope: heroRef },
  );

  return (
    <section ref={heroRef} className="scanlines relative -mt-14 min-h-[100dvh] overflow-hidden">
      {/* Background stack: image → rack grid → R3F → content */}
      <img
        src="/hero-datacenter.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-25"
        draggable={false}
      />
      <div className="absolute inset-0 rack-grid" aria-hidden="true" />
      {webgl ? (
        <Suspense fallback={<FallbackPackets />}>
          <div className="absolute inset-0" aria-hidden="true">
            <ClusterScene visible={inView} />
          </div>
        </Suspense>
      ) : (
        <FallbackPackets />
      )}
      {/* vignette to keep text legible */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{ background: 'linear-gradient(to right, rgba(11,13,12,.82) 0%, rgba(11,13,12,.25) 60%, rgba(11,13,12,.55) 100%)' }}
      />

      {/* Content */}
      <div ref={contentRef} className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1440px] items-center px-6 pb-24 pt-14">
        <div className="max-w-[720px]">
          <p className="hero-eyebrow eyebrow min-h-[1.2em]">
            <span className="hero-eyebrow-text">{EYEBROW}</span>
            <span className="block-cursor" aria-hidden="true" />
          </p>
          <h1
            className="mt-5 font-display text-[clamp(3rem,9vw,5.5rem)] font-bold leading-[0.95] text-text-hi"
            style={{ perspective: 600 }}
            aria-label={TITLE}
          >
            {TITLE.split('').map((ch, i) => (
              <span key={i} className="hero-char inline-block will-change-transform" aria-hidden="true">
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </h1>
          <p className="mt-6 text-[20px] leading-relaxed text-text-mid">
            {'The model is a stateless compute node. You are the control plane.'.split(' ').map((w, i) => (
              <span key={i} className="hero-word inline-block will-change-transform">
                {w}&nbsp;
              </span>
            ))}
          </p>
          <p className="hero-body mt-4 text-[16px] text-text-low">
            Assemble context. Dispatch subagents. Survive retry storms. Six levels between you and production.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link
              to="/levels"
              data-cursor-label="PLAY▶"
              className="hero-cta rounded-[2px] bg-signal-green px-6 py-3.5 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-bg-0 shadow-glow-green transition duration-150 hover:-translate-y-px hover:brightness-110 active:scale-[0.97] active:animate-boot-flash"
            >
              ▶ Initialize campaign
            </Link>
            <Link
              to="/manual"
              data-cursor-label="OPEN"
              className="hero-cta rounded-[2px] border border-line px-6 py-3.5 font-mono text-[13px] uppercase tracking-[0.08em] text-text-mid transition-colors duration-150 hover:border-signal-green hover:text-text-hi"
            >
              Read the field manual
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="hero-cue absolute bottom-16 left-1/2 z-10 -translate-x-1/2 animate-bob font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">
        ▼ Scroll to boot sequence
      </div>

      <HudStrip />
    </section>
  );
}
