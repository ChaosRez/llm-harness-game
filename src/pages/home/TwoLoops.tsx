import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { COLORS } from '@/lib/palette';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Section 3 — The Two Loops (home.md §3). Pinned 220vh scrub story.
 * Phase A: inner loop (agent loop) draws in; a pulse orbits; ctx bar fills.
 * Phase B: the inner loop docks at 0.35x as one node of the outer loop
 * (harness: dispatcher → queue → agents → tools; memory + eval in teal).
 */

/* ------------------------------ inner loop ----------------------------- */

const IL_CX = 440;
const IL_CY = 260;
const IL_R = 150;
const RING_MOTION = `M ${IL_CX} ${IL_CY - IL_R} A ${IL_R} ${IL_R} 0 1 1 ${IL_CX} ${IL_CY + IL_R} A ${IL_R} ${IL_R} 0 1 1 ${IL_CX} ${IL_CY - IL_R}`;

const STATIONS = [
  { name: 'ASSEMBLE', x: 440, y: 110 },
  { name: 'INFER', x: 590, y: 260 },
  { name: 'TOOL CALL', x: 440, y: 410 },
  { name: 'OBSERVE', x: 290, y: 260 },
];

const ARCS = [
  'M 486.4 117.3 A 150 150 0 0 1 582.7 213.6',
  'M 582.7 306.4 A 150 150 0 0 1 486.4 402.7',
  'M 393.6 402.7 A 150 150 0 0 1 297.3 306.4',
  'M 297.3 213.6 A 150 150 0 0 1 393.6 117.3',
];

const ARROWHEADS = [
  { x: 582.7, y: 213.6, rot: 72 },
  { x: 486.4, y: 402.7, rot: 162 },
  { x: 297.3, y: 306.4, rot: 252 },
  { x: 393.6, y: 117.3, rot: 342 },
];

/* ------------------------------ outer loop ----------------------------- */

const AGENTS = [
  { cx: 400, cy: 150, label: 'AGENT-00', slot: true },
  { cx: 400, cy: 370, label: 'AGENT-01' },
  { cx: 560, cy: 150, label: 'AGENT-02' },
  { cx: 560, cy: 370, label: 'AGENT-03' },
];

function MiniRing({ cx, cy }: { cx: number; cy: number }) {
  const r = 28;
  return (
    <g stroke={COLORS.signalGreen} strokeWidth={1.5} fill="none" className="ol-mini-ring">
      {[0, 90, 180, 270].map((rot) => (
        <path
          key={rot}
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          transform={`rotate(${rot} ${cx} ${cy})`}
          opacity={rot === 0 ? 1 : 0.4}
        />
      ))}
    </g>
  );
}

/* ------------------------------- section ------------------------------- */

