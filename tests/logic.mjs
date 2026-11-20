// Dependency-free checks for the prototype's date and data rules.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch {
  // CI/normal dev should use the locally installed devDependency. Container fallback is testing only.
  ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
}
const root=new URL('../src/',import.meta.url);
function load(file, injectedRequire=()=>{throw Error('unexpected require')}){
 let content=fs.readFileSync(new URL(file,root),'utf8').replaceAll('import.meta.env.VITE_DEMO_DATE','undefined');
 const js=ts.transpileModule(content,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(js,{module,exports:module.exports,require:injectedRequire,Date,Intl,Set,Math,Array,JSON,sessionStorage:{getItem:()=>null,setItem:()=>{}},console},{filename:file});
 return module.exports;
}
const dates=load('lib/date.ts');
const store=load('data/store.ts',name=>name==='../lib/date'?dates:undefined);
const at=(s)=>new Date(s);
assert.equal(dates.serviceDate(at('2027-01-01T01:00:00+09:00'),0),'2027-01-01','default midnight begins Jan 1');
assert.equal(dates.serviceDate(at('2027-01-01T01:00:00+09:00'),3),'2026-12-31','custom 03 boundary attributes to Dec 31');
assert.equal(dates.serviceDate(at('2027-01-01T03:00:00+09:00'),3),'2027-01-01','exact boundary starts new service day');
assert.equal(dates.todayAndYesterday(at('2027-01-01T01:00:00+09:00'),3).yesterday,'2026-12-30');
assert.equal(dates.monthOf('2026-12-31'),'2026-12');
const a={id:'a',entryDate:'2026-12-17',createdAt:'2026-12-17T12:00:00Z',body:'첫 번째 칭찬'};
const b={id:'b',entryDate:'2026-12-17',createdAt:'2026-12-17T18:00:00Z',body:'두 번째 칭찬'};
const c={id:'c',entryDate:'2026-12-18',createdAt:'2026-12-18T15:00:00Z',body:'세 번째 칭찬'};
assert.equal(store.writtenDays([a,b,c],'2026-12'),2,'same-day multiple entries count as one day');
assert.equal(store.monthEntries([a,b,c],'2026-12').length,3,'same-day entries remain separate records');
assert.equal(store.dateHasEntry([a,b],'2026-12-17'),true);
assert.equal(store.chooseDifferentEntry([a,b],'a').id,'b','rediscovery avoids immediate repeated entry');
assert.equal(store.chooseDifferentEntry([a],'a').id,'a','single candidate allowed');
console.log('PASS — 9 diary date, monthly distinct-day, and rediscovery assertions');
