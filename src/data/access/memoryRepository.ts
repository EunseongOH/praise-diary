import type { DiaryEntry, DiaryReflection, MonthId } from '../types.ts';
import { DiaryAccessError, makeEntryIndex } from './contract.ts';
import type { CursorPage, DiaryRepository, EntryDraft, EntryEdit, EntryRecord, PageRequest, PreferencesEdit, ReflectionRecord, UserPreferences } from './contract.ts';

/** TEST/REVIEW ONLY. This is not real authentication or a production persistence engine.
 * Shared fake DB partitions records by the test user's ID.
 */
type UserBucket = {
  entries: Map<string, EntryRecord>;
  reflections: Map<string, ReflectionRecord>;
  preferences: UserPreferences;
  seenArtwork: Set<string>;
};
function freshBucket(): UserBucket {
  return {
    entries: new Map(), reflections: new Map(), seenArtwork: new Set(),
    preferences: { boundaryHour: 0, reducedMotion: false, rediscoverUnlockedAt: null, postGoalCopyCounter: 0, revision: 1 },
  };
}
function clone<T>(value: T): T { return structuredClone(value); }
function compareEntries(a: EntryRecord, b: EntryRecord) {
  return b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}
function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T12:00:00Z')) ||
    new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date) {
    throw new DiaryAccessError('invalid', '유효하지 않은 기록 날짜입니다.');
  }
}
function assertText(text: string) {
  if (typeof text !== 'string' || !text.trim() || text.length > 12000) {
    throw new DiaryAccessError('invalid', '일기는 1자 이상 12,000자 이하로 작성해 주세요.');
  }
}
function assertId(id: string) {
  if (typeof id !== 'string' || !id || id.length > 128) throw new DiaryAccessError('invalid', '기록 ID가 올바르지 않습니다.');
}
function checkPreferences(value: UserPreferences) {
  if (!Number.isInteger(value.boundaryHour) || value.boundaryHour < 0 || value.boundaryHour > 4 ||
    !Number.isSafeInteger(value.postGoalCopyCounter) || value.postGoalCopyCounter < 0 ||
    typeof value.reducedMotion !== 'boolean') {
    throw new DiaryAccessError('invalid', '설정 값이 유효하지 않습니다.');
  }
}
/** Test-only adapter: all logic has the same public API regardless of future provider. */
class ScopedMemoryRepository implements DiaryRepository {
  constructor(private readonly bucket: UserBucket, private readonly now: () => string) {}

