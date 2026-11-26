/**
 * Gate 2A — multi-entry helix accumulation on ONE stem (docs/spec/20 v1.3). Dev-only, pure, deterministic.
 *
 * The stem carries continuous helical TRACKS. Each diary entry owns one contiguous arc SEGMENT of one track, so two
 * entries can never interleave. Segments are recorded in a LEDGER in writing order; existing segments are never
 * re-allocated (append-only), which keeps positions stable across new entries, edits and deletes.
 *   S: one track, segments stacked bottom-up along the axis.
 *   R: three adjacent tracks (different radius + phase); each entry takes the lowest free spot across tracks.
 * Growth (distinct entryDate count) only decides WHICH glyphs are active: a glyph is shown only if its projected box
 * stays below revealTop at every visible angle, so nothing is ever cut in half or appears above the boundary.
 * All numbers are [연구안] experiment values.
 */
import { graphemes } from '../../engine';

export type Mode = 'S' | 'R';
export type Entry = { id: string; entryDate: string; createdAt: string; body: string };

export const VIEW = { width: 240, height: 360 } as const;
export const CX = 120;
export const CY = 180;
export const STEM_BOTTOM = 320;
export const STEM_TOP = 40;
export const TARGET_DAYS = 15; // research fixture only — never the real 2026-12 target
export const FONT = 10;
const ADVANCE = 10;
const SPACE = 5;
const GAP = 15; // arc between two entries' segments
const RISE_PER_TURN = 20;
export const PITCH = RISE_PER_TURN / (2 * Math.PI);
export const TILT = Math.sin(12 * Math.PI / 180);
export const CAMERA = 420;
export const CULL = 0.2; // cos θ below this = back / too thin → not drawn (no mirrored text, no vertical slivers)
export const FADE_FULL = 0.55;
const EXTENT = 0.62; // half glyph height incl. slant, in em

export const LANES: Record<Mode, { radius: number; phase: number }[]> = {
  S: [{ radius: 36, phase: 0 }],
  R: [{ radius: 36, phase: 0 }, { radius: 46, phase: Math.PI }, { radius: 27, phase: Math.PI / 2 }],
};

export const revealTop = (days: number) => STEM_BOTTOM - (STEM_BOTTOM - STEM_TOP) * Math.min(Math.max(days, 0), TARGET_DAYS) / TARGET_DAYS;

const arcLen = (r: number) => Math.hypot(r, PITCH);
const axisYAt = (r: number, a: number) => STEM_BOTTOM - PITCH * (a / arcLen(r));
const maxArc = (r: number) => ((STEM_BOTTOM - STEM_TOP) / PITCH) * arcLen(r);

/** Highest point the glyph box can reach over every drawn angle (cos θ ∈ [CULL, 1]). */
export function topMin(axisY: number, r: number): number {
  return Math.min(...[CULL, 1].map(c => {
    const k = CAMERA / (CAMERA - r * c);
    return CY + (axisY - CY) * k + r * c * TILT - EXTENT * FONT * k;
  }));
}

/** Largest track arc whose glyph is fully inside the region opened by `days`. */
function openArc(r: number, days: number): number {
  const top = revealTop(days);
  if (topMin(axisYAt(r, 0), r) < top) return -1;
  let lo = 0;
  let hi = maxArc(r);
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (topMin(axisYAt(r, mid), r) >= top) lo = mid; else hi = mid; }
  return lo;
}

export type Segment = { entryId: string; lane: number; aLo: number; aHi: number; dayAtCreation: number };
export type Ledger = Map<string, Segment>;

const byWriting = (a: Entry, b: Entry) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
const advanceOf = (g: string) => (g === ' ' ? SPACE : ADVANCE);

/**
 * Append-only allocation. Entries already in `prev` keep their segment untouched; new ones are placed in writing order.
 * A new segment must start and end inside the region open on its creation day (it never pre-occupies future height).
 */
