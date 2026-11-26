import type { DiaryEntry } from '../data/types';
import { formatDay } from '../lib/date';
import { Icon } from './icons';

export type DiaryRowSurface = 'plain' | 'card';
export type DiaryRowDate = 'visible' | 'grouped';
type Props = {
 entry: DiaryEntry;
 reflectionCount?: number;
 surface?: DiaryRowSurface;
 date?: DiaryRowDate;
 divider?: boolean;
 onOpen: (entry: DiaryEntry) => void;
};

/** Passive metadata. The entire diary row is the only interactive target. */
export function ReflectionCount({count}:{count:number}){
 if(count<=0)return null;
 return <span className="diary-reflection-count">
  <Icon name="message" size="inline"/>
  <span className="diary-reflection-count__number" aria-hidden="true">{count}</span>
  <span className="sr-only">덧붙인 마음 {count}개</span>
 </span>;
}

/** Preview normalization only; original stored title/body is never modified. */
export function DiaryRow({entry,reflectionCount=0,surface='plain',date='visible',divider=false,onOpen}:Props){
 const title=entry.title?.trim(), hasTitle=Boolean(title), hasReflection=reflectionCount>0;
 const body=entry.body.replace(/\s+/g,' ').trim();
 const hasMeta=date==='visible'||hasReflection;
 return <button type="button" className="diary-row" data-entry-id={entry.id}
   data-surface={surface} data-date={date} data-title={hasTitle?'present':'absent'}
   data-reflection={hasReflection?'present':'absent'} data-divider={divider}
   onClick={()=>onOpen(entry)}>
   {hasMeta&&<span className="diary-row-meta">
    {date==='visible'&&<time className="diary-row__date" dateTime={entry.entryDate}>{formatDay(entry.entryDate)}</time>}
    {hasReflection&&<ReflectionCount count={reflectionCount}/>}
   </span>}
   {hasTitle&&<strong className="diary-row__title">{title}</strong>}
   <span className={hasTitle?'diary-row__excerpt':'diary-row__untitled'}>{body}</span>
 </button>;
}
