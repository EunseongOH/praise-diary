/**
 * Gate 2I — H3 Visual Refinement study. Dev-only, pure, deterministic. Adapter over Gate 2H H3 (imported, never modified):
 * shape, slots, anchor ledger, echo rules, strands (2G R2, 20 s), cold light, pulses and particles are `buildFrost('H3')`
 * verbatim. Two independent factors are added on top (2 × 2 → I0…I3):
 *   halo  — h3 (2H: r 0.8 world units, 55 % destination-out behind every glyph) · none (no eraser at all: depth order is
 *           the painter's order of the glyph's own alpha silhouette) · minimal (dev only: eraser = the glyph's exact
 *           footprint, no expansion).
 *   core  — Living Core: a symmetric subset of the inner-hex ring glyphs (the real glyphs already placed there, same slots,
 *           same text) turn around their own hex edge axis like the 2G strands (lateral R·sinθ along the edge normal,
 *           depth −Rz·(1 − cosθ)), in two phase groups A / B half a turn apart, plus a slow wave around the ring. Nucleus,
 *           rosette, spokes, ribs, micro ring and the hex vertices stay put (they hold the hexagon and the arm joints).
 *           At θ = 0 a mover sits exactly on its I0 slot; its light follows its CURRENT depth (strand rule of the theme).
 * Every number is a [연구안] starting value, not approved art. Month-specific numbers live in CORE_MOTION (December only).
 */
import { CAMERA, type Entry } from '../multiHelix/engine';
import { CX, CY } from '../fullSnowflake/engine';
import { EXT, STROKES, type Ledger } from '../livingTypography/engine';
import { restOpacity } from '../layeredCrystal/engine';
import { LOOKS, buildFrost, lightOf, newPose, poseAt, type HState, type Light, type Look, type Pose } from '../frostedLighting/engine';

export const ART_VERSION = 'h3-refinement-v0.1';
export { rotationEntries, changeEntries, newPose, exchangeEvidence, frontTimes, sampleLine, lightStats, particleAlpha, type Change, type Dataset, type Pose, type Light } from '../frostedLighting/engine';

export type IVariant = 'I0' | 'I1' | 'I2' | 'I3';
export const IVARIANTS: IVariant[] = ['I0', 'I1', 'I2', 'I3'];
export type HaloMode = 'h3' | 'none' | 'minimal';
/** h3 = Gate 2H H3 look value (read from LOOKS, not copied) · none = no eraser · minimal = exact glyph footprint, no expansion */
export const HALOS: Record<HaloMode, Look['halo']> = { h3: LOOKS.H3.halo, none: { radius: 0, cut: 0 }, minimal: { radius: 0, cut: 1 } };
export const DESIGN: Record<IVariant, { halo: HaloMode; core: boolean }> = {
  I0: { halo: 'h3', core: false }, I1: { halo: 'none', core: false }, I2: { halo: 'h3', core: true }, I3: { halo: 'none', core: true },
};

/** December Motion config for the core (shape-specific: the F2 inner hex ring). [연구안] — share / period / strength are dev controls. */
export const CORE_MOTION = {
  roiR: 24, // core ROI radius (world units) — same ROI as the Gate 2H core measurement
  ring: 'ihex', // which core stroke carries movers
  picks: { 1: [2], 2: [1, 3], 3: [1, 2, 3] } as Record<number, number[]>, // cell indices along each edge (0 / 4 = near the vertices, kept still)
  shares: [0.1, 0.2, 0.3] as const, // of the core ROI glyphs → 1 / 2 / 3 movers per edge
  R: 2.4, Rz: 4, // lateral radius / depth amplitude at strength 1
  wave: 0.5, // phase lag around the ring (turns per ring): the exchange travels around the core instead of blinking all at once
  depthSize: 0.16, squashMin: 0.5, opacityMin: 0.14, opacityGamma: 1.3, // same depth cue as the 2G strands
  samples: 72, margin: 0.3,
} as const;
export type CoreOpts = { share: number; period: number; strength: number };
export const defaultCore = (): CoreOpts => ({ share: 0.2, period: 20, strength: 1 });

