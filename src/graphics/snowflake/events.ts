/**
 * Saved-screen event rules (pure). Which event a save plays and the short timeline of a single day's change.
 * Product rule: the completion replay + reward is automatic only when the month has a real targetDays and the save
 * crossed it (App passes `complete`). Review builds may also play it when the save crossed the RESEARCH visual stage
 * (14 → 15 distinct days); 2026-12 keeps targetDays = null and no completion copy is shown.
 */
import type { Windows } from './core/snowflakeGrowthReward/timeline';

export type SaveKind = 'growth' | 'addition' | 'complete';
export function eventKind(appKind: SaveKind, beforeDays: number, afterDays: number, review: boolean, visualStageDays = 15): SaveKind {
  if (appKind === 'complete') return 'complete';
  if (review && beforeDays < visualStageDays && afterDays >= visualStageDays) return 'complete';
  return afterDays > beforeDays ? 'growth' : 'addition';
}
/** a single day's change: one G1 day window of `len` s (pre-roll before e = 0 shows the state before the save) */
export function dayWindows(len = 1.6): Windows {
  return { len: len + 0.3, n: 2, rewind: [0, 0], hold: [0, 0], grow: [0, len], complete: [len, len + 0.3], reward: [len + 0.3, len + 0.3], settle: [len + 0.3, len + 0.3],
    tau: [NaN, 0, len], mountD15: -0.3, handoff: [len + 0.05, len + 0.15] };
}
