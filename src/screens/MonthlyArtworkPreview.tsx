import { ArtworkSlot } from '../graphics/ArtworkSlot';
import { SNOWFLAKE_ARTWORK } from '../graphics/snowflake/flags';
import { DECEMBER_PREVIEW_DAYS, DECEMBER_PREVIEW_ENTRIES } from '../data/brandPreviewFixtures';
import type { MonthTheme } from '../data/types';

/** Only expose artwork that uses the same renderer as the user's home.
 * The January sheep engine is not yet integrated: NEVER substitute a fake sheep image.
 */
export function hasMonthlyArtworkPreview(theme?: MonthTheme): boolean {
  return Boolean(SNOWFLAKE_ARTWORK && theme?.kind === 'snowflake' && theme.month === '2026-12');
}

/** Warm the same worker-backed snapshots while the brand splash is visible.
 * This must not block the intro timeline or modify the diary store.
 */
export function prefetchMonthlyArtwork(theme: MonthTheme | undefined, reducedMotion: boolean): void {
  if (!hasMonthlyArtworkPreview(theme)) return;
  void Promise.all([
    import('../graphics/snowflake/snapshots'),
    import('../graphics/snowflake/sourceAdapter'),
  ]).then(([snapshots, adapter]) => {
    return snapshots.requestState(adapter.toEngine(DECEMBER_PREVIEW_ENTRIES), reducedMotion);
  }).catch(() => { /* The live renderer can retry; never stall entry on a prefetch error. */ });
}

export function MonthlyArtworkPreview({ theme, reducedMotion }: { theme?: MonthTheme; reducedMotion: boolean }) {
  if (!hasMonthlyArtworkPreview(theme)) return null;
  return <div className="entry-experience__preview" data-entry-artwork-preview="snowflake" data-preview-days={DECEMBER_PREVIEW_DAYS}>
    <ArtworkSlot theme={theme} entries={DECEMBER_PREVIEW_ENTRIES} writtenDays={DECEMBER_PREVIEW_DAYS}
      letterCount={DECEMBER_PREVIEW_ENTRIES.length} reducedMotion={reducedMotion} variant="preview" />
  </div>;
}
