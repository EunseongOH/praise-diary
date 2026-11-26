/**
 * Gate 2E — Living Typography Sculpture, shape-first study (docs/decisions/25 v1.0). Dev-only, pure, deterministic.
 *
 * SHAPE FIRST: the target crystal is DATA — a list of strokes (hex core rings, six arms, side branches, sprigs, root and
 * tip plates), each a tapered capsule with half-width w, glyph size s and relief height z along it. Every stroke lies on
 * one of the three directions of a hexagonal crystal lattice. Glyph SLOTS are then derived from that shape:
 *   A1 shape-field: lattice points (step LATTICE) inside the stroke mask. Size shrinks toward a stroke's edge, z follows
 *      a ridge (centre high), the grain follows the stroke direction. Centre-line points of reading strokes = structure.
 *   A2 hybrid: same mask/silhouette. Structure = continuous text paths on the stroke centre lines (spaced by glyph
 *      advance); the rest of the mask is distributed to free elements: knot clusters at branch roots (마디), a deeper
 *      back layer inside the plates, rosettes at the arm tips, micro sprigs, and on each arm two short helix sleeves
 *      (the Gate 2A–2D helix projection, reused as-is via projectSculpt) — the only glyphs that can rotate.
 * TEXT: anchors (copyIndex 0) = phrase-bounded prefix of each entry on a reading line, append-only ledger, placed in the
 * region that was open when the entry was written, never moved by other entries. Echo = real phrases repeated in the
 * remaining slots (rendezvous hash per run → stable-ish), entryId + grapheme index + copyIndex on every instance.
 * GROWTH: Gate 2B boundary (distinct entryDate count / 15, bottom → top). A slot is shown only if its box stays below
 * the boundary in every pose it can take (helix angles, float margin); movers additionally check their whole path.
 * MOTION (M0–M3) is a separate plan on top of a state; it never changes which glyphs exist or where they rest.
 * All numbers are [연구안] starting values, not approved art.
 */
import { graphemes } from '../../engine';
import { CAMERA, CULL, type Entry } from '../multiHelix/engine';
import { CX, CY, FONT, TARGET_DAYS, Y_BOTTOM, Y_TOP, ZERO, revealTop } from '../fullSnowflake/engine';
import { adaptiveEntries, anchorRange, distinctDays, phrases, type Dataset } from '../adaptiveSnowflake/engine';
import { C2, buildSculpt, newSFrame, projectSculpt, type SFrame, type SGlyph, type STrack } from '../sculpturalSnowflake/engine';

export const ART_VERSION = 'living-typography-v0.1';
export type Shape = 'A1' | 'A2';
export type Fill = 'equal' | 'front' | 'natural'; // equal = A0 drawn total · front = A0 glyphs actually facing the viewer at 0° · natural = every open slot
export type Motion = 'M0' | 'M1' | 'M2' | 'M3';
export { adaptiveEntries as livingEntries, distinctDays, type Dataset };

const RAD = Math.PI / 180;
export const EXT = 0.75 * FONT; // glyph bounding radius at size 1 (any rotation) = Gate 2B EXTENT
export const LATTICE = 6; // crystal lattice step (world units of the 300×300 view)
const SQ3 = Math.sqrt(3) / 2;

export function h(text: string): number {
  let x = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 0x01000193);
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ───────────────────────────── target shape (data) ─────────────────────────────

export type Kind = 'nucleus' | 'core' | 'hex' | 'spine' | 'plate' | 'branch' | 'sprig' | 'tip';
/** arm-local stroke: u along the arm (outward), v across it (+v toward the next arm). w = half-width of the mask. */
type Local = { id: string; kind: Kind; u0: number; v0: number; u1: number; v1: number; w0: number; w1: number; s0: number; s1: number; z0: number; z1: number; line?: boolean; ridge?: number };
export type Stroke = Omit<Local, 'u0' | 'v0' | 'u1' | 'v1'> & { arm: number; x0: number; y0: number; x1: number; y1: number; dx: number; dy: number; len: number };

const L = LATTICE;
/** [연구안] the crystal. Branch roots / lengths are lattice multiples so every centre line passes through lattice points. */
export const SHAPE = {
  nucleus: { s: 0.78, z: 5 },
  rosette: { r: L, s: 0.56, z: 4.4 },
  innerHex: { r: 3 * L, s: 0.62, z: 3.4 },
  outerHex: { r: 6 * L, s: 0.74, z: 2.6 },
  spokes: [2 * L, 4 * L],
  spine: { u0: 7 * L, u1: 21 * L, s0: 1.0, s1: 0.72, z0: 3.6, z1: 1.8 },
  rootPlate: { u0: 6.5 * L, u1: 9 * L, w0: 8.5, w1: 3, s0: 0.8, s1: 0.7 },
  tipPlate: { u: 20 * L, w: 6.2, len: 1.2 * L },
  branches: [ // root (u), length in lattice steps, start size
    { root: 9 * L, n: 3, s: 0.8 },
    { root: 12 * L, n: 5, s: 0.86 },
    { root: 15 * L, n: 4, s: 0.78 },
    { root: 17 * L, n: 2, s: 0.66 },
  ],
  sprigs: [{ branch: 1, at: 2, n: 1 }, { branch: 1, at: 4, n: 1 }, { branch: 2, at: 2, n: 1 }],
} as const;

