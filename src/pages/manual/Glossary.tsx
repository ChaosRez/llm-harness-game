import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import gsap from 'gsap';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GLOSSARY } from '@/pages/manual/manualData';

interface GlossaryProps {
  /** smooth-scrolls to an element id (Lenis-aware), provided by the page */
  scrollToId: (id: string) => void;
}

/**
 * Manual §4 — failure-mode glossary. Accordion list; every entry is
 * anchorable via `glossary-<slug>` and deep links auto-open + flash teal.
 */
export default function Glossary({ scrollToId }: GlossaryProps) {
  const secRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const [open, setOpen] = useState<string>('');

  // deep link: auto-open + smooth scroll + 2 teal border pulses (manual.md §4)
  useEffect(() => {
    const hash = location.hash.replace(/^#/, '');
    if (!hash.startsWith('glossary-')) return;
    const entry = GLOSSARY.find((g) => `glossary-${g.slug}` === hash);
    if (!entry) return;

    setOpen(entry.slug);
    const t = window.setTimeout(() => {
      scrollToId(hash);
      const el = document.getElementById(hash);
      if (el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(
          el,
          { boxShadow: 'inset 0 0 0 1px rgba(87,199,184,1)' },
          { boxShadow: 'inset 0 0 0 1px rgba(87,199,184,0)', duration: 0.4, repeat: 3, yoyo: true, ease: 'sine.inOut' },
        );
      }
    }, 150);
    return () => window.clearTimeout(t);
  }, [location.hash, scrollToId]);

  return (
    <section id="glossary" ref={secRef} className="mx-auto max-w-[960px] scroll-mt-20 px-6 py-24 md:py-32">
      <p className="eyebrow">04 // GLOSSARY</p>
      <h2 className="mt-4 font-display text-[36px] font-bold tracking-[-0.02em] text-text-hi md:text-[44px]">
        Failure modes
      </h2>
      <p className="mt-4 max-w-[640px] text-text-mid">
        Every way this system breaks has a name, a signature, and a mitigation. The game will find yours.
      </p>

      <Accordion
        type="single"
        collapsible
        value={open}
        onValueChange={setOpen}
        className="mt-12 border-t border-line"
      >
        {GLOSSARY.map((g) => (
          <AccordionItem
            key={g.slug}
            value={g.slug}
            id={`glossary-${g.slug}`}
            className="scroll-mt-20 rounded-[2px] px-2"
          >
            <AccordionTrigger className="py-5 font-mono text-[16px] font-medium tracking-[0.04em] text-text-hi hover:text-signal-green hover:no-underline [&[data-state=open]]:text-signal-green">
              <span className="flex items-baseline gap-3">
                <span className="text-signal-red" aria-hidden="true">■</span>
                {g.term}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-6 pb-2 md:grid-cols-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-low">Definition</div>
                  <p className="mt-2 text-[15px] italic leading-relaxed text-text-hi">{g.definition}</p>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-low">Signature in-game</div>
                  <p className="mt-2 text-[14px] leading-relaxed text-text-mid">{g.signature}</p>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-signal-teal">Mitigation</div>
                  <p className="mt-2 text-[14px] leading-relaxed text-text-mid">{g.mitigation}</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
