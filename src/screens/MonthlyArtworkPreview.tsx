import { ArtworkSlot } from '../graphics/ArtworkSlot';
import { previewFor } from '../graphics/artworkRegistry';
import type { MonthTheme } from '../data/types';

/** Ready to introduce only when the actual renderer and preview fixture both exist. */
export const hasMonthlyArtworkPreview = (theme?: MonthTheme): boolean => Boolean(previewFor(theme));

/** Precompute during the splash; never block navigation or write fictional records into the diary store. */
export function prefetchMonthlyArtwork(theme: MonthTheme | undefined, reducedMotion: boolean): void {
  const preview = previewFor(theme)?.preview;
  if (preview?.prefetch) void preview.prefetch(reducedMotion).catch(() => { /* regular rendering retries */ });
}

export function MonthlyArtworkPreview({ theme, reducedMotion }: { theme?: MonthTheme; reducedMotion: boolean }) {
  const spec = previewFor(theme);
  if (!spec) return null;
  const { artwork, preview } = spec;
  return <div className="entry-experience__preview" data-entry-artwork-preview={artwork.kind}
    data-artwork-id={artwork.id} data-preview-days={preview.days}>
    <ArtworkSlot theme={theme} entries={[...preview.entries]} writtenDays={preview.days}
      letterCount={preview.entries.length} reducedMotion={reducedMotion} variant="preview" />
  </div>;
}
