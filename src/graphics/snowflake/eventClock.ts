/**
 * Event clock e (s) for the saved-screen events (verbatim copy of the research Gate 3C `EventTimeline` class; the study
 * canvas component it lived in is not ported). e drives the art clock: art t = t0 + e + PRE (never reset or scaled).
 */
import type { PresentationClock } from './clock';
import { PRE, artTime } from './core/snowflakeCompletion/timeline';

export class EventTimeline {
  e = -PRE; len = 5; t0 = 0; flow = true; speed = 1;
  playing = false; loops = 0; starts = 0; frameMs: number[] = []; frameE: number[] = [];
  private raf = 0; private last: number | null = null; private resume = false;
  private listeners = new Set<(e: number) => void>();
  constructor(readonly clock: PresentationClock, public onDone: () => void = () => {}) {}
  subscribe(fn: (e: number) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  get listenerCount() { return this.listeners.size; }
  seek(e: number) { this.e = e; for (const fn of this.listeners) fn(e); this.clock.setTime(artTime(e, this.t0, this.flow)); }
  /** explicit start (save event / manual replay) — counted */
  start(from = -PRE) { this.pause(); this.clock.pause(); this.starts++; this.seek(from); this.run(); }
  private run() {
    if (this.playing) return;
    this.playing = true; this.loops++; this.last = null; this.frameMs = []; this.frameE = [];
    const tick = (now: number) => {
      if (this.last != null) { this.frameMs.push(now - this.last); this.frameE.push(this.e); this.seek(this.e + Math.min(0.1, (now - this.last) / 1000) * this.speed); }
      this.last = now;
      if (this.e >= this.len + 0.05) { this.pause(); this.onDone(); return; }
      if (this.playing) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  play() { if (this.e >= this.len) this.seek(-PRE); this.clock.pause(); this.run(); }
  pause() { if (!this.playing) return; this.playing = false; this.loops--; cancelAnimationFrame(this.raf); }
  /** StrictMode-safe: a detach/attach pair resumes a running event instead of starting a second one */
  attach() { if (this.resume) { this.resume = false; this.run(); } return () => { this.resume = this.playing; this.pause(); }; }
}
