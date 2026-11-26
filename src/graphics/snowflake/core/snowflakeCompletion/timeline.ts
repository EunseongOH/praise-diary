/**
 * Gate 3C — Snowflake Completion Moment study. Dev-only, pure, deterministic.
 * One shared event clock `e` (seconds; e = 0 = the save of the targetDays-th DISTINCT entryDate succeeded) drives every
 * variant; the art clock (Gate 2I I3 20 s rotation, Living Core, H3 light) is separate and only mapped from e.
 *   C0 — baseline: the common 14 → 15 join only
 *   C1 — Praise Letterfall: render-only copies of real fixture graphemes drift in the margin / behind the flake
 *   C2 — Final Crystal Bloom: a cold light wave over the EXISTING I3 glyphs, core → arms → tips
 *   C3 — Bloom, then a calmer letterfall that starts at the arm tips (C3 is never brighter than C2)
 * All numbers here are research values (spec 30 §3), not product policy.
 */
import { distinctDays } from '../adaptiveSnowflake/engine';
import type { Entry } from '../multiHelix/engine';

export const ART_VERSION = 'snowflake-completion-v0.1';
export type Variant = 'C0' | 'C1' | 'C2' | 'C3';
export const VARIANTS: Variant[] = ['C0', 'C1', 'C2', 'C3'];
/** pre-roll: the day-14 state is shown for PRE s before the save */
export const PRE = 0.8;
export const LENGTHS = [3.5, 5, 6.5] as const;
export const BASE_LEN = 5;
/** phase windows of the 5 s research timeline; other lengths scale every window by len / 5 (join stays 0.9 s) */
const P5 = { join: [0, 0.9], bloom: [0.8, 1.8], fall: [1.3, 3.9], fade: [3.9, 5] } as const;
export type Phases = { join: [number, number]; bloom: [number, number]; fall: [number, number]; fade: [number, number]; end: number };
export function phases(len = BASE_LEN): Phases {
  const k = len / BASE_LEN;
  const s = (w: readonly [number, number]): [number, number] => [w[0] * k, w[1] * k];
  return { join: [0, 0.9], bloom: s(P5.bloom), fall: s(P5.fall), fade: s(P5.fade), end: len };
}
/** what each variant adds on top of the common join. C3: bloom at 0.8× C2 strength, letterfall starts 0.2 s later from the tips */
export const FX: Record<Variant, { bloom: number; fall: boolean; tipSeeds: boolean; fallDelay: number; fallShare: number }> = {
  C0: { bloom: 0, fall: false, tipSeeds: false, fallDelay: 0, fallShare: 0 },
  C1: { bloom: 0, fall: true, tipSeeds: false, fallDelay: 0, fallShare: 1 },
  C2: { bloom: 1, fall: false, tipSeeds: false, fallDelay: 0, fallShare: 0 },
  C3: { bloom: 0.8, fall: true, tipSeeds: true, fallDelay: 0.2, fallShare: 0.85 },
};

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const smooth = (a: number, b: number, v: number) => { const x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
/** opacity of the day-15 canvas over the day-14 canvas during the common join (0 before the save, 1 after 0.9 s) */
export const joinMix = (e: number) => (e < 0 ? 0 : smooth(0, 0.9, e));
/** global effect envelope: 1 until the fade window, then → 0 at the end (every effect pixel is gone at e = len) */
export const fxEnvelope = (e: number, len = BASE_LEN) => { const p = phases(len); return 1 - smooth(p.fade[0], p.fade[1], e); };
/** art clock at event time e: flowing (t0 at the start of the pre-roll, then real seconds) or fixed */
export const artTime = (e: number, t0: number, flow: boolean) => (flow ? t0 + e + PRE : t0);

export type Phase = 'before' | 'join' | 'effect' | 'done';
export function phaseOf(e: number, len = BASE_LEN): Phase {
  if (e < 0) return 'before';
  if (e < 0.9) return 'join';
  return e < len ? 'effect' : 'done';
}

// ───────────────────────────── completion trigger (research stub, no persistence) ─────────────────────────────

export type ReplayPolicy = 'firstOnly' | 'everyReach';
export type TriggerResult = { fire: boolean; reason: 'first' | 'reachedAgain' | 'alreadySeen' | 'notCrossing'; before: number; after: number; entriesBefore: number; entriesAfter: number };
/** auto-play only when a SAVE moves count(distinct entryDate) of the month from < targetDays to ≥ targetDays.
 *  firstOnly (research default): once per month; a later re-achievement does not auto-play (manual replay only). */
export function completionTrigger(before: Entry[], after: Entry[], targetDays: number, seen: boolean, policy: ReplayPolicy = 'firstOnly'): TriggerResult {
  const b = distinctDays(before), a = distinctDays(after);
  const base = { before: b, after: a, entriesBefore: before.length, entriesAfter: after.length };
  if (!(b < targetDays && a >= targetDays)) return { fire: false, reason: 'notCrossing', ...base };
  if (!seen) return { fire: true, reason: 'first', ...base };
  return policy === 'everyReach' ? { fire: true, reason: 'reachedAgain', ...base } : { fire: false, reason: 'alreadySeen', ...base };
}
export const monthIdOf = (entries: Entry[]) => entries.map(e => e.entryDate.slice(0, 7)).sort().pop() ?? '';

export type Scenario = 'first' | 'revisit' | 'edit' | 'sameDay' | 'partialDelete' | 'deleteDate' | 'reachAgain' | 'backfill' | 'undo';
export const SCENARIOS: Scenario[] = ['first', 'revisit', 'edit', 'sameDay', 'partialDelete', 'deleteDate', 'reachAgain', 'backfill', 'undo'];
/** record-change matrix around targetDays on the fixture (D_n = first n dates). `seen` = completion already shown this month. */
export function lifecycle(D: (days: number, extra: number) => Entry[], target: number, policy: ReplayPolicy = 'firstOnly') {
  const T = D(target, 0), P = D(target - 1, 0), last = T[T.length - 1];
  const steps: Record<Scenario, { before: Entry[]; after: Entry[]; seen: boolean }> = {
    first: { before: P, after: T, seen: false },
    revisit: { before: T, after: T, seen: true },
    edit: { before: T, after: T.map((e, k) => (k === 0 ? { ...e, body: D(target, 2).find(x => x.id === 'demo-extra-1')?.body ?? e.body } : e)), seen: true },
    sameDay: { before: P, after: D(target - 1, 1), seen: false },
    partialDelete: { before: D(target, 1), after: D(target, 1).filter(e => e.id !== last?.id), seen: true },
    deleteDate: { before: T, after: T.slice(0, -1), seen: true },
    reachAgain: { before: T.slice(0, -1), after: T, seen: true },
    backfill: (() => { const gap = T[T.length - 2]; const b = T.filter(e => e.id !== gap?.id); return { before: b, after: gap ? [...b, { ...gap, createdAt: `${last!.entryDate}T21:00:00+09:00` }] : b, seen: false }; })(),
    undo: { before: T.slice(0, -1), after: T, seen: true },
  };
  const fixtureDates = distinctDays(D(99, 0));
  // a target above the fixture's date count cannot be reached with fake data → reported as not evaluable, never faked
  return SCENARIOS.map(s => ({ scenario: s, ...completionTrigger(steps[s].before, steps[s].after, target, steps[s].seen, policy), seen: steps[s].seen, fixtureDates, evaluable: target <= fixtureDates }));
}
