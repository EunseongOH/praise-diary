/**
 * Gate 2F — Layered Crystal Motion study. Dev-only, pure, deterministic. Builds on the Gate 2E shape-first crystal
 * (imported, never modified) in five separate layers so another symbol (sheep, sun …) can reuse 2–5 with its own shape:
 *   1. SHAPE      — Gate 2E STROKES (hex core, six arms, branches, plates) + F2 core detail strokes (EXTRA).
 *   2. SLOTS/BANDS— Gate 2E A2 slots (structure = representative band on each reading stroke) minus the helix sleeves,
 *                   plus AUXILIARY BANDS: 1–2 text lines parallel to every reading stroke, each on its own orbit around
 *                   the stroke axis (lateral radius R, depth amplitude Rz, rest angle θ0, swing angle θ1). At rest they
 *                   sit beside the representative band (front-side, slightly compressed) → a stroke reads as a band of
 *                   2–3 text layers. F2 adds core detail (30° ribs, inner band of the outer hex, micro ring).
 *   3. TEXT       — anchors = Gate 2E allocateAnchors on the representative bands (append-only ledger, identical rules);
 *                   echo = real phrases repeated along every band / free run (entryId · graphemeIndex · copyIndex).
 *   4. MOTION     — a plan over a state: M1 depth reveal (auxiliary bands swing behind the representative band and come
 *                   back, a phase wave running outward along each band) · M2 + group float · M3 + drift (echo glyphs
 *                   travel to an empty slot of the same arm and back) · M4 + three kinds of sparkle (brightness only).
 *   5. RENDER     — LayeredCanvas.tsx.
 * Growth: Gate 2B boundary unchanged (distinct entryDate count / 15, bottom → top). A slot is shown only if its box stays
 * below the boundary in every pose it can take (band swing, float margin); movers check their whole path.
 * Every number is a [연구안] starting value, not approved art.
 */
import { graphemes } from '../../engine';
import { CAMERA, type Entry } from '../multiHelix/engine';
import { CX, CY, FONT, TARGET_DAYS, Y_BOTTOM, Y_TOP, revealTop } from '../fullSnowflake/engine';
import { anchorRange, distinctDays, phrases, type Dataset } from '../adaptiveSnowflake/engine';
import { newSFrame, type SFrame } from '../sculpturalSnowflake/engine';
import {
  EXT, SHAPE, STROKES, a0Count, allocateAnchors, changeEntries, geometry, h, legible, livingEntries, memberOf,
  type Change, type Geo, type Kind, type Ledger, type LGlyph,
} from '../livingTypography/engine';

export const ART_VERSION = 'layered-crystal-v0.1';
export type FShape = 'F1' | 'F2';
export type FMotion = 'M0' | 'M1' | 'M2' | 'M3' | 'M4';
export type Fill = 'natural' | 'equal';
export { livingEntries as crystalEntries, changeEntries, type Change, type Dataset };
export const CHANGES: Change[] = ['none', 'extra', 'edit', 'delete', 'yesterday', 'lastdel'];

const RAD = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const armAngle = (arm: number) => (-90 + 60 * arm) * RAD;

// ───────────────────────────── 1. shape: band specs + F2 core detail (data) ─────────────────────────────

/** One auxiliary band of a stroke. side: +1/−1 lateral side · R lateral radius (inner→outer end) · Rz depth amplitude ·
 *  th0 rest angle / th1 farthest swing (deg, 0 = in front of the axis, 180 = behind) · sf size factor vs the stroke. */
type BandSpec = { side: 1 | -1 | 'tip' | 'in'; R0: number; R1: number; Rz: number; th0: number; th1: number; sf: number; along: number };
export const BANDS: Record<string, BandSpec[]> = {
  spine: [
    { side: 1, R0: 7.4, R1: 4.8, Rz: 4.6, th0: 74, th1: 166, sf: 0.76, along: 0.5 },
    { side: -1, R0: 6.8, R1: 4.4, Rz: 4.0, th0: 80, th1: 170, sf: 0.68, along: 0.15 },
  ],
  branchLong: [ // the longest branch of every arm (b1) carries two bands
    { side: 1, R0: 4.9, R1: 3.6, Rz: 3.4, th0: 76, th1: 164, sf: 0.72, along: 0.5 },
    { side: -1, R0: 4.6, R1: 3.4, Rz: 3.0, th0: 82, th1: 168, sf: 0.66, along: 0.2 },
  ],
  branch: [{ side: 'tip', R0: 4.4, R1: 3.4, Rz: 3.0, th0: 78, th1: 164, sf: 0.68, along: 0.5 }],
  ohex: [{ side: 'in', R0: 3.9, R1: 3.9, Rz: 3.0, th0: 76, th1: 162, sf: 0.66, along: 0.5 }], // F2 only
};
export const CORE = { ribR: [20.5, 25], ribSize: 0.5, ribZ: 3.0, microR: 10, microSize: 0.44, microZ: 5.4 } as const; // F2 only
/** extra mask capsules of the F2 core (30° ribs) — used for drift paths and the debug overlay */
export const EXTRA: { x0: number; y0: number; x1: number; y1: number; w: number }[] = Array.from({ length: 6 }, (_, k) => {
  const a = armAngle(k) + 30 * RAD;
  return { x0: CX + 15 * Math.cos(a), y0: CY + 15 * Math.sin(a), x1: CX + 31 * Math.cos(a), y1: CY + 31 * Math.sin(a), w: 3.4 };
});
export function inCrystal(x: number, y: number, slack = 0) {
  if (memberOf(x, y, slack)) return true;
  for (const e of EXTRA) {
    const dx = e.x1 - e.x0, dy = e.y1 - e.y0, L2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((x - e.x0) * dx + (y - e.y0) * dy) / L2));
    if (Math.hypot(x - e.x0 - t * dx, y - e.y0 - t * dy) <= e.w + slack) return true;
  }
  return false;
}

