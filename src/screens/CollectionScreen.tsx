import { MonthTile, MonthVisual, type MonthVisualState } from '../components/content';
import { Button, Stack, TextAction, Textarea } from '../components/ui';
import { ArtworkSlot, snowflakeActive } from '../graphics/ArtworkSlot';
import { GestureArtwork } from '../components/GestureArtwork';
import { collectionGroups, themeFor } from '../data/themes';
import { monthEntries, writtenDays } from '../data/store';
import type { DiaryEntry, MonthId } from '../data/types';
import { formatMonth, monthOf } from '../lib/date';
import { COPY } from '../content/copy';

export function CollectionScreen({months,current,entries,reducedMotion,onOpen}:{
 months:MonthId[];current:MonthId;entries:DiaryEntry[];reducedMotion:boolean;onOpen:(m:MonthId)=>void;
}){
 const recorded=new Set(entries.map(e=>monthOf(e.entryDate)));
 const {archived,upcoming}=collectionGroups(months,current,recorded,'B');
 const tile=(month:MonthId)=>{const records=monthEntries(entries,month);return <MonthTile key={month} month={month} theme={themeFor(month)} writtenDays={writtenDays(entries,month)} entries={records.length} entriesData={records} letterSource={records.map(e=>e.body).join(' ')} reducedMotion={reducedMotion} locked={month>current} onClick={()=>onOpen(month)}/>};
 return <section className="collection-screen" data-layout="B">
  <div className="month-tiles" aria-label="나의 월별 작품">{archived.map(tile)}{upcoming.map(tile)}</div>
 </section>;
}
/** Shared C-02 / graphic route. The real renderer and gesture viewer are connected later. */
export function MonthlyGraphicDetail({month,entries,reducedMotion,onList}:{
 month:MonthId;entries:DiaryEntry[];reducedMotion:boolean;onList:()=>void;
}){
 const theme=themeFor(month),records=monthEntries(entries,month),days=writtenDays(entries,month);
 const state:MonthVisualState=!theme?'preparing':days===0?'empty':'recorded';
 return <section className="collection-detail">
  <div className="collection-detail-heading">
   {theme&&<h2 className="collection-artwork-title">{theme.title}</h2>}
   <p className="collection-meta">{days===0?'아직 남긴 칭찬이 없어요':days+'일의 칭찬'}</p>
  </div>
  <div className="collection-detail-stage"><MonthVisual state={state}>
   {snowflakeActive(theme)&&days>0
    ? <GestureArtwork><ArtworkSlot theme={theme} writtenDays={days} letterCount={records.length} entries={records} reducedMotion={reducedMotion} variant="detail"/></GestureArtwork>
    : <ArtworkSlot theme={theme} writtenDays={days} letterCount={records.length} entries={records} letterSource={records.map(e=>e.body).join(' ')} reducedMotion={reducedMotion}/>}
  </MonthVisual></div>
  <Button className="ui-button--full" onClick={onList}>{COPY.collection.monthEntries}</Button>
 </section>;
}
export function LockedMonthDetail({onIdea}:{onIdea:()=>void}){
 return <section className="collection-locked"><MonthVisual state="locked"/><Stack gap="component"><h2>{COPY.collection.locked}</h2><p>어떤 그래픽이 등장할지 기대해 주세요.</p></Stack><TextAction onClick={onIdea}>{COPY.collection.suggest}</TextAction></section>;
}
export function GraphicIdeaForm({month,value,onChange,onSave}:{month:MonthId;value:string;onChange:(s:string)=>void;onSave:()=>void}){
 return <section className="collection-idea"><Stack gap="section"><Stack gap="controls"><h2>어떤 그래픽을 보고 싶나요?</h2><p>{formatMonth(month)}에 만나고 싶은 모양이나 장면을 남겨 주세요.</p></Stack><Stack gap="field-actions"><Textarea id="graphic-idea" aria-label="그래픽 아이디어" variant="outline" placeholder="예: 글자로 자라는 벚꽃나무" value={value} onChange={e=>onChange(e.target.value)}/><Button className="ui-button--full" disabled={!value.trim()} onClick={onSave}>의견 남기기</Button><p className="collection-idea-note">검수판에서는 의견이 이 브라우저 세션에만 저장돼요.</p></Stack></Stack></section>;
}
