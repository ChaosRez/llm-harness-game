import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Lock } from 'lucide-react';
import HexBadge from '@/components/HexBadge';
import { LEVEL_CONTENT, TAG_DEFINITIONS } from '@/pages/levels/levelContent';
import type { LevelInfo } from '@/lib/levels';
import type { LevelStatus } from '@/lib/progress';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

function TagChip({ tag }: { tag: string }) {
  const def = TAG_DEFINITIONS[tag];
  return (
    <span className="group/chip relative">
      <span className="inline-block cursor-default border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-mid transition-colors duration-150 group-hover/chip:border-signal-teal group-hover/chip:text-text-hi">
        {tag}
      </span>
      {def && (
        <span
          className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-56 border border-line bg-bg-2 px-3 py-2 font-mono text-[11px] normal-case tracking-normal text-text-mid opacity-0 shadow-glow-green transition-opacity duration-150 group-hover/chip:opacity-100"
          role="tooltip"
        >
          <span className="text-signal-teal">{tag}</span> — {def}
        </span>
      )}
    </span>
  );
}

function StarGlyphs({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn('font-mono tracking-[0.1em]', className)} aria-label={`${count} star threshold`}>
      {'★'.repeat(count)}
    </span>
  );
}

interface LevelRowProps {
  level: LevelInfo;
  status: LevelStatus;
  stars: number;
}

/**
 * One campaign board ticket (levels.md §2): badge / main / meta / action grid,
 * expandable briefing + hint. Locked rows are dimmed with a lock action.
 */
export default function LevelRow({ level, status, stars }: LevelRowProps) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const content = LEVEL_CONTENT[level.id];
  const locked = status === 'LOCKED';
  const cleared = status === 'CLEARED';
  const current = status === 'READY' && !cleared;

  return (
    <motion.div
      initial={{ y: 48, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: EASE }}
      whileHover={locked ? { x: [0, -2, 2, -2, 2, 0] } : { x: 4 }}
      className={cn(
        'relative rounded-[2px] border bg-bg-1 p-6 transition-colors [transition-duration:250ms] md:p-8',
        locked
          ? 'border-line opacity-55'
          : 'border-line hover:border-signal-green',
      )}
      data-cursor={locked ? true : undefined}
      data-cursor-label={locked ? 'LOCK' : undefined}
      aria-label={`Level ${level.n}: ${level.name}${locked ? ' (locked)' : ''}`}
    >
      <div className="grid gap-8 lg:grid-cols-[96px_1fr_280px_160px]">
        {/* Badge */}
        <div className="flex items-start">
          <motion.div
            initial={{ rotate: 0 }}
            whileInView={{ rotate: 360 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            {/* slow amber pulse (2s) marks the current level (levels.md §2) */}
            <motion.div
              className={cn('rounded-[2px]', cleared && 'shadow-glow-green')}
              animate={
                current && !reducedMotion
                  ? {
                      boxShadow: [
                        '0 0 24px rgba(242,163,60,0.05)',
                        '0 0 24px rgba(242,163,60,0.30)',
                        '0 0 24px rgba(242,163,60,0.05)',
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <HexBadge n={level.n} size={96} locked={locked} />
            </motion.div>
          </motion.div>
        </div>

        {/* Main */}
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">
            LEVEL 0{level.n}
          </div>
          <h3 className="mt-1 font-display text-[28px] font-bold leading-tight text-text-hi">{level.name}</h3>
          <p className="mt-1.5 text-[16px] text-text-mid">{level.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {level.tags.map((t) => (
              <TagChip key={t} tag={t} />
            ))}
          </div>
          <p className="mt-4 font-mono text-[12px] tracking-[0.04em] text-signal-teal">
            <span className="text-text-low">CONCEPT:</span> {level.concept}
          </p>

          {/* Briefing toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-5 font-mono text-[12px] uppercase tracking-[0.12em] text-text-mid transition-colors duration-150 hover:text-signal-green"
          >
            <span className={cn('mr-2 inline-block transition-transform duration-300', open && 'rotate-90')}>▸</span>
            Briefing
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="briefing"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="pt-4 text-[15px] leading-relaxed text-text-mid">{content.briefing}</div>
                <div className="mt-4 border-l-2 border-signal-amber pl-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal-amber">Hint</div>
                  <p className="mt-1 text-[14px] text-text-mid">{content.hint}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Meta */}
        <div className="min-w-0 font-mono text-[12px] leading-relaxed">
          <div>
            <span className="text-[11px] uppercase tracking-[0.12em] text-text-low">WIN:</span>{' '}
            <span className="text-text-mid">{level.win}</span>
          </div>
          <div className="mt-4 space-y-1">
            {content.stars.map((s, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <StarGlyphs count={i + 1} className={cleared && stars > i ? 'text-signal-green' : 'text-text-low'} />
                <span className="text-text-mid">{s}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <span className="text-[11px] uppercase tracking-[0.12em] text-text-low">NEW HAZARDS:</span>
            <ul className="mt-1 space-y-1">
              {content.hazards.map((h) => (
                <li key={h} className="flex gap-2 text-text-mid">
                  <span className="text-signal-red" aria-hidden="true">■</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-col items-start gap-4 lg:items-end">
          {locked ? (
            <div className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-text-low">
              <Lock size={14} aria-hidden="true" />
              <span>CLEAR L0{level.n - 1} FIRST</span>
            </div>
          ) : (
            <>
              <Link
                to={`/play/${level.id}`}
                data-cursor-label="PLAY▶"
                className={cn(
                  'rounded-[2px] px-5 py-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.08em] transition duration-150 hover:-translate-y-px active:scale-[0.97]',
                  cleared
                    ? 'border border-line text-text-mid hover:border-signal-green hover:text-text-hi'
                    : 'bg-signal-green text-bg-0 hover:brightness-110',
                )}
              >
                {cleared ? 'Replay' : 'Deploy ▶'}
              </Link>
              {cleared && (
                <div
                  className="rotate-[-6deg] rounded-[2px] border border-signal-green px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-signal-green"
                  aria-label={`Cleared with ${stars} of 3 stars`}
                >
                  Cleared {'★'.repeat(stars)}
                  {'☆'.repeat(Math.max(0, 3 - stars))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
