/**
 * The December snowflake for ArtworkSlot. One engine for every screen:
 *   home / detail   I3 idle motion of the month state (Gate 3B R3 stage of the distinct-day count, research 15 stages)
 *   tile            the same state, still frame (no motion, no reward)
 *   saved + event   once per save (event id = the saved entry id):
 *     growth / addition  the day's real change S(before) → S(after) with the smooth G1 schedule (positions never move)
 *     complete           G1 growth replay (rewind → D1 … Dn) + SB-Balanced snowglobe reward, then I3.
 *                        Auto only when the month has a real targetDays and the save crossed it (App `mode`), or — review
 *                        builds only — when the save crossed the research visual stage (14 → 15 distinct days).
 * Reduced motion (app setting or OS): no replay, no particles; the after-save state is shown still.
 * States are built in a worker (shared cache); nothing is shown until the month state exists (no fake artwork).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DiaryEntry } from '../../data/types';
import { SNOWFLAKE_REVIEW, VISUAL_STAGE_DAYS } from './flags';
import { distinctDays, toEngine } from './sourceAdapter';
import { peekState, requestHistory, requestState, stateNow } from './snapshots';
import { SnowflakeStatic } from './SnowflakeStatic';
import { SnowflakeEvent, newEventStats } from './SnowflakeEvent';
import { EventTimeline } from './eventClock';
import { PresentationClock, newStats } from './clock';
import { registerClock, registerEvent } from './reviewHooks';
import { smoothPlan, type SPlan } from './core/snowflakeGrowthReward/smoothReveal';
import { rewardPlan } from './core/snowflakeGrowthReward/snowglobe';
import { phaseOf, windows } from './core/snowflakeGrowthReward/timeline';
import { dayWindows, eventKind } from './events';
import { PRE } from './core/snowflakeCompletion/timeline';
import type { Snap } from './core/snowflakeGrowthReplay/snapshots';
import type { Entry } from './core/multiHelix/engine';

export type SnowflakeVariant = 'home' | 'detail' | 'tile' | 'saved' | 'preview';
export type SnowflakePlayback = { kind: 'growth' | 'addition' | 'complete'; eventId: string };
type Props = { entries: DiaryEntry[]; reducedMotion: boolean; variant: SnowflakeVariant; playback?: SnowflakePlayback; label: string; onPlaybackState?: (phase: 'preparing' | 'replaying' | 'settled') => void };

/** one save plays once per session; a remount within 0.5 s (React StrictMode) is the same play, not a replay */
const started = new Map<string, number>();
const alreadyPlayed = (id: string) => { const t = started.get(id); return t != null && performance.now() - t > 500; };

