/** December snowflake in the real screens (review build: snowflake flag ON, demo date 2026-12-20, fake data only). */
import { test, expect, type Page } from '@playwright/test';

type EventInfo = { kind: string; phase: string; e: number; len: number; playing: boolean; leaks: number; maxText: number; maxFrost: number; rewardFrames: number };
const BODY = '오늘은 끝까지 해냈다. 작은 걸음도 칭찬한다.';
async function open(page: Page, days: number, extra = '') {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`/?snowflakeDays=${days}${extra}`);
  if (days > 0) await expect(page.locator('.artwork-slot--snowflake [data-snowflake="static"] canvas')).toBeVisible({ timeout: 30_000 });
  return errors;
}
const event = (page: Page) => page.evaluate(() => { const ev = window.__snowflakeReview && [...window.__snowflakeReview.events.values()].at(-1); return ev ? (ev() as unknown as EventInfo) : null; });
async function save(page: Page, body = BODY) {
  await page.getByRole('button', { name: /칭찬 하나 (더 )?남기기/ }).first().click();
  await page.getByRole('textbox', { name: '나에게 남길 칭찬' }).fill(body);
  await page.locator('button.ui-button--full', { hasText: '칭찬 남기기' }).click();
  await expect(page.getByText('칭찬을 잘 남겼어요.')).toBeVisible();
}
async function waitDone(page: Page) { await expect.poll(async () => (await event(page))?.phase, { timeout: 40_000 }).toBe('done'); }
/** every data-* / aria value on the page (diary text must never appear in them) */
const attrs = (page: Page) => page.evaluate(() => [...document.querySelectorAll('*')].flatMap(el => [...el.attributes].filter(a => a.name.startsWith('data-') || a.name.startsWith('aria-')).map(a => a.value)).join('\n'));

