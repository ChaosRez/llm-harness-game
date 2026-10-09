import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { STATIONS } from '@/pages/manual/manualData';
import { COLORS } from '@/lib/palette';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CX = 260;
const CY = 260;
const R = 150;

/** Station positions: top, right, bottom, left (clockwise). */
const POS = [
  { x: 260, y: 110 },
  { x: 410, y: 260 },
  { x: 260, y: 410 },
  { x: 110, y: 260 },
];

/** Directional arcs between stations (clockwise, with gaps at stations). */
const ARCS = [
  'M 306.4 117.3 A 150 150 0 0 1 402.7 213.6',
  'M 402.7 306.4 A 150 150 0 0 1 306.4 402.7',
  'M 213.6 402.7 A 150 150 0 0 1 117.3 306.4',
  'M 117.3 213.6 A 150 150 0 0 1 213.6 117.3',
];

const ARROWHEADS = [
  { x: 402.7, y: 213.6, rot: 72 },
  { x: 306.4, y: 402.7, rot: 162 },
  { x: 117.3, y: 306.4, rot: 252 },
  { x: 213.6, y: 117.3, rot: 342 },
];

/**
 * Manual §1 — interactive inner-loop anatomy. diagram-inner-loop built in
 * code: 4 clickable stations on a ring, orbiting pulse (1 station / 1.2s,
 * pauses once a station is selected), stroke-draw on first approach.
 */
export default function InnerLoop() {
  const secRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [pulsePaused, setPulsePaused] = useState(false);

  // stroke draw, scrubbed over 60vh on first approach (manual.md §1)
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.fromTo(
        '.il-draw',
        { strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          ease: 'none',
          stagger: 0.12,
          scrollTrigger: {
            trigger: secRef.current,
            start: 'top 80%',
            end: () => `+=${window.innerHeight * 0.6}`,
            scrub: true,
            once: true,
          },
        },
      );
    },
    { scope: secRef },
  );

  // detail panel crossfade + bullet stagger on station select (manual.md §1)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(panel, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: 'expo.out' });
    gsap.fromTo(
      panel.querySelectorAll('.il-detail-item'),
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.06, ease: 'expo.out' },
    );
  }, [selected]);

  const st = STATIONS[selected];
  // rotate ring so the selected station sits at top; labels counter-rotate
  const ringRot = -90 * selected;
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <section id="anatomy-inner" ref={secRef} className="mx-auto max-w-[1200px] scroll-mt-20 px-6 py-24 md:py-32">
      <p className="eyebrow">01 // ANATOMY</p>
      <h2 className="mt-4 font-display text-[36px] font-bold tracking-[-0.02em] text-text-hi md:text-[44px]">
        The inner loop
      </h2>
      <p className="mt-4 max-w-[640px] text-text-mid">
        One task, one agent, one cycle — repeated until the answer converges or the budget dies. Click a station.
      </p>

      <div className="mt-12 grid items-start gap-12 lg:grid-cols-[55fr_45fr]">
        {/* Diagram */}
        <div>
          <svg
            viewBox="0 0 520 520"
            className="w-full max-w-[520px]"
            role="group"
            aria-label="Inner loop diagram: assemble, infer, tool call, observe"
          >
            {/* faint reference ring */}
            <circle cx={CX} cy={CY} r={R} stroke={COLORS.line} strokeWidth={1} fill="none" opacity={0.5} />

            {/* rotating ring: arcs + stations */}
            <g
              style={{
                transform: `rotate(${ringRot}deg)`,
                transformOrigin: `${CX}px ${CY}px`,
                transition: reduced ? 'none' : 'transform 300ms cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {ARCS.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  className="il-draw"
                  stroke={COLORS.signalGreen}
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0.65}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={0}
                />
              ))}
              {ARROWHEADS.map((a, i) => (
                <path
                  key={i}
                  d="M -5 -4 L 0 0 L -5 4"
                  className="il-draw"
                  stroke={COLORS.signalGreen}
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0.65}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={0}
                  transform={`translate(${a.x} ${a.y}) rotate(${a.rot})`}
                />
              ))}

              {POS.map((p, i) => (
                <g
                  key={STATIONS[i].id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Station ${STATIONS[i].name}`}
                  aria-pressed={selected === i}
                  data-cursor-label="OPEN"
                  onClick={() => {
                    setSelected(i);
                    setPulsePaused(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(i);
                      setPulsePaused(true);
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={34}
                    className={cn('transition-all duration-150', selected !== i && 'hover:stroke-text-mid')}
                    fill={selected === i ? 'rgba(87,227,154,0.08)' : COLORS.bg1}
                    stroke={selected === i ? COLORS.signalGreen : COLORS.line}
                    strokeWidth={selected === i ? 1.5 : 1}
                    style={
                      selected === i
                        ? { filter: 'drop-shadow(0 0 12px rgba(87,227,154,0.35))' }
                        : undefined
                    }
                  />
                  {/* label counter-rotated to stay upright */}
                  <g transform={`rotate(${-ringRot} ${p.x} ${p.y})`}>
                    <text
                      x={p.x}
                      y={p.y + 3}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="'JetBrains Mono', monospace"
                      letterSpacing={1}
                      fill={selected === i ? COLORS.signalGreen : COLORS.textMid}
                      className="pointer-events-none select-none"
                    >
                      {STATIONS[i].name}
                    </text>
                  </g>
                </g>
              ))}
            </g>

            {/* orbiting pulse — constant speed, 1 station per 1.2s (4.8s period) */}
            <g
              className="animate-orbit-pulse"
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                animationDuration: '4.8s',
                animationPlayState: pulsePaused ? 'paused' : 'running',
              }}
              aria-hidden="true"
            >
              <circle cx={CX} cy={CY - R} r={4} fill={COLORS.signalGreen} />
              <circle cx={CX} cy={CY - R} r={8} fill={COLORS.signalGreen} opacity={0.22} />
            </g>
          </svg>

          <p className="mt-4 font-mono text-[12px] tracking-[0.04em] text-text-low">
            termination = final answer | budget exhausted | truncation failure
          </p>
        </div>

        {/* Detail panel */}
        <div ref={panelRef} className="rounded-[2px] border border-line bg-bg-1 p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">
              STATION {String(selected + 1).padStart(2, '0')}/04
            </span>
            <span className="h-2 w-2 rounded-full bg-signal-green" aria-hidden="true" />
          </div>
          <h3 className="mt-3 font-display text-[28px] font-bold text-signal-green">{st.name}</h3>
          <p className="il-detail-item mt-4 text-[15px] leading-relaxed text-text-mid">{st.body}</p>

          <div className="il-detail-item mt-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal-red">Failure modes</div>
            <ul className="mt-2 space-y-1.5">
              {st.failures.map((f) => (
                <li key={f} className="flex gap-2 font-mono text-[12px] text-text-mid">
                  <span className="text-signal-red" aria-hidden="true">■</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="il-detail-item mt-6 border-l-2 border-signal-teal pl-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal-teal">DS NOTE</div>
            <p className="mt-1 font-mono text-[12px] leading-relaxed text-text-mid">{st.dsNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