export function allocate(entries: Entry[], mode: Mode, prev?: Ledger): Ledger {
  const lanes = LANES[mode];
  const ledger: Ledger = new Map();
  const present = new Set(entries.map(e => e.id));
  for (const [id, seg] of prev ?? []) if (present.has(id)) ledger.set(id, seg);
  const sorted = [...entries].sort(byWriting);
  const seenDates: string[] = [];
  for (const entry of sorted) {
    if (!seenDates.includes(entry.entryDate)) seenDates.push(entry.entryDate);
    if (ledger.has(entry.id)) continue;
    const chars = graphemes(entry.body);
    if (!chars.some(g => g.text !== ' ')) continue;
    const day = seenDates.length;
    const need = chars.reduce((s, g) => s + advanceOf(g.text), 0);
    // first segment already written for this date (its sibling), used by R to keep same-day entries at the same height
    const sibling = [...ledger.values()].find(s => s.dayAtCreation === day && sorted.find(e => e.id === s.entryId)?.entryDate === entry.entryDate);
    const isExtra = !!sibling;
    // S: the single track. R: new dates grow on the main track; same-day extras go to the adjacent tracks first,
    // and any entry falls back to another track only when its preferred one is saturated.
    const order = mode === 'S' ? [0] : isExtra ? [1, 2, 0] : [0, 1, 2];
    let pick: { index: number; start: number; room: number } | undefined;
    for (const index of order) {
      const lane = lanes[index]!;
      const used = [...ledger.values()].filter(s => s.lane === index);
      const laneTop = used.length ? Math.max(...used.map(s => s.aHi)) + GAP : 0;
      const siblingHeight = sibling && mode === 'R' && index !== sibling.lane
        ? (PITCH * sibling.aLo) / arcLen(lanes[sibling.lane]!.radius) : 0;
      const start = Math.max(laneTop, (siblingHeight / PITCH) * arcLen(lane.radius));
      const room = openArc(lane.radius, day) - start;
      if (room >= ADVANCE) { pick = { index, start, room }; break; }
    }
    if (!pick) continue; // saturated: the entry stays readable in the diary list only
    ledger.set(entry.id, { entryId: entry.id, lane: pick.index, aLo: pick.start, aHi: pick.start + Math.min(need, pick.room), dayAtCreation: day });
  }
  return ledger;
}

export type StaticGlyph = {
  key: string;
  entryId: string;
  lane: number;
  graphemeIndex: number;
  sourceOffset: number;
  glyph: string;
  a: number;
  theta0: number;
  axisY: number;
  radius: number;
  arc: number;
  topMin: number;
};

/** Static (angle-independent) glyph geometry. Reading starts at the segment top and descends (θ grows → left-to-right). */
export function buildGlyphs(entries: Entry[], ledger: Ledger, mode: Mode): StaticGlyph[] {
  const lanes = LANES[mode];
  const out: StaticGlyph[] = [];
  for (const entry of [...entries].sort(byWriting)) { // fixed order → identical draw order for equal depths
    const seg = ledger.get(entry.id);
    if (!seg) continue;
    const { radius, phase } = lanes[seg.lane]!;
    const L = arcLen(radius);
    let a = seg.aHi;
    graphemes(entry.body).forEach((g, graphemeIndex) => {
      const adv = advanceOf(g.text);
      if (a - adv < seg.aLo - 1e-6) { a = -Infinity; return; } // excerpt = contiguous prefix that fits the segment
      const center = a - adv / 2;
      a -= adv;
      if (g.text === ' ') return;
      const axisY = axisYAt(radius, center);
      out.push({ key: `${entry.id}:${graphemeIndex}`, entryId: entry.id, lane: seg.lane, graphemeIndex, sourceOffset: g.offset, glyph: g.text,
        a: center, theta0: phase - center / L, axisY, radius, arc: L, topMin: topMin(axisY, radius) });
    });
  }
  return out;
}

export function activeGlyphs(glyphs: StaticGlyph[], days: number): StaticGlyph[] {
  const top = revealTop(days);
  return days > 0 ? glyphs.filter(g => g.topMin >= top) : [];
}

export type Projected = { x: number; y: number; z: number; cos: number; k: number; a: number; b: number; c: number; d: number; opacity: number };

const smooth = (v: number) => { const t = Math.min(1, Math.max(0, (v - CULL) / (FADE_FULL - CULL))); return t * t * (3 - 2 * t); };

/** Per-frame projection (allocation-free when `out` is reused). Angle in degrees, positive = the fixed rotation direction. */
export function project(g: StaticGlyph, angleDeg: number, out: Projected): Projected {
  const theta = g.theta0 - (angleDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const z = g.radius * cos;
  const k = CAMERA / (CAMERA - z);
  out.cos = cos;
  out.z = z;
  out.k = k;
  out.x = CX + g.radius * Math.sin(theta) * k;
  out.y = CY + (g.axisY - CY) * k + z * TILT;
  out.a = (k * g.radius * cos) / g.arc;
  out.b = (k * PITCH) / g.arc;
  out.c = (-k * PITCH * cos) / g.arc;
  out.d = (k * g.radius) / g.arc;
  out.opacity = cos < CULL ? 0 : smooth(cos);
  return out;
}

export const newProjected = (): Projected => ({ x: 0, y: 0, z: 0, cos: 0, k: 1, a: 1, b: 0, c: 0, d: 1, opacity: 0 });
export const GLYPH_EXTENT = EXTENT * FONT;
