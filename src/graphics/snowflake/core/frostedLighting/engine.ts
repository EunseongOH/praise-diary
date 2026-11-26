/**
 * Gate 2H — Frosted Snowflake Lighting study. Dev-only, pure, deterministic. Adapter over Gate 2G (imported, never modified):
 *   Shape · Typography · Motion = Gate 2G `buildRotation` (R2 / R3 on Gate 2F F2: same slots, anchor ledger, echo rules,
 *   growth boundary, strands that hand the front over). Only two layers are new here:
 *   Lighting  — the colour / glow of each glyph from its CURRENT depth (strands) or its rest depth (other glyphs), a slow
 *               light rhythm on the arms and core (pulses), and a flash when a strand arrives in front (H4).
 *   Particles — small light points that are NOT glyphs: no entry, no text, never in `st.active`; placed on active slots
 *               (core, stroke tips, along the structure) so they only exist inside the open growth region.
 * All colours / counts come from a MonthTheme (theme.ts); H0–H4 are Looks. Numbers are [연구안], not approved art.
 */
import { CAMERA, type Entry } from '../multiHelix/engine';
import { CX, CY } from '../fullSnowflake/engine';
import { STROKES, h, type Ledger } from '../livingTypography/engine';
import { buildRotation, thetaOf, type RState, type Pose } from '../foregroundTextRotation/engine';
import { DECEMBER, LOOKS, type HVariant, type Look, type MonthTheme } from './theme';

export const ART_VERSION = 'frosted-lighting-v0.1';
export { HVARIANTS, LOOKS, DECEMBER, type HVariant, type Look, type MonthTheme } from './theme';
export { rotationEntries, changeEntries, newPose, exchangeEvidence, frontTimes, measureRotation, sampleLine, poseAt, type Change, type Dataset, type Pose } from '../foregroundTextRotation/engine';

