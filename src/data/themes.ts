import type { MonthId, MonthTheme } from './types';

// 특별 목표는 출시일 확정 후 서버 카탈로그에서 결정한다. null은 숫자 미정.
export const MONTH_THEMES: MonthTheme[] = [
  { month: '2026-12', title: '12월의 눈꽃', kind: 'snowflake', artworkKey: '2026-12/snowflake-v1', targetDays: null },
  // The sheep artwork is PLANNED; the key is reserved, not an assertion that a real renderer exists.
  { month: '2027-01', title: '붉은 양과 해', kind: 'sheep', artworkKey: '2027-01/sheep-v1', targetDays: 15 },
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

export type CollectionLayout = 'A' | 'B';
export function shiftMonth(month:MonthId,offset:number):MonthId {
 const [year=0,m=1]=month.split('-').map(Number);
 const date=new Date(Date.UTC(year,m-1+offset,1));
 return date.toISOString().slice(0,7) as MonthId;
}
/** V02 review variants. Calendar selection catalog is independent. */
export function collectionGroups(months:MonthId[],current:MonthId,recorded:ReadonlySet<MonthId>,layout:CollectionLayout){
 const past=collectionMonths(months,current).filter(m=>m<=current);
 const archived=layout==='A'?past.filter(m=>m===current||recorded.has(m)):past;
 const upcoming=Array.from({length:layout==='A'?1:2},(_,i)=>shiftMonth(current,i+1));
 return {archived,upcoming};
}
