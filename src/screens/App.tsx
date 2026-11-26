import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppBar, BottomNavigation, Button, Dialog, EmptyState, SegmentedChoice, SettingRow, Stack, TextAction, TextInput, Toast, Toggle } from '../components/ui';
import type { MainTab } from '../components/ui';
import { DiaryList, type DiaryListVariant } from '../components/content';
import { DiaryContent } from '../components/DiaryContent';
import { JarArtwork } from '../components/JarArtwork';
import { stackCount } from '../graphics/rediscover-motion.mjs';
import { ArtworkSlot } from '../graphics/ArtworkSlot';
import { HomeShell, type HomeMode } from './HomeShell';
import { ArchiveScreen, type ArchiveSnapshot } from './ArchiveScreen';
import { WriterLayout } from './WriterLayout';
import { CollectionScreen, MonthlyGraphicDetail, LockedMonthDetail, GraphicIdeaForm } from './CollectionScreen';
import { COPY, deleteImpact, savedMessage } from '../content/copy';
import { pickPrompts, type Prompt } from '../data/prompts';
import { loadState, saveState, writtenDays, dateHasEntry, monthEntries, chooseDifferentEntry, reflectionsFor, upsertReflection, removeReflection, removeDiary, reflectionCounts } from '../data/store';
import { MONTH_THEMES, UPCOMING_MONTHS, themeFor } from '../data/themes';
import type { DiaryEntry, MonthId, PrototypeState } from '../data/types';
import { currentPreviewTime, formatDay, formatMonth, koreanClock, monthOf, todayAndYesterday } from '../lib/date';

