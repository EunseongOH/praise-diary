import { useEffect, useMemo, useRef, useState } from 'react';
import { ArtworkSlot } from '../graphics/ArtworkSlot';
import { previewFor } from '../graphics/artworkRegistry';
import { themeFor } from '../data/themes';
import type { SnowflakePlayback } from '../graphics/snowflake/SnowflakeArtwork';

type Scenario = 'idle' | 'first' | 'growth' | 'addition' | 'complete' | 'reduced';
type PaintStatus = 'loading' | 'painted' | 'blank' | 'unavailable';
type PlaybackPhase = 'preparing' | 'replaying' | 'settled';

const scenarios: { id: Scenario; label: string; description: string }[] = [
  { id: 'idle', label: '잔잔한 움직임', description: '홈에서 눈꽃의 글자와 빛이 계속 움직이는지 확인해요.' },
  { id: 'first', label: '첫 기록 성장', description: '첫 칭찬을 남겼을 때 눈꽃이 아래에서 위로 자라나요.' },
  { id: 'growth', label: '새 날짜 성장', description: '4일에서 5일로 늘어날 때 글자가 더해져요.' },
  { id: 'addition', label: '같은 날 추가', description: '같은 날짜에 기록을 더할 때 눈꽃이 풍성해져요.' },
  { id: 'complete', label: '15일 완성 연출', description: '완성 시점의 성장 재생과 반짝임을 검수해요. 정식 목표일 정책은 아직 별개예요.' },
  { id: 'reduced', label: '움직임 줄이기', description: '움직임을 줄여도 글자 눈꽃은 그대로 보이나요.' },
];

/**
 * Apps-in-Toss SANDBOX ONLY. This screen uses the real Home and Saved
 * renderers, never the always-still "preview" variant. No clock/date,
 * diary store, user profile or server data is altered.
 */
