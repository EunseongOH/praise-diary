import { Button, IconButton, TextAction } from '../components/ui';
import { Icon } from '../components/icons';
import { ArtworkSlot } from '../graphics/ArtworkSlot';
import type { DiaryEntry, MonthId, MonthTheme } from '../data/types';
import { formatMonth, monthOf } from '../lib/date';

export type HomeMode = 'art' | 'calendar';
type HomeProps = {
  month: MonthId; months: MonthId[]; mode: HomeMode; today: string;
  theme?: MonthTheme; entries: DiaryEntry[]; reducedMotion: boolean;
  onMonth: (month: MonthId) => void; onMode: (mode: HomeMode) => void;
  onWrite: () => void; onSettings: () => void; onDay: (day: string) => void;
  onMonthEntries: () => void; onAllEntries: () => void; onArt: () => void;
  onIdea: () => void;
};

/** Calendar layout uses calendar dates, not device timezone or diary-day boundary. */
export function calendarCells(month: MonthId): Array<string | null> {
  const first = new Date(`${month}-01T12:00:00Z`);
  const year = first.getUTCFullYear(), monthIndex = first.getUTCMonth();
  const length = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const offset = first.getUTCDay();
  return Array.from({length: Math.ceil((offset + length) / 7) * 7}, (_, i) => {
    const day = i - offset + 1;
    return day > 0 && day <= length ? `${month}-${String(day).padStart(2,'0')}` : null;
  });
}
const weekdays = ['일','월','화','수','목','금','토'];

export function HomeShell(p: HomeProps) {
  const current = p.month === monthOf(p.today);
  const future = p.month > monthOf(p.today);
  const days = new Set(p.entries.map(e => e.entryDate));
  const monthIndex = p.months.indexOf(p.month);
  const move = (delta: number) => {
    const next = p.months[monthIndex + delta];
    if (next) p.onMonth(next);
  };
  return <section className="home-integrated">
    <header className="home-toolbar">
      {p.mode === 'art' ? <label className="home-month-picker">
        <select aria-label="작품 월 선택" value={p.month} onChange={e => p.onMonth(e.target.value as MonthId)}>
          {p.months.map(month => <option key={month} value={month}>{formatMonth(month)}</option>)}
        </select><Icon name="chevron-down" size="inline"/>
      </label> : <span className="home-toolbar-spacer" aria-hidden="true"/>}
      <div className="home-toolbar-actions">
        <IconButton icon="plus" label="칭찬 남기기" onClick={p.onWrite}/>
        <IconButton icon={p.mode === 'art' ? 'calendar' : 'image'} label={p.mode === 'art' ? '달력으로 보기' : '작품으로 보기'} aria-pressed={p.mode === 'calendar'} onClick={() => p.onMode(p.mode === 'art' ? 'calendar' : 'art')}/>
        <IconButton icon="settings" label="설정" onClick={p.onSettings}/>
      </div>
    </header>
    {p.mode === 'calendar' && <div className="home-calendar-navigation">
      <IconButton icon="chevron-left" label="이전 달" disabled={monthIndex <= 0} onClick={() => move(-1)}/>
      <span>{formatMonth(p.month)}</span>
      <IconButton icon="chevron-right" label="다음 달" disabled={monthIndex >= p.months.length - 1} onClick={() => move(1)}/>
    </div>}
    {future ? <div className="home-locked">
      <Icon name="lock" size="navigation"/>
      <h1 className="section-title">{p.theme ? '아직 열리지 않은 작품이에요' : '아직 정해지지 않은 작품이에요'}</h1>
      <p className="description">{p.theme ? '이달이 찾아오면 작품을 만나볼 수 있어요.' : '이달의 그래픽은 아직 준비 중이에요.'}</p>
      {!p.theme && <TextAction onClick={p.onIdea}>이런 그래픽은 어때요? 의견 남기기</TextAction>}
    </div> : p.mode === 'art' ? <>
      {p.theme && <h1 className="home-artwork-title">{p.theme.title}</h1>}
      <div className="home-artwork-stage">
        {p.theme ? <button className="illustration-stage__view" type="button" onClick={p.onArt} aria-label="월간 작품 보기">
          <ArtworkSlot theme={p.theme} writtenDays={days.size} letterCount={p.entries.length} entries={p.entries} reducedMotion={p.reducedMotion} letterSource={p.entries.map(e => e.body).join(' ')}/>
        </button> : <ArtworkSlot writtenDays={days.size} letterCount={p.entries.length} entries={p.entries}/>}
      </div>
      <p className="home-artwork-count">{days.size}일의 칭찬</p>
      {current && days.size === 0 && <p className="home-empty-copy">오늘의 나에게 칭찬 하나 남겨볼까요?</p>}
    </> : <div className="home-calendar-area">
      <div className="home-calendar-grid" aria-label={`${formatMonth(p.month)} 기록 달력`}>
        {weekdays.map(d => <span className="home-weekday" key={d}>{d}</span>)}
        {calendarCells(p.month).map((day,i) => day ? <button type="button" key={day} className={`home-calendar-day ${days.has(day) ? 'has-entry' : ''}`} disabled={!days.has(day)} aria-label={`${day}${days.has(day) ? ' 기록 보기' : ' 기록 없음'}`} aria-current={day === p.today ? 'date' : undefined} onClick={() => p.onDay(day)}>{Number(day.slice(-2))}</button> : <span key={`blank-${i}`} aria-hidden="true"/>)}
      </div>
    </div>}
    {!future && <Button className="ui-button--full" onClick={current ? p.onWrite : p.onMonthEntries}>{current ? (days.has(p.today) ? '칭찬 하나 더 남기기' : '칭찬 하나 남기기') : '이달의 칭찬 보기'}</Button>}
    <div className="home-all-entries"><TextAction onClick={p.onAllEntries}>내가 남긴 칭찬 보기</TextAction></div>
  </section>;
}
