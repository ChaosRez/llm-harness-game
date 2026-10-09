import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, useReducedMotion } from 'framer-motion';
import LevelRow from '@/pages/levels/LevelRow';
import { LEVELS } from '@/lib/levels';
import { getLevelStatus, getProgress, getStars } from '@/lib/progress';
import type { ProgressState } from '@/lib/progress';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const TITLE = 'SIX INCIDENTS';

/** Eyebrow type-in (18ms/char), static under reduced motion (levels.md §1). */
function TypeIn({ text, className }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? text.length : 0);

  useEffect(() => {
    if (reduced) {
      setN(text.length);
      return;
    }
    setN(0);
    const t = window.setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          window.clearInterval(t);
          return v;
        }
        return v + 1;
      });
    }, 18);
    return () => window.clearInterval(t);
  }, [text, reduced]);

  return (
    <p className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      <span className="block-cursor" aria-hidden="true" />
    </p>
  );
}

/** Char-split headline, stagger 26ms, y 32→0, rotateX 50→0 (levels.md §1). */
function SplitTitle({ text }: { text: string }) {
  return (
    <h1
      className="font-display text-[48px] font-bold leading-[0.95] tracking-[-0.02em] text-text-hi md:text-[64px]"
      aria-label={text}
    >
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="inline-block"
          style={{ transformOrigin: '50% 100%' }}
          initial={{ y: 32, opacity: 0, rotateX: 50 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ delay: 0.026 * i, duration: 0.5, ease: EASE }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </h1>
  );
}

/** Progress HUD: CLEARED n/6 · ★ n/18 · 6-segment bar (levels.md §1). */
function ProgressHud({ progress }: { progress: ProgressState }) {
  const cleared = LEVELS.filter((l) => progress.levels[l.id]?.completed).length;
  const stars = LEVELS.reduce((acc, l) => acc + (progress.levels[l.id]?.stars ?? 0), 0);

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.3, ease: EASE }}
      className="flex flex-col gap-3 font-mono text-[12px] uppercase tracking-[0.12em] text-text-mid lg:items-end lg:text-right"
    >
      <div className="flex gap-6">
        <span>
          CLEARED <span className="text-text-hi">{cleared}/6</span>
        </span>
        <span>
          <span className="text-signal-green">★</span> <span className="text-text-hi">{stars}/18</span>
        </span>
      </div>
      <div className="flex gap-1" aria-label={`${cleared} of 6 levels cleared`}>
        {LEVELS.map((l) => {
          const status = getLevelStatus(l.id);
          return (
            <span
              key={l.id}
              title={`L0${l.n} ${status}`}
              className={cn(
                'h-2 w-8 rounded-[1px]',
                status === 'CLEARED' && 'bg-signal-green',
                status === 'READY' && 'bg-signal-amber',
                status === 'LOCKED' && 'bg-line',
              )}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

/** Sandbox card — amber-bordered, never locked (levels.md §2). */
function SandboxCard() {
  return (
    <motion.div
      initial={{ y: 48, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: EASE }}
      whileHover={{ x: 4 }}
      className="rounded-[2px] border border-signal-amber/60 bg-bg-1 p-6 transition-colors [transition-duration:250ms] hover:border-signal-amber md:p-8"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[96px_1fr_160px]">
        <div className="flex h-24 w-24 items-center justify-center border border-signal-amber/60 font-mono text-[32px] text-signal-amber">
          ∷
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal-amber">OPEN LAB</div>
          <h3 className="mt-1 font-display text-[28px] font-bold leading-tight text-text-hi">SANDBOX — THE LAB</h3>
          <p className="mt-1.5 text-[16px] text-text-mid">
            No win condition. All the knobs. Break things on purpose.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['custom arrivals', 'chaos injection', 'live telemetry'].map((t) => (
              <span
                key={t}
                className="border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-mid"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex lg:justify-end">
          <Link
            to="/sandbox"
            data-cursor-label="GO▶"
            className="rounded-[2px] border border-signal-amber px-5 py-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-signal-amber transition duration-150 hover:-translate-y-px hover:bg-signal-amber hover:text-bg-0 active:scale-[0.97]"
          >
            Enter Lab ▶
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Campaign board (/levels) — levels.md. Incident-board of 6 tickets with
 * sequential locks + stars from localStorage, plus the sandbox card.
 */
export default function Levels() {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState<ProgressState>(() => getProgress());

  // Lenis smooth scroll on content pages (design.md §6)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.11 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  // Keep the HUD live across tabs / post-game returns (levels.md — Interactions)
  useEffect(() => {
    const refresh = () => setProgress(getProgress());
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return (
    <div className="rack-grid-faint">
      {/* Section 1 — page header */}
      <section className="mx-auto max-w-[1200px] px-6 pt-24 pb-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[640px]">
            <TypeIn text="// CAMPAIGN MODE" className="eyebrow" />
            <div className="mt-4">
              {reduced ? (
                <h1 className="font-display text-[48px] font-bold leading-[0.95] tracking-[-0.02em] text-text-hi md:text-[64px]">
                  {TITLE}
                </h1>
              ) : (
                <SplitTitle text={TITLE} />
              )}
            </div>
            <motion.p
              initial={reduced ? false : { y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
              className="mt-6 max-w-[640px] text-[18px] text-text-mid"
            >
              Each incident teaches one layer of the harness. Levels 1–3 run the inner loop. Levels 4–6 hand you the
              control plane. Clearing a level unlocks the next; stars measure how cleanly you ran it.
            </motion.p>
          </div>
          <ProgressHud progress={progress} />
        </div>
      </section>

      {/* Section 2 — the board */}
      <section className="mx-auto max-w-[1200px] space-y-6 px-6 pb-24" aria-label="Campaign levels">
        {LEVELS.map((level) => (
          <LevelRow
            key={level.id}
            level={level}
            status={getLevelStatus(level.id)}
            stars={getStars(level.id)}
          />
        ))}
        <SandboxCard />
      </section>

      {/* Section 3 — footer strip */}
      <motion.section
        initial={reduced ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.3 }}
        className="border-t border-line"
      >
        <p className="mx-auto max-w-[1200px] px-6 py-8 text-center font-mono text-[12px] uppercase tracking-[0.12em] text-text-low">
          INCIDENT LOG MAINTAINED BY THE ORCHESTRATOR — all failures are simulated, all lessons are real.
        </p>
      </motion.section>
    </div>
  );
}