type Screen = 'home' | 'rediscover' | 'memory' | 'collection' | 'month' | 'graphic' | 'list' | 'detail' | 'write' | 'saved' | 'settings' | 'boundary' | 'locked-month' | 'idea' | 'records' | 'information';
type Page = { screen: Screen; month?: MonthId; entryId?: string; editId?: string; mode?: 'growth' | 'addition' | 'complete'; previousWrittenDays?: number; day?: string; from?: Screen };
const mainScreens: Screen[] = ['home','rediscover','collection'];

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function App() {
  const [state, setState] = useState<PrototypeState>(loadState);
  const [nowForPreview, setNowForPreview] = useState(currentPreviewTime);
  useEffect(() => {
    if (import.meta.env.VITE_DEMO_DATE) return;
    const interval = window.setInterval(() => setNowForPreview(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const [page, setPage] = useState<Page>({ screen: 'home' });
  const [stack, setStack] = useState<Page[]>([]);
  const [homeMonth, setHomeMonth] = useState<MonthId | null>(null);
  const [homeMode, setHomeMode] = useState<HomeMode>('art');
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteAllStage, setDeleteAllStage] = useState<0 | 1 | 2 | 3>(0);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [drawnId, setDrawnId] = useState<string | null>(null);
  const [pendingDraw, setPendingDraw] = useState<{id:string;pick:number}|null>(null);
  const [monthIdea, setMonthIdea] = useState('');
  const [writerDate, setWriterDate] = useState('');
  const collectionReturn=useRef<{month:MonthId;scroll:number}|null>(null);
  const [listVariant,setListVariant]=useState<DiaryListVariant|'F'>('F');
  const archiveReturn=useRef<ArchiveSnapshot|null>(null);
  const reviewMode=Boolean((window as Window & {__DAJEONGROK_REVIEW__?:boolean}).__DAJEONGROK_REVIEW__);
  const [writerTitle, setWriterTitle] = useState('');
  const [writerBody, setWriterBody] = useState('');
  const [writerTitleOpen, setWriterTitleOpen] = useState(false);
  const [writerPrompts, setWriterPrompts] = useState<Prompt[]>(() => pickPrompts());
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptSelected, setPromptSelected] = useState<Prompt | null>(null);
  const [existingPrompt,setExistingPrompt]=useState<string|undefined>();
  const [leaveWriting, setLeaveWriting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const { today, yesterday } = todayAndYesterday(nowForPreview, state.boundaryHour);
  const todayMonth = monthOf(today);
  const selectedPromptText=promptSelected?.[writerDate===yesterday?'yesterday':'today'] ?? existingPrompt;
  const viewMonth = homeMonth ?? todayMonth;
  const isUnlocked = Boolean(state.letterDrawUnlockedAt);
  const currentEntry = page.entryId ? state.entries.find(e => e.id === page.entryId) : undefined;
  const currentMonth = page.month ?? todayMonth;
  const monthTheme = themeFor(currentMonth);
  const activeMainTab: MainTab = mainScreens.includes(page.screen) ? page.screen as MainTab : 'home';

  const persist = (next: PrototypeState) => {
    if (!saveState(next)) { setToast('저장하지 못했어요. 다시 시도해 주세요.'); return false; }
    setState(next); return true;
  };
  useEffect(() => {
    document.body.classList.toggle('reduce-motion', state.reducedMotion);
    return () => document.body.classList.remove('reduce-motion');
  }, [state.reducedMotion]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3300);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useLayoutEffect(()=>{
    if(page.screen!=='collection'||!collectionReturn.current)return;
    const saved=collectionReturn.current;collectionReturn.current=null;
    const tile=document.querySelector<HTMLButtonElement>(`.collection-screen .month-tile[data-month="${saved.month}"]`)??document.querySelector<HTMLButtonElement>('.collection-screen .month-tile');
    tile?.focus({preventScroll:true});window.scrollTo(0,saved.scroll);
  },[page.screen]);
  const navigate = (next: Page) => {
    if (page.screen === 'write' && (writerBody.trim() || writerTitle.trim()) && !draftSaved) {
      setLeaveWriting(true); return;
    }
    if(next.screen==='list')archiveReturn.current=null;
    setStack(previous => [...previous, page]);
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const back = () => {
    if (page.screen === 'write' && (writerBody.trim() || writerTitle.trim()) && !draftSaved) { setLeaveWriting(true); return; }
    setPage(stack.at(-1) ?? { screen: 'home' });
    setStack(previous => previous.slice(0, -1));
    window.scrollTo(0, 0);
  };
  const toTab = (tab: MainTab) => {
    setPendingDraw(null);
    collectionReturn.current=null;
    archiveReturn.current=null;
    if (page.screen === 'write' && writerBody.trim()) { setLeaveWriting(true); return; }
    setStack([]); setPage({ screen: tab }); window.scrollTo(0, 0);
  };
  const startWrite = (edit?: DiaryEntry) => {
    setWriterDate(edit?.entryDate ?? today);
    setWriterTitle(edit?.title ?? '');
    setWriterBody(edit?.body ?? '');
    setWriterTitleOpen(Boolean(edit?.title));
    setPromptVisible(false);
    setPromptSelected(null);
    setExistingPrompt(edit?.referencePrompt);
    setWriterPrompts(pickPrompts());
    setDraftSaved(false);
    navigate({ screen: 'write', editId: edit?.id });
  };
  const saveEntry = () => {
    if (!writerBody.trim()) return;
    if (page.editId) {
      if (!persist({ ...state, entries: state.entries.map(entry => entry.id === page.editId ? { ...entry, title: writerTitle.trim() || undefined, body: writerBody.trim(), referencePrompt: selectedPromptText } : entry) })) return;
      setDraftSaved(true);
      setPage(stack.at(-1) ?? { screen: 'detail', entryId: page.editId }); setStack(previous => previous.slice(0,-1));
      setToast('수정한 내용을 저장했어요.'); return;
    }
    const month = monthOf(writerDate);
    const theme = themeFor(month);
    // A diary can be saved independently of the monthly renderer/theme availability.
    const beforeDays = writtenDays(state.entries, month);
    const next: DiaryEntry = { id: makeId(), createdAt: new Date().toISOString(), entryDate: writerDate, title: writerTitle.trim() || undefined, body: writerBody.trim(), referencePrompt: selectedPromptText };
    const newCount = state.entries.length + 1;
    const unlockTime = !state.letterDrawUnlockedAt && newCount >= 10 ? new Date().toISOString() : state.letterDrawUnlockedAt;
    const afterDays = beforeDays + (dateHasEntry(state.entries, writerDate) ? 0 : 1);
    const mode = theme?.targetDays && afterDays >= theme.targetDays && beforeDays < theme.targetDays ? 'complete' : afterDays > beforeDays ? 'growth' : 'addition';
    if (!persist({ ...state, entries: [...state.entries, next], letterDrawUnlockedAt: unlockTime })) return;
    setDraftSaved(true);
    setStack([]);
    setPage({ screen: 'saved', month, mode, previousWrittenDays: beforeDays, day: writerDate });
    if (unlockTime && !state.letterDrawUnlockedAt) setToast('이제 꺼내보기에서 예전의 칭찬을 만날 수 있어요.');
  };
  const deleteOne = () => {
    if (!confirmDelete) return;
    if (!persist(removeDiary(state,confirmDelete))) return;
    setConfirmDelete(null); back();
    setToast('일기를 삭제했어요.');
  };
  const entryToDelete = confirmDelete ? state.entries.find(e => e.id === confirmDelete) : undefined;
  const lastOnDate = entryToDelete ? state.entries.filter(e => e.entryDate === entryToDelete.entryDate).length === 1 : false;
  const eligibleForRediscovery = state.entries; // Prototype: recently written eligible; minimum age is not yet agreed.
  const drawn = eligibleForRediscovery.find(e => e.id === drawnId);
  const completeDraw = (id:string) => {
    setPendingDraw(null);
    setDrawnId(id);
    navigate({screen:'memory'});
  };
  const startDraw = () => {
    if(pendingDraw||!isUnlocked)return;
    const entry=chooseDifferentEntry(eligibleForRediscovery,drawnId);
    if(!entry)return;
    if(state.reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches){completeDraw(entry.id);return}
    setPendingDraw({id:entry.id,pick:Math.floor(Math.random()*stackCount(state.entries.length))});
    window.scrollTo(0,0);
  };
  const openMonth = (month: MonthId) => {
    if(page.screen==='collection')collectionReturn.current={month,scroll:window.scrollY};
    navigate({ screen: month > todayMonth ? 'locked-month' : 'month', month });
  };
  const confirmLeave = () => {
    setLeaveWriting(false);
    setDraftSaved(true);
    setPage(stack.at(-1) ?? { screen: 'home' });
    setStack(previous => previous.slice(0, -1));
    window.scrollTo(0, 0);
  };
  const allMonths = Array.from(new Set([...MONTH_THEMES.map(m => m.month), ...UPCOMING_MONTHS, todayMonth, ...state.entries.map(e => monthOf(e.entryDate))])).sort().reverse();
  const homeMonths = [...new Set([...allMonths, viewMonth])].sort();
  const noteCounts=reflectionCounts(state.reflections);
  const saveIdeas = () => {
    if (!monthIdea.trim() || !page.month) return;
    if (!persist({ ...state, ideas: [...state.ideas, { id: makeId(), month: page.month!, text: monthIdea.trim(), createdAt: new Date().toISOString() }] })) return;
    setMonthIdea(''); setToast('시연용으로 의견을 보관했어요.'); back();
  };

  const pageTitle: Record<Screen, string> = {
    home: COPY.appName, rediscover: '꺼내보기', memory: '꺼내보기', collection: '도감',
    month: formatMonth(currentMonth), graphic: formatMonth(currentMonth), list: page.day ? `${formatDay(page.day)}의 칭찬` : page.month ? `${formatMonth(page.month)}의 칭찬` : '내가 남긴 칭찬',
    detail: '칭찬일기', write: page.editId ? '칭찬 수정하기' : COPY.write.title, saved: '칭찬 남기기',
    settings: '설정', boundary: '하루가 바뀌는 시간', 'locked-month': formatMonth(currentMonth),
    idea: '그래픽 제안하기', records: '기록 관리', information: '서비스 정보',
  };
  const isTabPage = mainScreens.includes(page.screen);
  const showBack = !isTabPage;
  const readerEntry = page.screen==='memory'?drawn:page.screen==='detail'?currentEntry:undefined;
  const isReader = page.screen==='memory'||page.screen==='detail';
  const saveReflection = (entryId:string, body:string, date:string, id?:string) => {
    const now=new Date().toISOString();
    const next=upsertReflection(state,{id:id??makeId(),entryId,body,reflectionDate:date,createdAt:now,updatedAt:now});
    return next?persist(next):false;
  };

  const pendingEntry = pendingDraw ? state.entries.find(e=>e.id===pendingDraw.id) : undefined;
  const isDrawing = page.screen==='rediscover'&&Boolean(pendingEntry);
  const renderReader=(entry:DiaryEntry,mode:'random'|'direct')=><DiaryContent key={entry.id} entry={entry} reflections={reflectionsFor(state,entry.id)} mode={mode} date={koreanClock(nowForPreview).date}
    onClose={back} onSave={(body,date,id)=>saveReflection(entry.id,body,date,id)} onDelete={id=>persist(removeReflection(state,entry.id,id))}
    onEditEntry={()=>startWrite(entry)} onDeleteEntry={()=>setConfirmDelete(entry.id)}/>;
  const isArchiveF=page.screen==='list'&&!page.day&&(!reviewMode||listVariant==='F');
  return <div className="app-shell" data-drawing={isDrawing}>
    {page.screen !== 'home' && !isReader && !isArchiveF && <AppBar title={pageTitle[page.screen]} onBack={showBack ? back : undefined}/>}
    <main className={`app-content ${!isTabPage ? 'app-content--no-tabs' : ''} ${page.screen === 'home' ? 'app-content--home-integrated' : ''} ${page.screen==='write'?'app-content--writer':''} ${isArchiveF?'app-content--archive-f':''}`} id="main-content">
      {page.screen === 'home' && <HomeShell month={viewMonth} months={homeMonths} mode={homeMode} today={today}
        theme={themeFor(viewMonth)} entries={monthEntries(state.entries, viewMonth)} reducedMotion={state.reducedMotion}
        onMonth={setHomeMonth} onMode={setHomeMode} onWrite={() => startWrite()} onSettings={() => navigate({screen:'settings'})}
        onDay={day => navigate({screen:'list', month:viewMonth, day})}
        onMonthEntries={() => navigate({screen:'list', month:viewMonth})}
        onAllEntries={() => navigate({screen:'list'})}
        onArt={() => navigate({screen:'graphic',month:viewMonth})}
        onIdea={() => navigate({screen:'idea',month:viewMonth})}/>}

      {page.screen === 'write' && <WriterLayout editing={Boolean(page.editId)} date={writerDate} today={today} yesterday={yesterday} onDate={setWriterDate}
        title={writerTitle} titleOpen={writerTitleOpen} onTitle={setWriterTitle} onTitleOpen={setWriterTitleOpen} body={writerBody} onBody={setWriterBody}
        prompts={writerPrompts} promptOpen={promptVisible} onPromptOpen={setPromptVisible} selectedText={selectedPromptText} onSelect={setPromptSelected} onClearPrompt={()=>{setPromptSelected(null);setExistingPrompt(undefined)}} onRefreshPrompts={()=>setWriterPrompts(previous=>pickPrompts(previous))} onSave={saveEntry}/>}

      {page.screen === 'saved' && <div className="space-stack immersive-detail">
        <div className="month-detail-title"><span className="eyebrow">{page.day && formatDay(page.day)}</span><h1 className="page-title">{savedMessage(monthTheme,page.mode ?? 'growth')}</h1></div>
        {<div className="illustration-stage"><ArtworkSlot theme={monthTheme} writtenDays={writtenDays(state.entries,currentMonth)} letterCount={monthEntries(state.entries,currentMonth).length} entries={monthEntries(state.entries,currentMonth)} letterSource={monthEntries(state.entries,currentMonth).map(e => e.body).join(' ')} reducedMotion={state.reducedMotion} fromWrittenDays={page.mode === 'growth' || page.mode === 'complete' ? page.previousWrittenDays : undefined} /></div>}
        <p className="description text-center">칭찬을 잘 남겼어요.</p>
        <div className="action-stack"><Button onClick={() => startWrite()}>칭찬 하나 더 남기기</Button><Button variant="secondary" onClick={() => { setStack([]); setPage({screen:'home'}); }}>홈으로 돌아가기</Button></div>
      </div>}

      {page.screen === 'rediscover' && <section className="rediscover-screen" data-locked={!isUnlocked} aria-busy={isDrawing}>
        <JarArtwork entryCount={state.entries.length} pick={isDrawing?pendingDraw!.pick:-1} reducedMotion={state.reducedMotion}
          onComplete={()=>{if(pendingEntry)completeDraw(pendingEntry.id)}}
          preview={pendingEntry?renderReader(pendingEntry,'random'):undefined}/>
        <div className="rediscover-copy">
          {!isUnlocked?<><p className="rediscover-lead">{COPY.rediscover.locked}</p><p className="description">10개의 칭찬이 모이면, 하나씩 꺼내볼 수 있어요.</p>{state.entries.length>0&&<p className="small-caption">지금까지 {state.entries.length}개의 칭찬이 쌓였어요.</p>}</>:state.entries.length===0?<><h1 className="section-title">{COPY.rediscover.empty}</h1><p className="description">다시 일기를 남기면 언제든 꺼내볼 수 있어요.</p></>:<p className="rediscover-lead">{COPY.rediscover.prompt}</p>}
        </div>
        <div className="rediscover-actions">
          {!isUnlocked||!state.entries.length?<Button className="ui-button--full" onClick={()=>startWrite()}>{COPY.rediscover.lockedCta}</Button>:<>
            <Button className="ui-button--full" disabled={isDrawing} onClick={startDraw}>{COPY.rediscover.draw}</Button>
            <TextAction disabled={isDrawing} onClick={()=>navigate({screen:'list'})}>모든 칭찬 보기</TextAction>
          </>}
        </div>
      </section>}

      {isReader && (readerEntry ? renderReader(readerEntry,page.screen==='memory'?'random':'direct') : <Stack><EmptyState title="기록이 없어요."/><Button onClick={back}>돌아가기</Button></Stack>)}

      {page.screen === 'list' && <Stack>
        {reviewMode&&<aside className="writer-review-panel" aria-label="검수용 기록 목록 비교"><Stack gap="controls"><p>검수용 · 기록 목록 비교</p><SegmentedChoice label="기록 목록 시안" value={listVariant} onChange={setListVariant} options={[{value:"A",label:"A 구분선"},{value:"B",label:"B 카드"},{value:"C",label:"C 날짜별"},{value:"F",label:"F 검색"}]}/></Stack></aside>}
        {isArchiveF?<ArchiveScreen key={page.month??'all'} entries={state.entries} reflectionCounts={noteCounts} scopeMonth={page.month} heading={pageTitle.list} onBack={back} initial={archiveReturn.current} onOpen={(entry,snapshot)=>{archiveReturn.current=snapshot;navigate({screen:'detail',entryId:entry.id})}} onWrite={()=>startWrite()}/>:<DiaryList variant={listVariant==='F'?'A':listVariant} reflectionCounts={noteCounts} entries={page.day ? state.entries.filter(e => e.entryDate === page.day) : page.month ? monthEntries(state.entries,page.month) : state.entries} onOpen={entry => navigate({ screen:'detail', entryId:entry.id })} emptyContent={<EmptyState title="아직 남긴 칭찬이 없어요." description="오늘의 작은 칭찬부터 시작해 볼까요?" action={<Button onClick={() => startWrite()}>칭찬일기 남기러 가기</Button>} />} />}
      </Stack>}
      {page.screen === 'collection' && <CollectionScreen months={allMonths} current={todayMonth} entries={state.entries} reducedMotion={state.reducedMotion} onOpen={openMonth}/>}
      {(page.screen === 'month'||page.screen === 'graphic') && <MonthlyGraphicDetail month={currentMonth} entries={state.entries} reducedMotion={state.reducedMotion} onList={()=>navigate({screen:'list',month:currentMonth})}/>}
      {page.screen === 'locked-month' && <LockedMonthDetail onIdea={()=>{setMonthIdea('');navigate({screen:'idea',month:currentMonth})}}/>}
      {page.screen === 'idea' && <GraphicIdeaForm month={currentMonth} value={monthIdea} onChange={setMonthIdea} onSave={saveIdeas}/>}

      {page.screen === 'settings' && <Stack gap="section">
        <div className="setting-section"><h2>기록 설정</h2><SettingRow title={COPY.settings.boundary} detail={`${state.boundaryHour === 0 ? '자정' : `오전 ${state.boundaryHour}시`}`} onClick={() => navigate({screen:'boundary'})} /></div>
        <div className="setting-section"><h2>그래픽</h2><Toggle label={COPY.settings.reduceMotion} checked={state.reducedMotion} onChange={checked => {persist({...state,reducedMotion:checked})}} /></div>
        <div className="setting-section"><h2>알림</h2><div className="setting-row" data-static="true"><span>{COPY.settings.notification}</span><span className="setting-row__value">{COPY.settings.notificationNotReady}</span></div><p className="small-caption">알림 기능은 앱인토스 정책 확인과 승인 이후 제공할 예정이에요.</p></div>
        <div className="setting-section"><h2>내 기록</h2><SettingRow title="기록 관리" onClick={() => navigate({screen:'records'})} /></div>
        <div className="setting-section"><h2>서비스 정보</h2><SettingRow title="이용 안내 및 문의" onClick={() => navigate({screen:'information'})} /></div>
      </Stack>}
      {page.screen === 'boundary' && <div className="space-stack"><div className="page-intro"><h1 className="page-title">하루를 언제 마무리할까요?</h1><p className="description">{COPY.settings.boundaryHelp}</p></div>
        <div className="radio-list" role="radiogroup" aria-label="하루가 바뀌는 시간">{[0,1,2,3,4].map(hour => <label className="radio-row" key={hour}><input type="radio" name="boundary" checked={state.boundaryHour===hour} onChange={() => {if(persist({...state,boundaryHour:hour}))setToast('하루가 바뀌는 시간을 변경했어요.');}} />{hour===0?'오전 12:00 (기본)':`오전 ${hour}:00`}</label>)}</div>
        <p className="small-caption">{COPY.settings.boundarySaved}</p>
      </div>}
      {page.screen === 'records' && <div className="space-stack"><p className="description">기록 삭제는 되돌릴 수 없으니 신중하게 선택해 주세요.</p>
        <div className="info-sheet"><p>저장된 칭찬일기 {state.entries.length}개 · 꺼내보기 {isUnlocked ? '열림' : '잠김'}</p></div>
        <Button className="ui-button--full" variant="secondary" disabled={state.entries.length===0} onClick={() => {setDeleteAllStage(1);setDeletePhrase('');}}>모든 칭찬일기 삭제</Button>
        <p className="small-caption">모든 일기를 삭제해도 이미 열린 꺼내보기 기능은 계속 이용할 수 있어요.</p>
      </div>}
      {page.screen === 'information' && <div className="space-stack"><h1 className="page-title">칭찬일기 이용 안내</h1><p className="description">나에게 남기는 작은 칭찬이 월간 그래픽을 채워요.</p><p>새로 작성할 수 있는 날짜는 오늘과 어제예요. 하루가 바뀌는 시간은 설정에서 변경할 수 있어요.</p><p>꺼내보기는 일기가 10개 쌓이면 열리고, 그 뒤에는 삭제해도 다시 잠기지 않아요.</p><p className="small-caption">약관·개인정보처리방침·운영자 문의 경로는 실제 출시 전에 별도 제공해야 합니다. 시연 프로젝트이므로 임의 링크를 만들지 않았습니다.</p></div>}
    </main>
    {isTabPage && <BottomNavigation active={activeMainTab} onChange={toTab} />}
    {toast && <Toast message={toast} />}
    {confirmDelete && <Dialog title="이 일기를 삭제할까요?" description={`${deleteImpact(themeFor(monthOf(entryToDelete?.entryDate ?? today)),lastOnDate)} 덧붙인 마음도 함께 삭제되며, 되돌릴 수 없어요.`} confirmLabel="삭제하기" danger onConfirm={deleteOne} onCancel={() => setConfirmDelete(null)} />}
    {leaveWriting && <Dialog title="작성을 그만할까요?" description="아직 저장하지 않은 내용이 사라질 수 있어요." confirmLabel="작성 그만하기" danger onConfirm={confirmLeave} onCancel={() => setLeaveWriting(false)} />}
    {deleteAllStage===1 && <Dialog title="모든 칭찬일기를 삭제할까요?" description={COPY.deletion.impact} confirmLabel="계속" danger onConfirm={() => setDeleteAllStage(2)} onCancel={() => setDeleteAllStage(0)} />}
    {deleteAllStage===2 && <Dialog title="삭제를 확인해 주세요" description={`정말 삭제하려면 '${COPY.deletion.typePhrase}'를 그대로 입력해 주세요.`} confirmLabel="다음" confirmDisabled={deletePhrase!==COPY.deletion.typePhrase} danger onConfirm={() => setDeleteAllStage(3)} onCancel={() => setDeleteAllStage(0)}><Stack gap="text"><label className="form-label" htmlFor="delete-all-phrase">확인 문구</label><TextInput id="delete-all-phrase" variant="outline" value={deletePhrase} onChange={event => setDeletePhrase(event.target.value)} /></Stack></Dialog>}
    {deleteAllStage===3 && <Dialog title={COPY.deletion.lastStep} description="모든 일기, 덧붙인 마음과 일기에서 만든 그래픽이 사라져요. 다시 되돌릴 수 없어요." confirmLabel="모두 삭제하기" danger onConfirm={() => {if(!persist({...state,entries:[],reflections:[]}))return;setDeleteAllStage(0);setDeletePhrase('');setToast('모든 칭찬일기를 삭제했어요.');}} onCancel={() => setDeleteAllStage(0)} />}
  </div>;
}