// ───────────────────────────── 2. slots + bands ─────────────────────────────

export type FLayer = 'structure' | 'band' | 'texture' | 'depth';
export type Orbit = { ox: number; oy: number; nx: number; ny: number; R: number; Rz: number; zc: number; th0: number; th1: number; a: number; band: string };
export type FSlot = {
  i: number; x: number; y: number; z: number; rot: number; size: number; kind: Kind; layer: FLayer; stroke: string; arm: number;
  join: boolean; topMin: number; shade: number; group: string; // float group (a phrase-sized run piece moves as one)
  core: boolean; orbit?: Orbit;
};
export type FLine = { id: string; kind: Kind; arm: number; cells: number[] };
export type FGeo = { shape: FShape; slots: FSlot[]; lines: FLine[]; runs: { id: string; cells: number[] }[]; bands: { id: string; stroke: string; cells: number[] }[] };

export const FLOAT = { amp: 1.4, share: 0.42, periodMin: 5, periodMax: 9 } as const; // M2: world units (≈ 0.6–1.6 css px at 343 px)
const PRIO: Record<FLayer, number> = { structure: 0, band: 0.5, texture: 1, depth: 1.5 };
export const JOIN_SHARE = 0.1;
export const CORE_R = SHAPE.outerHex.r + 4;

const topOf = (y: number, z: number, size: number, margin: number) => { const k = CAMERA / (CAMERA - z); return CY + (y - CY) * k - EXT * size * k - margin; };
/** rest / swung position of an orbit glyph */
export function orbitAt(o: Orbit, th: number) { return { x: o.ox + o.nx * o.R * Math.sin(th), y: o.oy + o.ny * o.R * Math.sin(th), z: o.zc + o.Rz * Math.cos(th) }; }
const ORBIT_SAMPLES = 12;
/** the swing passes the rest angle and reaches a bit further to the front (s < 0) before going behind (s = 1) */
export const SWING_MIN = -0.25;