test('home renders the real snowflake for 1 / 3 / 8 / 14 / 15 / 17 days, nothing for 0; 320–430 px without overflow; no diary text in attributes', async ({ page }) => {
  test.setTimeout(300_000);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 860 });
    for (const n of width === 390 ? [0, 1, 3, 8, 14, 15, 17] : [8]) {
      const errors = await open(page, n);
      const slot = page.locator('.home-artwork-stage .artwork-slot').first();
      if (n === 0) { await expect(slot.locator('canvas')).toHaveCount(0); await expect(page.getByText('오늘의 나에게 칭찬 하나 남겨볼까요?')).toBeVisible(); }
      else { await expect(slot).toHaveAttribute('data-written-days', String(n)); await expect(page.getByText(`${n}일의 칭찬`)).toBeVisible(); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${n}`).toBe(true);
      const a = await attrs(page);
      for (const s of ['스스로 일을 시작했다', '포기하지 않았다', '안부를 물었다']) expect(a.includes(s)).toBe(false);
      expect(errors).toEqual([]);
    }
  }
});

test('review seed: 9 entries keep rediscovery locked, 10 and 14 unlock it without extra saving', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 860 });
  for (const [days, locked] of [[9, true], [10, false], [14, false]] as const) {
    const errors = await open(page, days);
    await page.getByRole('button', { name: '꺼내보기', exact: true }).click();
    await expect(page.locator('.rediscover-screen')).toHaveAttribute('data-locked', String(locked));
    if (locked) {
      await expect(page.getByText('10개의 칭찬이 모이면, 하나씩 꺼내볼 수 있어요.')).toBeVisible();
      await expect(page.getByRole('button', { name: '칭찬 하나 꺼내보기' })).toHaveCount(0);
    } else {
      await expect(page.getByRole('button', { name: '칭찬 하나 꺼내보기' })).toBeEnabled();
      await expect(page.getByText('10개의 칭찬이 모이면, 하나씩 꺼내볼 수 있어요.')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  }
});

test('collection tile is a still frame (no animation), caption hidden; 2027-01 stays locked; detail has pinch / keyboard zoom without controls', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 860 });
  await open(page, 8);
  await page.getByRole('button', { name: '도감', exact: true }).click();
  const tile = page.locator('.month-tile[data-month="2026-12"]');
  await expect(tile.locator('canvas')).toBeVisible({ timeout: 30_000 });
  await expect(tile.locator('[data-snowflake="static"]')).toHaveAttribute('data-live', 'off');
  await expect(tile.getByText('작품 준비 중')).toHaveCount(0);
  await expect(page.locator('.month-tile[data-month="2027-01"]')).toHaveAttribute('data-state', 'locked');
  await tile.click();
  const viewer = page.locator('.gesture-artwork-viewer');
  await expect(viewer.locator('canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /확대|축소/ })).toHaveCount(0);
  await viewer.focus(); await page.keyboard.press('+'); await page.keyboard.press('+');
  await expect(viewer.locator('.gesture-artwork-viewer__content')).toHaveAttribute('style', /scale\(1\.5\)/);
  await page.keyboard.press('0');
  await expect(viewer.locator('.gesture-artwork-viewer__content')).toHaveAttribute('style', /scale\(1\)/);
});

test('save of a new day plays the growth once and ends as the plain artwork; same-day save plays the density change; no event canvas after', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 860 });
  const errors = await open(page, 8);
  await save(page);
  await expect(page.locator('[data-snowflake="event"]')).toBeVisible({ timeout: 20_000 });
  await waitDone(page);
  let ev = (await event(page))!;
  expect([ev.kind, ev.leaks]).toEqual(['growth', 0]);
  await expect(page.locator('[data-fx]')).toHaveCount(0);
  await expect(page.locator('[data-snowflake-final] canvas')).toBeVisible();
  await page.setViewportSize({ width: 391, height: 860 }); await page.waitForTimeout(400); // re-render: no replay
  expect((await event(page))!.phase).toBe('done');
  await page.getByRole('button', { name: '칭찬 하나 더 남기기' }).click();
  await page.getByRole('textbox', { name: '나에게 남길 칭찬' }).fill('같은 날 한 번 더 칭찬했다.');
  await page.locator('button.ui-button--full', { hasText: '칭찬 남기기' }).click();
  await expect(page.getByText('눈꽃에 칭찬이 하나 더 쌓였어요.')).toBeVisible();
  await expect.poll(async () => (await event(page))?.kind, { timeout: 20_000 }).toBe('addition');
  await waitDone(page);
  await expect(page.locator('[data-fx]')).toHaveCount(0);
  await page.getByRole('button', { name: '홈으로 돌아가기' }).click();
  await expect(page.getByText('9일의 칭찬')).toBeVisible();
  await expect(page.locator('[data-fx]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('review scenario 14 → 15: completion replay + snowglobe reward, then the plain artwork; the app copy claims no completion (targetDays stays null)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 860 });
  const errors = await open(page, 14);
  await save(page);
  await expect(page.getByRole('heading', { name: '남긴 칭찬이 눈꽃에 더해졌어요.' })).toBeVisible();
  await expect(page.getByText('활짝 피어났어요')).toHaveCount(0);
  await expect.poll(async () => (await event(page))?.kind, { timeout: 30_000 }).toBe('complete');
  const phases = new Set<string>();
  for (let i = 0; i < 200; i++) { const ev = await event(page); if (ev) phases.add(ev.phase); if (ev?.phase === 'done') break; await page.waitForTimeout(100); }
  for (const ph of ['rewind', 'grow', 'reward', 'done']) expect(phases.has(ph), ph).toBe(true);
  const ev = (await event(page))!;
  expect(ev.leaks).toBe(0); expect(ev.maxText).toBeGreaterThan(0); expect(ev.maxFrost).toBeGreaterThan(0); expect(ev.rewardFrames).toBeGreaterThan(5);
  await expect(page.locator('[data-fx]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('archive F search and the snowflake together: saved entry is searchable, reader round trip, home / detail artwork kept', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 860 });
  const errors = await open(page, 8);
  await save(page, '눈송이처럼 천천히 해냈다.');
  await waitDone(page);
  await page.getByRole('button', { name: '홈으로 돌아가기' }).click();
  await expect(page.getByText('9일의 칭찬')).toBeVisible();
  await page.getByRole('button', { name: '내가 남긴 칭찬 보기' }).click();
  const base = page.locator('.archive-base');
  await expect(base.locator('.diary-row')).toHaveCount(9);
  await base.getByRole('button', { name: '칭찬 검색하기' }).click();
  const overlay = page.getByRole('dialog', { name: '칭찬 검색', exact: true });
  await overlay.getByRole('searchbox', { name: '칭찬 검색' }).fill('눈송이');
  const hits = overlay.locator('.diary-row');
  await expect(hits).toHaveCount(1);
  await expect(hits.first().locator('mark')).toContainText('눈송이');
  expect((await attrs(page)).includes('눈송이')).toBe(false); // search term / body never in snowflake data-* or aria
  await hits.first().click();
  await expect(page.getByText('눈송이처럼 천천히 해냈다.')).toBeVisible();
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await expect(overlay.getByRole('searchbox', { name: '칭찬 검색' })).toHaveValue('눈송이');
  await overlay.getByRole('button', { name: '검색 닫기' }).click();
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click(); // archive has no tab bar: back to home
  await expect(page.locator('.home-artwork-stage [data-snowflake="static"] canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.home-artwork-stage .artwork-slot')).toHaveAttribute('data-written-days', '9');
  await page.getByRole('button', { name: '도감', exact: true }).click();
  await page.locator('.month-tile[data-month="2026-12"]').click();
  await expect(page.locator('.gesture-artwork-viewer canvas')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: '이달의 칭찬 보기' }).click();
  await expect(page.locator('.archive-base .diary-row')).toHaveCount(9);
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await expect(page.locator('.gesture-artwork-viewer canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-fx]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('saved copy: 14→15 review-only policy shows the agreed one-time completion line', async ({ page }) => {
  test.setTimeout(180_000);
  await open(page,14,'&goalPreview=15');
  await save(page);
  await expect(page.getByRole('heading', { name: '차곡차곡 모은 다정함이 하나의 눈꽃이 되었어요.' })).toBeVisible();
  await expect.poll(async () => (await event(page))?.kind, {timeout:30000}).toBe('complete');
  await waitDone(page);
});

test('post-goal repeated saves use different captions without replaying completion', async ({ page }) => {
  test.setTimeout(180_000);
  await open(page,15,'&goalPreview=15');
  await save(page);
  await expect(page.getByRole('heading', { name: '나에게 다정함 한 스푼을 더했어요.' })).toBeVisible();
  await waitDone(page);
  await page.getByRole('button', {name:'칭찬 하나 더 남기기'}).click();
  await page.getByRole('textbox', {name:'나에게 남길 칭찬'}).fill('다정한 칭찬을 한 줄 더 남겼다.');
  await page.locator('button.ui-button--full', {hasText:'칭찬 남기기'}).click();
  await expect(page.getByRole('heading', {name:'나의 작은 노력을 한 번 더 알아봐 줬어요.'})).toBeVisible();
  await expect(page.getByText('하나의 눈꽃이 되었어요.')).toHaveCount(0);
});

test('entry review: first visitor sees brand and monthly introduction, reopening the same session is a return visit', async ({browser}) => {
  test.setTimeout(180_000);
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const page=await context.newPage();
  await page.goto('/?snowflakeDays=8&entryPreview=1');
  const intro=page.getByRole('dialog',{name:'다정록 첫 만남'});
  await expect(intro).toHaveAttribute('data-entry-scenario','first');
  await expect(intro.getByRole('heading',{name:'다정록'})).toBeVisible();
  await page.screenshot({path:'test-results/entry-first-brand-390.png'});
  await expect(intro).toHaveAttribute('data-entry-phase','intro',{timeout:8000});
  await page.screenshot({path:'test-results/entry-first-intro-390.png'});
  await intro.getByRole('button',{name:'건너뛰기'}).click();
  await expect(intro).toHaveCount(0);
  await expect(page.getByText('8일의 칭찬')).toBeVisible();
  await page.reload();
  const again=page.getByRole('dialog',{name:'다정록 첫 만남'});
  await expect(again).toHaveAttribute('data-entry-scenario','return');
  await page.screenshot({path:'test-results/entry-return-brand-390.png'});
  await expect(again).toHaveCount(0,{timeout:6000});
  await expect(page.locator('.home-artwork-stage .artwork-slot')).toHaveAttribute('data-written-days','8');
  await context.close();
});

test('entry review: zero-entry return and first encounter of a new month can be skipped; reduced motion stays still',async ({browser})=>{
  test.setTimeout(120_000);
  const context=await browser.newContext({viewport:{width:320,height:700},reducedMotion:'reduce'});
  const page=await context.newPage();
  for(const scenario of ['empty-return','new-month']){
    await page.goto('/?snowflakeDays=0&entryScenario='+scenario);
    const intro=page.getByRole('dialog',{name:'다정록 첫 만남'});
    await expect(intro).toHaveAttribute('data-entry-scenario',scenario);
    await expect(intro).toHaveAttribute('data-motion','off');
    if(scenario==='new-month') await expect(intro.getByRole('heading',{name:'새해 양'})).toBeVisible();
    await page.screenshot({path:'test-results/entry-'+scenario+'-320.png'});
    await intro.getByRole('button',{name:'홈으로'}).click();
    await expect(intro).toHaveCount(0);
  }
  await expect(page.getByText('오늘의 나에게 칭찬 하나 남겨볼까요?')).toBeVisible();
  await context.close();
});

test('reduced motion (OS or app setting): no replay, no particles, the after-state still', async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 860 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await open(page, 8);
  await expect(page.locator('[data-snowflake="static"]')).toHaveAttribute('data-live', 'off');
  await save(page);
  await expect(page.locator('.illustration-stage [data-snowflake="static"] canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2500);
  await expect(page.locator('[data-fx], [data-snowflake="event"]')).toHaveCount(0);
  await ctx.close();
  const p2 = await browser.newPage({ viewport: { width: 390, height: 860 } });
  await open(p2, 8);
  await p2.getByRole('button', { name: '설정' }).click();
  await p2.getByRole('switch').first().check({ force: true }); // the app's own reduced-motion setting (visually hidden native switch)
  await p2.getByRole('button', { name: '뒤로가기' }).click();
  await expect(p2.locator('[data-snowflake="static"]')).toHaveAttribute('data-live', 'off');
  await p2.close();
});