function useOsReduced() {
  const [v, setV] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const m = window.matchMedia?.('(prefers-reduced-motion: reduce)'); if (!m) return; const f = () => setV(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return v;
}
/** the month state, built in the worker when it is not cached yet */
function useMonthState(E: Entry[], still: boolean): Snap | null {
  const [s, setS] = useState<Snap | null>(() => peekState(E, still) ?? null);
  useEffect(() => {
    let alive = true;
    const hit = peekState(E, still);
    if (hit) { setS(hit); return; }
    setS(null);
    if (E.length) void requestState(E, still).then(x => { if (alive) setS(x); });
    return () => { alive = false; };
  }, [E, still]);
  return s && E.length ? s : null;
}

export function SnowflakeArtwork({ entries, reducedMotion, variant, playback, label, onPlaybackState }: Props) {
  const osReduced = useOsReduced();
  const still = reducedMotion || osReduced;
  const sig = entries.map(e => `${e.id}\u0000${e.entryDate}\u0000${e.createdAt}\u0000${e.body}`).join('\u0001');
  const E = useMemo(() => toEngine(entries), [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const state = useMonthState(E, still);
  const event = useMemo(() => {
    if (variant !== 'saved' || !playback || still || alreadyPlayed(playback.eventId)) return null;
    const before = E.filter(e => e.id !== playback.eventId);
    if (before.length === E.length) return null;
    const dB = distinctDays(before), dA = distinctDays(E);
    const kind = eventKind(playback.kind, dB, dA, SNOWFLAKE_REVIEW, VISUAL_STAGE_DAYS);
    return { id: playback.eventId, before, complete: kind === 'complete' && dA >= 2 && before.length > 0, kind };
  }, [variant, playback?.eventId, playback?.kind, still, E]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (variant === 'saved' && !event) onPlaybackState?.('settled');
  }, [variant, event, onPlaybackState]);
  if (!E.length) return null;
  // First-ever praise: no "before" snapshot exists. The previous event pipeline
  // required B and therefore waited forever, leaving the save experience stuck.
  // Reveal the actual first-day Canvas bottom→top instead, then keep its I3 idle motion.
  if (event && event.before.length === 0) {
    if (!state) return <div className="snowflake-artwork" data-snowflake="pending" aria-hidden="true" />;
    return <SnowflakeFirstGrowth key={event.id} id={event.id} snap={state} label={label} onPlaybackState={onPlaybackState} />;
  }
  if (event) return <SnowflakeSaveEvent key={event.id} id={event.id} before={event.before} after={E} complete={event.complete} kind={event.kind} label={label} fallback={state} onPlaybackState={onPlaybackState} />;
  if (!state) return <div className="snowflake-artwork" data-snowflake="pending" aria-hidden="true" />;
  return <SnowflakeStatic key={still ? 'still' : 'live'} snap={state} live={!still && variant !== 'tile' && variant !== 'preview'} label={label} />;
}

/** One real first-day growth, without requiring a fictitious day-zero artwork. */
function SnowflakeFirstGrowth({ id, snap, label, onPlaybackState }: {
  id: string; snap: Snap; label: string;
  onPlaybackState?: (phase: 'preparing' | 'replaying' | 'settled') => void;
}) {
  const [settled, setSettled] = useState(false);
  const notified = useRef(false);
  useEffect(() => {
    if (!started.has(id)) started.set(id, performance.now());
    onPlaybackState?.('replaying');
    // Animation end is the normal path. A stopped/unsupported CSS animation
    // must not permanently trap the user's save-success action.
    const fallback = window.setTimeout(() => {
      if (notified.current) return;
      notified.current = true;
      setSettled(true);
      onPlaybackState?.('settled');
    }, 2600);
    return () => window.clearTimeout(fallback);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const finish = () => {
    if (notified.current) return;
    notified.current = true;
    setSettled(true);
    onPlaybackState?.('settled');
  };
  return <div className={settled ? 'snowflake-first-grow snowflake-first-grow--settled' : 'snowflake-first-grow'}
    data-snowflake="first-growth" data-phase={settled ? 'settled' : 'replaying'}
    onAnimationEnd={(e) => { if (e.target === e.currentTarget) finish(); }}>
    <SnowflakeStatic snap={snap} live label={label} />
  </div>;
}

function SnowflakeSaveEvent({ id, before, after, complete, kind, label, fallback, onPlaybackState }: { id: string; before: Entry[]; after: Entry[]; complete: boolean; kind: string; label: string; fallback: Snap | null; onPlaybackState?: (phase: 'preparing' | 'replaying' | 'settled') => void }) {
  const [tl] = useState(() => new EventTimeline(new PresentationClock(newStats())));
  const [stats] = useState(newEventStats);
  // inputs: B = the state before the save (normally cached from home), the after state / history from the worker
  const [B, setB] = useState<Snap | null>(() => (before.length ? peekState(before, false) ?? null : null));
  const [final, setFinal] = useState<Snap | null>(() => peekState(after, false) ?? null);
  const [hist, setHist] = useState<Snap[] | null>(null);
  useEffect(() => {
    let alive = true;
    if (!B) { if (before.length) void requestState(before, false).then(s => { if (alive) setB(s); }); }
    if (!final) void requestState(after, false).then(s => { if (alive) setFinal(s); });
    if (complete) void requestHistory(after, false).then(s => { if (alive) setHist(s); });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const n = complete ? new Set(after.map(e => e.entryDate)).size : 2;
  const w = useMemo(() => (complete ? windows(7, n) : dayWindows()), [complete, n]);
  // the replay may only start when its first state exists (complete: B + S(1); day: B + after)
  const startable = !!B && (complete ? !!hist : !!final);
  const plans = useMemo(() => new Map<number, SPlan>(), []);
  const plan = useMemo(() => (k: number) => {
    let p = plans.get(k);
    if (!p) {
      p = complete
        ? smoothPlan(k, k === 1 ? B! : hist?.[k - 2] ?? stateNow(prefix(after, k - 1), false), hist?.[k - 1] ?? stateNow(prefix(after, k), false), w, 'G1')
        : smoothPlan(2, B!, final!, w, 'G1');
      plans.set(k, p);
    }
    return p;
  }, [B, final, hist, complete, w, plans, after]);
  const reward = useMemo(() => (complete && final ? rewardPlan('balanced', final, w) : null), [complete, final, w]);
  useEffect(() => tl.attach(), [tl]);
  useEffect(() => registerClock(tl.clock), [tl]);
  useEffect(() => {
    if (!startable) { onPlaybackState?.('preparing'); return; }
    onPlaybackState?.('replaying');
    if (!started.has(id)) started.set(id, performance.now());
    tl.len = w.len;
    tl.onDone = () => { tl.clock.play(); onPlaybackState?.('settled'); }; // real timeline completion, not a timer guess
    tl.start(complete ? -PRE : -0.45);
    return () => { tl.pause(); tl.clock.pause(); };
  }, [startable]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => registerEvent(id, () => ({ kind: complete ? 'complete' : kind, phase: phaseOf(tl.e, w), e: tl.e, len: w.len, playing: tl.playing, leaks: stats.leaks, frameMs: [...tl.frameMs], frameE: [...tl.frameE], maxText: stats.maxText, maxFrost: stats.maxFrost, rewardFrames: stats.rewardFrames })), [id, tl, w, stats, complete, kind]);
  if (!startable || !B) return fallback ? <SnowflakeStatic snap={B ?? fallback} live={false} label={label} /> : <div className="snowflake-artwork" data-snowflake="pending" aria-hidden="true" />;
  return <SnowflakeEvent B={B} final={final} plan={plan} w={w} reward={reward} tl={tl} mountAt={w.mountD15} label={label} stats={stats} />;
}
function prefix(E: Entry[], k: number) { const d = [...new Set(E.map(e => e.entryDate))].sort(); return E.filter(e => e.entryDate <= d[k - 1]!); }