const geoCache = new Map<FShape, FGeo>();
export function crystalGeometry(shape: FShape): FGeo {
  const hit = geoCache.get(shape);
  if (hit) return hit;
  const base: Geo = geometry('A2');
  type S = Omit<FSlot, 'i'> & { prio: number; key: number };
  const all: S[] = [];
  const lines = new Map<string, { kind: Kind; arm: number; cells: S[] }>();
  const runs = new Map<string, { t: number; s: S }[]>();
  const pushRun = (id: string, t: number, s: S) => { const r = runs.get(id) ?? []; r.push({ t, s }); runs.set(id, r); };

  // Gate 2E A2 slots (helix sleeves removed: depth reveal is done by the bands) — same positions, same anchor lines
  const fromBase = new Map<number, S>();
  for (const b of base.slots) {
    if (b.layer === 'helix') continue;
    const s: S = { x: b.x, y: b.y, z: b.z, rot: b.rot, size: b.size, kind: b.kind, layer: b.layer as FLayer, stroke: b.stroke, arm: b.arm, join: false,
      topMin: b.layer === 'structure' ? b.topMin : topOf(b.y, b.z, b.size, FLOAT.amp), shade: b.shade, group: '', core: Math.hypot(b.x - CX, b.y - CY) < CORE_R, prio: PRIO[b.layer as FLayer], key: all.length };
    all.push(s);
    fromBase.set(b.i, s);
  }
  for (const l of base.lines) lines.set(l.id, { kind: l.kind, arm: l.arm, cells: l.cells.map(c => fromBase.get(c)!) });
  for (const r of base.runs) r.cells.forEach((c, k) => { const s = fromBase.get(c); if (s) pushRun(r.id, k, s); });

  // auxiliary bands on reading strokes
  const bandRuns: string[] = [];
  for (const st of STROKES) {
    const short = st.id.split('-')[1]!;
    const specs = st.kind === 'spine' ? BANDS.spine : st.kind === 'branch' && st.line ? (short.startsWith('b1') ? BANDS.branchLong : BANDS.branch) : st.id.endsWith('ohex') && shape === 'F2' ? BANDS.ohex : null;
    if (!specs || st.len === 0) continue;
    const { rot, flip } = legible(st.dx, st.dy);
    specs!.forEach((sp, k) => {
      let nx = -st.dy, ny = st.dx;
      const sign = sp.side === 'tip' ? Math.sign(nx * Math.cos(armAngle(st.arm)) + ny * Math.sin(armAngle(st.arm))) || 1
        : sp.side === 'in' ? Math.sign(nx * (CX - (st.x0 + st.x1) / 2) + ny * (CY - (st.y0 + st.y1) / 2)) || 1 : sp.side;
      nx *= sign; ny *= sign;
      const id = `${st.id}:band${k}`;
      bandRuns.push(id);
      const adv0 = FONT * 0.92 * st.s0 * sp.sf;
      for (let a = adv0 * sp.along; a <= st.len + 1e-6; ) {
        const t = a / st.len;
        const size = lerp(st.s0, st.s1, t) * sp.sf;
        const ox = st.x0 + a * st.dx, oy = st.y0 + a * st.dy;
        const repZ = lerp(st.z0, st.z1, t) + 0.8;
        const o: Orbit = { ox, oy, nx, ny, R: lerp(sp.R0, sp.R1, t), Rz: sp.Rz, zc: repZ - 1.6, th0: sp.th0 * RAD, th1: sp.th1 * RAD, a: flip ? st.len - a : a, band: id };
        const p = orbitAt(o, o.th0);
        let top = Infinity;
        for (let q = 0; q <= ORBIT_SAMPLES; q++) { const r = orbitAt(o, lerp(o.th0, o.th1, SWING_MIN + ((1 - SWING_MIN) * q) / ORBIT_SAMPLES)); top = Math.min(top, topOf(r.y, r.z, size, FLOAT.amp)); }
        const s: S = { x: p.x, y: p.y, z: p.z, rot, size, kind: st.kind, layer: 'band', stroke: st.id, arm: st.arm, join: false, topMin: top, shade: 1, group: '', core: st.kind === 'hex', orbit: o, prio: PRIO.band, key: all.length };
        all.push(s);
        pushRun(id, flip ? -a : a, s);
        a += FONT * 0.92 * size;
      }
    });
  }

  // F2: denser core — 30° ribs (short radial text), a micro ring around the nucleus (front, tiny)
  if (shape === 'F2') {
    for (let k = 0; k < 6; k++) {
      const ang = armAngle(k) + 30 * RAD;
      const dir = legible(Math.cos(ang), Math.sin(ang));
      CORE.ribR.forEach((r, j) => {
        const x = CX + r * Math.cos(ang), y = CY + r * Math.sin(ang);
        const s: S = { x, y, z: CORE.ribZ - j * 0.6, rot: dir.rot, size: CORE.ribSize - j * 0.04, kind: 'core', layer: 'texture', stroke: `rib${k}`, arm: k, join: false,
          topMin: topOf(y, CORE.ribZ, CORE.ribSize, FLOAT.amp), shade: 0.92, group: '', core: true, prio: PRIO.texture - 0.2, key: all.length };
        all.push(s);
        pushRun(`rib${k}`, dir.flip ? -r : r, s);
      });
      const x = CX + CORE.microR * Math.cos(ang), y = CY + CORE.microR * Math.sin(ang);
      const s: S = { x, y, z: CORE.microZ, rot: legible(-Math.sin(ang), Math.cos(ang)).rot, size: CORE.microSize, kind: 'core', layer: 'texture', stroke: 'micro', arm: k, join: false,
        topMin: topOf(y, CORE.microZ, CORE.microSize, FLOAT.amp), shade: 0.9, group: '', core: true, prio: PRIO.texture - 0.2, key: all.length };
      all.push(s);
      pushRun('micro', k, s);
    }
  }

  // prune: a free element colliding with a kept glyph at nearly the same depth is dropped (bands never displace anchors)
  const order = [...all].sort((a, b) => a.prio - b.prio || a.key - b.key);
  const kept: S[] = [];
  const keep = new Set<S>();
  for (const s of order) {
    if (s.layer !== 'structure') {
      const lim = s.layer === 'band' ? 2.7 : 3.5;
      const clash = kept.some(o => Math.abs(o.z - s.z) < 2.5 && Math.hypot(o.x - s.x, o.y - s.y) < lim * (o.size + s.size) && !(o.orbit && s.orbit && o.orbit.band !== s.orbit.band && o.stroke === s.stroke));
      if (clash) continue;
    }
    kept.push(s);
    keep.add(s);
  }
  const slots: FSlot[] = [];
  const index = new Map<S, number>();
  for (const s of all) if (keep.has(s)) { index.set(s, slots.length); const { prio: _p, key: _k, ...rest } = s; slots.push({ ...rest, i: slots.length }); }
  for (const s of slots) if ((s.layer === 'texture' || s.layer === 'depth') && h(`${ART_VERSION}:join:${shape}:${s.stroke}:${Math.round(s.x)}:${Math.round(s.y)}`) < JOIN_SHARE) s.join = true;
  const fl: FLine[] = [...lines].map(([id, l]) => ({ id, kind: l.kind, arm: l.arm, cells: l.cells.map(c => index.get(c)!) }));
  const fr = [...runs].map(([id, v]) => ({ id, cells: v.filter(c => index.has(c.s)).sort((a, b) => a.t - b.t).map(c => index.get(c.s)!).filter(i => !slots[i]!.join) })).filter(r => r.cells.length);
  // float groups: pieces of ≤ 4 consecutive run cells move together (a phrase line never tears)
  for (const r of fr) r.cells.forEach((c, k) => { slots[c]!.group = `${r.id}#${Math.floor(k / 4)}`; });
  const geo: FGeo = { shape, slots, lines: fl, runs: fr, bands: fr.filter(r => bandRuns.includes(r.id)).map(r => ({ id: r.id, stroke: r.id.split(':')[0]!, cells: r.cells })) };
  geoCache.set(shape, geo);
  return geo;
}

