import { useId } from 'react';
import type { MonthTheme } from '../data/types';

type Props = {
  theme: MonthTheme;
  writtenDays: number;
  letterCount: number;
  reducedMotion?: boolean;
  small?: boolean;
  letterSource?: string; // 사용자 작성 글자만 내부 그래픽에서 사용; 공유용 이미지에는 절대 자동 노출 금지.
};

const EMPTY_CHARS = ' '; // 아직 기록이 없을 땐 사용자 글자 파티클도 없어야 한다.

/** 모션 엔진을 교체하기 전의 SVG 스터디. 원문을 그래픽/공유 이미지에 그대로 노출하지 않는다. */
export function GraphicArtwork({ theme, writtenDays, letterCount, reducedMotion = false, small = false, letterSource = '' }: Props) {
  const id = useId().replace(/:/g, '');
  // 12월 특별 목표는 미정. 임의 숫자로 완성 판정을 하지 않으며, 아래 값은 시연용 성장 높이만 계산.
  const fill = theme.targetDays != null
    ? Math.min(1, writtenDays / theme.targetDays)
    : Math.min(0.85, writtenDays * 0.075);
  const revealTop = 340 * (1 - fill);
  // 단어를 읽을 수 있는 순서로 배치하지 않고 글자별로 흩어 표시한다.
  // 프로토타입 내부 그래픽에 한해서만 개인 글자 사용. 공개 공유 이미지는 별도 비식별 처리 필요.
  const chars = Array.from(letterSource).filter(c => /[가-힣a-zA-Z0-9]/.test(c)).reverse();
  const particleCount = chars.length ? Math.min(120, 18 + letterCount * 8) : 0;
  const particles = Array.from({ length: particleCount }, (_, index) => ({
    x: 36 + ((index * 47 + index * index * 3) % 260),
    y: 36 + ((index * 83 + index * 7) % 270),
    glyph: chars[(index * 17 + 7) % chars.length] ?? EMPTY_CHARS,
  }));

  return <svg className={`graphic-artwork ${small ? 'graphic-artwork--small' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}
    viewBox="0 0 340 340" role="img" aria-label={`${theme.title}, ${writtenDays}일의 칭찬이 쌓인 그래픽`}>
    <defs>
      <clipPath id={`reveal-${id}`}><rect x="0" y={revealTop} width="340" height={340 - revealTop} /></clipPath>
      <clipPath id={`sheep-${id}`}>
        <ellipse cx="140" cy="199" rx="93" ry="66" />
        <ellipse cx="218" cy="154" rx="53" ry="52" />
        <ellipse cx="241" cy="170" rx="31" ry="30" />
        <rect x="79" y="235" width="22" height="59" rx="10" />
        <rect x="168" y="235" width="23" height="59" rx="10" />
      </clipPath>
    </defs>
    {theme.kind === 'snowflake' ? <>
      <g transform="translate(170 168)" stroke="#b9d0dd" strokeWidth="3.25" opacity=".23" fill="none" strokeLinecap="round">
        {Array.from({ length: 6 }, (_, i) => <g key={i} transform={`rotate(${i * 60})`}>
          <path d="M0 0V-112M-24 -73L0 -53L24 -73M-16 -99L0 -84L16 -99" />
        </g>)}
      </g>
      <g clipPath={`url(#reveal-${id})`} className="graphic-reveal">
        <g transform="translate(170 168)" stroke="#A6C5D3" strokeWidth="3.8" fill="none" strokeLinecap="round">
          {Array.from({ length: 6 }, (_, i) => <g key={i} transform={`rotate(${i * 60})`}>
            <path d="M0 0V-112M-24 -73L0 -53L24 -73M-16 -99L0 -84L16 -99" />
          </g>)}
        </g>
        {particles.map((particle, i) => <text key={i} x={particle.x} y={particle.y}
          fill="#A6C5D3" opacity={0.27 + (i % 4) * 0.1} fontSize={small ? 7 : 8.8}>
          {particle.glyph}
        </text>)}
      </g>
      <circle cx="170" cy="168" r="3.5" fill="#B8D68A" opacity={Math.max(fill, 0.25)} />
    </> : <>
      <circle cx="236" cy="91" r="48" fill="#cfae80" opacity=".18" />
      <g opacity=".2" fill="#d27a71">
        <ellipse cx="140" cy="199" rx="93" ry="66" />
        <circle cx="218" cy="154" r="53" />
        <ellipse cx="241" cy="170" rx="31" ry="30" />
        <rect x="79" y="235" width="22" height="59" rx="10" />
        <rect x="168" y="235" width="23" height="59" rx="10" />
      </g>
      <g clipPath={`url(#reveal-${id})`} className="graphic-reveal">
        <circle cx="236" cy="91" r="48" fill="#d3a76c" />
        <g fill="#c47067">
          <ellipse cx="140" cy="199" rx="93" ry="66" />
          <circle cx="218" cy="154" r="53" />
          <rect x="79" y="235" width="22" height="59" rx="10" />
          <rect x="168" y="235" width="23" height="59" rx="10" />
        </g>
        <ellipse cx="241" cy="170" rx="31" ry="30" fill="#f0d1b0" />
        <g clipPath={`url(#sheep-${id})`}>
          {particles.map((particle, i) => <text key={i} x={particle.x} y={particle.y}
            fill="#fff7ee" opacity=".65" fontSize={small ? 8 : 9.5}>{particle.glyph}</text>)}
        </g>
        <circle cx="249" cy="158" r="3.2" fill="#513a32" />
      </g>
    </>}
  </svg>;
}
