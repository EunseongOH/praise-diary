/**
 * Gate 2D — sculptural snowflake study (docs/spec/24 v1.7). Dev-only, pure, deterministic.
 *
 * Keeps the Gate 2C G2 data model (anchor strands + reserved-future ledger + density-adaptive echo of real phrases, every
 * glyph traceable to entryId + grapheme range + copyIndex) and only changes WHERE those glyphs sit in 3D:
 *   D0 = Gate 2C G2 as is (42 Gate 2B axes, constant radius; ported allocation, tested identical to adaptiveSnowflake).
 *   D1 = D0 text model + a small hexagonal core made of text tracks (hex ring edges + spokes) + twig roots joined to arms.
 *   D2 = D1 + variable-radius r(s) helices: 2–3 strands per arm / 1–2 per twig with their own r(s), phase, pitch, depth.
 *   (D3 = D2 geometry with the C2 depth-light shimmer — a renderer/brightness change only, see c2Gain.)
 * D1/D2 keep the drawn glyph total equal to D0 for the same input (fill='equal': echo is spread over the larger
 * capacity instead of adding instances); fill='full' is a labelled extra that fills up to the safety cap.
 *
 * Helix of track t (axis low point L, unit up v with v.y < 0, unit right R, pitch p, radius r(s), depth offset zc(s)):
 *   W(s, θ) = L + s·v + r(s)·sinθ·R,   z = zc(s) + r(s)·cosθ,   θ = phase − s/p − angle(t)
 *   screen  = C + (W − C)·k − v·z·TILT,   k = CAMERA / (CAMERA − z)        (= Gate 2B for r const, zc = 0)
 * Arc length a along the helix: da/ds = hypot(r(s), p)/p (table), so glyph spacing stays one advance on any r(s).
 *
 * First-day seed (spec 24 §4): S0 = as is. S1 = same linear 1/15 growth, plus short tip cross-bars on all six arms that
 * fit inside the Gate 2B bottom band. S2 = research-only non-linear reveal (NOT a product policy; user approval needed).
 * All numbers are [연구안] starting values, not approved art.
 */
import { graphemes } from '../../engine';
import { CAMERA, CULL, FADE_FULL, TILT, type Entry, type StaticGlyph } from '../multiHelix/engine';
import { CX, CY, EXTENT, GEOMETRY, TARGET_DAYS, TRACKS as G2B_TRACKS, Y_BOTTOM, Y_TOP, revealTop as linearTop, type Offset, ZERO } from '../fullSnowflake/engine';
import { ART_VERSION as ADAPTIVE_VERSION, CENTER_R, GLYPH_CAP, TWIG_ROOT_SKIP, adaptiveEntries, anchorRange, distinctDays, echoUnits, phrases, type Dataset, type Unit } from '../adaptiveSnowflake/engine';

export const ART_VERSION = 'sculptural-snowflake-v1.7';
export type Layout = 'D0' | 'D1' | 'D2';
export type Seed = 'S0' | 'S1' | 'S2';
export type Fill = 'equal' | 'full';
export { adaptiveEntries as sculptEntries, distinctDays, type Dataset };

const RAD = Math.PI / 180;
const ADVANCE = 8; // = Gate 2B/2C
const SPACE = 4;
const GAP = 6;
const MIN_PIECE = 3;
const TWIG_PENALTY = 24;
const BAND = 24;
const READ_PENALTY = 16;
const CENTER_PENALTY = 40;
const SAME_TRACK_BONUS = 6;

// ───────────────────────────── research geometry values ─────────────────────────────

/** [연구안] D1/D2 core + junction values. */
export const CORE = {
  hex: 34, // hex ring circumradius = where the six arms start (arms were 14 → 130 in Gate 2B)
  trim: 0.13, // ring edge kept between these fractions of the vertex-to-vertex chord (leaves room for the arm helix)
  spoke: [8, 27] as const, // spokes (centre → ring) radial extent; r < 7 stays a small negative space
  inner: 19, // inner hex ring circumradius (rotated 30°)
  tube: 1.4, rise: 60, // thin, very steep helices: the text runs ALONG the edge like a line and rolls about it
  twigStart: 7, // twig helix starts this far from its arm axis point (Gate 2B 11) → twig roots touch the arm
} as const;

/** [연구안] S1 tip cross-bar: inside the Gate 2B bottom band, so day 1 keeps exactly the 1/15 height. */
export const SEED = { at: 128.6, from: 7.5, to: 27, drop: 0.8, tube: 1.0, rise: 12 } as const; // double strand (opposite phases) per side

/** [연구안] S2 non-linear reveal fraction f(U) = 1 − (1 − U/15)^p (research comparison only, never product policy). */
export const S2_POWER = 2;
export const revealFraction = (seed: Seed, days: number) => {
  const u = Math.min(Math.max(days, 0), TARGET_DAYS) / TARGET_DAYS;
  return seed === 'S2' ? 1 - (1 - u) ** S2_POWER : u;
};
export const revealTopFor = (seed: Seed, days: number) => seed === 'S2' ? Y_BOTTOM - (Y_BOTTOM - Y_TOP) * revealFraction(seed, days) : linearTop(days);

// ───────────────────────────── tracks ─────────────────────────────

export type Kind = 'arm' | 'twig' | 'core' | 'seed';
export type STrack = {
  index: number; id: string; kind: Kind; arm: number; level: number; layer: number;
  lx: number; ly: number; vx: number; vy: number; rx: number; ry: number; len: number;
  pitch: number; phase: number;
  innerLow: boolean; // the low end (larger y) is the end closer to the flake centre
  rOf: (w: number) => number; zOf: (w: number) => number; // w = 0 at the inner end, 1 at the outer end
  arc0: number; // > 0: constant radius (exact Gate 2B math); 0: tabulated a(s)
  aTab: Float64Array; ds: number; aMax: number;
  radius: number; // nominal (max) radius, for debug
  flip: boolean; // steep track whose front-facing glyph x-axis would point left: glyphs turned 180° in their own
  // surface plane and the text laid bottom-up, so it still reads left→right and is never upside down
};

function h(text: string): number {
  let x = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 0x01000193);
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}

const smoothBump = (w: number, c: number, half: number) => { const x = Math.min(1, Math.abs(w - c) / half); return 0.5 + 0.5 * Math.cos(Math.PI * x); }; // C¹, 1 at c, 0 beyond ±half

