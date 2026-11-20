import { useId, useMemo } from 'react';
import type { MonthTheme } from '../data/types';
import { revealWindow } from './progress';
import { extractDiaryGlyphs, glyphForSlot, makeSnowflakeClusters, selectGlyphSlots } from './glyphLayout';

type Props = {
  theme: MonthTheme;
  writtenDays: number;
  letterCount: number;
  reducedMotion?: boolean;
  small?: boolean;
  letterSource?: string;
  fromWrittenDays?: number;
};

const SNOW_CLUSTERS = makeSnowflakeClusters();

/**
 * Art-direction study v0.4: letter placement follows the snowflake's six
 * radial spines and their paired side branches. Each branch breathes around
 * its OWN root. No noisy independent shaking or premature ghost silhouette.
 *
 * The sheep is still a temporary shape study, pending curved typography paths.
 */
export function GraphicArtwork({ theme, writtenDays, letterCount, reducedMotion = false, small = false, letterSource = '', fromWrittenDays }: Props) {
  const id = useId().replace(/:/g, '');
  const now = revealWindow(theme.kind, writtenDays, theme.targetDays);
  const before = fromWrittenDays != null ? revealWindow(theme.kind, fromWrittenDays, theme.targetDays) : now;
  const systemReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shouldGrow = !reducedMotion && !systemReducedMotion && !small && before.ratio < now.ratio;
  const shouldBreathe = !reducedMotion && !systemReducedMotion && !small && !shouldGrow && writtenDays > 0;
  const chars = useMemo(() => extractDiaryGlyphs(letterSource), [letterSource]);
  const paintedSlots = useMemo(() => selectGlyphSlots(SNOW_CLUSTERS, chars.length ? letterCount : 0), [letterCount, chars.length]);

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
          {group.slots.filter(slot => paintedSlots.has(slot.index)).map(slot => <text
            key={slot.index} x={slot.x} y={slot.y}
            transform={`rotate(${slot.angleJitter} ${slot.x} ${slot.y})`}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={small ? slot.size * 0.92 : slot.size} fontWeight="480"
            opacity={slot.opacity} fill="var(--snow-ink, #C5DBE6)"
          >{glyphForSlot(chars, slot.index)}</text>)}
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
