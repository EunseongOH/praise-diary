/**
 * Gate 3E — historical snapshots S(1)…S(n) of the REAL Gate 3B R3 growth (dev-only, pure, deterministic).
 * dates = distinct entryDate ascending (the attributed date, never the save time → a backfill lands in its own place);
 * S(k) = buildRadial('R3', entries with entryDate ≤ dates[k−1]) — every entry of a date is included (same-day density).
 * S(k) is exactly what the Gate 3B page draws for that prefix (same call, same echo / density defaults, same seed);
 * it never contains text of a later date (the prefix simply does not have it). Nothing is stored, no ledger is replaced.
 * One snapshot costs 70–170 ms (measured in node: 3B buildRadial runs the whole I3 layout) → they are built in a worker
 * (snapshotWorker.ts) ahead of time; this file is also used directly by the logic tests and as the main-thread fallback.
 */
import type { Entry } from '../multiHelix/engine';
import { buildRadial, type RGState } from '../snowflakeRadialGrowth/engine';

export type SnapOpts = { still: boolean; seed: string };
/** a 3B R3 state without its two heavy back-references (base = the unfiltered I3 state, g3a = R0 only) */
export type Snap = Omit<RGState, 'base' | 'g3a'> & { k: number; date: string; sig: string };

export const historyDates = (E: Entry[]) => [...new Set(E.map(e => e.entryDate))].sort();
export const prefixOf = (E: Entry[], dates: string[], k: number) => E.filter(e => e.entryDate <= dates[k - 1]!);
/** identity of a prefix input (memo key, in memory only — never written to the DOM, logs or files) */
export const sigOf = (P: Entry[], o: SnapOpts) => `${o.still ? 1 : 0}|${o.seed}|${JSON.stringify([...P].sort((a, b) => a.id.localeCompare(b.id)).map(e => [e.id, e.entryDate, e.createdAt, e.body]))}`;

/** the 3B R3 research defaults (echo mid, density fill, regular 15 stages) — the same call as the Gate 3B page */
export function buildSnap(P: Entry[], k: number, date: string, o: SnapOpts): Snap {
  const gs = buildRadial('R3', P, { still: o.still, seed: o.seed, echo: 'mid', density: 'fill', targetDays: 15 });
  const { base: _b, g3a: _g, ...rest } = gs;
  void _b; void _g;
  return { ...rest, k, date, sig: sigOf(P, o) };
}

/** every stage input of a history (k = 1 … number of distinct dates) */
export const stageInputs = (E: Entry[]) => { const dates = historyDates(E); return dates.map((date, j) => ({ k: j + 1, date, P: prefixOf(E, dates, j + 1) })); };
