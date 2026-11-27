import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryRepositoryTestDatabase } from '../src/data/access/memoryRepository.ts';
import { CachedDiaryRepository } from '../src/data/access/cachedRepository.ts';
import { fromFirestoreDocument, fromPostgresRow, toFirestoreDocument, toPostgresRow } from '../src/data/access/providerCodecs.ts';
import type { EntryRecord } from '../src/data/access/contract.ts';

const db = () => new MemoryRepositoryTestDatabase(() => '2026-12-25T12:34:56.000Z');
function draft(id: string, date: string, body = '오늘도 내 마음을 잘 돌보았다.') {
  return { id, entryDate: date, body, createdAt: date + 'T11:00:00+09:00' };
}
test('records are scoped by verified test identity: A cannot read B or delete B', async () => {
  const store = db(), a = store.forTestUser('A'), b = store.forTestUser('B');
  await a.createEntry(draft('private', '2026-12-01'));
  assert.equal((await a.listMonth('2026-12')).length, 1);
  assert.equal((await b.listMonth('2026-12')).length, 0);
  assert.equal(await b.getEntry('private'), null);
  assert.equal(await b.deleteEntry('private', 1), false);
  assert.equal((await a.listYearIndex(2026)).length, 1);
});
test('multiple diaries on the same day keep distinct IDs and one date; metadata has no text', async () => {
  const store = db(), a = store.forTestUser('A');
  await a.createEntry(draft('one', '2026-12-02', '첫 번째'));
  await a.createEntry(draft('two', '2026-12-02', '두 번째'));
  const index = await a.listYearIndex(2026);
  assert.equal(index.length, 2);
  assert.equal(new Set(index.map(x => x.entryDate)).size, 1);
  assert.ok(index.every(x => !Object.hasOwn(x, 'body') && !Object.hasOwn(x, 'title')));
});
test('archive pagination is stable and does not repeat entries', async () => {
  const store = db(), a = store.forTestUser('A');
  for (const day of [1, 2, 3, 4, 5]) {
    await a.createEntry(draft('entry-' + day, '2026-12-' + String(day).padStart(2, '0')));
  }
  const first = await a.listArchivePage({ limit: 2 });
  const second = await a.listArchivePage({ limit: 2, cursor: first.nextCursor });
  const third = await a.listArchivePage({ limit: 2, cursor: second.nextCursor });
  assert.deepEqual([...first.items, ...second.items, ...third.items].map(x => x.id),
    ['entry-5', 'entry-4', 'entry-3', 'entry-2', 'entry-1']);
  assert.equal(third.nextCursor, null);
});
test('optimistic revision and delete cascade, no mutation of date on edit', async () => {
  const store = db(), a = store.forTestUser('A');
  const entry = await a.createEntry(draft('entry', '2026-12-03'));
  await assert.rejects(a.updateEntry({ id: 'entry', expectedRevision: 100, body: '수정' }), { code: 'conflict' });
  const changed = await a.updateEntry({ id: 'entry', expectedRevision: entry.revision, body: '수정', title: '칭찬' });
  assert.equal(changed.revision, 2);
  assert.equal(changed.entryDate, '2026-12-03');
  await a.saveReflection({ id: 'reflection', entryId: 'entry', body: '다시 보니 좋다', reflectionDate: '2026-12-03', createdAt: 't1', updatedAt: 't1' });
  assert.equal((await a.listYearIndex(2026))[0]?.reflectionCount, 1);
  await assert.rejects(a.deleteEntry('entry', 1), { code: 'conflict' });
  assert.equal(await a.deleteEntry('entry', 2), true);
  assert.equal((await a.listReflections('entry')).length, 0);
});
test('reflections cannot attach to a foreign diary, or be reassigned', async () => {
  const store = db(), a = store.forTestUser('A'), b = store.forTestUser('B');
  await a.createEntry(draft('a-only', '2026-12-03'));
  await assert.rejects(b.saveReflection({
    id: 'x', entryId: 'a-only', body: '침범', reflectionDate: '2026-12-04', createdAt: 't', updatedAt: 't'
  }), { code: 'not_found' });
  await a.saveReflection({ id: 'x', entryId: 'a-only', body: '내 기록', reflectionDate: '2026-12-04', createdAt: 't', updatedAt: 't' });
  await a.createEntry(draft('other', '2026-12-04'));
  await assert.rejects(a.saveReflection({
    id: 'x', entryId: 'other', body: '이동', reflectionDate: '2026-12-04', createdAt: 't', updatedAt: 't'
  }, 1), { code: 'conflict' });
});
test('per-user preferences, persistent rediscover unlock, artwork seen version', async () => {
  const store = db(), a = store.forTestUser('A'), b = store.forTestUser('B');
  const pref = await a.getPreferences();
  const next = await a.updatePreferences({ expectedRevision: pref.revision, patch: { boundaryHour: 3, rediscoverUnlockedAt: '2026-12-10' } });
  assert.equal(next.boundaryHour, 3);
  await assert.rejects(a.updatePreferences({ expectedRevision: 1, patch: { boundaryHour: 0 } }), { code: 'conflict' });
  assert.equal((await b.getPreferences()).boundaryHour, 0);
  await a.markArtworkSeen('2026-12/snowflake-v1');
  assert.equal(await a.hasSeenArtwork('2026-12/snowflake-v1'), true);
  assert.equal(await b.hasSeenArtwork('2026-12/snowflake-v1'), false);
});
test('cache de-duplicates reads, invalidates after successful write, can be cleared', async () => {
  const store = db(), base = store.forTestUser('A');
  const cached = new CachedDiaryRepository(base);
  await Promise.all([cached.listMonth('2026-12'), cached.listMonth('2026-12')]);
  assert.equal((await cached.listMonth('2026-12')).length, 0);
  await cached.createEntry(draft('new', '2026-12-04'));
  assert.equal((await cached.listMonth('2026-12')).length, 1);
  const edit = await cached.updateEntry({ id: 'new', expectedRevision: 1, body: '기록 변경' });
  assert.equal((await cached.listMonth('2026-12'))[0]?.body, '기록 변경');
  await cached.deleteEntry('new', edit.revision);
  assert.equal((await cached.listMonth('2026-12')).length, 0);
  cached.clear();
});
test('provider codecs are reversible and reject wrong ownership', () => {
  const record: EntryRecord = { ...draft('stable-id', '2026-12-05'), revision: 2, updatedAt: '2026-12-06T00:00:00Z',
    title: '내가 해낸 일', referencePrompt: '무엇이 좋았나' };
  const fire = toFirestoreDocument(record, 'firebase-uid-1');
  assert.deepEqual(fromFirestoreDocument(record.id, fire, 'firebase-uid-1'), record);
  assert.throws(() => fromFirestoreDocument(record.id, fire, 'firebase-uid-2'), { code: 'unauthorized' });
  const sql = toPostgresRow(record, 'app-user-1');
  assert.deepEqual(fromPostgresRow(sql, 'app-user-1'), record);
  assert.throws(() => fromPostgresRow(sql, 'app-user-2'), { code: 'unauthorized' });
});