export type Mover = { i: number; slot: number; edge: number; cell: number; group: 0 | 1; ox: number; oy: number; oz: number; nx: number; ny: number; R: number; Rz: number; amp: number; ph: number; size: number; rot: number; rest: number };
export type IState = HState & {
  design: IVariant; halo: HaloMode; core: CoreOpts & { on: boolean }; omegaCore: number;
  movers: Mover[]; moverOf: Int32Array; dynamic: Uint8Array; roi: number[];
};
export type IOpts = { still?: boolean; prev?: Ledger; seed?: string; halo?: HaloMode; core?: Partial<CoreOpts> & { on?: boolean } };

const topOf = (y: number, z: number, size: number) => { const k = CAMERA / (CAMERA - z); return CY + (y - CY) * k - EXT * size * k; };
const C = CORE_MOTION;

export function buildRefine(variant: IVariant, entries: Entry[], o: IOpts = {}): IState {
  const d = DESIGN[variant];
  const halo = o.halo ?? d.halo;
  const on = o.core?.on ?? d.core;
  const core = { ...defaultCore(), ...o.core, on };
  const hs = buildFrost('H3', entries, { still: o.still, prev: o.prev, seed: o.seed, look: halo === 'h3' ? {} : { halo: HALOS[halo] } });
  const rs = hs.rs, st = rs.st, S = st.geo.slots;
  const n = st.active.length;
  const roi = st.active.map((g, i) => ({ i, s: S[g.slot]! })).filter(x => x.s.core && Math.hypot(x.s.x - CX, x.s.y - CY) < C.roiR).map(x => x.i);
  const movers: Mover[] = [];
  const moverOf = new Int32Array(n).fill(-1);
  if (on && !hs.still && st.days > 0) {
    const per = Math.max(1, Math.min(3, Math.round(core.share * 10))); // 10 / 20 / 30 % → 1 / 2 / 3 movers per edge (6 / 12 / 18 of the 54 ROI glyphs at 15 days)
    const picks = C.picks[per]!;
    const idxOf = new Map(st.active.map((g, i) => [g.slot, i]));
    let ring = 0;
    for (let e = 0; e < 6; e++) {
      const sk = STROKES.find(s => s.id === `a${e}-${C.ring}`)!;
      // geometry order along the edge (independent of the dataset → same cells for every diary set)
      const cells = S.filter(s => s.stroke === sk.id).sort((p, q) => Math.hypot(p.x - sk.x0, p.y - sk.y0) - Math.hypot(q.x - sk.x0, q.y - sk.y0));
      let nx = -sk.dy, ny = sk.dx;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;
      if (nx * ((sk.x0 + sk.x1) / 2 - CX) + ny * ((sk.y0 + sk.y1) / 2 - CY) < 0) { nx = -nx; ny = -ny; } // + = outward
      for (const j of picks) {
        const s = cells[j];
        const group = (ring++ % 2) as 0 | 1;
        if (!s) continue;
        const i = idxOf.get(s.i);
        if (i == null) continue; // not grown yet
        const m: Mover = { i, slot: s.i, edge: e, cell: j, group, ox: s.x, oy: s.y, oz: s.z, nx, ny, R: C.R * core.strength, Rz: C.Rz * core.strength, amp: 1,
          ph: Math.PI * group - (2 * Math.PI * C.wave * e) / 6, size: s.size, rot: s.rot, rest: restOpacity(s) };
        // growth boundary: the whole orbit stays below the open region (else shrink, like the 2G strands)
        const top = (amp: number) => { let v = Infinity; for (let q = 0; q < C.samples; q++) { const p = orbit(m, (2 * Math.PI * q) / C.samples, amp); v = Math.min(v, topOf(p.y, p.z, m.size * p.sz)); } return v - C.margin; };
        if (top(1) < st.top) { let lo = 0, hi = 1; for (let it = 0; it < 12; it++) { const mid = (lo + hi) / 2; if (top(mid) >= st.top) lo = mid; else hi = mid; } m.amp = lo; }
        if (m.amp < 0.05) continue;
        moverOf[i] = movers.length;
        movers.push(m);
      }
    }
  }
  const dynamic = Uint8Array.from(rs.dynamic, (v, i) => (v || moverOf[i]! >= 0 ? 1 : 0));
  return { ...hs, design: variant, halo, core, omegaCore: (2 * Math.PI) / core.period, movers, moverOf, dynamic, roi };
}

