import { useId, useMemo } from 'react';
import type { DiaryEntry, MonthTheme } from '../data/types';
import { revealWindow } from './progress';
import { assignDiaryGlyphs, extractDiaryGlyphs, glyphForSlot, makeSnowflakeClusters, selectGlyphSlots } from './glyphLayout';

type Props = {
  theme: MonthTheme;
  writtenDays: number;
  letterCount: number;
  reducedMotion?: boolean;
  small?: boolean;
  letterSource?: string;
  entries?: DiaryEntry[];
  fromWrittenDays?: number;
};

const SNOW_CLUSTERS = makeSnowflakeClusters();

/**
 * v0.5: zoom-friendly typographic artwork.
 * - growth still follows writtenDays only
 * - same diary stays near itself in a stable contiguous run of slots
 * - zooming can reveal partial readable sequences instead of random glyph soup
 */
export function GraphicArtwork({ theme, writtenDays, letterCount, reducedMotion = false, small = false, letterSource = '', entries = [], fromWrittenDays }: Props) {
  const id = useId().replace(/:/g, '');
  // Legacy study renderer supports only these two kinds. Future kinds resolve through
  // artworkRegistry; this fallback must not pretend an unknown kind is a sheep.
  const legacyKind = theme.kind === 'sheep' ? 'sheep' : 'snowflake';
  const now = revealWindow(legacyKind, writtenDays, theme.targetDays);
  const before = fromWrittenDays != null ? revealWindow(legacyKind, fromWrittenDays, theme.targetDays) : now;
  const systemReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shouldGrow = !reducedMotion && !systemReducedMotion && !small && before.ratio < now.ratio;
  const shouldBreathe = !reducedMotion && !systemReducedMotion && !small && !shouldGrow && writtenDays > 0;
  const chars = useMemo(() => extractDiaryGlyphs(letterSource), [letterSource]);
  const paintedSlots = useMemo(() => selectGlyphSlots(SNOW_CLUSTERS, chars.length ? letterCount : 0), [letterCount, chars.length]);
  const assignedSnowGlyphs = useMemo(
    () => assignDiaryGlyphs(
      SNOW_CLUSTERS,
      paintedSlots,
      entries.map(entry => ({ id: entry.id, entryDate: entry.entryDate, createdAt: entry.createdAt, body: entry.body })),
    ),
    [entries, paintedSlots],
  );

  if (theme.kind !== 'snowflake' && theme.kind !== 'sheep') {
    return <div role="img" aria-label={`${theme.title} 작품 준비 중`}>작품을 준비하고 있어요.</div>;
  }
  return <svg
    className={`graphic-artwork graphic-artwork--path-type ${small ? 'graphic-artwork--small' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}
    viewBox="0 0 340 340" role="img"
    aria-label={`${theme.title}, ${writtenDays}일의 칭찬이 아래부터 쌓인 그래픽`}
  >
    <defs>
      <clipPath id={`reveal-${id}`}>
        <rect x="0" y={now.top} width="340" height={now.height}>
          {shouldGrow && <>
            <animate attributeName="y" from={String(before.top)} to={String(now.top)} dur="1.25s" fill="freeze" />
            <animate attributeName="height" from={String(before.height)} to={String(now.height)} dur="1.25s" fill="freeze" />
          </>}
        </rect>
      </clipPath>
      <clipPath id={`sheep-${id}`}>
        <ellipse cx="140" cy="199" rx="93" ry="66" />
        <ellipse cx="218" cy="154" rx="53" ry="52" />
        <ellipse cx="241" cy="170" rx="31" ry="30" />
        <rect x="79" y="235" width="22" height="59" rx="10" />
        <rect x="168" y="235" width="23" height="59" rx="10" />
      </clipPath>
    </defs>
    {theme.kind === 'snowflake' ? <g clipPath={`url(#reveal-${id})`} aria-hidden="true">
      {chars.length > 0 && SNOW_CLUSTERS.map(group => <g key={group.key} transform={`translate(${group.x.toFixed(3)} ${group.y.toFixed(3)}) rotate(${group.angle})`}>
        <g className="graphic-glyph-branch">
          {shouldBreathe && <animateTransform attributeName="transform" type="rotate"
            values={`${-group.swayDegrees} 0 0; ${group.swayDegrees} 0 0; ${-group.swayDegrees} 0 0`}
            dur={`${group.periodSeconds}s`} begin={`-${group.phaseSeconds}s`} repeatCount="indefinite" />}
          {group.slots.filter(slot => paintedSlots.has(slot.index)).map(slot => {
            const assigned = assignedSnowGlyphs.get(slot.index);
            const glyph = assigned?.glyph ?? glyphForSlot(chars, slot.index);
            return <text
              key={slot.index}
              x={slot.x}
              y={slot.y}
              transform={`rotate(${slot.angleJitter} ${slot.x} ${slot.y})`}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={small ? slot.size * 0.92 : slot.size}
              fontWeight="480"
              opacity={slot.opacity}
              fill="var(--snow-ink, #C5DBE6)"
              data-entry-id={assigned?.entryId}
              data-sequence={assigned?.sequence}
            >{glyph}</text>;
          })}
        </g>
      </g>)}
    </g> : <g clipPath={`url(#reveal-${id})`}>
      {/* Temporary illustrative sheep. Shape-specific curved type is next. */}
      <circle cx="236" cy="91" r="48" fill="#D3A76C" />
      <g fill="#C47067">
        <ellipse cx="140" cy="199" rx="93" ry="66" />
        <circle cx="218" cy="154" r="53" />
        <rect x="79" y="235" width="22" height="59" rx="10" />
        <rect x="168" y="235" width="23" height="59" rx="10" />
      </g>
      <ellipse cx="241" cy="170" rx="31" ry="30" fill="#F0D1B0" />
      <g clipPath={`url(#sheep-${id})`}>
        {chars.slice(0, 140).map((glyph, i) => <text key={i}
          x={45 + ((i * 47 + i * i * 3) % 245)}
          y={87 + ((i * 83 + i * 7) % 190)}
          fill="#FFF7EE" opacity=".6" fontSize={small ? 8 : 9}>{glyph}</text>)}
      </g>
      <circle cx="249" cy="158" r="3.2" fill="#513A32" />
    </g>}
  </svg>;
}
