/**
 * Gate 3E dev-only worker: builds Gate 3B R3 snapshots off the main thread (one buildRadial = 70–170 ms, which on the
 * main thread is exactly the "save frame" stall of earlier gates). Pure computation, no DOM, no storage, no logging of
 * diary text. Requests are served in order; each result is posted as soon as it exists.
 */
import { buildSnap, type SnapOpts } from './snapshots';
import type { Entry } from '../multiHelix/engine';

export type SnapRequest = { id: number; k: number; date: string; P: Entry[]; o: SnapOpts };

self.onmessage = (ev: MessageEvent<SnapRequest>) => {
  const { id, k, date, P, o } = ev.data;
  const t0 = performance.now();
  const snap = buildSnap(P, k, date, o);
  self.postMessage({ id, snap, ms: performance.now() - t0 });
};
