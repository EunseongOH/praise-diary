import type { ReactNode } from 'react';
import { formatDay, formatMonth } from '../lib/date';
import type { DiaryEntry, MonthTheme } from '../data/types';
import { GraphicArtwork } from '../graphics/GraphicArtwork';

export function MonthTile({ month, theme, writtenDays, entries, entriesData = [], letterSource = '', reducedMotion, onClick, locked }: {
  month: string; theme?: MonthTheme; writtenDays: number; entries: number; entriesData?: DiaryEntry[]; letterSource?: string;
  reducedMotion: boolean; onClick: () => void; locked?: boolean;
}) {
  return <button type="button" className={`month-tile ${locked ? 'month-tile--locked' : ''}`} onClick={onClick}>
    <div className="month-tile__art">
      {theme && !locked ? <GraphicArtwork theme={theme} writtenDays={writtenDays} letterCount={entries} entries={entriesData} letterSource={letterSource} reducedMotion={reducedMotion} small /> :
        <span className="month-tile__blank" aria-hidden="true">···</span>}
    </div>
    <div className="month-tile__copy">
      <span className="month-tile__date">{formatMonth(month)}</span>
      <strong>{locked ? '아직 공개되지 않았어요' : (theme?.title ?? '기록이 없어요')}</strong>
      {!locked && <small>{writtenDays}일의 칭찬</small>}
    </div>
  </button>;
}

export function DiaryList({ entries, onOpen, emptyContent }: {
  entries: DiaryEntry[]; onOpen: (entry: DiaryEntry) => void; emptyContent?: ReactNode;
}) {
  if (entries.length === 0) return <>{emptyContent}</>;
  return <div className="diary-list">
    {[...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt))
      .map((entry) => <button className="diary-row" key={entry.id} type="button" onClick={() => onOpen(entry)}>
        <time className="diary-row__date" dateTime={entry.entryDate}>{formatDay(entry.entryDate)}</time>
        <strong>{entry.title || entry.body.slice(0, 27)}</strong>
        {entry.title && <span className="diary-row__excerpt">{entry.body}</span>}
      </button>)}
  </div>;
}

export function MemorySlip({ entry }: { entry: DiaryEntry }) {
  return <article className="memory-slip">
    <time dateTime={entry.entryDate}>{formatDay(entry.entryDate)}</time>
    {entry.title && <h2>{entry.title}</h2>}
    <p>{entry.body}</p>
  </article>;
}
