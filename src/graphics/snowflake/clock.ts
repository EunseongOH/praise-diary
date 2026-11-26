/**
 * Shared presentation clock (verbatim copy of the research `PresentationClock` / `Stats` from the Gate 2C study canvas
 * file, without that canvas component). One rAF loop advances t and redraws every subscribed canvas with the same t.
 */
export type Stats = { frames: number; drawCalls: number; lastRendered: number; bitmapBuilds: number; reactRenders: number; loops: number };
export const newStats = (): Stats => ({ frames: 0, drawCalls: 0, lastRendered: 0, bitmapBuilds: 0, reactRenders: 0, loops: 0 });

export class PresentationClock {
  t = 0;
  playing = false;
  private frame = 0;
  private last: number | null = null;
  private listeners = new Set<(t: number) => void>();
  private resumeOnVisible = false;
  constructor(readonly stats: Stats) {}
  /** pause while the tab is hidden; returns the detach function (symmetric, StrictMode-safe) */
  attach() {
    document.addEventListener('visibilitychange', this.onVisibility);
    return () => { document.removeEventListener('visibilitychange', this.onVisibility); this.pause(); };
  }
  private onVisibility = () => {
    if (document.visibilityState === 'hidden') { this.resumeOnVisible = this.playing; this.pause(); }
    else if (this.resumeOnVisible) { this.resumeOnVisible = false; this.play(); }
  };
  subscribe(fn: (t: number) => void) { this.listeners.add(fn); fn(this.t); return () => { this.listeners.delete(fn); }; }
  emit() { for (const fn of this.listeners) fn(this.t); }
  setTime(t: number) { this.t = t; this.emit(); }
  play() {
    if (this.playing) return;
    this.playing = true;
    this.last = null;
    this.stats.loops++;
    const tick = (now: number) => {
      // dt clamp: a stalled/background frame never makes positions jump
      if (this.last != null) this.t += Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.stats.frames++;
      this.emit();
      if (this.playing) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.stats.loops--;
    cancelAnimationFrame(this.frame);
  }
}
