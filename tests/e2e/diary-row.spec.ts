import {test,expect} from '@playwright/test';
const day='2026-11-26';
const entries=[
 {id:'title-notes',entryDate:day,createdAt:day+'T04:00:00Z',title:'나의 속도로',body:'오늘도 끝까지 해냈다.\n\n내가 기특하다.'},
 {id:'title-none',entryDate:day,createdAt:day+'T03:00:00Z',title:'작은 용기',body:'망설이던 일을 시작했다.'},
 {id:'body-notes',entryDate:day,createdAt:day+'T02:00:00Z',title:'  ',body:'제목 없이 남긴 기록.\n\n오늘도 수고했어.'},
 {id:'body-none',entryDate:day,createdAt:day+'T01:00:00Z',body:'제목도 마음도 없는 기록.'}];
const reflections=['title-notes','title-notes','body-notes'].map((entryId,i)=>({id:'r'+i,entryId,body:'가상 마음',reflectionDate:day,createdAt:day+'T05:00:00Z',updatedAt:day+'T05:00:00Z'}));
for(const width of [320,390,430,635])test('DiaryRow variants and centered metadata '+width,async({page},info)=>{
 await page.setViewportSize({width,height:859});
 await page.route('https://**/*',r=>r.abort());await page.clock.install({time:new Date(day+'T06:00:00Z')});
 await page.addInitScript(s=>{sessionStorage.setItem('praise-diary:prototype:v1',JSON.stringify(s));Object.defineProperty(window,'__DAJEONGROK_REVIEW__',{value:true})},{entries,reflections,ideas:[],letterDrawUnlockedAt:null,boundaryHour:0,reducedMotion:true});
 await page.goto('/');await page.getByRole('button',{name:'내가 남긴 칭찬 보기'}).click();
 for(const [variant,name] of [['A','A 구분선'],['B','B 카드'],['C','C 날짜별']]){
  await page.getByRole('button',{name,exact:true}).click();
  await expect(page.locator('.diary-row')).toHaveCount(4);
  for(const e of entries){
   const row=page.locator('[data-entry-id="'+e.id+'"]'),hasTitle=!!e.title?.trim(),count=reflections.filter(r=>r.entryId===e.id).length;
   await expect(row).toHaveAttribute('data-title',hasTitle?'present':'absent');await expect(row).toHaveAttribute('data-reflection',count?'present':'absent');
   await expect(row.locator('.diary-row__title')).toHaveCount(hasTitle?1:0);
   await expect(row.locator('.diary-reflection-count')).toHaveCount(count?1:0);
   await expect(row.locator('.diary-row-meta')).toHaveCount(variant!=='C'||count?1:0);
   const m=await row.evaluate(el=>{
    const cs=getComputedStyle(el),meta=el.querySelector('.diary-row-meta'),date=el.querySelector('.diary-row__date'),count=el.querySelector('.diary-reflection-count'),icon=count?.querySelector('svg'),number=count?.querySelector('.diary-reflection-count__number');
    const rect=(n:Element|null|undefined)=>n?.getBoundingClientRect(),d=rect(date),i=rect(icon),n=rect(number),c=rect(count);
    const center=(r:DOMRect)=>r.top+r.height/2;
    return {px:cs.paddingLeft,py:cs.paddingTop,gap:cs.gap,h:rect(el)!.height,metaGap:meta?getComputedStyle(meta).gap:null,iconGap:i&&n?n.left-i.right:null,dateGap:d&&c?c.left-d.right:null,centerDN:d&&n?Math.abs(center(d)-center(n)):null,centerIN:i&&n?Math.abs(center(i)-center(n)):null,iconSize:i?.width,fontDate:date?getComputedStyle(date).fontSize:null,fontNumber:number?getComputedStyle(number).fontSize:null,lineDate:date?getComputedStyle(date).lineHeight:null,lineNumber:number?getComputedStyle(number).lineHeight:null};
   });
   expect(m.px).toBe('12px');expect(m.py).toBe('12px');expect(m.gap).toBe('4px');expect(m.h).toBeGreaterThanOrEqual(48);
   if(count){expect(m.iconSize).toBe(16);expect(m.iconGap).toBeCloseTo(4,0);expect(m.centerIN).toBeLessThan(1);expect(m.fontNumber).toBe('13px');if(variant!=='C'){expect(m.centerDN).toBeLessThan(1);expect(m.dateGap).toBeCloseTo(8,0);expect(m.fontDate).toBe(m.fontNumber);expect(m.lineDate).toBe(m.lineNumber)}}
   const before=await row.boundingBox();await row.hover();expect(await row.boundingBox()).toEqual(before);
  }
  await page.screenshot({path:info.outputPath('diary-row-'+variant+'-'+width+'.png'),fullPage:true,animations:'disabled'});
  if(width===320){await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.evaluate(()=>document.documentElement.style.fontSize='')}
 }
 await page.locator('[data-entry-id="title-notes"]').click();await expect(page.locator('.diary-original p')).toHaveText(entries[0].body);
});
