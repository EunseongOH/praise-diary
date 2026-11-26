/**
 * Gate 3A — Snowflake Daily Growth Structure study (static). Dev-only, pure, deterministic.
 * Adapter over Gate 2I I3 (imported, never modified): `buildRefine('I3', D_U)` places every glyph of the U-date prefix
 * diary set D_U (anchors = append-only ledger, echo, 2G strands B/C, H3 light, particles, Living Core). The only thing
 * this file changes is WHICH of those placed glyphs are visible on day U (and, for G2, a temporary echo scaffold):
 *   G0 — Gate 2I I3 verbatim: linear 1/15 height clip (the day-1 "one glyph" reference).
 *   G1 — Persistent Foundation: the same final I3 slots only, clipped glyph by glyph to the proposed stage height table.
 *   G2 — Growable Echo Scaffold: G1 + a few temporary echo glyphs that form a small seed at the bottom arm tip. Each one
 *        IS a real echo instance of a final I3 slot that is not open yet (same entryId · grapheme · copyIndex, only D_U
 *        text); the day its final slot opens, the instance is shown there instead (relocation), so it is never drawn twice.
 *        The scaffold is empty from the stage its last target opens, and always at the final stage.
 *   G3 — Structural Stage Schedule S01…S15: motifs open stage by stage (data below) under the stage envelope; optional
 *        scaffold (G2 + G3) and same-day density reserve (schedule.ts).
 * Visibility keeps the I3 rule "a glyph is shown only if it stays under the envelope in EVERY pose it can take" (strands
 * orbit, core movers, float), so the later Gate 3B motion can never push a pixel above the day's envelope.
 * At the final stage every model shows exactly the I3 glyph list in the I3 order → same state as Gate 2I I3 (tested).
 * The 2026-12 target day count is undecided: targetDays is a research input (default 15). Numbers are [연구안].
 */
import { CAMERA, type Entry } from '../multiHelix/engine';
import { CX, CY, Y_BOTTOM, Y_TOP, revealTop } from '../fullSnowflake/engine';
import { graphemes } from '../../engine';
import { distinctDays, type Dataset } from '../adaptiveSnowflake/engine';
import { EXT, STROKES, h, legible, toWorld, type LGlyph, type Ledger } from '../livingTypography/engine';
import { CORE_R, planMotion, restOpacity as restOpacityOf, type FSlot, type FState } from '../layeredCrystal/engine';
import { STRAND, type Orb, type RState } from '../foregroundTextRotation/engine';
import { ART_VERSION as FROST_ART, type MonthTheme, type Particle } from '../frostedLighting/engine';
import { CORE_MOTION, buildRefine, newPose, poseI, rotationEntries, type IState, type Mover } from '../h3Refinement/engine';
import { DEFAULT_TARGET, STAGES, STAGE_HEIGHT, envelopeTop, motifStages, newestDateCount, reserveHides, stageOf, type Reserve, type StageSpec } from './schedule';

export const ART_VERSION = 'snowflake-daily-growth-v0.1';
export type GModel = 'G0' | 'G1' | 'G2' | 'G3';
export const GMODELS: GModel[] = ['G0', 'G1', 'G2', 'G3'];
export type GDataset = Dataset | 'single' | 'punct';
export const GDATASETS: GDataset[] = ['base', 'short', 'ultrashort', 'long', 'mixed', 'single', 'punct'];
export { STAGES, STAGE_HEIGHT, stageOf, DEFAULT_TARGET, type Reserve };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const topOf = (y: number, z: number, size: number) => { const k = CAMERA / (CAMERA - z); return CY + (y - CY) * k - EXT * size * k; };

// ───────────────────────────── fixtures (spec 19 fake diaries only) ─────────────────────────────

/** D_U = the first U dates of the spec 19 fixture (a true prefix: D1 ⊂ D2 ⊂ … ⊂ D15). 'single' / 'punct' are extreme
 *  inputs DERIVED from the same fixture bodies (first grapheme / punctuation only) — no new sentence is written. */
export function growthEntries(days: number, extra: number, dataset: GDataset): Entry[] {
  if (dataset === 'single' || dataset === 'punct') {
    return rotationEntries(days, extra, 'base').map(e => {
      const g = graphemes(e.body).map(x => x.text);
      const body = dataset === 'single' ? g[0]! : g.filter(c => /[\p{P}]/u.test(c)).join('') || '.';
      return { ...e, body };
    });
  }
  return rotationEntries(days, extra, dataset);
}