type Spec = { gate2b?: boolean; id: string; kind: Kind; arm: number; level: number; layer: number; ax: number; ay: number; bx: number; by: number; rise: number; r: number | ((w: number) => number); z?: (w: number) => number; phase?: number };

function makeTrack(index: number, s: Spec): STrack {
  const [lx, ly, hx, hy] = s.ay >= s.by ? [s.ax, s.ay, s.bx, s.by] : [s.bx, s.by, s.ax, s.ay];
  const len = Math.hypot(hx - lx, hy - ly);
  const vx = (hx - lx) / len;
  const vy = (hy - ly) / len;
  const pitch = s.rise / (2 * Math.PI);
  const innerLow = Math.hypot(lx - CX, ly - CY) <= Math.hypot(hx - CX, hy - CY);
  const rOf = typeof s.r === 'number' ? (() => s.r as number) : s.r;
  const zOf = s.z ?? (() => 0);
  const N = 240;
  const ds = len / N;
  const aTab = new Float64Array(N + 1);
  const wAt = (sv: number) => (innerLow ? sv / len : 1 - sv / len);
  for (let i = 1; i <= N; i++) {
    const r0 = rOf(wAt((i - 1) * ds));
    const r1 = rOf(wAt(i * ds));
    aTab[i] = aTab[i - 1]! + ds * (Math.hypot(r0, pitch) + Math.hypot(r1, pitch)) / (2 * pitch);
  }
  const arc0 = typeof s.r === 'number' && !s.z ? Math.hypot(s.r, pitch) : 0;
  let radius = 0;
  for (let i = 0; i <= 20; i++) radius = Math.max(radius, rOf(i / 20));
  return {
    index, id: s.id, kind: s.kind, arm: s.arm, level: s.level, layer: s.layer, lx, ly, vx, vy, rx: -vy, ry: vx, len, pitch,
    phase: s.phase ?? h(`${ART_VERSION}:${s.id}:phase`) * 2 * Math.PI, innerLow, rOf, zOf, arc0, aTab, ds,
    aMax: arc0 ? (len / pitch) * arc0 : aTab[N]!, radius,
    flip: !s.gate2b && rOf(0.5) * -vy - pitch * vx < 0, // front x-axis = r·R.x − p·v.x points left (Gate 2B tracks never flip)
  };
}

export const sOfA = (t: STrack, a: number) => {
  if (t.arc0) return (t.pitch * a) / t.arc0;
  const T = t.aTab;
  let lo = 0;
  let hi = T.length - 1;
  if (a <= 0) return a * t.pitch / Math.hypot(t.rOf(t.innerLow ? 0 : 1), t.pitch);
  if (a >= T[hi]!) return t.len;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m]! <= a) lo = m; else hi = m; }
  return (lo + (a - T[lo]!) / (T[hi]! - T[lo]!)) * t.ds;
};
export const aOfS = (t: STrack, s: number) => {
  if (t.arc0) return (s * t.arc0) / t.pitch;
  const i = Math.min(t.aTab.length - 2, Math.max(0, Math.floor(s / t.ds)));
  return t.aTab[i]! + (s / t.ds - i) * (t.aTab[i + 1]! - t.aTab[i]!);
};
export const wOfS = (t: STrack, s: number) => Math.min(1, Math.max(0, t.innerLow ? s / t.len : 1 - s / t.len));
export const radiusAt = (t: STrack, s: number) => t.rOf(wOfS(t, s));
export const depthAt = (t: STrack, s: number) => t.zOf(wOfS(t, s));
/** world distance of the axis point at s from the flake centre */
export const axisR = (t: STrack, s: number) => Math.hypot(t.lx + s * t.vx - CX, t.ly + s * t.vy - CY);

const SAMPLES = Array.from({ length: 49 }, (_, i) => -Math.acos(CULL) + (2 * Math.acos(CULL) * i) / 48);

/** Screen-y extremes of a glyph box at axial position s over every drawn angle (cos θ ≥ CULL). Same math as Gate 2B. */
function yRange(t: STrack, s: number): [number, number] {
  const r = t.arc0 ? t.rOf(0) : radiusAt(t, s);
  const zc = t.arc0 ? 0 : depthAt(t, s);
  let lo = Infinity;
  let hi = -Infinity;
  for (const th of SAMPLES) {
    const z = zc + r * Math.cos(th);
    const k = CAMERA / (CAMERA - z);
    const wy = t.ly + s * t.vy + r * Math.sin(th) * t.ry;
    const y = CY + (wy - CY) * k - t.vy * z * TILT;
    lo = Math.min(lo, y - EXTENT * k);
    hi = Math.max(hi, y + EXTENT * k);
  }
  return [lo, hi];
}
export const topAt = (t: STrack, a: number) => yRange(t, sOfA(t, a))[0];
export const bottomAt = (t: STrack, a: number) => yRange(t, sOfA(t, a))[1];

// ───────────────────────────── geometries ─────────────────────────────

function gate2bTracks(): STrack[] {
  return G2B_TRACKS.map(t => makeTrack(t.index, {
    gate2b: true, id: t.id, kind: t.kind, arm: t.arm, level: t.level, layer: 0, ax: t.lx, ay: t.ly, bx: t.lx + t.vx * t.len, by: t.ly + t.vy * t.len,
    rise: t.pitch * 2 * Math.PI, r: t.radius, phase: t.phase,
  }));
}

