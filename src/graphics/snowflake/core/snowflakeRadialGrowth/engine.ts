/**
 * Gate 3B — Snowflake Radial Growth study (static). Dev-only, pure, deterministic. Common growth engine.
 * Adapter over Gate 2I I3 (imported, never modified): `buildRefine('I3', D_U)` places every glyph of the U-date prefix
 * set D_U (anchors = append-only ledger, echo, 2G strands, H3 light, particles, Living Core). This file only decides
 * WHICH placed glyphs are visible on day U — by structure (motif) instead of by a vertical clip — plus optional
 * temporary echo positions (R3) and same-day density copies:
 *   R0 — Gate 3A G3 + seed, called verbatim (bottom → up reference)
 *   R2 — center → arm → branch → plate: a slot is visible when the month strategy has opened its motif
 *   R3 — R2 + early echo boost (echo.ts), strength weak / mid / strong
 * No vertical envelope applies to R2/R3: strand orbits and core movers keep their FINAL (day 15) amplitude, so the
 * motion of a visible glyph is exactly the motion it will have in the finished I3. At the final stage every model shows
 * the I3 glyph list in the I3 order → day 15 = Gate 2I I3 (tested).
 */
import { CAMERA, type Entry } from '../multiHelix/engine';
import { CX, CY, revealTop } from '../fullSnowflake/engine';
import { distinctDays } from '../adaptiveSnowflake/engine';
import { EXT, STROKES, h, type LGlyph, type Ledger } from '../livingTypography/engine';
import { planMotion, restOpacity as restOpacityOf, type FSlot, type FState } from '../layeredCrystal/engine';
import { STRAND, type Orb, type RState } from '../foregroundTextRotation/engine';
import { ART_VERSION as FROST_ART, type MonthTheme, type Particle } from '../frostedLighting/engine';
import { CORE_MOTION, buildRefine, type IState, type Mover } from '../h3Refinement/engine';
import { buildGrowth, eventChain, growthEntries, GDATASETS, GEVENTS, type GDataset, type GEvent, type GState } from '../snowflakeDailyGrowth/engine';
import { newestDateCount, reserveHides } from '../snowflakeDailyGrowth/schedule';
import { classifySlots, radius, type SlotMeta } from './classify';
import { DECEMBER, DEFAULT_TARGET, STAGES, stageOf, stageTable, type GrowthStrategy } from './schedule';
import { ECHO_SHARE, ECHO_TAPER, FILL_PER_EXTRA, besidePositions, borrow, extraOnNewest, sameDayText, tempSlot, type EchoLevel, type TempGlyph } from './echo';

export const ART_VERSION = 'snowflake-radial-growth-v0.1';
export type RModel = 'R0' | 'R2' | 'R3';
export const RMODELS: RModel[] = ['R0', 'R2', 'R3'];
/** same-day extra entries: none = I3 as is (text only) · fill = new echo copies in the open region · reserveC = Gate 3A layer-C reserve */
export type Density = 'fill' | 'none' | 'reserveC';
export const DENSITIES: Density[] = ['fill', 'none', 'reserveC'];
export { growthEntries, eventChain, GDATASETS, GEVENTS, STAGES, DEFAULT_TARGET, type GDataset, type GEvent, type EchoLevel };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const topOf = (y: number, z: number, size: number) => { const k = CAMERA / (CAMERA - z); return CY + (y - CY) * k - EXT * size * k; };
/** the finished artwork's open region (day 15 of I3) — the only "envelope" R2/R3 keep (for orbit amplitudes) */
const FINAL_TOP = revealTop(15);

export type ROpts = {
  still?: boolean; prev?: Ledger; seed?: string; targetDays?: number;
  echo?: EchoLevel; // R3 only (default mid)
  density?: Density; // R2/R3 (default fill); R0 always = Gate 3A (layer-C reserve)
  strategy?: GrowthStrategy; // default December center → out
  dayOverride?: number; // WRONG-COMPARISON mode only (day U drawn from a later input)
};
export type RGState = {
  model: RModel; strategy: string; is: IState; base: IState; entries: Entry[]; U: number; stage: number; targetDays: number;
  meta: SlotMeta[]; // per slot of is.rs.st.geo.slots (temporary slots: motif 'seed' / 'fill')
  finalSlots: number; openStage: Int16Array; // per final slot: first stage it shows (99 = never)
  temp: TempGlyph[]; echo: EchoLevel; density: Density; reserveHidden: number; wrongInput: boolean;
  g3a: GState | null; // R0 only: the Gate 3A state itself
};

