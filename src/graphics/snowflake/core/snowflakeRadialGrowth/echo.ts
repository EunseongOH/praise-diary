/**
 * Gate 3B — temporary echo positions (dev-only, pure).
 *  · R3 early echo boost: the open crystal is thickened by temporary positions right beside its single-layer glyphs
 *    (core rings, spokes, ribs, depth layers). Each temporary glyph IS a real echo instance of D_U whose own final slot
 *    is not open yet (same key = entryId · grapheme · copyIndex, no new copy, never future text). The day its final slot
 *    opens it is drawn there instead (it "joins"); while unopened instances remain, the position borrows another one.
 *    Positions only sit inside the open structure (no future slot nearby, no point beyond the open radius) and fade out
 *    by a fixed taper → gone by stage 10, so day 15 = I3.
 *  · same-day density fill: an extra entry on the newest date adds NEW echo copies of its own text into the open
 *    region (2F join slots first, then the same kind of beside-positions) — stage and outline stay the same.
 * Every number is a [연구안].
 */
import type { LGlyph } from '../livingTypography/engine';
import { graphemes } from '../../engine';
import { h } from '../livingTypography/engine';
import type { FSlot } from '../layeredCrystal/engine';
import type { Entry } from '../multiHelix/engine';
import { radius, type SlotMeta } from './classify';

export const ECHO_ART = 'snowflake-radial-echo-v0.1';
export type EchoLevel = 'weak' | 'mid' | 'strong';
export const ECHO_LEVELS: EchoLevel[] = ['weak', 'mid', 'strong'];
/** share of the candidate positions used (hash rank < share × taper → a position never re-appears once dropped) */
export const ECHO_SHARE: Record<EchoLevel, number> = { weak: 0.3, mid: 0.6, strong: 1 };
/** fade-out per stage (index = stage): full on the seed days, gone by stage 10 (before the arms are complete) */
export const ECHO_TAPER = [0, 1, 1, 1, 0.9, 0.78, 0.64, 0.48, 0.3, 0.14, 0, 0, 0, 0, 0, 0] as const;
export const BESIDE = { off: 3.6, z: -1.6, size: 0.82, shade: 0.9, gap: 1.8, futureGap: 3.5, radialSlack: 2 } as const;
export const FILL_PER_EXTRA = 8; // same-day density: new echo glyphs per extra entry on the newest date

export type Pos = { id: string; parent: number; x: number; y: number; z: number; rot: number; size: number };
export type TempGlyph = {
  id: string; kind: 'boost' | 'fill' | 'seed3A'; slot: number; key: string; entryId: string; graphemeIndex: number; copyIndex: number;
  origin: number; // final slot of the borrowed instance (−1 = a new same-day copy)
  originMotif: string; originStage: number; shown: boolean;
};

/**
 * candidate positions beside the open single-layer glyphs (strand lines already have 3 layers).
 * `rest` = rest point per final slot (strand A: its line point). Deterministic: depends only on geometry + stage.
 */
export function besidePositions(S0: FSlot[], meta: SlotMeta[], open: (i: number) => boolean, rest: (i: number) => [number, number], future: (i: number) => boolean) {
  const openPts: { i: number; x: number; y: number }[] = [], futurePts: [number, number][] = [];
  let rOpen = 0;
  S0.forEach((s, i) => {
    if (meta[i]!.motif === 'band' || s.join) return;
    if (open(i)) { const [x, y] = rest(i); openPts.push({ i, x, y }); rOpen = Math.max(rOpen, meta[i]!.r); } else if (future(i)) futurePts.push(rest(i));
  });
  const near = (pts: [number, number][], x: number, y: number, d: number) => pts.some(p => Math.hypot(p[0] - x, p[1] - y) < d);
  const out: Pos[] = [];
  S0.forEach((s, i) => {
    const m = meta[i]!;
    if (!open(i) || (m.depthLayer >= 0 && m.depthLayer < 3) || m.motif === 'band' || s.join) return; // single-layer + depth glyphs only
    const nx = -Math.sin(s.rot), ny = Math.cos(s.rot);
    for (const side of [-1, 1]) {
      const x = s.x + side * BESIDE.off * nx, y = s.y + side * BESIDE.off * ny;
      const size = s.size * BESIDE.size;
      if (radius({ x, y }) > rOpen + BESIDE.radialSlack) continue; // never beyond the open outline
      if (near(futurePts, x, y, BESIDE.futureGap)) continue; // never where a future glyph will appear (no outline preview)
      if (openPts.some(q => q.i !== i && Math.hypot(q.x - x, q.y - y) < BESIDE.gap * (size + 0.6))) continue; // not on another open glyph
      out.push({ id: `${i}${side < 0 ? 'a' : 'b'}`, parent: i, x, y, z: s.z + BESIDE.z, rot: s.rot, size });
    }
  });
  // no two positions on top of each other (stable: lower hash wins)
  const ranked = out.map(p => ({ p, r: h(`${ECHO_ART}:pos:${p.id}`) })).sort((a, b) => a.r - b.r);
  const kept: { p: Pos; r: number }[] = [];
  for (const c of ranked) if (!kept.some(k => Math.hypot(k.p.x - c.p.x, k.p.y - c.p.y) < BESIDE.gap * (k.p.size + c.p.size))) kept.push(c);
  return kept;
}