/** six arms + 36 twigs with the Gate 2B directions; per-layer radius/depth profiles for D1/D2 */
function sculptTracks(layout: 'D1' | 'D2', seed: Seed): STrack[] {
  const A = GEOMETRY.arm;
  const T = GEOMETRY.twig;
  const specs: Spec[] = [];
  const u = (deg: number) => [Math.cos(deg * RAD), Math.sin(deg * RAD)] as const;
  for (let arm = 0; arm < 6; arm++) {
    const phi = -90 + 60 * arm;
    const [ux, uy] = u(phi);
    // arm strand over a part [w0, w1] of the arm (0 = hex core vertex, 1 = tip); r/z profiles use the strand's own w
    const armSeg = (id: string, layer: number, w0: number, w1: number, rise: number, r: Spec['r'], z?: Spec['z'], phase?: number) => {
      const R0 = CORE.hex + (A.outer - CORE.hex) * w0;
      const R1 = CORE.hex + (A.outer - CORE.hex) * w1;
      specs.push({ id, kind: 'arm', arm, level: -1, layer, ax: CX + ux * R0, ay: CY + uy * R0, bx: CX + ux * R1, by: CY + uy * R1, rise, r, z, phase });
    };
    const base = h(`${ART_VERSION}:a${arm}:phase`) * 2 * Math.PI;
    if (layout === 'D1') armSeg(`a${arm}`, 0, 0, 1, A.rise, A.radius);
    else {
      // L0: whole arm, swells in the middle and tapers to the tip. L1: opposite phase, same pitch (a double helix) over the
      // inner two thirds, thick at the core joint and thin where it ends, so the pair visibly crosses and separates.
      // L2: thin, steeper strand on the outer half, slightly in front — the tip gets a different, finer texture.
      armSeg(`a${arm}`, 0, 0, 1, A.rise, w => 4.4 + 3.0 * smoothBump(w, 0.45, 0.45) - 1.6 * w * w, w => 1.4 * Math.sin(Math.PI * w) ** 2, base);
      armSeg(`a${arm}.1`, 1, 0, 0.64, A.rise, w => 2.6 + 5.2 * smoothBump(w, 0.12, 0.5) + 1.6 * smoothBump(w, 0.78, 0.3), w => -1.6 * Math.sin(Math.PI * w) ** 2, base + Math.PI);
      armSeg(`a${arm}.2`, 2, 0.46, 0.97, 14, w => 1.5 + 1.1 * smoothBump(w, 0.4, 0.45), w => 2.2 * Math.sin(Math.PI * w) ** 2, base + Math.PI / 2);
    }
    T.roots.forEach((root, level) => {
      for (const side of [-1, 1] as const) {
        const [wx, wy] = u(phi + side * T.spread);
        const rx = CX + ux * root;
        const ry = CY + uy * root;
        const len = T.lengths[level]!;
        const id = `a${arm}-t${level}${side < 0 ? 'L' : 'R'}`;
        const seg = (sid: string, layer: number, to: number, rise: number, r: Spec['r'], z?: Spec['z'], phase?: number) =>
          specs.push({ id: sid, kind: 'twig', arm, level, layer, ax: rx + wx * CORE.twigStart, ay: ry + wy * CORE.twigStart, bx: rx + wx * to, by: ry + wy * to, rise, r, z, phase });
        if (layout === 'D1') seg(id, 0, len, T.rise, T.radius);
        else {
          const tb = h(`${ART_VERSION}:${id}:phase`) * 2 * Math.PI;
          seg(id, 0, len, T.rise, w => 4.6 - 2.0 * w + 0.6 * smoothBump(w, 0.3, 0.3), w => 1.0 * Math.sin(Math.PI * w), tb);
          if (level === 0) seg(`${id}.1`, 1, CORE.twigStart + (len - CORE.twigStart) * 0.7, 12, w => 1.6 + 1.6 * smoothBump(w, 0.4, 0.5), w => -1.2 * Math.sin(Math.PI * w), tb + Math.PI);
        }
      }
    });
  }
  // hexagonal core of real text tracks (no drawn outline): each ring edge is a thin DOUBLE helix (opposite phases), so at
  // any angle one of the two faces the viewer and the edge reads as a continuous line of glyphs; six thin spokes join
  // the centre to the ring; r < CORE.spoke[0] stays a small negative space.
  for (let k = 0; k < 6; k++) {
    const [ax, ay] = u(-90 + 60 * k);
    const [bx, by] = u(-90 + 60 * (k + 1));
    const p = (f: number) => [CX + CORE.hex * (ax + (bx - ax) * f), CY + CORE.hex * (ay + (by - ay) * f)] as const;
    const [x0, y0] = p(CORE.trim);
    const [x1, y1] = p(1 - CORE.trim);
    const cb = h(`${ART_VERSION}:c${k}:phase`) * 2 * Math.PI;
    const ring = layout === 'D2' ? (w: number) => 1.2 + 1.4 * Math.sin(Math.PI * w) : CORE.tube;
    for (const layer of [0, 1]) specs.push({ id: layer ? `c${k}.1` : `c${k}`, kind: 'core', arm: k, level: 0, layer, ax: x0, ay: y0, bx: x1, by: y1, rise: CORE.rise, r: ring,
      z: layout === 'D2' ? (w: number) => (layer ? -1 : 1) * 1.2 * Math.sin(Math.PI * w) : undefined, phase: cb + layer * Math.PI });
    for (const layer of [0, 1]) specs.push({ id: `c${k}s${layer ? '.1' : ''}`, kind: 'core', arm: k, level: 1, layer, ax: CX + ax * CORE.spoke[0], ay: CY + ay * CORE.spoke[0], bx: CX + ax * CORE.spoke[1], by: CY + ay * CORE.spoke[1],
      rise: CORE.rise, r: layout === 'D2' ? (w: number) => 1.0 + 1.0 * w : CORE.tube, phase: cb + 0.7 + layer * Math.PI });
    // inner ring (rotated 30°: its vertices sit between the spokes) — a second, smaller hexagon
    const [ix, iy] = u(-60 + 60 * k);
    const [jx, jy] = u(-60 + 60 * (k + 1));
    const q = (f: number) => [CX + CORE.inner * (ix + (jx - ix) * f), CY + CORE.inner * (iy + (jy - iy) * f)] as const;
    const [i0, j0] = q(0.08);
    const [i1, j1] = q(0.92);
    for (const layer of [0, 1]) specs.push({ id: `c${k}i${layer ? '.1' : ''}`, kind: 'core', arm: k, level: 2, layer, ax: i0, ay: j0, bx: i1, by: j1, rise: CORE.rise, r: CORE.tube, phase: cb + 1.9 + layer * Math.PI });
  }
  if (seed === 'S1') specs.push(...seedSpecs());
  return specs.map((s, i) => makeTrack(i, s));
}

