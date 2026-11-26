import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DiaryRow } from '../components/DiaryRow';
import { SearchField, FilterToggle, ListSectionHeader } from '../components/ArchiveControls';
import { PeriodPicker } from '../components/PeriodPicker';
import { AppBar, Button, EmptyState, IconButton, TextAction } from '../components/ui';
import { ARCHIVE_PAGE_SIZE, archivePeriods, groupArchive, selectArchive, searchKey } from '../data/archive.mjs';
import type { DiaryEntry } from '../data/types';
import { formatMonth } from '../lib/date';

export type ArchiveSnapshot={query:string;year:string;month:string;withReflection:boolean;limit:number;entryId:string;scroll:number;offset:number;searchOpen:boolean;baseLimit:number;baseScroll:number};
type Props={entries:DiaryEntry[];reflectionCounts:ReadonlyMap<string,number>;scopeMonth?:string;heading:string;initial?:ArchiveSnapshot|null;onBack:()=>void;onOpen:(entry:DiaryEntry,snapshot:ArchiveSnapshot)=>void;onWrite:()=>void};
export function ArchiveScreen({entries,reflectionCounts,scopeMonth,heading,initial,onBack,onOpen,onWrite}:Props){
 const [searchOpen,setSearchOpen]=useState(initial?.searchOpen??false);
 const [query,setQuery]=useState(initial?.query??'');
 const [committed,setCommitted]=useState(initial?.query??'');
 const [year,setYear]=useState(initial?.year??'all');
 const [month,setMonth]=useState(initial?.month??'all');
 const [withReflection,setWithReflection]=useState(initial?.withReflection??false);
 const [limit,setLimit]=useState(initial?.searchOpen?initial.limit:ARCHIVE_PAGE_SIZE);
 const [baseLimit,setBaseLimit]=useState(initial?.baseLimit??ARCHIVE_PAGE_SIZE);
 const base=useRef<HTMLDivElement>(null),modal=useRef<HTMLDivElement>(null),results=useRef<HTMLDivElement>(null);
 const input=useRef<HTMLInputElement|null>(null),baseScroll=useRef(initial?.baseScroll??0),restored=useRef(false);
 const focusNew=useRef(false);
 const [viewport,setViewport]=useState<{height:number;top:number}>();
 const scoped=useMemo(()=>selectArchive(entries,{scopeMonth}),[entries,scopeMonth]);
 const periods=useMemo(()=>archivePeriods(scoped),[scoped]);
 // Preserve explicit period even if deleting the final matching entry; show empty results rather than silently broadening.
 const visibleYear=year,visibleMonth=month;
 const periodValue=visibleMonth!=='all'?visibleMonth:visibleYear;
 const filtered=useMemo(()=>selectArchive(scoped,{year:visibleYear,month:visibleMonth,query:committed,withReflection,counts:reflectionCounts}),[scoped,visibleYear,visibleMonth,committed,withReflection,reflectionCounts]);
 const groups=useMemo(()=>groupArchive(scoped.slice(0,baseLimit)),[scoped,baseLimit]);
 const isFiltered=Boolean(searchKey(committed)||year!=='all'||month!=='all'||withReflection);
 const resetLimit=()=>{setLimit(ARCHIVE_PAGE_SIZE);if(results.current)results.current.scrollTop=0};
 const clear=()=>{setQuery('');setCommitted('');setYear('all');setMonth('all');setWithReflection(false);resetLimit()};
 const changePeriod=(v:string)=>{setYear(v==='all'?'all':v.slice(0,4));setMonth(v.length===7?v:'all');resetLimit()};
 const rowFor=(id:string,search:boolean)=>Array.from((search?results.current:base.current)?.querySelectorAll<HTMLButtonElement>('.diary-row')??[]).find(el=>el.dataset.entryId===id);
 const searchButton=()=>base.current?.querySelector<HTMLButtonElement>('button[aria-label="칭찬 검색하기"]');
 function startSearch(){baseScroll.current=window.scrollY;focusNew.current=true;clear();setSearchOpen(true)}
 function closeSearch(){setSearchOpen(false);clear();requestAnimationFrame(()=>{window.scrollTo(0,baseScroll.current);searchButton()?.focus({preventScroll:true})})}
 useLayoutEffect(()=>{
  if(restored.current)return;restored.current=true;
  if(!initial)return;
  if(initial.searchOpen){
   window.scrollTo(0,initial.baseScroll);
   const r=rowFor(initial.entryId,true),list=results.current;
   if(list){list.scrollTop=initial.scroll;if(r){r.focus({preventScroll:true});list.scrollTop+=r.getBoundingClientRect().top-initial.offset}else modal.current?.querySelector<HTMLButtonElement>('[aria-label="검색 닫기"]')?.focus({preventScroll:true})}
  }else{
   const row=rowFor(initial.entryId,false);window.scrollTo(0,initial.scroll);
   if(row){row.focus({preventScroll:true});window.scrollTo(0,Math.max(0,window.scrollY+row.getBoundingClientRect().top-initial.offset))}else searchButton()?.focus({preventScroll:true});
  }
 },[initial]);
 useLayoutEffect(()=>{
  if(!searchOpen)return;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  if(base.current)base.current.inert=true;
  if(focusNew.current){focusNew.current=false;input.current?.focus({preventScroll:true})}
  return()=>{document.body.style.overflow=previous;if(base.current)base.current.inert=false};
 },[searchOpen]);
 useEffect(()=>{
  if(!searchOpen)return;
  const fit=()=>{const v=window.visualViewport;setViewport({height:v?.height??window.innerHeight,top:v?.offsetTop??0})};
  fit();window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);
  return()=>{window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('scroll',fit)};
 },[searchOpen]);
 function open(entry:DiaryEntry,search:boolean){
  const row=rowFor(entry.id,search);
  onOpen(entry,{query:committed,year,month,withReflection,limit,entryId:entry.id,scroll:search?(results.current?.scrollTop??0):window.scrollY,offset:row?.getBoundingClientRect().top??0,searchOpen:search,baseLimit,baseScroll:search?baseScroll.current:window.scrollY});
 }
 const more=(count:number,total:number,onMore:()=>void)=>count<total?<div className="archive-more"><Button variant="secondary" onClick={onMore}>더 보기</Button><span className="small-caption" role="status">{Math.min(count,total)} / {total}개</span></div>:null;
 return <section className="archive-screen archive-f" aria-label="칭찬 기록">
  <div ref={base} className="archive-base">
   <AppBar title={heading} onBack={onBack} trailing={scoped.length>0?<IconButton icon="search" label="칭찬 검색하기" onClick={startSearch}/>:undefined}/>
   {!scoped.length?<EmptyState title="아직 남긴 칭찬이 없어요." description="오늘의 작은 칭찬부터 시작해 볼까요?" action={<Button onClick={onWrite}>칭찬일기 남기러 가기</Button>}/>:<>
    <div className="archive-groups">
     {groups.map(group=><section key={group.month} className="archive-month-group" aria-labelledby={'archive-'+group.month}>
      <ListSectionHeader id={'archive-'+group.month} label={formatMonth(group.month)}/>
      <div className="diary-list" data-variant="A">{group.entries.map((entry,i)=><DiaryRow key={entry.id} entry={entry} reflectionCount={reflectionCounts.get(entry.id)??0} divider={i<group.entries.length-1} onOpen={e=>open(e,false)}/>)}</div>
     </section>)}
    </div>
    {more(baseLimit,scoped.length,()=>setBaseLimit(v=>v+ARCHIVE_PAGE_SIZE))}
   </>}
  </div>
  {searchOpen&&<div ref={modal} role="dialog" aria-modal="true" aria-label="칭찬 검색" className="archive-search-overlay" data-results={isFiltered} style={viewport?{height:viewport.height,top:viewport.top}:undefined}
   onKeyDown={e=>{
    if(e.key==='Escape'&&!e.nativeEvent.isComposing){e.preventDefault();closeSearch();return}
    if(e.key!=='Tab')return;
    const nodes=Array.from(modal.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')??[]).filter(el=>el.getClientRects().length);
    const first=nodes[0],last=nodes.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
   }}>
   <header className="archive-search-header">
    <div className="archive-search-input-row">
     <SearchField variant="plain" value={query} placeholder="칭찬 검색하기" onChange={setQuery} onCommit={v=>{setCommitted(v);resetLimit()}} onFocusInput={el=>{input.current=el}}/>
     <IconButton icon="close" label="검색 닫기" onClick={closeSearch}/>
    </div>
    <div className="archive-search-filters" data-scoped={Boolean(scopeMonth)}>
     {!scopeMonth&&<PeriodPicker value={periodValue} months={periods.months} years={periods.years} onChange={changePeriod}/>}
     <FilterToggle variant="text" label="마음이 담긴 칭찬" pressed={withReflection} onChange={v=>{setWithReflection(v);resetLimit()}}/>
    </div>
   </header>
   {isFiltered?<div ref={results} className="archive-search-results">
    <div className="archive-results"><span role="status" aria-live="polite">칭찬 {filtered.length}개</span><TextAction onClick={clear} density="toolbar">초기화</TextAction></div>
    {!filtered.length?<EmptyState title="찾는 칭찬이 없어요." description="검색어나 선택한 조건을 바꿔 보세요." action={<Button variant="secondary" onClick={clear}>검색 조건 초기화</Button>}/>:<>
     <div className="diary-list" data-variant="A">{filtered.slice(0,limit).map((entry,i)=><DiaryRow key={entry.id} entry={entry} reflectionCount={reflectionCounts.get(entry.id)??0} query={committed} divider={i<Math.min(limit,filtered.length)-1} onOpen={e=>open(e,true)}/>)}</div>
     {more(limit,filtered.length,()=>setLimit(v=>v+ARCHIVE_PAGE_SIZE))}
    </>}
   </div>:<div className="archive-search-dim" onClick={closeSearch} aria-hidden="true"/>}
  </div>}
 </section>;
}
