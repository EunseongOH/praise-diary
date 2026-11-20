import { useEffect, useState } from 'react';
import { AppBar, BottomNavigation, Button, Dialog, EmptyState, SegmentedChoice, SettingRow, TextAction, Toast, Toggle } from '../components/ui';
import type { MainTab } from '../components/ui';
import { DiaryList, MemorySlip, MonthTile } from '../components/content';
import { GraphicArtwork } from '../graphics/GraphicArtwork';
import { GestureArtwork } from '../components/GestureArtwork';
import { COPY, deleteImpact, savedMessage } from '../content/copy';
import { pickPrompts, type Prompt } from '../data/prompts';
import { loadState, saveState, writtenDays, dateHasEntry, monthEntries, chooseDifferentEntry } from '../data/store';
import { MONTH_THEMES, UPCOMING_MONTHS, themeFor } from '../data/themes';
import type { DiaryEntry, MonthId, PrototypeState } from '../data/types';
import { currentPreviewTime, formatDay, formatMonth, monthOf, todayAndYesterday } from '../lib/date';

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
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteAllStage, setDeleteAllStage] = useState<0 | 1 | 2 | 3>(0);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [drawnId, setDrawnId] = useState<string | null>(null);
  const [monthIdea, setMonthIdea] = useState('');
  const [writerDate, setWriterDate] = useState('');
  const [writerTitle, setWriterTitle] = useState('');
  const [writerBody, setWriterBody] = useState('');
  const [writerTitleOpen, setWriterTitleOpen] = useState(false);
  const [writerPrompts, setWriterPrompts] = useState<Prompt[]>(() => pickPrompts());
  const [promptVisible, setPromptVisible] = useState(true);
  const [promptSelected, setPromptSelected] = useState<string | null>(null);
  const [leaveWriting, setLeaveWriting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const { today, yesterday } = todayAndYesterday(nowForPreview, state.boundaryHour);
  const todayMonth = monthOf(today);
  const todayTheme = themeFor(todayMonth);
  const todayEntries = monthEntries(state.entries, todayMonth);
  const currentDays = writtenDays(state.entries, todayMonth);
  const currentCount = todayEntries.length;
  const isUnlocked = Boolean(state.letterDrawUnlockedAt);
  const currentEntry = page.entryId ? state.entries.find(e => e.id === page.entryId) : undefined;
  const currentMonth = page.month ?? todayMonth;
  const monthTheme = themeFor(currentMonth);
  const activeMainTab: MainTab = mainScreens.includes(page.screen) ? page.screen as MainTab : 'home';

  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => {
    document.body.classList.toggle('reduce-motion', state.reducedMotion);
    return () => document.body.classList.remove('reduce-motion');
  }, [state.reducedMotion]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3300);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const navigate = (next: Page) => {
    if (page.screen === 'write' && (writerBody.trim() || writerTitle.trim()) && !draftSaved) {
      setLeaveWriting(true); return;
    }
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
    if (page.screen === 'write' && writerBody.trim()) { setLeaveWriting(true); return; }
    setStack([]); setPage({ screen: tab }); window.scrollTo(0, 0);
  };
  const startWrite = (edit?: DiaryEntry) => {
    setWriterDate(edit?.entryDate ?? today);
    setWriterTitle(edit?.title ?? '');
    setWriterBody(edit?.body ?? '');
    setWriterTitleOpen(Boolean(edit?.title));
    setPromptVisible(!edit);
    setPromptSelected(null);
    setWriterPrompts(pickPrompts());
    setDraftSaved(false);
    navigate({ screen: 'write', editId: edit?.id });
  };
  const saveEntry = () => {
    if (!writerBody.trim()) return;
    if (page.editId) {
      setState(previous => ({ ...previous, entries: previous.entries.map(entry => entry.id === page.editId ? { ...entry, title: writerTitle.trim() || undefined, body: writerBody.trim() } : entry) }));
      setDraftSaved(true);
      setStack([]); setPage({ screen: 'detail', entryId: page.editId });
      setToast('수정한 내용을 저장했어요.'); return;
    }
    const month = monthOf(writerDate);
    const theme = themeFor(month);
    if (!theme) { setToast('해당 날짜에는 아직 기록할 수 없어요.'); return; }
    const beforeDays = writtenDays(state.entries, month);
    const next: DiaryEntry = { id: makeId(), createdAt: new Date().toISOString(), entryDate: writerDate, title: writerTitle.trim() || undefined, body: writerBody.trim() };
    const newCount = state.entries.length + 1;
    const unlockTime = !state.letterDrawUnlockedAt && newCount >= 10 ? new Date().toISOString() : state.letterDrawUnlockedAt;
    const afterDays = beforeDays + (dateHasEntry(state.entries, writerDate) ? 0 : 1);
    const mode = theme.targetDays && afterDays >= theme.targetDays && beforeDays < theme.targetDays ? 'complete' : afterDays > beforeDays ? 'growth' : 'addition';
    setState(previous => ({ ...previous, entries: [...previous.entries, next], letterDrawUnlockedAt: unlockTime }));
    setDraftSaved(true);
    setStack([]);
    setPage({ screen: 'saved', month, mode, previousWrittenDays: beforeDays, day: writerDate });
    if (unlockTime && !state.letterDrawUnlockedAt) setToast('이제 꺼내보기에서 예전의 칭찬을 만날 수 있어요.');
  };
  const deleteOne = () => {
    if (!confirmDelete) return;
    setState(previous => ({ ...previous, entries: previous.entries.filter(e => e.id !== confirmDelete) }));
    setConfirmDelete(null); setStack([]); setPage({ screen: 'list' });
    setToast('일기를 삭제했어요.');
  };
  const entryToDelete = confirmDelete ? state.entries.find(e => e.id === confirmDelete) : undefined;
  const lastOnDate = entryToDelete ? state.entries.filter(e => e.entryDate === entryToDelete.entryDate).length === 1 : false;
  const eligibleForRediscovery = state.entries; // Prototype: recently written eligible; minimum age is not yet agreed.
  const drawn = eligibleForRediscovery.find(e => e.id === drawnId);
  const selectNext = () => setDrawnId(chooseDifferentEntry(eligibleForRediscovery, drawnId)?.id ?? null);
  const openMonth = (month: MonthId) => navigate({ screen: month > todayMonth || !themeFor(month) ? 'locked-month' : 'month', month });
  const confirmLeave = () => {
    setLeaveWriting(false);
    setDraftSaved(true);
    setPage(stack.at(-1) ?? { screen: 'home' });
    setStack(previous => previous.slice(0, -1));
    window.scrollTo(0, 0);
  };
  const allMonths = Array.from(new Set([...MONTH_THEMES.map(m => m.month), ...UPCOMING_MONTHS])).sort().reverse();
  const saveIdeas = () => {
    if (!monthIdea.trim() || !page.month) return;
    setState(previous => ({ ...previous, ideas: [...previous.ideas, { id: makeId(), month: page.month!, text: monthIdea.trim(), createdAt: new Date().toISOString() }] }));
    setMonthIdea(''); setToast('시연용으로 의견을 보관했어요.'); back();
  };

  const pageTitle: Record<Screen, string> = {
    home: COPY.appName, rediscover: '꺼내보기', memory: '꺼내보기', collection: '도감',
    month: formatMonth(currentMonth), graphic: formatMonth(currentMonth), list: page.month ? `${formatMonth(page.month)}의 칭찬` : '내가 남긴 칭찬',
    detail: '칭찬일기', write: page.editId ? '칭찬 수정하기' : COPY.write.title, saved: '칭찬 남기기',
    settings: '설정', boundary: '하루가 바뀌는 시간', 'locked-month': formatMonth(currentMonth),
    idea: '그래픽 제안하기', records: '기록 관리', information: '서비스 정보',
  };
  const isTabPage = mainScreens.includes(page.screen);
  const showBack = !isTabPage;

  return <div className="app-shell">
    <AppBar title={pageTitle[page.screen]} onBack={showBack ? back : undefined}
      action={page.screen === 'home' ? '설정' : undefined}
      onAction={page.screen === 'home' ? () => navigate({ screen: 'settings' }) : undefined} />
    <main className={`app-content ${!isTabPage ? 'app-content--no-tabs' : ''}`} id="main-content">
      {page.screen === 'home' && <section className="home-page">
        <div className="page-intro"><span className="eyebrow">{formatMonth(todayMonth)}</span><h1 className="page-title">{todayTheme?.title ?? '오늘의 나에게, 칭찬 한마디.'}</h1><p className="description">내가 남긴 말들이 조금씩 모여요.</p></div>
        {todayTheme ? <section className="illustration-stage immersive-scene" aria-label="이번 달 그래픽">
          <div className="illustration-stage__top immersive-scene__top"><span className="illustration-stage__subtitle">{currentDays}일의 칭찬</span></div>
          <button type="button" className="illustration-stage__view immersive-scene__art" onClick={() => navigate({ screen: 'graphic', month: todayMonth })} aria-label="그래픽 크게 보기">
            <GraphicArtwork theme={todayTheme} writtenDays={currentDays} letterCount={currentCount} entries={todayEntries} letterSource={todayEntries.map(e => e.body).join(' ')} reducedMotion={state.reducedMotion} />
          </button>
          <div className="illustration-stage__footer immersive-scene__footer">그래픽을 누르면 크게 볼 수 있어요.</div>
        </section> : <div className="info-sheet"><p>새로운 그래픽을 준비하고 있어요.</p></div>}
        <div className="action-stack">
          <Button className="ui-button--full" disabled={!todayTheme} onClick={() => startWrite()}>{dateHasEntry(state.entries, today) ? COPY.home.anotherEntry : COPY.home.newEntry}</Button>
          <TextAction onClick={() => navigate({ screen: 'list' })}>{COPY.home.myEntries}</TextAction>
        </div>
      </section>}

      {page.screen === 'write' && <div className="space-stack">
        {!page.editId && <>
          <div className="page-intro"><h1 className="page-title">오늘의 나를 칭찬해 볼까요?</h1><p className="description">짧은 한마디도 괜찮아요.</p></div>
          <SegmentedChoice label="일기를 남길 날짜" value={writerDate} onChange={next => { setWriterDate(next); setToast(COPY.write.changeDay(formatDay(next))); }} options={[{ value: today, label: `오늘 · ${today.slice(5).replace('-', '.')}` }, { value: yesterday, label: `어제 · ${yesterday.slice(5).replace('-', '.')}` }]} />
          <p className="small-caption" aria-live="polite"><strong>{formatDay(writerDate)}</strong>의 일기로 기록돼요.</p>
          {promptVisible && <section className="prompt-section" aria-label="칭찬일기 질문">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}><h2 className="section-title">{COPY.write.promptHeading}</h2><TextAction onClick={() => { setWriterPrompts(pickPrompts(writerPrompts)); setPromptSelected(null); }}>{COPY.write.shuffle}</TextAction></div>
            {writerPrompts.map(p => { const content = writerDate === today ? p.today : p.yesterday; return <button key={p.category} type="button" className={`prompt-row ${promptSelected === p.category ? 'is-active' : ''}`} aria-pressed={promptSelected === p.category} onClick={() => setPromptSelected(previous => previous === p.category ? null : p.category)}>{content}</button>; })}
            <span className="small-caption">질문을 고르지 않고 바로 작성해도 괜찮아요.</span>
          </section>}
          {!promptVisible && <div><TextAction onClick={() => setPromptVisible(true)}>질문 다시 보기</TextAction></div>}
        </>}
        {page.editId && <div className="info-sheet"><p>{formatDay(writerDate)}에 남긴 칭찬을 수정해요. 기록 날짜는 그대로 유지돼요.</p></div>}
        <div className="form-group"><label className="form-label" htmlFor="diary-body">나에게 남길 칭찬</label>
          <textarea id="diary-body" className="form-textarea" placeholder={COPY.write.bodyHint} value={writerBody} onChange={event => { setWriterBody(event.target.value); if (event.target.value && !page.editId) setPromptVisible(false); }} />
        </div>
        {!writerTitleOpen ? <TextAction onClick={() => setWriterTitleOpen(true)}>{COPY.write.titleOptional}</TextAction> : <div className="form-group"><label className="form-label" htmlFor="diary-title">제목 (선택)</label><input id="diary-title" className="form-input" value={writerTitle} onChange={event => setWriterTitle(event.target.value)} placeholder="이 날을 기억할 제목" /></div>}
        <div className="write-footer"><Button className="ui-button--full" onClick={saveEntry} disabled={!writerBody.trim()}>{page.editId ? COPY.write.edit : COPY.write.save}</Button></div>
      </div>}

      {page.screen === 'saved' && <div className="space-stack immersive-detail">
        <div className="month-detail-title"><span className="eyebrow">{page.day && formatDay(page.day)}</span><h1 className="page-title">{savedMessage(monthTheme,page.mode ?? 'growth')}</h1></div>
        {monthTheme && <div className="illustration-stage"><GraphicArtwork theme={monthTheme} writtenDays={writtenDays(state.entries,currentMonth)} letterCount={monthEntries(state.entries,currentMonth).length} entries={monthEntries(state.entries,currentMonth)} letterSource={monthEntries(state.entries,currentMonth).map(e => e.body).join(' ')} reducedMotion={state.reducedMotion} fromWrittenDays={page.mode === 'growth' || page.mode === 'complete' ? page.previousWrittenDays : undefined} /></div>}
        <p className="description text-center">칭찬을 잘 남겼어요.</p>
        <div className="action-stack"><Button onClick={() => startWrite()}>칭찬 하나 더 남기기</Button><Button variant="secondary" onClick={() => { setStack([]); setPage({screen:'home'}); }}>홈으로 돌아가기</Button></div>
      </div>}

      {page.screen === 'rediscover' && <>
        {!isUnlocked ? <div className="locked-intro">
          <div className="letter-art" aria-hidden="true"><div className="letter-art__envelope" /></div>
          <p>{COPY.rediscover.locked}</p>
          <Button className="ui-button--full" onClick={() => startWrite()}>{COPY.rediscover.lockedCta}</Button>
        </div> : state.entries.length === 0 ? <EmptyState title={COPY.rediscover.empty} description="다시 일기를 남기면 언제든 꺼내볼 수 있어요." action={<Button onClick={() => startWrite()}>{COPY.rediscover.lockedCta}</Button>} /> : <div className="space-stack">
          <div className="memory-intro"><h1 className="page-title">{COPY.rediscover.prompt}</h1><p className="description">전에 썼던 나의 말이 기다리고 있어요.</p></div>
          <div className="letter-art" aria-hidden="true"><div className="letter-art__envelope" /></div>
          <Button className="ui-button--full" onClick={() => { selectNext(); navigate({ screen:'memory' }); }}>{COPY.rediscover.draw}</Button>
          <TextAction onClick={() => navigate({ screen:'list' })}>모든 칭찬 보기</TextAction>
        </div>}
      </>}

      {page.screen === 'memory' && <div className="space-stack">
        {drawn ? <MemorySlip entry={drawn} /> : <EmptyState title="꺼내볼 칭찬이 없어요." />}
        {eligibleForRediscovery.length > 1 && <Button className="ui-button--full" onClick={selectNext} variant="secondary">{COPY.rediscover.another}</Button>}
        {drawn && <TextAction onClick={() => navigate({ screen:'detail', entryId: drawn.id })}>일기 자세히 보기</TextAction>}
        <TextAction onClick={() => navigate({ screen:'list' })}>모든 칭찬 보기</TextAction>
      </div>}

      {page.screen === 'list' && <div className="space-stack"><div className="page-intro"><h1 className="page-title">{page.month ? `${formatMonth(page.month)}에 남긴 칭찬` : '내가 남긴 칭찬들'}</h1></div>
        <DiaryList entries={page.month ? monthEntries(state.entries,page.month) : state.entries} onOpen={entry => navigate({ screen:'detail', entryId:entry.id })} emptyContent={<EmptyState title="아직 남긴 칭찬이 없어요." description="오늘의 작은 칭찬부터 시작해 볼까요?" action={<Button onClick={() => startWrite()}>칭찬일기 남기러 가기</Button>} />} />
      </div>}
      {page.screen === 'detail' && currentEntry && <div className="space-stack">
        <MemorySlip entry={currentEntry} />
        <div className="action-stack"><Button onClick={() => startWrite(currentEntry)} variant="secondary">수정하기</Button><Button onClick={() => setConfirmDelete(currentEntry.id)} variant="quiet">일기 삭제하기</Button></div>
      </div>}

      {page.screen === 'collection' && <>
        <div className="page-intro"><h1 className="page-title">{COPY.collection.title}</h1><p className="description">{COPY.collection.subtitle}</p></div>
        <div className="month-tiles">{allMonths.map(month => <MonthTile key={month} month={month} theme={themeFor(month)} writtenDays={writtenDays(state.entries,month)} entries={monthEntries(state.entries,month).length} entriesData={monthEntries(state.entries,month)} letterSource={monthEntries(state.entries,month).map(e => e.body).join(' ')} reducedMotion={state.reducedMotion} locked={month > todayMonth || !themeFor(month)} onClick={() => openMonth(month)} />)}</div>
      </>}
      {page.screen === 'month' && <div className="space-stack immersive-detail"><div className="month-detail-title"><h1 className="page-title">{monthTheme?.title ?? formatMonth(currentMonth)}</h1><span className="small-caption">{writtenDays(state.entries,currentMonth)}일의 칭찬</span></div>
        {monthTheme && <div className="illustration-stage"><button className="illustration-stage__view" aria-label="그래픽 크게 보기" onClick={() => navigate({ screen:'graphic', month:currentMonth })}><GraphicArtwork theme={monthTheme} writtenDays={writtenDays(state.entries,currentMonth)} letterCount={monthEntries(state.entries,currentMonth).length} entries={monthEntries(state.entries,currentMonth)} letterSource={monthEntries(state.entries,currentMonth).map(e => e.body).join(' ')} reducedMotion={state.reducedMotion}/></button></div>}
        <Button className="ui-button--full" variant="secondary" onClick={() => navigate({screen:'list',month:currentMonth})}>{COPY.collection.monthEntries}</Button>
      </div>}
      {page.screen === 'graphic' && <div className="space-stack immersive-detail">
        <div className="month-detail-title"><h1 className="page-title">{monthTheme?.title ?? formatMonth(currentMonth)}</h1></div>
        {monthTheme && <div className="illustration-stage graphic-detail-art">
          <GestureArtwork key={currentMonth}>
            <GraphicArtwork theme={monthTheme} writtenDays={writtenDays(state.entries,currentMonth)} letterCount={monthEntries(state.entries,currentMonth).length} entries={monthEntries(state.entries,currentMonth)} letterSource={monthEntries(state.entries,currentMonth).map(e => e.body).join(' ')} reducedMotion={state.reducedMotion}/>
          </GestureArtwork>
          <p className="illustration-stage__footer">{writtenDays(state.entries,currentMonth)}일의 칭찬</p>
        </div>}
        <TextAction onClick={() => navigate({screen:'list',month:currentMonth})}>{COPY.collection.monthEntries}</TextAction>
      </div>}
      {page.screen === 'locked-month' && <div className="locked-intro"><div className="locked-shape" aria-hidden="true"><div className="locked-shape__bar" /></div><h1 className="page-title">{COPY.collection.locked}</h1><p>어떤 그래픽이 등장할지 기대해 주세요.</p><TextAction onClick={() => navigate({screen:'idea',month:currentMonth})}>{COPY.collection.suggest}</TextAction></div>}
      {page.screen === 'idea' && <div className="space-stack"><div className="page-intro"><h1 className="page-title">어떤 그래픽을 보고 싶나요?</h1><p className="description">떠오르는 모양이나 장면이 있다면 편하게 남겨 주세요.</p></div><div className="form-group"><label htmlFor="graphic-idea" className="form-label">그래픽 아이디어</label><textarea id="graphic-idea" className="form-textarea" placeholder="예: 봄에는 글자로 자라는 벚꽃나무가 있으면 좋겠어요." value={monthIdea} onChange={e => setMonthIdea(e.target.value)} /></div><Button disabled={!monthIdea.trim()} onClick={saveIdeas}>의견 남기기</Button><p className="small-caption">프로토타입에서는 의견이 운영자에게 전송되지 않고 이 브라우저 세션에만 저장돼요.</p></div>}

      {page.screen === 'settings' && <>
        <div className="setting-section"><h2>기록 설정</h2><SettingRow title={COPY.settings.boundary} detail={`${state.boundaryHour === 0 ? '자정' : `오전 ${state.boundaryHour}시`}`} onClick={() => navigate({screen:'boundary'})} /></div>
        <div className="setting-section"><h2>그래픽</h2><Toggle label={COPY.settings.reduceMotion} checked={state.reducedMotion} onChange={checked => setState(previous => ({...previous,reducedMotion:checked}))} /></div>
        <div className="setting-section"><h2>알림</h2><div className="setting-row" style={{cursor:'default'}}><span>{COPY.settings.notification}</span><span className="setting-row__value">{COPY.settings.notificationNotReady}</span></div><p className="small-caption">알림 기능은 앱인토스 정책 확인과 승인 이후 제공할 예정이에요.</p></div>
        <div className="setting-section"><h2>내 기록</h2><SettingRow title="기록 관리" onClick={() => navigate({screen:'records'})} /></div>
        <div className="setting-section"><h2>서비스 정보</h2><SettingRow title="이용 안내 및 문의" onClick={() => navigate({screen:'information'})} /></div>
      </>}
      {page.screen === 'boundary' && <div className="space-stack"><div className="page-intro"><h1 className="page-title">하루를 언제 마무리할까요?</h1><p className="description">{COPY.settings.boundaryHelp}</p></div>
        <div className="radio-list">{[0,1,2,3,4].map(hour => <label className="radio-row" key={hour}><input type="radio" name="boundary" checked={state.boundaryHour===hour} onChange={() => {setState(previous => ({...previous,boundaryHour:hour}));setToast('하루가 바뀌는 시간을 변경했어요.');}} />{hour===0?'오전 12:00 (기본)':`오전 ${hour}:00`}</label>)}</div>
        <p className="small-caption">{COPY.settings.boundarySaved}</p>
      </div>}
      {page.screen === 'records' && <div className="space-stack"><div className="page-intro"><h1 className="page-title">기록 관리</h1><p className="description">기록 삭제는 되돌릴 수 없으니 신중하게 선택해 주세요.</p></div>
        <div className="info-sheet"><p>저장된 칭찬일기 {state.entries.length}개 · 꺼내보기 {isUnlocked ? '열림' : '잠김'}</p></div>
        <Button className="ui-button--full" variant="secondary" disabled={state.entries.length===0} onClick={() => {setDeleteAllStage(1);setDeletePhrase('');}}>모든 칭찬일기 삭제</Button>
        <p className="small-caption">모든 일기를 삭제해도 이미 열린 꺼내보기 기능은 계속 이용할 수 있어요.</p>
      </div>}
      {page.screen === 'information' && <div className="space-stack"><h1 className="page-title">칭찬일기 이용 안내</h1><p className="description">나에게 남기는 작은 칭찬이 월간 그래픽을 채워요.</p><p>새로 작성할 수 있는 날짜는 오늘과 어제예요. 하루가 바뀌는 시간은 설정에서 변경할 수 있어요.</p><p>꺼내보기는 일기가 10개 쌓이면 열리고, 그 뒤에는 삭제해도 다시 잠기지 않아요.</p><p className="small-caption">약관·개인정보처리방침·운영자 문의 경로는 실제 출시 전에 별도 제공해야 합니다. 시연 프로젝트이므로 임의 링크를 만들지 않았습니다.</p></div>}
    </main>
    {isTabPage && <BottomNavigation active={activeMainTab} onChange={toTab} />}
    {toast && <Toast message={toast} />}
    {confirmDelete && <Dialog title="이 일기를 삭제할까요?" description={`${deleteImpact(themeFor(monthOf(entryToDelete?.entryDate ?? today)),lastOnDate)} 삭제한 일기는 되돌릴 수 없어요.`} confirmLabel="삭제하기" danger onConfirm={deleteOne} onCancel={() => setConfirmDelete(null)} />}
    {leaveWriting && <Dialog title="작성을 그만할까요?" description="아직 저장하지 않은 내용이 사라질 수 있어요." confirmLabel="작성 그만하기" danger onConfirm={confirmLeave} onCancel={() => setLeaveWriting(false)} />}
    {deleteAllStage===1 && <Dialog title="모든 칭찬일기를 삭제할까요?" description={COPY.deletion.impact} confirmLabel="계속" danger onConfirm={() => setDeleteAllStage(2)} onCancel={() => setDeleteAllStage(0)} />}
    {deleteAllStage===2 && <Dialog title="삭제를 확인해 주세요" description={`정말 삭제하려면 '${COPY.deletion.typePhrase}'를 그대로 입력해 주세요.`} confirmLabel="다음" confirmDisabled={deletePhrase!==COPY.deletion.typePhrase} danger onConfirm={() => setDeleteAllStage(3)} onCancel={() => setDeleteAllStage(0)}><label className="form-label" htmlFor="delete-all-phrase">확인 문구</label><input id="delete-all-phrase" className="form-input" value={deletePhrase} onChange={event => setDeletePhrase(event.target.value)} /></Dialog>}
    {deleteAllStage===3 && <Dialog title={COPY.deletion.lastStep} description="모든 일기와 일기에서 만든 그래픽이 사라져요. 다시 되돌릴 수 없어요." confirmLabel="모두 삭제하기" danger onConfirm={() => {setState(previous => ({...previous,entries:[]}));setDeleteAllStage(0);setDeletePhrase('');setToast('모든 칭찬일기를 삭제했어요.');}} onCancel={() => setDeleteAllStage(0)} />}
  </div>;
}