export function SandboxSnowflakeQA({ onClose }: { onClose: () => void }) {
  const theme = themeFor('2026-12');
  const preview = previewFor(theme)?.preview;
  const [scenario, setScenario] = useState<Scenario>('idle');
  const [days, setDays] = useState<1 | 5 | 15>(15);
  const [replay, setReplay] = useState(0);
  const [paint, setPaint] = useState<PaintStatus>('loading');
  const [phase, setPhase] = useState<PlaybackPhase>('preparing');
  const [osReduced, setOsReduced] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const onChange = () => setOsReduced(media.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const eventScenario = scenario === 'first' || scenario === 'growth' || scenario === 'addition' || scenario === 'complete';
  const count = scenario === 'first' ? 1 : scenario === 'growth' || scenario === 'addition' ? 5
    : scenario === 'complete' ? 15 : days;

  // Stable per replay, unique between replays: the save event is by design
  // played only once per saved entry ID. These are fictional QA-only IDs.
  const entries = useMemo(() => {
    const selected = (preview?.entries ?? []).slice(0, count).map(entry => ({
      ...entry, id: entry.id + '-ait-qa-' + scenario + '-' + replay,
    }));
    if (scenario === 'addition' && selected.length) {
      const last = selected[selected.length - 1]!;
      selected.push({ ...last, id: 'additional-praise-ait-qa-' + replay,
        createdAt: last.entryDate + 'T21:00:00+09:00',
        body: '오늘 고마웠던 순간을 한 번 더 떠올렸어요. 나에게 다정한 말을 건넸어요.' });
    }
    return selected;
  }, [preview, count, replay, scenario]);

  const playback: SnowflakePlayback | undefined = eventScenario && entries.length
    ? { kind: scenario === 'complete' ? 'complete' : scenario === 'addition' ? 'addition' : 'growth',
        eventId: entries[entries.length - 1]!.id }
    : undefined;
  const caseInfo = scenarios.find(item => item.id === scenario)!;

  useEffect(() => {
    setPaint('loading');
    setPhase('preparing');
    if (!preview) { setPaint('unavailable'); return; }
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
              if ((pixels[i] ?? 0) > 20 && ++count >= 20) break;
            }
            if (count >= 20) { setPaint('painted'); window.clearInterval(timer); return; }
          }
        } catch { /* Pixel readback forbidden: never claim a successful paint. */ }
      }
      if (checks >= 40) { setPaint('blank'); window.clearInterval(timer); }
    }, 500);
    return () => window.clearInterval(timer);
  }, [entries, preview]);

  function choose(next: Scenario) { setScenario(next); setReplay(value => value + 1); }
  return <section className="ait-snowflake-qa" role="dialog" aria-modal="true"
    aria-label="12월 눈꽃 렌더링 테스트" data-ait-snowflake-qa="true"
    data-qa-scenario={scenario} data-qa-playback-phase={phase}
    data-qa-os-reduced={osReduced ? 'true' : 'false'}>
    <div className="ait-snowflake-qa__header">
      <div>
        <p className="ait-snowflake-qa__eyebrow">개발용 · 눈꽃 전체 동작 검수</p>
        <h2>12월의 눈꽃</h2>
      </div>
      <button type="button" className="ait-snowflake-qa__close"
        onClick={onClose} aria-label="눈꽃 테스트 닫기">닫기</button>
    </div>
    <p className="ait-snowflake-qa__description">이 화면은 가상 기록으로만 작동해요.
      작품의 등장부터 저장 후 성장, 완성 연출, 움직임 줄이기까지 확인해요.</p>
    <div className="ait-snowflake-qa__scenario-picker" role="group" aria-label="애니메이션 검수 장면">
      {scenarios.map(item => <button key={item.id} type="button"
        aria-pressed={scenario === item.id} onClick={() => choose(item.id)}>{item.label}</button>)}
    </div>
    <p className="ait-snowflake-qa__description" data-qa-description="">{caseInfo.description}</p>
    {(scenario === 'idle' || scenario === 'reduced') && <div role="group"
      aria-label="눈꽃 렌더링 단계" className="ait-snowflake-qa__steps">
      {([1, 5, 15] as const).map(n => <button key={n} type="button" aria-pressed={days === n}
        onClick={() => setDays(n)}>{n}일</button>)}
    </div>}
    {osReduced && scenario !== 'reduced' && <p className="ait-snowflake-qa__warning" role="status">
      기기의 ‘움직임 줄이기’가 켜져 있어 실제 애니메이션 대신 정지 화면이 표시돼요.
      설정을 끈 뒤 다시 테스트해 주세요.
    </p>}
    <div ref={stage} className="ait-snowflake-qa__stage" data-sample-day-count={count}>
      {theme && preview ? <ArtworkSlot key={scenario + '-' + days + '-' + replay}
        theme={theme} writtenDays={count} letterCount={entries.length} entries={entries}
        reducedMotion={scenario === 'reduced'}
        variant={eventScenario ? 'saved' : 'home'}
        playback={playback} onPlaybackState={setPhase} /> : null}
    </div>
    <p className="ait-snowflake-qa__status" role="status" data-snowflake-qa-status={paint}>
      {paint === 'loading' ? '실제 눈꽃 그래픽을 그리는 중이에요…'
        : paint === 'painted' ? '눈꽃 픽셀이 확인됐어요. 움직임도 눈으로 확인해 주세요.'
        : paint === 'unavailable' ? '눈꽃 엔진이 번들에 들어 있지 않아요.'
        : '눈꽃 픽셀을 확인하지 못했어요. 스크린샷을 보내 주세요.'}
    </p>
    {eventScenario && <p className="ait-snowflake-qa__phase" data-qa-phase-text="">
      애니메이션 상태: {phase === 'preparing' ? '준비 중' : phase === 'replaying' ? '재생 중' : '재생 완료'}
    </p>}
    <button className="ait-snowflake-qa__replay" type="button"
      onClick={() => setReplay(value => value + 1)}>이 장면 다시 보기</button>
    <p className="ait-snowflake-qa__footer">실제 일기나 개인정보를 입력하지 마세요.
      가상 칭찬은 내 일기장에 저장되지 않아요.</p>
  </section>;
}
