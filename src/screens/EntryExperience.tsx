import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MonthTheme } from '../data/types';
import { SNOWFLAKE_REVIEW } from '../graphics/snowflake/flags';
import { hasMonthlyArtworkPreview, MonthlyArtworkPreview, prefetchMonthlyArtwork } from './MonthlyArtworkPreview';

export type EntryScenario = 'first' | 'return' | 'empty-return' | 'new-month';
type Phase = 'brand' | 'intro' | 'reveal' | 'gather' | 'hold' | 'fade';

const phases: Phase[] = ['brand', 'intro', 'reveal', 'gather', 'hold', 'fade'];
// Brand 1.7 s + introduction 1.8 s + title 0.8 s + artwork reveal 1.2 s + hold 2.3 s + fade 0.7 s = 8.5 s.
const durations = [1700, 1800, 800, 1200, 2300, 700];
const returnBrandDuration = 800;

/** Review URLs only. In ordinary builds do not read query strings or make onboarding history. */
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

/** "Seen app" and "seen this month's REAL artwork" are independent.
 * Months without a finished renderer must remain eligible for an introduction later.
 */
export function markEntrySeen(month: string, artworkIntroduced = true) {
  try {
    sessionStorage.setItem('dajeongrok:entry:v1:seen', '1');
    if (artworkIntroduced) sessionStorage.setItem('dajeongrok:entry:v1:month:' + month, '1');
  } catch { /* Review still works if storage is blocked. */ }
}

/** In QA one may inspect a different month's artwork without changing the app's date or records. */
export function reviewEntryMonth(search: string, actualMonth: string): string {
  if (!SNOWFLAKE_REVIEW) return actualMonth;
  const requested = new URLSearchParams(search).get('entryMonth');
  return requested && /^20\d{2}-(0[1-9]|1[0-2])$/.test(requested) ? requested : actualMonth;
}

export function EntryExperience({ scenario, reducedMotion, theme, onFinish }: {
  scenario: EntryScenario; reducedMotion: boolean; theme?: MonthTheme; onFinish: (artworkIntroduced: boolean) => void;
}) {
  const supportedArtwork = hasMonthlyArtworkPreview(theme);
  // 2027-01 has no live artwork yet. Do not misrepresent an unavailable preview as finished.
  const short = scenario === 'return' || scenario === 'empty-return' || !supportedArtwork;
  const [phase, setPhase] = useState<Phase>('brand');
  const callback = useRef(onFinish);
  callback.current = onFinish;
  const skipRef = useRef<HTMLButtonElement>(null);
  const finish = () => callback.current(!short && supportedArtwork);
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    const original = document.querySelector<HTMLElement>('.app-shell');
    if (original) original.inert = true;
    skipRef.current?.focus({ preventScroll: true });
    return () => { if (original) original.inert = false; };
  }, []);
  useEffect(() => {
    if (short) return;
    prefetchMonthlyArtwork(theme, reducedMotion);
  }, [theme?.month, reducedMotion, short]);
  useEffect(() => {
    if (reducedMotion) return;
    if (short) {
      const t = window.setTimeout(() => finishRef.current(), returnBrandDuration);
      return () => window.clearTimeout(t);
    }
    const timers: number[] = [];
    let elapsed = 0;
    phases.forEach((p, index) => {
      if (index) timers.push(window.setTimeout(() => setPhase(p), elapsed));
      elapsed += durations[index]!;
    });
    timers.push(window.setTimeout(() => finishRef.current(), elapsed));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [scenario, reducedMotion, short]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); finishRef.current(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, []);
  const advance = () => {
    if (reducedMotion && !short && phase === 'brand') { setPhase('hold'); return; }
    finish();
  };
  const newMonth = scenario === 'new-month';
  const showBrand = short || phase === 'brand';
  const showMonthly = !short && phase !== 'brand' && phase !== 'intro';
  const isArtworkVisible = phase === 'gather' || phase === 'hold' || phase === 'fade';
  const title = theme?.title ?? '이번 달의 작품';
  return createPortal(<section className="entry-experience" role="dialog" aria-modal="true"
    aria-label="다정록 첫 만남" data-entry-scenario={scenario} data-entry-phase={phase}
    data-motion={reducedMotion ? 'off' : 'on'} data-brand-art={showBrand ? 'window' : 'none'}
    data-artwork-supported={supportedArtwork ? 'true' : 'false'}>
    {showBrand && <img className="entry-experience__brand-art"
      src={import.meta.env.BASE_URL + 'assets/branding/entry-window.webp'}
      alt="" aria-hidden="true" draggable={false} loading="eager" />}
    <div className="entry-experience__stage">
      {showBrand && <div className="entry-experience__brand">
        <h1>다정록</h1><p>오늘도 나에게 다정한 한 줄</p>
      </div>}
      {!short && phase === 'intro' && <div className="entry-experience__copy" aria-live="off">
        {newMonth
          ? <p>이번 달에도 다정함을 모아서<br /><strong>‘{title}’</strong>을 만들어 봐요.</p>
          : <><p>하루하루 나에게 건넨 칭찬이 모여</p><p>매달 하나의 작품이 돼요.</p></>}
      </div>}
      {showMonthly && <div className="entry-experience__monthly">
        <p className="entry-experience__eyebrow">이번 달의 작품</p>
        <h2>{title}</h2>
        <div className="entry-experience__artwork-wrap" aria-hidden={!isArtworkVisible}>
          <MonthlyArtworkPreview theme={theme} reducedMotion={reducedMotion} />
        </div>
      </div>}
    </div>
    <button ref={skipRef} type="button" className="entry-experience__skip" onClick={advance}>
      {reducedMotion ? (!short && phase === 'brand' ? '다음' : '홈으로') : '건너뛰기'}
    </button>
  </section>, document.body);
}
