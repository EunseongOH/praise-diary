/**
 * Gate 2B — full snowflake 2.5D visual study (docs/spec/22 v1.5). Dev-only, pure, deterministic.
 *
 * 6 arms (60° apart, pointy-top) + 3 twig pairs per arm = 42 AXES. Every axis carries ONE helical text track wound
 * around its own fixed local axis (Gate 2A math generalised from a vertical stem to any in-plane direction):
 *   W(s, θ) = low + s·v + r·sinθ·right,  depth z = r·cosθ   (v = axis "up" with v.y < 0 so glyphs are never upside down)
 *   screen  = C + (W − C)·k − v·z·TILT,  k = CAMERA / (CAMERA − z)
 * Only θ changes over time (each axis spins about itself with its own phase); axis directions and camera are fixed.
 *
 * Data path: entryId → grapheme range (piece) → axis/track → arc interval → glyph slot. An entry may be split into
 * several pieces on different axes, but every piece is a DIFFERENT contiguous range (no copies). Allocation is
 * append-only in writing order; each new piece goes to the highest free gap of the region open on its creation day,
 * so a new date's text appears next to the growth boundary and earlier pieces never move.
 * Growth = distinct entryDate count only. A glyph is active only if its box stays below revealTop at every drawn angle.
 * All numbers are [연구안] starting values, not approved art.
 */
import { graphemes } from '../../engine';
import { CAMERA, CULL, FADE_FULL, TILT, type StaticGlyph } from '../multiHelix/engine';
import type { Entry } from '../multiHelix/engine';

export const ART_VERSION = 'full-snowflake-v1.5';
export const VIEW = { width: 300, height: 300 } as const;
export const CX = 150;
export const CY = 150;
export const FONT = 8;
export const TARGET_DAYS = 15; // research fixture only — never the real 2026-12 target
const ADVANCE = 8;
const SPACE = 4;
const GAP = 6; // arc kept free between two pieces on one track
const TWIG_PENALTY = 24; // a twig gap wins only when it is this much higher than the best arm gap (arms trace the six-arm skeleton first)
const BAND = 24; // gaps whose top is within this of the highest one count as "next to the boundary"
const MIN_PIECE = 3; // a split never leaves a piece with fewer visible glyphs than this (unless the text itself is shorter)
export const EXTENT = 0.75 * FONT; // glyph bounding radius (any rotation), logical units before perspective
const RAD = Math.PI / 180;

export const GEOMETRY = {
  arm: { inner: 14, outer: 130, radius: 6.5, rise: 9 },
  twig: { roots: [32, 58, 84], lengths: [48, 40, 30], start: 11, radius: 4, rise: 9, spread: 60 },
} as const;

export type Track = {
  index: number;
  id: string;
  kind: 'arm' | 'twig';
  arm: number;
  level: number; // -1 arm, 0..2 twig pair (inner → outer)
  lx: number; ly: number; // low end (world)
  vx: number; vy: number; // unit axis "up" (vy < 0)
  rx: number; ry: number; // unit right = reading direction on the front face
  len: number;
  radius: number;
  pitch: number; // axial rise per radian
  arc: number; // helix arc length per radian
  aMax: number;
  phase: number;
};

function h(text: string): number {
  let x = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 0x01000193);
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}

function track(index: number, id: string, kind: Track['kind'], arm: number, level: number, ax: number, ay: number, bx: number, by: number, radius: number, rise: number): Track {
  const [lx, ly, hx, hy] = ay >= by ? [ax, ay, bx, by] : [bx, by, ax, ay];
  const len = Math.hypot(hx - lx, hy - ly);
  const vx = (hx - lx) / len;
  const vy = (hy - ly) / len;
  const pitch = rise / (2 * Math.PI);
  const arc = Math.hypot(radius, pitch);
  return { index, id, kind, arm, level, lx, ly, vx, vy, rx: -vy, ry: vx, len, radius, pitch, arc, aMax: (len / pitch) * arc, phase: h(`${ART_VERSION}:${id}:phase`) * 2 * Math.PI };
}

