const KST = 'Asia/Seoul';

/** 테스트 가능한 결정적 날짜 계산. 사용자의 기기 타임존을 사용하지 않는다. */
export function koreanClock(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KST,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23', minute: '2-digit',
  }).formatToParts(now);
  const get = (part: string) => parts.find((p) => p.type === part)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function serviceDate(now: Date, boundaryHour: number): string {
  const clock = koreanClock(now);
  return clock.hour < boundaryHour ? shiftDate(clock.date, -1) : clock.date;
}

export function monthOf(date: string): `${number}-${number}` {
  return date.slice(0, 7) as `${number}-${number}`;
}

export function formatDay(date: string): string {
  const [y = '', m = '', d = ''] = date.split('-');
  return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`;
}

export function shortDay(date: string): string {
  const [, m = '', d = ''] = date.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

export function formatMonth(month: string): string {
  const [year = '', number = ''] = month.split('-');
  return `${year}년 ${Number(number)}월`;
}

export function todayAndYesterday(now: Date, boundaryHour: number) {
  const today = serviceDate(now, boundaryHour);
  return { today, yesterday: shiftDate(today, -1) };
}

export function currentPreviewTime(): Date {
  const configured = import.meta.env.VITE_DEMO_DATE as string | undefined;
  return configured && !Number.isNaN(Date.parse(configured)) ? new Date(configured) : new Date();
}
