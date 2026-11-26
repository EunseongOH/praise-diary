import type { DiaryEntry, MonthTheme } from '../data/types';

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
};

export function ArtworkSlot({ theme, writtenDays, small = false }: ArtworkSlotProps) {
  return <div className={`artwork-slot ${small ? 'artwork-slot--small' : ''}`}
    role="img" aria-label={`${theme?.title ?? '월간 작품'}, ${writtenDays}일의 칭찬. 작품 준비 중.`}>
    {!small && <span aria-hidden="true">작품을 준비하고 있어요.</span>}
  </div>;
}
