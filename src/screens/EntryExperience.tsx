import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SNOWFLAKE_REVIEW } from '../graphics/snowflake/flags';

export type EntryScenario = 'first' | 'return' | 'empty-return' | 'new-month';
type Phase = 'brand' | 'intro' | 'reveal' | 'gather' | 'hold' | 'fade';

/** Review-only: never read URL parameters or write intro markers in a normal product build. */
export function reviewEntryScenario(search: string, hasEntries: boolean, month: string): EntryScenario | null {
  if (!SNOWFLAKE_REVIEW) return null;
  const q = new URLSearchParams(search);
  const forced = q.get('entryScenario');
  if (forced === 'first' || forced === 'return' || forced === 'empty-return' || forced === 'new-month') return forced;
  if (q.get('entryPreview') !== '1') return null;
  try {
    const seen = sessionStorage.getItem('dajeongrok:entry:v1:seen') === '1';
    const seenMonth = sessionStorage.getItem('dajeongrok:entry:v1:month:' + month) === '1';
    if (!seen) return 'first';
    if (!seenMonth) return 'new-month';
    return hasEntries ? 'return' : 'empty-return';
  } catch { return hasEntries ? 'return' : 'first'; }
}
export function markEntrySeen(month: string) {
  try {
    sessionStorage.setItem('dajeongrok:entry:v1:seen', '1');
    sessionStorage.setItem('dajeongrok:entry:v1:month:' + month, '1');
  } catch { /* The preview still works when storage is unavailable. */ }
}

const glyphs = Array.from('다정한마음하나씩차곡차곡');
const phases: Phase[] = ['brand', 'intro', 'reveal', 'gather', 'hold', 'fade'];
const durations = [800, 2100, 1300, 1450, 1600, 850];

/** A lightweight typographic preview, NOT the user's actual diary/artwork or final brand asset. */
export function EntryExperience({ scenario, reducedMotion, monthTitle, onFinish }: {
  scenario: EntryScenario; reducedMotion: boolean; monthTitle: string; onFinish: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(reducedMotion ? 'hold' : 'brand');
  const callback = useRef(onFinish);
  callback.current = onFinish;
  const skipRef = useRef<HTMLButtonElement>(null);
  const short = scenario === 'return' || scenario === 'empty-return';
  useEffect(() => {
    const original = document.querySelector<HTMLElement>('.app-shell');
    if (original) original.inert = true;
    skipRef.current?.focus({ preventScroll: true });
    return () => { if (original) original.inert = false; };
  }, []);
  useEffect(() => {
    if (reducedMotion) return;
    if (short) {
      const t = window.setTimeout(() => callback.current(), durations[0]);
      return () => window.clearTimeout(t);
    }
    const timers: number[] = [];
    let elapsed = 0;
    phases.forEach((p, index) => {
      if (index) timers.push(window.setTimeout(() => setPhase(p), elapsed));
      elapsed += durations[index]!;
    });
    timers.push(window.setTimeout(() => callback.current(), elapsed));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [scenario, reducedMotion, short]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); callback.current(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, []);
  const newMonth = scenario === 'new-month';
  const preview = !short && (phase === 'gather' || phase === 'hold' || phase === 'fade');
  return createPortal(<section className="entry-experience" role="dialog" aria-modal="true" aria-label="다정록 첫 만남" data-entry-scenario={scenario} data-entry-phase={phase} data-motion={reducedMotion ? 'off' : 'on'}>
    <div className="entry-experience__stage">
      {phase === 'brand' && <div className="entry-experience__brand">
        <h1>다정록</h1><p>오늘도 나에게 다정한 한 줄</p>
      </div>}
      {!short && phase === 'intro' && <div className="entry-experience__copy" aria-live="off">
        <p>{newMonth ? '이번 달에도 나에게 다정한 기록을 남겨보세요.' : '하루하루 나에게 남긴 칭찬이 모여'}</p>
        {!newMonth && <p>매달 하나의 작품이 만들어져요.</p>}
      </div>}
      {!short && phase !== 'brand' && phase !== 'intro' && <div className="entry-experience__monthly" data-gathering={preview}>
        <p className="entry-experience__eyebrow">이번 달의 작품</p>
        <h2>{newMonth ? '새해 양' : monthTitle}</h2>
        {newMonth
          ? <p className="entry-experience__support">나에게 건넨 말들이 모여 새로운 모습을 만들어요.</p>
          : <div className="entry-experience__sample" aria-label="눈꽃이 피어나는 모습을 보여 주는 예시" role="img">
              {Array.from({ length: 6 }, (_, arm) => <div key={arm} className="entry-experience__arm" style={{ transform: `translateY(-50%) rotate(${arm * 60}deg)` }}>
                {glyphs.slice(0, 9).map((letter, i) => <span key={i} className="entry-experience__glyph" style={{ animationDelay: `${(arm * 5 + i) * 34}ms` }}>{letter}</span>)}
              </div>)}
            </div>}
        <span className="entry-experience__sample-label">{newMonth ? '이달의 새로운 작품을 만나보세요' : '작품이 만들어지는 모습 · 예시'}</span>
      </div>}
      {short && <div className="entry-experience__brand"><h1>다정록</h1><p>오늘도 나에게 다정한 한 줄</p></div>}
    </div>
    <button ref={skipRef} type="button" className="entry-experience__skip" onClick={onFinish}>{reducedMotion ? '홈으로' : '건너뛰기'}</button>
  </section>, document.body);
}