function armLocal(): Local[] {
  const S = SHAPE;
  const out: Local[] = [];
  // spine + root plate (wide, several lattice rows) + tip plate
  out.push({ id: 'spine', kind: 'spine', u0: S.spine.u0, v0: 0, u1: S.spine.u1, v1: 0, w0: 6.9, w1: 2.6, s0: S.spine.s0, s1: S.spine.s1, z0: S.spine.z0, z1: S.spine.z1, line: true });
  out.push({ id: 'rootplate', kind: 'plate', u0: S.rootPlate.u0, v0: 0, u1: S.rootPlate.u1, v1: 0, w0: S.rootPlate.w0, w1: S.rootPlate.w1, s0: S.rootPlate.s0, s1: S.rootPlate.s1, z0: 1.2, z1: 1.2, ridge: 1.6 });
  out.push({ id: 'tipplate', kind: 'tip', u0: S.tipPlate.u - S.tipPlate.len / 2, v0: 0, u1: S.tipPlate.u + S.tipPlate.len / 2, v1: 0, w0: S.tipPlate.w, w1: S.tipPlate.w * 0.7, s0: 0.62, s1: 0.56, z0: 1.4, z1: 1.2, ridge: 1 });
  for (const side of [-1, 1] as const) {
    const sd = side < 0 ? 'L' : 'R';
    S.branches.forEach((b, i) => {
      const len = b.n * L;
      out.push({ id: `b${i}${sd}`, kind: 'branch', u0: b.root + 0.5 * L, v0: side * SQ3 * L, u1: b.root + 0.5 * len, v1: side * SQ3 * len,
        w0: i === 1 ? 6.2 : 3, w1: 2.6, s0: b.s, s1: b.s * 0.74, z0: 2.4, z1: 0.9, line: b.n >= 3 });
    });
    S.sprigs.forEach((sp, i) => {
      const b = S.branches[sp.branch]!;
      const u = b.root + 0.5 * sp.at * L;
      const v = side * SQ3 * sp.at * L;
      out.push({ id: `sp${i}${sd}`, kind: 'sprig', u0: u + L, v0: v, u1: u + sp.n * L, v1: v, w0: 2.6, w1: 2.4, s0: 0.56, s1: 0.5, z0: 0.6, z1: 0.4 });
    });
  }
  // core: rosette point, spokes, inner + outer hex edge from this arm's vertex toward the next arm's vertex
  out.push({ id: 'ros', kind: 'core', u0: S.rosette.r, v0: 0, u1: S.rosette.r, v1: 0, w0: 2.6, w1: 2.6, s0: S.rosette.s, s1: S.rosette.s, z0: S.rosette.z, z1: S.rosette.z });
  S.spokes.forEach((u, i) => out.push({ id: `spk${i}`, kind: 'core', u0: u, v0: 0, u1: u, v1: 0, w0: 2.6, w1: 2.6, s0: 0.64, s1: 0.64, z0: 3.8 - i * 0.3, z1: 3.8 - i * 0.3 }));
  for (const [id, hx] of [['ihex', S.innerHex], ['ohex', S.outerHex]] as const) {
    out.push({ id, kind: 'hex', u0: hx.r, v0: 0, u1: hx.r / 2, v1: hx.r * SQ3, w0: 2.6, w1: 2.6, s0: hx.s, s1: hx.s, z0: hx.z, z1: hx.z, line: id === 'ohex' });
  }
  return out;
}

const armAngle = (arm: number) => (-90 + 60 * arm) * RAD;
export function toWorld(arm: number, u: number, v: number): [number, number] {
  const p = armAngle(arm);
  return [CX + u * Math.cos(p) - v * Math.sin(p), CY + u * Math.sin(p) + v * Math.cos(p)];
}

export const STROKES: Stroke[] = (() => {
  const out: Stroke[] = [{ id: 'nucleus', kind: 'nucleus', arm: -1, x0: CX, y0: CY, x1: CX, y1: CY, dx: 1, dy: 0, len: 0, w0: 2.6, w1: 2.6, s0: SHAPE.nucleus.s, s1: SHAPE.nucleus.s, z0: SHAPE.nucleus.z, z1: SHAPE.nucleus.z }];
  for (let arm = 0; arm < 6; arm++) for (const l of armLocal()) {
    const [x0, y0] = toWorld(arm, l.u0, l.v0);
    const [x1, y1] = toWorld(arm, l.u1, l.v1);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const [ax, ay] = len > 0 ? [(x1 - x0) / len, (y1 - y0) / len] : [Math.cos(armAngle(arm) + Math.PI / 2), Math.sin(armAngle(arm) + Math.PI / 2)];
    const { u0: _a, v0: _b, u1: _c, v1: _d, ...rest } = l;
    out.push({ ...rest, id: `a${arm}-${l.id}`, arm, x0, y0, x1, y1, dx: ax, dy: ay, len });
  }
  return out;
})();

/** Nearest stroke containing (x, y): t along it, normalised depth q = d / w (0 centre … 1 edge). */
export function memberOf(x: number, y: number, slack = 0): { stroke: Stroke; t: number; q: number; d: number } | null {
  let best: { stroke: Stroke; t: number; q: number; d: number } | null = null;
  for (const s of STROKES) {
    const t = s.len > 0 ? Math.min(1, Math.max(0, ((x - s.x0) * s.dx + (y - s.y0) * s.dy) / s.len)) : 0;
    const d = Math.hypot(x - (s.x0 + t * s.len * s.dx), y - (s.y0 + t * s.len * s.dy));
    const w = lerp(s.w0, s.w1, t) + slack;
    if (d > w) continue;
    const q = d / w;
    if (!best || q < best.q - 1e-9) best = { stroke: s, t, q, d };
  }
  return best;
}

/** Reading angle that is never upside down: direction mapped into (−90°, 90°]. */
export function legible(dx: number, dy: number): { rot: number; flip: boolean } {
  const flip = dx < -1e-6; // vertical (±90°) reads either way
  return { rot: Math.atan2(flip ? -dy : dy, flip ? -dx : dx), flip };
}

// ───────────────────────────── slots ─────────────────────────────

export type Layer = 'structure' | 'texture' | 'depth' | 'helix';
export type Helix = { track: number; s: number; radius: number; theta0: number; zc: number; arc: number };
export type Slot = {
  i: number; x: number; y: number; z: number; rot: number; size: number;
  kind: Kind; layer: Layer; stroke: string; arm: number; prio: number; t: number; // t = position along its stroke (0 inner … 1 outer)
  join: boolean; // reserved empty slot a moving echo glyph may join (never filled statically)
  helix?: Helix;
  topMin: number; // highest screen y its box can reach in any pose → shown iff topMin ≥ revealTop(days)
  float: number; // pose margin reserved for float (texture only)
  shade: number; // opacity factor from the shape field: 1 on a stroke's ridge, lower toward its edge (volume)
};
export type Line = { id: string; kind: Kind; arm: number; cells: number[] }; // slot indices in reading order
export type Geo = { shape: Shape; slots: Slot[]; lines: Line[]; tracks: STrack[]; runs: { id: string; cells: number[] }[] };

export const FLOAT_AMP = 0.7;
const PRIO: Record<Layer, number> = { structure: 0, texture: 1, depth: 1.5, helix: 2 };
export const HELIX = { u0: 10 * L, u1: 15 * L, radius: 4.4, rise: 13, size: 0.6, strands: 1 } as const;
export const JOIN_SHARE = 0.07; // [연구안] share of free texture slots kept empty as places moving glyphs can join

function staticTop(y: number, z: number, size: number, margin: number) {
  const k = CAMERA / (CAMERA - z);
  return CY + (y - CY) * k - EXT * size * k - margin;
}

