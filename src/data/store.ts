import type { DiaryEntry, DiaryReflection, MonthId, PrototypeState } from './types';
import { currentPreviewTime, monthOf, todayAndYesterday } from '../lib/date';
import { reviewEntries } from '../graphics/snowflake/reviewScenario';

const STORAGE_KEY = 'praise-diary:prototype:v1';

const samples: Array<[string, string, string]> = [
  ['2026-12-12', '오늘은 내가 먼저 해냈어', '조금 망설였지만 스스로 일을 시작했다. 작게 시작한 것도 잘한 일이다.'],
  ['2026-12-13', '오래 걸려도 괜찮았어', '생각보다 시간이 걸렸지만 중간에 포기하지 않았다.'],
  ['2026-12-14', '나를 돌본 하루', '충분히 쉬면서 마음이 어떤지 들여다봤다.'],
  ['2026-12-16', '먼저 건넨 말', '친구에게 먼저 안부를 물었다. 작은 다정함이 반가웠다.'],
  ['2026-12-17', '한 번 더 도전했어', '어려운 부분을 그냥 넘기지 않고 다시 시도했다.'],
  ['2026-12-17', '내 속도를 지켰어', '남들과 비교하지 않고 오늘 할 수 있는 만큼 했다.'],
  ['2026-12-18', '미뤄둔 일을 끝냈어', '계속 미뤄뒀던 일을 끝내고 나니 후련했다.'],
  ['2026-12-19', '충분한 하루', '평범한 하루였지만, 나에게 필요한 일을 해냈다.'],
];

export function sampleEntries(): DiaryEntry[] {
  return samples.map(([entryDate, title, body], index) => ({
    id: `sample-${index}`, entryDate, title, body,
    createdAt: `${entryDate}T14:00:00.000+09:00`,
  }));
}

export function initialState(): PrototypeState {
  return {
    // 가상 날짜 지정 시에만 가상 데이터로 시작. 일반 실행은 빈 기록 상태.
    entries: import.meta.env.VITE_DEMO_DATE ? sampleEntries() : [],
    reflections: [],
    letterDrawUnlockedAt: null,
    boundaryHour: 0,
    reducedMotion: false,
    ideas: [],
  };
}

/**
 * Restore the permanent rediscovery unlock for legacy imports and review fixtures.
 * Ten diary ENTRIES (not ten distinct dates) unlock the feature. Once unlocked,
 * later deletion never clears the saved timestamp.
 */
export function reconcileRediscoveryUnlock(state: PrototypeState): PrototypeState {
  if (state.letterDrawUnlockedAt || state.entries.length < 10) return state;
  const bySaveTime = [...state.entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const tenthSavedAt = bySaveTime[9]?.createdAt;
  return {
    ...state,
    letterDrawUnlockedAt: tenthSavedAt && !Number.isNaN(Date.parse(tenthSavedAt)) ? tenthSavedAt : new Date().toISOString(),
  };
}

export function loadState(): PrototypeState {
  // review builds only (snowflake flag): a fake-data scenario from the URL replaces the session state
  const review = reviewEntries(sampleEntries(), todayAndYesterday(currentPreviewTime(), 0).today);
  if (review) return reconcileRediscoveryUnlock({ ...initialState(), entries: review });
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const value = JSON.parse(saved) as Partial<PrototypeState>;
      if (Array.isArray(value.entries) && Array.isArray(value.ideas)) {
        return reconcileRediscoveryUnlock({
          entries: value.entries,
          reflections: Array.isArray(value.reflections) ? value.reflections.filter(r => r && typeof r.id === 'string' && typeof r.body === 'string' && typeof r.reflectionDate === 'string' && typeof r.createdAt === 'string' && typeof r.updatedAt === 'string' && value.entries?.some(e => e.id === r.entryId)) : [],
          letterDrawUnlockedAt: value.letterDrawUnlockedAt ?? null,
          boundaryHour: [0, 1, 2, 3, 4].includes(Number(value.boundaryHour)) ? Number(value.boundaryHour) : 0,
          reducedMotion: Boolean(value.reducedMotion),
          ideas: value.ideas,
        });
      }
    }
  } catch {
    // 시연 데이터 파손 시 조용히 복구. 실제 사용자 데이터 저장에는 사용할 수 없다.
  }
  return reconcileRediscoveryUnlock(initialState());
}

export function saveState(state: PrototypeState) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export function monthEntries(entries: DiaryEntry[], month: MonthId): DiaryEntry[] {
  return entries.filter((entry) => monthOf(entry.entryDate) === month);
}

export function writtenDays(entries: DiaryEntry[], month: MonthId): number {
  return new Set(monthEntries(entries, month).map((entry) => entry.entryDate)).size;
}

export function dateHasEntry(entries: DiaryEntry[], date: string): boolean {
  return entries.some((entry) => entry.entryDate === date);
}

export function chooseDifferentEntry(entries: DiaryEntry[], previousId: string | null): DiaryEntry | undefined {
  const pool = entries.length > 1 ? entries.filter((entry) => entry.id !== previousId) : entries;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Reflection mutations never change original-entry counts, dates or unlock history. */
export function reflectionsFor(state: PrototypeState, entryId: string): DiaryReflection[] {
  return state.reflections.filter(r=>r.entryId===entryId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
}
export function upsertReflection(state: PrototypeState, note: DiaryReflection): PrototypeState | null {
  if (!note.body.trim() || !state.entries.some(e=>e.id===note.entryId)) return null;
  const old=state.reflections.find(r=>r.id===note.id);
  if(old&&old.entryId!==note.entryId)return null;
  const saved=old?{...old,body:note.body,updatedAt:note.updatedAt}:note;
  return {...state,reflections:old?state.reflections.map(r=>r.id===note.id?saved:r):[...state.reflections,saved]};
}
export function removeReflection(state: PrototypeState, entryId: string, id: string): PrototypeState {
  return {...state,reflections:state.reflections.filter(r=>r.id!==id||r.entryId!==entryId)};
}
export function removeDiary(state: PrototypeState, entryId: string): PrototypeState {
  return {...state,entries:state.entries.filter(e=>e.id!==entryId),reflections:state.reflections.filter(r=>r.entryId!==entryId)};
}

/** Derived from live notes, never stored as a denormalized counter. */
export function reflectionCounts(reflections: DiaryReflection[]): Map<string,number> {
 const counts=new Map<string,number>();
 for(const note of reflections) counts.set(note.entryId,(counts.get(note.entryId)??0)+1);
 return counts;
}