export type GEvent = 'none' | 'backfill' | 'edit' | 'partialDelete' | 'lastDayDelete' | 'undo';
export const GEVENTS: GEvent[] = ['none', 'backfill', 'edit', 'partialDelete', 'lastDayDelete', 'undo'];
/**
 * Record changes around day U (fixture bodies only):
 *  backfill      — date U−1 had no entry; on day U the user writes it for that past date (U−1 → U distinct dates)
 *  edit          — the first entry's body is replaced by the fixture's same-day extra body (U unchanged)
 *  partialDelete — date U has 2 entries (fixture extra); the original one is deleted → the date stays (U unchanged)
 *  lastDayDelete — the only entry of date U is deleted (U → U−1)
 *  undo          — lastDayDelete, then the same entry is restored (must equal the original state)
 * `chain` = successive entry sets; each later state is built with the previous state's ledger (append-only anchors).
 */
export function eventChain(U: number, dataset: GDataset, ev: GEvent): { chain: Entry[][]; target: string | null } {
  const D = growthEntries(U, 0, dataset);
  const plus = growthEntries(U, 2, dataset);
  const last = D[D.length - 1];
  switch (ev) {
    case 'backfill': {
      if (U < 2) return { chain: [D], target: null };
      const gap = D[D.length - 2]!;
      const before = D.filter(e => e.id !== gap.id);
      return { chain: [before, [...before, { ...gap, createdAt: `${last!.entryDate}T21:00:00+09:00` }]], target: gap.id };
    }
    case 'edit': {
      const extra = plus.find(e => e.id === 'demo-extra-1');
      if (!D.length || !extra) return { chain: [D], target: null };
      return { chain: [D, D.map(e => (e.id === D[0]!.id ? { ...e, body: extra.body } : e))], target: D[0]!.id };
    }
    case 'partialDelete': {
      if (!last) return { chain: [D], target: null };
      const two = plus.filter(e => e.id !== 'demo-extra-2');
      return { chain: [two, two.filter(e => e.id !== last.id)], target: last.id };
    }
    case 'lastDayDelete': return last ? { chain: [D, D.slice(0, -1)], target: last.id } : { chain: [D], target: null };
    case 'undo': return last ? { chain: [D, D.slice(0, -1), D], target: last.id } : { chain: [D], target: null };
    default: return { chain: [D], target: null };
  }
}

// ───────────────────────────── snowflake shape path (December F2 geometry) ─────────────────────────────

