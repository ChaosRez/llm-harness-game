/**
 * Persistence for THE_HARNESS (design.md §10).
 * - `th_progress_v1`: level completion, stars, unlocks
 * - `th_sandbox_v1`: sandbox presets / settings
 */

export const PROGRESS_KEY = 'th_progress_v1';
export const SANDBOX_KEY = 'th_sandbox_v1';

export const LEVEL_IDS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

export interface LevelProgress {
  completed: boolean;
  /** 0–3 stars earned */
  stars: number;
  /** best score / fewest tokens, game-defined */
  best?: number;
}

export interface ProgressState {
  levels: Partial<Record<LevelId, LevelProgress>>;
  /** explicit unlock overrides; level 1 is always unlocked */
  unlocked: Partial<Record<LevelId, boolean>>;
}

export interface SandboxPreset {
  name: string;
  savedAt: number;
  /** scenario parameters — shape owned by the sandbox page */
  params: Record<string, unknown>;
}

export interface SandboxState {
  presets: SandboxPreset[];
  /** last-used free-form settings, shape owned by the sandbox page */
  lastSettings?: Record<string, unknown>;
}

const DEFAULT_PROGRESS: ProgressState = { levels: {}, unlocked: {} };
const DEFAULT_SANDBOX: SandboxState = { presets: [] };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — non-fatal */
  }
}

/* ------------------------------ progress ------------------------------ */

export function getProgress(): ProgressState {
  return readJson(PROGRESS_KEY, DEFAULT_PROGRESS);
}

export function setProgress(state: ProgressState): void {
  writeJson(PROGRESS_KEY, state);
}

export function getLevelProgress(id: LevelId): LevelProgress {
  return getProgress().levels[id] ?? { completed: false, stars: 0 };
}

export function getStars(id: LevelId): number {
  return getLevelProgress(id).stars;
}

/**
 * Level 1 is always unlocked. Any other level is unlocked when explicitly
 * flagged or when the previous level is completed.
 */
export function isUnlocked(id: LevelId): boolean {
  const idx = LEVEL_IDS.indexOf(id);
  if (idx <= 0) return true;
  const p = getProgress();
  if (p.unlocked[id]) return true;
  return p.levels[LEVEL_IDS[idx - 1]]?.completed === true;
}

export type LevelStatus = 'LOCKED' | 'READY' | 'CLEARED';

export function getLevelStatus(id: LevelId): LevelStatus {
  if (getLevelProgress(id).completed) return 'CLEARED';
  return isUnlocked(id) ? 'READY' : 'LOCKED';
}

/** Record a level result; keeps the best star count; unlocks the next level. */
export function completeLevel(id: LevelId, stars: number, best?: number): ProgressState {
  const p = getProgress();
  const prev = p.levels[id] ?? { completed: false, stars: 0 };
  p.levels[id] = {
    completed: true,
    stars: Math.max(prev.stars, Math.min(3, Math.max(0, stars))),
    best: best === undefined ? prev.best : prev.best === undefined ? best : Math.min(prev.best, best),
  };
  const idx = LEVEL_IDS.indexOf(id);
  if (idx >= 0 && idx < LEVEL_IDS.length - 1) {
    p.unlocked[LEVEL_IDS[idx + 1]] = true;
  }
  setProgress(p);
  return p;
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* non-fatal */
  }
}

/* ------------------------------- sandbox ------------------------------ */

export function getSandboxState(): SandboxState {
  return readJson(SANDBOX_KEY, DEFAULT_SANDBOX);
}

export function setSandboxState(state: SandboxState): void {
  writeJson(SANDBOX_KEY, state);
}

export function saveSandboxPreset(preset: SandboxPreset): SandboxState {
  const s = getSandboxState();
  s.presets = [...s.presets.filter((p) => p.name !== preset.name), preset];
  setSandboxState(s);
  return s;
}

export function deleteSandboxPreset(name: string): SandboxState {
  const s = getSandboxState();
  s.presets = s.presets.filter((p) => p.name !== name);
  setSandboxState(s);
  return s;
}

export function saveSandboxSettings(settings: Record<string, unknown>): void {
  const s = getSandboxState();
  s.lastSettings = settings;
  setSandboxState(s);
}