function orbitPoint(o: Orb, th: number, amp: number) { const c = Math.cos(th); const lat = o.R * Math.sin(th) * amp; return { x: o.ox + o.nx * lat, y: o.oy + o.ny * lat, z: o.oz - o.Rz * (1 - c) * amp, c: 1 - amp * (1 - c) }; }
function orbitTop(o: Orb, size: number, amp: number) {
  let top = Infinity;
  for (let q = 0; q < STRAND.samples; q++) { const p = orbitPoint(o, (2 * Math.PI * q) / STRAND.samples, amp); top = Math.min(top, topOf(p.y, p.z, size * (1 - (STRAND.depthSize * (1 - p.c)) / 2))); }
  return top - STRAND.margin;
}
const strandLayers = (rs: RState, n: number) => { const L = new Int8Array(n).fill(-1); rs.strands.forEach(s => { if (s.source !== 'band2F') for (const c of s.cells) L[c] = s.k; }); return L; };

export function buildRadial(model: RModel, entries: Entry[], o: ROpts = {}): RGState {
  const targetDays = o.targetDays ?? DEFAULT_TARGET;
  const still = !!o.still;
  const strategy = o.strategy ?? DECEMBER;
  const echo = o.echo ?? 'mid';
  const density: Density = o.density ?? 'fill';
  const U = o.dayOverride ?? distinctDays(entries);
  const wrongInput = o.dayOverride != null && o.dayOverride !== distinctDays(entries);

  if (model === 'R0') { // Gate 3A G3 + seed (its default layer-C reserve), untouched
    const g = buildGrowth('G3', entries, { still, prev: o.prev, seed: o.seed, targetDays, scaffold: true, reserve: 'layerC', dayOverride: o.dayOverride });
    const S = g.is.rs.st.geo.slots;
    const meta = classifySlots(S, strandLayers(g.is.rs, S.length)).map((m, i) => (i >= g.finalSlots ? { ...m, motif: 'seed', parent: null } : m));
    const temp: TempGlyph[] = g.scaffold.map(s => ({ id: s.id, kind: 'seed3A', slot: s.slot, key: s.key, entryId: s.entryId, graphemeIndex: s.graphemeIndex, copyIndex: Number(s.key.split(':')[2] ?? -1),
      origin: s.target, originMotif: meta[s.target]!.motif, originStage: g.firstStage[s.target]!, shown: s.shown }));
    return { model, strategy: 'gate3a-G3-seed', is: g.is, base: g.base, entries, U: g.U, stage: g.stage, targetDays, meta, finalSlots: g.finalSlots, openStage: g.firstStage,
      temp, echo, density: 'reserveC', reserveHidden: g.reserveHidden, wrongInput: g.wrongInput, g3a: g };
  }

  const base = buildRefine('I3', entries, { still, prev: o.prev, seed: o.seed });
  const rs = base.rs, st = rs.st, S0 = st.geo.slots;
  const stage = stageOf(U, targetDays);
  const layer = strandLayers(rs, S0.length);
  const meta0 = classifySlots(S0, layer);
  const at = stageTable(strategy);
  const openStage = Int16Array.from(meta0, m => at(m.motif));
  const open = (i: number) => stage > 0 && openStage[i]! <= stage;
  const today = newestDateCount(entries);

  let reserveHidden = 0;
  const active: LGlyph[] = st.glyphs.filter(g => {
    if (!open(g.slot)) return false;
    if (density === 'reserveC' && reserveHides('layerC', stage, openStage[g.slot]!, layer[g.slot]!, today.count >= 2)) { reserveHidden++; return false; }
    return true;
  });

  // strand A keeps its FINAL orbit (2G rule under the finished artwork's region), never the day's vertical clip
  const orb: (Orb | null)[] = [...rs.orb];
  for (const s of rs.strands) if (s.source === 'line') for (const c of s.cells) {
    const ob = rs.orb[c];
    if (!ob) continue;
    const nb: Orb = { ...ob, amp: 1 };
    const size = S0[c]!.size;
    if (orbitTop(nb, size, 1) < FINAL_TOP) { let lo = 0, hi = 1; for (let it = 0; it < 12; it++) { const mid = (lo + hi) / 2; if (orbitTop(nb, size, mid) >= FINAL_TOP) lo = mid; else hi = mid; } nb.amp = lo; }
    orb[c] = nb;
  }

  // temporary positions (R3 boost, same-day fill) — after the final stage there are none
  const slots: FSlot[] = [...S0];
  const meta: SlotMeta[] = [...meta0];
  const temp: TempGlyph[] = [];
  const rest = (i: number): [number, number] => { const ob = orb[i]; return ob ? [ob.ox, ob.oy] : [S0[i]!.x, S0[i]!.y]; };
  const visibleSlots = new Set(active.map(g => g.slot));
  const addTemp = (p: { id: string; parent: number; x: number; y: number; z: number; rot: number; size: number }, g: Omit<LGlyph, 'slot' | 'run'>, kind: TempGlyph['kind'], origin: number) => {
    const i = slots.length;
    const pm = meta0[p.parent]!;
    slots.push(tempSlot(i, p, `${kind}:${p.id}`, pm.arm));
    orb.push(null);
    meta.push({ ...pm, motif: kind === 'boost' ? 'seed' : 'fill', parent: pm.motif, r: radius(p), depthLayer: 4 });
    active.push({ ...g, run: `${kind}:${p.id}`, slot: i });
    temp.push({ id: p.id, kind, slot: i, key: g.key, entryId: g.entryId, graphemeIndex: g.graphemeIndex, copyIndex: g.copyIndex, origin, originMotif: origin >= 0 ? meta0[origin]!.motif : '', originStage: origin >= 0 ? openStage[origin]! : 0, shown: true });
  };
  if (stage > 0 && stage < STAGES) {
    const future = (i: number) => openStage[i]! <= STAGES && !open(i);
    const cands = besidePositions(S0, meta0, i => visibleSlots.has(i), rest, future);
    const taken = new Set<string>();
    if (model === 'R3') {
      // supply = real D_U echo instances placed in a final slot that is not shown today (never anchors, never new copies)
      const supply = st.glyphs.filter(g => g.role === 'echo' && !visibleSlots.has(g.slot) && openStage[g.slot]! <= STAGES);
      const { picked } = borrow(cands, ECHO_SHARE[echo] * ECHO_TAPER[stage]!, supply);
      for (const { p, g } of picked) { taken.add(p.id); addTemp(p, g, 'boost', g.slot); }
    }
    const nExtra = density === 'fill' ? extraOnNewest(entries) : 0;
    if (nExtra > 0) {
      const joins = S0.map((s, i) => ({ s, i })).filter(({ s, i }) => s.join && open(i) && !visibleSlots.has(i)).sort((a, b) => h(`${ART_VERSION}:join:${a.i}`) - h(`${ART_VERSION}:join:${b.i}`));
      const spots = [...joins.map(({ s, i }) => ({ id: `join${i}`, parent: i, x: s.x, y: s.y, z: s.z, rot: s.rot, size: s.size, join: i })),
        ...cands.filter(c => !taken.has(c.p.id)).sort((a, b) => b.r - a.r).map(c => ({ ...c.p, join: -1 }))];
      const text = sameDayText(entries, st.glyphs, Math.min(spots.length, nExtra * FILL_PER_EXTRA));
      text.forEach((g, k) => {
        const sp = spots[k]!;
        if (sp.join >= 0) { active.push({ ...g, run: `fill:${sp.id}`, slot: sp.join }); temp.push({ id: sp.id, kind: 'fill', slot: sp.join, key: g.key, entryId: g.entryId, graphemeIndex: g.graphemeIndex, copyIndex: g.copyIndex, origin: -1, originMotif: meta0[sp.join]!.motif, originStage: openStage[sp.join]!, shown: true }); }
        else addTemp(sp, g, 'fill', -1);
      });
    }
  } else if (stage === STAGES && density === 'fill' && extraOnNewest(entries) > 0) {
    // saturated (every I3 slot open): extra same-day entries fill the 2F join slots I3 leaves empty — nothing else moves
    const joins = S0.map((s, i) => ({ s, i })).filter(({ s, i }) => s.join && !visibleSlots.has(i) && meta0[i]!.motif !== 'band').sort((a, b) => h(`${ART_VERSION}:join:${a.i}`) - h(`${ART_VERSION}:join:${b.i}`));
    const text = sameDayText(entries, st.glyphs, Math.min(joins.length, extraOnNewest(entries) * FILL_PER_EXTRA));
    text.forEach((g, k) => { const i = joins[k]!.i; active.push({ ...g, run: `fill:join${i}`, slot: i }); temp.push({ id: `join${i}`, kind: 'fill', slot: i, key: g.key, entryId: g.entryId, graphemeIndex: g.graphemeIndex, copyIndex: g.copyIndex, origin: -1, originMotif: meta0[i]!.motif, originStage: STAGES, shown: true }); });
  }

  const st2: FState = { ...st, geo: { ...st.geo, slots }, active, top: FINAL_TOP, days: U, natural: active.length, budget: active.length };
  const plan = planMotion(st2, 'M0'); // 2G R2 = M0 plan (strands only)
  const strandOfSlot = new Int32Array(slots.length).fill(-1);
  rs.strands.forEach((s, q) => s.cells.forEach(c => { strandOfSlot[c] = q; }));
  const strandOfGlyph = Int32Array.from(active, g => strandOfSlot[g.slot]!);
  const dyn2G = Uint8Array.from(active, (g, i) => (still ? 0 : plan.dynamic[i]! || (orb[g.slot] ? 1 : 0)));
  const rs2: RState = { ...rs, st: st2, plan, orb, strandOfGlyph, dynamic: dyn2G };

  // 2H lighting of non-strand glyphs (same formula as buildFrost) + particles (same rule as 2H, on THIS active set)
  const L = base.theme.lighting.still;
  const dn = Math.hypot(L.dir[0], L.dir[1]) || 1;
  const staticL = Float32Array.from(active, g => {
    const s = slots[g.slot]!;
    const r = Math.hypot(s.x - CX, s.y - CY) || 1;
    const facing = ((s.x - CX) * L.dir[0] + (s.y - CY) * L.dir[1]) / (r * dn);
    return clamp(L.base + L.perZ * s.z + L.dirGain * facing, L.min, L.max);
  });
  const particles = base.look.particles ? buildParticles(rs2, base.theme, o.seed ?? 'v1') : [];
  const { movers, moverOf, roi } = buildMovers(base, st2, still);
  const dynamic = Uint8Array.from(dyn2G, (v, i) => (v || moverOf[i]! >= 0 ? 1 : 0));
  const is: IState = { ...base, rs: rs2, staticL, particles, beadLines: [], movers, moverOf, dynamic, roi };
  return { model, strategy: strategy.id, is, base, entries, U, stage, targetDays, meta, finalSlots: S0.length, openStage, temp, echo, density, reserveHidden, wrongInput, g3a: null };
}

