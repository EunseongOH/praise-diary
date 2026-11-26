/**
 * Gate 2G — Foreground Text Rotation study. Dev-only, pure, deterministic. Adapter over Gate 2F F2 (imported, never
 * modified): same shape, same slots, same anchor ledger, same echo rules, same growth boundary. Only the POSE layer is new.
 *
 * Identity vs pose: a glyph keeps entryId · graphemeIndex · copyIndex · slot (= anchor slot) forever; what changes with
 * time is worldPose(glyph, t) → projected pose. On every reading line (spine, branches, outer-hex edge) the glyphs sit
 * on STRANDS that turn around the line's own axis (axis = the representative line of Gate 2E/2F):
 *   lateral = R·sinθ (along the line normal) · depth z = zFront − Rz·(1 − cosθ) · θ = ωt + φ_arm − 2πk/N − twist·r
 *   θ = 0 → the strand lies exactly on the representative line, in front, white; θ = π → straight behind it, dim, hidden
 *   by the front glyphs' halo (real painter's order + destination-out occlusion in the renderer).
 * Variants:
 *   R0 = Gate 2F F2 M1 (or M4) verbatim: representative line fixed, only auxiliary bands move (problem reference).
 *   R1 = R0 + the representative strand itself turns (N = 1): white text leaves its place, goes behind, comes back.
 *   R2 = the 2F auxiliary bands of reading lines are replaced by N−1 more strands on the SAME axis with OTHER real
 *        phrases (other entries, provenance kept), phase-shifted 2π/N → the strand in front changes A → B → C → A.
 *   R3 = R2 + Gate 2F group float, echo drift and glints on the non-strand glyphs (2F planMotion M4, imported).
 * Brightness / whiteness follow the CURRENT depth (cosθ), never the role: an echo strand in front is white, the anchor
 * strand behind is grey. Glyphs are billboarded (reading direction kept, never mirrored): perpendicular squash only.
 * Every number is a [연구안] starting value, not approved art.
 */
import { graphemes } from '../../engine';
import { CAMERA, type Entry } from '../multiHelix/engine';
import { CX, CY } from '../fullSnowflake/engine';
import { phrases, type Dataset } from '../adaptiveSnowflake/engine';
import { EXT, STROKES, h, type Change, type Kind, type LGlyph, type Ledger } from '../livingTypography/engine';
import {
  buildCrystal, changeEntries, crystalEntries, newPose, planMotion, poseOf,
  type FMotion, type FPlan, type FSlot, type FState, type Pose,
} from '../layeredCrystal/engine';

export const ART_VERSION = 'foreground-rotation-v0.1';
export type RVariant = 'R0' | 'R1' | 'R2' | 'R3';
export const VARIANTS: RVariant[] = ['R0', 'R1', 'R2', 'R3'];
/** fake = deliberately WRONG implementations used only by the negative tests (never offered as a design option) */
export type Fake = 'none' | 'alpha' | 'fixed';
export type ROpts = { period: number; layers: 2 | 3; twist: number; radius: number; r0: 'M1' | 'M4'; fake: Fake; still: boolean };
export const defaultROpts = (): ROpts => ({ period: 20, layers: 3, twist: 0.8, radius: 1, r0: 'M1', fake: 'none', still: false });
export { crystalEntries as rotationEntries, changeEntries, newPose, type Change, type Dataset, type Pose };

/** [연구안] strand orbit: lateral radius R (inner → outer end of the line), depth amplitude Rz, look of the depth cue */
export const STRAND = {
  R: { spine: [6.4, 4.2], branch: [4.4, 3.2], hex: [3.8, 3.8] } as Record<string, [number, number]>,
  Rz: { spine: 6, branch: 4.5, hex: 4 } as Record<string, number>,
  depthSize: 0.16, // size × (1 − depthSize · (1 − cosθ)/2): smaller when behind (local perspective cue)
  squashMin: 0.5, // perpendicular squash at the side (|cosθ| = 0) — billboard, never mirrored
  opacityMin: 0.14, opacityGamma: 1.3, // opacity = min + (1 − min) · f^γ, f = (1 + cosθ)/2
  whiteGamma: 3, // whiteness (INK → white, quantised by the renderer) = f^γ
  samples: 72, margin: 0.3, // orbit samples + safety margin (world units) for the growth-boundary check
} as const;
/** arm phase offsets (fraction of a turn) — golden-ratio spread, so no two arms exchange at the same moment */
export const armPhase = (arm: number) => 2 * Math.PI * (((arm * 0.381966) % 1) + 1) % (2 * Math.PI);

