/**
 * Gate 3E.2 — snowglobe reward plan (dev-only, pure, deterministic; no Math.random). Starts only after the finished
 * crystal has been shown alone (Windows.complete). Never touches the artwork: particles / glints are drawn on their own
 * canvas and are all gone before the end of the event.
 *   emitters  arm tips · branch joints · outer core rim (positions of real day-15 glyphs)
 *   frost     small dots / micro crystals / powder, 65–75 % of the particles
 *   text      1–2 contiguous REAL graphemes of the saved entries (render-only copies, smaller and fainter than the body);
 *             they leave tips / joints sideways into the gap between arms so they do not sit on the body
 *   motion    a lightly shaken globe: a decaying swirl around the centre + slow outward drift + slow sinking + a small
 *             radial wobble — births spread over 1.2 s, nothing is launched at once
 *   sparkles  short cold glints at irregular times (accumulated rate, hashed thresholds): 80 % beside a living frost
 *             particle, 20 % tiny glints on a body tip / joint glyph
 */
import { h } from '../livingTypography/engine';
import { graphemes } from '../../engine';
import { CX, CY, VIEW } from '../fullSnowflake/engine';
import { instances, type Inst } from '../snowflakeGrowthReplay/identityLedger';
import type { Snap } from '../snowflakeGrowthReplay/snapshots';
import { ART_VERSION, COLORS, PARTICLE, REWARD } from './theme';
import type { Windows } from './timeline';