/** = Gate 2H buildParticles (not exported there), verbatim, on the given state */
function buildParticles(rs: RState, theme: MonthTheme, seed: string): Particle[] {
  const st = rs.st, S = st.geo.slots, P = theme.particles;
  if (st.days <= 0) return [];
  const H = (k: string) => h(`${seed}:${FROST_ART}:p:${k}`);
  const slots = [...new Set(st.active.map(g => g.slot))].map(i => S[i]!);
  const rad = (s: (typeof slots)[0]) => Math.hypot(s.x - CX, s.y - CY);
  const pick: { site: Particle['site']; s: (typeof slots)[0] }[] = [];
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
    const ang = 2 * Math.PI * H(`o${id}`), off = 1 + 1.5 * H(`d${id}`);
    const x = s.x + Math.cos(ang) * off, y = s.y + Math.sin(ang) * off;
    const k = CAMERA / (CAMERA - s.z);
    if (CY + (y - CY) * k - size * k < st.top) continue;
    out.push({ id, site, kind, slot: s.i, x, y, z: s.z + 0.5, size, color: pal[Math.floor(H(`h${id}`) * pal.length)]!, pastel,
      period: lerp(P.twinkle.period[0], P.twinkle.period[1], H(`T${id}`)), phase: H(`f${id}`), duty: lerp(P.twinkle.duty[0], P.twinkle.duty[1], H(`u${id}`)) });
  }
  const budget = Math.floor(st.active.length / P.glyphsPerLight);
  return out.length <= budget ? out : [...out].sort((a, b) => H(`keep${a.id}`) - H(`keep${b.id}`)).slice(0, budget);
}

