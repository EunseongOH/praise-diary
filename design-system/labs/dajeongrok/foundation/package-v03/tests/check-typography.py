from playwright.sync_api import sync_playwright
from pathlib import Path
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':900}); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://**/*',lambda r:r.abort())
 page.set_content((Path(__file__).resolve().parents[1]/'preview.html').read_text());page.evaluate('document.fonts.ready')
 page.locator('#title-add button').click();page.locator('#title-row input').fill('제목 테스트'); page.locator('#body').fill('오늘의 기록');page.locator('#prompt').click();page.locator('#questions .dj-question').first.click();assert page.locator('#selected').is_visible();page.locator('#remove-question').click();assert page.locator('#body').input_value()=='오늘의 기록';assert page.locator('#save').is_enabled();page.locator('#save').click();assert '완료' in page.locator('#saved').inner_text()
 for w in [320,390,1280]:
  page.set_viewport_size({'width':w,'height':900});page.select_option('#width','320' if w==320 else '390');page.select_option('#length','long')
  for z in ['100','200']:
   page.select_option('#zoom',z)
   for stress in [False,True]:
    page.locator('#stress').set_checked(stress)
    result=page.evaluate('''() => ({page:document.documentElement.scrollWidth<=innerWidth+1,phones:[...document.querySelectorAll('.phone')].map(p=>p.scrollWidth<=p.clientWidth+1),buttons:[...document.querySelectorAll('.dj-icon-button')].filter(b=>b.getClientRects().length).every(b=>b.getBoundingClientRect().width>=43.9&&b.getBoundingClientRect().height>=43.9)})''')
    print(w,z,stress,result);assert result['page'] and all(result['phones']) and result['buttons']
 page.set_viewport_size({'width':1440,'height':960});page.locator('#reset').click();page.screenshot(path='/mnt/data/dajeongrok_design_system_v03_preview.png');assert not errors,errors
 b.close()
