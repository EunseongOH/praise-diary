/**
 * The art grows from the *actual lower edge of its silhouette*.
 * A calendar day changes the fill height; additional diary entries on the same
 * day increase glyph density, not height. 2026-12 has an unconfirmed target;
 * that branch is only an explicitly capped preview, not a completion rule.
 */
export type ArtworkKind = 'snowflake' | 'sheep';

export type RevealWindow = { top: number; height: number; bottom: number; ratio: number };

const SILHOUETTE_BOUNDS: Record<ArtworkKind, { top: number; bottom: number }> = {
  snowflake: { top: 52, bottom: 284 },
  sheep: { top: 42, bottom: 295 },
};

export function artFillRatio(writtenDays: number, targetDays: number | null): number {
  const days = Math.max(0, Math.floor(Number.isFinite(writtenDays) ? writtenDays : 0));
  if (days === 0) return 0;
  if (targetDays != null && targetDays > 0) return Math.min(1, days / targetDays);
  // December special target has not been set. Visual study only, never "complete".
  return Math.min(0.85, days * 0.085);
}

export function revealWindow(kind: ArtworkKind, writtenDays: number, targetDays: number | null): RevealWindow {
  const { top, bottom } = SILHOUETTE_BOUNDS[kind];
  const ratio = artFillRatio(writtenDays, targetDays);
  const height = (bottom - top) * ratio;
  return { top: bottom - height, height, bottom, ratio };
}
