import fs from 'node:fs';
import path from 'node:path';
// Package the actual Vite build, not a separate HTML prototype.
// Review data is fictional, seeded only into a fresh browser session.
const index=fs.readFileSync('dist/index.html','utf8');
const script=/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/;
const css=/<link\b[^>]*\bhref="([^"]+\.css)"[^>]*>/g;
const readAsset=p=>fs.readFileSync(path.join('dist',p.replace(/^\//,'')),'utf8');
if(!script.test(index))throw Error('Missing compiled entry');
const seed=`<script>
(()=>{window.__DAJEONGROK_REVIEW__=true;try{
const key='praise-diary:prototype:v1';
if(sessionStorage.getItem(key))return;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateAt=i=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-i);return d.toISOString().slice(0,10)};
const texts=[
['나의 속도로','오늘은 조금 느리더라도 끝까지 해냈다.\\n\\n다른 사람과 비교하지 않고 나의 속도로 하루를 보낸 내가 참 기특하다.'],
['작은 용기','망설였던 일을 시작했다. 결과와 상관없이 용기를 낸 나에게 고맙다.'],
['충분한 하루','조금 쉬어가도 괜찮아. 오늘도 수고했어.'],
['','바쁜 하루에도 나를 위한 시간을 남겼다.'],
['작은 약속','미뤄둔 일을 하나 해냈다.'],
['다정한 말','친구에게 먼저 안부를 물었다.']];
const entries=Array.from({length:12},(_,i)=>{const day=dateAt(Math.floor(i/2)),t=texts[i%texts.length];return {id:'review-'+i,entryDate:day,createdAt:day+'T0'+(i%2+1)+':00:00Z',title:t[0],body:t[1]}});
sessionStorage.setItem(key,JSON.stringify({entries,reflections:[],letterDrawUnlockedAt:new Date().toISOString(),boundaryHour:0,reducedMotion:false,ideas:[]}));
}catch(e){console.warn('Review session storage unavailable',e)}})();
</script>`;
const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script');
let result=index.replace(script,(_,p)=>seed+'<script type="module">'+escapeScript(readAsset(p))+'</script>');
result=result.replace(css,(tag,p)=>p.startsWith('https:')?tag:'<style>'+readAsset(p).replace(/<\/style/gi,'<\\/style')+'</style>');
fs.mkdirSync('review',{recursive:true});fs.writeFileSync('review/다정록-검수.html',result);
fs.writeFileSync('review/README.txt', '다정록 React 검수 빌드 (가상 일기 12개)\\n1. 압축을 풀고 다정록-검수.html을 Chrome 또는 Edge에서 엽니다.\\n2. 꺼내보기 → 칭찬 하나 꺼내보기 → 오늘의 마음 덧붙이기 → 닫기.\\n3. 홈 달력 및 전체 기록에서 같은 기록을 확인합니다.\\n4. 칭찬 남기기 화면 하단의 검수용 A/B/C 선택에서 날짜 위치를 비교합니다.\\n저장소는 시연용 sessionStorage입니다. 실제 개인정보는 입력하지 마세요.\\n파일 열기가 차단되면 압축을 푼 폴더에서 python -m http.server 8765 실행 후 http://localhost:8765 접속.\\n월간 작품은 공통 슬롯이며 실제 그래픽은 추후 연결합니다.\\n'.replaceAll('\\n','\n'));
console.log('Review package ready: '+Buffer.byteLength(result)+' bytes');