/** motif id of a slot: arm + structural part (spine split at the branch roots, so a spine grows segment by segment) */
export function motifOf(s: FSlot): string {
  if (s.stroke.startsWith('seed:')) return 'seed';
  if (s.arm < 0) return 'nucleus';
  let part = s.stroke.replace(/^a\d-/, '').replace(/:.*$/, '');
  if (/^rib\d$/.test(part)) part = 'rib';
  if (part === 'spine') { const u = Math.hypot(s.x - CX, s.y - CY); part = `spine${u < 54 ? 0 : u < 72 ? 1 : u < 90 ? 2 : u < 102 ? 3 : 4}`; }
  return `${s.arm}:${part}`;
}
/** arms: 0 up · 1 upper right · 2 lower right · 3 down · 4 lower left · 5 upper left */
const both = (...a: string[]) => a;
export const SNOWFLAKE_STAGES: StageSpec[] = [
  { stage: 1, regionId: 'bottomTip', scaffold: 'seed', goal: '하단 결정 씨앗: 짧은 축 + 양쪽 미세 돌기', motifs: both('3:spine4', '3:tipplate', '3:b3L', '3:b3R') },
  { stage: 2, regionId: 'bottomArm', scaffold: 'seed', goal: '씨앗 바깥쪽 첫 분기 1쌍', motifs: both('3:b2L', '3:b2R', '3:spine3') },
  { stage: 3, regionId: 'bottomArm', scaffold: 'seed', goal: '하단 짧은 결정 가지 (긴 가지 쌍)', motifs: both('3:b1L', '3:b1R', '3:spine2') },
  { stage: 4, regionId: 'bottomArm', scaffold: 'seed', goal: '위쪽(코어 방향) 연결 줄기 연장', motifs: both('3:spine1', '3:b0L', '3:b0R') },
  { stage: 5, regionId: 'bottomArm+lowerTips', scaffold: 'seed', goal: '하단 팔 뿌리 판형 + 좌우 하단 팔의 결정 끝', motifs: both('3:spine0', '3:rootplate', '2:tipplate', '4:tipplate', '2:spine4', '4:spine4', '2:b3R', '4:b3L') },
  { stage: 6, regionId: 'lowerArms', goal: '하단 좌/우 비스듬한 팔과 가지', motifs: both('2:b2R', '4:b2L', '2:b1R', '4:b1L', '2:spine3', '4:spine3', '2:b0R', '4:b0L', '2:b3L', '4:b3R', '2:b2L', '4:b2R', '2:spine2', '4:spine2', '2:spine1', '4:spine1') },
  { stage: 7, regionId: 'coreBottom', goal: '하단에서 중앙으로 향하는 접합부 (바깥 육각 아래 두 변)', motifs: both('2:ohex', '3:ohex', '2:spine0', '4:spine0', '2:rootplate', '4:rootplate', '2:b1L', '4:b1R', '2:b0L', '4:b0R', '2:spk1', '3:spk1', '4:spk1', '3:spk0') },
  { stage: 8, regionId: 'coreMiddle', goal: '육각 코어 일부: 안쪽 육각 아래·옆 변, 중심', motifs: both('2:ihex', '3:ihex', '1:ihex', '4:ihex', '1:ohex', '4:ohex', '2:rib', '3:rib', '4:rib', '1:micro', '2:micro', '3:micro', '4:micro', '2:ros', '3:ros', '4:ros', '2:spk0', '4:spk0', 'nucleus') },
  { stage: 9, regionId: 'coreTop+upperRoots', goal: '코어 상단 연결부 + 위쪽 팔 뿌리', motifs: both('0:ihex', '5:ihex', '0:ros', '1:ros', '5:ros', '0:micro', '5:micro', '0:spk0', '1:spk0', '5:spk0', '0:spk1', '1:spk1', '5:spk1', '0:rib', '1:rib', '5:rib', '0:ohex', '5:ohex', '1:rootplate', '5:rootplate', '1:spine0', '5:spine0', '1:b0R', '5:b0L') },
  { stage: 10, regionId: 'sixDirections', goal: '여섯 방향의 큰 팔 시작 구조', motifs: both('1:b1R', '5:b1L', '1:spine1', '5:spine1', '1:b2R', '5:b2L', '1:b0L', '5:b0R', '0:rootplate', '0:spine0', '1:spine2', '5:spine2', '1:spine3', '5:spine3', '1:b3R', '5:b3L') },
  { stage: 11, regionId: 'upperSideArms', goal: '좌상·우상 작은 가지와 팔 끝', motifs: both('1:b1L', '5:b1R', '1:b2L', '5:b2R', '1:tipplate', '5:tipplate', '1:spine4', '5:spine4', '1:b3L', '5:b3R', '0:spine1', '0:b0L', '0:b0R') },
  { stage: 12, regionId: 'topArm', goal: '위쪽 팔의 두 번째(긴) 가지 쌍', motifs: both('0:b1L', '0:b1R', '0:spine2') },
  { stage: 13, regionId: 'topArm', goal: '상단 가지 연결', motifs: both('0:spine3', '0:b2L', '0:b2R') },
  { stage: 14, regionId: 'topTip', goal: '위쪽 팔 끝의 세부 결정 조각', motifs: both('0:spine4', '0:b3L', '0:b3R', '0:tipplate') },
  { stage: 15, regionId: 'all', goal: '기존 I3 완성 (남은 모든 슬롯)', motifs: [] },
];
const MOTIF_STAGE = motifStages(SNOWFLAKE_STAGES);
export const motifStage = (m: string) => MOTIF_STAGE.get(m) ?? STAGES;

/** G2 seed: arm-local points (u along the arm, v across) at the bottom arm tip — 2 barb pairs + 4 points of a small tip
 *  ring. Each point borrows ONE not-yet-open echo instance whose final slot opens at `retire` (research values). */