export default function TwoLoops() {
  const secRef = useRef<HTMLElement>(null);
  const ctxCountRef = useRef<SVGTextElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduced) {
        // Collapse to the final static state (design.md §6 guardrail)
        gsap.set('.il-edge', { strokeDashoffset: 0 });
        gsap.set('.il-arrowhead', { opacity: 1 });
        gsap.set('.il-node-label', { fill: COLORS.signalGreen });
        gsap.set('#ctx-fill', { attr: { width: 84 } });
        gsap.set('#copy-a', { opacity: 0 });
        gsap.set('#copy-b', { opacity: 1 });
        gsap.set('#il-root', { scale: 0.35, x: -40, y: -110, svgOrigin: '440 260' });
        gsap.set('#agent-slot', { opacity: 0 });
        gsap.set('.ol-el', { opacity: 1 });
        gsap.set('.ol-edge', { strokeDashoffset: 0, opacity: 1 });
        if (ctxCountRef.current) ctxCountRef.current.textContent = 'ctx 5,632 / 8,192 tok';
        return;
      }

      const counter = { v: 0 };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: secRef.current,
          start: 'top top',
          end: '+=220%',
          pin: true,
          scrub: 0.6,
        },
      });

      /* Phase A — inner loop draws (0 → 0.45) */
      tl.fromTo('.il-edge', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.24, stagger: 0.045 }, 0.02);
      tl.fromTo('.il-arrowhead', { opacity: 0 }, { opacity: 1, duration: 0.02, stagger: 0.045 }, 0.24);
      tl.to('.il-node-label', { fill: COLORS.signalGreen, duration: 0.02, stagger: 0.045 }, 0.06);
      tl.to('.il-node-box', { stroke: COLORS.signalGreen, duration: 0.02, stagger: 0.045 }, 0.06);
      tl.fromTo('#ctx-fill', { attr: { width: 0 } }, { attr: { width: 84 }, duration: 0.18 }, 0.08);
      tl.to(
        counter,
        {
          v: 5632,
          duration: 0.18,
          onUpdate: () => {
            if (ctxCountRef.current)
              ctxCountRef.current.textContent = `ctx ${Math.round(counter.v).toLocaleString('en-US')} / 8,192 tok`;
          },
        },
        0.08,
      );

      /* Phase B — dock + outer loop (0.45 → 0.9) */
      tl.to('#copy-a', { opacity: 0, y: -14, duration: 0.04, ease: 'power1.in' }, 0.45);
      tl.to('#copy-b', { opacity: 1, y: 0, duration: 0.04, ease: 'power1.out' }, 0.5);
      tl.to('#il-root', { scale: 0.35, x: -40, y: -110, svgOrigin: '440 260', duration: 0.1, ease: 'power2.inOut' }, 0.45);
      tl.to('#agent-slot', { opacity: 0, duration: 0.03 }, 0.55);
      tl.fromTo('.ol-el', { opacity: 0 }, { opacity: 1, duration: 0.04, stagger: 0.02 }, 0.56);
      tl.fromTo(
        '.ol-edge',
        { strokeDashoffset: 1, opacity: 1 },
        { strokeDashoffset: 0, duration: 0.08, stagger: 0.018 },
        0.6,
      );
      tl.fromTo('.ol-packet', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.86);
      tl.to({}, { duration: 0.1 }, 0.9); // settle
    },
    { scope: secRef },
  );

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <section ref={secRef} className="relative border-t border-line bg-bg-0">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1200px] items-center gap-10 px-6 py-16">
        {/* Copy (two crossfading blocks) */}
        <div className="relative w-full md:w-[45%]" style={{ minHeight: 340 }}>
          <div id="copy-a" className="absolute inset-0">
            <p className="eyebrow">02 // INNER LOOP — THE AGENT LOOP</p>
            <h2 className="mt-4 font-display text-[28px] font-bold leading-tight text-text-hi md:text-[36px]">
              One task. One loop. Four stations.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-text-mid">
              Every agentic task runs the same cycle: assemble the context window, call the model, parse a
              tool call, execute it, append the observation. Repeat until the answer converges — or the
              budget bleeds out.
            </p>
          </div>
          <div id="copy-b" className="absolute inset-0 opacity-0" style={{ transform: 'translateY(14px)' }}>
            <p className="eyebrow">03 // OUTER LOOP — THE HARNESS</p>
            <h2 className="mt-4 font-display text-[28px] font-bold leading-tight text-text-hi md:text-[36px]">
              The control plane around the nodes.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-text-mid">
              Dispatch, queueing, fan-out, shared memory, rate limits, budgets, evals. The outer loop
              decides who works on what, with how much context, and what happens when — not if — something
              fails.
            </p>
          </div>
        </div>

        {/* Diagram stage */}
        <div className="hidden w-[55%] md:block">
          <svg viewBox="0 0 880 520" className="w-full" role="img" aria-label="Inner and outer loop architecture diagram">
            <g className="font-mono">
              {/* ============ OUTER LOOP (drawn in phase B) ============ */}
              <g id="ol-root">
                {/* dispatcher */}
                <g className="ol-el" opacity={0}>
                  <rect x={30} y={235} width={96} height={50} fill={COLORS.bg1} stroke={COLORS.signalAmber} strokeWidth={1} />
                  <text x={78} y={258} textAnchor="middle" fontSize={10} fill={COLORS.textMid} letterSpacing={1}>DISPATCH</text>
                  <text x={78} y={273} textAnchor="middle" fontSize={8} fill={COLORS.textLow} letterSpacing={1}>CONTROL PLANE</text>
                </g>
                {/* queue */}
                <g className="ol-el" opacity={0}>
                  {[222, 242, 262].map((y) => (
                    <rect key={y} x={150} y={y} width={52} height={16} fill={COLORS.bg1} stroke={COLORS.signalAmber} strokeWidth={1} opacity={0.9} />
                  ))}
                  <text x={176} y={300} textAnchor="middle" fontSize={9} fill={COLORS.textLow} letterSpacing={1}>QUEUE</text>
                </g>
                {/* docking slot for the inner loop */}
                <g id="agent-slot">
                  <circle cx={400} cy={150} r={56} fill="none" stroke={COLORS.signalGreen} strokeWidth={1} strokeDasharray="4 5" opacity={0.5} />
                </g>
                {/* mini agent rings (A1..A3) */}
                {AGENTS.filter((a) => !a.slot).map((a) => (
                  <g key={a.label} className="ol-el" opacity={0}>
                    <MiniRing cx={a.cx} cy={a.cy} />
                    <text x={a.cx} y={a.cy + 48} textAnchor="middle" fontSize={9} fill={COLORS.textLow} letterSpacing={1}>{a.label}</text>
                  </g>
                ))}
                <text x={400} y={206} textAnchor="middle" fontSize={9} fill={COLORS.textLow} letterSpacing={1} className="ol-el" opacity={0}>AGENT-00</text>
                {/* tools */}
                {[
                  { y: 133, label: 'SEARCH' },
                  { y: 243, label: 'CALC' },
                  { y: 353, label: 'FS READ' },
                ].map((t) => (
                  <g key={t.label} className="ol-el" opacity={0}>
                    <rect x={720} y={t.y} width={120} height={34} fill={COLORS.bg1} stroke={COLORS.line} strokeWidth={1} />
                    <text x={780} y={t.y + 21} textAnchor="middle" fontSize={10} fill={COLORS.textMid} letterSpacing={1}>{t.label}</text>
                  </g>
                ))}
                {/* memory store + eval harness (teal) */}
                <g className="ol-el" opacity={0}>
                  <rect x={300} y={452} width={170} height={40} fill={COLORS.bg1} stroke={COLORS.signalTeal} strokeWidth={1} />
                  <text x={385} y={476} textAnchor="middle" fontSize={10} fill={COLORS.signalTeal} letterSpacing={1}>MEMORY STORE</text>
                </g>
                <g className="ol-el" opacity={0}>
                  <rect x={620} y={452} width={170} height={40} fill={COLORS.bg1} stroke={COLORS.signalTeal} strokeWidth={1} strokeDasharray="5 4" />
                  <text x={705} y={476} textAnchor="middle" fontSize={10} fill={COLORS.signalTeal} letterSpacing={1}>EVAL HARNESS</text>
                </g>

                {/* edges: dispatcher→queue→agents (amber), agents→tools (green), memory/eval (teal) */}
                <g fill="none" strokeWidth={1}>
                  <path className="ol-edge" opacity={0} pathLength={1} strokeDasharray={1} stroke={COLORS.signalAmber} d="M 126 260 L 150 260" />
                  <path className="ol-edge" opacity={0} pathLength={1} strokeDasharray={1} stroke={COLORS.signalAmber} d="M 202 260 C 280 260 300 150 344 150" />
                  <path className="ol-edge" opacity={0} pathLength={1} strokeDasharray={1} stroke={COLORS.signalAmber} d="M 202 260 C 280 260 300 370 344 370" />
                  <path className="ol-edge" opacity={0} pathLength={1} strokeDasharray={1} stroke={COLORS.signalAmber} d="M 202 250 C 330 230 440 180 532 152" />
                  <path className="ol-edge" opacity={0} pathLength={1} strokeDasharray={1} stroke={COLORS.signalAmber} d="M 202 270 C 330 300 440 350 532 368" />
                  <path className="ol-edge" opacity={0} pathLength={1} strokeDasharray={1} stroke={COLORS.signalGreen} d="M 428 150 L 720 150" />
                  <path className="ol-edge" opacity={0} pathLength={1} strokeDasharray={1} stroke={COLORS.signalGreen} d="M 588 150 C 660 160 660 260 720 260" />
                  <path className="ol-edge" opacity={0} pathLength={1} strokeDasharray={1} stroke={COLORS.signalGreen} d="M 428 370 L 720 370" />
                  <path className="ol-edge" opacity={0} pathLength={1} strokeDasharray={1} stroke={COLORS.signalGreen} d="M 588 370 C 660 360 660 260 720 260" />
                  <path className="ol-el" opacity={0} stroke={COLORS.signalTeal} strokeDasharray="3 4" d="M 400 398 L 385 452" />
                  <path className="ol-el" opacity={0} stroke={COLORS.signalTeal} strokeDasharray="3 4" d="M 560 398 L 530 452" />
                  <path className="ol-el" opacity={0} stroke={COLORS.signalTeal} strokeDasharray="5 4" d="M 780 387 L 740 452" />
                </g>

                {/* packets (time-based, constant speed) */}
                {!reducedMotion && (
                  <g className="ol-packet" opacity={0}>
                    <circle r={3} fill={COLORS.signalAmber}>
                      <animateMotion dur="2.6s" repeatCount="indefinite" path="M 202 260 C 280 260 300 150 344 150" />
                    </circle>
                    <circle r={3} fill={COLORS.signalAmber}>
                      <animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite" path="M 202 260 C 280 260 300 370 344 370" />
                    </circle>
                    <circle r={3} fill={COLORS.signalGreen}>
                      <animateMotion dur="2.2s" repeatCount="indefinite" path="M 428 150 L 720 150" />
                    </circle>
                    <circle r={3} fill={COLORS.signalGreen}>
                      <animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite" path="M 588 370 C 660 360 660 260 720 260" />
                    </circle>
                    <circle r={2.5} fill={COLORS.signalTeal}>
                      <animateMotion dur="3s" begin="0.4s" repeatCount="indefinite" path="M 400 398 L 385 452" />
                    </circle>
                  </g>
                )}
              </g>

              {/* ============ INNER LOOP (phase A; docks into AGENT-00) ============ */}
              <g id="il-root">
                {/* edges */}
                <g fill="none" stroke={COLORS.line} strokeWidth={1.5}>
                  {ARCS.map((d, i) => (
                    <path key={i} className="il-edge" d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1} />
                  ))}
                </g>
                <g fill={COLORS.signalGreen}>
                  {ARROWHEADS.map((a, i) => (
                    <path
                      key={i}
                      className="il-arrowhead"
                      opacity={0}
                      d="M 0 0 L -8 -4 L -8 4 Z"
                      transform={`translate(${a.x} ${a.y}) rotate(${a.rot})`}
                    />
                  ))}
                </g>
                {/* orbiting pulse (time-based, loops while pinned) */}
                {!reducedMotion && (
                  <circle r={3.5} fill={COLORS.signalGreen}>
                    <animateMotion dur="4s" repeatCount="indefinite" path={RING_MOTION} />
                  </circle>
                )}
                {/* station nodes */}
                {STATIONS.map((s) => (
                  <g key={s.name}>
                    <rect
                      className="il-node-box"
                      x={s.x - 44}
                      y={s.y - 15}
                      width={88}
                      height={30}
                      rx={2}
                      fill={COLORS.bg1}
                      stroke={COLORS.line}
                      strokeWidth={1}
                    />
                    <text
                      className="il-node-label"
                      x={s.x}
                      y={s.y + 4}
                      textAnchor="middle"
                      fontSize={10}
                      letterSpacing={1.5}
                      fill={COLORS.textMid}
                    >
                      {s.name}
                    </text>
                  </g>
                ))}
                {/* center: context window + capacity bar */}
                <text x={IL_CX} y={IL_CY - 14} textAnchor="middle" fontSize={10} letterSpacing={1.5} fill={COLORS.textLow}>
                  CONTEXT WINDOW
                </text>
                <rect x={IL_CX - 60} y={IL_CY - 2} width={120} height={6} fill="none" stroke={COLORS.line} strokeWidth={1} />
                <rect id="ctx-fill" x={IL_CX - 60} y={IL_CY - 2} width={0} height={6} fill={COLORS.signalGreen} opacity={0.85} />
                <text ref={ctxCountRef} x={IL_CX} y={IL_CY + 26} textAnchor="middle" fontSize={10} letterSpacing={0.5} fill={COLORS.textLow}>
                  ctx 0 / 8,192 tok
                </text>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