function slotOf(i: number, x: number, y: number, z: number, rot: number, size: number, kind: Kind, layer: Layer, stroke: string, arm: number): Slot {
  const float = layer === 'texture' || layer === 'depth' ? FLOAT_AMP : 0;
  return { i, x, y, z, rot, size, kind, layer, stroke, arm, prio: PRIO[layer], t: 0.5, join: false, topMin: staticTop(y, z, size, float), float, shade: 1 };
}

/** helix "sleeves": the existing 2.5D helix (Gate 2B/2D projection) around a short part of each arm's spine. */
function helixTracks(): STrack[] {
  const out: STrack[] = [];
  for (let arm = 0; arm < 6; arm++) for (let k = 0; k < HELIX.strands; k++) {
    const [ax, ay] = toWorld(arm, HELIX.u0, 0);
    const [bx, by] = toWorld(arm, HELIX.u1, 0);
    const [lx, ly, hx, hy] = ay >= by ? [ax, ay, bx, by] : [bx, by, ax, ay];
    const len = Math.hypot(hx - lx, hy - ly);
    const vx = (hx - lx) / len;
    const vy = (hy - ly) / len;
    const pitch = HELIX.rise / (2 * Math.PI);
    const rx = -vy;
    const flip = HELIX.radius * rx - pitch * vx < 0;
    const phase = h(`${ART_VERSION}:helix:${arm}`) * 2 * Math.PI + k * Math.PI;
    out.push({ index: out.length, id: `a${arm}-hx${k}`, kind: 'arm', arm, level: -1, layer: 1, lx, ly, vx, vy, rx, ry: vx, len, pitch, phase, flip,
      innerLow: true, rOf: () => HELIX.radius, zOf: () => 0, arc0: Math.hypot(HELIX.radius, pitch), aTab: new Float64Array(0), ds: 0, aMax: 0, radius: HELIX.radius } as unknown as STrack);
  }
  return out;
}
const HELIX_SAMPLES = Array.from({ length: 37 }, (_, i) => -Math.acos(CULL) + (2 * Math.acos(CULL) * i) / 36);

function helixTop(tracks: STrack[], hx: Helix, size: number) {
  const f = newSFrame();
  let top = Infinity;
  for (const th of HELIX_SAMPLES) {
    projectSculpt(tracks, { ...hx, theta0: th } as unknown as SGlyph, ZERO, 0, -1e9, f);
    top = Math.min(top, f.y - EXT * size * f.k);
  }
  return top;
}

