import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DiaryRow } from '../components/DiaryRow';
import { SearchField, FilterToggle, ListSectionHeader } from '../components/ArchiveControls';
import { Button, CompactSelect, EmptyState, TextAction } from '../components/ui';
import { ARCHIVE_PAGE_SIZE, archivePeriods, groupArchive, selectArchive, searchKey } from '../data/archive.mjs';
import type { DiaryEntry } from '../data/types';
import { formatMonth } from '../lib/date';

export type ArchiveSnapshot={query:string;year:string;month:string;withReflection:boolean;limit:number;entryId:string;scroll:number;offset:number};
type Props={entries:DiaryEntry[];reflectionCounts:ReadonlyMap<string,number>;scopeMonth?:string;initial?:ArchiveSnapshot|null;onOpen:(entry:DiaryEntry,snapshot:ArchiveSnapshot)=>void;onWrite:()=>void};
export function ArchiveScreen({entries,reflectionCounts,scopeMonth,initial,onOpen,onWrite}:Props){
 const [query,setQuery]=useState(initial?.query??'');
 const [year,setYear]=useState(initial?.year??'all');
 const [month,setMonth]=useState(initial?.month??'all');
 const [withReflection,setWithReflection]=useState(initial?.withReflection??false);
 const [limit,setLimit]=useState(initial?.limit??ARCHIVE_PAGE_SIZE);
 const section=useRef<HTMLElement>(null),restored=useRef(false);
 const scoped=useMemo(()=>selectArchive(entries,{scopeMonth}),[entries,scopeMonth]);
 const periods=useMemo(()=>archivePeriods(scoped),[scoped]);
 const visibleYear=periods.years.includes(year)?year:'all';
 const visibleMonth=periods.months.includes(month)&&(visibleYear==='all'||month.startsWith(visibleYear+'-'))?month:'all';
 const monthOptions=periods.months.filter(m=>visibleYear==='all'||m.startsWith(visibleYear+'-'));
 const filtered=useMemo(()=>selectArchive(scoped,{year:visibleYear,month:visibleMonth,query,withReflection,counts:reflectionCounts}),[scoped,visibleYear,visibleMonth,query,withReflection,reflectionCounts]);
 const groups=useMemo(()=>groupArchive(filtered.slice(0,limit)),[filtered,limit]);
 const isFiltered=Boolean(searchKey(query)||visibleYear!=='all'||visibleMonth!=='all'||withReflection);
 const resetLimit=()=>setLimit(ARCHIVE_PAGE_SIZE);
 const clear=()=>{setQuery('');setYear('all');setMonth('all');setWithReflection(false);resetLimit()};
 const rowFor=(id:string)=>Array.from(section.current?.querySelectorAll<HTMLButtonElement>('.diary-row')??[]).find(el=>el.dataset.entryId===id);
 useLayoutEffect(()=>{
  if(!initial||restored.current)return;restored.current=true;
  const row=rowFor(initial.entryId);
  if(row){row.focus({preventScroll:true});window.scrollTo(0,Math.max(0,window.scrollY+row.getBoundingClientRect().top-initial.offset));}
  else{window.scrollTo(0,initial.scroll);section.current?.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});}
 },[initial]);
 function open(entry:DiaryEntry){
  const row=rowFor(entry.id);
  onOpen(entry,{query,year:visibleYear,month:visibleMonth,withReflection,limit,entryId:entry.id,scroll:window.scrollY,offset:row?.getBoundingClientRect().top??0});
 }
 if(!scoped.length)return <EmptyState title="아직 남긴 칭찬이 없어요." description="오늘의 작은 칭찬부터 시작해 볼까요?" action={<Button onClick={onWrite}>칭찬일기 남기러 가기</Button>}/>;
 return <section className="archive-screen" ref={section} aria-label="칭찬 기록">
  <div className="archive-controls">
   <SearchField value={query} onChange={v=>{setQuery(v);resetLimit()}}/>
   <div className="archive-filters">
    {!scopeMonth&&<div className="archive-periods">
     <CompactSelect label="연도 선택" value={visibleYear} options={[{value:'all',label:'전체 연도'},...periods.years.map(y=>({value:y,label:y+'년'}))]} onChange={v=>{setYear(v);setMonth('all');resetLimit()}}/>
     <CompactSelect label="월 선택" value={visibleMonth} options={[{value:'all',label:'전체 월'},...monthOptions.map(m=>({value:m,label:visibleYear==='all'?formatMonth(m):Number(m.slice(5))+'월'}))]} onChange={v=>{setMonth(v);resetLimit()}}/>
    </div>}
    <FilterToggle label="마음이 담긴 칭찬" pressed={withReflection} onChange={v=>{setWithReflection(v);resetLimit()}}/>
   </div>
  </div>
  {isFiltered&&<div className="archive-results"><span role="status" aria-live="polite">칭찬 {filtered.length}개</span><TextAction onClick={clear} density="toolbar">초기화</TextAction></div>}
  {filtered.length===0?<EmptyState title="찾는 칭찬이 없어요." description="검색어나 선택한 조건을 바꿔 보세요." action={<Button variant="secondary" onClick={clear}>전체 칭찬 보기</Button>}/>:<>
   <div className="archive-groups">
    {groups.map(group=><section key={group.month} className="archive-month-group" aria-labelledby={'archive-'+group.month}>
     <ListSectionHeader id={'archive-'+group.month} label={formatMonth(group.month)}/>
     <div className="diary-list" data-variant="A">
      {group.entries.map((entry,i)=><DiaryRow key={entry.id} entry={entry} reflectionCount={reflectionCounts.get(entry.id)??0} query={query} divider={i<group.entries.length-1} onOpen={open}/>)}
     </div>
    </section>)}
   </div>
   {limit<filtered.length&&<div className="archive-more"><Button variant="secondary" onClick={()=>setLimit(v=>v+ARCHIVE_PAGE_SIZE)}>더 보기</Button><span className="small-caption" role="status">{Math.min(limit,filtered.length)} / {filtered.length}개</span></div>}
  </>}
 </section>;
}
