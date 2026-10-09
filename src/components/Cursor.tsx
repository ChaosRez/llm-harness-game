import { useEffect, useRef } from 'react';
import { COLORS } from '@/lib/palette';

/**
 * Custom cursor (design.md §7): 14px square outline that snaps to a 6px
 * filled signal-green square over interactive elements, with an optional
 * 4-char mono label (set `data-cursor-label="PLAY▶"` on key CTAs).
 * 120ms-lerp follow. Pointer-fine devices only; native hover styles remain
 * as fallback everywhere else.
 */
export default function Cursor() {
  const boxRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.body.classList.add('has-custom-cursor');
    const box = boxRef.current;
    const label = labelRef.current;
    if (!box || !label) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let hover = false;
    let raf = 0;
    let visible = false;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        box.style.opacity = '1';
      }
      const t = (e.target as HTMLElement | null)?.closest?.(
        'a, button, [role="button"], input, select, textarea, [data-cursor]',
      ) as HTMLElement | null;
      hover = !!t;
      const text = t?.dataset?.cursorLabel?.slice(0, 4) ?? '';
      label.textContent = text;
      label.style.opacity = text ? '1' : '0';
    };

    const onLeave = () => {
      visible = false;
      box.style.opacity = '0';
      label.style.opacity = '0';
    };

    const loop = () => {
      // ~120ms lerp follow at 60fps
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      const size = hover ? 6 : 14;
      box.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
      box.style.width = `${size}px`;
      box.style.height = `${size}px`;
      box.style.backgroundColor = hover ? COLORS.signalGreen : 'transparent';
      label.style.transform = `translate(${x + 12}px, ${y + 10}px)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.body.classList.remove('has-custom-cursor');
    };
  }, []);

  return (
    <>
      <div
        ref={boxRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 14,
          height: 14,
          border: `1px solid ${COLORS.textMid}`,
          zIndex: 100,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'width 120ms, height 120ms, background-color 120ms, opacity 200ms',
        }}
        className="hidden [@media(pointer:fine)]:block"
      />
      <div
        ref={labelRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 100,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 150ms',
        }}
        className="hidden font-mono text-[10px] font-bold tracking-[0.12em] text-signal-green [@media(pointer:fine)]:block"
      />
    </>
  );
}