// ───────────────────────────── 3. text assignment ─────────────────────────────

export type FState = {
  shape: FShape; fill: Fill; seed: string; geo: FGeo; entries: Entry[]; days: number; top: number; ledger: Ledger;
  glyphs: LGlyph[]; active: LGlyph[]; budget: number; natural: number;
};
const byWriting = (a: Entry, b: Entry) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
const RANK: Record<FLayer, number> = { structure: 0, band: 1, texture: 2, depth: 3 };

export function buildCrystal(shape: FShape, entries: Entry[], opts: { fill?: Fill; prev?: Ledger; seed?: string } = {}): FState {
  const fill = opts.fill ?? 'natural';
  const seed = opts.seed ?? 'v1';
  const geo = crystalGeometry(shape);
  const days = distinctDays(entries);
  const top = revealTop(days);
  // Gate 2E anchor rules verbatim (representative bands = the same reading lines, same topMin) → same ledger as A2
  const ledger = allocateAnchors(geo as unknown as Geo, entries, opts.prev);
  const glyphs: LGlyph[] = [];
  const taken = new Uint8Array(geo.slots.length);
  const lineById = new Map(geo.lines.map(l => [l.id, l]));
  for (const e of [...entries].sort(byWriting)) {
    const p = ledger.get(e.id);
    if (!p) continue;
    const g = graphemes(e.body);
    const line = lineById.get(p.line)!;
    for (let k = 0; k < p.cells; k++) {
      const slot = line.cells[p.start + k]!;
      taken[slot] = 1;
      const gi = p.from + k;
      if (g[gi]!.text === ' ') continue;
      glyphs.push({ key: `${e.id}:${gi}:0`, entryId: e.id, graphemeIndex: gi, sourceOffset: g[gi]!.offset, glyph: g[gi]!.text, role: 'anchor', copyIndex: 0, run: p.line, slot });
    }
  }
  const runs: { id: string; cells: number[] }[] = [];
  for (const l of geo.lines) {
    let cur: number[] = [];
    let at = 0;
    l.cells.forEach((c, k) => { if (taken[c] || geo.slots[c]!.join) { if (cur.length) runs.push({ id: `${l.id}@${at}`, cells: cur }); cur = []; at = k + 1; } else cur.push(c); });
    if (cur.length) runs.push({ id: `${l.id}@${at}`, cells: cur });
  }
  runs.push(...geo.runs);
  const pool = entries.filter(e => graphemes(e.body).some(x => x.text !== ' '));
  const copies = new Map<string, number>();
  if (pool.length) for (const r of runs) {
    let e = pool[0]!;
    let bestH = -1;
    for (const c of pool) { const v = h(`${seed}:${ART_VERSION}:run:${r.id}:${c.id}`); if (v > bestH) { bestH = v; e = c; } }
    const g = graphemes(e.body);
    let p0 = 0;
    let bp = -1;
    phrases(e.body).forEach((p, k) => { const v = h(`${seed}:${r.id}:${e.id}:${k}`); if (v > bp) { bp = v; p0 = p.start; } });
    let gi = p0;
    for (const slot of r.cells) {
      let guard = 0;
      while (g[gi % g.length]!.text === ' ' && guard++ < g.length) gi++;
      const idx = gi % g.length;
      const k = `${e.id}:${idx}`;
      const copy = (copies.get(k) ?? 0) + 1;
      copies.set(k, copy);
      glyphs.push({ key: `${e.id}:${idx}:${copy}`, entryId: e.id, graphemeIndex: idx, sourceOffset: g[idx]!.offset, glyph: g[idx]!.text, role: 'echo', copyIndex: copy, run: r.id, slot });
      gi++;
    }
  }
  const open = glyphs.filter(gl => days > 0 && geo.slots[gl.slot]!.topMin >= top);
  const budget = fill === 'equal' && days > 0 ? a0Count(entries).drawn : Infinity;
  let active = open;
  if (open.length > budget) {
    const rank = (gl: LGlyph) => { const sl = geo.slots[gl.slot]!; return gl.role === 'anchor' ? -100 : RANK[sl.layer] * 10 + (sl.core ? 0 : 1) + h(`${seed}:keep:${gl.key}`); };
    const keep = new Set([...open].sort((a, b) => rank(a) - rank(b)).slice(0, budget));
    active = open.filter(gl => keep.has(gl));
  }
  return { shape, fill, seed, geo, entries, days, top, ledger, glyphs, active, budget: Number.isFinite(budget) ? budget : open.length, natural: open.length };
}

