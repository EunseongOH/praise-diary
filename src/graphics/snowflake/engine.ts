/**
 * Snowflake 2.5D A/B study engine (docs/spec/19, Gate 1). Pure + deterministic.
 * Development experiment only — NOT wired into the product GraphicArtwork.
 *
 * geometry → reading lanes → per-entry glyph assignment → depth layers → reveal.
 * A and B share every value returned by `layoutSnowflake`; B only adds `connectors`.
 */
import { revealWindow, type RevealWindow } from '../progress';

export const ART_VERSION = 'snowflake-study-v1.1';
export const STUDY_TARGET_DAYS = 15; // spec 19 §5.1: playground fixture month only, never the real 2026-12 target

export type StudyEntry = { id: string; entryDate: string; createdAt: string; body: string };
export type DepthLayer = 'back' | 'mid' | 'front';

/** Appendix B starting values (unapproved, shared by A and B). */
export const DEPTH = {
  back: { scale: 0.94, dx: -1.2, dy: 1.2, opacity: 0.42 },
  mid: { scale: 1.0, dx: 0, dy: 0, opacity: 0.72 },
  front: { scale: 1.04, dx: 1.2, dy: -0.8, opacity: 0.92 },
} as const satisfies Record<DepthLayer, { scale: number; dx: number; dy: number; opacity: number }>;

/** Appendix B — B-only connector strokes. Developer-tunable, fixed for official captures. */
export const CONNECTOR = { max: 24, minLength: 2, maxLength: 8, strokeWidth: 0.45, opacity: 0.22 } as const;

const CENTER_X = 170;
const CENTER_Y = 168;
const BASE_SIZE = 7.4; // art direction v1.0 §1.2: reading glyphs 6.8–8.2 units
const PITCH = 8.4; // advance along a path (8–10 units)
const GLYPH_RADIUS = BASE_SIZE * 0.45;
const SPINE_SLOTS = 13; // r = 11 … 111.8 keeps every glyph inside progress.ts snowflake bounds (52–284)
const SPINE_INNER = 7;
const TWIG_ROOTS = [41, 66, 88] as const;
const TWIG_SLOTS = [3, 3, 2] as const;
const TWIG_SPREAD = 53;
const TWIG_FIRST = 11; // distance from twig root to its first glyph: clears the spine row
const OVERFLOW_OFFSET = 3; // spec 19 §3.2: back texture sits ±1–3 units off the adjacent path
const RAD = Math.PI / 180;

export type Slot = {
  slotId: string;
  segmentId: string;
  x: number;
  y: number;
  /** reading-corrected glyph angle, always within [-90, 90) so text is never upside down */
  angle: number;
  /** unit normal of the path (used for the overflow texture row) */
  nx: number;
  ny: number;
};

export type Segment = {
  segmentId: string;
  kind: 'spine' | 'twig';
  arm: number;
  level: number; // -1 for spine pieces
  rootX: number;
  rootY: number;
  outwardAngle: number;
  /** slots in reading order */
  slots: Slot[];
  /** reading order runs from the tip back to the root */
  readsTowardRoot: boolean;
};

export type Lane = {
  laneId: string;
  arm: number;
  segments: Segment[];
  slots: Slot[];
  maxY: number;
  revealDay: number;
};

export type PlacedGlyph = {
  entryId: string;
  date: string;
  graphemeIndex: number;
  sourceOffset: number;
  laneId: string;
  segmentId: string;
  slotId: string;
  glyph: string;
  x: number;
  y: number;
  angle: number;
  layer: DepthLayer;
  opacity: number;
  fontSize: number;
  /** a non-reading texture copy (back echo or overflow) */
  texture: boolean;
  artVersion: string;
};

export type Connector = { connectorId: string; x1: number; y1: number; x2: number; y2: number; length: number };

export type LaneAssignment = { entryId: string; laneId: string; role: 'reading' | 'overflow' };

export type SnowflakeLayout = {
  dayCount: number;
  reveal: RevealWindow;
  glyphs: PlacedGlyph[];
  connectors: Connector[];
  assignments: LaneAssignment[];
};