/** S1: a short cross-bar at every arm tip (6-fold), entirely inside the Gate 2B bottom band on the lower arm. */
function seedSpecs(): Spec[] {
  const out: Spec[] = [];
  for (let arm = 0; arm < 6; arm++) {
    const phi = (-90 + 60 * arm) * RAD;
    const ux = Math.cos(phi);
    const uy = Math.sin(phi);
    for (const side of [-1, 1] as const) {
      const px = -uy * side; // perpendicular
      const py = ux * side;
      const at = (d: number, drop: number) => [CX + ux * (SEED.at + drop) + px * d, CY + uy * (SEED.at + drop) + py * d] as const;
      const [x0, y0] = at(SEED.from, 0);
      const [x1, y1] = at(SEED.to, SEED.drop);
      const ph = h(`${ART_VERSION}:a${arm}-x${side}:phase`) * 2 * Math.PI;
      for (const layer of [0, 1]) out.push({ id: `a${arm}-x${side < 0 ? 'L' : 'R'}${layer ? '.1' : ''}`, kind: 'seed', arm, level: 3, layer, ax: x0, ay: y0, bx: x1, by: y1, rise: SEED.rise, r: SEED.tube, phase: ph + layer * Math.PI });
    }
  }
  return out;
}

export type Geo = {
  layout: Layout; seed: Seed; tracks: STrack[];
  top: (days: number) => number;
  centreR: number; twigSkip: number; // D0 keeps Gate 2C's echo exclusions
  echoOrder: STrack[];
  openCache: Map<string, number>;
};

