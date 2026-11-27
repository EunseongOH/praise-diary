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
const art=load('graphics/progress.ts');
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

// Shape reveal starts at the actual lower visible edge, not the SVG viewport.
for (const kind of ['snowflake', 'sheep']) {
  const empty = art.revealWindow(kind, 0, 15);
  const first = art.revealWindow(kind, 1, 15);
  const middle = art.revealWindow(kind, 7, 15);
  const full = art.revealWindow(kind, 15, 15);
  assert.equal(empty.height, 0, `${kind} empty shape has no active fill`);
  assert.ok(first.height > 0, `${kind} first diary day is visible`);
  assert.ok(first.top > middle.top && middle.top > full.top, `${kind} grows upwards`);
  assert.equal(full.ratio, 1, `${kind} fully completes only at target`);
  assert.equal(art.revealWindow(kind, 7, 15).top, middle.top, `${kind} same date additions don't change fill`);
  assert.ok(art.revealWindow(kind, 15, null).ratio < 1, `${kind} unconfirmed target cannot be displayed as completed`);
}
console.log('PASS — bottom-up silhouette growth assertions for both monthly themes');

const oldState={entries:[a,b],reflections:[],letterDrawUnlockedAt:'2026-12-18',boundaryHour:0,reducedMotion:false,ideas:[]};
const reflection={id:'r',entryId:'a',body:'다시 만난 마음',reflectionDate:'2026-12-20',createdAt:'2026-12-20T00:00:00Z',updatedAt:'2026-12-20T00:00:00Z'};
const withNote=store.upsertReflection(oldState,reflection);
assert.equal(withNote.entries.length,2);assert.equal(store.writtenDays(withNote.entries,'2026-12'),1);assert.equal(withNote.letterDrawUnlockedAt,oldState.letterDrawUnlockedAt);
assert.equal(store.reflectionsFor(withNote,'a').length,1);assert.equal(store.reflectionsFor(withNote,'b').length,0);
const edited=store.upsertReflection(withNote,{...reflection,body:'수정',reflectionDate:'2026-12-21',createdAt:'changed',updatedAt:'2026-12-21T00:00:00Z'});
assert.equal(edited.reflections[0].reflectionDate,reflection.reflectionDate);assert.equal(edited.reflections[0].createdAt,reflection.createdAt);assert.equal(edited.reflections[0].body,'수정');
assert.equal(store.upsertReflection(withNote,{...reflection,entryId:'b'}),null);
assert.equal(store.upsertReflection(withNote,{...reflection,body:'  '}),null);
assert.equal(store.removeReflection(withNote,'b','r').reflections.length,1);
assert.equal(store.removeReflection(withNote,'a','r').reflections.length,0);
assert.equal(store.removeDiary(withNote,'a').reflections.length,0);
assert.equal(store.removeDiary(withNote,'a').letterDrawUnlockedAt,oldState.letterDrawUnlockedAt);
console.log('PASS — reflection independence, edit date, ownership by entry ID, cascade');

// A restored/review history with 10+ entries must be permanently unlocked, even if
// the historical unlock timestamp was missing. Same-date entries count separately.
const unlockEntries=Array.from({length:10},(_,i)=>({ ...a, id:'unlock-'+i, createdAt:`2026-12-17T${String(i).padStart(2,'0')}:00:00Z` }));
const lockedAtNine=store.reconcileRediscoveryUnlock({...oldState,entries:unlockEntries.slice(0,9),letterDrawUnlockedAt:null});
assert.equal(lockedAtNine.letterDrawUnlockedAt,null,'9 diary entries stay locked');
const unlockedAtTen=store.reconcileRediscoveryUnlock({...oldState,entries:unlockEntries,letterDrawUnlockedAt:null});
assert.equal(unlockedAtTen.letterDrawUnlockedAt,unlockEntries[9].createdAt,'10 entries unlock, even on one date');
const afterDelete=store.removeDiary(unlockedAtTen,unlockEntries[9].id);
assert.equal(afterDelete.entries.length,9);
assert.equal(afterDelete.letterDrawUnlockedAt,unlockedAtTen.letterDrawUnlockedAt,'unlock remains after deletion');
const preservedUnlock=store.reconcileRediscoveryUnlock(afterDelete);
assert.equal(preservedUnlock.letterDrawUnlockedAt,unlockedAtTen.letterDrawUnlockedAt,'historical unlock stays stable');
console.log('PASS — rediscovery 9/10 entry threshold, legacy recovery, permanent unlock');