const fnv = (text: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0) / 0xffffffff;
};
const jitter = (key: string, span: number) => (fnv(`${ART_VERSION}:${key}`) - 0.5) * span;
const round = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Glyph angle follows the path tangent but is never upside down. Steeper than ±60° (vertical spines, ±83° twigs),
 * Korean rotated 90° stops being legible (art direction v1.0 §2.1), so those paths use upright vertical
 * writing: glyphs stand at 0°, the line still follows the path, read top → bottom.
 */
const VERTICAL_LIMIT = 60;
function readingAngle(outward: number): { angle: number; reversed: boolean } {
  const cos = Math.cos(outward * RAD);
  const sin = Math.sin(outward * RAD);
  const reversed = cos < -1e-9 || (Math.abs(cos) <= 1e-9 && sin > 0);
  let angle = reversed ? outward + 180 : outward;
  angle = ((angle + 180) % 360 + 360) % 360 - 180;
  if (Math.abs(angle) > VERTICAL_LIMIT) return { angle: 0, reversed: sin < 0 };
  return { angle, reversed };
}

function makeSegment(segmentId: string, kind: Segment['kind'], arm: number, level: number, rootX: number, rootY: number, outwardAngle: number, distances: number[]): Segment {
  const { angle, reversed } = readingAngle(outwardAngle);
  const ux = Math.cos(outwardAngle * RAD);
  const uy = Math.sin(outwardAngle * RAD);
  const slots = distances.map((d, i) => {
    const slotId = `${segmentId}-${i}`;
    const perp = jitter(`${slotId}:p`, 0.7);
    return {
      slotId,
      segmentId,
      x: round(rootX + ux * d - uy * perp),
      y: round(rootY + uy * d + ux * perp),
      angle: round(angle + jitter(`${slotId}:a`, 2.4)),
      nx: -uy,
      ny: ux,
    };
  });
  return { segmentId, kind, arm, level, rootX, rootY, outwardAngle, slots: reversed ? slots.reverse() : slots, readsTowardRoot: reversed };
}

/** Twig pair order: the twig that reads into the junction first, then the one leaving it, so a ∨/∧ reads continuously. */
function orderPair(a: Segment, b: Segment): Segment[] {
  if (a.readsTowardRoot !== b.readsTowardRoot) return a.readsTowardRoot ? [a, b] : [b, a];
  const mid = (s: Segment) => s.slots.reduce((sum, slot) => sum + slot.x, 0) / s.slots.length;
  return mid(a) <= mid(b) ? [a, b] : [b, a];
}

function revealDayFor(maxY: number): number {
  for (let day = 1; day <= STUDY_TARGET_DAYS; day++) {
    if (revealWindow('snowflake', day, STUDY_TARGET_DAYS).top <= maxY) return day;
  }
  return STUDY_TARGET_DAYS;
}

/** 6 spines (60°) × 3 twig pairs = 42 structural groups, grouped into 12 connected reading lanes. */
export function buildLanes(): Lane[] {
  const lanes: Lane[] = [];
  for (let arm = 0; arm < 6; arm++) {
    const outward = -90 + arm * 60;
    const ux = Math.cos(outward * RAD);
    const uy = Math.sin(outward * RAD);
    const spineR = Array.from({ length: SPINE_SLOTS }, (_, i) => 11 + PITCH * i);
    const twigs = TWIG_ROOTS.map((at, level) => {
      const distances = Array.from({ length: TWIG_SLOTS[level] ?? 2 }, (_, i) => TWIG_FIRST + PITCH * i);
      const rx = CENTER_X + ux * at;
      const ry = CENTER_Y + uy * at;
      return orderPair(
        makeSegment(`a${arm}-t${level}L`, 'twig', arm, level, rx, ry, outward - TWIG_SPREAD, distances),
        makeSegment(`a${arm}-t${level}R`, 'twig', arm, level, rx, ry, outward + TWIG_SPREAD, distances),
      );
    });
    const groups: Array<[string, Segment[]]> = [
      ['in', [makeSegment(`a${arm}-sIn`, 'spine', arm, -1, CENTER_X, CENTER_Y, outward, spineR.slice(0, SPINE_INNER)), ...(twigs[0] ?? [])]],
      ['out', [makeSegment(`a${arm}-sOut`, 'spine', arm, -1, CENTER_X, CENTER_Y, outward, spineR.slice(SPINE_INNER)), ...(twigs[1] ?? []), ...(twigs[2] ?? [])]],
    ];
    for (const [part, segments] of groups) {
      const slots = segments.flatMap(s => s.slots);
      const maxY = Math.max(...slots.map(s => s.y));
      lanes.push({ laneId: `a${arm}-${part}`, arm, segments, slots, maxY, revealDay: revealDayFor(maxY) });
    }
  }
  // Allocation order: bottom-up reveal, then lower, then left-to-right.
  return lanes.sort((a, b) => a.revealDay - b.revealDay || b.maxY - a.maxY || a.slots[0]!.x - b.slots[0]!.x);
}

