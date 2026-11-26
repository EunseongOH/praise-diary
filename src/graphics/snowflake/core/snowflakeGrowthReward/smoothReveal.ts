/**
 * Gate 3E.1b — smooth motif-first growth schedule (dev-only, pure). Same data, same ledger, same exact endpoints as Gate
 * 3E.1 (snapshots / identityLedger imported unchanged); only the per-instance alpha curves differ. Positions never move.
 *   day window [tau(k−1), tau(k)]:
 *     appear  — the day's new motifs open in structure order (core → roots → spine → inner → outer branches → tip plates);
 *               each motif first shows its whole silhouette faintly (envelope), then its glyphs fill along the motif from
 *               the parent side outward (fill wave). Envelope = easeOutCubic (no overshoot), fill = easeInOutSine.
 *     settle  — fill tails, the R3 temporary-echo taper, and the echo swaps close to today's new structure.
 *     swaps   — far from today's new structure (low attention) earlier, near it late; new glyph rises before the old
 *               one fades (a "grain change", not a blink); spread over the window.
 *   Everything ends inside the window → at tau(k) the picture is EXACTLY S(k).
 *   rewind  — leaving glyphs fade outside → inside, thinned by a hash share (density falls gradually, no hard ring);
 *             the seed's own changes cross-fade at the end → exactly S(1).
 */
import { h } from '../livingTypography/engine';
import { diffSnaps, instances, type Cat, type Diff, type Inst } from '../snowflakeGrowthReplay/identityLedger';
import type { Snap } from '../snowflakeGrowthReplay/snapshots';
import { ART_VERSION, GROWTH, MOTIF_RANK } from './theme';
import type { Windows } from './timeline';

export type Ease = 'outCubic' | 'inOut' | 'linear';
const EASE: Record<Ease, (x: number) => number> = { outCubic: x => 1 - (1 - x) ** 3, inOut: x => (1 - Math.cos(Math.PI * x)) / 2, linear: x => x };
export type Seg = { a0: number; a1: number; w: number; ease: Ease; layer: 'flow' | 'env' | 'fill' | 'swap' | 'remove' | 'rewind' };
export type SDraw = { st: 0 | 1; i: number; pos: string; cat: Cat; dir: 0 | 1 | -1; segs: Seg[]; end: number };
export type SLight = { i: number; dir: 0 | 1 | -1; segs: Seg[]; end: number };
export type SPlan = { k: number; t0: number; t1: number; P: Snap; C: Snap; diff: Diff; orderP: SDraw[]; orderC: SDraw[]; partP: SLight[]; partC: SLight[]; motifs: { id: string; rank: number; env: [number, number]; n: number }[] };

/** visibility of a draw at e: 0 before its first segment, exactly 1 (in) / 0 (out) after its last one */
export function alphaS(d: { dir: number; segs: Seg[]; end: number }, e: number) {
  if (d.dir === 0) return 1;
  let v = 0;
  if (e >= d.end) v = 1;
  else for (const s of d.segs) v += s.w * (e <= s.a0 ? 0 : e >= s.a1 ? 1 : EASE[s.ease]((e - s.a0) / (s.a1 - s.a0)));
  return d.dir > 0 ? v : 1 - v;
}
const one = (a0: number, a1: number, ease: Ease, layer: Seg['layer']): Seg[] => [{ a0, a1, w: 1, ease, layer }];
const endOf = (segs: Seg[]) => Math.max(...segs.map(s => s.a1));
const ARM_ORDER = [0, 3, 1, 4, 2, 5];