// ───────────────────────────── 4. motion plan ─────────────────────────────

export const MOTION = {
  reveal: { periodMin: 11, periodMax: 19, wave: 0.045 }, // M1: s · rad of phase per world unit along a band (outward wave)
  float: FLOAT,
  movingFraction: 0.06, travel: 4.2, dwell: 3.2, maxDist: 50, minDist: 9, lift: 5, // M3
  spark: { levels: 8, white: 0.55, opacityGain: 0.18, light: [-0.42, -0.5, 0.76] as const, glintShare: 0.08, glintPower: 26, glintMin: 6, glintMax: 11 }, // M4
} as const;
export type MotionOpts = { movingFraction: number; travel: number; dwell: number; maxDist: number; spark: number };
export const defaultMotionOpts = (): MotionOpts => ({ movingFraction: MOTION.movingFraction, travel: MOTION.travel, dwell: MOTION.dwell, maxDist: MOTION.maxDist, spark: 1 });

export type Mover = { glyph: number; from: number; to: number; cx: number; cy: number; phase: number; lift: number };
export type FPlan = {
  motion: FMotion; opts: MotionOpts; movers: Mover[]; moverOf: Int32Array; band: number[]; floaters: number[]; glints: number[];
  dynamic: Uint8Array; waves: Float64Array; // per glyph: [ω, φ] ×3 float axes, then reveal ω, φ, glint ω, φ
};
const W = 10;
function bez(a: number, c: number, b: number, u: number) { return (1 - u) * (1 - u) * a + 2 * u * (1 - u) * c + u * u * b; }
const ease = (u: number) => u * u * u * (u * (u * 6 - 15) + 10);

