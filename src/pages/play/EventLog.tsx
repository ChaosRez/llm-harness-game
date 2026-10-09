import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Sim } from '@/game/engine';
import type { LogSev } from '@/game/types';
import { useSimVersion } from './useEngine';

type Filter = 'ALL' | 'ERRORS' | 'TOOLS' | 'MEMORY';

const SEV_CLASS: Record<LogSev, string> = {
  info: 'text-text-low',
  ok: 'text-signal-green',
  warn: 'text-signal-amber',
  err: 'text-signal-red',
  mem: 'text-signal-teal',
};

function matches(sev: LogSev, text: string, f: Filter): boolean {
  if (f === 'ALL') return true;
  if (f === 'ERRORS') return sev === 'err' || sev === 'warn';
  if (f === 'TOOLS') return /tool|EXEC|search|calc|fs\.read|email|charge|429|breaker/i.test(text);
  return sev === 'mem' || /memory|COMPACT|TRUNCATED|PIN/i.test(text);
}

/** Event log — terminal, auto-scroll, collapsible (game.md §7). */
export default function EventLog({ sim, collapsed, onToggle }: { sim: Sim; collapsed: boolean; onToggle: () => void }) {
  useSimVersion(sim);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [follow, setFollow] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  const lines = sim.log.filter((l) => matches(l.sev, l.text, filter)).slice(-120);

  useEffect(() => {
    if (follow && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [sim.version, follow, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.section
      animate={{ height: collapsed ? 32 : 160 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-none flex-col border-t border-line bg-bg-1"
      aria-label="Event log"
    >
      <header className="flex h-8 flex-none items-center gap-2 border-b border-line px-3">
        <button type="button" onClick={onToggle} className="eyebrow hover:text-text-hi" aria-expanded={!collapsed}>
          {collapsed ? '▸' : '▾'} EVENT LOG
        </button>
        <div className="ml-auto flex items-center gap-1">
          {(['ALL', 'ERRORS', 'TOOLS', 'MEMORY'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] ${filter === f ? 'bg-bg-2 text-signal-green' : 'text-text-low hover:text-text-hi'}`}
            >
              {f}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFollow((v) => !v)}
            className={`ml-1 font-mono text-[9px] uppercase ${follow ? 'text-signal-teal' : 'text-text-low'}`}
            aria-pressed={follow}
          >
            {follow ? '⏷ follow' : '⏸ scroll'}
          </button>
        </div>
      </header>
      {!collapsed && (
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-1 font-mono text-[12px] leading-relaxed">
          {lines.map((l) => (
            <div key={l.id} className={SEV_CLASS[l.sev]}>
              <span className="text-text-low">[t{String(l.tick).padStart(3, '0')}]</span> {l.text}
            </div>
          ))}
          <span className="block-cursor text-signal-green" aria-hidden="true" />
        </div>
      )}
    </motion.section>
  );
}
