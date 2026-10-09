import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sim } from '@/game/engine';
import { buildSandboxConfig } from '@/game/levels.config';
import { sfx } from '@/game/sound';
import { getSandboxState, saveSandboxPreset, saveSandboxSettings } from '@/lib/progress';
import OpsToast from '@/components/OpsToast';
import Hud from './play/Hud';
import Stage from './play/Stage';
import ControlPlane from './play/ControlPlane';
import Inspector from './play/Inspector';
import EventLog from './play/EventLog';
import { useEngineClock, useSimVersion } from './play/useEngine';
import Rack from './sandbox/Rack';
import Telemetry from './sandbox/Telemetry';
import Experiments, { EXPERIMENTS, type Experiment } from './sandbox/Experiments';
import { DEFAULT_PARAMS, PRESETS, type SandboxParams } from './sandbox/params';

interface PersistedSettings {
  params?: Partial<SandboxParams>;
  experiments?: string[];
}

const SANDBOX_WISDOM = [
  'break things on purpose — the telemetry will tell the story',
  'money doesn’t fix throughput — only architecture does',
  'every knob here is a load-bearing decision in production',
];

export default function Sandbox() {
  const persisted = useMemo(() => getSandboxState(), []);
  const saved = (persisted.lastSettings ?? {}) as PersistedSettings;

  const [params, setParams] = useState<SandboxParams>({ ...DEFAULT_PARAMS, ...(saved.params ?? {}) });
  const [done, setDone] = useState<Set<string>>(() => new Set(saved.experiments ?? []));
  const [resetCount, setResetCount] = useState(0);
  const [scenario, setScenario] = useState<string>('FREE RUN');
  const [toast, setToast] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(true);
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [experimentsOpen, setExperimentsOpen] = useState(true);
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [inspectAgent, setInspectAgent] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'rack' | 'controls' | null>(null);
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const sim = useMemo(() => {
    const s = new Sim(buildSandboxConfig(9901 + resetCount), null);
    s.start(); // sandbox skips the briefing; the world starts paused via the clock
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCount]);

  useSimVersion(sim);
  const { paused, setPaused, togglePause, speed, setSpeed, sfxOn, setSfxOn } = useEngineClock(sim);

  // experiment trackers
  const tripTicks = useRef<number[]>([]);
  const prevTrips = useRef(0);
  const validationSince = useRef<number | null>(null);

  // sync policy-mirrored params into the engine
  useEffect(() => {
    sim.setPolicies({
      writeValidation: params.writeValidation,
      namespacing: params.namespacing,
      evalSamplePct: params.evalSamplePct,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, params.writeValidation, params.namespacing, params.evalSamplePct]);

  // re-apply all rack params after reset
  useEffect(() => {
    sim.applySandboxParams(params as unknown as Record<string, unknown>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  const pushToast = (msg: string) => setToast(msg);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const applyParams = (patch: Partial<SandboxParams>, toastMsg?: string) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      saveSandboxSettings({ params: next, experiments: [...done] });
      return next;
    });
    sim.applySandboxParams(patch as Record<string, unknown>);
    if (toastMsg) pushToast(`PARAM UPDATED — ${toastMsg}`);
  };

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const next = { ...params, ...preset.params };
    setParams(next);
    saveSandboxSettings({ params: next, experiments: [...done] });
    sim.applySandboxParams(next as unknown as Record<string, unknown>);
    setScenario(preset.name);
    pushToast(`SCENARIO LOADED — ${preset.name}`);
    if (presetId === 'chaos') sfx.play('fail');
  };

  // experiment verification, evaluated per tick
  useEffect(() => {
    if (sim.stats.rateTrips !== prevTrips.current) {
      for (let i = prevTrips.current; i < sim.stats.rateTrips; i++) tripTicks.current.push(sim.tick);
      prevTrips.current = sim.stats.rateTrips;
    }
    if (sim.policies.writeValidation) {
      if (validationSince.current === null) validationSince.current = sim.tick;
    } else {
      validationSince.current = null;
    }
    const ctx = { sim, params, tripTicks: tripTicks.current, validationSince: validationSince.current };
    for (const e of EXPERIMENTS) {
      if (!done.has(e.id) && e.verify(ctx)) {
        const next = new Set(done).add(e.id);
        setDone(next);
        saveSandboxSettings({ params, experiments: [...next] });
        pushToast(`✔ EXPERIMENT VERIFIED — ${e.title.toUpperCase()}`);
        sfx.play('ok');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadExperiment = (e: Experiment) => {
    applyParams(e.config, `experiment config — ${e.title.toLowerCase()}`);
    setScenario(`EXP: ${e.title.toUpperCase()}`);
    if (e.policies) sim.setPolicies(e.policies);
    if (e.retry) for (const t of sim.tools) sim.setRetry(t.id, e.retry);
    setPaused(false);
  };

  const resetWorld = () => {
    tripTicks.current = [];
    prevTrips.current = 0;
    validationSince.current = null;
    setConfirmReset(false);
    setSelectedReq(null);
    setScenario('FREE RUN');
    setResetCount((c) => c + 1);
    setPaused(true);
  };

  const savePreset = () => {
    const name = `CUSTOM-${String((persisted.presets.length ?? 0) + 1).padStart(2, '0')}`;
    saveSandboxPreset({ name, savedAt: Date.now(), params: params as unknown as Record<string, unknown> });
    pushToast(`PRESET SAVED — ${name} (th_sandbox_v1)`);
    setResetCount((c) => c); // no-op; customPresets read below refreshes via state
    setCustomTick((c) => c + 1);
  };
  const [customTick, setCustomTick] = useState(0);
  void customTick;
  const customPresets = getSandboxState().presets;

  const bulletin = sim.bulletins[0];
  const queued = sim.requests.filter((r) => r.state === 'queued' || r.state === 'running');

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-bg-0 text-text-mid">
      <Hud
        sim={sim}
        label="SANDBOX"
        accent="amber"
        paused={paused}
        speed={speed}
        sfxOn={sfxOn}
        onTogglePause={() => { sfx.init(); togglePause(); }}
        onSetSpeed={(s) => { sfx.init(); setSpeed(s); setPaused(false); }}
        onToggleSfx={() => setSfxOn((v) => !v)}
        onOpenMenu={() => setPaused(true)}
        rightSlot={
          <>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-signal-amber xl:inline">
              SCENARIO: {scenario}
            </span>
            {confirmReset ? (
              <button
                type="button"
                onClick={resetWorld}
                className="rounded-[2px] bg-signal-red px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-bg-0"
              >
                Confirm reset
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-[2px] border border-signal-red px-2.5 py-1 font-mono text-[11px] uppercase text-signal-red hover:bg-signal-red/10"
              >
                Reset world
              </button>
            )}
          </>
        }
      />

      {/* mobile pane toggles */}
      <div className="flex flex-none gap-1 border-b border-line bg-bg-1 px-2 py-1 lg:hidden">
        <button type="button" onClick={() => setMobilePane(mobilePane === 'rack' ? null : 'rack')} className="rounded-[2px] border border-line px-2 py-1 font-mono text-[10px] uppercase text-text-mid">Rack</button>
        <button type="button" onClick={() => setMobilePane(mobilePane === 'controls' ? null : 'controls')} className="rounded-[2px] border border-line px-2 py-1 font-mono text-[10px] uppercase text-text-mid">Control plane</button>
      </div>

      <div className="flex min-h-0 flex-1">
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08, duration: 0.35 }} className="hidden w-[300px] flex-none lg:block">
          <Rack
            params={params}
            onChange={applyParams}
            onPreset={applyPreset}
            customPresets={customPresets}
            onLoadCustom={(p, name) => { applyParams(p as Partial<SandboxParams>, `preset ${name}`); setScenario(name); }}
            onSavePreset={savePreset}
          />
        </motion.div>

        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.16, duration: 0.35 }} className="flex min-w-0 flex-1 flex-col">
          {/* queue strip (arrivals are generated, not curated) */}
          <div className="flex h-10 flex-none items-center gap-1.5 overflow-x-auto border-b border-line bg-bg-1 px-3">
            <span className="eyebrow flex-none">QUEUE</span>
            {queued.length === 0 && <span className="font-mono text-[10px] text-text-low">depth 0</span>}
            {queued.slice(0, 14).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => (r.state === 'queued' ? setSelectedReq(selectedReq === r.id ? null : r.id) : undefined)}
                className={`flex-none rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] ${
                  r.state === 'running'
                    ? 'border-signal-green/50 text-signal-green'
                    : selectedReq === r.id
                      ? 'border-signal-amber text-signal-amber'
                      : sim.tick > r.deadlineTick - 10
                        ? 'border-signal-red/60 text-signal-red'
                        : 'border-line text-text-mid'
                }`}
                title={`${r.title} · due t${r.deadlineTick} · value ${r.tokenValue}`}
              >
                {r.id}
              </button>
            ))}
          </div>

          <Stage
            sim={sim}
            reducedMotion={reducedMotion}
            fanout
            selectedReqId={selectedReq}
            onAssign={(agentId) => {
              if (selectedReq) {
                sim.assignRequest(selectedReq, agentId);
                setSelectedReq(null);
              }
            }}
            onInspect={setInspectAgent}
          />

          {/* first-visit empty hint */}
          {sim.tick === 0 && (
            <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-mono text-[12px] uppercase tracking-[0.12em] text-text-low">
              configure the rack, press ▶ — the world starts paused
            </p>
          )}
        </motion.div>

        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.24, duration: 0.35 }} className="relative hidden w-[300px] flex-none flex-col border-l border-line bg-bg-1 lg:flex">
          <button
            type="button"
            onClick={() => setExperimentsOpen((v) => !v)}
            className="flex flex-none items-center justify-between border-b border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-low hover:text-text-hi"
            aria-expanded={experimentsOpen}
          >
            <span>▸ experiments ({done.size}/6 verified)</span>
            <span>{experimentsOpen ? '▾' : '▸'}</span>
          </button>
          {experimentsOpen && <Experiments done={done} onLoad={loadExperiment} />}
          <div className="min-h-0 flex-1">
            <ControlPlane sim={sim} levelNum={99} />
          </div>
          <Inspector sim={sim} agentId={inspectAgent} wisdom={SANDBOX_WISDOM} onClose={() => setInspectAgent(null)} />
        </motion.div>
      </div>

      {/* mobile bottom sheets */}
      <AnimatePresence>
        {mobilePane && (
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] border-t border-line bg-bg-1 lg:hidden">
            <button type="button" onClick={() => setMobilePane(null)} className="w-full border-b border-line py-1.5 text-center font-mono text-[10px] uppercase text-text-low">▾ close</button>
            <div className="max-h-[60dvh] overflow-y-auto">
              {mobilePane === 'rack' ? (
                <Rack params={params} onChange={applyParams} onPreset={applyPreset} customPresets={customPresets} onLoadCustom={(p, name) => { applyParams(p as Partial<SandboxParams>, `preset ${name}`); setScenario(name); }} onSavePreset={savePreset} />
              ) : (
                <ControlPlane sim={sim} levelNum={99} />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* telemetry drawer */}
      <div className="flex flex-none items-center justify-between border-t border-line bg-bg-1 px-3 py-1">
        <button type="button" onClick={() => setTelemetryOpen((v) => !v)} className="eyebrow hover:text-text-hi" aria-expanded={telemetryOpen}>
          {telemetryOpen ? '▾' : '▸'} TELEMETRY
        </button>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-low">90-tick rolling window · hover for values</span>
      </div>
      <AnimatePresence initial={false}>
        {telemetryOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <Telemetry history={sim.history} budgetLeft={sim.budget} budgetInfinite={sim.budgetInfinite} />
          </motion.div>
        )}
      </AnimatePresence>

      <EventLog sim={sim} collapsed={logCollapsed} onToggle={() => setLogCollapsed((c) => !c)} />

      {/* param-update toast (amber, bottom-left) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-6 z-[70] rounded-[2px] border border-line border-l-2 border-l-signal-amber bg-bg-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-mid"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {bulletin && (
        <OpsToast id={bulletin.id} body={bulletin.body} manualAnchor={bulletin.manualAnchor} onDismiss={() => sim.shiftBulletin()} />
      )}
    </div>
  );
}
