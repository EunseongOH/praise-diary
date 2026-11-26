import { useEffect, useRef, useState } from 'react';
import type { DiaryEntry, DiaryReflection } from '../data/types';
import { formatDay } from '../lib/date';
import { ActionGroup, ActionMenu, Button, Dialog, IconButton, Stack, TextAction, Textarea } from './ui';

type Composer = { id?: string; body: string; initial: string; date: string };
type Props = {
  entry: DiaryEntry; reflections: DiaryReflection[]; mode: 'random' | 'direct'; date: string;
  onClose: () => void; onSave: (body: string, date: string, id?: string) => boolean;
  onDelete: (id: string) => boolean; onEditEntry?: () => void; onDeleteEntry?: () => void;
};

/** One reader for all entry points. A reflection is never part of the original body. */
export function DiaryContent({entry,reflections,mode,date,onClose,onSave,onDelete,onEditEntry,onDeleteEntry}:Props) {
  const [composer,setComposer]=useState<Composer|null>(null);
  const [discard,setDiscard]=useState<'cancel'|'close'|null>(null);
  const [deleteId,setDeleteId]=useState<string|null>(null);
  const [error,setError]=useState('');
  const area=useRef<HTMLTextAreaElement>(null);
  const add=useRef<HTMLDivElement>(null);
  const dirty=Boolean(composer&&composer.body!==composer.initial);
  const activeId=composer?.id;
  const activeDate=composer?.date;
  useEffect(()=>{if(activeDate)area.current?.focus({preventScroll:false})},[activeId,activeDate]);
  useEffect(()=>{
    if(!area.current||!composer)return;
    const el=area.current;el.style.height='auto';el.style.height=el.scrollHeight+'px';
  },[composer]);
  const finish=()=>{setComposer(null);setError('');requestAnimationFrame(()=>add.current?.querySelector('button')?.focus({preventScroll:true}))};
  const close=()=>{if(dirty)setDiscard('close');else onClose()};
  const cancel=()=>{if(dirty)setDiscard('cancel');else finish()};
  const start=(r?:DiaryReflection)=>{setError('');setComposer({id:r?.id,body:r?.body??'',initial:r?.body??'',date:r?.reflectionDate??date})};
  const save=()=>{if(!composer?.body.trim())return;if(onSave(composer.body,composer.date,composer.id))finish();else setError('저장하지 못했어요. 내용을 그대로 두었으니 다시 시도해 주세요.')};
  const editor=composer&&<section className="reflection-section">
    <span className="diary-paper-text diary-paper-date">{formatDay(composer.date)}</span>
    <Stack gap="field-actions">
      <Textarea ref={area} density="compact" aria-label="오늘의 마음" placeholder="다시 읽어보니 어떤 마음이 드나요?" value={composer.body} onChange={e=>setComposer(c=>c?{...c,body:e.target.value}:null)}/>
      {error&&<p role="alert" className="reflection-error">{error}</p>}
      <ActionGroup><TextAction onClick={cancel}>취소</TextAction><Button size="compact" disabled={!composer.body.trim()} onClick={save}>남기기</Button></ActionGroup>
    </Stack>
  </section>;
  return <section className="diary-reader">
    <header className="diary-reader-header">
      {mode==='direct'&&<IconButton icon="arrow-left" label="뒤로가기" onClick={close}/>}
      {mode==='direct'&&<span>칭찬일기</span>}
      {mode==='random'&&<IconButton icon="close" label="닫기" onClick={close}/>}
    </header>
    <article className="diary-paper" aria-label="일기 원문과 덧붙인 마음">
      <section className="diary-paper-text diary-original">
        <time className="diary-paper-date" dateTime={entry.entryDate}>{formatDay(entry.entryDate)}</time>
        {entry.title&&<h2>{entry.title}</h2>}
        <p>{entry.body}</p>
        {entry.referencePrompt&&<aside className="diary-reference-prompt" aria-label="글을 쓸 때 참고한 질문"><span>글을 쓸 때 참고한 질문</span><span>{entry.referencePrompt}</span></aside>}
      </section>
      {reflections.map(r=>composer?.id===r.id?<div key={r.id}>{editor}</div>:<section className="reflection-section" key={r.id}>
        <div className="diary-paper-text">
          <ActionMenu label="덧붙인 마음 관리" leading={<time className="diary-paper-date" dateTime={r.reflectionDate}>{formatDay(r.reflectionDate)}에 덧붙인 마음</time>}
            items={[{id:'edit',label:'수정하기',disabled:!!composer,onSelect:()=>start(r)},{id:'delete',label:'삭제하기',tone:'danger',disabled:!!composer,onSelect:()=>setDeleteId(r.id)}]}/>
          <p>{r.body}</p>
        </div>
      </section>)}
      {composer&&!composer.id&&editor}
    </article>
    {!composer&&<div ref={add} className="diary-add-action"><TextAction icon="plus" onClick={()=>start()}>오늘의 마음 덧붙이기</TextAction></div>}
    {!composer&&mode==='direct'&&onEditEntry&&onDeleteEntry&&<ActionGroup><TextAction onClick={onEditEntry}>일기 수정하기</TextAction><TextAction onClick={onDeleteEntry}>일기 삭제하기</TextAction></ActionGroup>}
    {discard&&<Dialog title="작성 중인 마음을 남기지 않고 나갈까요?" confirmLabel="남기지 않기" danger onCancel={()=>setDiscard(null)} onConfirm={()=>{const next=discard;setDiscard(null);if(next==='close')onClose();else finish()}}/>}
    {deleteId&&<Dialog title="덧붙인 마음을 삭제할까요?" description="원래의 일기는 그대로 남아요." confirmLabel="삭제하기" danger onCancel={()=>setDeleteId(null)} onConfirm={()=>{if(onDelete(deleteId))setDeleteId(null)}}/>}
  </section>;
}
