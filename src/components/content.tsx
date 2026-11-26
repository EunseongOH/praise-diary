import type { ReactNode } from 'react';
import { formatDay, formatMonth } from '../lib/date';
import type { DiaryEntry, MonthTheme } from '../data/types';
import { Icon } from './icons';
import { ArtworkSlot } from '../graphics/ArtworkSlot';

export type MonthVisualState='locked'|'empty'|'preparing'|'recorded';
/** No artificial artwork: only a reserved canvas and distinct status symbols. */
export function MonthVisual({state,children}:{state:MonthVisualState;children?:ReactNode}){
 return <div className="month-visual" data-state={state}>
  {state==='locked'?<Icon name="lock" size="navigation"/>:state==='empty'?<span className="month-empty-mark" aria-hidden="true"/>:children}
 </div>;
}
export function MonthTile({ month, theme, writtenDays, entries, entriesData = [], letterSource = '', reducedMotion, onClick, locked }: {
  month: string; theme?: MonthTheme; writtenDays: number; entries: number; entriesData?: DiaryEntry[]; letterSource?: string;
  reducedMotion: boolean; onClick: () => void; locked?: boolean;
}) {
 const state:MonthVisualState=locked?'locked':!theme?'preparing':writtenDays===0?'empty':'recorded';
 const name=locked?'아직 공개되지 않았어요':state==='empty'?'아직 남긴 칭찬이 없어요':theme?.title??'작품 준비 중';
 const meta=locked?'':state==='empty'?theme?.title??'':writtenDays+'일의 칭찬';
 return <button type="button" data-month={month} className="month-tile" data-state={state} onClick={onClick}>
  <div className="month-tile__art"><MonthVisual state={state}>
   <ArtworkSlot theme={theme} writtenDays={writtenDays} letterCount={entries} entries={entriesData} letterSource={letterSource} reducedMotion={reducedMotion} small/>
   {(state==='recorded'||state==='preparing')&&<span className="month-slot-caption" aria-hidden="true">작품 준비 중</span>}
  </MonthVisual></div>
  <div className="month-tile__copy">
   <span className="month-tile__date">{formatMonth(month)}</span>
   <strong className="month-tile__name">{name}</strong>
   {meta&&<small>{meta}</small>}
  </div>
 </button>;
}

export type DiaryListVariant='A'|'B'|'C';
function ReflectionCount({count}:{count:number}){
 if(count<=0)return null;
 return <span className="diary-reflection-count"><Icon name="message" size="inline"/><span aria-hidden="true">{count}</span><span className="sr-only">덧붙인 마음 {count}개</span></span>;
}
export function DiaryList({entries,onOpen,emptyContent,variant='A',reflectionCounts}:{
 entries:DiaryEntry[];onOpen:(entry:DiaryEntry)=>void;emptyContent?:ReactNode;variant?:DiaryListVariant;reflectionCounts?:ReadonlyMap<string,number>;
}){
 if(!entries.length)return <>{emptyContent}</>;
 const sorted=[...entries].sort((a,b)=>b.entryDate.localeCompare(a.entryDate)||b.createdAt.localeCompare(a.createdAt));
 const row=(entry:DiaryEntry,showDate:boolean)=>{const count=reflectionCounts?.get(entry.id)??0;return <button className="diary-row" key={entry.id} type="button" onClick={()=>onOpen(entry)}>
   {showDate&&<div className="diary-row-meta"><time className="diary-row__date" dateTime={entry.entryDate}>{formatDay(entry.entryDate)}</time><ReflectionCount count={count}/></div>}
   <div className="diary-row-heading">{entry.title?<strong>{entry.title}</strong>:<span className="diary-row__untitled">{entry.body}</span>}{!showDate&&<ReflectionCount count={count}/>}</div>
   {entry.title&&<span className="diary-row__excerpt">{entry.body}</span>}
 </button>};
 return <div className="diary-list" data-variant={variant}>
  {variant==='C'?[...new Set(sorted.map(e=>e.entryDate))].map(date=><section className="diary-date-group" key={date}><time className="diary-group-date" dateTime={date}>{formatDay(date)}</time><div className="diary-group-rows">{sorted.filter(e=>e.entryDate===date).map(e=>row(e,false))}</div></section>):sorted.map(e=>row(e,true))}
 </div>;
}

export function MemorySlip({ entry }: { entry: DiaryEntry }) {
  return <article className="memory-slip">
    <time dateTime={entry.entryDate}>{formatDay(entry.entryDate)}</time>
    {entry.title && <h2>{entry.title}</h2>}
    <p>{entry.body}</p>
  </article>;
}
