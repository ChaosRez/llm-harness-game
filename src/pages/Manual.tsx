import { useCallback, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ManualHeader from '@/pages/manual/ManualHeader';
import InnerLoop from '@/pages/manual/InnerLoop';
import OuterLoop from '@/pages/manual/OuterLoop';
import TranslationTable from '@/pages/manual/TranslationTable';
import Glossary from '@/pages/manual/Glossary';
import ClosingStrip from '@/pages/manual/ClosingStrip';

gsap.registerPlugin(ScrollTrigger);

/**
 * Field Manual (/manual) — manual.md. Header band + progress rail, inner-loop
 * anatomy, outer-loop architecture, translation table, failure glossary.
 * Lenis smooth scroll; GSAP scrub draws; glossary deep links auto-open.
 */
export default function Manual() {
  const lenisRef = useRef<Lenis | null>(null);

  // Lenis smooth scroll on content pages (design.md §6)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.11 });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  /** Lenis-aware smooth scroll to a section/anchor id, offset for the fixed nav */
  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, { offset: -64, duration: 1.1 });
    } else {
      el.scrollIntoView({ block: 'start' });
    }
  }, []);

  return (
    <div>
      <ManualHeader onNavigate={scrollToId} />
      <InnerLoop />
      <OuterLoop />
      <TranslationTable />
      <Glossary scrollToId={scrollToId} />
      <ClosingStrip />
    </div>
  );
}
