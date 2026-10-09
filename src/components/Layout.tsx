import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Cursor from '@/components/Cursor';

/**
 * Shared shell — nested-route pattern: App wires `<Route element={<Layout/>}>`
 * with all pages as child routes. This component renders `<Outlet/>`; never
 * pass children to it.
 *
 * Navbar positioning contract: Navbar is `fixed` (56px / h-14), so this
 * Layout owns the offset — `pt-14` on the content slot. Pages must NOT add
 * nav-height padding; full-bleed heroes opt out inside the page (-mt-14).
 *
 * The in-level game view (/play/:levelId) has its own HUD: it renders bare,
 * without nav/footer and without the offset.
 */
export default function Layout() {
  const location = useLocation();
  const isGameView = location.pathname.startsWith('/play/');

  // Content pages scroll from the top on navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (isGameView) {
    return (
      <main className="min-h-[100dvh] bg-bg-0">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-bg-2 focus:px-3 focus:py-2 focus:font-mono focus:text-[12px] focus:text-signal-teal"
      >
        Skip to content
      </a>
      <Navbar />
      <Cursor />
      <main id="main" className="flex-1 pt-14">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