export type Strand = { id: string; line: string; stroke: string; arm: number; kind: Kind; k: number; n: number; cells: number[]; source: 'line' | 'band2F' | 'strand' };
/** per slot orbit of a strand glyph */
export type Orb = { ox: number; oy: number; oz: number; nx: number; ny: number; R: number; Rz: number; amp: number; ph: number; strand: number; k: number };
export type RState = {
  variant: RVariant; opts: ROpts; base: FState; st: FState; plan: FPlan; strands: Strand[]; orb: (Orb | null)[];
  strandOfGlyph: Int32Array; dynamic: Uint8Array; omega: number; lines: string[];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const topOf = (y: number, z: number, size: number) => { const k = CAMERA / (CAMERA - z); return CY + (y - CY) * k - EXT * size * k; };
const strokeById = new Map(STROKES.map(s => [s.id, s]));

function orbitPoint(o: Orb, th: number, amp: number) {
  const c = Math.cos(th);
  const lat = o.R * Math.sin(th) * amp;
  return { x: o.ox + o.nx * lat, y: o.oy + o.ny * lat, z: o.oz - o.Rz * (1 - c) * amp, c: 1 - amp * (1 - c) };
}
function orbitTop(o: Orb, size: number, amp: number) {
  let top = Infinity;
  for (let q = 0; q < STRAND.samples; q++) {
    const p = orbitPoint(o, (2 * Math.PI * q) / STRAND.samples, amp);
    top = Math.min(top, topOf(p.y, p.z, size * (1 - STRAND.depthSize * (1 - p.c) / 2)));
  }
  return top - STRAND.margin;
}

/** Build one variant. R0/R1 render the 2F state itself; R2/R3 render 2F minus the auxiliary bands of reading lines plus
 *  the new co-axial strands. The anchor ledger is ALWAYS the 2F one (= Gate 2E A2), so representative text keeps its slots. */
export function buildRotation(variant: RVariant, entries: Entry[], o: Partial<ROpts> & { prev?: Ledger; seed?: string } = {}): RState {
  const opts: ROpts = { ...defaultROpts(), ...o };
  const seed = o.seed ?? 'v1';
  const base = buildCrystal('F2', entries, { prev: o.prev, seed });
  const G = base.geo;
  const omega = (2 * Math.PI) / opts.period;
  const lines = G.lines.map(l => l.id);
  const n = variant === 'R2' || variant === 'R3' ? opts.layers : 1;

  // which slots / glyphs survive, plus the new strand slots
  const slots: FSlot[] = [...G.slots];
  const orb: (Orb | null)[] = new Array(slots.length).fill(null);
  const strands: Strand[] = [];
  const dropBand = new Set<number>(); // 2F auxiliary band slots replaced by strands (R2/R3)
  const newGlyphs: LGlyph[] = [];
  const copies = new Map<string, number>();
  for (const g of base.glyphs) { const k = `${g.entryId}:${g.graphemeIndex}`; copies.set(k, Math.max(copies.get(k) ?? 0, g.copyIndex)); }
  const pool = entries.filter(e => graphemes(e.body).some(x => x.text !== ' '));
  const glyphsBySlot = new Map(base.glyphs.map(g => [g.slot, g]));

  for (const line of G.lines) {
    const stroke = strokeById.get(G.slots[line.cells[0]!]!.stroke)!;
    const kind = line.kind === 'spine' ? 'spine' : line.kind === 'branch' ? 'branch' : 'hex';
    let nx = -stroke.dy, ny = stroke.dx;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl; ny /= nl;
    if (nx * (stroke.x0 - CX) + ny * (stroke.y0 - CY) < 0 && kind === 'hex') { nx = -nx; ny = -ny; }
    const [R0, R1] = STRAND.R[kind]!;
    const Rz = STRAND.Rz[kind]! * opts.radius;
    const m = line.cells.length;
    const mkOrb = (cell: FSlot, j: number, k: number, strand: number): Orb => {
      const r = Math.hypot(cell.x - CX, cell.y - CY);
      const ph = armPhase(cell.arm) - (2 * Math.PI * k) / n - (opts.twist * r) / 100;
      return { ox: cell.x, oy: cell.y, oz: cell.z, nx, ny, R: lerp(R0, R1, m > 1 ? j / (m - 1) : 0) * opts.radius, Rz, amp: 1, ph, strand, k };
    };
    // strand A = the representative line cells themselves (anchors + 2F echo fill)
    const A: Strand = { id: `${line.id}:s0`, line: line.id, stroke: stroke.id, arm: line.arm, kind: line.kind, k: 0, n, cells: [...line.cells], source: 'line' };
    strands.push(A);
    if (variant !== 'R0') {
      line.cells.forEach((c, j) => {
        const s = G.slots[c]!;
        const ob = mkOrb(s, j, 0, strands.length - 1);
        // growth boundary: the representative strand may not leave the open region → shrink its orbit where needed
        if (orbitTop(ob, s.size, 1) < base.top) { let lo = 0, hi = 1; for (let it = 0; it < 12; it++) { const mid = (lo + hi) / 2; if (orbitTop(ob, s.size, mid) >= base.top) lo = mid; else hi = mid; } ob.amp = lo; }
        orb[c] = ob;
      });
    }
    // other layers on this axis: 2F auxiliary bands (R0/R1) or new strands with other real phrases (R2/R3)
    const bands = G.bands.filter(b => b.stroke === stroke.id);
    if (n === 1) {
      bands.forEach((b, k) => strands.push({ id: `${line.id}:b${k}`, line: line.id, stroke: stroke.id, arm: line.arm, kind: line.kind, k: k + 1, n: 1, cells: [...b.cells], source: 'band2F' }));
      continue;
    }
    for (const b of bands) for (const c of b.cells) dropBand.add(c);
    if (!pool.length) continue; // no diary yet (day 0): nothing to write on the extra strands
    const usedEntries = new Set(line.cells.map(c => glyphsBySlot.get(c)?.entryId).filter((x): x is string => !!x));
    for (let k = 1; k < n; k++) {
      let cand = pool.filter(e => !usedEntries.has(e.id));
      if (!cand.length) cand = pool;
      let e = cand[0]!;
      let best = -1;
      for (const c of cand) { const v = h(`${seed}:${ART_VERSION}:strand:${line.id}:${k}:${c.id}`); if (v > best) { best = v; e = c; } }
      usedEntries.add(e.id);
      const g = graphemes(e.body);
      let q = 0, bp = -1;
      phrases(e.body).forEach((p, w) => { const v = h(`${seed}:${line.id}:${k}:${e.id}:${w}`); if (v > bp) { bp = v; q = p.start; } });
      // text = the real phrase in reading order; spaces stay empty cells, wrapping to the body start leaves one empty cell
      let wrap = false;
      const next = () => { if (wrap) { wrap = false; return -1; } const v = q++; if (q >= g.length) { q = 0; wrap = true; } return v; };
      const st: Strand = { id: `${line.id}:s${k}`, line: line.id, stroke: stroke.id, arm: line.arm, kind: line.kind, k, n, cells: [], source: 'strand' };
      strands.push(st);
      let prevEmpty = true;
      line.cells.forEach((c, j) => {
        const a = G.slots[c]!;
        const slot: FSlot = { ...a, i: slots.length, layer: 'structure', join: false, group: '', orbit: undefined, topMin: 0 };
        const ob = mkOrb(a, j, k, strands.length - 1);
        slot.topMin = orbitTop(ob, a.size, 1);
        slots.push(slot);
        orb.push(ob);
        st.cells.push(slot.i);
        let idx = next();
        const empty = (x: number) => x < 0 || g[x]!.text === ' ';
        while (empty(idx) && prevEmpty) idx = next(); // no leading / double gaps
        if (empty(idx)) { prevEmpty = true; return; }
        prevEmpty = false;
        const key = `${e.id}:${idx}`;
        const copy = (copies.get(key) ?? 0) + 1;
        copies.set(key, copy);
        newGlyphs.push({ key: `${e.id}:${idx}:${copy}`, entryId: e.id, graphemeIndex: idx, sourceOffset: g[idx]!.offset, glyph: g[idx]!.text, role: 'echo', copyIndex: copy, run: st.id, slot: slot.i });
      });
    }
  }

  const glyphs = [...base.glyphs.filter(g => !dropBand.has(g.slot)), ...newGlyphs];
  const active = [...base.active.filter(g => !dropBand.has(g.slot)), ...newGlyphs.filter(g => base.days > 0 && slots[g.slot]!.topMin >= base.top)];
  const geo = { ...G, slots, bands: n === 1 ? G.bands : G.bands.filter(b => !b.cells.some(c => dropBand.has(c))) };
  const st: FState = { ...base, geo, glyphs, active, natural: active.length, budget: active.length };
  const motion: FMotion = variant === 'R0' ? opts.r0 : variant === 'R1' ? 'M1' : variant === 'R3' ? 'M4' : 'M0';
  const plan = planMotion(st, opts.still ? 'M0' : motion);
  const strandOfSlot = new Int32Array(slots.length).fill(-1);
  strands.forEach((s, q) => s.cells.forEach(c => { strandOfSlot[c] = q; }));
  const strandOfGlyph = Int32Array.from(active, g => strandOfSlot[g.slot]!);
  const dynamic = Uint8Array.from(active, (g, i) => (opts.still ? 0 : plan.dynamic[i]! || (orb[g.slot] ? 1 : 0)));
  return { variant, opts, base, st, plan, strands, orb, strandOfGlyph, dynamic, omega, lines };
}

function place(x: number, y: number, z: number, rot: number, size: number, squash: number, out: Pose) {
  const k = CAMERA / (CAMERA - z);
  out.x = CX + (x - CX) * k; out.y = CY + (y - CY) * k; out.z = z; out.k = k;
  const c = Math.cos(rot) * size * k, s = Math.sin(rot) * size * k;
  out.a = c; out.b = s; out.c = -s * squash; out.d = c * squash;
  return out;
}

/** strand angle θ of an orbit at time t (still → the canonical pose: strand A in front everywhere) */
export function thetaOf(rs: RState, o: Orb, t: number) {
  return rs.opts.still ? (-2 * Math.PI * o.k) / rs.opts.layers : rs.omega * t + o.ph;
}

/** what the renderer draws for active glyph i at time t */
export function poseAt(rs: RState, i: number, t: number, out: Pose): Pose {
  const g = rs.st.active[i]!;
  const o = rs.orb[g.slot];
  if (!o) return poseOf(rs.st, i, rs.plan, t, out);
  const s = rs.st.geo.slots[g.slot]!;
  const th = thetaOf(rs, o, t);
  const p = orbitPoint(o, th, o.amp);
  const f = (1 + p.c) / 2; // frontness 0 (behind) … 1 (in front, on the representative line)
  out.visible = true; out.level = 0;
  if (rs.opts.fake === 'alpha' || (rs.opts.fake === 'fixed' && o.k === 0)) {
    // NEGATIVE-TEST FAKES: 'alpha' = every strand parked on the same 2D place, only opacity swapped;
    // 'fixed' = strand A stays a static white overlay while the other strands turn
    place(o.ox, o.oy, o.oz, s.rot, s.size, 1, out);
    const ff = rs.opts.fake === 'fixed' ? 1 : f;
    out.opacity = STRAND.opacityMin + (1 - STRAND.opacityMin) * Math.pow(ff, STRAND.opacityGamma);
    out.spark = Math.pow(ff, STRAND.whiteGamma);
    return out;
  }
  place(p.x, p.y, p.z, s.rot, s.size * (1 - (STRAND.depthSize * (1 - p.c)) / 2), 1 - (1 - STRAND.squashMin) * (1 - Math.abs(p.c)), out);
  out.opacity = STRAND.opacityMin + (1 - STRAND.opacityMin) * Math.pow(f, STRAND.opacityGamma);
  out.spark = Math.pow(f, STRAND.whiteGamma); // whiteness by depth (renderer quantises it like the 2F sparkle)
  return out;
}

// ───────────────────────────── evidence & metrics (automatic; NOT an aesthetic verdict) ─────────────────────────────

/** longest run of consecutive source graphemes of one entry on a strand → its readable phrase id */
export function phraseOf(rs: RState, strand: Strand) {
  const bySlot = new Map(rs.st.glyphs.map(g => [g.slot, g]));
  let best = { entryId: '', from: 0, to: 0, len: 0 };
  let cur = { entryId: '', from: 0, to: 0, len: 0 };
  for (const c of strand.cells) {
    const g = bySlot.get(c);
    if (!g) { continue; }
    if (g.entryId === cur.entryId && g.graphemeIndex > cur.to && g.graphemeIndex <= cur.to + 2) { cur.to = g.graphemeIndex; cur.len++; }
    else cur = { entryId: g.entryId, from: g.graphemeIndex, to: g.graphemeIndex, len: 1 };
    if (cur.len > best.len) best = { ...cur };
  }
  return { id: best.len ? `${best.entryId}@${best.from}-${best.to}` : '', ...best };
}

/** a glyph counts as "white front text" when drawn at ≥ WHITE opacity (2F structure = 1, 2F texture 0.86, 2F band ≤ 0.85) */
export const WHITE = 0.9;
export const AXIS = 3;
export const LEGIBLE = 0.55;
export type StrandSample = {
  id: string; k: number; source: Strand['source']; drawn: number; zMean: number; lateral: number; opacityMean: number; whiteMean: number;
  cx: number; cy: number; bbox: [number, number, number, number]; bright: number; legible: number; phrase: string; anchors: number;
};
export type LineSample = { t: number; strands: StrandSample[]; frontStrand: string; frontPhrase: string; occupancyBright: number; occupancyLegible: number };

/** Measured from the actual poses (what is drawn), not from θ or roles: front = strand with the highest mean depth. */
export function sampleLine(rs: RState, line: string, t: number): LineSample {
  const pose = newPose();
  const ss = rs.strands.filter(s => s.line === line);
  const byStrand = new Map<number, number[]>();
  rs.strandOfGlyph.forEach((q, i) => { if (q >= 0 && rs.strands[q]!.line === line) { const a = byStrand.get(q) ?? []; a.push(i); byStrand.set(q, a); } });
  const out: StrandSample[] = [];
  const posBright = new Map<number, number>(); // line position j → best opacity
  const A = ss[0]!;
  for (const s of ss) {
    const q = rs.strands.indexOf(s);
    const idx = byStrand.get(q) ?? [];
    let z = 0, op = 0, wh = 0, cx = 0, cy = 0, bright = 0, leg = 0, anchors = 0, lat = 0;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const i of idx) {
      const f = poseAt(rs, i, t, pose);
      z += f.z; op += f.opacity; wh += f.spark; cx += f.x; cy += f.y;
      const sl = rs.st.geo.slots[rs.st.active[i]!.slot]!;
      const ax = rs.orb[sl.i] ?? (sl.orbit ? { ox: sl.orbit.ox, oy: sl.orbit.oy } : { ox: sl.x, oy: sl.y }); // the glyph's point on the line axis
      const kk = CAMERA / (CAMERA - (rs.orb[sl.i]?.oz ?? sl.z));
      lat += Math.hypot(f.x - (CX + (ax.ox - CX) * kk), f.y - (CY + (ax.oy - CY) * kk));
      const r = Math.hypot(f.a, f.b) * 4;
      x0 = Math.min(x0, f.x - r); y0 = Math.min(y0, f.y - r); x1 = Math.max(x1, f.x + r); y1 = Math.max(y1, f.y + r);
      if (f.opacity >= WHITE) bright++;
      if (f.opacity >= LEGIBLE) leg++;
      if (rs.st.active[i]!.role === 'anchor') anchors++;
      const j = s.source === 'band2F' ? -1 : s.cells.indexOf(rs.st.active[i]!.slot);
      if (j >= 0) posBright.set(j, Math.max(posBright.get(j) ?? 0, f.opacity));
    }
    const d = Math.max(1, idx.length);
    const r2 = (v: number) => Math.round(v * 100) / 100;
    out.push({ id: s.id, k: s.k, source: s.source, drawn: idx.length, zMean: r2(z / d), lateral: r2(lat / d), opacityMean: r2(op / d), whiteMean: r2(wh / d), cx: r2(cx / d), cy: r2(cy / d),
      bbox: idx.length ? [r2(x0), r2(y0), r2(x1), r2(y1)] : [0, 0, 0, 0], bright, legible: leg, phrase: phraseOf(rs, s).id, anchors });
  }
  // front = the strand with the highest mean depth, and only if it lies ON the axis (mean lateral offset < AXIS units =
  // the representative line's place); otherwise '' (the axis is between two strands at that instant). Ties keep the
  // earlier strand → a fake that never moves strand A can never hand the front over.
  const live = out.filter(s => s.drawn > 0);
  const top = live.reduce<StrandSample | null>((b, s) => (!b || s.zMean > b.zMean + 0.05 ? s : b), null);
  const front = top && top.lateral < AXIS ? top : null;
  const positions = A.cells.length;
  let ob = 0, ol = 0;
  for (let j = 0; j < positions; j++) { const v = posBright.get(j) ?? 0; if (v >= WHITE) ob++; if (v >= LEGIBLE) ol++; }
  return { t, strands: out, frontStrand: front?.id ?? '', frontPhrase: front?.phrase ?? '', occupancyBright: Math.round((ob / Math.max(1, positions)) * 100) / 100, occupancyLegible: Math.round((ol / Math.max(1, positions)) * 100) / 100 };
}

