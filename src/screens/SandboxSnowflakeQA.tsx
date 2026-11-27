import { useEffect, useRef, useState } from 'react';
import { ArtworkSlot } from '../graphics/ArtworkSlot';
import { previewFor } from '../graphics/artworkRegistry';
import { themeFor } from '../data/themes';

/**
 * SANDBOX ONLY. The same real December renderer as Home, using ONLY the
 * fictional December introduction fixture. No state mutations, fake dates,
 * real diary text, or server writes. This is accessible even in November.
 */
export function SandboxSnowflakeQA({ onClose }: { onClose: () => void }) {
  const theme = themeFor('2026-12');
  const preview = previewFor(theme)?.preview;
  const [days, setDays] = useState<1 | 5 | 15>(15);
  const [status, setStatus] = useState<'loading' | 'painted' | 'blank' | 'unavailable'>('loading');
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus('loading');
    if (!preview) { setStatus('unavailable'); return; }
    let checks = 0;
    const timer = window.setInterval(() => {
      checks += 1;
      const canvas = stage.current?.querySelector<HTMLCanvasElement>('[data-testid="flake-canvas"]');
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        try {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let count = 0;
            for (let i = 3; i < pixels.length; i += 4) {
              if (pixels[i] > 20 && ++count >= 20) break;
            }
            if (count >= 20) {
              setStatus('painted');
              window.clearInterval(timer);
              return;
            }
          }
        } catch {
          // Browser may forbid readback; report as unverified, not successful.
        }
      }
      if (checks >= 24) {
        setStatus('blank');
        window.clearInterval(timer);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [days, preview]);

  return <section className="ait-snowflake-qa" role="dialog" aria-modal="true"
    aria-label="12월 눈꽃 렌더링 테스트" data-ait-snowflake-qa="true">
    <div className="ait-snowflake-qa__header">
      <div>
        <p className="ait-snowflake-qa__eyebrow">개발용 · 실제 그래픽 엔진</p>
        <h2>12월의 눈꽃</h2>
      </div>
      <button type="button" className="ait-snowflake-qa__close" onClick={onClose} aria-label="눈꽃 테스트 닫기">닫기</button>
    </div>
    <p className="ait-snowflake-qa__description">
      가상 칭찬으로 만든 눈꽃을 확인해요. 현재 달과 나의 일기 기록에는 영향을 주지 않아요.
    </p>
    <div role="group" aria-label="눈꽃 렌더링 단계" className="ait-snowflake-qa__steps">
      {([1, 5, 15] as const).map(n => <button key={n} type="button" aria-pressed={days === n}
        onClick={() => setDays(n)}>{n}일</button>)}
    </div>
    <div ref={stage} className="ait-snowflake-qa__stage" data-sample-day-count={days}>
      {preview && theme ? <ArtworkSlot key={days} theme={theme} writtenDays={days}
        letterCount={days} entries={preview.entries.slice(0, days)} reducedMotion variant="preview" /> : null}
    </div>
    <p className="ait-snowflake-qa__status" role="status" data-snowflake-qa-status={status}>
      {status === 'loading' ? '눈꽃을 그리는 중이에요…' :
        status === 'painted' ? '눈꽃이 화면에 그려졌어요.' :
        status === 'unavailable' ? '눈꽃 그래픽이 이 번들에 포함되지 않았어요.' :
        '눈꽃을 확인하지 못했어요. 이 화면의 스크린샷을 알려 주세요.'}
    </p>
    <p className="ait-snowflake-qa__footer">이 화면은 검수 전용이에요. 실제 칭찬일기나 개인정보를 입력하지 마세요.</p>
  </section>;
}
