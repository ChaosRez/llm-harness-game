import { Link } from 'react-router';
import LoopRing from '@/components/LoopRing';

/**
 * Terminal-styled footer, all content pages (design.md §8).
 */
export default function Footer() {
  return (
    <footer className="border-t border-line bg-bg-1">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-14 md:grid-cols-3">
        {/* Col 1 — logo + one-liner */}
        <div>
          <div className="flex items-center gap-3">
            <LoopRing size={22} animated />
            <span className="font-mono text-[14px] font-bold tracking-[0.12em] text-text-hi">THE_HARNESS</span>
          </div>
          <p className="mt-4 text-[14px] text-text-low">A game about the machinery around the model.</p>
        </div>

        {/* Col 2 — nav */}
        <nav className="flex flex-col gap-2.5 font-mono text-[12px] uppercase tracking-[0.12em]" aria-label="Footer">
          <Link to="/levels" className="text-text-mid transition-colors duration-150 hover:text-signal-green">Campaign</Link>
          <Link to="/manual" className="text-text-mid transition-colors duration-150 hover:text-signal-green">Field Manual</Link>
          <Link to="/sandbox" className="text-text-mid transition-colors duration-150 hover:text-signal-green">Sandbox</Link>
        </nav>

        {/* Col 3 — system status mini-log */}
        <div className="font-mono text-[12px] leading-6 text-text-low">
          <div className="mb-2 uppercase tracking-[0.12em]">System status</div>
          <div>uptime 99.98% · queue_depth 0 · last_incident L5</div>
          <div>fleet 4/4 OK · tokens/s 1,024 · retry_budget 100%</div>
          <div>checkpoint saved · eval_pipeline green · no pages open</div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">
          <span>© 2025 THE_HARNESS — built for operators</span>
          <span>
            v1.0.0-static<span className="block-cursor" aria-hidden="true" />
          </span>
        </div>
      </div>
    </footer>
  );
}
