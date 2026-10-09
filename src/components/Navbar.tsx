import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import LoopRing from '@/components/LoopRing';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { to: '/levels', label: 'CAMPAIGN' },
  { to: '/manual', label: 'FIELD MANUAL' },
  { to: '/sandbox', label: 'SANDBOX' },
];

const linkBase =
  'font-mono text-[12px] uppercase tracking-[0.12em] transition-colors duration-150 pb-0.5 border-b-2';

function DesktopLinks() {
  return (
    <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
      {NAV_LINKS.map((l) => (
        <NavLink key={l.to} to={l.to} className="group relative">
          {({ isActive }) => (
            <span
              className={cn(
                linkBase,
                isActive
                  ? 'text-signal-green border-signal-green'
                  : 'text-text-mid border-transparent hover:text-text-hi',
              )}
            >
              {l.label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Fixed top nav, 56px, bg-0/85 + backdrop-blur (design.md §8).
 * The 56px offset for page content lives in Layout — pages never compensate.
 */
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-line bg-bg-0/85 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-6 px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" aria-label="THE_HARNESS home">
            <LoopRing size={24} animated />
            <span className="font-mono text-[14px] font-bold tracking-[0.12em] text-text-hi">
              THE_HARNESS<span className="block-cursor" aria-hidden="true" />
            </span>
          </Link>

          {/* Center links */}
          <DesktopLinks />

          {/* Right cluster */}
          <div className="hidden items-center gap-5 md:flex">
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-low">
              <span className="inline-block h-2 w-2 rounded-full bg-signal-green animate-pulse-dot" />
              Operational
            </span>
            <Link
              to="/levels"
              className="rounded-[2px] bg-signal-green px-4 py-2 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-bg-0 transition duration-150 hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
            >
              ▶ Initialize
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-line text-text-mid md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile full-screen overlay menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-center bg-bg-0/97 px-8 backdrop-blur md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <nav className="flex flex-col gap-7" aria-label="Mobile">
              {NAV_LINKS.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.04 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <NavLink
                    to={l.to}
                    onClick={close}
                    className={({ isActive }) =>
                      cn(
                        'font-mono text-2xl uppercase tracking-[0.12em]',
                        isActive ? 'text-signal-green' : 'text-text-mid',
                      )
                    }
                  >
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.16, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to="/levels"
                  onClick={close}
                  className="mt-4 inline-block rounded-[2px] bg-signal-green px-6 py-3 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-bg-0"
                >
                  ▶ Initialize
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
