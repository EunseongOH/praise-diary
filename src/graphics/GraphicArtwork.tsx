import { useId } from 'react';
import type { MonthTheme } from '../data/types';
import { revealWindow } from './progress';

type Props = {
  theme: MonthTheme;
  writtenDays: number;
  letterCount: number;
  reducedMotion?: boolean;
  small?: boolean;
  letterSource?: string;
  /** Only used on D-02 to show the new vertical strip being revealed. */
  fromWrittenDays?: number;
};

/**
 * Low-fidelity SVG study of the growth rule, NOT the finished typography artwork.
 * A full/ghost outline is deliberately absent: unreached areas stay empty.
 * The clip uses the silhouette's real vertical bounds, so day 1 is visible.
 */
export function GraphicArtwork({ theme, writtenDays, letterCount, reducedMotion = false, small = false, letterSource = '', fromWrittenDays }: Props) {
  const id = useId().replace(/:/g, '');
  const windowNow = revealWindow(theme.kind, writtenDays, theme.targetDays);
  const windowBefore = fromWrittenDays != null
    ? revealWindow(theme.kind, fromWrittenDays, theme.targetDays)
    : windowNow;
  const shouldAnimate = !reducedMotion && !small && windowBefore.ratio < windowNow.ratio;

  // Use a stable character sequence based on the user's own text. No extra
  // affirmations or AI-generated text is inserted into the artwork.
  const chars = Array.from(letterSource).filter(c => /[가-힣a-zA-Z0-9]/.test(c));
  const particleCount = chars.length ? Math.min(240, 30 + letterCount * 12) : 0;
  const particles = Array.from({ length: particleCount }, (_, index) => {
    const arm = index % 6;
    const radius = 16 + ((index * 23 + 5) % 98);
    const angle = arm * Math.PI / 3;
    const side = ((index * 13 + 7) % 29) - 14;
    return {
      x: theme.kind === 'snowflake'
        ? 170 + Math.sin(angle) * radius + Math.cos(angle) * side
        : 44 + ((index * 47 + index * index * 3) % 260),
      y: theme.kind === 'snowflake'
        ? 168 - Math.cos(angle) * radius + Math.sin(angle) * side
        : 88 + ((index * 83 + index * 7) % 190),
      glyph: chars[(index * 17 + 7) % chars.length],
    };
  });

  return <svg
    className={`graphic-artwork ${small ? 'graphic-artwork--small' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}
    viewBox="0 0 340 340" role="img"
    aria-label={`${theme.title}, ${writtenDays}일의 칭찬이 아래부터 쌓인 그래픽`}
  >
    <defs>
      <clipPath id={`reveal-${id}`}>
        <rect x="0" y={windowNow.top} width="340" height={windowNow.height}>
          {shouldAnimate && <>
            <animate attributeName="y" from={String(windowBefore.top)} to={String(windowNow.top)} dur="1.1s" fill="freeze" />
            <animate attributeName="height" from={String(windowBefore.height)} to={String(windowNow.height)} dur="1.1s" fill="freeze" />
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
    {theme.kind === 'snowflake' ? (
      <g clipPath={`url(#reveal-${id})`}>
        <g transform="translate(170 168)" stroke="#A6C5D3" strokeWidth="3.4" fill="none" strokeLinecap="round">
          {Array.from({ length: 6 }, (_, i) => <g key={i} transform={`rotate(${i * 60})`}>
            <path d="M0 0V-112M-24 -73L0 -53L24 -73M-16 -99L0 -84L16 -99" />
          </g>)}
        </g>
        {particles.map((particle, i) => <text key={i} x={particle.x} y={particle.y}
          fill="#C5DBE6" opacity={0.48 + (i % 4) * 0.1}
          fontSize={small ? 7 : 8.8} fontWeight="500"
        >{particle.glyph}</text>)}
      </g>
    ) : (
      <g clipPath={`url(#reveal-${id})`}>
        <circle cx="236" cy="91" r="48" fill="#D3A76C" />
        <g fill="#C47067">
          <ellipse cx="140" cy="199" rx="93" ry="66" />
          <circle cx="218" cy="154" r="53" />
          <rect x="79" y="235" width="22" height="59" rx="10" />
          <rect x="168" y="235" width="23" height="59" rx="10" />
        </g>
        <ellipse cx="241" cy="170" rx="31" ry="30" fill="#F0D1B0" />
        <g clipPath={`url(#sheep-${id})`}>
          {particles.map((particle, i) => <text key={i} x={particle.x} y={particle.y}
            fill="#FFF7EE" opacity=".65" fontSize={small ? 8 : 9.5} fontWeight="500"
          >{particle.glyph}</text>)}
        </g>
        <circle cx="249" cy="158" r="3.2" fill="#513A32" />
      </g>
    )}
  </svg>;
}
