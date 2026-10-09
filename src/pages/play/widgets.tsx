import { memo, useEffect, useRef } from 'react';
import { COLORS } from '@/lib/palette';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** draw a dashed horizontal threshold at this value (data units) */
  threshold?: number;
  max?: number;
  area?: boolean;
}

/** Tiny canvas sparkline — last N ticks, code-drawn (no chart lib). */
function SparklineInner({ data, width = 40, height = 16, color = COLORS.signalGreen, threshold, max, area }: SparklineProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const upper = max ?? Math.max(1, ...data);
    const pts = data.slice(-Math.floor(width / 2));
    if (pts.length < 2) return;
    const step = width / Math.max(1, pts.length - 1);
    const y = (v: number) => height - 1 - (Math.min(v, upper) / upper) * (height - 2);
    if (area) {
      ctx.beginPath();
      ctx.moveTo(0, height);
      pts.forEach((v, i) => ctx.lineTo(i * step, y(v)));
      ctx.lineTo((pts.length - 1) * step, height);
      ctx.closePath();
      ctx.fillStyle = `${color}22`;
      ctx.fill();
    }
    ctx.beginPath();
    pts.forEach((v, i) => (i === 0 ? ctx.moveTo(0, y(v)) : ctx.lineTo(i * step, y(v))));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (threshold !== undefined) {
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(0, y(threshold));
      ctx.lineTo(width, y(threshold));
      ctx.strokeStyle = COLORS.signalRed;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [data, width, height, color, threshold, max, area]);
  return <canvas ref={ref} style={{ width, height, display: 'block' }} aria-hidden="true" />;
}

export const Sparkline = memo(SparklineInner);

interface BarProps {
  value: number; // 0..1
  color?: string;
  height?: number;
  className?: string;
  flash?: boolean; // red pulse under threshold
}

/** Simple horizontal gauge bar. */
export function Bar({ value, color = COLORS.signalAmber, height = 6, className, flash }: BarProps) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className={className} style={{ height, background: COLORS.bg2, borderRadius: 1, overflow: 'hidden' }}>
      <div
        className={flash && pct < 0.15 ? 'animate-pulse-dot' : undefined}
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          background: flash && pct < 0.15 ? COLORS.signalRed : color,
          transition: 'width 200ms linear',
        }}
      />
    </div>
  );
}

export function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
