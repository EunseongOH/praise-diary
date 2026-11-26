/**
 * Gate 3E — snapshot memo + worker queue (dev page only). A prefix is computed once (memo by its input signature, in
 * memory only). `request` = in the worker (no main-thread stall); `get` = synchronous main-thread fallback (counted, it IS
 * a long frame — reported, never hidden). Before the save only prefixes of the CURRENT entries are requested: the 15th
 * date's state cannot exist before its save.
 */
import type { Entry } from '../multiHelix/engine';
import { buildSnap, sigOf, type Snap, type SnapOpts } from './snapshots';
import type { SnapRequest } from './snapshotWorker';

export type StoreStats = { workerBuilds: number; syncBuilds: number; workerMs: number[]; syncMs: number[] };

export class SnapshotStore {
  private memo = new Map<string, Snap>();
  private waiting = new Map<string, Promise<Snap>>();
  private done = new Map<number, (s: Snap) => void>();
  private worker: Worker | null = null;
  private seq = 0;
  stats: StoreStats = { workerBuilds: 0, syncBuilds: 0, workerMs: [], syncMs: [] };
  constructor(private useWorker = true) {}
  /** the worker is created on first use (StrictMode-safe) and closed once the post-save snapshots are in (closeWhenIdle) */
  private ensure() {
    if (this.worker || !this.useWorker || typeof Worker === 'undefined') return this.worker;
    try {
      this.worker = new Worker(new URL('./snapshotWorker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (ev: MessageEvent<{ id: number; snap: Snap; ms: number }>) => {
        const { id, ms } = ev.data;
        const snap = this.memo.get(ev.data.snap.sig) ?? ev.data.snap; // a sync fallback may have built it meanwhile: keep ONE object
        this.memo.set(snap.sig, snap);
        this.stats.workerBuilds++; this.stats.workerMs.push(ms);
        this.done.get(id)?.(snap);
        this.done.delete(id);
        if (this.closing && !this.done.size) this.dispose();
      };
    } catch { this.worker = null; this.useWorker = false; }
    return this.worker;
  }
  private closing = false;
  get alive() { return !!this.worker; }
  closeWhenIdle() { this.closing = true; if (!this.done.size) this.dispose(); }
  peek(P: Entry[], o: SnapOpts) { return this.memo.get(sigOf(P, o)); }
  /** synchronous (main thread) — only when a snapshot is needed NOW and the worker has not delivered it */
  get(P: Entry[], k: number, date: string, o: SnapOpts) {
    const sig = sigOf(P, o);
    const hit = this.memo.get(sig);
    if (hit) return hit;
    const t0 = performance.now();
    const s = buildSnap(P, k, date, o);
    this.stats.syncBuilds++; this.stats.syncMs.push(performance.now() - t0);
    this.memo.set(sig, s);
    return s;
  }
  request(P: Entry[], k: number, date: string, o: SnapOpts): Promise<Snap> {
    const sig = sigOf(P, o);
    const hit = this.memo.get(sig);
    if (hit) return Promise.resolve(hit);
    const w = this.waiting.get(sig);
    if (w) return w;
    this.closing = false;
    const wk = this.ensure();
    const p = wk
      ? new Promise<Snap>(res => { const id = ++this.seq; this.done.set(id, res); wk.postMessage({ id, k, date, P, o } satisfies SnapRequest); })
      : new Promise<Snap>(res => setTimeout(() => res(this.get(P, k, date, o)), 0));
    this.waiting.set(sig, p);
    void p.then(() => this.waiting.delete(sig));
    return p;
  }
  dispose() { this.worker?.terminate(); this.worker = null; this.done.clear(); this.closing = false; }
}
