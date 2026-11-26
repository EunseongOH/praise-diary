// E archive contract: run with the existing dependency-free logic suite.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {ARCHIVE_PAGE_SIZE,selectArchive,groupArchive,archivePeriods,searchPreview} from '../src/data/archive.mjs';
const e=(id,entryDate,body,title,createdAt=entryDate+'T12:00:00Z')=>({id,entryDate,body,title,createdAt});
const entries=[e('a','2027-01-02','오늘도 잘했다','성장'),e('b','2026-12-31','작은   용기'),e('c','2026-12-31','한글 ABC'),e('d','2027-01-02','x'.repeat(160)+' 용기')];
assert.deepEqual(selectArchive([]),[]);
assert.deepEqual(selectArchive(entries,{query:'작은 용기'}).map(x=>x.id),['b']);
assert.deepEqual(selectArchive(entries,{query:'abc'}).map(x=>x.id),['c']);
assert.deepEqual(selectArchive(entries,{query:'성장'}).map(x=>x.id),['a']);
assert.deepEqual(selectArchive(entries,{scopeMonth:'2027-01',query:'용기'}).map(x=>x.id),['d']);
assert.deepEqual(selectArchive(entries,{day:'2026-12-31',query:'용기'}).map(x=>x.id),['b']);
assert.deepEqual(selectArchive(entries,{year:'2026',month:'2026-12',withReflection:true,counts:new Map([['c',2]])}).map(x=>x.id),['c']);
assert.deepEqual(selectArchive(entries,{query:'없음'}),[]);
assert.deepEqual(groupArchive(selectArchive(entries)).map(x=>x.month),['2027-01','2026-12']);
assert.deepEqual(archivePeriods(entries),{months:['2027-01','2026-12'],years:['2027','2026']});
assert.ok(searchPreview(entries[3].body,'용기').startsWith('…'));
assert.ok(searchPreview(entries[3].body,'용기').includes('용기'));
assert.equal(searchPreview('   여러\n 줄   ',''),'여러 줄');
assert.equal(entries[1].body,'작은   용기','does not mutate originals');
for(const count of [0,1,29,30,31,100,5000]){
 const records=Array.from({length:count},(_,i)=>e(String(i),'2027-01-02','기록 '+i));
 const start=performance.now(),result=selectArchive(records),elapsed=performance.now()-start;
 assert.equal(result.length,count);
 assert.equal(groupArchive(result.slice(0,ARCHIVE_PAGE_SIZE)).reduce((n,g)=>n+g.entries.length,0),Math.min(count,ARCHIVE_PAGE_SIZE));
 assert.equal(new Set(result.map(r=>r.id)).size,count);
 assert.equal(result.slice(0,2*ARCHIVE_PAGE_SIZE).length,Math.min(count,60));
 console.log('PASS archive',count,'records; selection',elapsed.toFixed(2),'ms');
}
console.log('PASS — E archive query, grouping, period and reflection filtering, preview and bounded pagination');
