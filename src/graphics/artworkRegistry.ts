import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { DiaryEntry, MonthTheme } from '../data/types';
import { DECEMBER_PREVIEW_ENTRIES } from '../data/brandPreviewFixtures';
import { SNOWFLAKE_ARTWORK } from './snowflake/flags';
import type { SnowflakeVariant, SnowflakePlayback } from './snowflake/SnowflakeArtwork';

/**
 * One registry for Home, Collection, Saved and first-of-month introduction.
 * A new artwork needs ONE versioned registration + a MonthTheme.artworkKey.
 *
 * Never resolve modules by untrusted URL or server-provided JavaScript. Only
 * compiled, reviewed renderers can be activated by an approved app release.
 */
export type ArtworkRendererProps = {
  entries: DiaryEntry[];
  reducedMotion: boolean;
  variant: SnowflakeVariant; // extend the shared viewport union when introducing a truly new renderer
  playback?: SnowflakePlayback;
  label: string;
  onPlaybackState?: (phase: 'preparing' | 'replaying' | 'settled') => void;
};
export type ArtworkRenderer = ComponentType<ArtworkRendererProps>;
export type ArtworkPreview = {
  /** Fictional records (never a user's diary). Each distinct entryDate advances one visual stage. */
  entries: readonly DiaryEntry[];
  days: number;
  /** Optional asynchronous warmup using the SAME renderer's data pipeline. */
  prefetch?: (reducedMotion: boolean) => Promise<unknown>;
};
export type ArtworkRegistration = {
  id: string;
  kind: string;
  version: number;
  release: 'ready' | 'planned';
  /** Build-time switch. A planned entry must not have an active renderer. */
  renderer: ArtworkRenderer | null;
  /** Only supply when a real, matching complete-stage artwork is ready. */
  preview?: ArtworkPreview;
};

const SnowflakeRenderer: ArtworkRenderer | null = SNOWFLAKE_ARTWORK
  ? lazy(() => import('./snowflake/SnowflakeArtwork').then(module => ({ default: module.SnowflakeArtwork })))
  : null;

async function prefetchSnowflakePreview(reducedMotion: boolean): Promise<void> {
  const [{ requestState }, { toEngine }] = await Promise.all([
    import('./snowflake/snapshots'),
    import('./snowflake/sourceAdapter'),
  ]);
  await requestState(toEngine(DECEMBER_PREVIEW_ENTRIES), reducedMotion);
}

const artworkRegistry: Readonly<Record<string, ArtworkRegistration>> = Object.freeze({
  '2026-12/snowflake-v1': {
    id: '2026-12/snowflake-v1',
    kind: 'snowflake',
    version: 1,
    release: 'ready',
    renderer: SnowflakeRenderer,
    preview: {
      entries: DECEMBER_PREVIEW_ENTRIES,
      days: DECEMBER_PREVIEW_ENTRIES.length,
      prefetch: prefetchSnowflakePreview,
    },
  },
  '2027-01/sheep-v1': {
    id: '2027-01/sheep-v1',
    kind: 'sheep',
    version: 1,
    release: 'planned',
    renderer: null,
    // An imagined sheep is NOT a safe preview. Register the real component and fixture when completed.
  },
});

/** A legacy snowflake theme with no artworkKey can still resolve its original December artwork. */
export function registrationFor(theme?: MonthTheme): ArtworkRegistration | null {
  if (!theme) return null;
  const id = theme.artworkKey ?? (theme.month === '2026-12' && theme.kind === 'snowflake'
    ? '2026-12/snowflake-v1' : undefined);
  if (!id) return null;
  const registration = artworkRegistry[id];
  return registration && registration.kind === theme.kind ? registration : null;
}

/** Ready requires both the reviewed release declaration and an enabled actual component. */
export function activeArtworkFor(theme?: MonthTheme): ArtworkRegistration | null {
  const registration = registrationFor(theme);
  return registration?.release === 'ready' && registration.renderer ? registration : null;
}

/** Full-size intro is enabled only with the SAME renderer and a complete fictional diary fixture. */
export function previewFor(theme?: MonthTheme): { artwork: ArtworkRegistration; preview: ArtworkPreview } | null {
  const artwork = activeArtworkFor(theme);
  const preview = artwork?.preview;
  if (!artwork || !preview || preview.days <= 0 ||
    new Set(preview.entries.map(entry => entry.entryDate)).size !== preview.days) return null;
  return { artwork, preview };
}
