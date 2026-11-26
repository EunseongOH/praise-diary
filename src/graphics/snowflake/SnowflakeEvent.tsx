/**
 * Saved-screen snowflake event (port of the Gate 3E.1b/3E.2 study panel without its debug views).
 *   e < 0            the ported Gate 2I RefineCanvas of the state BEFORE the save
 *   0 ≤ e < handoff  the Gate 3E.1 replay renderer driven by the smooth G1 schedule (glyphs only appear / fade in place)
 *   e ≥ mountAt      the state AFTER the save, mounted hidden (quiet relay: one bitmap build) and shown at the end of the
 *                    hand-off → from then on it is the plain I3 renderer (it keeps idling after the event)
 *   reward window    complete only: the snowglobe reward canvas (SB-Balanced), gone before the end of the event
 * Every event canvas is removed when the event ends; the art clock keeps the idle I3 motion running.
 */
import { useEffect, useRef, useState } from 'react';
import { RefineCanvas } from './core/h3Refinement/RefineCanvas';
import { newPose, poseI } from './core/h3Refinement/engine';
import { CX, CY, FONT, VIEW } from './core/fullSnowflake/engine';
import { createReplayRenderer, newRStats, type RDraw, type RLight } from './core/snowflakeGrowthReplay/rendererAdapter';
import { instances } from './core/snowflakeGrowthReplay/identityLedger';
import type { Snap } from './core/snowflakeGrowthReplay/snapshots';
import { alphaS, sdrawsOf, type SPlan } from './core/snowflakeGrowthReward/smoothReveal';
import { newPState, particleAt, sparkI, type RewardPlan, type RParticle } from './core/snowflakeGrowthReward/snowglobe';
import { COLORS } from './core/snowflakeGrowthReward/theme';
import { stageAt, type Windows } from './core/snowflakeGrowthReward/timeline';
import { PRE } from './core/snowflakeCompletion/timeline';
import { PresentationClock } from './clock';
import type { EventTimeline } from './eventClock';

/** relay for the hidden after-save canvas: skips the immediate subscribe call → RefineCanvas builds its bitmaps once */
class QuietRelay extends PresentationClock {
  subscribe(fn: (t: number) => void) { let first = true; return super.subscribe(t => { if (first) { first = false; return; } fn(t); }); }
}
type PPhase = 'before' | 'replay' | 'handoff' | 'final';
const pphase = (e: number, w: Windows, hasFinal: boolean): PPhase => {
  if (e < 0) return 'before';
  if (!hasFinal || e < w.handoff[0]) return 'replay';
  return e < w.handoff[1] ? 'handoff' : 'final';
};
export type EventStats = ReturnType<typeof newRStats> & { leaks: number; replayFrames: number; d15MountAt: number; maxText: number; maxFrost: number; rewardFrames: number };
export const newEventStats = (): EventStats => ({ ...newRStats(), leaks: 0, replayFrames: 0, d15MountAt: -9, maxText: 0, maxFrost: 0, rewardFrames: 0 });

