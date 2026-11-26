/** Snowflake engine as used by the app (node, no browser): stages, sources, same-day density, CRUD stability, events. */
import { test, expect } from '@playwright/test';
import { buildSnap } from '../../src/graphics/snowflake/core/snowflakeGrowthReplay/snapshots';
import { instances } from '../../src/graphics/snowflake/core/snowflakeGrowthReplay/identityLedger';
import { sdrawsOf, smoothPlan } from '../../src/graphics/snowflake/core/snowflakeGrowthReward/smoothReveal';
import { rewardPlan, rewardStats } from '../../src/graphics/snowflake/core/snowflakeGrowthReward/snowglobe';
import { windows } from '../../src/graphics/snowflake/core/snowflakeGrowthReward/timeline';
import { graphemes } from '../../src/graphics/snowflake/engine';
import { toEngine, distinctDays } from '../../src/graphics/snowflake/sourceAdapter';
import { dayWindows, eventKind } from '../../src/graphics/snowflake/events';
import type { DiaryEntry } from '../../src/data/types';

// fake entries only (no real diary text)
const BODIES = ['작게 시작한 것도 잘한 일이다.', '중간에 포기하지 않았다.', '충분히 쉬면서 마음을 들여다봤다.', '친구에게 먼저 안부를 물었다.', '어려운 부분을 다시 시도했다.', '오늘 할 수 있는 만큼 했다.', '미뤄둔 일을 끝냈다.'];
const day = (i: number) => `2026-12-${String(i).padStart(2, '0')}`;
const fake = (days: number, extra = 0): DiaryEntry[] => [
  ...Array.from({ length: days }, (_, i) => ({ id: `f${i + 1}`, entryDate: day(i + 1), createdAt: `${day(i + 1)}T21:00:00Z`, title: '쀍제목', body: BODIES[i % BODIES.length]!, referencePrompt: '뷁질문' })),
  ...Array.from({ length: extra }, (_, j) => ({ id: `x${j}`, entryDate: day(days), createdAt: `${day(days)}T22:0${j}:00Z`, body: BODIES[(j + 3) % BODIES.length]! })),
];
const snap = (E: DiaryEntry[]) => { const x = toEngine(E); const d = [...new Set(x.map(e => e.entryDate))].sort(); return buildSnap(x, d.length, d[d.length - 1]!, { still: false, seed: 'v1' }); };
const keys = (s: ReturnType<typeof snap>) => s.is.rs.st.active.map(g => `${g.slot}|${g.key}|${g.glyph}`).join(',');

test('stage = distinct days (research 15 visual stages); glyphs come only from diary bodies; 16+ days stay complete', () => {
  test.setTimeout(300_000);
  let prev = 0;
  for (const n of [1, 3, 8, 14, 15, 17]) {
    const E = fake(n), s = snap(E);
    expect(s.U).toBe(n); expect(s.stage).toBe(Math.min(n, 15));
    const allowed = new Set(E.flatMap(e => graphemes(e.body).map(g => g.text)));
    for (const g of s.is.rs.st.active) expect(allowed.has(g.glyph), g.glyph).toBe(true);
    expect(s.is.rs.st.active.some(g => g.glyph === '쀍' || g.glyph === '뷁')).toBe(false); // title / prompt never a source
    expect(s.is.rs.st.active.length).toBeGreaterThan(prev); prev = s.is.rs.st.active.length;
  }
  expect(toEngine([{ id: 'e', entryDate: day(1), createdAt: 'x', body: '   ' }])).toEqual([]);
});

test('same day +2 = density only; entry order, delete + restore are deterministic', () => {
  test.setTimeout(300_000);
  const base = snap(fake(8)), more = snap(fake(8, 2));
  expect(more.stage).toBe(base.stage); expect(distinctDays(fake(8, 2))).toBe(8);
  expect(more.is.rs.st.active.length).toBeGreaterThanOrEqual(base.is.rs.st.active.length);
  const E = fake(8, 2);
  expect(keys(snap([...E].reverse()))).toBe(keys(snap(E)));
  const removed = E.filter(e => e.id !== 'x1');
  expect(keys(snap([...removed, E.find(e => e.id === 'x1')!]))).toBe(keys(snap(E)));
});

test('saved-screen events: the day change ends exactly in the after-state; completion rule keeps targetDays null', () => {
  test.setTimeout(300_000);
  const B = snap(fake(8)), A = snap([...fake(8), { id: 'new', entryDate: day(9), createdAt: `${day(9)}T21:00:00Z`, body: BODIES[2]! }]);
  const w = dayWindows();
  const p = smoothPlan(2, B, A, w, 'G1');
  const at = (e: number) => sdrawsOf(p, e).draws;
  const start = at(0), end = at(w.tau[2]!);
  expect(start.every(d => d.alpha === 1 && d.st === 0)).toBe(true); expect(start.length).toBe(instances(B).length);
  expect(end.every(d => d.alpha === 1 && d.st === 1)).toBe(true); expect(end.length).toBe(instances(A).length);
  for (let e = 0; e <= w.tau[2]!; e += 1 / 60) for (const d of at(e)) { const x = (d.st ? instances(A) : instances(B))[d.i]!; expect(x.date <= day(9)).toBe(true); }
  expect(eventKind('growth', 8, 9, false)).toBe('growth');
  expect(eventKind('addition', 9, 9, true)).toBe('addition');
  expect(eventKind('growth', 14, 15, false)).toBe('growth'); // product: 2026-12 targetDays is null → never complete
  expect(eventKind('growth', 14, 15, true)).toBe('complete'); // review build only
  expect(eventKind('complete', 9, 10, false)).toBe('complete'); // a real target crossed (App mode)
  const R = rewardPlan('balanced', snap(fake(15)), windows(7, 15)), st = rewardStats(R, snap(fake(15)));
  expect(st.text).toBe(14); expect(st.frost).toBe(30); expect(st.firstBirth).toBeGreaterThanOrEqual(windows(7, 15).complete[1] - 1e-9); expect(st.lastDeath).toBeLessThan(7);
  const bodies = new Set(fake(15).map(e => e.id));
  for (const x of R.particles) if (x.kind === 'text') expect(bodies.has(x.entryId!)).toBe(true);
});