export function planMotion(st: FState, motion: FMotion, opts: MotionOpts = defaultMotionOpts()): FPlan {
  const n = st.active.length;
  const dynamic = new Uint8Array(n);
  const waves = new Float64Array(n * W);
  const moverOf = new Int32Array(n).fill(-1);
  const plan: FPlan = { motion, opts, movers: [], moverOf, band: [], floaters: [], glints: [], dynamic, waves };
  if (motion === 'M0') return plan;
  const S = st.geo.slots;
  const lvl = motion === 'M1' ? 1 : motion === 'M2' ? 2 : motion === 'M3' ? 3 : 4;
  if (lvl >= 3) {
    // drift: (a) an echo glyph travels to an EMPTY slot of the same arm and back; (b) two echo glyphs of the same arm
    // swap places along one curve, one passing in front (lift +), the other behind (lift −) → no hole in the silhouette
    const want = Math.round(opts.movingFraction * n);
    const occupied = new Set(st.active.map(g => g.slot));
    const joins = S.filter(s => (s.layer === 'texture' || s.layer === 'depth') && !occupied.has(s.i) && s.topMin >= st.top);
    const used = new Set<number>();
    const cands = st.active.map((g, i) => ({ g, i })).filter(({ g }) => g.role === 'echo' && S[g.slot]!.layer !== 'structure')
      .sort((a, b) => h(`${st.seed}:mover:${a.g.key}`) - h(`${st.seed}:mover:${b.g.key}`));
    const curve = (a: FSlot, b: FSlot) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const ux = Math.cos(armAngle(a.arm)), uy = Math.sin(armAngle(a.arm));
      const along = (mx - CX) * ux + (my - CY) * uy;
      return { cx: lerp(mx, CX + along * ux, 0.5), cy: lerp(my, CY + along * uy, 0.5) };
    };
    const take = (m: Mover) => { moverOf[m.glyph] = plan.movers.length; plan.movers.push(m); dynamic[m.glyph] = 1; };
    const near = (a: FSlot, b: FSlot) => { const d = Math.hypot(a.x - b.x, a.y - b.y); return b.arm === a.arm && d >= MOTION.minDist && d <= opts.maxDist; };
    for (const { g, i } of cands) {
      if (plan.movers.length >= want) break;
      const a = S[g.slot]!;
      if (a.orbit) continue;
      for (const j of joins.filter(j => !used.has(j.i) && near(a, j)).sort((p, q) => h(`${st.seed}:${g.key}:${p.i}`) - h(`${st.seed}:${g.key}:${q.i}`))) {
        const m: Mover = { glyph: i, from: a.i, to: j.i, ...curve(a, j), phase: h(`${st.seed}:phase:${g.key}`), lift: MOTION.lift };
        if (!pathOk(st, m)) continue;
        take(m); used.add(j.i); break;
      }
    }
    for (const { g, i } of cands) {
      if (plan.movers.length + 1 >= want) break;
      if (moverOf[i]! >= 0) continue;
      const a = S[g.slot]!;
      const partners = cands.filter(c => c.i !== i && moverOf[c.i]! < 0 && near(a, S[c.g.slot]!)).sort((p, q) => h(`${st.seed}:${g.key}:${p.g.key}`) - h(`${st.seed}:${g.key}:${q.g.key}`));
      for (const c of partners) {
        const b = S[c.g.slot]!;
        const k = curve(a, b);
        const phase = h(`${st.seed}:phase:${g.key}`);
        const m1: Mover = { glyph: i, from: a.i, to: b.i, ...k, phase, lift: MOTION.lift };
        const m2: Mover = { glyph: c.i, from: b.i, to: a.i, ...k, phase, lift: -MOTION.lift * 0.8 };
        if (!pathOk(st, m1) || !pathOk(st, m2)) continue;
        take(m1); take(m2); break;
      }
    }
  }
  st.active.forEach((g, i) => {
    const o = S[g.slot]!.orbit;
    if (!o || moverOf[i]! >= 0) return;
    plan.band.push(i);
    dynamic[i] = 1;
    const R = MOTION.reveal;
    const T = R.periodMin + h(`${st.seed}:rev:${o.band}`) * (R.periodMax - R.periodMin);
    waves[i * W + 6] = (2 * Math.PI) / T;
    waves[i * W + 7] = h(`${st.seed}:revp:${o.band}`) * 2 * Math.PI - R.wave * o.a; // phase wave running outward along the band
  });
  if (lvl >= 2) {
    st.active.forEach((g, i) => {
      const s = S[g.slot]!;
      if (moverOf[i]! >= 0 || s.layer === 'structure' || h(`${st.seed}:float:${s.group}`) >= FLOAT.share) return;
      plan.floaters.push(i);
      dynamic[i] = 1;
      for (let k = 0; k < 3; k++) { // one wave set per group → the group moves as one piece
        const T = FLOAT.periodMin + h(`${s.group}:fT${k}`) * (FLOAT.periodMax - FLOAT.periodMin);
        waves[i * W + k * 2] = (2 * Math.PI) / T;
        waves[i * W + k * 2 + 1] = h(`${s.group}:fP${k}`) * 2 * Math.PI;
      }
    });
  }
  if (lvl >= 4) {
    const sp = MOTION.spark;
    st.active.forEach((g, i) => {
      const s = S[g.slot]!;
      if (s.layer === 'structure' || s.orbit || moverOf[i]! >= 0 || h(`${st.seed}:glint:${g.key}`) >= sp.glintShare) return;
      plan.glints.push(i);
      dynamic[i] = 1;
      waves[i * W + 8] = (2 * Math.PI) / (sp.glintMin + h(`${g.key}:gT`) * (sp.glintMax - sp.glintMin));
      waves[i * W + 9] = h(`${g.key}:gP`) * 2 * Math.PI;
    });
  }
  return plan;
}

export function pathOk(st: FState, m: Mover) {
  const a = st.geo.slots[m.from]!, b = st.geo.slots[m.to]!;
  for (let k = 0; k <= 16; k++) {
    const u = k / 16;
    const x = bez(a.x, m.cx, b.x, u), y = bez(a.y, m.cy, b.y, u);
    if (!inCrystal(x, y, 4)) return false;
    if (topOf(y, lerp(a.z, b.z, u) + m.lift * Math.sin(Math.PI * u), lerp(a.size, b.size, u), 0) < st.top) return false;
  }
  return true;
}