export type Particle = {
  id: string; site: 'core' | 'tip' | 'along'; kind: 'frost' | 'bulb'; slot: number;
  x: number; y: number; z: number; size: number; color: string; pastel: boolean; period: number; phase: number; duty: number;
};
type BeadLine = { line: string; cells: { ox: number; oy: number; oz: number; ph: number }[]; colors: { color: string; pastel: boolean }[] };
export type HState = {
  variant: HVariant; look: Look; theme: MonthTheme; rs: RState; still: boolean;
  staticL: Float32Array; particles: Particle[]; beadLines: BeadLine[];
};
export type HOpts = { theme?: MonthTheme; still?: boolean; prev?: Ledger; seed?: string; look?: Partial<Look> };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const frac = (v: number) => v - Math.floor(v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const wrap = (a: number) => { const p = 2 * Math.PI; return a - p * Math.floor((a + Math.PI) / p); };

export function buildFrost(variant: HVariant, entries: Entry[], o: HOpts = {}): HState {
  const theme = o.theme ?? DECEMBER;
  const look: Look = { ...LOOKS[variant], ...o.look };
  const still = !!o.still;
  const seed = o.seed ?? 'v1';
  const rs = buildRotation(look.motion, entries, { period: look.period, layers: theme.typography.layers, twist: theme.motion.twist, still, prev: o.prev, seed });
  const st = rs.st, S = st.geo.slots;
  const L = theme.lighting.still;
  const dn = Math.hypot(L.dir[0], L.dir[1]) || 1;
  const staticL = Float32Array.from(st.active, g => {
    const s = S[g.slot]!;
    const r = Math.hypot(s.x - CX, s.y - CY) || 1;
    const facing = ((s.x - CX) * L.dir[0] + (s.y - CY) * L.dir[1]) / (r * dn);
    return clamp(L.base + L.perZ * s.z + L.dirGain * facing, L.min, L.max);
  });
  return { variant, look, theme, rs, still, staticL, particles: look.particles ? buildParticles(rs, theme, seed) : [], beadLines: look.beads ? buildBeads(rs, theme, seed) : [] };
}

// ───────────────────────────── Lighting ─────────────────────────────

/** light of active glyph i at time t, given its pose: L 0 (back) … 1 (front), tier 0 plain · 1 front glow · 2 arrival flash */
export type Light = { L: number; tier: 0 | 1 | 2 };
export function lightOf(hs: HState, i: number, t: number, f: Pose, out: Light): Light {
  out.tier = 0;
  if (hs.look.light === 'ink') { out.L = f.spark; return out; } // Gate 2G: renderer tints INK → white in 8 levels
  const T = hs.theme.lighting;
  const o = hs.rs.orb[hs.rs.st.active[i]!.slot];
  if (o) {
    const front = Math.cbrt(f.spark); // 2G spark = frontness³ → frontness (1 + cosθ)/2
    out.L = T.strand.min + (1 - T.strand.min) * Math.pow(front, T.strand.gamma);
    if (out.L >= T.frontGlow.from) out.tier = 1;
    if (hs.look.reactive && !hs.still) {
      const d = wrap(thetaOf(hs.rs, o, t));
      if (d >= T.reactive.from && d <= T.reactive.to && Math.sin((Math.PI * (d - T.reactive.from)) / (T.reactive.to - T.reactive.from)) > 0.35) { out.tier = 2; out.L = Math.max(out.L, 0.92); }
    }
    return out;
  }
  const base = hs.staticL[i]!;
  out.L = base + f.spark * (1 - base); // 2F glints / drift highlight (R3) brighten towards frost white
  if (f.spark > 0.5) out.tier = 1;
  return out;
}

export function rampColor(theme: MonthTheme, L: number) {
  const r = theme.lighting.ramp;
  let k = 0;
  while (k < r.length - 2 && L > r[k + 1]![0]) k++;
  const [a, ca] = r[k]!, [b, cb] = r[k + 1]!;
  const u = clamp((L - a) / (b - a), 0, 1);
  const p = (c: string) => [1, 3, 5].map(j => parseInt(c.slice(j, j + 2), 16));
  const A = p(ca), B = p(cb);
  return `rgb(${A.map((v, j) => Math.round(lerp(v, B[j]!, u))).join(',')})`;
}

export type Pulse = { x: number; y: number; r: number; a: number };
const spine = (a: number) => STROKES.find(s => s.id === `a${a}-spine`)!;
/** slow light rhythm: one soft light per arm travelling outward (golden-ratio phases → never all together) + a core breath */
export function pulsesAt(hs: HState, t: number, out: Pulse[] = []): Pulse[] {
  out.length = 0;
  if (!hs.look.pulses || hs.still || hs.rs.st.days <= 0) return out;
  const P = hs.theme.lighting.pulses, g = hs.look.pulses;
  for (let a = 0; a < 6; a++) {
    const s = spine(a);
    const u = frac(t / P.armPeriod + a * 0.381966);
    out.push({ x: lerp(s.x0, s.x1, u), y: lerp(s.y0, s.y1, u), r: P.radius, a: P.armAlpha * g * Math.sin(Math.PI * u) ** 2 });
  }
  out.push({ x: CX, y: CY, r: P.coreRadius, a: P.coreAlpha * g * (0.55 + 0.45 * Math.sin((2 * Math.PI * t) / P.corePeriod)) });
  return out;
}

// ───────────────────────────── Particles ─────────────────────────────

function buildParticles(rs: RState, theme: MonthTheme, seed: string): Particle[] {
  const st = rs.st, S = st.geo.slots, P = theme.particles;
  if (st.days <= 0) return [];
  const H = (k: string) => h(`${seed}:${ART_VERSION}:p:${k}`);
  const slots = [...new Set(st.active.map(g => g.slot))].map(i => S[i]!);
  const rad = (s: (typeof slots)[0]) => Math.hypot(s.x - CX, s.y - CY);
  const pick: { site: Particle['site']; s: (typeof slots)[0] }[] = [];
  // core: hash-ranked core slots · tips: outermost active slot of each spine / branch / tip stroke · along: structure slots
  slots.filter(s => s.core).sort((a, b) => H(`c${a.i}`) - H(`c${b.i}`)).slice(0, P.sites.core).forEach(s => pick.push({ site: 'core', s }));
  const byStroke = new Map<string, (typeof slots)[0]>();
  for (const s of slots) if (!s.core && ['spine', 'branch', 'tip'].includes(s.kind)) { const b = byStroke.get(s.stroke); if (!b || rad(s) > rad(b)) byStroke.set(s.stroke, s); }
  for (const [id, s] of byStroke) if (id.endsWith('spine') || H(`t${id}`) < P.sites.tipShare) pick.push({ site: 'tip', s });
  const used = new Set(pick.map(p => p.s.i));
  slots.filter(s => !s.core && !used.has(s.i) && s.layer === 'structure').sort((a, b) => H(`a${a.i}`) - H(`a${b.i}`)).slice(0, P.sites.along).forEach(s => pick.push({ site: 'along', s }));
  const out: Particle[] = [];
  for (const { site, s } of pick) {
    const id = `${site}:${s.i}`;
    const kind = H(`k${id}`) < P.bulbShare[site] ? 'bulb' : 'frost';
    const pastel = kind === 'bulb' && H(`p${id}`) < P.pastelShare;
    const pal = pastel ? P.pastel : P.cold;
    const [s0, s1] = P.size[kind];
    const size = lerp(s0, s1, H(`s${id}`));
    const ang = 2 * Math.PI * H(`o${id}`), off = 1 + 1.5 * H(`d${id}`); // sits between glyphs, not on a glyph centre
    const x = s.x + Math.cos(ang) * off, y = s.y + Math.sin(ang) * off;
    const k = CAMERA / (CAMERA - s.z);
    if (CY + (y - CY) * k - size * k < st.top) continue; // growth: a light never shows above the open region
    out.push({ id, site, kind, slot: s.i, x, y, z: s.z + 0.5, size, color: pal[Math.floor(H(`h${id}`) * pal.length)]!, pastel,
      period: lerp(P.twinkle.period[0], P.twinkle.period[1], H(`T${id}`)), phase: H(`f${id}`), duty: lerp(P.twinkle.duty[0], P.twinkle.duty[1], H(`u${id}`)) });
  }
  const budget = Math.floor(st.active.length / P.glyphsPerLight);
  return out.length <= budget ? out : [...out].sort((a, b) => H(`keep${a.id}`) - H(`keep${b.id}`)).slice(0, budget);
}

/** twinkle envelope 0…1 (still → a fixed subset glows steadily, no change over time) */
export function particleAlpha(hs: HState, p: Particle, t: number) {
  const A = hs.theme.particles.alpha;
  if (hs.still) return p.phase < p.duty ? 0.6 * A : 0;
  const u = frac(t / p.period + p.phase);
  return u < p.duty ? A * Math.sin((Math.PI * u) / p.duty) ** 2 : 0;
}

function buildBeads(rs: RState, theme: MonthTheme, seed: string): BeadLine[] {
  const B = theme.particles.beads;
  const out: BeadLine[] = [];
  for (const s of rs.strands) {
    if (s.k !== 0 || (s.kind !== 'spine' && s.kind !== 'branch')) continue;
    if (s.kind === 'branch' && h(`${seed}:${ART_VERSION}:bead:${s.line}`) >= B.lineShare) continue;
    const cells = s.cells.map(c => rs.orb[c]).filter((x): x is NonNullable<typeof x> => !!x && x.amp > 0.5).map(x => ({ ox: x.ox, oy: x.oy, oz: x.oz, ph: x.ph }));
    if (!cells.length) continue;
    const colors = Array.from({ length: rs.opts.layers }, (_, k) => {
      const pastel = h(`${seed}:${ART_VERSION}:beadc:${s.line}:${k}`) < B.pastelShare;
      const pal = pastel ? theme.particles.pastel : theme.particles.cold;
      return { color: pal[Math.floor(h(`${seed}:beadh:${s.line}:${k}`) * pal.length)]!, pastel };
    });
    out.push({ line: s.line, cells, colors });
  }
  return out;
}

export type Bead = { x: number; y: number; z: number; size: number; a: number; color: string; pastel: boolean; line: string };
/** H4: a short light that runs along a line with the moment a strand arrives in front (θ just before 0), cell by cell */
export function beadsAt(hs: HState, t: number, out: Bead[] = []): Bead[] {
  out.length = 0;
  if (hs.still || !hs.beadLines.length) return out;
  const B = hs.theme.particles.beads, n = hs.rs.opts.layers, w = hs.rs.omega;
  for (const bl of hs.beadLines) for (const c of bl.cells) for (let k = 0; k < n; k++) {
    const d = wrap(w * t + c.ph - (2 * Math.PI * k) / n);
    if (d < -B.window || d > 0) continue;
    const a = B.alpha * Math.sin((Math.PI * (d + B.window)) / B.window);
    if (a < 0.02) continue;
    out.push({ x: c.ox, y: c.oy, z: c.oz + 0.5, size: B.size, a, color: bl.colors[k]!.color, pastel: bl.colors[k]!.pastel, line: bl.line });
  }
  return out;
}

// ───────────────────────────── metrics (automatic; NOT an aesthetic verdict) ─────────────────────────────

export function lightStats(hs: HState, times: number[]) {
  const P = hs.particles;
  const lit = times.map(t => P.filter(p => particleAlpha(hs, p, t) > 0.05));
  const beads = times.map(t => beadsAt(hs, t));
  const mm = (v: number[]) => ({ min: Math.min(...v), max: Math.max(...v), mean: Math.round((v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)) * 10) / 10 });
  return {
    particles: P.length, bySite: { core: P.filter(p => p.site === 'core').length, tip: P.filter(p => p.site === 'tip').length, along: P.filter(p => p.site === 'along').length },
    bulbs: P.filter(p => p.kind === 'bulb').length, pastel: P.filter(p => p.pastel).length,
    litPerInstant: mm(lit.map(l => l.length)), pastelLitPerInstant: mm(lit.map(l => l.filter(p => p.pastel).length)),
    beadLines: hs.beadLines.length, beadsPerInstant: mm(beads.map(b => b.length)), pastelBeadsPerInstant: mm(beads.map(b => b.filter(x => x.pastel).length)),
  };
}
