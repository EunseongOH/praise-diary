/**
 * App-wide snapshot cache: one Gate 3B R3 state per distinct input (memo by input signature, in memory only — shared by
 * home, saved screen, collection tile and detail). Heavy builds (70–300 ms each) go to the worker; `stateNow()` is the
 * synchronous fallback. If the worker does not answer in time (blocked, failed to load), the state is built on the main
 * thread instead (a visible long frame, but never a stuck screen). The worker is closed when idle and re-created on demand.
 */
import { SnapshotStore } from './core/snowflakeGrowthReplay/snapshotStore';
import { historyDates, stageInputs, type Snap, type SnapOpts } from './core/snowflakeGrowthReplay/snapshots';
import type { Entry } from './core/multiHelix/engine';

const WORKER_TIMEOUT_MS = 6000;
let store: SnapshotStore | null = null;
const get = () => (store ??= new SnapshotStore(true));
export const optsOf = (still: boolean): SnapOpts => ({ still, seed: 'v1' });
/** the whole-month state (prefix = every entry): k = distinct dates */
const whole = (E: Entry[]) => { const d = historyDates(E); return { P: E, k: d.length, date: d[d.length - 1] ?? '' }; };
/** worker request with a main-thread fallback after WORKER_TIMEOUT_MS */
function viaWorker(P: Entry[], k: number, date: string, o: SnapOpts): Promise<Snap> {
  return new Promise(resolve => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; fallbacks++; resolve(get().get(P, k, date, o)); } }, WORKER_TIMEOUT_MS);
    void get().request(P, k, date, o).then(s => { if (!done) { done = true; clearTimeout(timer); resolve(s); } });
  });
}
let fallbacks = 0;
export function peekState(E: Entry[], still: boolean): Snap | undefined { return E.length ? get().peek(E, optsOf(still)) : undefined; }
export function requestState(E: Entry[], still: boolean): Promise<Snap> { const w = whole(E); return viaWorker(w.P, w.k, w.date, optsOf(still)).then(s => { get().closeWhenIdle(); return s; }); }
export function stateNow(E: Entry[], still: boolean): Snap { const w = whole(E); return get().get(w.P, w.k, w.date, optsOf(still)); }
/** every prefix S(1)…S(n) of a history (completion replay) */
export function requestHistory(E: Entry[], still: boolean): Promise<Snap[]> {
  const o = optsOf(still);
  return Promise.all(stageInputs(E).map(x => viaWorker(x.P, x.k, x.date, o))).then(s => { get().closeWhenIdle(); return s; });
}
export const storeStats = () => ({ ...get().stats, timeoutFallbacks: fallbacks });