export function moverU(m: Mover, t: number, opts: MotionOpts) {
  const cycle = 2 * (opts.dwell + opts.travel);
  const x = ((((t / cycle + m.phase) % 1) + 1) % 1) * cycle;
  if (x < opts.dwell) return { u: 0, flying: false };
  if (x < opts.dwell + opts.travel) return { u: ease((x - opts.dwell) / opts.travel), flying: true };
  if (x < 2 * opts.dwell + opts.travel) return { u: 1, flying: false };
  return { u: 1 - ease((x - 2 * opts.dwell - opts.travel) / opts.travel), flying: true };
}

// ───────────────────────────── pose (what the renderer draws) ─────────────────────────────

export type Pose = SFrame & { visible: boolean; spark: number }; // spark 0…1 = brightness (M4), quantised by the renderer
export const newPose = (): Pose => ({ ...newSFrame(), visible: true, spark: 0 });
export const OPACITY: Record<FLayer, number> = { structure: 1, band: 0.92, texture: 0.86, depth: 0.5 };
const LV = (() => { const [x, y, z] = MOTION.spark.light; const n = Math.hypot(x, y, z); return [x / n, y / n, z / n] as const; })();

/** opacity of a slot in its rest pose (orbit glyphs at their rest angle) */
export function restOpacity(s: FSlot) {
  if (!s.orbit) return OPACITY[s.layer] * s.shade;
  const c = Math.cos(s.orbit.th0);
  return OPACITY.band * s.shade * (0.3 + 0.7 * Math.pow((1 + c) / 2, 1.3));
}

function place(x: number, y: number, z: number, rot: number, size: number, squash: number, out: Pose) {
  const k = CAMERA / (CAMERA - z);
  out.x = CX + (x - CX) * k; out.y = CY + (y - CY) * k; out.z = z; out.k = k;
  const c = Math.cos(rot) * size * k, s = Math.sin(rot) * size * k;
  out.a = c; out.b = s; out.c = -s * squash; out.d = c * squash;
  return out;
}
/** band swing SWING_MIN (front-most) … 0 (rest) … 1 (farthest behind) and whether it is coming back to the front */
export function swing(plan: FPlan, i: number, t: number) {
  const ps = plan.waves[i * W + 6]! * t + plan.waves[i * W + 7]!;
  return { s: SWING_MIN + ((1 - SWING_MIN) * (1 - Math.cos(ps))) / 2, returning: Math.sin(ps) < 0 };
}

export function poseOf(st: FState, i: number, plan: FPlan, t: number, out: Pose): Pose {
  const g = st.active[i]!;
  const s = st.geo.slots[g.slot]!;
  const lvl = plan.motion === 'M0' ? 0 : +plan.motion[1]!;
  const w = plan.waves;
  out.visible = true;
  out.spark = 0;
  out.level = 0;
  let dx = 0, dy = 0, dz = 0;
  if (lvl >= 2 && plan.dynamic[i] && plan.moverOf[i]! < 0) {
    const o = i * W;
    dx = FLOAT.amp * 0.6 * Math.sin(w[o]! * t + w[o + 1]!);
    dy = FLOAT.amp * 0.8 * Math.sin(w[o + 2]! * t + w[o + 3]!);
    dz = 0.6 * Math.sin(w[o + 4]! * t + w[o + 5]!);
    if (!w[o]) dx = dy = dz = 0;
  }
  if (s.orbit) {
    const o = s.orbit;
    let th = o.th0;
    let sw = { s: 0, returning: false };
    if (lvl >= 1) { sw = swing(plan, i, t); th = lerp(o.th0, o.th1, sw.s); }
    const p = orbitAt(o, th);
    const c = Math.cos(th);
    place(p.x + dx, p.y + dy, p.z + dz, s.rot, s.size * (0.9 + 0.1 * c), 0.72 + 0.28 * Math.abs(c), out);
    out.opacity = OPACITY.band * s.shade * (0.3 + 0.7 * Math.pow((1 + c) / 2, 1.3)); // front bright · side dimmer · behind faint
    if (lvl >= 4) {
      const nrm = Math.sin(th); // surface normal of the orbit: lateral · n, depth · cos
      const nd = nrm * (o.nx * LV[0] + o.ny * LV[1]) + c * LV[2];
      const light = Math.pow(Math.max(0, nd), 6) * 0.8; // 1) light-facing
      const reveal = sw.returning ? Math.max(0, 1 - Math.abs(sw.s - 0.1) / 0.4) * 0.9 : 0; // 2) brighter as it comes back to the front
      out.spark = Math.min(1, Math.max(light, reveal * (c > 0 ? 1 : 0.4)) * plan.opts.spark);
    }
    return out;
  }
  const mi = plan.moverOf[i]!;
  if (mi >= 0 && lvl >= 3) {
    const mv = plan.movers[mi]!;
    const b = st.geo.slots[mv.to]!;
    const { u, flying } = moverU(mv, t, plan.opts);
    let dr = b.rot - s.rot;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    place(bez(s.x, mv.cx, b.x, u), bez(s.y, mv.cy, b.y, u), lerp(s.z, b.z, u) + mv.lift * Math.sin(Math.PI * u), s.rot + dr * u, lerp(s.size, b.size, u), 1, out);
    out.opacity = lerp(restOpacity(s), restOpacity(b), u) + (flying ? 0.1 * Math.sin(Math.PI * u) : 0);
    if (lvl >= 4 && flying) out.spark = Math.sin(Math.PI * u) * plan.opts.spark; // 3) a drifting piece is briefly highlighted
    return out;
  }
  place(s.x + dx, s.y + dy, s.z + dz, s.rot, s.size, 1, out);
  out.opacity = restOpacity(s);
  if (lvl >= 4 && w[i * W + 8]) out.spark = Math.pow(Math.max(0, Math.sin(w[i * W + 8]! * t + w[i * W + 9]!)), MOTION.spark.glintPower) * plan.opts.spark; // 4) rare glint
  return out;
}

