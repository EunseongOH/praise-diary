// Pure archive selection: no mutation of the original diary or reflection data.
export const ARCHIVE_PAGE_SIZE=30;
export const normalizeSearch=value=>String(value??'').replace(/\s+/g,' ').trim();
export const searchKey=value=>normalizeSearch(value).toLowerCase();
export function selectArchive(entries,{day,scopeMonth,year='all',month='all',query='',withReflection=false,counts=new Map()}={}){
 const q=searchKey(query);
 return entries.filter(e=>(!day||e.entryDate===day)&&(!scopeMonth||e.entryDate.startsWith(scopeMonth+'-'))&&
  (year==='all'||e.entryDate.startsWith(year+'-'))&&(month==='all'||e.entryDate.startsWith(month+'-'))&&
  (!withReflection||(counts.get(e.id)??0)>0)&&(!q||searchKey(e.title).includes(q)||searchKey(e.body).includes(q)))
  .sort((a,b)=>b.entryDate.localeCompare(a.entryDate)||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
}
export function groupArchive(entries){
 const groups=new Map();
 for(const entry of entries){const month=entry.entryDate.slice(0,7);if(!groups.has(month))groups.set(month,[]);groups.get(month).push(entry)}
 return [...groups].map(([month,entries])=>({month,entries}));
}
export function archivePeriods(entries){
 const months=[...new Set(entries.map(e=>e.entryDate.slice(0,7)))].sort().reverse();
 return {months,years:[...new Set(months.map(m=>m.slice(0,4)))]};
}
export function searchPreview(value,query,max=120){
 const text=normalizeSearch(value), q=searchKey(query), index=searchKey(text).indexOf(q);
 if(!q||index<0||index<32)return text;
 const start=Math.max(0,index-24),end=Math.max(start+max,index+q.length+24);
 return '…'+text.slice(start,end)+(end<text.length?'…':'');
}
