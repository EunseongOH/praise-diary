import {test,expect} from '@playwright/test';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fixture={entries:[{id:'a',entryDate:today,createdAt:today+'T00:00:00Z',body:'오늘의 기록'}],reflections:[],ideas:[],letterDrawUnlockedAt:null,boundaryHour:0,reducedMotion:true};
for(const width of [320,390,430])test('settings, saved, dialog and shell geometry '+width,async({page})=>{
 await page.setViewportSize({width,height:844});await page.route('https://**/*',r=>r.abort());
 await page.addInitScript(s=>sessionStorage.setItem('praise-diary:prototype:v1',JSON.stringify(s)),fixture);await page.goto('/');
 await page.getByRole('button',{name:'설정',exact:true}).click();
 const rows=page.locator('.setting-row,.setting-switch-row');
 for(const row of await rows.all()){const m=await row.evaluate(e=>({padding:getComputedStyle(e).paddingLeft,gap:getComputedStyle(e).gap,h:e.getBoundingClientRect().height}));expect(m.padding).toBe('12px');expect(m.gap).toBe('8px');expect(m.h).toBeGreaterThanOrEqual(48)}
 const sw=page.getByRole('switch',{name:'그래픽 움직임 줄이기'});await expect(sw).toBeChecked();await page.locator('.setting-switch-row').click();await expect(sw).not.toBeChecked();await sw.focus();await page.keyboard.press('Space');await expect(sw).toBeChecked();
 await page.getByRole('button',{name:/하루가 바뀌는 시간/}).click();const radio=page.getByRole('radio',{name:'오전 1:00',exact:true});await radio.check();await expect(radio).toBeChecked();
 expect(await radio.locator('..').evaluate(e=>getComputedStyle(e).paddingLeft)).toBe('12px');
 await page.getByRole('button',{name:'뒤로가기'}).click();await page.getByRole('button',{name:'기록 관리',exact:true}).click();
 await expect(page.getByRole('heading',{name:'기록 관리',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'모든 칭찬일기 삭제',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'계속'}).click();
 const dlg=page.getByRole('alertdialog');await expect(dlg.getByRole('textbox',{name:'확인 문구'})).toBeVisible();expect(await dlg.evaluate(e=>getComputedStyle(e).paddingLeft)).toBe('20px');
 await dlg.getByRole('button',{name:'취소'}).click();await page.getByRole('button',{name:'뒤로가기'}).click();
 if(width===320){await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.evaluate(()=>document.documentElement.style.fontSize='')}
 await page.getByRole('button',{name:'뒤로가기'}).click();await page.getByRole('button',{name:'칭찬 남기기',exact:true}).click();await page.getByRole('textbox',{name:'나에게 남길 칭찬'}).fill('검수 저장');await page.getByRole('button',{name:'칭찬 남기기',exact:true}).click();
 await expect(page.getByText('칭찬을 잘 남겼어요.')).toBeVisible();expect(await page.locator('.action-stack').evaluate(e=>({gap:getComputedStyle(e).gap,margin:getComputedStyle(e).marginTop}))).toEqual({gap:'8px',margin:'0px'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
