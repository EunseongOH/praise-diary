import {test,expect} from '@playwright/test';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const month=today.slice(0,7);
const fixture={entries:[1,2,3,4,5,6].map(i=>({id:'e'+i,entryDate:month+'-'+String(i).padStart(2,'0'),createdAt:month+'-01T00:00:00Z',body:'가상 기록 '+i})),reflections:[],letterDrawUnlockedAt:null,boundaryHour:0,reducedMotion:true,ideas:[]};
async function seed(page:import('@playwright/test').Page,review=false){
 await page.route('https://**/*',r=>r.abort());
 await page.addInitScript(({s,review})=>{sessionStorage.setItem('praise-diary:prototype:v1',JSON.stringify(s));if(review)Object.defineProperty(window,'__DAJEONGROK_REVIEW__',{value:true})},{s:fixture,review});
 await page.goto('/');
}
for(const width of [320,390,430]){
 test('compact month and independent consecutive-day marks '+width,async({page})=>{
  await page.setViewportSize({width,height:844});await seed(page);
  const art=page.getByRole('combobox',{name:'작품 월 선택'});
  const checkSelect=async(name:string)=>{
   const sel=page.getByRole('combobox',{name});const shell=sel.locator('..');
   const metric=await shell.evaluate(el=>{const label=el.querySelector('span')!,icon=el.querySelector('svg')!,r=el.getBoundingClientRect();return {gap:icon.getBoundingClientRect().left-label.getBoundingClientRect().right,width:r.width,height:r.height,label:label.getBoundingClientRect().width,icon:icon.getBoundingClientRect().width,padding:parseFloat(getComputedStyle(el).paddingLeft)+parseFloat(getComputedStyle(el).paddingRight)}});
   expect(metric.gap).toBeCloseTo(8,0);expect(metric.height).toBeGreaterThanOrEqual(44);expect(metric.icon).toBe(16);expect(metric.width).toBeCloseTo(metric.label+metric.icon+metric.gap+metric.padding,0);
   const before=await shell.boundingBox();await sel.focus();expect(await shell.evaluate(el=>getComputedStyle(el).boxShadow)).toContain('2px');expect(await shell.boundingBox()).toEqual(before);
  };
  await expect(art).toBeVisible();await checkSelect('작품 월 선택');
  await page.getByRole('button',{name:'달력으로 보기'}).click();await checkSelect('달력 월 선택');
  const marks=page.locator('.home-calendar-day.has-entry .home-calendar-day__mark');
  await expect(marks).toHaveCount(6);
  const metrics=await page.locator('.home-calendar-day.has-entry').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),m=el.querySelector('span')!.getBoundingClientRect();return {w:r.width,h:r.height,mw:m.width,mh:m.height,left:m.left,right:m.right,top:m.top,bottom:m.bottom,hitLeft:r.left,hitRight:r.right}}));
  for(const m of metrics){expect(m.w).toBeGreaterThanOrEqual(44);expect(m.h).toBeGreaterThanOrEqual(44);expect(m.mw).toBeLessThanOrEqual(36.1);expect(m.left-m.hitLeft).toBeGreaterThanOrEqual(3.9)}
  for(let i=1;i<metrics.length;i++){const a=metrics[i-1],b=metrics[i];if(Math.abs(a.top-b.top)<1){expect(b.left-a.right).toBeGreaterThanOrEqual(7.9);expect(b.hitLeft).toBeGreaterThanOrEqual(a.hitRight-.1)}else expect(b.top-a.bottom).toBeGreaterThanOrEqual(7.9)}
  const date=month+'-01';await page.getByRole('button',{name:date+' 기록 보기',exact:true}).click();await page.getByRole('button').filter({hasText:'가상 기록 1'}).click();await expect(page.getByText('가상 기록 1',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'뒤로가기'}).click();await page.getByRole('button',{name:'뒤로가기'}).click();await expect(page.getByRole('combobox',{name:'달력 월 선택'})).toHaveValue(month);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  if(width===320){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expect(page.getByRole('combobox',{name:'달력 월 선택'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 });
 test('writer A B C shared draft and date '+width,async({page})=>{
  await page.setViewportSize({width,height:844});await seed(page,true);
  await page.getByRole('button',{name:'칭찬 남기기',exact:true}).click();
  const layout=page.locator('.writer-layout'),body=page.getByRole('textbox',{name:'나에게 남길 칭찬'}),date=page.getByRole('combobox',{name:'일기를 남길 날짜'});
  await expect(layout).toHaveAttribute('data-variant','A');await expect(date).toHaveCount(1);
  const y=(await body.boundingBox())!.y;expect(y).toBeLessThan(180);
  await body.fill('시안 전환 중에도 유지되는 기록');
  const yesterday=await date.locator('option').nth(1).getAttribute('value');await date.selectOption(yesterday!);
  await page.getByRole('button',{name:'B 본문 아래'}).click();await expect(layout).toHaveAttribute('data-variant','B');await expect(body).toHaveValue('시안 전환 중에도 유지되는 기록');await expect(date).toHaveValue(yesterday!);
  expect((await date.boundingBox())!.y).toBeGreaterThan((await body.boundingBox())!.y);
  await page.getByRole('button',{name:'C 상단바'}).click();await expect(layout).toHaveAttribute('data-variant','C');await expect(page.locator('.app-bar').getByRole('combobox')).toHaveValue(yesterday!);await expect(body).toHaveValue('시안 전환 중에도 유지되는 기록');
  await page.getByRole('button',{name:'제목 추가'}).click();await page.getByRole('textbox',{name:'제목 (선택)'}).fill('제목 검수');
  await page.getByRole('button',{name:'A 상단 한 줄'}).click();await expect(page.getByRole('textbox',{name:'제목 (선택)'})).toHaveValue('제목 검수');
  await expect(date).toHaveValue(yesterday!);await expect(body).toHaveValue('시안 전환 중에도 유지되는 기록');
  await page.getByRole('button',{name:'어떤 칭찬을 남길지 고민되나요?'}).click();await expect(page.locator('.ui-disclosure')).toHaveAttribute('aria-expanded','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'칭찬 남기기',exact:true}).click();
  await expect(page.getByText('칭찬을 잘 남겼어요.')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('praise-diary:prototype:v1')!).entries.some((e:{body:string;entryDate:string})=>e.body==='시안 전환 중에도 유지되는 기록'&&e.entryDate===JSON.parse(sessionStorage.getItem('praise-diary:prototype:v1')!).entries.at(-1).entryDate))).toBeTruthy();
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('praise-diary:prototype:v1')!).entries.at(-1).entryDate)).toBe(yesterday);
 });
}
test('production layout hides review switch and collection duplicate title',async({page})=>{
 await seed(page);await page.getByRole('button',{name:'도감',exact:true}).click();
 await expect(page.getByText('그래픽 도감',{exact:true})).toHaveCount(0);
 await expect(page.locator('.app-bar__title')).toHaveText('도감');
 await page.getByRole('button',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'칭찬 남기기',exact:true}).click();
 await expect(page.locator('.writer-review-panel')).toHaveCount(0);
 await expect(page.getByRole('combobox',{name:'일기를 남길 날짜'})).toHaveCount(1);
});