const geoCache = new Map<Shape, Geo>();
export function geometry(shape: Shape): Geo {
  const hit = geoCache.get(shape);
  if (hit) return hit;
  const slots: Slot[] = [];
  const lineCells = new Map<string, { t: number; i: number }[]>();
  const runCells = new Map<string, { t: number; i: number }[]>();
  const add = (x: number, y: number, z: number, rot: number, size: number, kind: Kind, layer: Layer, stroke: string, arm: number) => {
    const s = slotOf(slots.length, x, y, z, rot, size, kind, layer, stroke, arm);
    slots.push(s);
    return s;
  };
  const push = (m: Map<string, { t: number; i: number }[]>, id: string, t: number, i: number) => { const a = m.get(id) ?? []; a.push({ t, i }); m.set(id, a); };
  const tracks = shape === 'A2' ? helixTracks() : [];

  if (shape === 'A1') {
    // lattice ∩ mask: basis e1 = up, e2 = 30° below the x axis; every stroke direction is a lattice direction
    for (let i = -26; i <= 26; i++) for (let j = -26; j <= 26; j++) {
      const x = CX + j * L * SQ3;
      const y = CY - i * L - j * L * 0.5;
      if (Math.hypot(x - CX, y - CY) > 136) continue;
      const m = memberOf(x, y);
      if (!m) continue;
      const st = m.stroke;
      const centre = m.d < 1;
      const layer: Layer = (st.line || st.kind === 'core' || st.kind === 'hex' || st.kind === 'nucleus') && centre ? 'structure' : 'texture';
      const ridge = st.ridge ?? 0.8;
      const size = lerp(st.s0, st.s1, m.t) * (1 - 0.3 * m.q);
      const z = lerp(st.z0, st.z1, m.t) + ridge * (1 - m.q * m.q) - (layer === 'texture' ? 0.8 : 0);
      const dir = st.kind === 'plate' || st.kind === 'tip' || st.len === 0 ? radialDir(st.arm, st.kind) : { x: st.dx, y: st.dy };
      const { rot, flip } = legible(dir.x, dir.y);
      const s = add(x, y, z, rot, size, st.kind, layer, st.id, st.arm);
      s.shade = 1 - 0.38 * m.q;
      const along = m.t * (st.len || 1);
      if (st.line && layer === 'structure') push(lineCells, st.id, flip ? -along : along, s.i);
      else push(runCells, layer === 'structure' ? `${st.id}` : `${st.id}:row${Math.round((signedAcross(st, x, y)) / (L * SQ3))}`, flip ? -along : along, s.i);
    }
  } else {
    // A2: structure = text paths on stroke centre lines (advance-spaced), free elements fill the rest of the same mask
    const placed: Slot[] = [];
    for (const st of STROKES) {
      if (st.kind === 'plate' || st.kind === 'tip' || st.kind === 'sprig') continue;
      const structural = st.line || st.kind === 'core' || st.kind === 'hex' || st.kind === 'nucleus';
      const pts: [number, number][] = [];
      if (st.len === 0) pts.push([0, 0]);
      else {
        let a = 0;
        while (a <= st.len + 1e-6) { const t = a / st.len; pts.push([t, a]); a += FONT * 0.9 * lerp(st.s0, st.s1, t); }
        // stretch the advance-spaced path so its last glyph sits exactly on the stroke end (arm tips must be reachable on day 1)
        const last = pts[pts.length - 1]![1];
        if (pts.length > 1 && last > 0) for (const p of pts) { p[1] *= st.len / last; p[0] = p[1] / st.len; }
      }
      const { rot, flip } = st.len === 0 ? legible(radialDir(st.arm, st.kind).x, radialDir(st.arm, st.kind).y) : legible(st.dx, st.dy);
      for (const [t, a] of pts) {
        const x = st.x0 + a * st.dx;
        const y = st.y0 + a * st.dy;
        const s = add(x, y, lerp(st.z0, st.z1, t) + 0.8, rot, lerp(st.s0, st.s1, t), st.kind, structural ? 'structure' : 'texture', st.id, st.arm);
        placed.push(s);
        if (st.line) push(lineCells, st.id, flip ? -a : a, s.i); else push(runCells, st.id, flip ? -a : a, s.i);
      }
    }
    // knots (마디): 3 small glyphs around every branch root, in front of the spine
    for (let arm = 0; arm < 6; arm++) SHAPE.branches.forEach((b, bi) => {
      for (let k = 0; k < 3; k++) {
        const ang = armAngle(arm) + (k * 120 + 60) * RAD;
        const [rx, ry] = toWorld(arm, b.root, 0);
        const rr = 3.4 + 0.6 * (bi === 0 ? 1 : 0);
        add(rx + rr * Math.cos(ang), ry + rr * Math.sin(ang), 4.6, ang + Math.PI / 2, 0.46, 'branch', 'texture', `a${arm}-knot${bi}`, arm);
        push(runCells, `a${arm}-knot${bi}`, k, slots.length - 1);
      }
    });
    // tip rosette: 6 small glyphs around the tip plate centre (tangential)
    for (let arm = 0; arm < 6; arm++) for (let k = 0; k < 6; k++) {
      const [cx, cy] = toWorld(arm, SHAPE.tipPlate.u, 0);
      const ang = armAngle(arm) + (30 + 60 * k) * RAD;
      const tx = cx + 5.4 * Math.cos(ang);
      const ty = cy + 5.4 * Math.sin(ang);
      const { rot } = legible(-Math.sin(ang), Math.cos(ang));
      add(tx, ty, 2.2, rot, 0.5, 'tip', 'texture', `a${arm}-tip`, arm);
      push(runCells, `a${arm}-tip`, k, slots.length - 1);
    }
    // sprigs: micro glyphs on the sprig centre lines
    for (const st of STROKES.filter(s => s.kind === 'sprig')) {
      const n = Math.max(1, Math.round(st.len / (FONT * 0.55)) + 1);
      const { rot } = legible(st.dx, st.dy);
      for (let k = 0; k < n; k++) { const a = n === 1 ? 0 : (k * st.len) / (n - 1); add(st.x0 + a * st.dx, st.y0 + a * st.dy, 0.6, rot, 0.5, 'sprig', 'texture', st.id, st.arm); push(runCells, st.id, a, slots.length - 1); }
    }
    // depth layer: lattice points of the plates / outer hex band, set back (z −5), upright, dim
    for (let i = -26; i <= 26; i++) for (let j = -26; j <= 26; j++) {
      const x = CX + j * L * SQ3 + L * SQ3 / 2; // half-cell offset → sits between the front glyphs
      const y = CY - i * L - j * L * 0.5 - L * 0.25;
      const m = memberOf(x, y, 1.5);
      if (!m || !(m.stroke.kind === 'plate' || m.stroke.kind === 'tip' || (m.stroke.kind === 'spine' && m.t < 0.35))) continue; // the hex rings keep their holes
      const dg = add(x, y, -5, armAngle(m.stroke.arm) + Math.PI / 2, 0.6 * (1 - 0.2 * m.q), m.stroke.kind, 'depth', m.stroke.id, m.stroke.arm);
      dg.rot = legible(Math.cos(dg.rot), Math.sin(dg.rot)).rot; // across the grain: a second lattice direction
      dg.shade = 1 - 0.3 * m.q;
      push(runCells, `${m.stroke.id}:depth${i}`, j, slots.length - 1);
    }
    // helix sleeves
    tracks.forEach(tr => {
      const arc = Math.hypot(HELIX.radius, tr.pitch);
      const adv = FONT * HELIX.size * 1.02;
      for (let a = 0; ; a += adv) {
        const s = (tr.pitch * a) / arc;
        if (s > tr.len) break;
        const zc = 2.6;
        const hx: Helix = { track: tr.index, s, radius: HELIX.radius, theta0: tr.phase - s / tr.pitch, zc, arc };
        const sl = slotOf(slots.length, tr.lx + s * tr.vx, tr.ly + s * tr.vy, zc, 0, HELIX.size, 'spine', 'helix', tr.id, tr.arm);
        sl.helix = hx;
        sl.topMin = helixTop(tracks, hx, HELIX.size);
        slots.push(sl);
        push(runCells, tr.id, a, sl.i);
      }
    });
    // prune: a free element that collides with a kept glyph at nearly the same depth is dropped (shape mask unchanged)
    const keep = new Array(slots.length).fill(true);
    const order = [...slots].sort((a, b) => a.prio - b.prio || a.i - b.i);
    const kept: Slot[] = [];
    for (const s of order) {
      if (s.layer !== 'structure' && s.layer !== 'helix') {
        const clash = kept.some(o => o.layer !== 'helix' && Math.abs(o.z - s.z) < 2.5 && Math.hypot(o.x - s.x, o.y - s.y) < 3.5 * (o.size + s.size));
        if (clash) { keep[s.i] = false; continue; }
      }
      kept.push(s);
    }
    const remap = new Map<number, number>();
    const all = slots.splice(0);
    for (const s of all) if (keep[s.i]) { remap.set(s.i, slots.length); slots.push({ ...s, i: slots.length }); }
    for (const m of [lineCells, runCells]) for (const [k, v] of m) {
      const nv = v.filter(c => remap.has(c.i)).map(c => ({ t: c.t, i: remap.get(c.i)! }));
      if (nv.length) m.set(k, nv); else m.delete(k);
    }
  }
  const strokeById = new Map(STROKES.map(s => [s.id, s]));
  for (const s of slots) { const st = strokeById.get(s.stroke); if (st && st.len > 0) s.t = Math.min(1, Math.max(0, ((s.x - st.x0) * st.dx + (s.y - st.y0) * st.dy) / st.len)); }
  // join slots: a few free texture/depth slots stay empty on purpose (intended gaps + places a mover can join)
  for (const s of slots) if ((s.layer === 'texture' || s.layer === 'depth') && h(`${ART_VERSION}:join:${shape}:${s.stroke}:${Math.round(s.x)}:${Math.round(s.y)}`) < JOIN_SHARE) s.join = true;
  const sortCells = (v: { t: number; i: number }[]) => v.sort((a, b) => a.t - b.t).map(c => c.i);
  const lines: Line[] = [...lineCells].map(([id, v]) => { const st = STROKES.find(s => s.id === id)!; return { id, kind: st.kind, arm: st.arm, cells: sortCells(v) }; });
  const runs = [...runCells].map(([id, v]) => ({ id, cells: sortCells(v).filter(i => !slots[i]!.join) })).filter(r => r.cells.length);
  const geo: Geo = { shape, slots, lines, tracks, runs };
  geoCache.set(shape, geo);
  return geo;
}