/** = Gate 2I Living Core mover rule (inside buildRefine there), verbatim, on the given state */
function buildMovers(base: IState, st: FState, still: boolean) {
  const C = CORE_MOTION, S = st.geo.slots, core = base.core;
  const n = st.active.length;
  const roi = st.active.map((g, i) => ({ i, s: S[g.slot]! })).filter(x => x.s.core && Math.hypot(x.s.x - CX, x.s.y - CY) < C.roiR).map(x => x.i);
  const movers: Mover[] = [];
  const moverOf = new Int32Array(n).fill(-1);
  if (core.on && !still && st.days > 0) {
    const per = Math.max(1, Math.min(3, Math.round(core.share * 10)));
    const picks = C.picks[per]!;
    const idxOf = new Map(st.active.map((g, i) => [g.slot, i]));
    let ring = 0;
    for (let e = 0; e < 6; e++) {
      const sk = STROKES.find(s => s.id === `a${e}-${C.ring}`)!;
      const cells = S.filter(s => s.stroke === sk.id).sort((p, q) => Math.hypot(p.x - sk.x0, p.y - sk.y0) - Math.hypot(q.x - sk.x0, q.y - sk.y0));
      let nx = -sk.dy, ny = sk.dx;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;
      if (nx * ((sk.x0 + sk.x1) / 2 - CX) + ny * ((sk.y0 + sk.y1) / 2 - CY) < 0) { nx = -nx; ny = -ny; }
      for (const j of picks) {
        const s = cells[j];
        const group = (ring++ % 2) as 0 | 1;
        if (!s) continue;
        const i = idxOf.get(s.i);
        if (i == null) continue;
        const m: Mover = { i, slot: s.i, edge: e, cell: j, group, ox: s.x, oy: s.y, oz: s.z, nx, ny, R: C.R * core.strength, Rz: C.Rz * core.strength, amp: 1,
          ph: Math.PI * group - (2 * Math.PI * C.wave * e) / 6, size: s.size, rot: s.rot, rest: restOpacityOf(s) };
        const tp = (amp: number) => { let v = Infinity; for (let q = 0; q < C.samples; q++) { const p = moverOrbit(m, (2 * Math.PI * q) / C.samples, amp); v = Math.min(v, topOf(p.y, p.z, m.size * p.sz)); } return v - C.margin; };
        if (tp(1) < st.top) { let lo = 0, hi = 1; for (let it = 0; it < 12; it++) { const mid = (lo + hi) / 2; if (tp(mid) >= st.top) lo = mid; else hi = mid; } m.amp = lo; }
        if (m.amp < 0.05) continue;
        moverOf[i] = movers.length;
        movers.push(m);
      }
    }
  }
  return { movers, moverOf, roi };
}
function moverOrbit(m: Mover, th: number, amp: number) {
  const C = CORE_MOTION;
  const c = Math.cos(th);
  const lat = m.R * Math.sin(th) * amp;
  const cc = 1 - amp * (1 - c);
  return { x: m.ox + m.nx * lat, y: m.oy + m.ny * lat, z: m.oz - m.Rz * (1 - c) * amp, c: cc, sz: 1 - (C.depthSize * (1 - cc)) / 2 };
}

/** build day U of a model from the dataset prefix (convenience for page / tests / capture) */
export function radialDay(model: RModel, U: number, dataset: GDataset = 'base', extra = 0, o: ROpts = {}) {
  return buildRadial(model, growthEntries(U, extra, dataset), o);
}