const geoCache = new Map<string, Geo>();
export function geometry(layout: Layout, seed: Seed = 'S0'): Geo {
  const key = `${layout}:${seed}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  let tracks = layout === 'D0' ? gate2bTracks() : sculptTracks(layout, seed);
  if (layout === 'D0' && seed === 'S1') tracks = [...tracks, ...seedSpecs().map((s, i) => makeTrack(tracks.length + i, s))];
  const rank = (t: STrack) => t.kind === 'arm' ? 9 + t.layer * 0.1 : t.kind === 'core' ? 10 : t.kind === 'seed' ? -1 : 2 - t.level + t.layer * 0.1;
  const geo: Geo = {
    layout, seed, tracks, top: d => revealTopFor(seed, d),
    centreR: layout === 'D0' ? CENTER_R : 0, twigSkip: layout === 'D0' ? TWIG_ROOT_SKIP : 0,
    echoOrder: layout === 'D0' && seed === 'S0'
      ? [...tracks].sort((a, b) => (a.kind === 'arm' ? 9 : 2 - a.level) - (b.kind === 'arm' ? 9 : 2 - b.level) || a.arm - b.arm || a.index - b.index) // = Gate 2C
      : [...tracks].sort((a, b) => rank(a) - rank(b) || a.arm - b.arm || a.index - b.index),
    openCache: new Map(),
  };
  geoCache.set(key, geo);
  return geo;
}

/** Largest arc on the track whose glyph is fully inside the region opened by `days` (-1 = none). */
export function openArc(G: Geo, t: STrack, days: number): number {
  const key = `${t.index}:${days}`;
  const hit = G.openCache.get(key);
  if (hit !== undefined) return hit;
  const top = G.top(days);
  let res: number;
  if (topAt(t, 0) < top) res = -1;
  else if (topAt(t, t.aMax) >= top) res = t.aMax;
  else {
    let lo = 0;
    let hi = t.aMax;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (topAt(t, mid) >= top) lo = mid; else hi = mid; }
    res = lo;
  }
  G.openCache.set(key, res);
  return res;
}

// ───────────────────────────── allocation (port of Gate 2C, parametrised by geometry) ─────────────────────────────

const advanceOf = (g: string) => (g === ' ' ? SPACE : ADVANCE);
const sAt = sOfA;
const rAt = (t: STrack, a: number) => axisR(t, sAt(t, a));
type Chars = { text: string; offset: number }[];
const visibleIn = (c: Chars, a: number, b: number) => { let n = 0; for (let i = a; i < b; i++) if (c[i]!.text !== ' ') n++; return n; };
const advIn = (c: Chars, a: number, b: number) => { let s = 0; for (let i = a; i < b; i++) s += advanceOf(c[i]!.text); return s; };
const innerIsLow = (t: STrack) => rAt(t, 0) < rAt(t, t.aMax);

function echoZone(G: Geo, t: STrack): [number, number] {
  if (t.kind === 'core' || t.kind === 'seed') return [0, t.aMax];
  const skipS = t.kind === 'arm' ? Math.max(0, G.centreR - GEOMETRY.arm.inner) : G.twigSkip;
  if (!skipS) return [0, t.aMax];
  const skip = aOfS(t, skipS);
  return innerIsLow(t) ? [skip, t.aMax] : [0, t.aMax - skip];
}

function penalty(G: Geo, t: STrack, aLo: number, aHi: number) {
  let p = (t.kind === 'twig' ? TWIG_PENALTY : 0) + READ_PENALTY * (1 - Math.abs(t.vy)) + t.layer * 30 + (t.kind === 'core' ? 60 : 0);
  if (t.kind === 'arm' && G.centreR && Math.min(rAt(t, aLo), rAt(t, aHi)) < G.centreR) p += CENTER_PENALTY;
  return p;
}

type Interval = [number, number];
function freeGaps(used: Interval[], lo: number, hi: number): Interval[] {
  const gaps: Interval[] = [];
  let a = 0;
  for (const [l, hh] of [...used].sort((x, y) => x[0] - y[0])) { gaps.push([a, l - GAP]); a = Math.max(a, hh + GAP); }
  gaps.push([a, Infinity]);
  return gaps.map(([x, y]): Interval => [Math.max(x, lo), Math.min(y, hi)]).filter(([x, y]) => y - x >= ADVANCE - 1e-6);
}

function fit(c: Chars, i: number, end: number, room: number): { n: number; adv: number } {
  let adv = 0;
  let n = 0;
  while (i + n < end && adv + advanceOf(c[i + n]!.text) <= room + 1e-6) adv += advanceOf(c[i + n++]!.text);
  if (i + n < end) {
    let cut = n;
    while (cut > 0 && c[i + cut]?.text !== ' ' && c[i + cut - 1]?.text !== ' ') cut--;
    if (cut > 0 && visibleIn(c, i, i + cut) >= MIN_PIECE) { n = cut; adv = advIn(c, i, i + n); }
  }
  while (n > 0 && c[i + n - 1]!.text === ' ') adv -= advanceOf(c[i + --n]!.text);
  return { n, adv };
}

export type APiece = { track: number; aLo: number; aHi: number; from: number; to: number; future: boolean };
export type ARecord = { entryId: string; body: string; day: number; range: [number, number]; pieces: APiece[]; unplaced: number };
export type Ledger = Map<string, ARecord>;
const byWriting = (a: Entry, b: Entry) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

function futureLo(G: Geo, t: STrack, day: number) {
  if (day >= TARGET_DAYS) return 0;
  return Math.max(0, openArc(G, t, day + 1 < TARGET_DAYS ? day + 1 : day));
}

function placeVisible(G: Geo, c: Chars, i: number, end: number, day: number, used: (ti: number) => Interval[]): APiece | null {
  const cands: { track: number; aHi: number; adv: number; n: number; y: number; use: number }[] = [];
  for (const t of G.tracks) {
    const open = openArc(G, t, day);
    if (open < ADVANCE / 2) continue;
    const u = used(t.index);
    const use = u.reduce((s, [l, hh]) => s + hh - l, 0) / t.aMax;
    for (const [gLo, gHi] of freeGaps(u, 0, open + ADVANCE / 2)) {
      const f = fit(c, i, end, gHi - gLo);
      if (visibleIn(c, i, i + f.n) < 1) continue;
      const aHi = gHi - gLo - f.adv < MIN_PIECE * ADVANCE + GAP ? gLo + f.adv : gHi;
      cands.push({ track: t.index, aHi, ...f, use, y: t.ly + sAt(t, gHi) * t.vy + penalty(G, t, aHi - f.adv, aHi) });
    }
  }
  if (!cands.length) return null;
  const yBest = Math.min(...cands.map(x => x.y));
  const b = cands.filter(x => x.y <= yBest + BAND).sort((p, q) => p.use - q.use || p.y - q.y || p.track - q.track)[0]!;
  return { track: b.track, aLo: b.aHi - b.adv, aHi: b.aHi, from: i, to: i + b.n, future: false };
}

function placeFuture(G: Geo, c: Chars, i: number, end: number, day: number, used: (ti: number) => Interval[], prevTrack: number, lowFor: (t: STrack) => number): APiece | null {
  let best: { track: number; aLo: number; adv: number; n: number; score: number } | null = null;
  const left = visibleIn(c, i, end);
  for (const t of G.tracks) {
    for (const [gLo, gHi] of freeGaps(used(t.index), lowFor(t), t.aMax)) {
      const f = fit(c, i, end, gHi - gLo);
      if (visibleIn(c, i, i + f.n) < Math.min(MIN_PIECE, left)) continue;
      const score = -topAt(t, gLo + ADVANCE / 2) + penalty(G, t, gLo, gLo + f.adv) - (t.index === prevTrack ? SAME_TRACK_BONUS : 0);
      if (!best || score < best.score - 1e-9) best = { track: t.index, aLo: gLo, ...f, score };
    }
  }
  return best && { track: best.track, aLo: best.aLo, aHi: best.aLo + best.adv, from: i, to: i + best.n, future: topAt(G.tracks[best.track]!, best.aLo + ADVANCE / 2) < G.top(day) };
}

const skipSpace = (c: Chars, i: number, end: number) => { while (i < end && c[i]!.text === ' ') i++; return i; };
function reflow(c: Chars, i: number, end: number, pieces: APiece[]): number {
  for (const p of pieces) {
    i = skipSpace(c, i, end);
    const f = fit(c, i, end, p.aHi - p.aLo);
    p.from = i;
    p.to = i + f.n;
    i += f.n;
  }
  return skipSpace(c, i, end);
}

/** Gate 2C append-only anchor ledger on any geometry (identical decisions on D0 — tested). */
export function allocateAnchors(G: Geo, entries: Entry[], prev?: Ledger): Ledger {
  const ledger: Ledger = new Map();
  const present = new Set(entries.map(e => e.id));
  for (const [id, r] of prev ?? []) if (present.has(id)) ledger.set(id, r);
  const used = (ti: number): Interval[] => { const out: Interval[] = []; for (const r of ledger.values()) for (const p of r.pieces) if (p.track === ti) out.push([p.aLo, p.aHi]); return out; };
  const seen: string[] = [];
  const now = distinctDays(entries);
  for (const e of [...entries].sort(byWriting)) {
    if (!seen.includes(e.entryDate)) seen.push(e.entryDate);
    const old = ledger.get(e.id);
    if (old && old.body === e.body) continue;
    const c = graphemes(e.body);
    const range = anchorRange(phrases(e.body));
    const rec: ARecord = old
      ? { ...old, body: e.body, range, pieces: old.pieces.map(p => ({ ...p })), unplaced: 0 }
      : { entryId: e.id, body: e.body, day: seen.length, range, pieces: [], unplaced: 0 };
    ledger.set(e.id, rec);
    let i = old ? reflow(c, range[0], range[1], rec.pieces) : skipSpace(c, range[0], range[1]);
    const day = old ? now : rec.day;
    if (!old && i < range[1]) {
      const p = placeVisible(G, c, i, range[1], day, used);
      if (p) { rec.pieces.push(p); i = skipSpace(c, p.to, range[1]); }
    }
    const lowFor = rec.pieces.length ? (t: STrack) => futureLo(G, t, day) : (t: STrack) => Math.max(0, openArc(G, t, day));
    while (i < range[1]) {
      const p = placeFuture(G, c, i, range[1], day, used, rec.pieces.at(-1)?.track ?? -1, lowFor) ?? placeFuture(G, c, i, range[1], day, used, rec.pieces.at(-1)?.track ?? -1, () => 0);
      if (!p) break;
      rec.pieces.push(p);
      i = skipSpace(c, p.to, range[1]);
    }
    rec.unplaced = visibleIn(c, i, range[1]);
  }
  return ledger;
}

export type EPiece = { entryId: string; unit: string; track: number; aLo: number; aHi: number; from: number; to: number; copyIndex: number; slot: string };

type Src = { id: string; c: Chars; ph: Unit[] };
/**
 * Gate 2C density-adaptive echo on any geometry. `rho` < 1 spreads the same amount of text over a larger capacity:
 * after each phrase the cursor also skips (1/rho − 1)·(phrase + gap) of arc (empty helix between phrases), so D1/D2
 * keep D0's glyph total instead of adding instances. rho = 1 is exactly Gate 2C.
 */
type SlotOrder = { e: Src; units: () => Unit[] }[];
function echoPass(G: Geo, src: Src[], ledger: Ledger, days: number, anchorsShown: number, cap: number, rho: number, orderMemo: Map<string, SlotOrder> = new Map()): EPiece[] {
  type Cursor = { t: STrack; gaps: Interval[]; g: number; pos: number; outerHigh: boolean; last: string; debt: number };
  const cursors: Cursor[] = [];
  for (const t of G.echoOrder) {
    const open = openArc(G, t, days);
    if (open < ADVANCE / 2) continue;
    const [zLo, zHi] = echoZone(G, t);
    const anchors: Interval[] = [];
    for (const r of ledger.values()) for (const p of r.pieces) if (p.track === t.index) anchors.push([p.aLo, p.aHi]);
    const outerHigh = innerIsLow(t);
    const gaps = freeGaps(anchors, zLo, Math.min(zHi, open + ADVANCE / 2));
    if (outerHigh) gaps.reverse();
    if (gaps.length) cursors.push({ t, gaps, g: 0, pos: outerHigh ? gaps[0]![1] : gaps[0]![0], outerHigh, last: '', debt: 0 });
  }
  const version = G.layout === 'D0' ? ADAPTIVE_VERSION : ART_VERSION;
  if (rho < 1) { // seeded start offset along each track: short tracks get a phrase with probability ~ room / stride (no floor)
    let adv = 0;
    let n = 0;
    for (const e of src) for (const u of e.ph) if (u.id[0] === 'p') { adv += advIn(e.c, u.start, u.end); n++; }
    const stride = (1 / rho - 1) * ((n ? adv / n : 40) + GAP);
    for (const k of cursors) if (k.t.kind !== 'core') k.debt = h(`${ART_VERSION}:${k.t.id}:spread`) * stride;
  }
  // rendezvous order per slot (hash over slot+entry, then slot+unit): computed once per slot and memoised (pure)
  const slotOrder = (slot: string) => {
    let o = orderMemo.get(slot);
    if (!o) {
      const byHash = <T>(xs: T[], key: (x: T) => string) => xs.map(x => [h(key(x)), x] as const).sort((p, q) => q[0] - p[0]).map(([, x]) => x);
      o = byHash(src, e => `${version}:${slot}:${e.id}`).map(e => {
        let memo: Unit[] | null = null;
        const k = (u: Unit) => `${slot}:${e.id}:${u.id}`;
        return { e, units: () => (memo ??= [...byHash(e.ph.filter(u => u.id[0] === 'p'), k), ...byHash(e.ph.filter(u => u.id[0] === 'w'), k)]) };
      });
      orderMemo.set(slot, o);
    }
    return o;
  };
  const out: EPiece[] = [];
  let total = anchorsShown;
  let live = cursors.slice();
  while (live.length && total < cap) {
    const next: Cursor[] = [];
    for (const k of live) {
      let placed = false;
      while (!placed && k.g < k.gaps.length) {
        const [lo, hi] = k.gaps[k.g]!;
        let room = k.outerHigh ? k.pos - lo : hi - k.pos;
        if (k.debt > 0) { // spread: the empty arc carries across anchor gaps, so spacing stays even along the track
          const step = Math.min(k.debt, Math.max(0, room));
          k.debt -= step;
          k.pos += k.outerHigh ? -step : step;
          room -= step;
          if (k.debt > 1e-9) { k.g++; if (k.g < k.gaps.length) k.pos = k.outerHigh ? k.gaps[k.g]![1] : k.gaps[k.g]![0]; continue; }
        }
        const slot = `${k.t.id}:${Math.round(k.pos)}`;
        let pick: { e: Src; p: Unit; adv: number } | null = null;
        let fallback: { e: Src; p: Unit; adv: number } | null = null;
        for (const { e, units } of slotOrder(slot)) {
          for (const p of units()) {
            const adv = advIn(e.c, p.start, p.end);
            if (adv > room + 1e-6 || total + p.visible > cap) continue;
            if (p.text === k.last) { fallback ??= { e, p, adv }; continue; }
            pick = { e, p, adv };
            break;
          }
          if (pick) break;
        }
        pick ??= fallback;
        if (!pick) { k.g++; if (k.g < k.gaps.length) k.pos = k.outerHigh ? k.gaps[k.g]![1] : k.gaps[k.g]![0]; continue; }
        const aLo = k.outerHigh ? k.pos - pick.adv : k.pos;
        out.push({ entryId: pick.e.id, unit: pick.p.id, track: k.t.index, aLo, aHi: aLo + pick.adv, from: pick.p.start, to: pick.p.end, copyIndex: 0, slot });
        total += pick.p.visible;
        k.last = pick.p.text;
        k.debt = rho < 1 && k.t.kind !== 'core' ? (1 / rho - 1) * (pick.adv + GAP) : 0; // the core is a design element: always packed
        k.pos = k.outerHigh ? aLo - GAP : aLo + pick.adv + GAP;
        placed = true;
      }
      if (placed) next.push(k);
    }
    live = next;
  }
  return out;
}

export function placeEcho(G: Geo, entries: Entry[], ledger: Ledger, days: number, anchorsShown: number, budget: number): { echo: EPiece[]; rho: number } {
  if (days <= 0) return { echo: [], rho: 1 };
  const src: Src[] = [...entries].sort((a, b) => a.id.localeCompare(b.id)).map(e => ({ id: e.id, c: graphemes(e.body), ph: echoUnits(e.body) })).filter(e => e.ph.length);
  if (!src.length) return { echo: [], rho: 1 };
  let rho = 1;
  const memo = new Map<string, SlotOrder>();
  let echo = echoPass(G, src, ledger, days, anchorsShown, budget, 1, memo);
  if (G.layout !== 'D0' && budget < GLYPH_CAP) {
    // the smallest even spread that still reaches the budget (bisection on rho; deterministic)
    const need = budget - anchorsShown;
    const count = (e: EPiece[]) => e.reduce((n, p) => n + visibleIn(src.find(s => s.id === p.entryId)!.c, p.from, p.to), 0);
    if (count(echoPass(G, src, ledger, days, anchorsShown, Infinity, 1, memo)) > need) {
      let lo = 0.05;
      let hi = 1;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        if (count(echoPass(G, src, ledger, days, anchorsShown, Infinity, mid, memo)) >= need) hi = mid; else lo = mid;
      }
      rho = hi;
      echo = echoPass(G, src, ledger, days, anchorsShown, budget, rho, memo);
    }
  }
  const counter = new Map<string, number>();
  for (const p of [...echo].sort((a, b) => a.track - b.track || b.aHi - a.aHi)) {
    const key = `${p.entryId}#${p.from}-${p.to}`;
    p.copyIndex = (counter.get(key) ?? 0) + 1;
    counter.set(key, p.copyIndex);
  }
  return { echo, rho };
}

