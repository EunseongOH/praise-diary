from playwright.sync_api import sync_playwright
from pathlib import Path
p=Path(__file__).resolve().parents[1]
with sync_playwright() as w:
 browser=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':1000},device_scale_factor=1)
 page.set_default_timeout(3500);errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 log=[]
 for width in [320,390,768,1280]:
  page.goto('about:blank');print(width,flush=True)
  page.set_viewport_size({'width':width,'height':900});page.set_content((p/'preview.html').read_text());page.locator('#titleSlot button').click();page.locator('#titleInput').fill('제목 — 긴 제목을 입력해도 겹치지 않아요');page.locator('#removeTitle button').hover();
  r=page.evaluate('''()=>{const a=document.querySelector('#titleField .dj-field-shell').getBoundingClientRect(),b=document.querySelector('#removeTitle button').getBoundingClientRect(),i=document.querySelector('#titleInput'),t=document.querySelector('#body');return {gap:b.left-a.right,height:a.height,touch:[b.width,b.height],pad:getComputedStyle(i).paddingLeft,bodyPad:getComputedStyle(t).paddingLeft,focus:document.activeElement===i,overflow:document.documentElement.scrollWidth>innerWidth,hover:getComputedStyle(document.querySelector('#removeTitle button')).backgroundColor,ring:getComputedStyle(i.parentElement).boxShadow}}''')
  assert r['gap']>=8 and r['touch']==[44,44] and r['pad']=='12px' and r['bodyPad']=='12px' and r['focus'] and not r['overflow'] and r['height']>=52, r
  assert 'inset' in r['ring'],r
  page.locator('#titleInput').press('Tab'); assert page.locator('#removeTitle button').evaluate('(e)=>e===document.activeElement && getComputedStyle(e).outlineOffset==="-2px"')
  page.locator('#body').fill('오늘 해낸 일');page.locator('#q-trigger').click();page.locator('#pair .dj-question').first.click();assert page.locator('#body').input_value()=='오늘 해낸 일';page.locator('#removeQuestion button').click();assert page.locator('#body').input_value()=='오늘 해낸 일';page.locator('#removeTitle button').click();assert page.locator('#titleField').is_hidden();assert page.locator('#body').input_value()=='오늘 해낸 일'
  page.locator('#labSearch').fill('긴 검색어 입력');page.locator('#labClear button').hover();r2=page.evaluate('''()=>{let a=document.querySelector('#labSearch'),b=document.querySelector('#labClear button'),s=a.parentElement;return {gap:b.getBoundingClientRect().left-a.getBoundingClientRect().right,pad:getComputedStyle(a).paddingRight,tail:s.getBoundingClientRect().right-b.getBoundingClientRect().right,touch:b.getBoundingClientRect().width}}''');assert r2=={'gap':0,'pad':'8px','tail':4,'touch':44},r2
  page.locator('#labClear button').click();assert page.locator('#labSearch').input_value()=='' and page.locator('#labClear button').is_disabled() and page.locator('#labSearch').evaluate('(e)=>e===document.activeElement')
  log.append(f'{width}px: PASS — external gap {r["gap"]}px, target 44×44px, padding 12px, focus/hover/Tab, no overflow, title and prompt removal preserve body, internal clear reserved slot')
 assert not errs,errs
 page.goto('about:blank');page.set_viewport_size({'width':1280,'height':1000});page.set_content((p/'preview.html').read_text());page.locator('#titleSlot button').click();page.locator('#titleInput').fill('오늘의 기록');page.locator('#removeTitle button').hover();page.screenshot(path=str(p/'tests/preview.png'),full_page=True,animations='disabled');page.locator('.phone').screenshot(path=str(p/'tests/writing-focus.png'),animations='disabled');browser.close()
 (p/'tests/browser-results.txt').write_text('\n'.join(log)+'\n');print('\n'.join(log))
