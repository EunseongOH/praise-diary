/**
 * Diary entries → snowflake engine input. Only the diary body is a glyph source (title, reference prompt and
 * reflections are never used). Same-day entries stay separate (density); stage = distinct entryDate count.
 * Nothing here is logged, stored or written into the DOM.
 */
import type { DiaryEntry } from '../../data/types';
import type { Entry } from './core/multiHelix/engine';

export const toEngine = (entries: readonly DiaryEntry[]): Entry[] =>
  entries.filter(e => e.body.trim() !== '').map(e => ({ id: e.id, entryDate: e.entryDate, createdAt: e.createdAt, body: e.body }));
export const distinctDays = (entries: readonly { entryDate: string }[]) => new Set(entries.map(e => e.entryDate)).size;
