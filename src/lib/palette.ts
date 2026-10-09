/**
 * THE_HARNESS color tokens (design.md §3).
 * Color always carries state — never blend accents decoratively.
 */
export const COLORS = {
  bg0: '#0B0D0C',
  bg1: '#111412',
  bg2: '#181C19',
  line: '#262B27',
  textHi: '#E8EAE6',
  textMid: '#9AA39B',
  textLow: '#5C655D',
  /** Inner loop, agents, compute, success, tokens-in-flight */
  signalGreen: '#57E39A',
  /** Outer loop, orchestration, queue, budgets, warnings */
  signalAmber: '#F2A33C',
  /** Failures, deadlines missed, poisoned state */
  signalRed: '#E4574F',
  /** Informational, links, memory store, evals */
  signalTeal: '#57C7B8',
} as const;

export type ColorToken = keyof typeof COLORS;

export const GLOWS = {
  green: '0 0 24px rgba(87,227,154,.15)',
  amber: '0 0 24px rgba(242,163,60,.15)',
  red: '0 0 24px rgba(228,87,79,.18)',
} as const;

/** Semantic mapping: inner loop vs outer loop accent */
export const LOOP_COLORS = {
  inner: COLORS.signalGreen,
  outer: COLORS.signalAmber,
  memory: COLORS.signalTeal,
  failure: COLORS.signalRed,
} as const;