export const LANES = buildLanes();

type Grapheme = { text: string; offset: number };

/** Visible characters in original order. Whitespace collapses to one gap; punctuation is kept. */
export function graphemes(body: string): Grapheme[] {
  const text = body.replace(/\s+/g, ' ').trim();
  const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) return Array.from(new Seg('ko', { granularity: 'grapheme' }).segment(text), s => ({ text: s.segment, offset: s.index }));
  let offset = 0;
  return Array.from(text, ch => { const g = { text: ch, offset }; offset += ch.length; return g; });
}

function sortEntries(entries: StudyEntry[]): StudyEntry[] {
  return [...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/**
 * Greedy, append-only lane allocation in (entryDate, createdAt, id) order, so adding an entry never moves earlier ones.
 * - first entry of a date: next free lane (bottom-up order)
 * - same-date extra: a free lane already open at that date, else the back texture layer (보조층) of an open lane
 * - no lane left: back texture layer
 */
export function assignLanes(entries: StudyEntry[]): LaneAssignment[] {
  const used = new Set<string>();
  const overflowLoad = new Map<string, number>();
  const dates: string[] = [];
  const result: LaneAssignment[] = [];
  for (const entry of sortEntries(entries)) {
    if (!graphemes(entry.body).length) continue;
    const firstOfDate = !dates.includes(entry.entryDate);
    if (firstOfDate) dates.push(entry.entryDate);
    const day = dates.indexOf(entry.entryDate) + 1;
    const free = LANES.filter(l => !used.has(l.laneId));
    const lane = firstOfDate ? free[0] : free.find(l => l.revealDay <= day);
    if (lane) {
      used.add(lane.laneId);
      result.push({ entryId: entry.id, laneId: lane.laneId, role: 'reading' });
      continue;
    }
    // Texture goes to the least-loaded open lane, most recently opened (highest) first.
    const open = LANES.filter(l => l.revealDay <= day && used.has(l.laneId)).reverse();
    const host = open.sort((a, b) => (overflowLoad.get(a.laneId) ?? 0) - (overflowLoad.get(b.laneId) ?? 0))[0];
    if (!host) continue;
    overflowLoad.set(host.laneId, (overflowLoad.get(host.laneId) ?? 0) + 1);
    result.push({ entryId: entry.id, laneId: host.laneId, role: 'overflow' });
  }
  return result;
}

/** Reading glyphs: spine part → front (reading section), twig continuation → mid. Every glyph casts a back echo. */
export function layoutSnowflake(entries: StudyEntry[]): SnowflakeLayout {
  const dayCount = new Set(entries.filter(e => graphemes(e.body).length).map(e => e.entryDate)).size;
  const reveal = revealWindow('snowflake', dayCount, STUDY_TARGET_DAYS);
  const byId = new Map(entries.map(e => [e.id, e]));
  const laneById = new Map(LANES.map(l => [l.laneId, l]));
  const assignments = assignLanes(entries);
  const glyphs: PlacedGlyph[] = [];
  const overflowRow = new Map<string, number>();

  const push = (entry: StudyEntry, g: Grapheme, index: number, lane: Lane, slot: Slot, layer: DepthLayer, texture: boolean, shift = 0) => glyphs.push({
    entryId: entry.id, date: entry.entryDate, graphemeIndex: index, sourceOffset: g.offset,
    laneId: lane.laneId, segmentId: slot.segmentId, slotId: slot.slotId, glyph: g.text,
    x: round(slot.x + slot.nx * shift), y: round(slot.y + slot.ny * shift), angle: slot.angle,
    layer, opacity: DEPTH[layer].opacity, fontSize: round(BASE_SIZE * DEPTH[layer].scale), texture, artVersion: ART_VERSION,
  });

  for (const { entryId, laneId, role } of assignments) {
    const entry = byId.get(entryId);
    const lane = laneById.get(laneId);
    if (!entry || !lane) continue;
    const chars = graphemes(entry.body).slice(0, lane.slots.length);
    if (role === 'reading') {
      const spineIds = new Set(lane.segments.filter(s => s.kind === 'spine').map(s => s.segmentId));
      chars.forEach((g, i) => {
        const slot = lane.slots[i]!;
        if (g.text === ' ') return; // a space is an empty slot
        push(entry, g, i, lane, slot, spineIds.has(slot.segmentId) ? 'front' : 'mid', false);
        push(entry, g, i, lane, slot, 'back', true);
      });
    } else {
      const row = (overflowRow.get(laneId) ?? 0) + 1;
      overflowRow.set(laneId, row);
      const shift = OVERFLOW_OFFSET * (row % 2 ? 1 : -1);
      chars.forEach((g, i) => { if (g.text !== ' ') push(entry, g, i, lane, lane.slots[i]!, 'back', true, shift); });
    }
  }
  return { dayCount, reveal, glyphs, connectors: connectorsFor(glyphs), assignments };
}

/**
 * B only: a short stroke across the measured gap between the spine row and a twig's first glyph,
 * generated only where both sides actually carry a reading glyph. Priority: inner twigs first, capped at 24.
 */
function connectorsFor(glyphs: PlacedGlyph[]): Connector[] {
  const filled = new Set(glyphs.filter(g => !g.texture).map(g => g.slotId));
  const candidates: Array<{ level: number; connector: Connector }> = [];
  for (const lane of LANES) {
    const spine = lane.segments.find(s => s.kind === 'spine');
    for (const twig of lane.segments.filter(s => s.kind === 'twig')) {
      const first = twig.slots[twig.readsTowardRoot ? twig.slots.length - 1 : 0]!;
      const spineAt = TWIG_ROOTS[twig.level]!;
      const hasSpineGlyph = !!spine && spine.slots.some(s => filled.has(s.slotId) && Math.abs(Math.hypot(s.x - CENTER_X, s.y - CENTER_Y) - spineAt) < PITCH);
      if (!filled.has(first.slotId) || !hasSpineGlyph) continue;
      const spread = Math.sin(TWIG_SPREAD * RAD);
      const start = GLYPH_RADIUS / spread;
      const end = TWIG_FIRST - GLYPH_RADIUS;
      const length = end - start;
      if (length < CONNECTOR.minLength || length > CONNECTOR.maxLength) continue;
      const ux = Math.cos(twig.outwardAngle * RAD);
      const uy = Math.sin(twig.outwardAngle * RAD);
      candidates.push({ level: twig.level, connector: {
        connectorId: `${twig.segmentId}-joint`, length: round(length),
        x1: round(twig.rootX + ux * start), y1: round(twig.rootY + uy * start),
        x2: round(twig.rootX + ux * end), y2: round(twig.rootY + uy * end),
      } });
    }
  }
  return candidates
    .sort((a, b) => a.level - b.level || a.connector.connectorId.localeCompare(b.connector.connectorId))
    .slice(0, CONNECTOR.max)
    .map(c => c.connector);
}
