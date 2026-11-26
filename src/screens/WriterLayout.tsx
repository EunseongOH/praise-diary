import {CompactSelect, Stack, TextAction, RemovableField, TextInput, Textarea, IconButton, Collapsible, Button} from '../components/ui';
import type {Prompt} from '../data/prompts';
import {formatDay} from '../lib/date';
import {COPY} from '../content/copy';
export function WriterDate({date,today,yesterday,onChange}:{date:string;today:string;yesterday:string;onChange:(value:string)=>void}){
 const options=[{value:today,label:'오늘 · '+today.slice(5).replace('-','.')},{value:yesterday,label:'어제 · '+yesterday.slice(5).replace('-','.')}];
 // Keep the selected date if a draft crosses the configured daily boundary.
 if(date&&!options.some(o=>o.value===date))options.push({value:date,label:formatDay(date)});
 return <CompactSelect label="일기를 남길 날짜" value={date} options={options} onChange={onChange}/>;
}
type Props={editing:boolean;date:string;today:string;yesterday:string;onDate:(v:string)=>void;
 title:string;titleOpen:boolean;onTitle:(v:string)=>void;onTitleOpen:(v:boolean)=>void;body:string;onBody:(v:string)=>void;
 prompts:Prompt[];promptOpen:boolean;onPromptOpen:(v:boolean)=>void;selected:string|null;onSelect:(v:string|null)=>void;onSave:()=>void;
};
export function WriterLayout(p:Props){
 const dateControl=<WriterDate date={p.date} today={p.today} yesterday={p.yesterday} onChange={p.onDate}/>;
 const titleAction=!p.titleOpen&&<TextAction density="toolbar" icon="plus" onClick={()=>p.onTitleOpen(true)}>제목 추가</TextAction>;
 const showTop=!p.editing;
 return <section className="writer-layout" data-variant="A">
  <Stack>
    {(showTop||titleAction||p.editing)&&<div className="writer-meta-row">
      {showTop&&dateControl}
      {p.editing&&<time className="writer-date-static" dateTime={p.date}>{formatDay(p.date)}</time>}
      {titleAction}
    </div>}
    {p.titleOpen&&<RemovableField label="제목 제거" onRemove={()=>{p.onTitle('');p.onTitleOpen(false)}}><TextInput aria-label="제목 (선택)" value={p.title} onChange={e=>p.onTitle(e.target.value)} placeholder="제목 (선택)"/></RemovableField>}
    {p.selected&&<div className="writer-selected-prompt"><span className="small-caption">{p.prompts.find(x=>x.category===p.selected)?.[p.date===p.yesterday?'yesterday':'today']}</span><IconButton icon="close" label="선택한 질문 제거" onClick={()=>p.onSelect(null)}/></div>}
    <Textarea aria-label="나에게 남길 칭찬" placeholder={COPY.write.bodyHint} value={p.body} onChange={e=>p.onBody(e.target.value)}/>
    {!p.editing&&<Collapsible label="어떤 칭찬을 남길지 고민되나요?" open={p.promptOpen} onOpenChange={p.onPromptOpen}>
      <Stack gap="controls">{p.prompts.map(x=><Button className="ui-prompt-option" key={x.category} variant="secondary" size="compact" onClick={()=>{p.onSelect(x.category);p.onPromptOpen(false)}}>{p.date===p.yesterday?x.yesterday:x.today}</Button>)}</Stack>
    </Collapsible>}
    <Button className="ui-button--full" onClick={p.onSave} disabled={!p.body.trim()}>{p.editing?COPY.write.edit:COPY.write.save}</Button>
  </Stack>
 </section>;
}
