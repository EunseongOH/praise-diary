import { Suspense } from 'react';
import type { DiaryEntry, MonthTheme } from '../data/types';
import { activeArtworkFor } from './artworkRegistry';
import type { SnowflakePlayback, SnowflakeVariant } from './snowflake/SnowflakeArtwork';

/** One integration seam for all monthly graphics, including future releases. */
export type ArtworkSlotProps = {
  theme?: MonthTheme;
  writtenDays: number;
  letterCount: number;
  reducedMotion?: boolean;
  small?: boolean;
  letterSource?: string;
  entries?: DiaryEntry[];
  fromWrittenDays?: number;
  variant?: Exclude<SnowflakeVariant, 'tile'>;
  playback?: SnowflakePlayback;
  onPlaybackState?: (phase: 'preparing' | 'replaying' | 'settled') => void;
};

export const snowflakeActive = (theme?: MonthTheme) => activeArtworkFor(theme)?.kind === 'snowflake';

export function ArtworkSlot({ theme, writtenDays, small = false, entries, reducedMotion = false,
  variant = 'home', playback, onPlaybackState }: ArtworkSlotProps) {
  const artwork = activeArtworkFor(theme);
  const Renderer = artwork?.renderer;
  if (Renderer && artwork) {
    const label = `${theme!.title}, ${writtenDays}일의 칭찬으로 자란 작품.`;
    return <div className={`artwork-slot artwork-slot--${artwork.kind} ${small ? 'artwork-slot--small' : ''}`}
      role="img" aria-label={label} data-written-days={writtenDays} data-artwork-id={artwork.id}>
      <Suspense fallback={null}>
        <Renderer entries={entries ?? []} reducedMotion={reducedMotion} variant={small ? 'tile' : variant}
          playback={playback} onPlaybackState={onPlaybackState} label={label} />
      </Suspense>
    </div>;
  }
  return <div className={`artwork-slot ${small ? 'artwork-slot--small' : ''}`}
    role="img" aria-label={`${theme?.title ?? '월간 작품'}, ${writtenDays}일의 칭찬. 작품 준비 중.`}>
    {!small && <span aria-hidden="true">작품을 준비하고 있어요.</span>}
  </div>;
}