// ───────────────────────────── glyphs ─────────────────────────────

export type SGlyph = StaticGlyph & {
  track: number; s: number; piece: number; zc: number;
  role: 'anchor' | 'echo'; source: string; sourceStart: number; sourceEnd: number; copyIndex: number; strand: string;
};

function lay(out: SGlyph[], t: STrack, aLo: number, aHi: number, c: Chars, from: number, to: number, base: Pick<SGlyph, 'role' | 'source' | 'sourceStart' | 'sourceEnd' | 'copyIndex' | 'strand'>, piece: number, keyOf: (gi: number) => string) {
  let a = t.flip ? aLo : aHi;
  for (let gi = from; gi < Math.min(to, c.length); gi++) {
    const g = c[gi]!;
    const adv = advanceOf(g.text);
    if (t.flip ? a + adv > aHi + 1e-6 : a - adv < aLo - 1e-6) break;
    const center = t.flip ? a + adv / 2 : a - adv / 2;
    a += t.flip ? adv : -adv;
    if (g.text === ' ') continue;
    const s = sAt(t, center);
    const r = t.arc0 ? t.rOf(0) : radiusAt(t, s);
    out.push({ key: keyOf(gi), entryId: base.strand, lane: t.index, graphemeIndex: gi, sourceOffset: g.offset, glyph: g.text, a: center,
      theta0: t.arc0 ? t.phase - center / t.arc0 : t.phase - s / t.pitch, axisY: t.ly + s * t.vy, radius: r, arc: t.arc0 || Math.hypot(r, t.pitch),
      topMin: topAt(t, center), track: t.index, s, piece, zc: t.arc0 ? 0 : depthAt(t, s), ...base });
  }
}

