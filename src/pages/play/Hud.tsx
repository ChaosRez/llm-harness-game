import { Link } from 'react-router';
import { motion } from 'framer-motion';
import LoopRing from '@/components/LoopRing';
import type { Sim } from '@/game/engine';
import { useSimVersion } from './useEngine';
import type { Speed } from './useEngine';
import { Bar, fmt } from './widgets';

interface HudProps {
  sim: Sim;
  label: string; // e.g. 'L01 · HELLO, LOOP' or 'SANDBOX'
  paused: boolean;
  speed: Speed;
  sfxOn: boolean;
  onTogglePause: () => void;
  onSetSpeed: (s: Speed) => void;
  onToggleSfx: () => void;
  onOpenMenu: () => void;
  /** sandbox extras */
  rightSlot?: React.ReactNode;
  accent?: 'green' | 'amber';
}

/** Top HUD bar, 48px (game.md §2). */
export default function Hud({ sim, label, paused, speed, sfxOn, onTogglePause, onSetSpeed, onToggleSfx, onOpenMenu, rightSlot, accent = 'green' }: HudProps) {
  useSimVersion(sim);
  const budgetPct = sim.budgetInfinite ? 1 : Math.max(0, sim.budget / sim.cfg.budget);
  const near = sim.nearDeadlineCount();
  const accentText = accent === 'green' ? 'text-signal-green' : 'text-signal-amber';

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-12 flex-none items-center gap-4 border-b border-line bg-bg-1 px-3"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-text-hi hover:text-signal-green"
        aria-label="Open menu"
      >
        <LoopRing size={18} />
        <span className="hidden sm:inline">THE_HARNESS</span>
        <span className="text-text-low">/</span>
        <span className={accentText}>{label}</span>
      </button>

      <span className="font-mono text-[12px] tabular-nums text-text-mid">
        TICK <span className="text-text-hi">{String(sim.tick).padStart(5, '0')}</span>
      </span>

      <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
        <span className="eyebrow flex-none">BUDGET</span>
        <Bar value={budgetPct} flash={!sim.budgetInfinite} className="w-28 flex-none" />
        <span className={`font-mono text-[12px] tabular-nums ${budgetPct < 0.15 && !sim.budgetInfinite ? 'text-signal-red' : 'text-signal-amber'}`}>
          {sim.budgetInfinite ? '∞' : `${fmt(Math.max(0, sim.budget))} / ${fmt(sim.cfg.budget)}`}
        </span>
      </div>

      <span className="hidden font-mono text-[12px] tabular-nums text-signal-green lg:inline">
        VALUE EARNED {fmt(sim.valueEarned)}
      </span>

      <span
        className={`hidden font-mono text-[12px] tabular-nums sm:inline ${near > 0 ? 'animate-pulse-dot text-signal-red' : 'text-text-low'}`}
      >
        {near > 0 ? `⚠ ${near} NEAR DEADLINE` : '· 0 NEAR DEADLINE'}
      </span>

      <div className="ml-auto flex items-center gap-1">
        {rightSlot}
        <div className="flex items-center rounded-[2px] border border-line" role="group" aria-label="Simulation speed">
          <button
            type="button"
            onClick={onTogglePause}
            className={`px-2 py-1 font-mono text-[11px] ${paused ? 'text-signal-amber underline underline-offset-4' : 'text-text-mid hover:text-text-hi'}`}
            aria-label={paused ? 'Resume (space)' : 'Pause (space)'}
          >
            {paused ? '▶' : '⏸'}
          </button>
          {([1, 2, 4] as Speed[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSetSpeed(s)}
              className={`px-2 py-1 font-mono text-[11px] ${speed === s && !paused ? 'text-signal-green underline underline-offset-4' : 'text-text-mid hover:text-text-hi'}`}
            >
              {s}×
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleSfx}
          className={`px-2 py-1 font-mono text-[11px] uppercase ${sfxOn ? 'text-signal-green' : 'text-text-low'}`}
          aria-pressed={sfxOn}
        >
          SFX
        </button>
        <Link
          to="/levels"
          className="rounded-[2px] border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-mid transition-colors hover:border-signal-red hover:text-text-hi"
        >
          Exit
        </Link>
      </div>
    </motion.header>
  );
}
