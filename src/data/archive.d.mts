import type { DiaryEntry } from './types';
export const ARCHIVE_PAGE_SIZE:number;
export function normalizeSearch(value:unknown):string;
export function searchKey(value:unknown):string;
export function selectArchive(entries:readonly DiaryEntry[], options?:{day?:string;scopeMonth?:string;year?:string;month?:string;query?:string;withReflection?:boolean;counts?:ReadonlyMap<string,number>}):DiaryEntry[];
export function groupArchive(entries:readonly DiaryEntry[]):{month:string;entries:DiaryEntry[]}[];
export function archivePeriods(entries:readonly DiaryEntry[]):{months:string[];years:string[]};
export function searchPreview(value:unknown,query:string,max?:number):string;
