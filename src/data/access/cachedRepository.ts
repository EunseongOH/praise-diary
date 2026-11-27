import type { DiaryRepository, EntryRecord, EntryDraft, EntryEdit, PageRequest, PreferencesEdit } from './contract.ts';
import type { DiaryReflection, MonthId } from '../types.ts';

/** Per authenticated session only. Never share between users, log out = clear().
 * Inflight deduplication avoids repeated home ↔ calendar ↔ collection reads.
 * Every successful write invalidates the affected month(s).
 */
export class CachedDiaryRepository implements DiaryRepository {
  private readonly months = new Map<MonthId, EntryRecord[]>();
  private readonly inFlight = new Map<MonthId, Promise<EntryRecord[]>>();
  private cacheEpoch = 0;
  private readonly source: DiaryRepository;
  constructor(source: DiaryRepository) { this.source = source; }
  async listMonth(month: MonthId): Promise<EntryRecord[]> {
    const cached = this.months.get(month);
    if (cached) return structuredClone(cached);
    let load = this.inFlight.get(month);
    if (!load) {
      const epoch = this.cacheEpoch;
      let next: Promise<EntryRecord[]>;
      next = this.source.listMonth(month).then(items => {
        // An older request may resolve AFTER a new save or account switch.
        // Never let that stale response repopulate the cache.
        if (epoch === this.cacheEpoch) this.months.set(month, structuredClone(items));
        return items;
      }).finally(() => { if (this.inFlight.get(month) === next) this.inFlight.delete(month); });
      load = next;
      this.inFlight.set(month, load);
    }
    return structuredClone(await load);
  }
  invalidateMonth(month: MonthId) {
    this.cacheEpoch++;
    this.months.delete(month); this.inFlight.delete(month);
  }
  clear() { this.cacheEpoch++; this.months.clear(); this.inFlight.clear(); }
  listArchivePage(q: PageRequest) { return this.source.listArchivePage(q); }
  listYearIndex(year: number) { return this.source.listYearIndex(year); }
  getEntry(id: string) { return this.source.getEntry(id); }
  async createEntry(draft: EntryDraft) {
    const saved = await this.source.createEntry(draft);
    this.invalidateMonth(saved.entryDate.slice(0, 7) as MonthId);
    return saved;
  }
  async updateEntry(edit: EntryEdit) {
    const saved = await this.source.updateEntry(edit);
    this.invalidateMonth(saved.entryDate.slice(0, 7) as MonthId);
    return saved;
  }
  async deleteEntry(id: string, expectedRevision: number) {
    const before = await this.source.getEntry(id);
    const ok = await this.source.deleteEntry(id, expectedRevision);
    if (ok && before) this.invalidateMonth(before.entryDate.slice(0, 7) as MonthId);
    return ok;
  }
  listReflections(entryId: string) { return this.source.listReflections(entryId); }
  saveReflection(r: DiaryReflection, expectedRevision?: number) { return this.source.saveReflection(r, expectedRevision); }
  deleteReflection(entryId: string, reflectionId: string) { return this.source.deleteReflection(entryId, reflectionId); }
  getPreferences() { return this.source.getPreferences(); }
  updatePreferences(edit: PreferencesEdit) { return this.source.updatePreferences(edit); }
  hasSeenArtwork(key: string) { return this.source.hasSeenArtwork(key); }
  markArtworkSeen(key: string) { return this.source.markArtworkSeen(key); }
}