export function tempSlot(i: number, p: Pos, stroke: string, arm: number): FSlot {
  return { i, x: p.x, y: p.y, z: p.z, rot: p.rot, size: p.size, kind: 'sprig', layer: 'texture', stroke, arm, join: false, topMin: -Infinity, shade: BESIDE.shade, group: '', core: false } as FSlot;
}

/** R3: pick for each used position a borrowed, not-yet-shown echo instance (rendezvous hash → stable across days) */
export function borrow(positions: { p: Pos; r: number }[], share: number, supply: LGlyph[]) {
  const used = positions.filter(c => c.r < share);
  const taken = new Set<string>();
  const out: { p: Pos; g: LGlyph }[] = [];
  for (const { p } of used) {
    let best: LGlyph | null = null, bv = -1;
    for (const g of supply) { if (taken.has(g.key)) continue; const v = h(`${ECHO_ART}:borrow:${p.id}|${g.key}`); if (v > bv) { bv = v; best = g; } }
    if (!best) break; // supply exhausted
    taken.add(best.key);
    out.push({ p, g: best });
  }
  return { used: used.length, picked: out };
}

/** same-day density: NEW echo copies of the newest date's extra entries (writing order after the first one) */
export function sameDayText(entries: Entry[], glyphs: LGlyph[], n: number): Omit<LGlyph, 'slot' | 'run'>[] {
  if (n <= 0 || !entries.length) return [];
  const newest = entries.reduce((a, e) => (e.entryDate > a ? e.entryDate : a), '');
  const day = entries.filter(e => e.entryDate === newest).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const extra = day.slice(1);
  const copies = new Map<string, number>();
  for (const g of glyphs) { const k = `${g.entryId}:${g.graphemeIndex}`; copies.set(k, Math.max(copies.get(k) ?? 0, g.copyIndex)); }
  const out: Omit<LGlyph, 'slot' | 'run'>[] = [];
  const src = extra.map(e => ({ e, g: graphemes(e.body).map((x, i) => ({ ...x, i })).filter(x => x.text !== ' ' && x.text.trim() !== '') }));
  for (let k = 0; out.length < n && src.some(s => s.g.length); k++) {
    const s = src[k % src.length]!;
    if (!s.g.length) continue;
    const x = s.g[Math.floor(k / src.length) % s.g.length]!;
    const key = `${s.e.id}:${x.i}`;
    const copy = (copies.get(key) ?? 0) + 1;
    copies.set(key, copy);
    out.push({ key: `${key}:${copy}`, entryId: s.e.id, graphemeIndex: x.i, sourceOffset: x.offset, glyph: x.text, role: 'echo', copyIndex: copy });
  }
  return out;
}

/** day-limited view: extra entries counted on the newest date */
export function extraOnNewest(entries: Entry[]) {
  if (!entries.length) return 0;
  const newest = entries.reduce((a, e) => (e.entryDate > a ? e.entryDate : a), '');
  return Math.max(0, entries.filter(e => e.entryDate === newest).length - 1);
}