export type Emitter = { kind: 'tip' | 'joint' | 'rim' | 'branch'; x: number; y: number; arm: number; side: number; glyph: number; dx: number; dy: number };
export type RParticle = {
  id: string; kind: 'text' | 'frost'; shape: 'dot' | 'crystal' | 'powder' | 'text'; text?: string; entryId?: string; graphemeOffset?: number; graphemeCount?: number;
  origin: Emitter['kind']; emitter: number; t0: number; life: number; th0: number; r0: number; dr: number; dir: number; swirl: number;
  wob: number; wobHz: number; ph: number; size: number; rot0: number; spin: number; color: string; alphaMax: number; depth: number;
};
export type RSpark = { t0: number; dur: number; target: 'particle' | 'body'; ref: number; size: number; rot: number };
export type RewardKnobs = { particle: number; sparkle: number };
export type RewardPlan = { kind: 'gentle' | 'balanced'; particles: RParticle[]; sparks: RSpark[]; emitters: Emitter[]; start: number; end: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function emitters(S15: Snap): Emitter[] {
  const I = instances(S15).filter(x => !x.temp);
  const out: Emitter[] = [];
  const add = (kind: Emitter['kind'], x: Inst, side = 0, dir?: [number, number]) => {
    const [dx, dy] = dir ?? [(x.x - CX) / (x.r || 1), (x.y - CY) / (x.r || 1)];
    out.push({ kind, x: x.x, y: x.y, arm: x.arm, side, glyph: x.i, dx, dy });
  };
  for (let a = 0; a < 6; a++) {
    const tip = I.filter(x => x.arm === a && (x.motif === `${a}:spine4` || x.motif === `${a}:tip~d`)).sort((p, q) => q.r - p.r)[0];
    if (tip) add('tip', tip);
    for (const b of [0, 1, 2]) for (const s of ['L', 'R']) {
      const br = I.filter(x => x.motif === `${a}:b${b}${s}`).sort((p, q) => p.r - q.r);
      if (!br.length) continue;
      const root = br[0]!, end = br[br.length - 1]!, L = Math.hypot(end.x - root.x, end.y - root.y) || 1;
      add('joint', root, s === 'L' ? -1 : 1);
      if (b === 2) add('branch', end, s === 'L' ? -1 : 1, [(end.x - root.x) / L, (end.y - root.y) / L]); // outermost branch end: text leaves along it (inner branch ends sit under the outer branch)
    }
    const rim = I.filter(x => x.motif === `${a}:ohex`).sort((p, q) => h(`${ART_VERSION}:rim:${p.pos}`) - h(`${ART_VERSION}:rim:${q.pos}`)).slice(0, 2);
    for (const r of rim) add('rim', r);
  }
  return out;
}

/** 1–2 contiguous real graphemes per text particle (each fragment once; never spaces) */
function fragments(S15: Snap, n: number, H: (k: string) => number) {
  const src = S15.entries.map(e => ({ e, g: graphemes(e.body).map((x, i) => ({ ...x, i })).filter(x => x.text.trim() !== '') })).filter(s => s.g.length);
  const out: { text: string; entryId: string; offset: number; count: number }[] = [];
  const used = new Set<string>();
  for (let j = 0; out.length < n && j < n * 20; j++) {
    const s = src[Math.floor(H(`fe${j}`) * src.length)]!;
    const k0 = Math.floor(H(`fo${j}`) * s.g.length);
    const two = H(`fc${j}`) < 0.4 && s.g[k0 + 1] && s.g[k0 + 1]!.i === s.g[k0]!.i + 1;
    const key = `${s.e.id}:${k0}`;
    if (used.has(key)) continue;
    used.add(key);
    out.push({ text: s.g[k0]!.text + (two ? s.g[k0 + 1]!.text : ''), entryId: s.e.id, offset: s.g[k0]!.i, count: two ? 2 : 1 });
  }
  return out;
}

export function rewardPlan(kind: 'gentle' | 'balanced', S15: Snap, w: Windows, knobs: RewardKnobs = { particle: 1, sparkle: 1 }, seed = 'v1'): RewardPlan {
  const R = REWARD[kind], Pp = PARTICLE;
  const H = (k: string) => h(`${seed}:${ART_VERSION}:${kind}:${k}`);
  const em = emitters(S15);
  const start = w.reward[0], end = w.len - 0.05;
  const nText = Math.round(R.text * knobs.particle), nFrost = Math.round(R.frost * knobs.particle);
  const frags = fragments(S15, nText, H);
  const use = new Map<number, number>();
  const pickEmitter = (id: string, kinds: Emitter['kind'][]) => {
    const r = H(`ek${id}`);
    const sh = Pp.emitterShare;
    const want: Emitter['kind'] = kinds.includes('branch') ? (r < 0.5 ? 'tip' : 'branch') : r < sh.tip ? 'tip' : r > 1 - sh.rim ? 'rim' : 'joint';
    const cand = em.map((e, i) => ({ e, i })).filter(x => x.e.kind === want);
    cand.sort((a, b) => (use.get(a.i) ?? 0) - (use.get(b.i) ?? 0) || H(`e${id}:${a.i}`) - H(`e${id}:${b.i}`));
    const c = cand[0]!;
    use.set(c.i, (use.get(c.i) ?? 0) + 1);
    return c;
  };
  const all = [...frags.map((f, j) => ({ kind: 'text' as const, j, f })), ...Array.from({ length: nFrost }, (_, j) => ({ kind: 'frost' as const, j, f: null }))];
  // interleaved birth order (text and frost mixed) spread over the emit span
  all.sort((a, b) => H(`ord${a.kind}${a.j}`) - H(`ord${b.kind}${b.j}`));
  const swirlDir = H('dir') < 0.5 ? -1 : 1; // the whole globe swirls one way
  const particles: RParticle[] = all.map(({ kind: k, j, f }, n) => {
    const id = `${k}${j}`;
    const frac = all.length > 1 ? n / (all.length - 1) : 0;
    const t0 = Math.max(start, start + Pp.emitSpan * frac + 0.08 * (H(`tj${id}`) - 0.5) * (frac > 0 && frac < 1 ? 1 : 0));
    const life = Math.min(end - t0, lerp(Pp.life[1], Pp.life[0], frac) + 0.1 * (H(`l${id}`) - 0.5));
    const { e, i } = pickEmitter(id, k === 'text' ? ['tip', 'branch'] : ['tip', 'joint', 'rim']);
    let x = e.x, y = e.y;
    if (k === 'text') { x += e.dx * Pp.textSide; y += e.dy * Pp.textSide; } // step off the glyph: past the end of the arm / branch
    const depth = k === 'text' ? 0.8 + 0.2 * H(`dp${id}`) : 0.3 + 0.7 * H(`dp${id}`);
    const shapes = ['dot', 'crystal', 'powder'] as const;
    const pal = k === 'text' ? COLORS.text : COLORS.frost;
    return {
      id, kind: k, shape: k === 'text' ? 'text' : shapes[Math.floor(H(`sh${id}`) * 3)]!, text: f?.text, entryId: f?.entryId, graphemeOffset: f?.offset, graphemeCount: f?.count,
      origin: e.kind, emitter: i, t0, life, th0: Math.atan2(y - CY, x - CX), r0: Math.hypot(x - CX, y - CY),
      dr: lerp(Pp.outward[0], Pp.outward[1], H(`dr${id}`)) * (k === 'text' ? 1.15 : 1), dir: swirlDir, swirl: R.swirl * (0.75 + 0.5 * H(`sw${id}`)) * (k === 'text' ? Pp.textSwirl : 1),
      wob: lerp(Pp.wobble[0], Pp.wobble[1], H(`wb${id}`)), wobHz: lerp(Pp.wobbleHz[0], Pp.wobbleHz[1], H(`wh${id}`)), ph: 2 * Math.PI * H(`ph${id}`),
      size: k === 'text' ? lerp(Pp.textScale[0], Pp.textScale[1], H(`sz${id}`)) : lerp(Pp.frostSize[0], Pp.frostSize[1], H(`sz${id}`)),
      rot0: (H(`r0${id}`) - 0.5) * (k === 'text' ? 0.5 : Math.PI), spin: (H(`sp${id}`) - 0.5) * (k === 'text' ? 0.4 : 1.2),
      color: pal[Math.floor(H(`c${id}`) * pal.length)]!, alphaMax: (k === 'text' ? R.textAlpha : R.frostAlpha) * (0.55 + 0.45 * depth), depth,
    };
  });
  // sparkles: accumulated rate with hashed thresholds (irregular, never a metronome)
  const sparks: RSpark[] = [];
  const rate = (e: number) => R.sparkleRate * knobs.sparkle * clamp((e - start - 0.15) / 0.4, 0, 1) * clamp((w.reward[1] + 0.2 - e) / 1.0, 0, 1);
  let acc = 0, th = 0.5 + H('th0');
  const dt = 1 / 240;
  for (let e = start; e < end - 0.3; e += dt) {
    acc += rate(e) * dt;
    if (acc < th) continue;
    acc -= th; th = 0.5 + H(`th${sparks.length + 1}`);
    const id = sparks.length;
    const body = id % Math.round(1 / PARTICLE.sparkle.bodyShare) === 2; // exactly every 5th glint is on the body (20 %)
    const dur = lerp(PARTICLE.sparkle.dur[0], PARTICLE.sparkle.dur[1], H(`sd${id}`));
    let ref = -1;
    if (body) { const ok = em.filter(x => x.kind === 'tip' || x.kind === 'joint'); ref = ok[Math.floor(H(`sg${id}`) * ok.length)]!.glyph; }
    else {
      const alive = particles.map((p, i) => ({ p, i })).filter(({ p }) => p.kind === 'frost' && e > p.t0 + 0.25 && e + dur < p.t0 + p.life - 0.2);
      if (!alive.length) continue;
      ref = alive[Math.floor(H(`sp${id}`) * alive.length)]!.i;
    }
    sparks.push({ t0: e, dur, target: body ? 'body' : 'particle', ref, size: lerp(PARTICLE.sparkle.size[0], PARTICLE.sparkle.size[1], H(`ss${id}`)), rot: H(`sr${id}`) * Math.PI });
  }
  return { kind, particles, sparks, emitters: em, start, end };
}

export type PState = { x: number; y: number; alpha: number; size: number; rot: number };
export const newPState = (): PState => ({ x: 0, y: 0, alpha: 0, size: 0, rot: 0 });
/** particle at event time e (null when not alive) */
export function particleAt(p: RParticle, e: number, out: PState): PState | null {
  const t = e - p.t0;
  if (t <= 0 || t >= p.life) return null;
  const Pp = PARTICLE;
  const th = p.th0 + p.dir * p.swirl * Pp.swirlDecay * (1 - Math.exp(-t / Pp.swirlDecay));
  const r = p.r0 + p.dr * (1 - Math.exp(-t / 0.8)) + p.wob * Math.sin(2 * Math.PI * p.wobHz * t + p.ph) - p.wob * Math.sin(p.ph);
  out.x = CX + r * Math.cos(th);
  out.y = CY + r * Math.sin(th) + 0.5 * Pp.sink * (0.6 + 0.4 * p.depth) * t * t;
  const fi = clamp(t / Pp.fadeIn, 0, 1), fo = clamp((p.life - t) / Pp.fadeOut, 0, 1);
  out.alpha = p.alphaMax * (1 - (1 - fi) ** 2) * (fo * fo * (3 - 2 * fo));
  out.size = p.size * (p.kind === 'text' ? 1 : 0.6 + 0.4 * p.depth);
  out.rot = p.rot0 + p.spin * t;
  return out;
}
export const sparkI = (s: RSpark, e: number) => { const x = (e - s.t0) / s.dur; return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) ** 2; };

