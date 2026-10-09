import { memo } from 'react';
import { COLORS } from '@/lib/palette';

interface LoopRingProps {
  /** pixel size of the square glyph (default 24) */
  size?: number;
  /** when true, a green pulse orbits the ring (3s period) */
  animated?: boolean;
  className?: string;
}

/**
 * The loop-ring glyph — logo and recurring motif for the inner loop.
 * 4 arc segments (gaps at 12/3/6/9 o'clock), one segment highlighted green;
 * when animated, a pulse dot orbits at constant speed (design.md §2, §11).
 */
function LoopRingInner({ size = 24, animated = true, className }: LoopRingProps) {
  // geometry in a 24x24 viewBox; ring radius 7.4 centered at 12,12
  const arc = 'M12 4.6 A7.4 7.4 0 0 1 19.4 12';
  return (
    <span
      className={className}
      style={{ display: 'inline-block', width: size, height: size, position: 'relative', flex: 'none' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block' }}>
        <g stroke={COLORS.signalGreen} strokeWidth={1.5} strokeLinecap="round">
          {/* highlighted segment (ASSEMBLE station) */}
          <path d={arc} />
          {/* the other three stations, dimmed */}
          <path d={arc} transform="rotate(90 12 12)" opacity={0.4} />
          <path d={arc} transform="rotate(180 12 12)" opacity={0.4} />
          <path d={arc} transform="rotate(270 12 12)" opacity={0.4} />
        </g>
      </svg>
      {animated && (
        <span
          className="animate-orbit-pulse"
          style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%' }}
        >
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ display: 'block' }}>
            <circle cx={12} cy={4.6} r={1.7} fill={COLORS.signalGreen} />
            <circle cx={12} cy={4.6} r={3} fill={COLORS.signalGreen} opacity={0.22} />
          </svg>
        </span>
      )}
    </span>
  );
}

const LoopRing = memo(LoopRingInner);
export default LoopRing;