function radialDir(arm: number, kind: Kind) {
  if (arm < 0) return { x: 1, y: 0 };
  const a = armAngle(arm) + (kind === 'core' ? Math.PI / 2 : 0);
  return { x: Math.cos(a), y: Math.sin(a) };
}
function signedAcross(st: Stroke, x: number, y: number) {
  const ax = st.len > 0 ? st.dx : Math.cos(armAngle(st.arm));
  const ay = st.len > 0 ? st.dy : Math.sin(armAngle(st.arm));
  return -(x - st.x0) * ay + (y - st.y0) * ax;
}

// ───────────────────────────── text: anchors (append-only) + echo ─────────────────────────────

export type Placement = { entryId: string; line: string; start: number; cells: number; from: number; to: number; body: string; openDays: number };
export type Ledger = Map<string, Placement>;
export type LGlyph = {
  key: string; entryId: string; graphemeIndex: number; sourceOffset: number; glyph: string;
  role: 'anchor' | 'echo'; copyIndex: number; run: string; slot: number;
};
const LINE_PENALTY: Partial<Record<Kind, number>> = { spine: 0, hex: 14, branch: 22 };
const byWriting = (a: Entry, b: Entry) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

/** Days open when `e` was written = distinct dates among entries written up to and including it. */
function openDaysAt(entries: Entry[], e: Entry) {
  return new Set(entries.filter(x => byWriting(x, e) <= 0).map(x => x.entryDate)).size;
}

/** Longest phrase-bounded prefix (space = an empty cell) of the anchor text that fits `room` cells. */
function cut(body: string, room: number): { from: number; to: number } | null {
  const g = graphemes(body);
  const ph = phrases(body);
  const [from, end] = anchorRange(ph);
  if (room <= 0 || end <= from) return null;
  let best = -1;
  for (const p of ph) if (p.end <= end && p.end - from <= room) best = p.end;
  if (best < 0) {
    for (let i = Math.min(end, from + room); i > from + 1; i--) if (g[i]?.text === ' ') { best = i; break; }
    if (best < 0 && room >= 2) best = Math.min(end, from + room);
  }
  return best > from ? { from, to: best } : null;
}

export function allocateAnchors(geo: Geo, entries: Entry[], prev?: Ledger): Ledger {
  const ledger: Ledger = new Map();
  const used = new Map<string, Uint8Array>(geo.lines.map(l => [l.id, new Uint8Array(l.cells.length)]));
  const mark = (p: Placement) => { const u = used.get(p.line)!; for (let i = p.start; i < p.start + p.cells; i++) u[i] = 1; };
  const sorted = [...entries].sort(byWriting);
  for (const e of sorted) { // keep earlier placements of unchanged entries exactly
    const p = prev?.get(e.id);
    if (p && p.body === e.body && used.has(p.line)) { ledger.set(e.id, p); mark(p); }
  }
  for (const e of sorted) {
    if (ledger.has(e.id)) continue;
    const openDays = openDaysAt(entries, e);
    const top = revealTop(openDays);
    const ph = phrases(e.body);
    const [from, end] = anchorRange(ph);
    if (end <= from) continue;
    const want = end - from;
    const firstLen = (ph[0]?.end ?? end) - from;
    let best: { score: number; line: Line; start: number; c: { from: number; to: number } } | null = null;
    for (const line of geo.lines) {
      const u = used.get(line.id)!;
      const n = line.cells.length;
      for (let start = 0; start < n; start++) {
        if (u[start] || (start > 0 && u[start - 1])) continue; // one free cell between two anchors
        // Gate 2C rule: part of the run must be open on the writing day; the rest may be RESERVED in cells that open
        // later (revealed in place, never moved). Reading order may run up or down, so "open" is counted per cell.
        let room = 0;
        while (start + room < n && !u[start + room] && !(start + room + 1 < n && u[start + room + 1]) && room < want) room++;
        const c = cut(e.body, room);
        if (!c) continue;
        const len = c.to - c.from;
        let openCells = 0;
        let yOpen = Infinity;
        let soonest = -Infinity; // highest topMin in the window = the cell that will open first
        for (let k = 0; k < len; k++) { const s = geo.slots[line.cells[start + k]!]!; soonest = Math.max(soonest, s.topMin); if (s.topMin >= top) { openCells++; yOpen = Math.min(yOpen, s.y); } }
        // ≥ 1 open cell on the writing day (day 1 opens only the lower arm tip). If nothing is free in the open region,
        // fall back to a fully reserved window that opens soonest (visible from a later day, still never moved).
        const reservedOnly = openCells < 1;
        const score = (reservedOnly ? 5000 + (top - soonest) : 0) + (len >= Math.min(firstLen, want) ? 0 : 1000) - len * 3 + (len - openCells) * 1.5 + (reservedOnly ? 0 : yOpen * 0.08) + (LINE_PENALTY[line.kind] ?? 30);
        if (!best || score < best.score) best = { score, line, start, c };
      }
    }
    if (!best) continue;
    const p: Placement = { entryId: e.id, line: best.line.id, start: best.start, cells: best.c.to - best.c.from, from: best.c.from, to: best.c.to, body: e.body, openDays };
    ledger.set(e.id, p);
    mark(p);
  }
  return ledger;
}

export type LState = {
  shape: Shape; fill: Fill; seed: string; geo: Geo; entries: Entry[]; days: number; top: number; ledger: Ledger;
  glyphs: LGlyph[]; // every placed instance (open or not yet revealed)
  active: LGlyph[]; // drawn now
  budget: number; natural: number; // equal fill = A0 (Gate 2D D2) drawn count for the same entries
};

const a0Cache = new Map<string, { drawn: number; front: number }>();
/** A0 = Gate 2D D2 (fill=equal, S0): glyph instances drawn, and how many of them face the viewer at 0° (cos ≥ CULL). */
export function a0Count(entries: Entry[]) {
  const key = entries.map(e => `${e.id}|${e.entryDate}|${e.createdAt}|${e.body}`).join('\n');
  let n = a0Cache.get(key);
  if (n == null) {
    const st = buildSculpt('D2', entries, { fill: 'equal' });
    const f = newSFrame();
    n = { drawn: st.active.length, front: st.active.filter(g => projectSculpt(st.geo.tracks, g, ZERO, 0, -1e9, f).cos >= CULL).length };
    a0Cache.set(key, n);
  }
  return n;
}
const KIND_RANK: Record<Kind, number> = { nucleus: 0, core: 0, hex: 0, spine: 0, branch: 1, plate: 2, tip: 3, sprig: 4 };

