import { lazy, Suspense } from 'react';
import type { DiaryEntry, MonthTheme } from '../data/types';
import { SNOWFLAKE_ARTWORK } from './snowflake/flags';
import type { SnowflakePlayback, SnowflakeVariant } from './snowflake/SnowflakeArtwork';

/** Integration seam for the approved monthly renderer. No fabricated artwork. */
export type ArtworkSlotProps = {
  theme?: MonthTheme;
  writtenDays: number;
  letterCount: number;
  reducedMotion?: boolean;
  small?: boolean;
  letterSource?: string;
  entries?: DiaryEntry[];
  fromWrittenDays?: number;
  /** where the artwork is shown (default home; `small` = collection tile) */
  variant?: Exclude<SnowflakeVariant, 'tile'>;
  /** saved screen only: the save that just succeeded (plays once per save) */
  playback?: SnowflakePlayback;
};

// The snowflake engine is loaded only when the review flag is on at build time; with the flag off this is dead code.
const SnowflakeArtwork = SNOWFLAKE_ARTWORK ? lazy(() => import('./snowflake/SnowflakeArtwork').then(m => ({ default: m.SnowflakeArtwork }))) : null;
/** true when the month is rendered by the real December snowflake (feature flag + snowflake theme) */
export const snowflakeActive = (theme?: MonthTheme) => Boolean(SnowflakeArtwork) && theme?.kind === 'snowflake';

export function ArtworkSlot({ theme, writtenDays, small = false, entries, reducedMotion = false, variant = 'home', playback }: ArtworkSlotProps) {
  if (SnowflakeArtwork && snowflakeActive(theme)) {
    const label = `${theme!.title}, ${writtenDays}일의 칭찬으로 자란 눈꽃.`;
    return <div className={`artwork-slot artwork-slot--snowflake ${small ? 'artwork-slot--small' : ''}`} role="img" aria-label={label} data-written-days={writtenDays}>
      <Suspense fallback={null}>
        <SnowflakeArtwork entries={entries ?? []} reducedMotion={reducedMotion} variant={small ? 'tile' : variant} playback={playback} label={label} />
      </Suspense>
    </div>;
  }
  return <div className={`artwork-slot ${small ? 'artwork-slot--small' : ''}`}
    role="img" aria-label={`${theme?.title ?? '월간 작품'}, ${writtenDays}일의 칭찬. 작품 준비 중.`}>
    {!small && <span aria-hidden="true">작품을 준비하고 있어요.</span>}
  </div>;
}