export const SEED = {
  arm: 3, size: 0.56, z: 2.4, shade: 0.95,
  points: [
    { id: 'barbL0', u: 111, v: 5.2, dir: [0.5, 0.866], retire: 4 }, { id: 'barbR0', u: 111, v: -5.2, dir: [0.5, -0.866], retire: 4 },
    { id: 'barbL1', u: 113.3, v: 9.1, dir: [0.5, 0.866], retire: 3 }, { id: 'barbR1', u: 113.3, v: -9.1, dir: [0.5, -0.866], retire: 3 },
    { id: 'ringL0', u: 118.5, v: 6.06, dir: [-0.866, 0.5], retire: 5 }, { id: 'ringR0', u: 118.5, v: -6.06, dir: [0.866, 0.5], retire: 5 },
    { id: 'ringL1', u: 125.5, v: 6.06, dir: [0.866, 0.5], retire: 6 }, { id: 'ringR1', u: 125.5, v: -6.06, dir: [-0.866, 0.5], retire: 6 },
  ],
} as const;

// ───────────────────────────── growth state ─────────────────────────────

export type ScaffoldPoint = { id: string; slot: number; target: number; retireStage: number; targetArm: number; targetMotif: string };
export type ScaffoldGlyph = ScaffoldPoint & { key: string; entryId: string; graphemeIndex: number; shown: boolean };
export type GOpts = {
  still?: boolean; prev?: Ledger; seed?: string; targetDays?: number;
  scaffold?: boolean; // G3 only (G2 always on, G0/G1 off)
  reserve?: Reserve; // G3 only (default layerC)
  dayOverride?: number; // WRONG-COMPARISON mode only: build day U's view from a later (e.g. final 15-day) input
};
export type GState = {
  model: GModel; is: IState; base: IState; entries: Entry[]; U: number; stage: number; targetDays: number;
  top: number; frac: number; scaffoldOn: boolean; reserve: Reserve; unlocked: boolean; wrongInput: boolean;
  slotMotif: string[]; slotLayer: Int8Array; // strand layer k (−1 = not a strand slot)
  finalSlots: number; // slots of the I3 geometry (scaffold slots come after)
  scaffold: ScaffoldGlyph[]; reserveHidden: number; firstStage: Int16Array; // per final slot: first stage it can show (99 = never)
};

function orbitPoint(o: Orb, th: number, amp: number) { const c = Math.cos(th); const lat = o.R * Math.sin(th) * amp; return { x: o.ox + o.nx * lat, y: o.oy + o.ny * lat, z: o.oz - o.Rz * (1 - c) * amp, c: 1 - amp * (1 - c) }; }
function orbitTop(o: Orb, size: number, amp: number) {
  let top = Infinity;
  for (let q = 0; q < STRAND.samples; q++) { const p = orbitPoint(o, (2 * Math.PI * q) / STRAND.samples, amp); top = Math.min(top, topOf(p.y, p.z, size * (1 - (STRAND.depthSize * (1 - p.c)) / 2))); }
  return top - STRAND.margin;
}