// ───────────────────────────── metrics (automatic; NOT an aesthetic verdict) ─────────────────────────────

export function measureCrystal(st: FState) {
  const S = st.geo.slots;
  const act = st.active;
  const by = <K extends string>(f: (g: LGlyph) => K) => act.reduce((m, g) => { const k = f(g); m[k] = (m[k] ?? 0) + 1; return m; }, {} as Record<K, number>);
  const perArm = [0, 1, 2, 3, 4, 5].map(a => act.filter(g => S[g.slot]!.arm === a && !S[g.slot]!.core).length);
  const within = (r: number) => act.filter(g => Math.hypot(S[g.slot]!.x - CX, S[g.slot]!.y - CY) < r).length;
  let crowded = 0;
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = S[act[i]!.slot]!, b = S[act[j]!.slot]!;
    if (Math.abs(a.z - b.z) < 1.5 && Math.hypot(a.x - b.x, a.y - b.y) < 2.6 * (a.size + b.size)) crowded++;
  }
  const anchorWant = st.entries.reduce((n, e) => { const [a, b] = anchorRange(phrases(e.body)); return n + graphemes(e.body).slice(a, b).filter(g => g.text !== ' ').length; }, 0);
  return {
    shape: st.shape, fill: st.fill, days: st.days, entries: st.entries.length, drawn: act.length, natural: st.natural, budget: st.budget,
    slotsTotal: S.length, bandSlots: S.filter(s => s.orbit).length, joinSlots: S.filter(s => s.join).length,
    anchorsDrawn: act.filter(g => g.role === 'anchor').length, anchorGlyphsWanted: anchorWant, anchorsPlaced: st.ledger.size,
    echoDrawn: act.filter(g => g.role === 'echo').length, byLayer: by(g => S[g.slot]!.layer),
    perArm, armBalance: Math.round((Math.min(...perArm) / Math.max(1, Math.max(...perArm))) * 100) / 100,
    coreR: CORE_R, withinCore: within(CORE_R), withinR20: within(20), crowdedPairs: crowded,
    distinctSourceGraphemesDrawn: new Set(act.map(g => `${g.entryId}:${g.graphemeIndex}`)).size, maxCopyIndex: Math.max(0, ...act.map(g => g.copyIndex)),
    revealTop: Math.round(st.top * 10) / 10, revealFraction: Math.round(((Y_BOTTOM - st.top) / (Y_BOTTOM - Y_TOP)) * 1000) / 1000, targetDays: TARGET_DAYS,
  };
}

/** What changed between two states (b built with prev = a.ledger). Anchors of OTHER entries must not move. */
export function diffCrystal(a: FState, b: FState, target: string | null) {
  const at = new Map(a.active.map(g => [g.slot, g]));
  const changed = new Set<number>();
  b.active.forEach((g, i) => { const o = at.get(g.slot); if (!o || o.entryId !== g.entryId || o.graphemeIndex !== g.graphemeIndex || o.glyph !== g.glyph || o.role !== g.role) changed.add(i); });
  const anchorsOf = (s: FState) => { const m = new Map<string, string>(); for (const g of s.glyphs) if (g.role === 'anchor') m.set(g.entryId, `${m.get(g.entryId) ?? ''}|${g.slot}:${g.graphemeIndex}`); return m; };
  const A = anchorsOf(a), B = anchorsOf(b);
  let anchorMovedOther = 0;
  for (const [id, v] of A) if (id !== target && B.has(id) && B.get(id) !== v) anchorMovedOther++;
  return {
    changed, changedCount: changed.size, removedCount: a.active.filter(g => !b.active.some(x => x.slot === g.slot)).length, anchorMovedOther,
    newAnchorGlyphs: b.active.filter((g, i) => changed.has(i) && g.role === 'anchor').length,
    echoChanged: [...changed].filter(i => b.active[i]!.role === 'echo').length, topBefore: a.top, topAfter: b.top,
  };
}