function orbit(m: Mover, th: number, amp: number) {
  const c = Math.cos(th);
  const lat = m.R * Math.sin(th) * amp;
  const cc = 1 - amp * (1 - c);
  return { x: m.ox + m.nx * lat, y: m.oy + m.ny * lat, z: m.oz - m.Rz * (1 - c) * amp, c: cc, sz: 1 - (C.depthSize * (1 - cc)) / 2 };
}
export const coreTheta = (is: IState, m: Mover, t: number) => is.omegaCore * t + m.ph;

/** what the renderer draws for active glyph i at time t (core movers: own orbit; everything else: Gate 2H H3 = 2G poseAt) */
export function poseI(is: IState, i: number, t: number, out: Pose): Pose {
  const mi = is.moverOf[i]!;
  if (mi < 0) return poseAt(is.rs, i, t, out);
  const m = is.movers[mi]!;
  const p = orbit(m, coreTheta(is, m, t), m.amp);
  const f = (1 + p.c) / 2;
  const k = CAMERA / (CAMERA - p.z);
  const size = m.size * p.sz, squash = 1 - (1 - C.squashMin) * (1 - Math.abs(p.c));
  out.x = CX + (p.x - CX) * k; out.y = CY + (p.y - CY) * k; out.z = p.z; out.k = k;
  const cr = Math.cos(m.rot) * size * k, sr = Math.sin(m.rot) * size * k;
  out.a = cr; out.b = sr; out.c = -sr * squash; out.d = cr * squash;
  out.visible = true; out.level = 0;
  out.opacity = m.rest * (C.opacityMin + (1 - C.opacityMin) * Math.pow(f, C.opacityGamma));
  out.spark = Math.pow(f, 3);
  return out;
}

/** light: core movers follow their current depth with the theme's strand rule; everything else = Gate 2H lightOf */
export function lightI(is: IState, i: number, t: number, f: Pose, out: Light): Light {
  if (is.moverOf[i]! < 0) return lightOf(is, i, t, f, out);
  const T = is.theme.lighting;
  out.tier = 0;
  out.L = T.strand.min + (1 - T.strand.min) * Math.pow(Math.cbrt(f.spark), T.strand.gamma);
  if (out.L >= T.frontGlow.from) out.tier = 1;
  return out;
}

// ───────────────────────────── evidence & metrics (automatic; NOT an aesthetic verdict) ─────────────────────────────