export function buildTracks(): Track[] {
  const { arm: A, twig: T } = GEOMETRY;
  const out: Track[] = [];
  for (let arm = 0; arm < 6; arm++) {
    const phi = (-90 + 60 * arm) * RAD;
    const ux = Math.cos(phi);
    const uy = Math.sin(phi);
    out.push(track(out.length, `a${arm}`, 'arm', arm, -1, CX + ux * A.inner, CY + uy * A.inner, CX + ux * A.outer, CY + uy * A.outer, A.radius, A.rise));
    T.roots.forEach((root, level) => {
      for (const side of [-1, 1] as const) {
        const w = phi + side * T.spread * RAD;
        const rx = CX + ux * root;
        const ry = CY + uy * root;
        const len = T.lengths[level]!;
        out.push(track(out.length, `a${arm}-t${level}${side < 0 ? 'L' : 'R'}`, 'twig', arm, level,
          rx + Math.cos(w) * T.start, ry + Math.sin(w) * T.start, rx + Math.cos(w) * len, ry + Math.sin(w) * len, T.radius, T.rise));
      }
    });
  }
  return out;
}

export const TRACKS = buildTracks();
export const AXIS_COUNT = TRACKS.filter(t => t.kind === 'arm').length;
export const TWIG_COUNT = TRACKS.filter(t => t.kind === 'twig').length;

const SAMPLES = Array.from({ length: 49 }, (_, i) => -Math.acos(CULL) + (2 * Math.acos(CULL) * i) / 48);

/** Screen-y extremes of a glyph box at axial position s over every drawn angle (cos θ ≥ CULL). */
function yRange(t: Track, s: number): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const th of SAMPLES) {
    const z = t.radius * Math.cos(th);
    const k = CAMERA / (CAMERA - z);
    const wy = t.ly + s * t.vy + t.radius * Math.sin(th) * t.ry;
    const y = CY + (wy - CY) * k - t.vy * z * TILT;
    lo = Math.min(lo, y - EXTENT * k);
    hi = Math.max(hi, y + EXTENT * k);
  }
  return [lo, hi];
}

const sAt = (t: Track, a: number) => (t.pitch * a) / t.arc;
export const topAt = (t: Track, a: number) => yRange(t, sAt(t, a))[0];

export const Y_TOP = Math.min(...TRACKS.map(t => topAt(t, t.aMax)));
export const Y_BOTTOM = Math.max(...TRACKS.map(t => yRange(t, 0)[1]));
export const revealTop = (days: number) => Y_BOTTOM - (Y_BOTTOM - Y_TOP) * Math.min(Math.max(days, 0), TARGET_DAYS) / TARGET_DAYS;

/** Largest arc on the track whose glyph is fully inside the region opened by `days` (-1 = none). */
export function openArc(t: Track, days: number): number {
  const top = revealTop(days);
  if (topAt(t, 0) < top) return -1;
  if (topAt(t, t.aMax) >= top) return t.aMax;
  let lo = 0;
  let hi = t.aMax;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (topAt(t, mid) >= top) lo = mid; else hi = mid; }
  return lo;
}

export type Piece = { entryId: string; track: number; aLo: number; aHi: number; from: number; to: number; day: number };
export type Ledger = Map<string, Piece[]>;

const byWriting = (a: Entry, b: Entry) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
const advanceOf = (g: string) => (g === ' ' ? SPACE : ADVANCE);

function freeGaps(used: Piece[], open: number): [number, number][] {
  const sorted = [...used].sort((a, b) => a.aLo - b.aLo);
  const gaps: [number, number][] = [];
  let lo = 0;
  for (const p of sorted) { gaps.push([lo, Math.min(p.aLo - GAP, open)]); lo = p.aHi + GAP; }
  gaps.push([lo, open]);
  return gaps.filter(([a, b]) => b - a >= ADVANCE);
}

