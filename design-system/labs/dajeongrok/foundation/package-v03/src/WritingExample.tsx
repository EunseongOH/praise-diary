import { useState, useRef } from 'react';
import { AppHeader, Collapsible, IconButton, TextAction, TextInput, Textarea, RemovableField, Stack } from './interactions';
const pairs=[['오늘 작지만 끝까지 해낸 일이 있나요?','오늘 나를 위해 해준 일은 무엇인가요?'],['오늘 용기를 냈던 순간이 있었나요?','오늘의 나에게 고마운 점은 무엇인가요?'],['오늘 누군가에게 건넨 다정함이 있었나요?','힘든 상황에서도 내가 잘 해낸 일은 무엇인가요?']];
// Demo only: production uses the existing date policy and categorized random prompt pool.
export function WritingExample({onSave,onClose}:{onSave:(entry:{title:string;body:string})=>void;onClose:()=>void}){
 const [titleOn,setTitleOn]=useState(false),[title,setTitle]=useState(''),[body,setBody]=useState(''),[open,setOpen]=useState(false),[pair,setPair]=useState(0),[chosen,setChosen]=useState('');
 const bodyRef=useRef<HTMLTextAreaElement>(null);
 return <section className="dj-system dj-writing"><AppHeader start={<IconButton icon="close" label="작성 닫기" onClick={onClose}/>} title="오늘" end={<TextAction tone="strong" disabled={!body.trim()} onClick={()=>onSave({title:title.trim(),body:body.trim()})}>저장</TextAction>}/>
 {titleOn?<RemovableField label="제목 제거" onRemove={()=>{setTitle('');setTitleOn(false);bodyRef.current?.focus()}}><TextInput aria-label="제목 (선택)" autoFocus placeholder="제목" value={title} onChange={e=>setTitle(e.target.value)}/></RemovableField>:<div className="dj-title-add-slot"><TextAction icon="plus" tone="quiet" onClick={()=>setTitleOn(true)}>제목 추가</TextAction></div>}
 {chosen&&<div className="dj-selected"><span>{chosen}</span><IconButton icon="close" size="inline" tone="quiet" label="참고 질문 지우기" onClick={()=>{setChosen('');bodyRef.current?.focus()}}/></div>}
 <Textarea ref={bodyRef} rows={9} aria-label="칭찬 본문" placeholder="오늘의 나에게 남기고 싶은 말을 적어보세요." value={body} onChange={e=>setBody(e.target.value)}/>
 <Collapsible label="어떤 칭찬을 남길지 고민되나요?" prefix="message" open={open} onOpenChange={setOpen}><Stack gap="inline">{pairs[pair].map(q=><button key={q} type="button" className="dj-action dj-question" onClick={()=>{setChosen(q);setOpen(false);bodyRef.current?.focus()}}>{q}</button>)}<TextAction icon="refresh" onClick={()=>setPair(v=>(v+1)%pairs.length)}>다른 질문 보기</TextAction></Stack></Collapsible></section>;
}