/** The exchange test used by logic + browser tests and the review: does the white front text itself move back while a
 *  DIFFERENT real strand comes to the front? Fails for R0, for the 'alpha' and 'fixed' fakes, and for a frozen strand A. */
export function exchangeEvidence(rs: RState, line: string, times: number[]) {
  const samples = times.map(t => sampleLine(rs, line, t));
  const firstFront = samples[0]!.frontStrand;
  const of = (s: LineSample, id: string) => s.strands.find(x => x.id === id)!;
  const a = samples.map(s => of(s, firstFront));
  const range = (v: number[]) => Math.max(...v) - Math.min(...v);
  const zRange = range(a.map(x => x.zMean));
  const move = Math.max(...a.map(x => Math.hypot(x.cx - a[0]!.cx, x.cy - a[0]!.cy)));
  const opacityRange = range(a.map(x => x.opacityMean));
  const fronts = samples.map(s => s.frontStrand);
  const distinct = [...new Set(fronts.filter(Boolean))]; // '' = nothing on the axis at that instant (reported, not a strand)
  let switches = 0;
  for (let k = 1; k < fronts.length; k++) if (fronts[k] !== fronts[k - 1]) switches++;
  // a moment where the first front strand is dim AND behind, while another strand is bright AND in front
  const handover = samples.some(s => { if (!s.frontStrand) return false; const f = of(s, s.frontStrand); const o = of(s, firstFront); return s.frontStrand !== firstFront && o.opacityMean < 0.5 && f.opacityMean >= 0.75 && f.zMean > o.zMean + 1; });
  // another strand takes the front place: 'front' already requires lying ON the axis, i.e. on the cells the first
  // front strand occupied at t0 (same anchor-line axis points), so a different non-empty front id = takeover
  const takeover = samples.some(s => !!s.frontStrand && s.frontStrand !== firstFront);
  const brightFollowsDepth = samples.every(s => { const live = s.strands.filter(x => x.drawn); const byZ = [...live].sort((p, q) => q.zMean - p.zMean)[0]!; const byO = [...live].sort((p, q) => q.opacityMean - p.opacityMean)[0]!; return byZ.id === byO.id || Math.abs(byZ.opacityMean - byO.opacityMean) < 0.05; });
  const passes = !!firstFront && zRange >= 2 && move >= 1.5 && opacityRange >= 0.4 && distinct.length >= 2 && handover && takeover && brightFollowsDepth;
  return { line, firstFront, fronts, distinct, switches, zRange: Math.round(zRange * 100) / 100, move: Math.round(move * 100) / 100, opacityRange: Math.round(opacityRange * 100) / 100, handover, takeover, brightFollowsDepth, passes, samples };
}

