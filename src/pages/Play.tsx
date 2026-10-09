import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { AnimatePresence } from 'framer-motion';
import { Sim } from '@/game/engine';
import { buildLevelConfig, LEVEL_RULES } from '@/game/levels.config';
import { BRIEFINGS, INSPECTOR_WISDOM } from '@/game/briefings';
import { POST_MORTEMS } from '@/game/postmortems';
import { sfx } from '@/game/sound';
import { completeLevel, isUnlocked, LEVEL_IDS, type LevelId } from '@/lib/progress';
import OpsToast from '@/components/OpsToast';
import PostMortem from '@/components/PostMortem';
import Hud from './play/Hud';
import QueuePanel from './play/QueuePanel';
import Stage from './play/Stage';
import ControlPlane from './play/ControlPlane';
import Inspector from './play/Inspector';
import EventLog from './play/EventLog';
import { BriefingOverlay, ClearOverlay, FailOverlay, HelpOverlay, MenuDrawer } from './play/Overlays';
import { useEngineClock, useSimVersion } from './play/useEngine';

function normalizeLevel(param: string | undefined): LevelId | null {
  if (!param) return null;
  const m = param.toLowerCase().replace(/^l?0?/, '');
  const id = `l${m}`;
  return (LEVEL_IDS as readonly string[]).includes(id) ? (id as LevelId) : null;
}

export default function Play() {
  const params = useParams();
  const level = normalizeLevel(params.levelId);
  if (!level || !isUnlocked(level)) return <Navigate to="/levels" replace />;
  return <PlayInner key={level} level={level} />;
}

