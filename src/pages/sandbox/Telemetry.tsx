import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { COLORS } from '@/lib/palette';

const WINDOW = 90;

interface ChartDef {
  label: string;
  unit: string;
  color: string;
  area?: boolean;
  threshold?: number; // dashed red line
  data: number[];
  projection?: number[]; // dotted extension values (same length ok)
}

function drawChart(canvas: HTMLCanvasElement, def: ChartDef, hoverIdx: number | null, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const data = def.data.slice(-WINDOW);
  const max = Math.max(1, ...data, def.threshold ?? 0) * 1.15;
  const padL = 4;
  const padB = 14;
  const plotH = h - padB - 4;
  const y = (v: number) => 2 + plotH - (Math.min(v, max) / max) * plotH;
  const x = (i: number) => padL + (i / Math.max(1, WINDOW - 1)) * (w - padL - 2);

  // 1px grid
  ctx.strokeStyle = 'rgba(38,43,39,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gy = 0; gy <= 2; gy++) {
    const yy = 2 + (plotH / 2) * gy;
    ctx.moveTo(padL, yy);
    ctx.lineTo(w - 2, yy);
  }
  ctx.stroke();

  if (def.threshold !== undefined) {
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.moveTo(padL, y(def.threshold));
    ctx.lineTo(w - 2, y(def.threshold));
    ctx.strokeStyle = COLORS.signalRed;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (def.projection && def.projection.length > 1) {
    ctx.beginPath();
    ctx.setLineDash([2, 3]);
    def.projection.slice(-WINDOW).forEach((v, i) => (i === 0 ? ctx.moveTo(x(0), y(v)) : ctx.lineTo(x(i), y(v))));
    ctx.strokeStyle = `${def.color}88`;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (data.length > 1) {
    if (def.area) {
      ctx.beginPath();
      ctx.moveTo(x(0), y(0));
      data.forEach((v, i) => ctx.lineTo(x(i), y(v)));
      ctx.lineTo(x(data.length - 1), y(0));
      ctx.closePath();
      ctx.fillStyle = `${def.color}1e`;
      ctx.fill();
    }
    ctx.beginPath();
    data.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // crosshair
  if (hoverIdx !== null && hoverIdx < data.length) {
    ctx.beginPath();
    ctx.moveTo(x(hoverIdx), 2);
    ctx.lineTo(x(hoverIdx), h - padB);
    ctx.strokeStyle = COLORS.textLow;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x(hoverIdx), y(data[hoverIdx]), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
  }

  // axes labels (mono, text-low)
  ctx.fillStyle = COLORS.textLow;
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillText(def.label, padL, h - 4);
  const last = data.length > 0 ? data[data.length - 1] : 0;
  const shown = hoverIdx !== null && hoverIdx < data.length ? data[hoverIdx] : last;
  ctx.fillStyle = COLORS.textMid;
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(shown)} ${def.unit}`, w - 4, h - 4);
  ctx.textAlign = 'left';
}

function Chart({ def }: { def: ChartDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    drawChart(canvas, def, hover, wrap.clientWidth, 110);
  }, [def, hover]);

  const onMove = useCallback((e: React.MouseEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const frac = (e.clientX - rect.left - 4) / Math.max(1, rect.width - 6);
    setHover(Math.max(0, Math.min(WINDOW - 1, Math.round(frac * (WINDOW - 1)))));
  }, []);

  return (
    <div ref={wrapRef} className="min-w-0 flex-1" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <canvas ref={ref} style={{ width: '100%', height: 110, display: 'block' }} aria-label={def.label} />
    </div>
  );
}

const MemoChart = memo(Chart);

interface TelemetryProps {
  history: { queueDepth: number[]; burn: number[]; completions: number[]; successRate: number[] };
  budgetLeft: number;
  budgetInfinite: boolean;
}

/** Live telemetry drawer: 4 canvas charts, 90-tick rolling window (sandbox.md §5). */
export default function Telemetry({ history, budgetLeft, budgetInfinite }: TelemetryProps) {
  // depletion projection: extend burn with current average, scaled to remaining budget
  let projection: number[] | undefined;
  if (!budgetInfinite && history.burn.length > 5) {
    const avg = history.burn.slice(-10).reduce((s, v) => s + v, 0) / Math.min(10, history.burn.length);
    const last = history.burn[history.burn.length - 1];
    projection = [...history.burn.slice(-WINDOW + 10)];
    const ticksLeft = avg > 0 ? Math.min(10, Math.ceil(budgetLeft / Math.max(1, avg))) : 10;
    for (let i = 0; i < 10; i++) projection.push(i < ticksLeft ? avg : 0);
    void last;
  }

  const defs: ChartDef[] = [
    { label: 'queue depth', unit: 'req', color: COLORS.signalAmber, area: true, data: history.queueDepth },
    { label: 'throughput /10t', unit: 'done', color: COLORS.signalGreen, data: history.completions },
    { label: 'success rate', unit: '%', color: COLORS.signalGreen, threshold: 80, data: history.successRate },
    { label: 'token burn', unit: 'tok/t', color: COLORS.signalAmber, data: history.burn, projection },
  ];

  return (
    <div className="flex flex-none gap-2 border-t border-line bg-bg-1 px-3 py-2">
      {defs.map((d) => (
        <MemoChart key={d.label} def={d} />
      ))}
    </div>
  );
}