export function buildGrowth(model: GModel, entries: Entry[], o: GOpts = {}): GState {
  const targetDays = o.targetDays ?? DEFAULT_TARGET;
  const still = !!o.still;
  const base = buildRefine('I3', entries, { still, prev: o.prev, seed: o.seed });
  const rs = base.rs, st = rs.st, S0 = st.geo.slots;
  const U = o.dayOverride ?? distinctDays(entries);
  const wrongInput = o.dayOverride != null && o.dayOverride !== distinctDays(entries);
  const slotMotif = S0.map(motifOf);
  const slotLayer = new Int8Array(S0.length).fill(-1);
  rs.strands.forEach(s => { if (s.source !== 'band2F') for (const c of s.cells) slotLayer[c] = s.k; });
  const reserve: Reserve = model === 'G3' ? (o.reserve ?? 'layerC') : 'none';
  const scaffoldOn = model === 'G2' || (model === 'G3' && o.scaffold !== false);
  const unlocked = newestDateCount(entries).count >= 2;
  if (model === 'G0') {
    const top = revealTop(U);
    return { model, is: base, base, entries, U, stage: U, targetDays, top, frac: (Y_BOTTOM - top) / (Y_BOTTOM - Y_TOP), scaffoldOn: false, reserve, unlocked, wrongInput,
      slotMotif, slotLayer, finalSlots: S0.length, scaffold: [], reserveHidden: 0, firstStage: new Int16Array(S0.length).fill(99) };
  }
  const stage = stageOf(U, targetDays);
  const top = stage > 0 ? envelopeTop(stage, Y_TOP, Y_BOTTOM) : Y_BOTTOM;
  const scheduled = (slot: number, sg: number) => model !== 'G3' || motifStage(slotMotif[slot]!) <= sg;
  const openAt = (slot: number, sg: number) => sg > 0 && S0[slot]!.topMin >= envelopeTop(sg, Y_TOP, Y_BOTTOM) && scheduled(slot, sg);
  const firstStage = Int16Array.from(S0, (_, i) => { for (let sg = 1; sg <= STAGES; sg++) if (openAt(i, sg)) return sg; return 99; });

  // visibility of the placed glyphs (I3 order kept: st.glyphs = 2F glyphs minus dropped bands, then 2G strand glyphs)
  let reserveHidden = 0;
  const visible = (g: LGlyph) => {
    if (stage <= 0 || firstStage[g.slot]! > stage) return false;
    if (reserveHides(reserve, stage, motifStage(slotMotif[g.slot]!), slotLayer[g.slot]!, unlocked)) { reserveHidden++; return false; }
    return true;
  };
  const active: LGlyph[] = st.glyphs.filter(visible);

  // strand A orbits shrink under THIS envelope (2G rule, same bisection) — everything else keeps the 2G orbit
  const orb: (Orb | null)[] = [...rs.orb];
  for (const s of rs.strands) if (s.source === 'line') for (const c of s.cells) {
    const ob = rs.orb[c];
    if (!ob) continue;
    const nb: Orb = { ...ob, amp: 1 };
    const size = S0[c]!.size;
    if (orbitTop(nb, size, 1) < top) { let lo = 0, hi = 1; for (let it = 0; it < 12; it++) { const mid = (lo + hi) / 2; if (orbitTop(nb, size, mid) >= top) lo = mid; else hi = mid; } nb.amp = lo; }
    orb[c] = nb;
  }

  // G2 scaffold: temporary positions for real echo instances whose final slot is not open yet
  const slots: FSlot[] = [...S0];
  const scaffold: ScaffoldGlyph[] = [];
  if (scaffoldOn && stage > 0) {
    const bySlot = new Map(st.glyphs.map(g => [g.slot, g]));
    const lineCell = new Set(st.geo.lines.flatMap(l => l.cells));
    const taken = new Set<number>();
    for (const p of SEED.points) {
      const [x, y] = toWorld(SEED.arm, p.u, p.v);
      // reading direction: arm-local (du, dv) → world, never upside down
      const ang = (-90 + 60 * SEED.arm) * Math.PI / 180;
      const wx = p.dir[0] * Math.cos(ang) - p.dir[1] * Math.sin(ang), wy = p.dir[0] * Math.sin(ang) + p.dir[1] * Math.cos(ang);
      const slot: FSlot = { i: slots.length, x, y, z: SEED.z, rot: legible(wx, wy).rot, size: SEED.size, kind: 'sprig', layer: 'texture', stroke: `seed:${p.id}`, arm: SEED.arm,
        join: false, topMin: topOf(y, SEED.z, SEED.size), shade: SEED.shade, group: '', core: false };
      slots.push(slot);
      orb.push(null);
      // target = a final echo slot (never an anchor line cell first) that opens exactly at `retire`: own arm first, nearest
      // (R2 drops the 2F auxiliary bands and 2F keeps join slots empty → only slots holding a real echo glyph of D_U qualify)
      const cand = S0.map((s, i) => ({ s, i })).filter(({ s, i }) => firstStage[i] === p.retire && slotLayer[i]! <= 0 && !taken.has(i) && s.layer !== 'band' && !s.join && bySlot.get(i)?.role === 'echo')
        .map(({ s, i }) => ({ i, arm: s.arm, rank: (s.arm === SEED.arm ? 0 : 1000) + (lineCell.has(i) ? 500 : 0) + Math.hypot(s.x - x, s.y - y) + h(`${ART_VERSION}:seed:${p.id}:${i}`) * 1e-3 }))
        .sort((a, b) => a.rank - b.rank);
      const t = cand[0];
      if (!t) continue; // reported as an abandoned scaffold point
      taken.add(t.i);
      const tg = bySlot.get(t.i);
      const shown = stage < p.retire && !!tg && tg.role === 'echo' && slot.topMin >= top;
      scaffold.push({ id: p.id, slot: slot.i, target: t.i, retireStage: p.retire, targetArm: t.arm, targetMotif: slotMotif[t.i]!, key: tg?.key ?? '', entryId: tg?.entryId ?? '', graphemeIndex: tg?.graphemeIndex ?? -1, shown });
      if (shown) active.push({ ...tg!, run: `scaffold:${p.id}`, slot: slot.i });
    }
  }

  const st2: FState = { ...st, geo: { ...st.geo, slots }, active, top, days: U, natural: active.length, budget: active.length };
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

  // 2I Living Core movers (same rule) under THIS envelope
  const { movers, moverOf, roi } = buildMovers(base, st2, still);
  const dynamic = Uint8Array.from(dyn2G, (v, i) => (v || moverOf[i]! >= 0 ? 1 : 0));
  const is: IState = { ...base, rs: rs2, staticL, particles, beadLines: [], movers, moverOf, dynamic, roi };
  return { model, is, base, entries, U, stage, targetDays, top, frac: STAGE_HEIGHT[stage]!, scaffoldOn, reserve, unlocked, wrongInput,
    slotMotif, slotLayer, finalSlots: S0.length, scaffold, reserveHidden, firstStage };
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

// ───────────────────────────── metrics (automatic; NOT an aesthetic verdict) ─────────────────────────────

const r2 = (v: number) => Math.round(v * 100) / 100;
/** highest point any visible glyph / particle can reach over one strand + core period (sampled), world units */
export function reachTop(gs: GState, samples = 24) {
  const is = gs.is, n = is.rs.st.active.length, f = newPose();
  let top = Infinity;
  const T = Math.max(is.rs.opts.period, is.core.period);
  const times = is.still ? [0] : Array.from({ length: samples }, (_, k) => (k / samples) * T);
  for (const t of times) for (let i = 0; i < n; i++) { const p = poseI(is, i, t, f); top = Math.min(top, p.y - EXT * Math.hypot(p.a, p.b)); }
  for (const p of is.particles) { const k = CAMERA / (CAMERA - p.z); top = Math.min(top, CY + (p.y - CY) * k - p.size * k); }
  return top;
}

function hullArea(pts: [number, number][]) {
  if (pts.length < 3) return 0;
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0]! - o[0]!) * (b[1]! - o[1]!) - (a[1]! - o[1]!) * (b[0]! - o[0]!);
  const lo: [number, number][] = [], up: [number, number][] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (up.length >= 2 && cross(up[up.length - 2]!, up[up.length - 1]!, q) <= 0) up.pop(); up.push(q); }
  const hull = [...lo.slice(0, -1), ...up.slice(0, -1)];
  let a = 0;
  for (let k = 0; k < hull.length; k++) { const [x0, y0] = hull[k]!, [x1, y1] = hull[(k + 1) % hull.length]!; a += x0 * y1 - x1 * y0; }
  return Math.abs(a) / 2;
}
/** rest point of a visible glyph (strand glyphs: their point on the line axis) */
function restXY(gs: GState, g: LGlyph): [number, number] { const o = gs.is.rs.orb[g.slot]; const s = gs.is.rs.st.geo.slots[g.slot]!; return o ? [o.ox, o.oy] : [s.x, s.y]; }
/** connected pieces of the visible structure (rest points closer than `link` world units are joined; 16 ≈ two glyph
 *  advances, so one empty word-gap cell of an anchor phrase does not count as a structural break) */