function PlayInner({ level }: { level: LevelId }) {
  const levelNum = LEVEL_IDS.indexOf(level) + 1;
  const [attempt, setAttempt] = useState(0);
  const sim = useMemo(() => new Sim(buildLevelConfig(level), LEVEL_RULES[level]), [level, attempt]);
  useSimVersion(sim);
  const { paused, setPaused, togglePause, speed, setSpeed, sfxOn, setSfxOn } = useEngineClock(sim);

  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [inspectAgent, setInspectAgent] = useState<string | null>(null);
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pmOpen, setPmOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<'queue' | 'controls' | null>(null);
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const result = sim.result;

  // persist stars/unlocks on clear
  useEffect(() => {
    if (result?.cleared) completeLevel(level, result.stars, sim.stats.tokensUsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // pause the world when overlays take over
  useEffect(() => {
    if (result || menuOpen) setPaused(true);
  }, [result, menuOpen, setPaused]);

  const restart = () => {
    setAttempt((a) => a + 1);
    setSelectedReq(null);
    setInspectAgent(null);
    setPmOpen(false);
  };

  // keyboard shortcuts (game.md §10)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          sfx.init();
          if (sim.status === 'briefing') sim.start();
          togglePause();
          break;
        case '1': setSpeed(1); setPaused(false); break;
        case '2': setSpeed(2); setPaused(false); break;
        case '3': setSpeed(4); setPaused(false); break;
        case 'n': case 'N': if (sim.cfg.features.fanout) sim.spawnAgent(); break;
        case 'i': case 'I': setInspectAgent((cur) => (cur ? null : (sim.agents[0]?.id ?? null))); break;
        case 'l': case 'L': setLogCollapsed((c) => !c); break;
        case '?': setHelpOpen((o) => !o); break;
        case 'Escape':
          if (inspectAgent) setInspectAgent(null);
          else if (helpOpen) setHelpOpen(false);
          else if (menuOpen) setMenuOpen(false);
          else if (selectedReq) setSelectedReq(null);
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sim, togglePause, setSpeed, setPaused, inspectAgent, helpOpen, menuOpen, selectedReq]);

  const label = `L0${levelNum} · ${sim.cfg.levelName ?? ''}`;
  const briefing = BRIEFINGS[level];
  const pm = result?.failure ? POST_MORTEMS[result.failure] : undefined;
  const bulletin = sim.bulletins[0];
  const manual = sim.policies.dispatch === 'MANUAL' && sim.cfg.features.fanout;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg-0 text-text-mid">
      <Hud
        sim={sim}
        label={label}
        paused={paused}
        speed={speed}
        sfxOn={sfxOn}
        onTogglePause={() => { sfx.init(); togglePause(); }}
        onSetSpeed={(s) => { sfx.init(); setSpeed(s); setPaused(false); }}
        onToggleSfx={() => setSfxOn((v) => !v)}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {/* mobile pane toggles (< lg) */}
      <div className="flex flex-none gap-1 border-b border-line bg-bg-1 px-2 py-1 lg:hidden">
        <button type="button" onClick={() => setMobilePane(mobilePane === 'queue' ? null : 'queue')} className="rounded-[2px] border border-line px-2 py-1 font-mono text-[10px] uppercase text-text-mid">
          Queue ({sim.requests.filter((r) => r.state === 'queued').length})
        </button>
        <button type="button" onClick={() => setMobilePane(mobilePane === 'controls' ? null : 'controls')} className="rounded-[2px] border border-line px-2 py-1 font-mono text-[10px] uppercase text-text-mid">
          Control plane
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[240px] flex-none lg:block">
          <QueuePanel sim={sim} selectedReqId={selectedReq} onSelectReq={setSelectedReq} manual={manual} />
        </div>

        <Stage
          sim={sim}
          reducedMotion={reducedMotion}
          fanout={sim.cfg.features.fanout}
          selectedReqId={selectedReq}
          onAssign={(agentId) => {
            if (selectedReq) {
              sim.assignRequest(selectedReq, agentId);
              setSelectedReq(null);
            }
          }}
          onInspect={setInspectAgent}
        />

        <div className="relative hidden w-[300px] flex-none lg:block">
          <ControlPlane sim={sim} levelNum={levelNum} />
          <Inspector sim={sim} agentId={inspectAgent} wisdom={INSPECTOR_WISDOM[level]} onClose={() => setInspectAgent(null)} />
        </div>
      </div>

      {/* mobile bottom sheets */}
      <AnimatePresence>
        {mobilePane && (
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] border-t border-line bg-bg-1 lg:hidden">
            <button type="button" onClick={() => setMobilePane(null)} className="w-full border-b border-line py-1.5 text-center font-mono text-[10px] uppercase text-text-low">
              ▾ close
            </button>
            <div className="max-h-[60dvh] overflow-y-auto">
              {mobilePane === 'queue' ? (
                <QueuePanel sim={sim} selectedReqId={selectedReq} onSelectReq={setSelectedReq} manual={manual} />
              ) : (
                <ControlPlane sim={sim} levelNum={levelNum} />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      <EventLog sim={sim} collapsed={logCollapsed} onToggle={() => setLogCollapsed((c) => !c)} />

      {/* overlays */}
      <AnimatePresence>
        {sim.status === 'briefing' && (
          <BriefingOverlay
            sim={sim}
            label={label}
            briefing={briefing}
            onBegin={() => { sfx.init(); sim.start(); setPaused(false); }}
          />
        )}
        {result?.cleared && <ClearOverlay sim={sim} levelNum={levelNum} onReplay={restart} />}
        {result && !result.cleared && !pmOpen && (
          <FailOverlay failure={result.failure ?? 'UNKNOWN'} onRetry={restart} onPostMortem={() => setPmOpen(true)} />
        )}
      </AnimatePresence>

      {pm && (
        <PostMortem
          open={!!(result && !result.cleared && pmOpen)}
          failure={pm.failure}
          timeline={sim.postMortemTimeline()}
          concept={pm.concept}
          mitigations={pm.mitigations}
          manualAnchor={pm.manualAnchor}
          onRetry={restart}
          onClose={() => setPmOpen(false)}
        />
      )}

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onRestart={restart} />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      {bulletin && (
        <OpsToast
          id={bulletin.id}
          body={bulletin.body}
          manualAnchor={bulletin.manualAnchor}
          onDismiss={() => sim.shiftBulletin()}
        />
      )}
    </div>
  );
}
