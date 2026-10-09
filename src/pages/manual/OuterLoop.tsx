import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { COMPONENTS } from '@/pages/manual/manualData';
import { COLORS } from '@/lib/palette';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ------------------------- diagram geometry (880×520) ------------------------ */

const AGENTS = [
  { id: 'AGENT-00', cx: 400, cy: 150 },
  { id: 'AGENT-01', cx: 400, cy: 370 },
  { id: 'AGENT-02', cx: 540, cy: 150 },
  { id: 'AGENT-03', cx: 540, cy: 370 },
];

/** a mini inner-loop ring for each agent node */
function MiniRing({ cx, cy }: { cx: number; cy: number }) {
  const r = 26;
  return (
    <g stroke={COLORS.signalGreen} strokeWidth={1.5} fill="none">
      {[0, 90, 180, 270].map((rot) => (
        <path
          key={rot}
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          transform={`rotate(${rot} ${cx} ${cy})`}
          opacity={rot === 0 ? 1 : 0.4}
          className="ol-draw"
          pathLength={1}
          strokeDasharray={1}
        />
      ))}
    </g>
  );
}

/** rect as a path so it can participate in stroke-draw */
function box(x: number, y: number, w: number, h: number) {
  return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
}

/** SMIL packet — constant linear speed; not rendered under reduced motion */
function Packet({ path, color, dur, begin = '0s' }: { path: string; color: string; dur: string; begin?: string }) {
  return (
    <circle r={3} fill={color}>
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={path} />
    </circle>
  );
}

const EDGE = {
  dispatcherToQueue: 'M 150 262 L 185 262',
  queueToBus: 'M 295 262 L 350 262',
  busVertical: 'M 350 150 L 350 370',
  busToAgents: [
    'M 350 150 L 374 150',
    'M 350 370 L 374 370',
    'M 350 150 L 514 150',
    'M 350 370 L 514 370',
  ],
  agentsToBus: [
    'M 566 150 L 610 150',
    'M 566 370 L 610 370',
    'M 426 150 L 610 150',
    'M 426 370 L 610 370',
  ],
  busVerticalRight: 'M 610 150 L 610 370',
  busToTools: 'M 610 262 L 680 262',
  agentToMemory: 'M 400 396 L 362 456',
  agentToEval: 'M 540 124 L 620 82',
};

/**
 * Manual §2 — interactive outer-loop anatomy. diagram-outer-loop built in
 * code: dispatcher → queue → agent bus ×4 → tools; memory store + eval
 * harness in teal. Hover lifts a component; click pins its detail card.
 */