export function smoothPlan(k: number, P: Snap, C: Snap, w: Windows, v: 'G1' | 'G2'): SPlan {
  const g = GROWTH[v];
  const t0 = k === 1 ? 0 : w.tau[k - 1]!, t1 = k === 1 ? w.rewind[1] : w.tau[k]!, W = t1 - t0;
  const diff = diffSnaps(P, C);
  const hh = (s: string) => h(`${ART_VERSION}:${v}:${s}`);
  const segOf = new Map<string, { a: Seg[] | null; b: Seg[] | null }>(); // per position: old side (out) / new side (in)
  const motifs: SPlan['motifs'] = [];
  const rr = (x: Inst) => x.r;
  if (k === 1) { // soft rewind
    const leaving = diff.pairs.filter(p => p.cat === 'REMOVE');
    const rs = leaving.map(p => rr(p.a!));
    const r0 = Math.min(...rs, 0), r1 = Math.max(...rs, 1);
    for (const p of diff.pairs) {
      if (p.cat === 'STABLE' || p.cat === 'ECHO_CONTINUITY') continue;
      if (p.cat === 'REMOVE') {
        const q = 0.75 * (1 - (rr(p.a!) - r0) / Math.max(1e-6, r1 - r0)) + 0.25 * hh(`rw:${p.pos}`);
        const a0 = t0 + W * 0.6 * q;
        segOf.set(p.pos, { a: one(a0, a0 + 0.4 * W, 'inOut', 'rewind'), b: null });
      } else segOf.set(p.pos, { a: p.a ? one(t0 + 0.62 * W, t1, 'inOut', 'rewind') : null, b: p.b ? one(t0 + 0.55 * W, t0 + 0.95 * W, 'inOut', 'rewind') : null });
    }
  } else {
    const reveal = diff.pairs.filter(p => p.cat === 'REVEAL');
    // motif groups of today's new positions (temporary echo positions group by their own parent motif + arm)
    const groups = new Map<string, Inst[]>();
    for (const p of reveal) { const b = p.b!; const id = b.temp ? `temp:${b.motif}:${b.arm}` : b.motif; (groups.get(id) ?? groups.set(id, []).get(id)!).push(b); }
    const list = [...groups].map(([id, xs]) => ({ id, xs, rank: (MOTIF_RANK[xs[0]!.motifType] ?? 0) + (xs[0]!.temp ? 0.5 : 0), arm: ARM_ORDER.indexOf(xs[0]!.arm), r: xs.reduce((a, x) => a + x.r, 0) / xs.length }));
    list.sort((a, b) => a.rank - b.rank || a.arm - b.arm || a.r - b.r);
    list.forEach((m, j) => {
      const es = t0 + W * g.envStagger * (list.length > 1 ? j / (list.length - 1) : 0), ee = es + W * g.envLen;
      motifs.push({ id: m.id, rank: m.rank, env: [es, ee], n: m.xs.length });
      const rMin = Math.min(...m.xs.map(rr)), rMax = Math.max(...m.xs.map(rr));
      for (const x of m.xs) {
        const u = rMax > rMin ? (x.r - rMin) / (rMax - rMin) : 0;
        const fs = es + W * (g.fillDelay + g.fillSpread * u), fe = Math.min(t1, fs + W * g.fillLen);
        // flow: a constant-rate share over the WHOLE day window — the day keeps moving right up to tau(k) and the next day
        // moves from its first instant, so the growth never stops at a day boundary (endpoints stay exact)
        segOf.set(x.pos, { a: null, b: [{ a0: t0, a1: t1, w: g.flow, ease: 'linear', layer: 'flow' }, { a0: es, a1: ee, w: g.envelope, ease: 'outCubic', layer: 'env' }, { a0: fs, a1: fe, w: 1 - g.envelope - g.flow, ease: 'inOut', layer: 'fill' }] });
      }
    });
    const newPts = reveal.map(p => [p.b!.x, p.b!.y] as const);
    for (const p of diff.pairs) {
      if (p.cat === 'REMOVE') {
        const a0 = t0 + W * (g.removeFrom + (1 - g.removeFrom - g.removeLen) * hh(`rm:${p.pos}`));
        segOf.set(p.pos, { a: [{ a0: t0, a1: t1, w: g.flow, ease: 'linear', layer: 'flow' }, { a0, a1: a0 + W * g.removeLen, w: 1 - g.flow, ease: 'inOut', layer: 'remove' }], b: null });
      } else if (p.cat === 'ECHO_REASSIGN') {
        const x = p.b!;
        let d = Infinity;
        for (const [px, py] of newPts) d = Math.min(d, Math.hypot(px - x.x, py - x.y));
        const near = newPts.length ? 1 - Math.min(1, d / 60) : 0; // 1 = right next to today's new structure → late
        const q = Math.min(1, Math.max(0, 0.5 * near + 0.5 * hh(`sw:${p.pos}`)));
        const s = t0 + W * (g.swapFrom + g.swapSpread * q), L = W * g.swapLen;
        segOf.set(p.pos, { a: one(s + 0.2 * L, s + L, 'inOut', 'swap'), b: one(s, s + 0.8 * L, 'inOut', 'swap') });
      }
    }
  }
  const byP = new Map<string, SDraw>(), byC = new Map<string, SDraw>();
  for (const p of diff.pairs) {
    const sg = segOf.get(p.pos);
    if (p.cat === 'STABLE' || p.cat === 'ECHO_CONTINUITY' || !sg) {
      if (p.a) byP.set(p.pos, { st: 0, i: p.a.i, pos: p.pos, cat: p.cat, dir: 0, segs: [], end: t0 });
      if (p.b) byC.set(p.pos, { st: 1, i: p.b.i, pos: p.pos, cat: p.cat, dir: 0, segs: [], end: t0 });
      continue;
    }
    if (p.a && sg.a) byP.set(p.pos, { st: 0, i: p.a.i, pos: p.pos, cat: p.cat, dir: -1, segs: sg.a, end: endOf(sg.a) });
    if (p.b && sg.b) byC.set(p.pos, { st: 1, i: p.b.i, pos: p.pos, cat: p.cat, dir: 1, segs: sg.b, end: endOf(sg.b) });
  }
  const ip = instances(P), ic = instances(C);
  const orderP = [...ip.map(x => byP.get(x.pos)!), ...ic.map(x => byC.get(x.pos)!).filter(d => d.dir === 1)];
  const orderC = [...ic.map(x => byC.get(x.pos)!), ...ip.map(x => byP.get(x.pos)!).filter(d => d.dir === -1)];
  // H3 lights: a light of a new slot arrives with the settle (after its glyphs), a leaving light fades in the settle too
  const idsP = new Set(P.is.particles.map(p => p.id)), idsC = new Set(C.is.particles.map(p => p.id));
  const lt = (dir: 0 | 1 | -1, i: number): SLight => { if (!dir) return { i, dir, segs: [], end: t0 }; const s = one(t0 + (k === 1 ? 0.3 : 0.5) * W, t0 + 0.95 * W, 'inOut', 'remove'); return { i, dir, segs: s, end: endOf(s) }; };
  const partP = P.is.particles.map((p, i) => lt(idsC.has(p.id) ? 0 : -1, i));
  const partC = C.is.particles.map((p, i) => lt(idsP.has(p.id) ? 0 : 1, i));
  return { k, t0, t1, P, C, diff, orderP, orderC, partP, partC, motifs };
}

/** draws of a frame with alpha > 0, in draw order (P order in the first half of the window, C order in the second) */
export function sdrawsOf(plan: SPlan, e: number) {
  const useC = (e - plan.t0) / (plan.t1 - plan.t0) >= 0.5;
  const out: { st: 0 | 1; i: number; alpha: number; d: SDraw }[] = [];
  for (const d of useC ? plan.orderC : plan.orderP) { const a = alphaS(d, e); if (a > 0) out.push({ st: d.st, i: d.i, alpha: a, d }); }
  return { useC, draws: out };
}
