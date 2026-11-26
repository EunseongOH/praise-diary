/**
 * Gate 3B — growth strategies (dev-only, pure).
 * Split of responsibilities (decision 27: Shape / Typography / Motion / Lighting / Particles are separate roles):
 *   common engine (engine.ts)   — distinct dates U → stage, slot visibility, text provenance, record changes
 *   month strategy (this file)  — which structure (motif) opens at which stage, and how a slot maps to a motif
 * December = center → outward (this study). January "red sheep and sun" = bottom → up is a CANDIDATE only: Gate 3A's
 * vertical scheduler (snowflakeDailyGrowth/schedule.ts) already is that kind of strategy; no January art is built here.
 * Regular 15 days is the research basis; the 2026-12 special target day count is undecided and never hardcoded.
 */
import { DEFAULT_TARGET, STAGES, stageOf, type StageSpec } from '../snowflakeDailyGrowth/schedule';
import { motifOfSlot, type Motif } from './classify';
import type { FSlot } from '../layeredCrystal/engine';

export { DEFAULT_TARGET, STAGES, stageOf, type StageSpec };

export type GrowthStrategy = {
  id: string; month: string; direction: 'center-out' | 'bottom-up';
  stages: StageSpec[]; // motif ids first opened at each stage (unlisted motifs open at the final stage)
  motifOf: (s: FSlot) => Motif;
};

const ALL = [0, 1, 2, 3, 4, 5];
/** arms: 0 up · 1 upper right · 2 lower right · 3 down · 4 lower left · 5 upper left */
const A = (arms: number[], ...parts: string[]) => arms.flatMap(k => parts.map(p => `${k}:${p}`));
const ARM_PAIR = { vertical: [0, 3], upper: [1, 5], lower: [2, 4] } as const;
const BRANCH_IN = ['b0L', 'b0R', 'b1L', 'b1R', 'spine2', 'spine2~d'];
const TIP = ['spine4', 'tip~d', 'b3L', 'b3R'];

/**
 * December R2 / R3 schedule [연구안] — the user's initial table (Gate 3B §4), mapped onto the motifs that really exist
 * in I3. Adjustments (recorded in growth_schedule.json / README):
 *  · day 2/3 — the inner hex opens as three "V"s (vertices 0, 2, 4) then the other three, each grown out of its spoke
 *  · day 4–6 — an arm root = spine root cells + the closed outer-hex "V" at its vertex (connects to spk1 of day 3)
 *  · day 8–10 — "첫 가지" = both inner branch pairs (b0, b1: I3's long branch roots at u 72) + spine extension
 *  · day 11 — "연결 리브 보강": I3 has no separate rib between core and arm; the root plate depth layer (r 33–44) IS the
 *             core↔arm joint, so it opens here, with the next spine segment of every arm
 *  · day 12/13 — I3 has no tip rosette glyphs (0 drawn); the small b3 barbs next to the tip plate stand in for it
 *  · day 14/15 — the outer branch pairs b2 of the upper then lower diagonal arms → day 15 completes the six-fold symmetry
 */
export const DECEMBER_RADIAL: StageSpec[] = [
  { stage: 1, regionId: 'nucleus', goal: '작은 육각 결정 씨앗과 짧은 방사형 돌기 (핵·안쪽 로제트·미세 고리·첫 돌기)', motifs: ['nucleus', ...A(ALL, 'ros', 'micro', 'spk0')] },
  { stage: 2, regionId: 'innerHex', goal: '코어 육각 일부와 내부 연결 (안쪽 육각 V 3개 + 30° 리브)', motifs: A([0, 2, 4], 'ihex', 'rib') },
  { stage: 3, regionId: 'innerHex', goal: '작은 육각 결정 완성 + 여섯 방향의 짧은 돌기', motifs: [...A([1, 3, 5], 'ihex', 'rib'), ...A(ALL, 'spk1')] },
  { stage: 4, regionId: 'roots', goal: '위·아래 팔의 뿌리 (바깥 육각 V + 줄기 시작)', motifs: A([...ARM_PAIR.vertical], 'ohex', 'root') },
  { stage: 5, regionId: 'roots', goal: '좌상·우상 팔의 뿌리', motifs: A([...ARM_PAIR.upper], 'ohex', 'root') },
  { stage: 6, regionId: 'roots', goal: '좌하·우하 팔의 뿌리 → 바깥 육각 완성, 여섯 방향 골격', motifs: A([...ARM_PAIR.lower], 'ohex', 'root') },
  { stage: 7, regionId: 'spine1', goal: '여섯 팔의 첫 번째 길이 확장 (줄기 + 깊이층)', motifs: A(ALL, 'spine1', 'spine1~d') },
  { stage: 8, regionId: 'branchIn', goal: '위·아래 팔의 첫 가지 (안쪽 가지 2쌍 + 줄기 연장)', motifs: A([...ARM_PAIR.vertical], ...BRANCH_IN) },
  { stage: 9, regionId: 'branchIn', goal: '좌상·우상 팔의 첫 가지', motifs: A([...ARM_PAIR.upper], ...BRANCH_IN) },
  { stage: 10, regionId: 'branchIn', goal: '좌하·우하 팔의 첫 가지', motifs: A([...ARM_PAIR.lower], ...BRANCH_IN) },
  { stage: 11, regionId: 'joint', goal: '코어와 팔 사이 연결 보강 (뿌리판 깊이층) + 여섯 팔 줄기 연장', motifs: A(ALL, 'root~d', 'spine3') },
  { stage: 12, regionId: 'tips', goal: '위·아래 팔 끝의 첫 결정판 + 끝 돌기(로제트 대체) + 바깥 가지', motifs: A([...ARM_PAIR.vertical], ...TIP, 'b2L', 'b2R') },
  { stage: 13, regionId: 'tips', goal: '나머지 네 팔 끝의 결정판과 끝 돌기', motifs: A([...ARM_PAIR.upper, ...ARM_PAIR.lower], ...TIP) },
  { stage: 14, regionId: 'outerBranch', goal: '좌상·우상 팔의 바깥 가지 (외곽 결정 조각)', motifs: A([...ARM_PAIR.upper], 'b2L', 'b2R') },
  { stage: 15, regionId: 'all', goal: '좌하·우하 바깥 가지로 여섯 갈래 대칭 완성 = 기존 I3', motifs: A([...ARM_PAIR.lower], 'b2L', 'b2R') },
];

export const DECEMBER: GrowthStrategy = { id: 'december-radial-v0.1', month: '12', direction: 'center-out', stages: DECEMBER_RADIAL, motifOf: motifOfSlot };

/** motif id → first stage that lists it (unlisted → final stage) */
export function stageTable(strategy: GrowthStrategy) {
  const m = new Map<string, number>();
  for (const s of strategy.stages) for (const id of s.motifs) if (!m.has(id)) m.set(id, s.stage);
  return (id: string) => (id === 'band' ? 99 : m.get(id) ?? STAGES);
}

/** motifs whose structural parent opens LATER than they do (must be empty for a valid center → out schedule) */
export function parentViolations(strategy: GrowthStrategy, graph: Map<string, Motif>) {
  const at = stageTable(strategy);
  const out: { motif: string; stage: number; parent: string; parentStage: number }[] = [];
  for (const [id, m] of graph) if (m.parent && at(m.parent) > at(id)) out.push({ motif: id, stage: at(id), parent: m.parent, parentStage: at(m.parent) });
  return out;
}