/** How many graphemes from `i` fit in `room`; prefers ending at a word boundary when the rest does not fit. */
function fit(chars: { text: string }[], i: number, room: number): { n: number; adv: number } {
  let adv = 0;
  let n = 0;
  while (i + n < chars.length && adv + advanceOf(chars[i + n]!.text) <= room + 1e-6) adv += advanceOf(chars[i + n++]!.text);
  if (i + n < chars.length) {
    let cut = n;
    while (cut > 0 && chars[i + cut]?.text !== ' ' && chars[i + cut - 1]?.text !== ' ') cut--;
    const visible = (m: number) => chars.slice(i, i + m).filter(c => c.text !== ' ').length;
    if (cut > 0 && visible(cut) >= MIN_PIECE) { n = cut; adv = chars.slice(i, i + n).reduce((s, c) => s + advanceOf(c.text), 0); }
  }
  while (n > 0 && chars[i + n - 1]!.text === ' ') adv -= advanceOf(chars[i + --n]!.text); // no trailing space
  return { n, adv };
}

/**
 * Append-only allocation. Entries already in `prev` keep their pieces untouched; new ones are placed in writing order.
 * A new piece must lie inside the region open on its creation day (it never pre-occupies future height).
 */
export function allocate(entries: Entry[], prev?: Ledger): Ledger {
  const ledger: Ledger = new Map();
  const present = new Set(entries.map(e => e.id));
  for (const [id, pieces] of prev ?? []) if (present.has(id)) ledger.set(id, pieces);
  const sorted = [...entries].sort(byWriting);
  const seenDates: string[] = [];
  const onTrack = (ti: number) => [...ledger.values()].flat().filter(p => p.track === ti);
  for (const entry of sorted) {
    if (!seenDates.includes(entry.entryDate)) seenDates.push(entry.entryDate);
    if (ledger.has(entry.id)) continue;
    const day = seenDates.length;
    const chars = graphemes(entry.body);
    const pieces: Piece[] = [];
    ledger.set(entry.id, pieces);
    let i = 0;
    while (i < chars.length) {
      if (chars[i]!.text === ' ') { i++; continue; }
      const left = chars.slice(i).filter(c => c.text !== ' ').length;
      // the first piece may be a single glyph (a new date must show ≥1 complete glyph); later pieces avoid tiny fragments
      const minShown = pieces.length ? Math.min(MIN_PIECE, left) : 1;
      const cands: { track: number; aHi: number; y: number; use: number; n: number; adv: number }[] = [];
      for (const t of TRACKS) {
        const open = openArc(t, day);
        if (open < ADVANCE) continue;
        const used = onTrack(t.index);
        const use = used.reduce((s, p) => s + p.aHi - p.aLo, 0) / t.aMax;
        for (const [gLo, gHi] of freeGaps(used, open)) {
          const f = fit(chars, i, gHi - gLo);
          if (chars.slice(i, i + f.n).filter(c => c.text !== ' ').length < minShown) continue;
          // gap top height (twigs penalised so the six arms are traced first)
          // flush to the gap top (next to the boundary) unless the leftover below would be a dead sliver: then flush to the
          // bottom so the leftover sits at the top and joins the next opened region
          const aHi = gHi - gLo - f.adv < MIN_PIECE * ADVANCE + GAP ? gLo + f.adv : gHi;
          cands.push({ track: t.index, aHi, y: t.ly + sAt(t, gHi) * t.vy + (t.kind === 'twig' ? TWIG_PENALTY : 0), use, ...f });
        }
      }
      if (!cands.length) break; // capacity reached: the rest stays readable in the diary list only
      // next to the growth boundary: among gaps within BAND of the highest one, the least-filled axis wins (spreads entries over arms)
      const yBest = Math.min(...cands.map(c => c.y));
      const best = cands.filter(c => c.y <= yBest + BAND).sort((a, b) => a.use - b.use || a.y - b.y || a.track - b.track)[0]!;
      pieces.push({ entryId: entry.id, track: best.track, aLo: best.aHi - best.adv, aHi: best.aHi, from: i, to: i + best.n, day });
      i += best.n;
    }
  }
  return ledger;
}

