import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {Icon} from './icons';
import {IconButton} from './ui';
import {formatMonth} from '../lib/date';

export function PeriodPicker({value,months,years,onChange}:{value:string;months:string[];years:string[];onChange:(v:string)=>void}){
 const id=useId(),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null);
 const sorted=[...years].sort(),first=Number(sorted[0]??0),last=Number(sorted.at(-1)??0);
 const [open,setOpen]=useState(false),[year,setYear]=useState(last),[yearMode,setYearMode]=useState(false),[base,setBase]=useState(0);
 const [height,setHeight]=useState<number>();
 const label=value==='all'?'전체 기간':value.length===4?value+'년':formatMonth(value);
 const pageOf=(y:number)=>Math.floor(y/12)*12;
 const close=(restore:boolean)=>{setOpen(false);if(restore)trigger.current?.focus({preventScroll:true})};
 const show=()=>{const y=value==='all'||!years.includes(value.slice(0,4))?last:Number(value.slice(0,4));setYear(y);setBase(pageOf(y));setYearMode(false);setOpen(true)};
 const choose=(v:string)=>{onChange(v);close(true)};
 useLayoutEffect(()=>{
  if(!open)return;
  const fit=()=>{const p=panel.current;if(!p)return;const v=window.visualViewport;setHeight(Math.max(44,(v?.offsetTop??0)+(v?.height??window.innerHeight)-p.getBoundingClientRect().top-12))};
  fit();window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);
  return()=>{window.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('scroll',fit)};
 },[open]);
 useLayoutEffect(()=>{if(open)panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true})},[open,yearMode]);
 useEffect(()=>{
  if(!open)return;
  const outside=(e:PointerEvent)=>{const target=e.target as Node;if(!panel.current?.contains(target)&&!trigger.current?.contains(target))close(false)};
  const focus=(e:FocusEvent)=>{const target=e.target as Node;if(!panel.current?.contains(target)&&!trigger.current?.contains(target))close(false)};
  document.addEventListener('pointerdown',outside);document.addEventListener('focusin',focus);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',focus)};
 },[open]);
 const index=sorted.indexOf(String(year));
 const canPrev=yearMode?base>pageOf(first):index>0,canNext=yearMode?base<pageOf(last):index>=0&&index<sorted.length-1;
 const step=(delta:number)=>{if(yearMode)setBase(b=>b+delta*12);else setYear(Number(sorted[index+delta]??year));panel.current?.querySelector<HTMLButtonElement>('.ui-period-heading')?.focus({preventScroll:true})};
 const items=Array.from({length:12},(_,i)=>yearMode?base+i:i+1);
 return <div className="ui-period-picker">
  <button ref={trigger} type="button" className="ui-filter-text ui-period-trigger" data-active={value!=='all'} aria-label={'기간 선택: '+label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} disabled={!years.length} onClick={()=>open?close(true):show()} onKeyDown={e=>{if(e.key==='Escape'&&open){e.stopPropagation();e.preventDefault();close(true)}}}>
   <Icon name="calendar" size="inline"/><span>{label}</span><Icon name="chevron-down" size="inline"/>
  </button>
  {open&&<div ref={panel} id={id} role="dialog" aria-label="기간 선택" className="ui-period-popup" style={{maxHeight:height}} onKeyDown={e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return}
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
   const cells=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('.ui-period-cell')??[]),i=cells.indexOf(document.activeElement as HTMLButtonElement);
   if(i<0)return;e.preventDefault();const delta=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-3:3;
   for(let j=i+delta;j>=0&&j<cells.length;j+=delta){const cell=cells[j];if(cell&&!cell.disabled){cell.focus();break}}
  }}>
   <div className="ui-period-header"><IconButton icon="chevron-left" label={yearMode?'이전 연도 묶음':'이전 연도'} disabled={!canPrev} onClick={()=>step(-1)}/>
    <button type="button" className="ui-period-heading" aria-label={yearMode?'월 선택으로 돌아가기':'연도 선택으로 전환'} onClick={()=>{setBase(pageOf(year));setYearMode(v=>!v)}}>{yearMode?base+' – '+(base+11):year+'년'}<Icon name="chevron-down" size="inline"/></button>
    <IconButton icon="chevron-right" label={yearMode?'다음 연도 묶음':'다음 연도'} disabled={!canNext} onClick={()=>step(1)}/>
   </div>
   <div className="ui-period-grid" aria-label={yearMode?'연도 목록':'월 목록'}>
    {items.map(n=>{const v=yearMode?String(n):year+'-'+String(n).padStart(2,'0'),enabled=yearMode?years.includes(v):months.includes(v),selected=yearMode?n===year:v===value;
     return <button key={v} type="button" className="ui-period-cell" aria-label={yearMode?n+'년':formatMonth(v)} aria-pressed={selected} disabled={!enabled} onClick={()=>{if(yearMode){setYear(n);setYearMode(false)}else choose(v)}}>{yearMode?n:n+'월'}</button>
    })}
   </div>
   <div className="ui-period-actions">
    <button type="button" className="ui-period-cell" aria-pressed={value===String(year)} onClick={()=>choose(String(year))}>{year}년 전체</button>
    <button type="button" className="ui-period-cell" aria-pressed={value==='all'} onClick={()=>choose('all')}>전체 기간</button>
   </div>
  </div>}
 </div>;
}