const baseCopy=load('content/copy.ts');
const copy=load('content/savedCopy.ts', name=>name==='./copy'?baseCopy:undefined);
const december={month:'2026-12',title:'겨울의 눈꽃',kind:'snowflake',targetDays:null};
assert.equal(copy.selectSavedCopy({theme:december,mode:'growth',beforeDays:0,afterDays:1,postGoalCounter:0}).text,'작은 눈꽃이 피어나기 시작했어요.');
assert.equal(copy.selectSavedCopy({theme:december,mode:'growth',beforeDays:13,afterDays:14,postGoalCounter:0}).text,'눈꽃이 어느새 이만큼 피어났어요.');
assert.equal(copy.selectSavedCopy({theme:december,mode:'growth',beforeDays:14,afterDays:15,postGoalCounter:0}).text,'남긴 칭찬이 눈꽃에 더해졌어요.','December unconfirmed target must not claim completion');
const confirmed={...december,targetDays:15};
assert.equal(copy.selectSavedCopy({theme:confirmed,mode:'complete',beforeDays:14,afterDays:15,postGoalCounter:0}).text,'차곡차곡 모은 다정함이 하나의 눈꽃이 되었어요.');
const sequence=Array.from({length:16},(_,i)=>copy.postGoalCaption(i));
assert.equal(new Set(sequence).size,16,'rotating copy uses all messages without repeat within one cycle');
assert.notEqual(copy.postGoalCaption(15),copy.postGoalCaption(16),'new cycle must not repeat last message');
const afterward=copy.selectSavedCopy({theme:confirmed,mode:'growth',beforeDays:15,afterDays:16,postGoalCounter:0});
assert.equal(afterward.text,sequence[0]);assert.equal(afterward.nextCounter,1,'increment only for post-goal save');
const sameDay=copy.selectSavedCopy({theme:confirmed,mode:'addition',beforeDays:16,afterDays:16,postGoalCounter:1});
assert.equal(sameDay.text,sequence[1]);assert.equal(sameDay.nextCounter,2);
const beforeGoalSameDay=copy.selectSavedCopy({theme:december,mode:'addition',beforeDays:5,afterDays:5,postGoalCounter:0});
assert.equal(beforeGoalSameDay.text,'눈꽃에 칭찬이 하나 더 쌓였어요.');assert.equal(beforeGoalSameDay.nextCounter,0);
console.log('PASS — distinct-day saved copy, confirmed completion, post-goal 16-copy no-repeat cycle');

const prompts=load('data/prompts.ts');const themes=load('data/themes.ts');
for(let i=0;i<50;i++){const pair=prompts.pickPrompts();assert.equal(pair.length,2);assert.notEqual(pair[0].category,pair[1].category);const next=prompts.pickPrompts(pair);assert.equal(next.length,2);assert.ok(next.every(p=>!pair.some(q=>q.category===p.category)));}
assert.equal(store.reflectionCounts(withNote.reflections).get('a'),1);assert.equal(store.reflectionCounts(store.removeReflection(withNote,'a','r').reflections).get('a'),undefined);
assert.equal(JSON.stringify(themes.collectionMonths(['2027-03','2026-11','2027-01','2026-12','2026-12'],'2026-12')),JSON.stringify(['2026-12','2026-11','2027-01','2027-03']));
console.log('PASS — prompt refresh, derived reflection counts, collection ordering');

const catalog=['2026-11','2026-12','2027-01','2027-02','2027-03'];
const groupsA=themes.collectionGroups(catalog,'2027-01',new Set(['2026-12']),'A');
assert.equal(JSON.stringify(groupsA),JSON.stringify({archived:['2027-01','2026-12'],upcoming:['2027-02']}));
const groupsB=themes.collectionGroups(catalog,'2027-01',new Set(['2026-12']),'B');
assert.equal(JSON.stringify(groupsB),JSON.stringify({archived:['2027-01','2026-12','2026-11'],upcoming:['2027-02','2027-03']}));
assert.equal(themes.shiftMonth('2026-12',1),'2027-01');
assert.equal(JSON.stringify(themes.collectionGroups(catalog,'2027-01',new Set(),'A').archived),JSON.stringify(['2027-01']));
console.log('PASS — V02 collection variants and calendar rollover');