export function buildLiving(shape: Shape, entries: Entry[], opts: { fill?: Fill; prev?: Ledger; seed?: string } = {}): LState {
  const fill = opts.fill ?? 'equal';
  const seed = opts.seed ?? 'v1';
  const geo = geometry(shape);
  const days = distinctDays(entries);
  const top = revealTop(days);
  const ledger = allocateAnchors(geo, entries, opts.prev);
  const glyphs: LGlyph[] = [];
  const taken = new Uint8Array(geo.slots.length);
  const lineById = new Map(geo.lines.map(l => [l.id, l]));
  const byId = new Map(entries.map(e => [e.id, e]));
  for (const e of [...entries].sort(byWriting)) {
    const p = ledger.get(e.id);
    if (!p) continue;
    const g = graphemes(e.body);
    const line = lineById.get(p.line)!;
    for (let k = 0; k < p.cells; k++) {
      const slot = line.cells[p.start + k]!;
      taken[slot] = 1; // a space keeps its cell empty (word gap)
      const gi = p.from + k;
      if (g[gi]!.text === ' ') continue;
      glyphs.push({ key: `${e.id}:${gi}:0`, entryId: e.id, graphemeIndex: gi, sourceOffset: g[gi]!.offset, glyph: g[gi]!.text, role: 'anchor', copyIndex: 0, run: p.line, slot });
    }
  }
  // echo runs: line cells not taken by anchors (split into stretches) + every free-element run
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
    const ph = phrases(e.body);
    let p0 = 0;
    let bp = -1;
    ph.forEach((p, k) => { const v = h(`${seed}:${r.id}:${e.id}:${k}`); if (v > bp) { bp = v; p0 = p.start; } });
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
    void byId;
  }
  const open = glyphs.filter(gl => days > 0 && geo.slots[gl.slot]!.topMin >= top);
  const budget = fill !== 'natural' && days > 0 ? a0Count(entries)[fill === 'front' ? 'front' : 'drawn'] : Infinity;
  let active = open;
  if (open.length > budget) {
    // keep anchors, then by layer, then the crystal skeleton before branches/plates/sprigs, inner parts before outer tips
    const rank = (gl: LGlyph) => { const sl = geo.slots[gl.slot]!; return gl.role === 'anchor' ? -100 : sl.prio * 10 + KIND_RANK[sl.kind] * 2 + sl.t + h(`${seed}:keep:${gl.key}`) * 0.1; };
    const keep = new Set([...open].sort((a, b) => rank(a) - rank(b)).slice(0, budget));
    active = open.filter(gl => keep.has(gl));
  }
  return { shape, fill, seed, geo, entries, days, top, ledger, glyphs, active, budget: Number.isFinite(budget) ? budget : open.length, natural: open.length };
}

// ───────────────────────────── motion plan (M1–M3) ─────────────────────────────

export const LIVING = {
  helixSecondsPerTurn: 24, // M1+: only the helix sleeves rotate (each about its own arm axis)
  float: { share: 0.22, amp: FLOAT_AMP, periodMin: 4, periodMax: 8 }, // M1+: a few free texture glyphs drift in place
  movingFraction: 0.03, // M2: share of drawn glyphs that travel (echo, free layers only)
  travel: 3.6, dwell: 6, maxDist: 40, minDist: 9, lift: 5, // seconds / world units
  light: { gain: 0.12, levels: 8 }, // M3: brightness only
} as const;
export type MotionOpts = { movingFraction: number; travel: number; dwell: number; maxDist: number };
export const defaultMotionOpts = (): MotionOpts => ({ movingFraction: LIVING.movingFraction, travel: LIVING.travel, dwell: LIVING.dwell, maxDist: LIVING.maxDist });

export type Mover = { glyph: number; from: number; to: number; cx: number; cy: number; phase: number };
export type Plan = { motion: Motion; opts: MotionOpts; movers: Mover[]; floaters: number[]; helix: number[]; dynamic: Uint8Array; waves: Float64Array };

function bez(a: number, c: number, b: number, u: number) { return (1 - u) * (1 - u) * a + 2 * u * (1 - u) * c + u * u * b; }
const ease = (u: number) => u * u * u * (u * (u * 6 - 15) + 10); // smootherstep: C², zero speed + zero acceleration at both ends

/** Deterministic plan. Movers: echo glyphs of the free layers only; destination = an empty join slot of the same arm. */
export function planMotion(st: LState, motion: Motion, opts: MotionOpts = defaultMotionOpts()): Plan {
  const n = st.active.length;
  const dynamic = new Uint8Array(n);
  const helix: number[] = [];
  const floaters: number[] = [];
  const movers: Mover[] = [];
  const waves = new Float64Array(n * 6);
  if (motion === 'M0') return { motion, opts, movers, floaters, helix, dynamic, waves };
  const S = st.geo.slots;
  st.active.forEach((g, i) => {
    const s = S[g.slot]!;
    if (s.helix) { helix.push(i); dynamic[i] = 1; }
  });
  if (motion !== 'M1') {
    const want = Math.round(opts.movingFraction * n);
    const occupied = new Set(st.active.map(g => g.slot));
    // join targets: reserved join slots + free-layer slots left empty by the glyph budget (inside the same shape mask)
    const joins = S.filter(s => (s.join || s.layer === 'texture' || s.layer === 'depth') && !occupied.has(s.i) && s.topMin >= st.top);
    const usedJoin = new Set<number>();
    const cands = st.active.map((g, i) => ({ g, i })).filter(({ g }) => g.role === 'echo' && (S[g.slot]!.layer === 'texture' || S[g.slot]!.layer === 'depth'))
      .sort((a, b) => h(`${st.seed}:mover:${a.g.key}`) - h(`${st.seed}:mover:${b.g.key}`));
    for (const { g, i } of cands) {
      if (movers.length >= want) break;
      const a = S[g.slot]!;
      const opts2 = joins.filter(j => !usedJoin.has(j.i) && j.arm === a.arm).map(j => ({ j, d: Math.hypot(j.x - a.x, j.y - a.y) }))
        .filter(({ d }) => d >= LIVING.minDist && d <= opts.maxDist).sort((p, q) => h(`${st.seed}:${g.key}:${p.j.i}`) - h(`${st.seed}:${g.key}:${q.j.i}`));
      for (const { j } of opts2) {
        // control point pulled toward the arm axis → the path bows through the crystal, not across the gaps between arms
        const mx = (a.x + j.x) / 2;
        const my = (a.y + j.y) / 2;
        let cx = mx;
        let cy = my;
        if (a.arm >= 0) {
          const ux = Math.cos(armAngle(a.arm));
          const uy = Math.sin(armAngle(a.arm));
          const along = (mx - CX) * ux + (my - CY) * uy;
          cx = lerp(mx, CX + along * ux, 0.55);
          cy = lerp(my, CY + along * uy, 0.55);
        }
        const m: Mover = { glyph: i, from: a.i, to: j.i, cx, cy, phase: h(`${st.seed}:phase:${g.key}`) };
        if (!pathOk(st, m)) continue;
        movers.push(m);
        usedJoin.add(j.i);
        dynamic[i] = 1;
        break;
      }
    }
  }
  st.active.forEach((g, i) => {
    const s = S[g.slot]!;
    if (dynamic[i] || !(s.layer === 'texture' || s.layer === 'depth')) return;
    if (h(`${st.seed}:float:${g.key}`) >= LIVING.float.share) return;
    floaters.push(i);
    dynamic[i] = 1;
    for (let k = 0; k < 3; k++) {
      const T = LIVING.float.periodMin + h(`${g.key}:fT${k}`) * (LIVING.float.periodMax - LIVING.float.periodMin);
      waves[i * 6 + k * 2] = (2 * Math.PI) / T;
      waves[i * 6 + k * 2 + 1] = h(`${g.key}:fP${k}`) * 2 * Math.PI;
    }
  });
  return { motion, opts, movers, floaters, helix, dynamic, waves };
}