export default function OuterLoop() {
  const secRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string>('dispatcher');
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const shown = COMPONENTS.find((c) => c.id === (hovered ?? pinned)) ?? COMPONENTS[0];

  // draw-in scrub over 80vh, then time-based fault cycle (manual.md §2)
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.fromTo(
        '.ol-draw',
        { strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          ease: 'none',
          stagger: 0.06,
          scrollTrigger: {
            trigger: secRef.current,
            start: 'top 80%',
            end: () => `+=${window.innerHeight * 0.8}`,
            scrub: true,
            once: true,
          },
        },
      );

      // legend chips stagger (60ms)
      gsap.from('.ol-legend-chip', {
        y: 16,
        opacity: 0,
        duration: 0.3,
        stagger: 0.06,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.ol-legend', start: 'top 90%', once: true },
      });

      // one agent blinks red and respawns (3s cycle)
      gsap
        .timeline({ repeat: -1 })
        .to({}, { duration: 3 })
        .to('.ol-agent-fault-ring', { opacity: 0.25, duration: 0.15 })
        .to('.ol-agent-fault', { opacity: 1, duration: 0.15 }, '<')
        .to('.ol-agent-fault', { opacity: 0, duration: 0.25 }, '+=0.5')
        .to('.ol-agent-fault-ring', { opacity: 1, duration: 0.25 }, '<');
    },
    { scope: secRef },
  );

  // detail card springs in on swap (scale 0.95→1, 250ms)
  useEffect(() => {
    if (!cardRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      cardRef.current,
      { scale: 0.95, opacity: 0.4 },
      { scale: 1, opacity: 1, duration: 0.25, ease: 'expo.out' },
    );
  }, [shown.id]);

  /** interactive wrapper for a diagram component */
  const hit = (id: string, children: ReactNode, label: string) => {
    const lit = (hovered ?? pinned) === id;
    return (
      <g
        role="button"
        tabIndex={0}
        aria-label={label}
        data-cursor-label="OPEN"
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => setPinned(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPinned(id);
          }
        }}
        className="cursor-pointer outline-none"
        style={{
          transform: hovered === id ? 'translateY(-2px)' : 'none',
          transition: 'transform 150ms cubic-bezier(0.22,1,0.36,1)',
        }}
        data-lit={lit}
      >
        {children}
      </g>
    );
  };

  const strokeFor = (id: string, base: string) => ((hovered ?? pinned) === id ? COLORS.signalAmber : base);

  return (
    <section id="anatomy-outer" ref={secRef} className="scroll-mt-20 border-t border-line py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="max-w-[1200px]">
          <p className="eyebrow">02 // ANATOMY</p>
          <h2 className="mt-4 font-display text-[36px] font-bold tracking-[-0.02em] text-text-hi md:text-[44px]">
            The outer loop
          </h2>
          <p className="mt-4 max-w-[640px] text-text-mid">
            The harness itself: the control plane deciding who works on what, with how much context, and what happens
            when — not if — things fail.
          </p>
        </div>

        <div className="relative mt-12">
          <svg
            viewBox="0 0 880 520"
            className="w-full"
            role="group"
            aria-label="Outer loop architecture diagram"
          >
            {/* ---- edges ---- */}
            <g fill="none" strokeWidth={1.5}>
              <path d={EDGE.dispatcherToQueue} className="ol-draw" stroke={COLORS.signalAmber} pathLength={1} strokeDasharray={1} />
              <path d={EDGE.queueToBus} className="ol-draw" stroke={COLORS.signalAmber} pathLength={1} strokeDasharray={1} />
              <path d={EDGE.busVertical} className="ol-draw" stroke={COLORS.signalAmber} pathLength={1} strokeDasharray={1} />
              {EDGE.busToAgents.map((d, i) => (
                <path key={i} d={d} className="ol-draw" stroke={COLORS.signalAmber} pathLength={1} strokeDasharray={1} opacity={0.7} />
              ))}
              {EDGE.agentsToBus.map((d, i) => (
                <path key={i} d={d} className="ol-draw" stroke={COLORS.signalGreen} pathLength={1} strokeDasharray={1} opacity={0.7} />
              ))}
              <path d={EDGE.busVerticalRight} className="ol-draw" stroke={COLORS.signalGreen} pathLength={1} strokeDasharray={1} />
              <path d={EDGE.busToTools} className="ol-draw" stroke={COLORS.signalGreen} pathLength={1} strokeDasharray={1} />
              <path d={EDGE.agentToMemory} className="ol-draw" stroke={COLORS.signalTeal} pathLength={1} strokeDasharray="0.08" opacity={0.8} />
              <path d={EDGE.agentToEval} className="ol-draw" stroke={COLORS.signalTeal} pathLength={1} strokeDasharray="0.08" opacity={0.8} />
            </g>

            {/* ---- packets (time-based, constant speed) ---- */}
            {!reduced && (
              <g aria-hidden="true">
                <Packet path={EDGE.dispatcherToQueue} color={COLORS.signalAmber} dur="1.2s" />
                <Packet path={`${EDGE.queueToBus} ${EDGE.busVertical.replace('M 350 150', 'L 350 150')}`} color={COLORS.signalAmber} dur="1.8s" begin="-0.6s" />
                <Packet path={EDGE.busToAgents[2]} color={COLORS.signalAmber} dur="1.6s" begin="-0.9s" />
                <Packet path={EDGE.busToAgents[3]} color={COLORS.signalAmber} dur="1.6s" begin="-1.2s" />
                <Packet path={EDGE.busToTools} color={COLORS.signalGreen} dur="1.4s" begin="-0.4s" />
                <Packet path={EDGE.agentToMemory} color={COLORS.signalTeal} dur="2.2s" begin="-1s" />
                <Packet path={EDGE.agentToEval} color={COLORS.signalTeal} dur="2.2s" begin="-1.7s" />
              </g>
            )}

            {/* ---- DISPATCHER ---- */}
            {hit(
              'dispatcher',
              <>
                <path d={box(30, 230, 120, 64)} className="ol-draw" fill={COLORS.bg1} stroke={strokeFor('dispatcher', COLORS.signalAmber)} pathLength={1} strokeDasharray={1} />
                <text x={90} y={258} textAnchor="middle" fontSize={11} fontFamily="'JetBrains Mono', monospace" letterSpacing={1.5} fill={COLORS.textHi}>DISPATCH</text>
                <text x={90} y={276} textAnchor="middle" fontSize={9} fontFamily="'JetBrains Mono', monospace" fill={COLORS.textLow}>FIFO · EDF · MAN</text>
              </>,
              'Dispatcher',
            )}

            {/* ---- QUEUE ---- */}
            {hit(
              'queue',
              <>
                <path d={box(185, 230, 110, 64)} className="ol-draw" fill={COLORS.bg1} stroke={strokeFor('queue', COLORS.signalAmber)} pathLength={1} strokeDasharray={1} />
                <text x={240} y={258} textAnchor="middle" fontSize={11} fontFamily="'JetBrains Mono', monospace" letterSpacing={1.5} fill={COLORS.textHi}>QUEUE</text>
                {/* backlog bars */}
                {[0, 1, 2].map((i) => (
                  <rect key={i} x={218 + i * 16} y={266} width={10} height={14 - i * 4} fill="none" stroke={COLORS.signalAmber} strokeWidth={1} opacity={0.7} />
                ))}
              </>,
              'Queue',
            )}

            {/* ---- AGENTS ×4 ---- */}
            {hit(
              'agents',
              <>
                {AGENTS.map((a, i) => (
                  <g key={a.id} className={i === 1 ? 'ol-agent-fault-ring' : undefined}>
                    <MiniRing cx={a.cx} cy={a.cy} />
                    <text x={a.cx} y={a.cy + 3} textAnchor="middle" fontSize={9} fontFamily="'JetBrains Mono', monospace" fill={COLORS.textMid}>{a.id}</text>
                  </g>
                ))}
                {/* AGENT-01 fault flash — nodes fail; the control plane routes around */}
                <g className="ol-agent-fault" opacity={0}>
                  <circle cx={400} cy={370} r={34} fill="none" stroke={COLORS.signalRed} strokeWidth={1.5} strokeDasharray="4 3" />
                  <text x={400} y={418} textAnchor="middle" fontSize={9} fontFamily="'JetBrains Mono', monospace" fill={COLORS.signalRed}>FAULT → RESPAWN</text>
                </g>
                {/* hit area over the whole agent cluster */}
                <rect x={366} y={116} width={208} height={288} fill="transparent" />
              </>,
              'Agents, times four',
            )}

            {/* ---- TOOLS ---- */}
            {hit(
              'tools',
              <>
                <path d={box(680, 230, 150, 64)} className="ol-draw" fill={COLORS.bg1} stroke={strokeFor('tools', COLORS.signalGreen)} pathLength={1} strokeDasharray={1} />
                <text x={755} y={258} textAnchor="middle" fontSize={11} fontFamily="'JetBrains Mono', monospace" letterSpacing={1.5} fill={COLORS.textHi}>TOOLS</text>
                <text x={755} y={276} textAnchor="middle" fontSize={9} fontFamily="'JetBrains Mono', monospace" fill={COLORS.textLow}>RATE-LIMITED RPCs</text>
              </>,
              'Tools',
            )}

            {/* ---- MEMORY STORE ---- */}
            {hit(
              'memory',
              <>
                <path d={box(185, 430, 180, 52)} className="ol-draw" fill={COLORS.bg1} stroke={strokeFor('memory', COLORS.signalTeal)} pathLength={1} strokeDasharray={1} />
                <text x={275} y={453} textAnchor="middle" fontSize={11} fontFamily="'JetBrains Mono', monospace" letterSpacing={1.5} fill={COLORS.signalTeal}>MEMORY STORE</text>
                <text x={275} y={469} textAnchor="middle" fontSize={9} fontFamily="'JetBrains Mono', monospace" fill={COLORS.textLow}>SHARED STATE · TRUST BOUNDARY</text>
              </>,
              'Memory store',
            )}

            {/* ---- EVAL HARNESS ---- */}
            {hit(
              'eval',
              <>
                <path d={box(620, 30, 190, 52)} className="ol-draw" fill={COLORS.bg1} stroke={strokeFor('eval', COLORS.signalTeal)} strokeDasharray="0.05 0.03" pathLength={1} />
                <text x={715} y={53} textAnchor="middle" fontSize={11} fontFamily="'JetBrains Mono', monospace" letterSpacing={1.5} fill={COLORS.signalTeal}>EVAL HARNESS</text>
                <text x={715} y={69} textAnchor="middle" fontSize={9} fontFamily="'JetBrains Mono', monospace" fill={COLORS.textLow}>SAMPLING OUTPUTS</text>
              </>,
              'Eval harness',
            )}
          </svg>

          {/* floating detail card */}
          <div
            ref={cardRef}
            className="mt-6 rounded-[2px] border border-line bg-bg-1 p-5 lg:absolute lg:top-4 lg:right-4 lg:mt-0 lg:w-72"
            aria-live="polite"
          >
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">COMPONENT</div>
            <h3 className="mt-2 font-display text-[20px] font-bold text-text-hi">{shown.name}</h3>
            <p className="mt-1 font-mono text-[11px] text-signal-amber">{shown.blurb}</p>
            <p className="mt-3 text-[14px] leading-relaxed text-text-mid">{shown.body}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-text-low">
              click a component to pin · nodes fail; the control plane routes around
            </p>
          </div>
        </div>

        {/* legend */}
        <div className="ol-legend mt-8 flex flex-wrap gap-2">
          {COMPONENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setPinned(c.id)}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'ol-legend-chip border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-150',
                (hovered ?? pinned) === c.id
                  ? 'border-signal-amber text-text-hi'
                  : 'border-line text-text-mid hover:border-text-low',
                (c.id === 'memory' || c.id === 'eval') && 'border-dashed',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