  async listMonth(month: MonthId) {
    return clone([...this.bucket.entries.values()].filter(e => e.entryDate.slice(0, 7) === month).sort(compareEntries));
  }
  async listArchivePage({ limit, cursor = null }: PageRequest): Promise<CursorPage<EntryRecord>> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new DiaryAccessError('invalid', '조회 범위가 유효하지 않습니다.');
    const sorted = [...this.bucket.entries.values()].sort(compareEntries);
    let start = 0;
    if (cursor !== null) {
      let key: [string, string, string];
      try {
        key = JSON.parse(decodeURIComponent(cursor)) as [string, string, string];
        if (!Array.isArray(key) || key.length !== 3 || key.some(v => typeof v !== 'string')) throw Error();
      } catch { throw new DiaryAccessError('invalid', '커서가 올바르지 않습니다.'); }
      start = sorted.findIndex(e => compareEntries(e, { entryDate: key[0], createdAt: key[1], id: key[2] } as EntryRecord) > 0);
      if (start < 0) start = sorted.length;
    }
    const page = sorted.slice(start, start + limit);
    const hasMore = start + limit < sorted.length && page.length > 0;
    const last = page.at(-1);
    return { items: clone(page), nextCursor: hasMore && last
      ? encodeURIComponent(JSON.stringify([last.entryDate, last.createdAt, last.id])) : null };
  }
  async listYearIndex(year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new DiaryAccessError('invalid', '연도가 유효하지 않습니다.');
    const prefix = String(year) + '-';
    return [...this.bucket.entries.values()].filter(e => e.entryDate.startsWith(prefix))
      .sort(compareEntries).map(e => makeEntryIndex(e,
        [...this.bucket.reflections.values()].filter(r => r.entryId === e.id).length));
  }
  async getEntry(id: string) { return clone(this.bucket.entries.get(id) ?? null); }
  async createEntry(draft: EntryDraft) {
    assertId(draft.id); assertDate(draft.entryDate); assertText(draft.body);
    if (this.bucket.entries.has(draft.id)) throw new DiaryAccessError('conflict', '이미 존재하는 일기입니다.');
    const result: EntryRecord = { ...clone(draft), updatedAt: this.now(), revision: 1 };
    this.bucket.entries.set(draft.id, result);
    return clone(result);
  }
  async updateEntry({ id, expectedRevision, body, title, referencePrompt }: EntryEdit) {
    const old = this.bucket.entries.get(id);
    if (!old) throw new DiaryAccessError('not_found', '일기를 찾을 수 없습니다.');
    if (old.revision !== expectedRevision) throw new DiaryAccessError('conflict', '다른 기기의 수정 사항이 있습니다.');
    assertText(body);
    const next: EntryRecord = { ...old, body, title, referencePrompt, updatedAt: this.now(), revision: old.revision + 1 };
    this.bucket.entries.set(id, next);
    return clone(next);
  }
  async deleteEntry(id: string, expectedRevision: number) {
    const old = this.bucket.entries.get(id);
    if (!old) return false;
    if (old.revision !== expectedRevision) throw new DiaryAccessError('conflict', '다른 기기의 수정 사항이 있습니다.');
    this.bucket.entries.delete(id);
    for (const [rid, reflection] of this.bucket.reflections) if (reflection.entryId === id) this.bucket.reflections.delete(rid);
    return true;
  }
  async listReflections(entryId: string) {
    if (!this.bucket.entries.has(entryId)) return [];
    return clone([...this.bucket.reflections.values()].filter(r => r.entryId === entryId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
  }
  async saveReflection(reflection: DiaryReflection, expectedRevision?: number) {
    assertId(reflection.id); assertText(reflection.body); assertDate(reflection.reflectionDate);
    if (!this.bucket.entries.has(reflection.entryId)) throw new DiaryAccessError('not_found', '연결할 일기를 찾을 수 없습니다.');
    const old = this.bucket.reflections.get(reflection.id);
    if (old && old.entryId !== reflection.entryId) throw new DiaryAccessError('conflict', '회고의 원문을 바꿀 수 없습니다.');
    if (old && expectedRevision !== old.revision) throw new DiaryAccessError('conflict', '다른 기기의 수정 사항이 있습니다.');
    if (!old && expectedRevision !== undefined) throw new DiaryAccessError('not_found', '회고를 찾을 수 없습니다.');
    const result: ReflectionRecord = { ...clone(reflection), revision: old ? old.revision + 1 : 1 };
    this.bucket.reflections.set(reflection.id, result);
    return clone(result);
  }
  async deleteReflection(entryId: string, reflectionId: string) {
    const old = this.bucket.reflections.get(reflectionId);
    if (!old || old.entryId !== entryId || !this.bucket.entries.has(entryId)) return false;
    this.bucket.reflections.delete(reflectionId); return true;
  }
  async getPreferences() { return clone(this.bucket.preferences); }
  async updatePreferences({ expectedRevision, patch }: PreferencesEdit) {
    const old = this.bucket.preferences;
    if (old.revision !== expectedRevision) throw new DiaryAccessError('conflict', '설정이 다른 기기에서 변경되었습니다.');
    const next = { ...old, ...clone(patch), revision: old.revision + 1 };
    checkPreferences(next); this.bucket.preferences = next;
    return clone(next);
  }
  async hasSeenArtwork(artworkKey: string) { return this.bucket.seenArtwork.has(artworkKey); }
  async markArtworkSeen(artworkKey: string) {
    if (!/^20\d\d-\d\d\/[\w-]+$/.test(artworkKey)) throw new DiaryAccessError('invalid', '작품 버전이 유효하지 않습니다.');
    this.bucket.seenArtwork.add(artworkKey);
  }
}
export class MemoryRepositoryTestDatabase {
  private readonly users = new Map<string, UserBucket>();
  constructor(private readonly now: () => string = () => new Date().toISOString()) {}
  /** The caller is a trusted test harness, NOT the browser's auth mechanism. */
  forTestUser(userId: string): DiaryRepository {
    assertId(userId);
    if (!this.users.has(userId)) this.users.set(userId, freshBucket());
    return new ScopedMemoryRepository(this.users.get(userId)!, this.now);
  }
}
