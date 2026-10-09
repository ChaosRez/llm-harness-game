import { COLORS } from '@/lib/palette';
import { cn } from '@/lib/utils';

interface HexBadgeProps {
  /** level number 1..6 */
  n: number;
  size?: number;
  locked?: boolean;
  className?: string;
}

/**
 * Hexagonal level badge with a mono glyph per level (design.md §11 —
 * level-badge-{1..6}.svg, built in code): 01 ring · 02 wrench ·
 * 03 stacked blocks · 04 fan-out arrows · 05 circuit-break · 06 tri-dots.
 */
export default function HexBadge({ n, size = 96, locked = false, className }: HexBadgeProps) {
  const stroke = locked ? COLORS.textLow : COLORS.signalGreen;
  const s = stroke;
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      fill="none"
      className={cn('flex-none', className)}
      aria-hidden="true"
    >
      {/* hexagon outline */}
      <path
        d="M48 8 L82 28 V68 L48 88 L14 68 V28 Z"
        stroke={s}
        strokeWidth={1.5}
        opacity={locked ? 0.7 : 1}
      />
      <g stroke={s} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {n === 1 && (
          /* 01 — ring */
          <>
            <circle cx={48} cy={48} r={14} />
            <circle cx={48} cy={34} r={2.5} fill={s} stroke="none" />
          </>
        )}
        {n === 2 && (
          /* 02 — wrench */
          <>
            <path d="M38 58 L56 40" />
            <path d="M52 34 a8 8 0 1 0 10 10 l-6 -1 -1 -6 a8 8 0 0 0 -3 -3 Z" />
            <circle cx={37} cy={59} r={3} />
          </>
        )}
        {n === 3 && (
          /* 03 — stacked blocks */
          <>
            <rect x={36} y={52} width={24} height={10} />
            <rect x={40} y={40} width={16} height={10} />
            <rect x={44} y={28} width={8} height={10} />
          </>
        )}
        {n === 4 && (
          /* 04 — fan-out arrows */
          <>
            <path d="M34 48 h12" />
            <path d="M46 48 C 56 48 56 34 64 34 M64 30 l6 4 -6 4" />
            <path d="M46 48 h18 M60 44 l6 4 -6 4" />
            <path d="M46 48 C 56 48 56 62 64 62 M64 58 l6 4 -6 4" />
          </>
        )}
        {n === 5 && (
          /* 05 — lightning / circuit-break */
          <>
            <path d="M50 30 L40 50 h8 L44 66 L58 44 h-8 L54 30 Z" />
            <path d="M32 40 h6 M58 56 h6" opacity={0.7} />
          </>
        )}
        {n === 6 && (
          /* 06 — poison tri-dots */
          <>
            <circle cx={48} cy={36} r={6} />
            <circle cx={38} cy={56} r={6} />
            <circle cx={58} cy={56} r={6} />
            <circle cx={48} cy={48} r={2.4} fill={s} stroke="none" />
          </>
        )}
      </g>
      <text
        x={48}
        y={locked ? 92 : 92}
        textAnchor="middle"
        fill={s}
        fontSize={8}
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing={1}
      >
        {`L0${n}`}
      </text>
    </svg>
  );
}