export type SState = {
  layout: Layout; seed: Seed; fill: Fill; geo: Geo; days: number; entries: Entry[]; ledger: Ledger; echo: EPiece[]; rho: number; budget: number;
  all: SGlyph[]; active: SGlyph[];
};

/** budget for D1/D2 'equal' fill = what D0 draws for the same entries (so only placement differs) */
export function buildSculpt(layout: Layout, entries: Entry[], opts: { seed?: Seed; fill?: Fill; prev?: Ledger } = {}): SState {
  const seed = opts.seed ?? 'S0';
  const fill = opts.fill ?? 'equal';
  const G = geometry(layout, seed);
  const days = distinctDays(entries);
  const top = G.top(days);
  const shown = (g: SGlyph) => days > 0 && g.topMin >= top;
  const ledger = allocateAnchors(G, entries, opts.prev);
  const all: SGlyph[] = [];
  for (const e of [...entries].sort(byWriting)) {
    const r = ledger.get(e.id);
    if (!r) continue;
    const c = graphemes(e.body);
    r.pieces.forEach((p, i) => lay(all, G.tracks[p.track]!, p.aLo, p.aHi, c, p.from, p.to,
      { role: 'anchor', source: e.id, sourceStart: r.range[0], sourceEnd: r.range[1], copyIndex: 0, strand: e.id }, i, gi => `${e.id}:${gi}`));
  }
  const anchorsShown = all.filter(shown).length;
  const budget = layout === 'D0' || fill === 'full' ? GLYPH_CAP : buildSculpt('D0', entries, { seed }).active.length;
  const { echo, rho } = placeEcho(G, entries, ledger, days, anchorsShown, budget);
  const bodies = new Map(entries.map(e => [e.id, graphemes(e.body)]));
  for (const p of echo) {
    const strand = `echo:${p.slot}`;
    lay(all, G.tracks[p.track]!, p.aLo, p.aHi, bodies.get(p.entryId)!, p.from, p.to,
      { role: 'echo', source: p.entryId, sourceStart: p.from, sourceEnd: p.to, copyIndex: p.copyIndex, strand }, 0, gi => `${strand}:${gi}`);
  }
  return { layout, seed, fill, geo: G, days, entries, ledger, echo, rho, budget, all, active: all.filter(shown) };
}

// ───────────────────────────── projection ─────────────────────────────

export type SFrame = { x: number; y: number; z: number; cos: number; sin: number; k: number; a: number; b: number; c: number; d: number; opacity: number; level: number };
export const newSFrame = (): SFrame => ({ x: 0, y: 0, z: 0, cos: 0, sin: 0, k: 1, a: 1, b: 0, c: 0, d: 1, opacity: 0, level: 0 });
const smooth = (v: number) => { const x = Math.min(1, Math.max(0, (v - CULL) / (FADE_FULL - CULL))); return x * x * (3 - 2 * x); };

/** Gate 2B projectFlake generalised to r(s) and a depth offset zc(s) (identical numbers for D0 — tested). */
export function projectSculpt(tracks: STrack[], g: SGlyph, off: Offset, angleDeg: number, top: number, out: SFrame): SFrame {
  const t = tracks[g.track]!;
  const r = g.radius + off.dr;
  const theta = g.theta0 + off.du / g.radius - angleDeg * RAD;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const z = g.zc + r * cos;
  const k = CAMERA / (CAMERA - z);
  const s = g.s - off.dy;
  const wx = t.lx + s * t.vx + r * sin * t.rx;
  const wy = t.ly + s * t.vy + r * sin * t.ry;
  out.cos = cos;
  out.sin = sin;
  out.z = z;
  out.k = k;
  out.x = CX + (wx - CX) * k - t.vx * z * TILT;
  const y = CY + (wy - CY) * k - t.vy * z * TILT;
  out.y = off === ZERO ? y : Math.max(y, top + EXTENT * k);
  const q = k / g.arc;
  const rc = g.radius * cos;
  const pc = t.pitch * cos;
  out.a = q * (rc * t.rx - t.pitch * t.vx);
  out.b = q * (rc * t.ry - t.pitch * t.vy);
  out.c = q * (-pc * t.rx - g.radius * t.vx);
  out.d = q * (-pc * t.ry - g.radius * t.vy);
  if (t.flip) { out.a = -out.a; out.b = -out.b; out.c = -out.c; out.d = -out.d; }
  out.opacity = cos < CULL ? 0 : smooth(cos);
  out.level = 0;
  return out;
}

