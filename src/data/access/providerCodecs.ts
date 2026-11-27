import { DiaryAccessError } from './contract.ts';
import type { EntryRecord } from './contract.ts';

/** No Firebase/Supabase SDK in the app's core. These codecs preserve stable IDs
 * and document semantics. Provider-specific network calls belong in adapters.
 */
type JsonRow = Record<string, unknown>;
function stringField(value: unknown, name: string): string {
  if (typeof value !== 'string') throw new DiaryAccessError('invalid', '저장된 기록 필드가 유효하지 않습니다: ' + name);
  return value;
}
function revisionField(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new DiaryAccessError('invalid', '기록 버전이 유효하지 않습니다.');
  return value as number;
}
function optionalText(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : stringField(value, 'optional');
}
function stableRecord(
  id: string, entryDate: unknown, createdAt: unknown, updatedAt: unknown,
  revision: unknown, body: unknown, title: unknown, referencePrompt: unknown,
): EntryRecord {
  return {
    id, entryDate: stringField(entryDate, 'entryDate'),
    createdAt: stringField(createdAt, 'createdAt'), updatedAt: stringField(updatedAt, 'updatedAt'),
    revision: revisionField(revision), body: stringField(body, 'body'),
    title: optionalText(title), referencePrompt: optionalText(referencePrompt),
  };
}
function assertOwner(actual: unknown, expected: string) {
  if (actual !== expected) throw new DiaryAccessError('unauthorized', '이 기록에 접근할 수 없습니다.');
}

/** Firestore: users/{verifiedFirebaseUid}/entries/{entry.id}. Never accept
 * an arbitrary user-controlled collection path as an auth boundary.
 */
export function toFirestoreDocument(entry: EntryRecord, verifiedFirebaseUid: string): JsonRow {
  return {
    ownerId: verifiedFirebaseUid,
    entryDate: entry.entryDate,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    revision: entry.revision,
    body: entry.body,
    ...(entry.title !== undefined ? { title: entry.title } : {}),
    ...(entry.referencePrompt !== undefined ? { referencePrompt: entry.referencePrompt } : {}),
  };
}
export function fromFirestoreDocument(id: string, data: JsonRow, verifiedFirebaseUid: string): EntryRecord {
  assertOwner(data.ownerId, verifiedFirebaseUid);
  return stableRecord(id, data.entryDate, data.createdAt, data.updatedAt, data.revision,
    data.body, data.title, data.referencePrompt);
}

/** PostgreSQL: diar_entries.id is stable, owner_id is checked AGAIN by RLS
 * (provider codec equality is defense in depth, not a substitute for RLS).
 */
export function toPostgresRow(entry: EntryRecord, verifiedAppUserId: string): JsonRow {
  return {
    id: entry.id, owner_id: verifiedAppUserId, entry_date: entry.entryDate,
    created_at: entry.createdAt, updated_at: entry.updatedAt, revision: entry.revision,
    body: entry.body, title: entry.title ?? null, reference_prompt: entry.referencePrompt ?? null,
  };
}
export function fromPostgresRow(row: JsonRow, verifiedAppUserId: string): EntryRecord {
  assertOwner(row.owner_id, verifiedAppUserId);
  return stableRecord(stringField(row.id, 'id'), row.entry_date, row.created_at, row.updated_at,
    row.revision, row.body, row.title, row.reference_prompt);
}