export function components(gs: GState, link = 16) {
  const pts = gs.is.rs.st.active.map(g => restXY(gs, g));
  const parent = pts.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) if (Math.hypot(pts[a]![0] - pts[b]![0], pts[a]![1] - pts[b]![1]) <= link) parent[find(a)] = find(b);
  const size = new Map<number, number>();
  pts.forEach((_, i) => { const r = find(i); size.set(r, (size.get(r) ?? 0) + 1); });
  const sizes = [...size.values()].sort((a, b) => b - a);
  return { count: sizes.length, sizes: sizes.slice(0, 8), largestShare: pts.length ? r2(sizes[0]! / pts.length) : 0, strays: sizes.filter(s => s < 3).length };
}

export function measureGrowth(gs: GState, prev?: GState | null) {
  const is = gs.is, st = is.rs.st, S = st.geo.slots, act = st.active;
  const fin = gs.finalSlots;
  const isScaffold = (g: LGlyph) => g.slot >= fin;
  const vis = new Set(act.filter(g => !isScaffold(g)).map(g => g.slot));
  const prevVis = prev ? new Set(prev.is.rs.st.active.filter(g => g.slot < prev.finalSlots).map(g => g.slot)) : new Set<number>();
  const placed = new Set(st.glyphs.map(g => g.slot)); // strand cells can become a word gap (space) when the phrase changes
  const motifs = new Set(act.filter(g => !isScaffold(g)).map(g => gs.slotMotif[g.slot]!));
  const prevMotifs = prev ? new Set(prev.is.rs.st.active.filter(g => g.slot < prev.finalSlots).map(g => prev.slotMotif[g.slot]!)) : new Set<string>();
  const newest = newestDateCount(gs.entries).date;
  const newestIds = new Set(gs.entries.filter(e => e.entryDate === newest).map(e => e.id));
  const pts = act.map(g => restXY(gs, g));
  const finalHull = finalHullArea();
  const prevBySlot = prev ? new Map(prev.is.rs.st.active.map(g => [g.slot, g])) : new Map<number, LGlyph>();
  let churn = 0, both = 0;
  for (const g of act) { if (isScaffold(g)) continue; const o = prevBySlot.get(g.slot); if (!o) continue; both++; if (o.entryId !== g.entryId || o.graphemeIndex !== g.graphemeIndex) churn++; }
  const anchorsOf = (x: GState) => { const m = new Map<string, string>(); for (const g of x.is.rs.st.glyphs) if (g.role === 'anchor') m.set(g.entryId, `${m.get(g.entryId) ?? ''}|${g.slot}:${g.graphemeIndex}`); return m; };
  let anchorStationary = 0, anchorMoved = 0;
  if (prev) { const A = anchorsOf(prev), B = anchorsOf(gs); for (const [id, v] of A) if (B.has(id)) { if (B.get(id) === v) anchorStationary++; else anchorMoved++; } }
  let crowded = 0;
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = S[act[i]!.slot]!, b = S[act[j]!.slot]!;
    if (Math.abs(a.z - b.z) < 1.5 && Math.hypot(pts[i]![0] - pts[j]![0], pts[i]![1] - pts[j]![1]) < 2.6 * (a.size + b.size) && !(is.rs.orb[a.i] && is.rs.orb[b.i])) crowded++;
  }
  const scheduled = gs.model === 'G3' ? SNOWFLAKE_STAGES.filter(s => s.stage <= gs.stage).flatMap(s => s.motifs) : [];
  const allMotifs = new Set(S.slice(0, fin).map((_, i) => gs.slotMotif[i]!));
  const blank = scheduled.filter(m => allMotifs.has(m) && !motifs.has(m));
  const sourceKeys = new Set(act.map(g => `${g.entryId}:${g.graphemeIndex}`));
  const keys = act.map(g => g.key);
  const cx = pts.reduce((a, p) => a + p[0], 0) / Math.max(1, pts.length), cy = pts.reduce((a, p) => a + p[1], 0) / Math.max(1, pts.length);
  const region = (g: LGlyph) => { const s = S[g.slot]!; return isScaffold(g) ? 'seed' : Math.hypot(s.x - CX, s.y - CY) < CORE_R ? 'core' : /tipplate|spine4|b3/.test(gs.slotMotif[g.slot]!) ? 'tip' : 'arm'; };
  const by = (f: (g: LGlyph) => string) => act.reduce((m, g) => { const k = f(g); m[k] = (m[k] ?? 0) + 1; return m; }, {} as Record<string, number>);
  const reach = reachTop(gs);
  return {
    model: gs.model, U: gs.U, stage: gs.stage, targetDays: gs.targetDays, entries: gs.entries.length, wrongInput: gs.wrongInput,
    proposedRevealFraction: r2(gs.frac), envelopeTop: r2(gs.top), reachTop: r2(reach), ghostAboveEnvelope: reach < gs.top - 1e-6,
    visibleGlyphs: act.length, anchors: act.filter(g => g.role === 'anchor').length, echo: act.filter(g => g.role === 'echo' && !isScaffold(g)).length, scaffold: act.filter(isScaffold).length,
    uniqueSourceGlyphs: sourceKeys.size, copiesPerSource: r2(act.length / Math.max(1, sourceKeys.size)), duplicateInstances: keys.length - new Set(keys).size,
    particles: is.particles.length, pastel: is.particles.filter(p => p.pastel).length, movers: is.movers.length,
    bbox: pts.length ? [r2(Math.min(...pts.map(p => p[0]))), r2(Math.min(...pts.map(p => p[1]))), r2(Math.max(...pts.map(p => p[0]))), r2(Math.max(...pts.map(p => p[1])))] : null,
    centerOfMass: pts.length ? [r2(cx), r2(cy)] : null, hullCoverage: r2(hullArea(pts) / finalHull),
    byRegion: by(region), motifs: motifs.size, newMotifIds: [...motifs].filter(m => !prevMotifs.has(m)).sort(),
    newlyVisibleSlots: [...vis].filter(s => !prevVis.has(s)).length, hiddenAgainSlots: [...prevVis].filter(s => !vis.has(s) && placed.has(s)).length, gapMovedSlots: [...prevVis].filter(s => !placed.has(s)).length,
    newestDateGlyphs: act.filter(g => newestIds.has(g.entryId)).length, newestDateAnchors: act.filter(g => g.role === 'anchor' && newestIds.has(g.entryId)).length,
    identityChurn: both ? r2(churn / both) : 0, anchorStationary, anchorMoved,
    crowdedPairs: crowded, blankScheduledMotifs: blank, reserveHidden: gs.reserveHidden, unlocked: gs.unlocked,
    components: components(gs),
    scaffoldPoints: gs.scaffold.map(s => ({ id: s.id, target: s.target, targetMotif: s.targetMotif, retireStage: s.retireStage, shown: s.shown })),
  };
}
let finalHull = 0;
function finalHullArea() {
  if (!finalHull) { const gs = buildGrowth('G1', rotationEntries(15, 0, 'base'), { still: true }); finalHull = hullArea(gs.is.rs.st.active.map(g => restXY(gs, g))); }
  return finalHull;
}