function frostSprite(shape: RParticle['shape'], color: string, px: number, soft: boolean) {
  const c = document.createElement('canvas');
  const s = Math.ceil(px * 4);
  c.width = c.height = s;
  const g = c.getContext('2d')!, m = s / 2;
  if (soft) g.filter = `blur(${0.25 * px}px)`;
  g.fillStyle = color; g.strokeStyle = color;
  if (shape === 'dot') {
    const rg = g.createRadialGradient(m, m, 0, m, m, px);
    rg.addColorStop(0, color); rg.addColorStop(0.5, color); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(m, m, px, 0, 2 * Math.PI); g.fill();
  } else if (shape === 'powder') {
    for (const [dx, dy, r] of [[-0.5, -0.2, 0.3], [0.45, -0.35, 0.22], [0.1, 0.48, 0.26]] as const) { g.beginPath(); g.arc(m + dx * px, m + dy * px, r * px, 0, 2 * Math.PI); g.fill(); }
  } else {
    g.lineWidth = px * 0.18; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const a = (Math.PI / 3) * k; g.beginPath(); g.moveTo(m - Math.cos(a) * px, m - Math.sin(a) * px); g.lineTo(m + Math.cos(a) * px, m + Math.sin(a) * px); g.stroke(); }
    g.beginPath(); g.arc(m, m, px * 0.2, 0, 2 * Math.PI); g.fill();
  }
  return c;
}
function sparkSprite(px: number) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(px * 2);
  const g = c.getContext('2d')!, m = c.width / 2, S = COLORS.sparkle;
  const rg = g.createRadialGradient(m, m, 0, m, m, px * 0.32);
  rg.addColorStop(0, S.core); rg.addColorStop(0.4, S.mid); rg.addColorStop(1, S.edge);
  g.fillStyle = rg; g.fillRect(0, 0, c.width, c.height);
  for (const [w, hgt] of [[px * 0.5, px * 0.035], [px * 0.035, px * 0.5]] as const) {
    const lg = w > hgt ? g.createLinearGradient(m - w, 0, m + w, 0) : g.createLinearGradient(0, m - hgt, 0, m + hgt);
    lg.addColorStop(0, S.edge); lg.addColorStop(0.5, S.ray); lg.addColorStop(1, S.edge);
    g.fillStyle = lg; g.fillRect(m - w, m - hgt, w * 2, hgt * 2);
  }
  return c;
}

type Props = { B: Snap; final: Snap | null; plan: (k: number) => SPlan; w: Windows; reward: RewardPlan | null; tl: EventTimeline; mountAt: number; label: string; stats: EventStats };

