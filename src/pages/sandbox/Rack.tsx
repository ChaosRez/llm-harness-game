import type { SandboxParams } from './params';
import { PRESETS } from './params';
import { fmt } from '../play/widgets';

interface RackProps {
  params: SandboxParams;
  onChange: (patch: Partial<SandboxParams>, toast?: string) => void;
  onPreset: (presetId: string) => void;
  customPresets: Array<{ name: string; params: Record<string, unknown> }>;
  onLoadCustom: (params: Record<string, unknown>, name: string) => void;
  onSavePreset: () => void;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line/60 px-3 py-2.5 last:border-b-0">
      <p className="eyebrow mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function S({ label, value, min, max, step = 1, onChange, format, hint }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string; hint?: string;
}) {
  return (
    <div title={hint}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-low">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-text-hi">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-none bg-bg-2 accent-[#F2A33C]"
        aria-label={label}
        data-cursor-label="TUNE"
      />
    </div>
  );
}

function T({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} title={hint} className="flex w-full items-center justify-between" aria-pressed={checked}>
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-low">{label}</span>
      <span className={`flex h-3.5 w-7 items-center rounded-full border px-0.5 transition-colors ${checked ? 'justify-end border-signal-amber bg-signal-amber/20' : 'justify-start border-line bg-bg-2'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${checked ? 'bg-signal-amber' : 'bg-text-low'}`} />
      </span>
    </button>
  );
}