/** times at which strand k of a line is exactly in front (θ ≡ 0) at the line's first cell, within [0, period) */
export function frontTimes(rs: RState, line: string) {
  return rs.strands.filter(s => s.line === line && s.source !== 'band2F').map(s => {
    const o = rs.orb[s.cells[Math.floor(s.cells.length / 2)]!];
    if (!o) return { id: s.id, t: NaN };
    const T = rs.opts.period;
    return { id: s.id, t: ((((-o.ph / rs.omega) % T) + T) % T) };
  });
}

/** whole-flake numbers per instant: white front glyphs, per-arm front-strand turnover, glyph counts */
export function measureRotation(rs: RState, times: number[]) {
  const pose = newPose();
  const S = rs.st.geo.slots;
  const n = rs.st.active.length;
  const white = times.map(t => { let w = 0; for (let i = 0; i < n; i++) if (poseAt(rs, i, t, pose).opacity >= WHITE) w++; return w; });
  const whiteOnLines = times.map(t => { let w = 0; for (let i = 0; i < n; i++) { const q = rs.strandOfGlyph[i]!; if (q >= 0 && poseAt(rs, i, t, pose).opacity >= WHITE) w++; } return w; });
  const restWhite = (() => { let w = 0; for (let i = 0; i < n; i++) { const q = rs.strandOfGlyph[i]!; if (q >= 0 && S[rs.st.active[i]!.slot]!.layer === 'structure') w++; } return w; })();
  const turnover = rs.lines.map(line => { const fr = times.map(t => sampleLine(rs, line, t).frontStrand).filter(Boolean); return { line, distinct: new Set(fr).size }; });
  const perArm = [0, 1, 2, 3, 4, 5].map(a => { const ls = turnover.filter(x => x.line.startsWith(`a${a}-`)); return { arm: a, lines: ls.length, exchanging: ls.filter(x => x.distinct >= 2).length }; });
  const occ = rs.lines.map(line => times.map(t => sampleLine(rs, line, t))).flat();
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    variant: rs.variant, drawn: n, dynamic: rs.dynamic.reduce((a, v) => a + v, 0), strandGlyphs: [...rs.strandOfGlyph].filter(q => q >= 0 && rs.strands[q]!.source !== 'band2F').length,
    anchors: rs.st.active.filter(g => g.role === 'anchor').length, whiteFront: { min: Math.min(...white), max: Math.max(...white), mean: Math.round(white.reduce((a, b) => a + b, 0) / white.length) },
    whiteOnLines: { min: Math.min(...whiteOnLines), max: Math.max(...whiteOnLines), mean: Math.round(whiteOnLines.reduce((a, b) => a + b, 0) / whiteOnLines.length), lineCellsPerLayer: restWhite },
    linesWithFrontTurnover: turnover.filter(x => x.distinct >= 2).length, lines: turnover.length, perArm,
    occupancyBright: { min: r2(Math.min(...occ.map(o => o.occupancyBright))), mean: r2(occ.reduce((a, o) => a + o.occupancyBright, 0) / occ.length) },
    occupancyLegible: { min: r2(Math.min(...occ.map(o => o.occupancyLegible))), mean: r2(occ.reduce((a, o) => a + o.occupancyLegible, 0) / occ.length) },
  };
}

/** a glyph's projected top edge (bounding radius, any rotation — same rule as Gate 2E/2F topMin) and mirror check */
export function glyphTop(f: Pose) { return f.y - EXT * Math.hypot(f.a, f.b); }
export function mirrored(f: Pose) { return f.a * f.d - f.b * f.c <= 0; }
