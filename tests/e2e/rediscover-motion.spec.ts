import {test,expect} from '@playwright/test';
const day='2026-11-08';
const entries=Array.from({length:12},(_,i)=>({id:'e'+i,entryDate:day,createdAt:day+'T00:00:00Z',title:'기록 '+i,body:'오늘도 내 속도로.\n수고했어.'}));
const fixture={entries,reflections:[],letterDrawUnlockedAt:'2026-11-09T00:00:00Z',boundaryHour:0,reducedMotion:false,ideas:[]};
async function seed(page:import('@playwright/test').Page,state=fixture){await page.route('https://**/*',r=>r.abort());await page.addInitScript(s=>{sessionStorage.setItem('praise-diary:prototype:v1',JSON.stringify(s));Math.random=()=>0},state);await page.goto('/');await page.getByRole('button',{name:'꺼내보기',exact:true}).click()}
test('V10 real-time extraction, lower-note support settling, closed return and repeat',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});await seed(page);
 const jar=page.locator('.rediscover-jar');await expect(jar).toHaveAttribute('data-note-count','5');
 const initial=await jar.locator('[data-note-index="2"]').getAttribute('style');
 await page.getByRole('button',{name:'칭찬 하나 꺼내보기',exact:true}).click();
 await expect(page.getByRole('button',{name:'칭찬 하나 꺼내보기',exact:true})).toBeDisabled();
 await expect(jar.locator('.extraction-layer .picked')).toHaveCount(1,{timeout:3500});
 expect(await jar.locator('[data-note-index="2"]').getAttribute('style')).not.toBe(initial);
 await expect(page.locator('.rediscover-handoff')).toHaveAttribute('inert','');
 await expect(page.locator('.diary-reader').filter({has:page.getByRole('button',{name:'닫기',exact:true})})).toBeVisible({timeout:6000});
 await expect(page.locator('.rediscover-handoff')).toHaveCount(0);
 const first=await page.locator('.diary-original h2').innerText();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await expect(jar).toHaveAttribute('data-phase','closed');await expect(jar.locator('.pile-interior .note-pos')).toHaveCount(5);
 await page.getByRole('button',{name:'칭찬 하나 꺼내보기',exact:true}).click();await expect(page.locator('.rediscover-handoff')).toHaveCount(0,{timeout:6000});
 await expect(page.locator('.diary-original h2')).not.toHaveText(first);
 expect(errors).toEqual([]);
});
test('cancel animation by tab navigation and reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await seed(page);
 await page.getByRole('button',{name:'칭찬 하나 꺼내보기',exact:true}).click();await page.getByRole('button',{name:'홈',exact:true}).click();
 await expect(page.locator('.home-integrated')).toBeVisible();await page.waitForTimeout(2800);await expect(page.locator('.home-integrated')).toBeVisible();
 await page.getByRole('button',{name:'꺼내보기',exact:true}).click();await expect(page.locator('.rediscover-jar')).toHaveAttribute('data-phase','closed');
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'칭찬 하나 꺼내보기',exact:true}).click();await expect(page.getByRole('button',{name:'닫기',exact:true})).toBeVisible();await expect(page.locator('.rediscover-handoff')).toHaveCount(0);
});
for(const [size,count,unlocked] of [[0,0,false],[1,1,false],[3,3,false],[9,3,false],[10,5,true],[0,0,true]] as const)test('jar state '+size+' / '+unlocked,async({page})=>{
 await page.setViewportSize({width:320,height:640});await seed(page,{...fixture,entries:entries.slice(0,size),letterDrawUnlockedAt:unlocked?fixture.letterDrawUnlockedAt:null} as typeof fixture);
 await expect(page.locator('.rediscover-jar')).toHaveAttribute('data-note-count',String(count));
 await expect(page.getByRole('button',{name:'칭찬 하나 꺼내보기',exact:true})).toHaveCount(unlocked&&size?1:0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