/** Left parameter rack + scenario presets (sandbox.md §3, §4). */
export default function Rack({ params, onChange, onPreset, customPresets, onLoadCustom, onSavePreset }: RackProps) {
  const p = params;
  return (
    <aside className="flex h-full flex-col border-r border-line bg-bg-1">
      <header className="flex-none border-b border-line px-3 py-2">
        <span className="eyebrow">PARAMETER RACK</span>
        <div className="mt-2 flex flex-wrap gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.desc}
              data-cursor-label={preset.id === 'chaos' ? '⚡' : 'LOAD'}
              onClick={() => onPreset(preset.id)}
              className={`rounded-[2px] border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors ${
                preset.id === 'chaos'
                  ? 'border-signal-red/60 text-signal-red hover:bg-signal-red/10'
                  : 'border-line text-text-mid hover:border-signal-amber hover:text-text-hi'
              }`}
            >
              {preset.name}
            </button>
          ))}
          {customPresets.map((c) => (
            <button
              key={c.name}
              type="button"
              title="custom saved preset"
              onClick={() => onLoadCustom(c.params, c.name)}
              className="rounded-[2px] border border-signal-teal/50 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-signal-teal hover:bg-signal-teal/10"
            >
              {c.name}
            </button>
          ))}
          <button
            type="button"
            onClick={onSavePreset}
            title="save current rack settings as a preset (th_sandbox_v1)"
            className="rounded-[2px] border border-dashed border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-text-low hover:border-signal-teal hover:text-signal-teal"
          >
            + save
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Group title="WORKLOAD">
          <S label="arrival rate" value={p.arrivalRate} min={0} max={12} onChange={(v) => onChange({ arrivalRate: v }, `arrival_rate → ${v}/min`)} format={(v) => `${v}/min`} hint="requests generated per minute (Poisson)" />
          <S label="request difficulty" value={p.difficulty} min={1} max={5} onChange={(v) => onChange({ difficulty: v }, `difficulty → ${v}`)} hint="drives required facts/tools" />
          <S label="deadline tightness" value={Math.round(p.deadlineSlack / 4)} min={2} max={20} onChange={(v) => onChange({ deadlineSlack: v * 4 }, `deadline slack → ${v * 4}t`)} format={(v) => `${v * 4}t slack`} hint="slack before requests expire (2–20 units)" />
          <S label="adversarial traffic" value={Math.round(p.adversarialRate * 100)} min={0} max={30} onChange={(v) => onChange({ adversarialRate: v / 100 }, `adversarial → ${v}%`)} format={(v) => `${v}%`} hint="poisoned-write probability (L6 mechanic)" />
        </Group>
        <Group title="NODE">
          <S label="context window" value={p.contextWindow} min={2048} max={32768} step={1024} onChange={(v) => onChange({ contextWindow: v }, `context_window → ${fmt(v)}`)} format={(v) => fmt(v)} />
          <S label="max agents" value={p.maxAgents} min={1} max={6} onChange={(v) => onChange({ maxAgents: v }, `max_agents → ${v}`)} />
          <S label="spawn cost" value={p.spawnCost} min={0} max={3000} step={100} onChange={(v) => onChange({ spawnCost: v }, `spawn_cost → ${fmt(v)}`)} format={(v) => `${fmt(v)} tok`} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <S label="budget" value={p.budget} min={8000} max={100000} step={2000} onChange={(v) => onChange({ budget: v }, `budget → ${fmt(v)}`)} format={(v) => (p.budgetInfinite ? '∞' : fmt(v))} />
            </div>
            <T label="∞" checked={p.budgetInfinite} onChange={(v) => onChange({ budgetInfinite: v }, v ? 'budget → ∞' : 'budget → finite')} hint="infinite budget — money stops being the constraint" />
          </div>
        </Group>
        <Group title="TOOLS">
          <S label="tool failure rate" value={Math.round(p.toolFailureRate * 100)} min={0} max={60} onChange={(v) => onChange({ toolFailureRate: v / 100 }, `tool_failure_rate → ${v}%`)} format={(v) => `${v}%`} />
          <S label="failure correlation" value={Math.round(p.failureCorrelation * 100)} min={0} max={100} onChange={(v) => onChange({ failureCorrelation: v / 100 }, `failure_correlation → ${v}%`)} format={(v) => `${v}%`} hint="0 = independent, 100 = provider-wide" />
          <S label="tool latency" value={p.toolLatency} min={1} max={8} onChange={(v) => onChange({ toolLatency: v }, `tool_latency → ${v}t`)} format={(v) => `${v}t`} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <S label="rate limit" value={p.rateLimitRpm ?? 0} min={0} max={120} step={10} onChange={(v) => onChange({ rateLimitRpm: v === 0 ? null : v }, v === 0 ? 'rate_limit → off' : `rate_limit → ${v} RPM`)} format={(v) => (v === 0 ? 'off' : `${v} RPM`)} />
            </div>
          </div>
          <T label="side-effect tools" checked={p.sideEffectTools} onChange={(v) => onChange({ sideEffectTools: v }, `side_effect_tools → ${v ? 'on' : 'off'}`)} hint="include send_email / charge_card in generated requests" />
        </Group>
        <Group title="MEMORY">
          <T label="shared memory" checked={p.memoryEnabled} onChange={(v) => onChange({ memoryEnabled: v }, `shared_memory → ${v ? 'on' : 'off'}`)} />
          <T label="write validation" checked={p.writeValidation} onChange={(v) => onChange({ writeValidation: v }, `write_validation → ${v ? 'on' : 'off'}`)} />
          <T label="namespacing" checked={p.namespacing} onChange={(v) => onChange({ namespacing: v }, `namespacing → ${v ? 'on' : 'off'}`)} />
          <S label="eval sampling" value={p.evalSamplePct} min={0} max={100} step={5} onChange={(v) => onChange({ evalSamplePct: v }, `eval_sampling → ${v}%`)} format={(v) => `${v}%`} />
        </Group>
        <Group title="FAULT INJECTION">
          <T label="⚡ CHAOS events" checked={p.chaos} onChange={(v) => onChange({ chaos: v }, `chaos → ${v ? 'armed' : 'disarmed'}`)} hint="every 20–40 ticks: brownout, memory wipe, or latency ×3" />
        </Group>
      </div>
    </aside>
  );
}