export function SnowflakeEvent(p: Props) {
  const { B, final, plan, w, reward, tl, mountAt, stats } = p;
  const rc = useRef<HTMLCanvasElement>(null), rw = useRef<HTMLCanvasElement>(null);
  const d14wrap = useRef<HTMLDivElement>(null), d15wrap = useRef<HTMLDivElement>(null);
  const [ph, setPh] = useState<PPhase>(() => pphase(tl.e, w, !!final));
  const rewardOn = (e: number) => !!reward && e >= w.complete[0] && e < w.len;
  const mountOn = (e: number) => !!final && e >= mountAt;
  const [rwOn, setRwOn] = useState(() => rewardOn(tl.e));
  const [mounted, setMounted] = useState(() => mountOn(tl.e));
  useEffect(() => { const f = (e: number) => { setPh(pphase(e, w, !!final)); setRwOn(rewardOn(e)); setMounted(m => m || mountOn(e)); }; f(tl.e); return tl.subscribe(f); }, [tl, w, final, reward, mountAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const showD14 = ph === 'before';
  const showReplay = ph !== 'final';
  const showD15 = mounted && !!final;
  const forward = ph === 'handoff' || ph === 'final';
  const [relay] = useState(() => new QuietRelay(tl.clock.stats));
  useEffect(() => {
    const art = (e: number) => (tl.flow ? tl.t0 + e + PRE : tl.t0);
    const warm = forward ? [] : Array.from({ length: 6 }, (_, j) => art(w.handoff[0] + j * 0.2));
    let tick = 0;
    return tl.clock.subscribe(t => {
      if (forward) { relay.setTime(t); return; }
      if (showD15 && warm.length && tl.e > mountAt + 0.15 && tl.e < w.handoff[0] - 0.5 && ++tick % 4 === 0) relay.setTime(warm.shift()!);
      relay.t = t;
    });
  }, [tl, relay, forward, showD15, w, mountAt]);
  useEffect(() => { if (showD15) stats.d15MountAt = tl.e; }, [showD15]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const set = (e: number) => {
      const q = pphase(e, w, !!final);
      if (d14wrap.current) d14wrap.current.style.opacity = q === 'before' ? '1' : '0';
      if (rc.current) rc.current.style.opacity = q === 'before' || q === 'final' ? '0' : '1';
      if (d15wrap.current) d15wrap.current.style.opacity = q === 'final' ? '1' : '0';
    };
    set(tl.e);
    return tl.subscribe(set);
  }, [tl, w, final, showD14, showReplay, showD15]);

  // ── growth replay ──
  useEffect(() => {
    if (!showReplay) return;
    const canvas = rc.current!;
    const r = createReplayRenderer(canvas, B.is, stats);
    r.setView(1, CX, CY);
    const dl: RDraw[] = [], ll: RLight[] = [];
    const frameOf = (e: number) => {
      dl.length = 0; ll.length = 0;
      if (e < 0) {
        B.is.rs.st.active.forEach((_, i) => dl.push({ is: B.is, i, alpha: 1 }));
        B.is.particles.forEach((_, i) => ll.push({ is: B.is, i, alpha: 1 }));
        return B.is;
      }
      const pl = plan(stageAt(e, w).k);
      const st = [pl.P.is, pl.C.is];
      const { useC, draws } = sdrawsOf(pl, e);
      const ia = instances(pl.P), ic = instances(pl.C), top = pl.P.date > pl.C.date ? pl.P.date : pl.C.date;
      for (const d of draws) {
        dl.push({ is: st[d.st]!, i: d.i, alpha: d.alpha });
        if ((d.st ? ic : ia)[d.i]!.date > (d.st ? pl.C.date : top)) stats.leaks++;
      }
      const lp = pl.partP.map(x => ({ is: pl.P.is, i: x.i, alpha: alphaS(x, e) })), lc = pl.partC.map(x => ({ is: pl.C.is, i: x.i, alpha: alphaS(x, e) }));
      for (const L of useC ? [...lc, ...lp.filter((_, j) => pl.partP[j]!.dir !== 0)] : [...lp, ...lc.filter((_, j) => pl.partC[j]!.dir !== 0)]) if (L.alpha > 0) ll.push(L);
      return pl.C.is;
    };
    let warmed = false;
    const draw = (t: number) => {
      const e = tl.e;
      if (pphase(e, w, !!final) === 'final') return;
      if (e < 0 && warmed) return;
      warmed = true;
      r.draw(t, dl, ll, frameOf(e));
      if (e >= 0) stats.replayFrames++;
    };
    const unsub = tl.clock.subscribe(draw);
    let alive = true, wid = 0;
    const art = (e: number) => (tl.flow ? tl.t0 + e + PRE : tl.t0);
    const warmTimes = [0, 0.15, 0.3, 0.5, 0.8, 1.2, 1.8, 2.4, 3, 3.6].filter(x => x < w.handoff[1]).map(art);
    const warmNext = () => { if (!alive || tl.e >= 0 || !warmTimes.length) return; frameOf(-1); r.draw(warmTimes.shift()!, dl, ll, B.is); wid = window.setTimeout(warmNext, 30); };
    void document.fonts?.ready.then(() => { if (alive) { r.reset(); warmed = false; draw(tl.clock.t); wid = window.setTimeout(warmNext, 30); } });
    const onResize = () => { r.resize(); warmed = false; draw(tl.clock.t); };
    window.addEventListener('resize', onResize);
    return () => { alive = false; clearTimeout(wid); unsub(); window.removeEventListener('resize', onResize); };
  }, [showReplay, B, final, plan, tl, w, stats]);

  // ── snowglobe reward ──
  useEffect(() => {
    if (!rwOn || !reward) return;
    const c = rw.current!, x = c.getContext('2d')!;
    const family = getComputedStyle(c).getPropertyValue('--font-body').trim() || 'sans-serif';
    let scale = 0;
    let cache = new Map<string, HTMLCanvasElement>();
    const cached = (k: string, make: () => HTMLCanvasElement) => { let v = cache.get(k); if (!v) { v = make(); cache.set(k, v); } return v; };
    const q = newPState(), f = newPose();
    const textSprite = (it: RParticle) => cached(`t${it.text}${it.color}`, () => {
      const cv = document.createElement('canvas'), fs = FONT * scale, mm = cv.getContext('2d')!;
      mm.font = `480 ${fs}px ${family}`;
      cv.width = Math.ceil(mm.measureText(it.text!).width + fs * 0.8); cv.height = Math.ceil(fs * 1.8);
      const g = cv.getContext('2d')!;
      g.font = `480 ${fs}px ${family}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(210,232,255,0.7)'; g.shadowBlur = 1.2 * scale; g.fillStyle = it.color;
      g.fillText(it.text!, cv.width / 2, cv.height / 2);
      return cv;
    });
    const draw = (t: number) => {
      const e = tl.e;
      const dpr = window.devicePixelRatio || 1;
      const unit = ((c.clientWidth || VIEW.width) / VIEW.width) * dpr;
      const W = Math.round(VIEW.width * unit);
      if (c.width !== W) { c.width = W; c.height = Math.round(VIEW.height * unit); }
      const want = unit * 1.15;
      if (want !== scale) { scale = want; cache = new Map(); }
      const vs = unit, vx = (VIEW.width / 2 - CX) * unit, vy = (VIEW.height / 2 - CY) * unit;
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      x.clearRect(0, 0, c.width, c.height);
      let nt = 0, nf = 0;
      for (const pass of ['frost', 'text'] as const) for (const it of reward.particles) {
        if (it.kind !== pass) continue;
        const s = particleAt(it, e, q);
        if (!s || s.alpha < 0.005) continue;
        if (pass === 'text') nt++; else nf++;
        const img = pass === 'text' ? textSprite(it) : cached(`f${it.shape}${it.color}${it.depth < 0.5}`, () => frostSprite(it.shape, it.color, scale, it.depth < 0.5));
        const m = (vs * s.size) / scale, cs = Math.cos(s.rot), sn = Math.sin(s.rot);
        x.setTransform(m * cs, m * sn, -m * sn, m * cs, vx + vs * s.x, vy + vs * s.y);
        x.globalAlpha = Math.min(1, s.alpha);
        x.drawImage(img, -img.width / 2, -img.height / 2);
      }
      x.globalCompositeOperation = 'lighter';
      const sp = cached('spark', () => sparkSprite(8 * scale));
      for (const g of reward.sparks) {
        const I = sparkI(g, e);
        if (I <= 0.01) continue;
        let X: number, Y: number, a = I;
        if (g.target === 'particle') { const s = particleAt(reward.particles[g.ref]!, e, q); if (!s) continue; X = s.x; Y = s.y; a *= Math.min(1, s.alpha / 0.5); }
        else { if (!final) continue; poseI(final.is, g.ref, t, f); X = f.x; Y = f.y; a *= 0.75; }
        const m = ((vs * g.size) / (8 * scale)) * 0.5, cs = Math.cos(g.rot), sn = Math.sin(g.rot);
        x.setTransform(m * cs, m * sn, -m * sn, m * cs, vx + vs * X, vy + vs * Y);
        x.globalAlpha = Math.min(1, a);
        x.drawImage(sp, -sp.width / 2, -sp.height / 2);
      }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      Object.assign(stats, { maxText: Math.max(stats.maxText, nt), maxFrost: Math.max(stats.maxFrost, nf), rewardFrames: stats.rewardFrames + 1 });
    };
    return tl.clock.subscribe(draw);
  }, [rwOn, reward, final, tl, stats]);

  const abs = { position: 'absolute', inset: 0 } as const;
  return <div className="snowflake-artwork" data-snowflake="event" data-phase={ph} style={{ position: 'relative', width: '100%', aspectRatio: `${VIEW.width} / ${VIEW.height}` }}>
    {showD14 && <div ref={d14wrap} style={abs}><RefineCanvas is={B.is} clock={tl.clock} zoom={1} fx={CX} fy={CY} debug="off" render="optimized" label={p.label} /></div>}
    {showD15 && final && <div ref={d15wrap} data-snowflake-final="" style={{ ...abs, opacity: 0 }}><RefineCanvas is={final.is} clock={relay} zoom={1} fx={CX} fy={CY} debug="off" render="optimized" label={p.label} /></div>}
    {showReplay && <canvas ref={rc} data-fx="replay" aria-hidden="true" style={{ ...abs, display: 'block', width: '100%', aspectRatio: `${VIEW.width} / ${VIEW.height}`, background: 'transparent', opacity: 0 }} />}
    {rwOn && <canvas ref={rw} data-fx="reward" aria-hidden="true" style={{ ...abs, width: '100%', height: '100%', pointerEvents: 'none' }} />}
  </div>;
}