/** schedule as data (growth_schedule.json): per stage the motifs, slots, envelope and what actually shows (base fixture) */
export function scheduleLedger(model: GModel = 'G3', o: GOpts = {}) {
  const rows = [];
  let prev: GState | null = null;
  for (let U = 0; U <= STAGES; U++) {
    const gs = buildGrowth(model, growthEntries(U, 0, 'base'), { still: true, ...o, prev: prev?.base.rs.base.ledger });
    const m = measureGrowth(gs, prev);
    const spec = SNOWFLAKE_STAGES.find(s => s.stage === gs.stage);
    const slotIds = gs.firstStage.reduce<number[]>((a, v, i) => (v === gs.stage ? [...a, i] : a), []);
    rows.push({
      stage: gs.stage, U, motifIds: model === 'G3' ? spec?.motifs ?? [] : [], regionId: spec?.regionId ?? 'none', goal: spec?.goal ?? '없음',
      minDay: U, proposedHeight: STAGE_HEIGHT[gs.stage], maxVisibleY: r2(gs.top), reachTop: m.reachTop, prefixCount: gs.entries.length,
      targetSlotIds: slotIds, targetSlotCount: slotIds.length, sourceCount: m.uniqueSourceGlyphs, visibleGlyphs: m.visibleGlyphs,
      newMotifIds: m.newMotifIds, newlyVisibleSlots: m.newlyVisibleSlots, allowedEarlyEcho: m.scaffold, echoScaffoldType: gs.scaffoldOn && m.scaffold ? 'seed: barb×2 쌍 + 끝 고리 4' : 'none',
      reserveHidden: gs.reserveHidden, blankScheduledMotifs: m.blankScheduledMotifs,
    });
    prev = gs;
  }
  const listed = new Set(SNOWFLAKE_STAGES.flatMap(s => s.motifs));
  const fin = buildGrowth('G1', rotationEntries(15, 0, 'base'), { still: true });
  const present = new Set(fin.is.rs.st.active.map(g => fin.slotMotif[g.slot]!));
  return { model, rows, listedButAbsent: [...listed].filter(m => !present.has(m)), unlistedOpenAtFinal: [...present].filter(m => !listed.has(m)).sort() };
}