// ───────────────────────────── C2 depth light (D3) ─────────────────────────────

/**
 * [연구안] C2: a fixed soft light from the upper left-front. A glyph brightens only while its own face normal
 * n = sinθ·R + cosθ·Z (R = its track's in-plane right vector) turns through the half-vector H, i.e. as the helix rotates
 * a glyph catches the light on its way to the front and lets it go again. A slow seeded per-track envelope means only
 * some strands are lit at a time, and the depth weight favours glyphs nearer the viewer. Brightness only (≤ +gain),
 * same glyphs / positions / occlusion as D2; no halo, glow, particles or new objects.
 */
export const C2 = { gain: 0.12, power: 28, light: [-0.42, -0.5, 0.76] as const, envMin: 0.35, periodMin: 7, periodMax: 13, levels: 8 } as const;
const HV = (() => { const [lx, ly, lz] = C2.light; const n = Math.hypot(lx, ly, lz); const hx = lx / n; const hy = ly / n; const hz = lz / n + 1; const m = Math.hypot(hx, hy, hz); return [hx / m, hy / m, hz / m] as const; })();
export type C2Track = { w: number; p: number };
export const c2Tracks = (tracks: STrack[]): C2Track[] => tracks.map(t => ({
  w: (2 * Math.PI) / (C2.periodMin + h(`${ART_VERSION}:${t.id}:c2T`) * (C2.periodMax - C2.periodMin)), p: h(`${ART_VERSION}:${t.id}:c2P`) * 2 * Math.PI,
}));
/** 0..1 light amount for one projected glyph at time t */
export function c2Amount(t: STrack, f: SFrame, env: C2Track, time: number): number {
  if (f.cos < CULL) return 0;
  const nDotH = f.sin * (t.rx * HV[0] + t.ry * HV[1]) + f.cos * HV[2];
  if (nDotH <= 0) return 0;
  const spec = nDotH ** C2.power;
  const e = Math.sin(env.w * time + env.p);
  const envelope = C2.envMin + (1 - C2.envMin) * e * e;
  const depth = Math.min(1, Math.max(0.4, 0.75 + f.z / 16));
  return spec * envelope * depth * smooth(f.cos);
}
export const c2Level = (amount: number) => Math.round(amount * (C2.levels - 1));

// ───────────────────────────── measurements ─────────────────────────────

export const glyphR = (G: Geo, g: SGlyph) => axisR(G.tracks[g.track]!, g.s);
export const CORE_R = CORE.hex + 4; // "centre" region for metrics (all variants)

export function measureSculpt(st: SState, angle = 0) {
  const G = st.geo;
  const f = newSFrame();
  const top = G.top(st.days);
  const echo = st.active.filter(g => g.role === 'echo');
  const anchors = st.active.length - echo.length;
  const anchorSlots = st.all.filter(g => g.role === 'anchor').length;
  const total = st.entries.reduce((n, e) => n + graphemes(e.body).filter(g => g.text !== ' ').length, 0);
  const kindOf = (g: SGlyph) => G.tracks[g.track]!.kind;
  const perArm = [0, 1, 2, 3, 4, 5].map(a => st.active.filter(g => G.tracks[g.track]!.arm === a).length);
  const front = st.active.map(g => ({ g, p: { ...projectSculpt(G.tracks, g, ZERO, angle, top, f) } })).filter(x => x.p.cos >= CULL);
  // pairs of front-facing glyph centres closer than 45 % of a glyph (heavy overlap → "lump")
  let crowded = 0;
  const cell = new Map<string, { x: number; y: number }[]>();
  for (const { p } of front) {
    const cx = Math.floor(p.x / 4);
    const cy = Math.floor(p.y / 4);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of cell.get(`${cx + i}:${cy + j}`) ?? []) if (Math.hypot(q.x - p.x, q.y - p.y) < 3.6) crowded++;
    const key = `${cx}:${cy}`;
    (cell.get(key) ?? cell.set(key, []).get(key)!).push({ x: p.x, y: p.y });
  }
  const r1 = (v: number) => Math.round(v * 1000) / 1000;
  const coreFront = front.filter(x => Math.hypot(x.p.x - CX, x.p.y - CY) < CORE_R);
  const used = new Set(st.active.map(g => g.track));
  const sourceShown = new Set(st.active.map(g => `${g.source}:${g.graphemeIndex}`)).size;
  return {
    drawn: st.active.length, anchorsDrawn: anchors, echoDrawn: echo.length, budget: st.budget === GLYPH_CAP ? `cap ${GLYPH_CAP}` : st.budget, echoSpread: r1(st.rho),
    reservedNotYetOpen: anchorSlots - anchors, unplacedSource: [...st.ledger.values()].reduce((n, r) => n + r.unplaced, 0), sourceGlyphs: total,
    distinctSourceGraphemesShown: sourceShown,
    echoPieces: st.echo.length, maxCopyIndex: Math.max(0, ...st.echo.map(p => p.copyIndex)),
    byKind: { arm: st.active.filter(g => kindOf(g) === 'arm').length, twig: st.active.filter(g => kindOf(g) === 'twig').length, core: st.active.filter(g => kindOf(g) === 'core').length, seed: st.active.filter(g => kindOf(g) === 'seed').length },
    byLayer: [0, 1, 2].map(l => st.active.filter(g => G.tracks[g.track]!.layer === l).length),
    within: { r30: st.active.filter(g => glyphR(G, g) < CORE_R).length, r50: st.active.filter(g => glyphR(G, g) < 50).length },
    front: front.length, frontCoreR30: coreFront.length,
    innermostFrontR: front.length ? r1(Math.min(...front.map(x => Math.hypot(x.p.x - CX, x.p.y - CY)))) : null,
    crowdedFrontPairs: crowded,
    tracks: G.tracks.length, tracksUsed: used.size,
    perArm, armBalanceMinOverMax: Math.max(...perArm) ? r1(Math.min(...perArm) / Math.max(...perArm)) : null,
    revealTop: Math.round(top * 10) / 10, revealFraction: r1(revealFraction(st.seed, st.days)),
  };
}
