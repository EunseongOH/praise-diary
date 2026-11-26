/**
 * Review-only test hooks (window.__snowflakeReview), compiled in only when VITE_SNOWFLAKE_COMPLETION_REPLAY=1.
 * They expose clocks and event counters — never diary text.
 */
import type { PresentationClock } from './clock';
import { SNOWFLAKE_REVIEW } from './flags';

type EventInfo = { kind: string; phase: string; e: number; len: number; playing: boolean; leaks: number; frameMs: number[]; frameE: number[]; maxText: number; maxFrost: number; rewardFrames: number };
type Hooks = { clocks: Set<PresentationClock>; events: Map<string, () => EventInfo>; setTime: (t: number) => void; pauseAll: () => void };
declare global { interface Window { __snowflakeReview?: Hooks } }

function hooks(): Hooks | null {
  if (!SNOWFLAKE_REVIEW || typeof window === 'undefined') return null;
  if (!window.__snowflakeReview) {
    const clocks = new Set<PresentationClock>();
    window.__snowflakeReview = { clocks, events: new Map(), setTime: t => { for (const c of clocks) { c.pause(); c.setTime(t); } }, pauseAll: () => { for (const c of clocks) c.pause(); } };
  }
  return window.__snowflakeReview;
}
export function registerClock(c: PresentationClock) { const h = hooks(); if (!h) return () => {}; h.clocks.add(c); return () => { h.clocks.delete(c); }; }
export function registerEvent(id: string, info: () => EventInfo) { const h = hooks(); if (!h) return () => {}; h.events.set(id, info); return () => { h.events.delete(id); }; }