const r2 = (v: number) => Math.round(v * 100) / 100;
/** per phase group: mean depth, projected centroid, bbox, opacity, light, and the provenance keys (entry:grapheme:copy) */
export function coreSample(is: IState, t: number) {
  const pose = newPose();
  const light: Light = { L: 0, tier: 0 };
  const groups = [0, 1].map(gq => {
    const ms = is.movers.filter(m => m.group === gq);
    let z = 0, cx = 0, cy = 0, op = 0, L = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const m of ms) {
      const f = poseI(is, m.i, t, pose);
      z += f.z; cx += f.x; cy += f.y; op += f.opacity; L += lightI(is, m.i, t, f, light).L;
      const r = Math.hypot(f.a, f.b) * 4;
      x0 = Math.min(x0, f.x - r); y0 = Math.min(y0, f.y - r); x1 = Math.max(x1, f.x + r); y1 = Math.max(y1, f.y + r);
    }
    const dd = Math.max(1, ms.length);
    return { group: gq ? 'B' : 'A', n: ms.length, zMean: r2(z / dd), cx: r2(cx / dd), cy: r2(cy / dd), opacityMean: r2(op / dd), lightMean: r2(L / dd),
      bbox: ms.length ? [r2(x0), r2(y0), r2(x1), r2(y1)] : [0, 0, 0, 0], sources: ms.map(m => is.rs.st.active[m.i]!.key) };
  });
  const [A, B] = groups as [typeof groups[0], typeof groups[0]];
  const front = A.n && B.n ? (A.zMean > B.zMean + 0.05 ? 'A' : B.zMean > A.zMean + 0.05 ? 'B' : '') : '';
  // front set = movers that are in front right now (frontness ≥ 0.8) → their provenance keys
  const frontKeys = is.movers.filter(m => { const f = poseI(is, m.i, t, pose); return (1 + Math.cos(coreTheta(is, m, t))) / 2 >= 0.8 && f.visible; }).map(m => is.rs.st.active[m.i]!.key);
  return { t, groups, front, frontKeys };
}

/** Does the core really change who is in front, by moving real glyphs in depth (not an alpha blink)? */
export function coreEvidence(is: IState, times: number[]) {
  const pose = newPose();
  const samples = times.map(t => coreSample(is, t));
  const fronts = samples.map(s => s.front);
  const distinct = [...new Set(fronts.filter(Boolean))];
  const per = is.movers.map(m => {
    const ps = times.map(t => { const f = poseI(is, m.i, t, pose); return { x: f.x, y: f.y, z: f.z, w: Math.hypot(f.a, f.b), op: f.opacity }; });
    const rg = (v: number[]) => Math.max(...v) - Math.min(...v);
    return { key: is.rs.st.active[m.i]!.key, edge: m.edge, group: m.group, zRange: r2(rg(ps.map(p => p.z))), move: r2(Math.max(...ps.map(p => Math.hypot(p.x - ps[0]!.x, p.y - ps[0]!.y)))), sizeRange: r2(rg(ps.map(p => p.w)) * 100) / 100, opRange: r2(rg(ps.map(p => p.op))) };
  });
  const handover = samples.some(s => { const [A, B] = s.groups; return !!A && !!B && Math.abs(A.zMean - B.zMean) > 1 && Math.abs(A.lightMean - B.lightMean) > 0.25 && (A.zMean > B.zMean) === (A.lightMean > B.lightMean); });
  const keySets = samples.map(s => s.frontKeys.join(','));
  const passes = is.movers.length > 0 && distinct.length >= 2 && handover && per.every(p => p.zRange >= 2 && p.move >= 1) && new Set(keySets).size >= 2;
  return { movers: is.movers.length, roi: is.roi.length, share: r2(is.movers.length / Math.max(1, is.roi.length)), fronts, distinct, handover, frontKeySets: new Set(keySets).size, per, passes, samples };
}

/** projected crowding of the core ROI: glyph pairs whose centres come closer than `gap` projected units (min / mean over time) */
export function coreCrowding(is: IState, times: number[], gap = 3.2) {
  const ps = is.roi.map(newPose);
  const counts = times.map(t => {
    is.roi.forEach((i, k) => poseI(is, i, t, ps[k]!));
    let c = 0;
    for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) if (Math.hypot(ps[a]!.x - ps[b]!.x, ps[a]!.y - ps[b]!.y) < gap) c++;
    return c;
  });
  return { min: Math.min(...counts), max: Math.max(...counts), mean: r2(counts.reduce((a, b) => a + b, 0) / counts.length) };
}
