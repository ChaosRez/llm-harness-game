import { memo } from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/palette';
import type { Agent } from '@/game/types';
import type { Sim } from '@/game/engine';
import { useSimVersion } from './useEngine';
import { fmt } from './widgets';

const STATIONS = [
  { key: 'ASSEMBLE', angle: -90, label: 'ASMB' },
  { key: 'INFER', angle: 0, label: 'INFR' },
  { key: 'TOOL_CALL', angle: 90, label: 'TOOL' },
  { key: 'OBSERVE', angle: 180, label: 'OBSV' },
] as const;

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const BLOCK_COLORS: Record<string, string> = {
  system: COLORS.textLow,
  tool_specs: COLORS.signalTeal,
  scratch: '#2E6B4E',
  observation: COLORS.signalGreen,
  memory: COLORS.signalTeal,
};

interface AgentNodeProps {
  sim: Sim;
  agent: Agent;
  reducedMotion: boolean;
  assignTarget: boolean; // a request is picked up and this node is idle
  onClick: () => void;
}

/** Agent node "pizza box" (game.md §4.1): loop ring + segmented context bar. */
function AgentNodeInner({ sim, agent, reducedMotion, assignTarget, onClick }: AgentNodeProps) {
  useSimVersion(sim);
  const req = agent.requestId ? sim.requests.find((r) => r.id === agent.requestId) : undefined;
  const total = sim.ctxTotal(agent);
  const sat = total / sim.cfg.contextWindow;
  const activeStation = agent.stage === 'FINAL' ? 'ASSEMBLE' : agent.stage;
  const stationIdx = STATIONS.findIndex((s) => s.key === activeStation);
  const dotAngle = stationIdx >= 0 ? STATIONS[stationIdx].angle : -90;
  const statusColor =
    agent.status === 'failed' ? COLORS.signalRed : agent.status === 'stalled' ? COLORS.signalAmber : agent.requestId ? COLORS.signalGreen : COLORS.textLow;

  const R = 46;
  const C = 60;

  return (
    <motion.div
      layout="position"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`w-[300px] flex-none rounded-[2px] border bg-bg-1 ${assignTarget ? 'border-signal-amber' : 'border-line'}`}
      style={agent.requestId ? { boxShadow: '0 0 24px rgba(87,227,154,.15)' } : undefined}
    >
      <button type="button" onClick={onClick} className="block w-full p-3 text-left" aria-label={`Inspect ${agent.id}`}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-bold tracking-[0.12em] text-text-hi">{agent.id}</span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-low">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${agent.requestId ? 'animate-pulse-dot' : ''}`}
              style={{ background: statusColor }}
            />
            {agent.requestId ? (agent.status === 'stalled' ? 'stalled' : 'running') : 'idle'}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-3">
          {/* loop ring */}
          <div className="relative flex-none" style={{ width: 120, height: 120 }}>
            <svg viewBox="0 0 120 120" width={120} height={120} fill="none">
              {STATIONS.map((s) => {
                const active = s.key === activeStation && agent.requestId !== null;
                return (
                  <g key={s.key}>
                    <path
                      d={arc(C, C, R, s.angle - 34, s.angle + 34)}
                      stroke={active ? COLORS.signalGreen : COLORS.line}
                      strokeWidth={active ? 3 : 2}
                      strokeLinecap="round"
                      style={active ? { filter: 'drop-shadow(0 0 6px rgba(87,227,154,.6))', transition: 'stroke 200ms' } : { transition: 'stroke 200ms' }}
                    />
                    <text
                      x={polar(C, C, R + 0, s.angle)[0]}
                      y={polar(C, C, R + 0, s.angle)[1]}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={active ? COLORS.signalGreen : COLORS.textLow}
                      fontSize={8}
                      fontFamily="JetBrains Mono, monospace"
                      transform={`translate(${s.angle === 0 ? 14 : s.angle === 180 ? -14 : 0} ${s.angle === -90 ? -10 : s.angle === 90 ? 10 : 0})`}
                    >
                      {s.label}
                    </text>
                  </g>
                );
              })}
              {/* EXECUTE progress arc inside ring during tool calls */}
              {agent.stage === 'TOOL_CALL' && agent.pendingTool && (
                <path
                  d={arc(
                    C,
                    C,
                    R - 10,
                    90 - 40,
                    90 - 40 + 80 * (1 - agent.pendingTool.ticksLeft / Math.max(1, agent.pendingTool.totalTicks)),
                  )}
                  stroke={COLORS.signalAmber}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              )}
            </svg>
            {/* orbiting packet: one station per tick, constant speed */}
            {agent.requestId !== null && !reducedMotion && (
              <div
                className="absolute inset-0"
                style={{
                  transform: `rotate(${dotAngle}deg)`,
                  transition: 'transform 600ms linear',
                }}
              >
                <span
                  className="absolute left-1/2 top-1/2 h-[5px] w-[5px] rounded-full"
                  style={{
                    background: COLORS.signalGreen,
                    boxShadow: '0 0 6px rgba(87,227,154,.8)',
                    transform: `translate(-50%,-50%) translateX(${R}px) rotate(${-dotAngle}deg)`,
                  }}
                />
              </div>
            )}
            {agent.requestId !== null && reducedMotion && (
              <span
                className="absolute h-[5px] w-[5px] rounded-full"
                style={{
                  background: COLORS.signalGreen,
                  left: polar(60, 60, 46, dotAngle)[0] - 2.5,
                  top: polar(60, 60, 46, dotAngle)[1] - 2.5,
                }}
              />
            )}
          </div>

          {/* right column: request chip + economics */}
          <div className="min-w-0 flex-1">
            {req ? (
              <>
                <div className="truncate rounded-[2px] border border-line bg-bg-2 px-1.5 py-1 font-mono text-[10px] text-text-hi">
                  {req.id} · {agent.stage === 'TOOL_CALL' ? `exec ${agent.pendingTool?.toolId ?? ''}…` : agent.stage.toLowerCase() + '…'}
                </div>
                <div className="mt-1 h-0.5 w-full bg-bg-0">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.max(0, Math.min(1, (req.deadlineTick - sim.tick) / Math.max(1, req.deadlineSlack))) * 100}%`,
                      background: req.deadlineTick - sim.tick <= 10 ? COLORS.signalRed : COLORS.signalAmber,
                    }}
                  />
                </div>
                <div className="mt-1.5 font-mono text-[10px] tabular-nums text-text-low">
                  facts {agent.facts}/{req.requiredFacts} · retries {agent.retries}
                </div>
                <div className="font-mono text-[10px] tabular-nums text-text-low">
                  burn −{fmt(agent.burn)} tok/tick
                </div>
              </>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-low">
                awaiting dispatch
              </p>
            )}
          </div>
        </div>

        {/* segmented context bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between font-mono text-[10px] tabular-nums">
            <span className="text-text-low">CONTEXT</span>
            <span className={sat >= 0.9 ? 'animate-pulse-dot text-signal-amber' : 'text-text-mid'}>
              {fmt(total)} / {fmt(sim.cfg.contextWindow)}
            </span>
          </div>
          <div className={`mt-1 flex h-2 w-full overflow-hidden rounded-[1px] bg-bg-0 ${sat >= 0.9 ? 'animate-pulse-dot' : ''}`}>
            {agent.ctx.map((b) => (
              <div
                key={b.id}
                title={`${b.label} — ${fmt(b.tokens)} tok${b.pinned ? ' (pinned)' : ''}`}
                style={{
                  width: `${Math.min(100, (b.tokens / sim.cfg.contextWindow) * 100)}%`,
                  background: BLOCK_COLORS[b.kind],
                  opacity: b.kind === 'memory' ? 0.9 : b.pinned ? 1 : 0.85,
                  outline: b.pinned ? `1px solid ${COLORS.signalAmber}` : undefined,
                  outlineOffset: -1,
                }}
              />
            ))}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

const AgentNode = memo(AgentNodeInner);
export default AgentNode;
