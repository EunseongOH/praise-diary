/**
 * Gate 3E — identity ledger and stage diff (dev-only, pure). Also the "diff.ts" of spec 31 §7 (one file: the diff IS the
 * ledger's comparison).
 *
 * Identity (derived, documented — the project has no cross-day glyph id):
 *   position  pos = 's<slot>' for an I3 final slot (fixed geometry, same index every day) · 't<kind>:<id>' for a Gate 3B
 *             temporary position (R3 early echo boost 'boost' / same-day 'fill'; id = parent slot + side, fixed geometry)
 *   source    src = entryId : graphemeIndex (the real diary grapheme)
 *   instance  pos | src. The I3 copyIndex is NOT part of it: R3 renumbers echo copies every day (the same grapheme in the
 *             same place gets a new copy number) — kept in `key` and counted as ECHO_CONTINUITY, never hidden.
 * Categories of a stage change A → B, per position:
 *   STABLE           same position, same key
 *   ECHO_CONTINUITY  same position, same source grapheme, other copyIndex (visually identical)
 *   ECHO_REASSIGN    same position, another source (R3 re-distributes echo over the new prefix) → old out, new in
 *   REVEAL           position shown in B only (newly opened motif / temporary echo position)
 *   REMOVE           position shown in A only (temporary echo taper, prefix change)
 * Poses of a shared position are identical in A and B (measured: 0 difference at every instant) → nothing moves.
 */
import type { LGlyph } from '../livingTypography/engine';
import { CX, CY } from '../fullSnowflake/engine';
import type { Snap } from './snapshots';

export type Cat = 'STABLE' | 'ECHO_CONTINUITY' | 'ECHO_REASSIGN' | 'REVEAL' | 'REMOVE';
export const CATS: Cat[] = ['STABLE', 'ECHO_CONTINUITY', 'ECHO_REASSIGN', 'REVEAL', 'REMOVE'];
export type Inst = {
  pos: string; src: string; key: string; i: number; glyph: string; role: LGlyph['role']; entryId: string; date: string;
  x: number; y: number; r: number; temp: boolean; motif: string; motifType: string; arm: number;
};
export type Pair = { pos: string; cat: Cat; a: Inst | null; b: Inst | null };

export function posOf(s: Snap, g: LGlyph) {
  if (g.slot < s.finalSlots) return `s${g.slot}`;
  const t = s.temp.find(x => x.slot === g.slot);
  return t ? `t${t.kind}:${t.id}` : `x${g.slot}`;
}
const instCache = new WeakMap<Snap, Inst[]>();
/** the visible glyph instances of a snapshot, in the snapshot's own draw order (index i = st.active index) */
export function instances(s: Snap): Inst[] {
  const c = instCache.get(s);
  if (c) return c;
  const st = s.is.rs.st, S = st.geo.slots;
  const dateOf = new Map(s.entries.map(e => [e.id, e.entryDate]));
  const out = st.active.map((g, i): Inst => {
    const o = s.is.rs.orb[g.slot], sl = S[g.slot]!;
    const x = o ? o.ox : sl.x, y = o ? o.oy : sl.y;
    const m = s.meta[g.slot]!;
    return { pos: posOf(s, g), src: `${g.entryId}:${g.graphemeIndex}`, key: g.key, i, glyph: g.glyph, role: g.role, entryId: g.entryId, date: dateOf.get(g.entryId) ?? '',
      x, y, r: Math.hypot(x - CX, y - CY), temp: g.slot >= s.finalSlots || g.run.startsWith('fill:'), motif: m.motif, motifType: m.type, arm: m.arm };
  });
  instCache.set(s, out);
  return out;
}

export type Diff = {
  pairs: Pair[]; counts: Record<Cat, number>;
  keyMoved: number; // same key at another position (mostly copyIndex renumbering) — a NAME collision, not a moved glyph
  anchorMoved: number; anchorFlip: number; // anchors whose position / source changed between A and B (must be 0)
  positionCollisions: number; // two glyphs on one position inside one snapshot (must be 0)
};
export function diffSnaps(A: Snap | null, B: Snap): Diff {
  const ia = A ? instances(A) : [], ib = instances(B);
  const ma = new Map(ia.map(x => [x.pos, x])), mb = new Map(ib.map(x => [x.pos, x]));
  const counts = Object.fromEntries(CATS.map(c => [c, 0])) as Record<Cat, number>;
  const pairs: Pair[] = [];
  for (const b of ib) {
    const a = ma.get(b.pos) ?? null;
    const cat: Cat = !a ? 'REVEAL' : a.key === b.key ? 'STABLE' : a.src === b.src ? 'ECHO_CONTINUITY' : 'ECHO_REASSIGN';
    counts[cat]++;
    pairs.push({ pos: b.pos, cat, a, b });
  }
  for (const a of ia) if (!mb.has(a.pos)) { counts.REMOVE++; pairs.push({ pos: a.pos, cat: 'REMOVE', a, b: null }); }
  const keyA = new Map(ia.map(x => [x.key, x.pos]));
  const keyMoved = ib.filter(x => keyA.has(x.key) && keyA.get(x.key) !== x.pos).length;
  let anchorMoved = 0, anchorFlip = 0;
  for (const a of ia) {
    if (a.role !== 'anchor') continue;
    const b = mb.get(a.pos);
    if (!b) { if (!ib.some(x => x.role === 'anchor' && x.src === a.src)) continue; anchorMoved++; continue; } // a prefix change may drop an anchor, never move it
    if (b.src !== a.src || b.role !== 'anchor') anchorFlip++;
  }
  const positionCollisions = ia.length - ma.size + (ib.length - mb.size);
  return { pairs, counts, keyMoved, anchorMoved, anchorFlip, positionCollisions };
}

/** H3 light particles: identity = particle id (site:slot, hash-derived geometry → same id = same light) */
export function diffParticles(A: Snap | null, B: Snap) {
  const pa = A ? A.is.particles : [], pb = B.is.particles;
  const ida = new Set(pa.map(p => p.id)), idb = new Set(pb.map(p => p.id));
  return { stable: pb.filter(p => ida.has(p.id)).length, reveal: pb.filter(p => !ida.has(p.id)).length, remove: pa.filter(p => !idb.has(p.id)).length };
}
