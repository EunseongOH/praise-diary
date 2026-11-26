/**
 * Gate 3E — growth replay timeline (dev-only, pure). Event clock e (s): e = 0 = the save of the 15th DISTINCT entryDate
 * succeeded (Gate 3C completionTrigger, reused unchanged). The art clock (I3 20 s strands, Living Core, H3 light) keeps
 * flowing on its own: art t = t0 + e + PRE (Gate 3C EventTimeline) — the replay never resets or scales it.
 * 6.5 s research timeline (spec 31 §2); duration 5.5 / 7.5 scales every window by len / 6.5:
 *   0–0.45 rewind (D14 → real D1 seed, outer glyphs first) · 0.45–0.8 seed hold · 0.8–3.55 D1 → D15 (every stage passed)
 *   3.55–4.0 final crystal = I3 · 4.0–6.05 Phase 2 reward slot (3E.1: I3 only, NOTHING drawn) · 6.05–6.5 settle → done
 * Every number is a [연구안].
 */
import type { Entry } from '../multiHelix/engine';
import type { Scenario as Sc } from '../snowflakeCompletion/timeline';
export { PRE, SCENARIOS, clamp, smooth, completionTrigger, lifecycle, type Scenario } from '../snowflakeCompletion/timeline';

export const ART_VERSION = 'snowflake-growth-replay-v0.1';
export type Variant = 'T1' | 'T2';
export const VARIANTS: Variant[] = ['T1', 'T2'];
export const DURATIONS = [5.5, 6.5, 7.5] as const;
export const BASE_LEN = 6.5;
const W65 = { rewind: [0, 0.45], hold: [0.45, 0.8], grow: [0.8, 3.55], recog: [3.55, 4.0], reward: [4.0, 6.05], settle: [6.05, 6.5] } as const;
type Win = [number, number];
export type Windows = {
  len: number; n: number; rewind: Win; hold: Win; grow: Win; recog: Win; reward: Win; settle: Win;
  tau: number[]; // tau[k] = e at which stage k is exactly S(k) (k = 1 … n; tau[1] = end of the seed hold)
  mountD15: number; // the hidden day-15 Gate 2I canvas is mounted here (quiet seed hold), never at the save frame
  handoff: Win; // both draw; at its end the Gate 2I I3 canvas becomes the only artwork
};
export function windows(len = BASE_LEN, n = 15): Windows {
  const s = len / BASE_LEN;
  const sc = (w: readonly [number, number]): Win => [w[0] * s, w[1] * s];
  const grow = sc(W65.grow);
  const tau = [NaN, ...Array.from({ length: n }, (_, j) => grow[0] + (j * (grow[1] - grow[0])) / Math.max(1, n - 1))];
  const recog = sc(W65.recog);
  return { len, n, rewind: sc(W65.rewind), hold: sc(W65.hold), grow, recog, reward: sc(W65.reward), settle: sc(W65.settle), tau,
    mountD15: W65.hold[0] * s + 0.05, handoff: [recog[0] + 0.05 * s, recog[0] + 0.15 * s] };
}

export type Phase = 'before' | 'replay' | 'handoff' | 'final' | 'done';
export function phaseOf(e: number, w: Windows): Phase {
  if (e < 0) return 'before';
  if (e < w.handoff[0]) return 'replay';
  if (e < w.handoff[1]) return 'handoff';
  return e < w.len ? 'final' : 'done';
}

/** which stage change is running at e: k = 1 → rewind B → S(1); k ≥ 2 → S(k−1) → S(k). Outside a change p = 1 (exact S). */
export function stageAt(e: number, w: Windows): { k: number; t0: number; t1: number; p: number } {
  if (e < w.rewind[1]) return { k: 1, t0: 0, t1: w.rewind[1], p: Math.max(0, e) / w.rewind[1] };
  if (e < w.tau[1]!) return { k: 1, t0: 0, t1: w.rewind[1], p: 1 };
  for (let k = 2; k <= w.n; k++) if (e < w.tau[k]!) return { k, t0: w.tau[k - 1]!, t1: w.tau[k]!, p: (e - w.tau[k - 1]!) / (w.tau[k]! - w.tau[k - 1]!) };
  return { k: w.n, t0: w.tau[w.n - 1]!, t1: w.tau[w.n]!, p: 1 };
}
/** e of every exact stage state: D1 at the end of the rewind (and through the hold), Dk at tau[k] */
export const keyframes = (w: Windows) => [{ k: 1, e: w.rewind[1] }, ...w.tau.slice(2).map((e, j) => ({ k: j + 2, e }))];

/** Phase 2 (3E.2 snowglobe reward) layer contract — NOT implemented in 3E.1 (user review of the growth motion first) */
export const REWARD = { implemented: false, window: 'reward' as const, note: '3E.2 — 사용자 성장 모션 검수 후 별도 구현' };

// ───────────────────────────── record scenarios (trigger research; same definitions as Gate 3C lifecycle) ─────────────────────────────
/** before / after entries of a record change around targetDays (D_n = first n dates of the fixture). Copied from the Gate 3C
 *  lifecycle steps (not exported there) so the replay can be built from the very same inputs the trigger is evaluated on. */
export function scenarioEntries(s: Sc, D: (days: number, extra: number) => Entry[], target: number): { before: Entry[]; after: Entry[]; seen: boolean } {
  const T = D(target, 0), P = D(target - 1, 0), last = T[T.length - 1];
  switch (s) {
    case 'first': return { before: P, after: T, seen: false };
    case 'revisit': return { before: T, after: T, seen: true };
    case 'edit': return { before: T, after: T.map((e, k) => (k === 0 ? { ...e, body: D(target, 2).find(x => x.id === 'demo-extra-1')?.body ?? e.body } : e)), seen: true };
    case 'sameDay': return { before: P, after: D(target - 1, 1), seen: false };
    case 'partialDelete': return { before: D(target, 1), after: D(target, 1).filter(e => e.id !== last?.id), seen: true };
    case 'deleteDate': return { before: T, after: T.slice(0, -1), seen: true };
    case 'reachAgain': return { before: T.slice(0, -1), after: T, seen: true };
    case 'backfill': { const gap = T[T.length - 2]; const b = T.filter(e => e.id !== gap?.id); return { before: b, after: gap ? [...b, { ...gap, createdAt: `${last!.entryDate}T21:00:00+09:00` }] : b, seen: false }; }
    case 'undo': return { before: T.slice(0, -1), after: T, seen: true };
  }
}
