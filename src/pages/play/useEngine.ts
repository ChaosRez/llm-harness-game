import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Sim } from '@/game/engine';
import { sfx } from '@/game/sound';

export type Speed = 1 | 2 | 4;

const noopSub = () => () => {};

/** Subscribe a React tree to a Sim. Returns the current engine version. */
export function useSimVersion(sim: Sim | null): number {
  return useSyncExternalStore(sim ? sim.subscribe : noopSub, sim ? sim.getVersion : () => 0);
}

/**
 * Drives the tick loop (600ms base), speed control, pause, and WebAudio sounds.
 * The engine itself is pure; this hook is the only React bridge.
 */
export function useEngineClock(sim: Sim | null) {
  const [paused, setPaused] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  const [sfxOn, setSfxOn] = useState(true);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    sfx.enabled = sfxOn;
  }, [sfxOn]);

  useEffect(() => {
    if (!sim || paused || sim.status !== 'running') return;
    const ms = 600 / speedRef.current;
    const iv = window.setInterval(() => {
      if (pausedRef.current) return;
      sim.step();
      for (const s of sim.drainSounds()) {
        if (s === 'tick' && speedRef.current !== 1) continue;
        sfx.play(s);
      }
      if (speedRef.current === 1 && sim.status === 'running') sfx.play('tick');
    }, ms);
    return () => window.clearInterval(iv);
  }, [sim, paused, speed]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  return { paused, setPaused, togglePause, speed, setSpeed, sfxOn, setSfxOn };
}
