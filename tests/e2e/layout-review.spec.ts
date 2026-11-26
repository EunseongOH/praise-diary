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
   const sel=page.getByRole('combobox',{name});const shell=sel;
   const metric=await shell.evaluate(el=>{const label=el.querySelector('span')!,icon=el.querySelector('svg')!,r=el.getBoundingClientRect();return {gap:icon.getBoundingClientRect().left-label.getBoundingClientRect().right,width:r.width,height:r.height,label:label.getBoundingClientRect().width,icon:icon.getBoundingClientRect().width,padding:parseFloat(getComputedStyle(el).paddingLeft)+parseFloat(getComputedStyle(el).paddingRight)}});
   expect(metric.gap).toBeCloseTo(8,0);expect(metric.height).toBeGreaterThanOrEqual(44);expect(metric.icon).toBe(16);expect(metric.width).toBeCloseTo(metric.label+metric.icon+metric.gap+metric.padding,0);
   const before=await shell.boundingBox();await sel.focus();expect(await shell.evaluate(el=>getComputedStyle(el).outlineOffset)).toBe('-2px');expect(await shell.evaluate(el=>getComputedStyle(el).outlineWidth)).toBe('2px');expect(await shell.evaluate(el=>getComputedStyle(el).paddingLeft)).toBe('12px');expect(await shell.boundingBox()).toEqual(before);
  };
  await expect(art).toBeVisible();await checkSelect('작품 월 선택');
  await page.getByRole('button',{name:'달력으로 보기'}).click();await checkSelect('달력 월 선택');
  const marks=page.locator('.home-calendar-day.has-entry .home-calendar-day__mark');
  await expect(marks).toHaveCount(6);
  const metrics=await page.locator('.home-calendar-day.has-entry').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),m=el.querySelector('span')!.getBoundingClientRect();return {w:r.width,h:r.height,mw:m.width,mh:m.height,left:m.left,right:m.right,top:m.top,bottom:m.bottom,hitLeft:r.left,hitRight:r.right}}));
  for(const m of metrics){expect(m.w).toBeGreaterThanOrEqual(44);expect(m.h).toBeGreaterThanOrEqual(44);expect(m.mw).toBeLessThanOrEqual(36.1);expect(m.left-m.hitLeft).toBeGreaterThanOrEqual(3.9)}
  for(let i=1;i<metrics.length;i++){const a=metrics[i-1],b=metrics[i];if(Math.abs(a.top-b.top)<1){expect(b.left-a.right).toBeGreaterThanOrEqual(7.9);expect(b.hitLeft).toBeGreaterThanOrEqual(a.hitRight-.1)}else expect(b.top-a.bottom).toBeGreaterThanOrEqual(7.9)}
  const date=month+'-01';await page.getByRole('button',{name:date+' 기록 보기',exact:true}).click();await page.getByRole('button').filter({hasText:'가상 기록 1'}).click();await expect(page.getByText('가상 기록 1',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'뒤로가기'}).click();await page.getByRole('button',{name:'뒤로가기'}).click();await expect(page.getByRole('combobox',{name:'달력 월 선택'})).toHaveAttribute('data-value',month);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  if(width===320){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expect(page.getByRole('combobox',{name:'달력 월 선택'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 });
 test('writer A, custom selector, disclosure and list variants '+width,async({page})=>{
 await page.setViewportSize({width,height:844});await seed(page,true);
 const monthSelect=page.getByRole('combobox',{name:'작품 월 선택'});
 await monthSelect.click();const popup=page.getByRole('listbox');await expect(popup).toBeVisible();
 const row=popup.getByRole('option').first();
 const p=await row.evaluate(el=>({padding:getComputedStyle(el).paddingLeft,height:el.getBoundingClientRect().height,gap:getComputedStyle(el.parentElement!).gap}));
 expect(p.padding).toBe('12px');expect(p.height).toBeGreaterThanOrEqual(48);expect(p.gap).toBe('4px');
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);await expect(monthSelect).toBeFocused();
 await page.getByRole('button',{name:'칭찬 남기기',exact:true}).click();
 const date=page.getByRole('combobox',{name:'일기를 남길 날짜'});await expect(page.locator('.writer-layout')).toHaveAttribute('data-variant','A');
 await date.click();await page.getByRole('option',{name:/어제/}).click();const yesterday=await date.getAttribute('data-value');
 const body=page.getByRole('textbox',{name:'나에게 남길 칭찬'});await body.fill('검수 기록');
 const disclosure=page.getByRole('button',{name:'어떤 칭찬을 남길지 고민되나요?'});await disclosure.click();
 const prompt=page.locator('.ui-prompt-option').first();await expect(prompt).toBeVisible();
 const before=await prompt.boundingBox();await prompt.hover();expect(await prompt.boundingBox()).toEqual(before);
 expect(before!.y-((await disclosure.boundingBox())!.y+(await disclosure.boundingBox())!.height)).toBeGreaterThanOrEqual(7.9);
 await prompt.click();await expect(body).toHaveValue('검수 기록');await expect(date).toHaveAttribute('data-value',yesterday!);
 await page.getByRole('button',{name:'칭찬 남기기',exact:true}).click();await expect(page.getByText('칭찬을 잘 남겼어요.')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('praise-diary:prototype:v1')!).entries.at(-1).entryDate)).toBe(yesterday);
 await page.getByRole('button',{name:'홈으로 돌아가기'}).click();await page.getByRole('button',{name:'내가 남긴 칭찬 보기'}).click();
 await expect(page.getByText('내가 남긴 칭찬들',{exact:true})).toHaveCount(0);
 for(const [v,name] of [['A','A 구분선'],['B','B 카드'],['C','C 날짜별']]){
  await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('.diary-list')).toHaveAttribute('data-variant',v);
  const row=page.locator('.diary-row').first();expect(await row.evaluate(el=>getComputedStyle(el).paddingLeft)).toBe('12px');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
 await page.getByRole('button').filter({hasText:'검수 기록'}).click();await expect(page.getByText('검수 기록',{exact:true})).toBeVisible();
 });
}
test('production layout hides review switch and collection duplicate title',async({page})=>{
 await seed(page);await page.getByRole('button',{name:'도감',exact:true}).click();
 await expect(page.getByText('그래픽 도감',{exact:true})).toHaveCount(0);await expect(page.getByText('내가 남긴 칭찬들이 자란 모습',{exact:true})).toHaveCount(0);
 await expect(page.locator('.app-bar__title')).toHaveText('도감');
 await page.getByRole('button',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'칭찬 남기기',exact:true}).click();
 await expect(page.locator('.writer-review-panel')).toHaveCount(0);
 await expect(page.getByRole('combobox',{name:'일기를 남길 날짜'})).toHaveCount(1);
});