/** Every sampled point of a mover's path stays inside the (slightly dilated) crystal mask and below the boundary. */
export function pathOk(st: LState, m: Mover) {
  const a = st.geo.slots[m.from]!;
  const b = st.geo.slots[m.to]!;
  for (let k = 0; k <= 16; k++) {
    const u = k / 16;
    const x = bez(a.x, m.cx, b.x, u);
    const y = bez(a.y, m.cy, b.y, u);
    const z = lerp(a.z, b.z, u) + LIVING.lift * Math.sin(Math.PI * u);
    const size = lerp(a.size, b.size, u);
    if (!memberOf(x, y, 4)) return false;
    if (staticTop(y, z, size, 0) < st.top) return false;
  }
  return true;
}

/** Where a mover is at time t: u ∈ [0,1] along A→B (0 = home, 1 = joined), and whether it is in flight. */
export function moverU(m: Mover, t: number, opts: MotionOpts) {
  const cycle = 2 * (opts.dwell + opts.travel);
  const x = (((t / cycle + m.phase) % 1) + 1) % 1 * cycle;
  if (x < opts.dwell) return { u: 0, flying: false };
  if (x < opts.dwell + opts.travel) return { u: ease((x - opts.dwell) / opts.travel), flying: true };
  if (x < 2 * opts.dwell + opts.travel) return { u: 1, flying: false };
  return { u: 1 - ease((x - 2 * opts.dwell - opts.travel) / opts.travel), flying: true };
}

// ───────────────────────────── pose / projection ─────────────────────────────

export type Pose = SFrame & { visible: boolean };
export const newPose = (): Pose => ({ ...newSFrame(), visible: false });
const OPACITY: Record<Layer, number> = { structure: 1, texture: 0.86, depth: 0.5, helix: 0.92 };
const HV = (() => { const [lx, ly, lz] = C2.light; const n = Math.hypot(lx, ly, lz); const hx = lx / n; const hy = ly / n; const hz = lz / n + 1; const m = Math.hypot(hx, hy, hz); return [hx / m, hy / m, hz / m] as const; })();

function freePose(x: number, y: number, z: number, rot: number, size: number, out: Pose) {
  const k = CAMERA / (CAMERA - z);
  out.x = CX + (x - CX) * k;
  out.y = CY + (y - CY) * k;
  out.z = z;
  out.k = k;
  out.cos = 1;
  out.sin = 0;
  const c = Math.cos(rot) * size * k;
  const s = Math.sin(rot) * size * k;
  out.a = c; out.b = s; out.c = -s; out.d = c;
  return out;
}

/** Pose of active glyph i at time t (M0 = rest pose; angleDeg = still helix angle). */
export function poseOf(st: LState, i: number, plan: Plan, t: number, angleDeg: number, out: Pose): Pose {
  const g = st.active[i]!;
  const s = st.geo.slots[g.slot]!;
  const moving = plan.motion !== 'M0';
  out.level = 0;
  out.visible = true;
  if (s.helix) {
    const deg = moving ? angleDeg + (360 * t) / LIVING.helixSecondsPerTurn : angleDeg;
    projectSculpt(st.geo.tracks, s.helix as unknown as SGlyph, ZERO, deg, -1e9, out);
    out.a *= s.size; out.b *= s.size; out.c *= s.size; out.d *= s.size;
    out.visible = out.cos >= CULL;
    out.opacity *= OPACITY.helix;
    if (plan.motion === 'M3' && out.visible) {
      const tr = st.geo.tracks[s.helix.track]!;
      const nd = out.sin * (tr.rx * HV[0] + tr.ry * HV[1]) + out.cos * HV[2];
      out.level = level(Math.pow(Math.max(0, nd), C2.power) * 0.8);
    }
    return out;
  }
  if (moving && plan.dynamic[i]) {
    const mv = plan.movers.find(m => m.glyph === i);
    if (mv) {
      const b = st.geo.slots[mv.to]!;
      const { u, flying } = moverU(mv, t, plan.opts);
      let dr = b.rot - s.rot;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      freePose(bez(s.x, mv.cx, b.x, u), bez(s.y, mv.cy, b.y, u), lerp(s.z, b.z, u) + LIVING.lift * Math.sin(Math.PI * u), s.rot + dr * u, lerp(s.size, b.size, u), out);
      out.opacity = lerp(OPACITY[s.layer] * s.shade, OPACITY[b.layer] * b.shade, u) + (flying ? 0.1 * Math.sin(Math.PI * u) : 0);
      if (plan.motion === 'M3' && flying) out.level = level(Math.sin(Math.PI * u));
      return out;
    }
    const w = plan.waves;
    const o = i * 6;
    const dx = LIVING.float.amp * 0.6 * Math.sin(w[o]! * t + w[o + 1]!);
    const dy = LIVING.float.amp * 0.8 * Math.sin(w[o + 2]! * t + w[o + 3]!);
    const dz = 0.6 * Math.sin(w[o + 4]! * t + w[o + 5]!);
    freePose(s.x + dx, s.y + dy, s.z + dz, s.rot, s.size, out);
    out.opacity = OPACITY[s.layer] * s.shade;
    return out;
  }
  freePose(s.x, s.y, s.z, s.rot, s.size, out);
  out.opacity = OPACITY[s.layer] * s.shade;
  return out;
}
const level = (v: number) => Math.max(0, Math.min(LIVING.light.levels - 1, Math.round(v * (LIVING.light.levels - 1))));

