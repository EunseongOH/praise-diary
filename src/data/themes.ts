import type { MonthId, MonthTheme } from './types';

// 특별 목표는 출시일 확정 후 서버 카탈로그에서 결정한다. null은 숫자 미정.
export const MONTH_THEMES: MonthTheme[] = [
  { month: '2026-12', title: '12월의 눈꽃', kind: 'snowflake', targetDays: null },
  { month: '2027-01', title: '붉은 양과 해', kind: 'sheep', targetDays: 15 },
];

export const UPCOMING_MONTHS: MonthId[] = ['2027-02', '2027-03'];

export function themeFor(month: string): MonthTheme | undefined {
  return MONTH_THEMES.find((theme) => theme.month === month);
}

/** Review policy: current month, past descending, then upcoming ascending. */
export function collectionMonths(months: MonthId[],current:MonthId):MonthId[] {
 const unique=[...new Set(months)];
 return [current,...unique.filter(m=>m<current).sort().reverse(),...unique.filter(m=>m>current).sort()];
}
