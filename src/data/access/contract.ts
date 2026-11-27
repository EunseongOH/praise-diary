import type { DiaryEntry, DiaryReflection, MonthId } from '../types.ts';

/** Data contracts are Firebase/Supabase independent. All IDs are stable across migrations.
 * An authenticated adapter MUST derive ownership from verified auth, not from user input.
 */
export type EntryRecord = DiaryEntry & { updatedAt: string; revision: number };
export type ReflectionRecord = DiaryReflection & { revision: number };
export type EntryDraft = DiaryEntry;
export type EntryEdit = {
  id: string;
  expectedRevision: number;
  body: string;
  title?: string;
  referencePrompt?: string;
};
export type EntryIndex = {
  id: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  reflectionCount: number;
};
export type CursorPage<T> = { items: T[]; nextCursor: string | null };
export type PageRequest = { limit: number; cursor?: string | null };
export type UserPreferences = {
  boundaryHour: number;
  reducedMotion: boolean;
  rediscoverUnlockedAt: string | null;
  postGoalCopyCounter: number;
  revision: number;
};
export type PreferencesEdit = {
  expectedRevision: number;
  patch: Partial<Pick<UserPreferences, 'boundaryHour' | 'reducedMotion' | 'rediscoverUnlockedAt' | 'postGoalCopyCounter'>>;
};

/** Frontends must not pass a userId/ownerId to any method.
 * Server and database authorization rules remain mandatory for real adapters.
 */
export interface DiaryRepository {
  listMonth(month: MonthId): Promise<EntryRecord[]>;
  listArchivePage(request: PageRequest): Promise<CursorPage<EntryRecord>>;
  listYearIndex(year: number): Promise<EntryIndex[]>;
  getEntry(id: string): Promise<EntryRecord | null>;
  createEntry(draft: EntryDraft): Promise<EntryRecord>;
  updateEntry(edit: EntryEdit): Promise<EntryRecord>;
  deleteEntry(id: string, expectedRevision: number): Promise<boolean>;
  listReflections(entryId: string): Promise<ReflectionRecord[]>;
  saveReflection(reflection: DiaryReflection, expectedRevision?: number): Promise<ReflectionRecord>;
  deleteReflection(entryId: string, reflectionId: string): Promise<boolean>;
  getPreferences(): Promise<UserPreferences>;
  updatePreferences(edit: PreferencesEdit): Promise<UserPreferences>;
  hasSeenArtwork(artworkKey: string): Promise<boolean>;
  markArtworkSeen(artworkKey: string): Promise<void>;
}

export class DiaryAccessError extends Error {
  readonly code: 'invalid' | 'conflict' | 'not_found' | 'unauthorized';
  constructor(code: 'invalid' | 'conflict' | 'not_found' | 'unauthorized', message: string) {
    super(message);
    this.code = code;
    this.name = 'DiaryAccessError';
  }
}

/** No private details in the year index. Metadata only, never body or title. */
export function makeEntryIndex(entry: EntryRecord, reflectionCount: number): EntryIndex {
  const { id, entryDate, createdAt, updatedAt, revision } = entry;
  return { id, entryDate, createdAt, updatedAt, revision, reflectionCount };
}
