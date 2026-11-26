/**
 * Gate 3A — daily growth scheduler (shape-independent). Dev-only, pure.
 * Knows nothing about snowflakes: a month's shape path supplies motif ids per slot and a stage → motif list; this file
 * turns "U distinct diary dates" into a stage, a vertical envelope and per-slot visibility rules.
 * Every number is a [연구안] starting value (spec 29 §2). The real 2026-12 target day count is NOT decided — never hardcode it.
 */

/** proposed reveal height per stage (fraction of the final artwork's vertical range, bottom → top). index = stage 0…15 */
export const STAGE_HEIGHT = [0, 0.13, 0.18, 0.24, 0.3, 0.37, 0.43, 0.5, 0.57, 0.63, 0.7, 0.77, 0.83, 0.89, 0.95, 1] as const;
export const STAGES = 15;
export const DEFAULT_TARGET = 15; // research fixture (spec 12: regular 15 days; the 2026-12 special target is undecided)

/** stage reached after U distinct dates for a research target day count. U ≥ target → final stage; never final before. */
export function stageOf(U: number, target = DEFAULT_TARGET) {
  if (U <= 0) return 0;
  if (U >= target) return STAGES;
  return Math.max(1, Math.min(STAGES - 1, Math.ceil((U * STAGES) / target)));
}

/** world-y of the envelope (nothing may reach above it). yTop/yBottom = the final artwork's vertical range. */
export function envelopeTop(stage: number, yTop: number, yBottom: number) {
  return yBottom - (yBottom - yTop) * STAGE_HEIGHT[Math.max(0, Math.min(STAGES, stage))]!;
}

export type StageSpec = {
  stage: number;
  motifs: string[]; // motif ids first opened at this stage (shape path vocabulary)
  goal: string; // design goal from spec 29 §2 (Korean, for the report) — NOT a claim that it is achieved
  regionId: string;
  scaffold?: string; // temporary echo scaffold type active at this stage (G2 / G3 with scaffold)
};

/** first stage that lists a motif; motifs nobody lists open at the final stage (reported as "unlisted") */
export function motifStages(stages: StageSpec[]) {
  const m = new Map<string, number>();
  for (const s of stages) for (const id of s.motifs) if (!m.has(id)) m.set(id, s.stage);
  return m;
}

/**
 * Same-day density reserve (research policy, G3 only): the third text layer of the motifs that opened TODAY stays hidden
 * while the newest date has a single entry; a second entry on that date fills it (density, same height, same stage).
 * The next date fills it anyway. At the final stage nothing is held back (completion parity).
 */
export type Reserve = 'layerC' | 'none';
export function reserveHides(reserve: Reserve, stage: number, motifStage: number, layer: number, unlocked: boolean) {
  return reserve === 'layerC' && !unlocked && stage < STAGES && motifStage === stage && layer === 2;
}

/** "today" = the newest entryDate; unlocked when that date already has ≥ 2 entries */
export function newestDateCount(entries: { entryDate: string }[]) {
  if (!entries.length) return { date: '', count: 0 };
  const date = entries.reduce((a, e) => (e.entryDate > a ? e.entryDate : a), '');
  return { date, count: entries.filter(e => e.entryDate === date).length };
}
