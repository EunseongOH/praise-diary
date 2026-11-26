/**
 * Gate 3E.1b / 3E.2 timeline (dev-only, pure). Event clock e (s), e = 0 = save of the 15th distinct entryDate (Gate 3C
 * trigger, unchanged). Art clock = t0 + e + PRE (Gate 3C EventTimeline) — never reset or scaled.
 * 7.0 s research timeline; duration 6 / 8 scales every window by len / 7:
 *   0–0.5 soft rewind → real D1 seed · 0.5–0.8 seed hold · 0.8–3.8 D1 → D15 (day windows follow the TEMPO profile)
 *   3.8–4.1 the finished crystal alone (= I3) · 4.1–6.4 snowglobe reward · 6.4–7.0 the reward settles → I3 only
 * Every stage k is EXACTLY S(k) at tau[k] (a single instant: the previous day's settle tail ends there and the next day's
 * first motifs start there, so the motion never stops — a true time overlap would make the exact endpoint impossible).
 */
import { TEMPO } from './theme';
export { PRE, SCENARIOS, completionTrigger, scenarioEntries, type Scenario } from '../snowflakeGrowthReplay/timeline';

export const DURATIONS = [6, 7, 8] as const;
export const BASE_LEN = 7;
const W7 = { rewind: [0, 0.5], hold: [0.5, 0.8], grow: [0.8, 3.8], complete: [3.8, 4.1], reward: [4.1, 6.4], settle: [6.4, 7] } as const;
type Win = [number, number];
export type Windows = {
  len: number; n: number; rewind: Win; hold: Win; grow: Win; complete: Win; reward: Win; settle: Win;
  tau: number[]; mountD15: number; handoff: Win;
};
export function windows(len = BASE_LEN, n = 15): Windows {
  const s = len / BASE_LEN;
  const sc = (w: readonly [number, number]): Win => [w[0] * s, w[1] * s];
  const grow = sc(W7.grow);
  const wt = Array.from({ length: n + 1 }, (_, k) => (k < 2 ? 0 : TEMPO[k] ?? 1));
  const sum = wt.reduce((a, b) => a + b, 0);
  const tau = [NaN, grow[0]];
  for (let k = 2; k <= n; k++) tau[k] = tau[k - 1]! + ((grow[1] - grow[0]) * wt[k]!) / sum;
  tau[n] = grow[1];
  const complete = sc(W7.complete);
  return { len, n, rewind: sc(W7.rewind), hold: sc(W7.hold), grow, complete, reward: sc(W7.reward), settle: sc(W7.settle), tau,
    mountD15: W7.hold[0] * s + 0.05, handoff: [complete[0] + 0.05 * s, complete[0] + 0.15 * s] };
}
export type Phase = 'before' | 'rewind' | 'hold' | 'grow' | 'complete' | 'reward' | 'settle' | 'done';
export function phaseOf(e: number, w: Windows): Phase {
  if (e < 0) return 'before';
  if (e < w.rewind[1]) return 'rewind';
  if (e < w.hold[1]) return 'hold';
  if (e < w.grow[1]) return 'grow';
  if (e < w.complete[1]) return 'complete';
  if (e < w.reward[1]) return 'reward';
  return e < w.len ? 'settle' : 'done';
}
export function stageAt(e: number, w: Windows): { k: number; t0: number; t1: number; p: number } {
  if (e < w.rewind[1]) return { k: 1, t0: 0, t1: w.rewind[1], p: Math.max(0, e) / w.rewind[1] };
  if (e < w.tau[1]!) return { k: 1, t0: 0, t1: w.rewind[1], p: 1 };
  for (let k = 2; k <= w.n; k++) if (e < w.tau[k]!) return { k, t0: w.tau[k - 1]!, t1: w.tau[k]!, p: (e - w.tau[k - 1]!) / (w.tau[k]! - w.tau[k - 1]!) };
  return { k: w.n, t0: w.tau[w.n - 1]!, t1: w.tau[w.n]!, p: 1 };
}
export const keyframes = (w: Windows) => [{ k: 1, e: w.rewind[1] }, ...w.tau.slice(2).map((e, j) => ({ k: j + 2, e }))];
