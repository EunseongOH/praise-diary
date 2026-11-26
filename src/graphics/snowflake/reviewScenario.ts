/**
 * Review builds only (VITE_SNOWFLAKE_COMPLETION_REPLAY=1): `?snowflakeDays=N` starts the session with N distinct
 * December days of FAKE entries made from the app's own sample sentences (no research fixture, no user text), so the
 * 1 … 15 stages, same-day density (`&snowflakeSameDay=1`) and the 14 → 15 completion replay can be checked in the real
 * screens. The dates avoid the preview today / yesterday so the next save can create the next distinct day.
 */
import type { DiaryEntry } from '../../data/types';
import { SNOWFLAKE_REVIEW } from './flags';

export function reviewEntries(samples: DiaryEntry[], today: string): DiaryEntry[] | null {
  if (!SNOWFLAKE_REVIEW || typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search);
  if (!q.has('snowflakeDays')) return null;
  const n = Math.max(0, Math.min(25, Math.round(Number(q.get('snowflakeDays')) || 0)));
  const month = today.slice(0, 7), last = Number(today.slice(8, 10)) - 2; // never today / yesterday
  const days = Array.from({ length: Math.max(0, last) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`).slice(0, n);
  const out: DiaryEntry[] = days.map((d, i) => { const s = samples[i % samples.length]!; return { id: `review-${i + 1}`, entryDate: d, createdAt: `${d}T21:00:00.000+09:00`, title: s.title, body: s.body }; });
  if (q.get('snowflakeSameDay') === '1' && days.length) { const s = samples[(days.length + 3) % samples.length]!; const d = days[days.length - 1]!; out.push({ id: `review-${days.length}-b`, entryDate: d, createdAt: `${d}T22:00:00.000+09:00`, title: s.title, body: s.body }); }
  return out;
}
