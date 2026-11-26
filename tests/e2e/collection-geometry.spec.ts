import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const fixture={entries:[{id:'nov',entryDate:'2026-11-26',createdAt:'2026-11-26T00:00:00Z',body:'가상 기록'},{id:'dec',entryDate:'2026-12-01',createdAt:'2026-12-01T00:00:00Z',body:'지난 기록'}],reflections:[],ideas:[],letterDrawUnlockedAt:null,boundaryHour:0,reducedMotion:true};
async function measure(page:Page){
 const values=await page.locator('.month-tile').evaluateAll(tiles=>tiles.map(tile=>{
  const art=tile.querySelector('.month-tile__art')!,visual=art.querySelector('.month-visual')!,caption=visual.querySelector('.month-slot-caption');
  const t=tile.getBoundingClientRect(),a=art.getBoundingClientRect(),v=visual.getBoundingClientRect();
  const grid=tile.parentElement!.getBoundingClientRect(),gap=parseFloat(getComputedStyle(tile.parentElement!).columnGap);
  let textWidth=0,textHeight=0;
  if(caption){const range=document.createRange();range.selectNodeContents(caption);const r=range.getBoundingClientRect();textWidth=r.width;textHeight=r.height}
  return {month:(tile as HTMLElement).dataset.month,state:(tile as HTMLElement).dataset.state,expected:(grid.width-gap)/2,tileWidth:t.width,artWidth:a.width,artHeight:a.height,visualWidth:v.width,visualHeight:v.height,dx:v.x-a.x,dy:v.y-a.y,ratio:1,textWidth,textHeight};
 }));
 expect(values.length).toBeGreaterThan(0);
 for(const m of values){
  const label=JSON.stringify(m);
  expect(Math.abs(m.tileWidth-m.expected),label).toBeLessThan(1);
  expect(Math.abs(m.artWidth-m.tileWidth),label).toBeLessThan(1);
  expect(Math.abs(m.artHeight-m.artWidth*m.ratio),label).toBeLessThan(1);
  expect(Math.abs(m.visualWidth-m.artWidth),label).toBeLessThan(1);
  expect(Math.abs(m.visualHeight-m.artHeight),label).toBeLessThan(1);
  expect(Math.abs(m.dx),label).toBeLessThan(1);expect(Math.abs(m.dy),label).toBeLessThan(1);
  if(m.textWidth){expect(m.textWidth,label).toBeGreaterThan(40);expect(m.textHeight,label).toBeLessThanOrEqual(44);}
 }
 return values;
}
for(const width of [320,390,430,635,1280])test('collection artwork surface fills grid '+width,async({page},info)=>{
 await page.setViewportSize({width,height:859});await page.route('https://**/*',r=>r.abort());
 await page.clock.install({time:new Date('2026-11-26T06:00:00Z')});
 await page.addInitScript(s=>{sessionStorage.setItem('praise-diary:prototype:v1',JSON.stringify(s));Object.defineProperty(window,'__DAJEONGROK_REVIEW__',{value:true})}, {...fixture,entries:fixture.entries.slice(0,1)});
 await page.goto('/');await page.getByRole('button',{name:'도감',exact:true}).click();
 const a=await measure(page);expect(a.some(x=>x.state==='preparing')).toBeTruthy();expect(a.some(x=>x.state==='locked')).toBeTruthy();
 await expect(page.locator('.collection-screen')).toHaveAttribute('data-layout','B');
 await page.screenshot({path:info.outputPath('collection-B-'+width+'.png'),fullPage:true,animations:'disabled'});
 await page.locator('.month-tile').first().click();
 const detail=await page.locator('.collection-detail-stage').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('.month-visual')!.getBoundingClientRect();return {w:a.width,h:a.height,vw:b.width,vh:b.height}});
 expect(detail.w).toBeCloseTo(detail.h,0);expect(detail.w).toBeCloseTo(detail.vw,0);expect(detail.h).toBeCloseTo(detail.vh,0);
});
test('file review exact reported desktop width',async({page},info)=>{
 const file=path.resolve('review/다정록-검수.html');expect(fs.existsSync(file)).toBeTruthy();
 await page.setViewportSize({width:635,height:859});await page.route('https://**/*',r=>r.abort());await page.clock.install({time:new Date('2026-11-26T06:00:00Z')});
 await page.goto(pathToFileURL(file).href);await page.getByRole('button',{name:'도감',exact:true}).click();await measure(page);
 await page.screenshot({path:info.outputPath('file-review-635.png'),fullPage:true,animations:'disabled'});
});