export type FlakeGlyph = StaticGlyph & { track: number; s: number; piece: number };

/** Static glyph geometry. Inside a piece reading starts at its top and descends (θ grows → left-to-right on the front). */
export function buildGlyphs(entries: Entry[], ledger: Ledger): FlakeGlyph[] {
  const out: FlakeGlyph[] = [];
  for (const entry of [...entries].sort(byWriting)) {
    const chars = graphemes(entry.body);
    (ledger.get(entry.id) ?? []).forEach((p, piece) => {
      const t = TRACKS[p.track]!;
      let a = p.aHi;
      for (let gi = p.from; gi < Math.min(p.to, chars.length); gi++) {
        const g = chars[gi]!;
        const adv = advanceOf(g.text);
        if (a - adv < p.aLo - 1e-6) break; // edited longer than its slot: the excess is not shown
        const center = a - adv / 2;
        a -= adv;
        if (g.text === ' ') continue;
        const s = sAt(t, center);
        out.push({ key: `${entry.id}:${gi}`, entryId: entry.id, lane: t.index, graphemeIndex: gi, sourceOffset: g.offset, glyph: g.text,
          a: center, theta0: t.phase - center / t.arc, axisY: t.ly + s * t.vy, radius: t.radius, arc: t.arc, topMin: topAt(t, center),
          track: t.index, s, piece });
      }
    });
  }
  return out;
}

export function activeGlyphs(glyphs: FlakeGlyph[], days: number): FlakeGlyph[] {
  const top = revealTop(days);
  return days > 0 ? glyphs.filter(g => g.topMin >= top) : [];
}

/** Non-space graphemes of the entries vs. those that got a slot — the rest are NOT shown in the artwork. */
export function coverage(entries: Entry[], glyphs: FlakeGlyph[]) {
  const total = entries.reduce((s, e) => s + graphemes(e.body).filter(g => g.text !== ' ').length, 0);
  return { total, placed: glyphs.length, hidden: total - glyphs.length };
}

export type Frame = { x: number; y: number; z: number; cos: number; k: number; a: number; b: number; c: number; d: number; opacity: number; level: number };
export const newFrame = (): Frame => ({ x: 0, y: 0, z: 0, cos: 0, k: 1, a: 1, b: 0, c: 0, d: 1, opacity: 0, level: 0 });
export type Offset = { dy: number; du: number; dr: number };
export const ZERO: Offset = { dy: 0, du: 0, dr: 0 };

const smooth = (v: number) => { const x = Math.min(1, Math.max(0, (v - CULL) / (FADE_FULL - CULL))); return x * x * (3 - 2 * x); };

/**
 * Per-frame projection with an object-space float offset (dy along −axis, du along the circumference, dr radial),
 * same convention as Gate 2A-M. For a vertical track this is exactly Gate 2A `project`. With a non-zero offset the
 * screen y is clamped at the growth boundary so floating can never lift a glyph above it.
 */
export function projectFlake(g: FlakeGlyph, off: Offset, angleDeg: number, top: number, out: Frame): Frame {
  const t = TRACKS[g.track]!;
  const r = g.radius + off.dr;
  const theta = g.theta0 + off.du / g.radius - angleDeg * RAD;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const z = r * cos;
  const k = CAMERA / (CAMERA - z);
  const s = g.s - off.dy;
  const wx = t.lx + s * t.vx + r * sin * t.rx;
  const wy = t.ly + s * t.vy + r * sin * t.ry;
  out.cos = cos;
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
  out.opacity = cos < CULL ? 0 : smooth(cos);
  out.level = 0;
  return out;
}