/** counts / caps / ranges of a plan (sampled at 120 fps) — for tests, metrics, data-* */
export function rewardStats(pl: RewardPlan, S15: Snap) {
  const q = newPState();
  let maxText = 0, maxFrost = 0, maxAll = 0, outside = 0, samples = 0, near = 0, nearW = 0, maxSparks = 0;
  const body = instances(S15).map(x => [x.x, x.y] as const);
  for (let e = pl.start; e <= pl.end + 0.05; e += 1 / 120) {
    let t = 0, f = 0;
    for (const p of pl.particles) {
      const s = particleAt(p, e, q);
      if (!s || s.alpha < 0.01) continue;
      if (p.kind === 'text') {
        t++; nearW += s.alpha;
        let d = Infinity;
        for (const [bx, by] of body) { const dd = (bx - s.x) ** 2 + (by - s.y) ** 2; if (dd < d) d = dd; }
        if (Math.sqrt(d) < 4) near += s.alpha;
      } else f++;
      samples++;
      if (s.x < 0 || s.x > VIEW.width || s.y < 0 || s.y > VIEW.height) outside++;
    }
    maxText = Math.max(maxText, t); maxFrost = Math.max(maxFrost, f); maxAll = Math.max(maxAll, t + f);
    maxSparks = Math.max(maxSparks, pl.sparks.filter(s => sparkI(s, e) > 0).length);
  }
  const lives = pl.particles.map(p => p.life);
  const text = pl.particles.filter(p => p.kind === 'text').length;
  const span = Math.max(1e-6, pl.sparks.length ? pl.sparks[pl.sparks.length - 1]!.t0 - pl.sparks[0]!.t0 : 1);
  return {
    text, frost: pl.particles.length - text, textShare: Math.round((text / Math.max(1, pl.particles.length)) * 1000) / 1000,
    textGraphemes: pl.particles.filter(p => p.kind === 'text').map(p => p.graphemeCount ?? 0),
    maxText, maxFrost, maxAll, lifeMin: Math.min(...lives), lifeMax: Math.max(...lives),
    firstBirth: Math.min(...pl.particles.map(p => p.t0)), lastDeath: Math.max(...pl.particles.map(p => p.t0 + p.life)),
    outsideShare: samples ? outside / samples : 0, textOnBodyShare: nearW ? near / nearW : 0,
    sparks: pl.sparks.length, sparkRate: pl.sparks.length / span, sparkBodyShare: pl.sparks.filter(s => s.target === 'body').length / Math.max(1, pl.sparks.length), maxSparks,
    origins: Object.fromEntries((['tip', 'joint', 'branch', 'rim'] as const).map(o => [o, pl.particles.filter(p => p.origin === o).length])),
  };
}
