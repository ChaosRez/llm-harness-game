import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Hero from '@/pages/home/Hero';
import Problem from '@/pages/home/Problem';
import TwoLoops from '@/pages/home/TwoLoops';
import CampaignStrip from '@/pages/home/CampaignStrip';
import AnalogyTable from '@/pages/home/AnalogyTable';
import FailureTicker from '@/pages/home/FailureTicker';
import FinalCta from '@/pages/home/FinalCta';

gsap.registerPlugin(ScrollTrigger);

/**
 * Landing page (home.md): hero cluster → the constraint → two loops →
 * campaign strip → translation layer → failure ticker → deploy CTA.
 * Lenis smooth scroll is enabled here only (game/sandbox opt out).
 */
export default function Home() {
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

  return (
    <>
      <Hero />
      <Problem />
      <TwoLoops />
      <CampaignStrip />
      <AnalogyTable />
      <FailureTicker />
      <FinalCta />
    </>
  );
}