// ───────────────────────────── metrics (automatic; NOT an aesthetic verdict) ─────────────────────────────

export const CORE_R = SHAPE.outerHex.r + 4;
export function measureLiving(st: LState) {
  const S = st.geo.slots;
  const act = st.active;
  const by = <K extends string>(f: (g: LGlyph) => K) => act.reduce((m, g) => { const k = f(g); m[k] = (m[k] ?? 0) + 1; return m; }, {} as Record<K, number>);
  const perArm = [0, 1, 2, 3, 4, 5].map(a => act.filter(g => S[g.slot]!.arm === a).length);
  const within = (r: number) => act.filter(g => Math.hypot(S[g.slot]!.x - CX, S[g.slot]!.y - CY) < r).length;
  let crowded = 0;
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = S[act[i]!.slot]!;
    const b = S[act[j]!.slot]!;
    if (a.helix || b.helix) continue;
    if (Math.abs(a.z - b.z) < 1.5 && Math.hypot(a.x - b.x, a.y - b.y) < 2.6 * (a.size + b.size)) crowded++;
  }
  const totalVisible = st.entries.reduce((n, e) => n + graphemes(e.body).filter(g => g.text !== ' ').length, 0);
  const distinct = new Set(act.map(g => `${g.entryId}:${g.graphemeIndex}`)).size;
  const anchorWant = st.entries.reduce((n, e) => { const [a, b] = anchorRange(phrases(e.body)); return n + graphemes(e.body).slice(a, b).filter(g => g.text !== ' ').length; }, 0);
  return {
    shape: st.shape, fill: st.fill, days: st.days, entries: st.entries.length,
    drawn: act.length, natural: st.natural, budget: st.budget, slotsTotal: S.length, joinSlots: S.filter(s => s.join).length,
    anchorsDrawn: act.filter(g => g.role === 'anchor').length, anchorGlyphsWanted: anchorWant,
    anchorsPlaced: st.ledger.size, echoDrawn: act.filter(g => g.role === 'echo').length,
    byLayer: by(g => S[g.slot]!.layer), byKind: by(g => S[g.slot]!.kind),
    perArm, armBalance: Math.round((Math.min(...perArm) / Math.max(1, Math.max(...perArm))) * 100) / 100,
    coreR: CORE_R, withinCore: within(CORE_R), withinR20: within(20),
    crowdedPairs: crowded,
    sourceGraphemes: totalVisible, distinctSourceGraphemesDrawn: distinct, maxCopyIndex: Math.max(0, ...act.map(g => g.copyIndex)),
    revealTop: Math.round(st.top * 10) / 10, revealFraction: Math.round(((Y_BOTTOM - st.top) / (Y_BOTTOM - Y_TOP)) * 1000) / 1000,
    targetDays: TARGET_DAYS,
  };
}

// ───────────────────────────── record changes (same day / edit / delete / yesterday) ─────────────────────────────

export type Change = 'none' | 'extra' | 'edit' | 'delete' | 'yesterday' | 'lastdel';
export const CHANGES: Change[] = ['none', 'extra', 'edit', 'delete', 'yesterday', 'lastdel'];
/**
 * Fixture-only record changes (bodies come from the same spec 19 fixture set, never generated):
 * extra = +2 entries on the last date · edit = demo-03 body replaced by the demo-extra-1 body · delete = demo-02 removed ·
 * yesterday = demo-extra-2 body written now but dated the previous date · lastdel = the entry of the last date removed.
 */
export function changeEntries(days: number, dataset: Dataset, change: Change): { before: Entry[]; after: Entry[]; target: string | null } {
  const before = adaptiveEntries(days, 0, dataset);
  const plus = adaptiveEntries(days, 2, dataset);
  const ex = (id: string) => plus.find(e => e.id === id)?.body ?? '';
  const last = before[before.length - 1];
  switch (change) {
    case 'extra': return { before, after: plus, target: null };
    case 'edit': return { before, after: before.map(e => (e.id === 'demo-03' ? { ...e, body: ex('demo-extra-1') } : e)), target: 'demo-03' };
    case 'delete': return { before, after: before.filter(e => e.id !== 'demo-02'), target: 'demo-02' };
    case 'yesterday': {
      if (!last || days < 2) return { before, after: before, target: null };
      const prevDate = before[before.length - 2]!.entryDate;
      return { before, after: [...before, { id: 'demo-yesterday', entryDate: prevDate, createdAt: `${last.entryDate}T21:00:00+09:00`, body: ex('demo-extra-2') }], target: 'demo-yesterday' };
    }
    case 'lastdel': return { before, after: before.slice(0, -1), target: last?.id ?? null };
    default: return { before, after: before, target: null };
  }
}

/** What changed between two states (b built with prev = a.ledger). Anchors of OTHER entries must not move. */
export function diffStates(a: LState, b: LState, target: string | null) {
  const at = new Map(a.active.map(g => [g.slot, g]));
  const changed = new Set<number>(); // indices into b.active
  b.active.forEach((g, i) => { const o = at.get(g.slot); if (!o || o.entryId !== g.entryId || o.graphemeIndex !== g.graphemeIndex || o.glyph !== g.glyph || o.role !== g.role) changed.add(i); });
  const anchorsOf = (s: LState) => { const m = new Map<string, string[]>(); for (const g of s.glyphs) if (g.role === 'anchor') { const k = m.get(g.entryId) ?? []; k.push(`${g.slot}:${g.graphemeIndex}`); m.set(g.entryId, k); } return m; };
  const A = anchorsOf(a);
  const B = anchorsOf(b);
  let anchorMovedOther = 0;
  for (const [id, list] of A) if (id !== target && B.has(id) && B.get(id)!.join() !== list.join()) anchorMovedOther++;
  const removed = a.active.filter(g => !b.active.some(x => x.slot === g.slot)).length;
  return {
    changed, changedCount: changed.size, removedCount: removed, anchorMovedOther,
    newAnchorGlyphs: b.active.filter((g, i) => changed.has(i) && g.role === 'anchor').length,
    echoChanged: [...changed].filter(i => b.active[i]!.role === 'echo').length,
    topBefore: a.top, topAfter: b.top,
  };
}
