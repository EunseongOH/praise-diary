/**
 * End-to-end MOTION verification against exact Vite dist/assets packaged in
 * the Apps-in-Toss QR sandbox bundle. A painted still frame is NOT a pass.
 *
 * Checks idle moving pixels, 0→1 first-day reveal, 4→5 growth,
 * same-day addition, 14→15 completion/reward, application and OS
 * reduced-motion, full scene replay and runtime errors.
 *
 * This is a Chromium WebView approximation; real Toss Android/iOS QR QA
 * remains a separate release gate.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const host = 'http://127.0.0.1:4184';
const child = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', 'preview',
  '--host', '127.0.0.1', '--port', '4184', '--strictPort',
], { stdio: 'inherit' });
let browser;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Real pixel sample; same alpha with moving glyph positions still changes RGB. */
async function sampleCanvas(canvas) {
  return canvas.evaluate(node => {
    const ctx = node.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw Error('No Canvas2D context');
    const pixels = ctx.getImageData(0, 0, node.width, node.height).data;
    let hash = 2166136261, painted = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 20) painted++;
      // Hash all channels of enough samples to catch subtle light/position motion.
      if (i % 20 === 0) {
        for (let k = 0; k < 4; k++) hash = Math.imul(hash ^ (pixels[i + k] ?? 0), 16777619) >>> 0;
      }
    }
    return { width: node.width, height: node.height, painted, hash };
  });
}
async function openQA(page) {
  await page.goto(host, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /12월 눈꽃 렌더링 테스트/ }).click();
  await page.locator('[data-ait-snowflake-qa="true"]').waitFor();
}
async function clickScenario(page, name, scenario) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.locator('[data-qa-scenario="' + scenario + '"]').waitFor();
}
async function waitPaint(page) {
  await page.locator('[data-snowflake-qa-status="painted"]').waitFor({ timeout: 25000 });
  const canvas = page.locator('[data-ait-snowflake-qa] canvas[data-testid="flake-canvas"]');
  await canvas.waitFor({ timeout: 12000 });
  const sample = await sampleCanvas(canvas);
  assert.ok(sample.width > 0 && sample.height > 0 && sample.painted > 20,
    'Canvas must contain REAL rendered glyph pixels: ' + JSON.stringify(sample));
  return { canvas, sample };
}
async function waitPlayback(page, timeout = 25000) {
  await page.locator('[data-qa-playback-phase="replaying"]').waitFor({ timeout });
  await page.locator('[data-qa-playback-phase="settled"]').waitFor({ timeout });
}
try {
  let started = false;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw Error('Vite preview process exited');
    try { const response = await fetch(host); if (response.ok) { started = true; break; } }
    catch { /* expected before bind */ }
    await sleep(250);
  }
  assert.ok(started, 'Vite preview must start');
  browser = await chromium.launch({ headless: true });
  mkdirSync('test-results', { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message.slice(0, 220)));
  await openQA(page);
  assert.equal(await page.locator('[data-qa-os-reduced]').getAttribute('data-qa-os-reduced'), 'false');

  // Idle: a still picture is a failure. The actual home I3 canvas must advance.
  const idle = await waitPaint(page);
  assert.equal(await page.locator('[data-snowflake="static"]').getAttribute('data-live'), 'on');
  await sleep(1100);
  const moved = await sampleCanvas(idle.canvas);
  assert.notEqual(moved.hash, idle.sample.hash, '15-day idle motion must move glyphs/light over real time');
  await page.screenshot({ path: 'test-results/ait-snowflake-qa-idle-motion.png', fullPage: true });
  console.log('PASS idle motion: actual Canvas pixels changed', idle.sample.hash, moved.hash);

  // One-day growth previously hung waiting for a nonexistent prior snapshot.
  await clickScenario(page, '첫 기록 성장', 'first');
  await page.locator('[data-snowflake="first-growth"]').waitFor({ timeout: 18000 });
  await page.locator('[data-snowflake="first-growth"][data-phase="replaying"]').waitFor();
  const firstEl = page.locator('[data-snowflake="first-growth"]');
  const clipBefore = await firstEl.evaluate(el => getComputedStyle(el).clipPath);
  await sleep(420);
  const clipAfter = await firstEl.evaluate(el => getComputedStyle(el).clipPath);
  assert.notEqual(clipAfter, clipBefore, 'First-day bottom→top reveal must animate its clip-path');
  await waitPaint(page);
  await page.locator('[data-snowflake="first-growth"][data-phase="settled"]').waitFor({ timeout: 6000 });
  console.log('PASS first-day 0→1 growth: animated bottom-up reveal and settled');

  // Date 4→5: the actual Saved event must progress to settled (not just render a static canvas).
  await clickScenario(page, '새 날짜 성장', 'growth');
  await page.locator('[data-snowflake="event"]').waitFor({ timeout: 22000 });
  await page.locator('canvas[data-fx="replay"]').waitFor({ timeout: 10000 });
  await waitPlayback(page);
  console.log('PASS new-date growth: replay event finishes');

  // Extra entry on the SAME date is a separate event, not a new recognized day.
  await clickScenario(page, '같은 날 추가', 'addition');
  assert.equal(await page.locator('[data-sample-day-count]').getAttribute('data-sample-day-count'), '5');
  await page.locator('[data-snowflake="event"]').waitFor({ timeout: 22000 });
  await waitPlayback(page);
  console.log('PASS same-day addition: replay event finishes');

  // 14→15 completion is an explicit research QA trigger only, not a
  // claim that December's production target is 15 days.
  await clickScenario(page, '15일 완성 연출', 'complete');
  await page.locator('[data-snowflake="event"]').waitFor({ timeout: 30000 });
  await page.locator('canvas[data-fx="reward"]').waitFor({ timeout: 40000 });
  await page.screenshot({ path: 'test-results/ait-snowflake-qa-completion-reward.png', fullPage: true });
  await page.locator('[data-qa-playback-phase="settled"]').waitFor({ timeout: 26000 });
  console.log('PASS 14→15 completion: actual replay and particle reward shown and settled');

  // Scene replay must work each time rather than being blocked by the "once per event ID" guard.
  await page.getByRole('button', { name: '이 장면 다시 보기' }).click();
  await page.locator('[data-qa-playback-phase="replaying"]').waitFor({ timeout: 30000 });
  await page.locator('canvas[data-fx="reward"]').waitFor({ timeout: 40000 });
  await page.locator('[data-qa-playback-phase="settled"]').waitFor({ timeout: 26000 });
  console.log('PASS manual replay of completion');

  await clickScenario(page, '움직임 줄이기', 'reduced');
  await waitPaint(page);
  assert.equal(await page.locator('[data-snowflake="static"]').getAttribute('data-live'), 'off');
  const reducedCanvas = page.locator('canvas[data-testid="flake-canvas"]');
  const reducedBefore = await sampleCanvas(reducedCanvas);
  await sleep(950);
  const reducedAfter = await sampleCanvas(reducedCanvas);
  assert.equal(reducedBefore.hash, reducedAfter.hash, 'App reduced motion must produce a still picture');
  console.log('PASS application reduced-motion still frame');

  await page.getByRole('button', { name: '눈꽃 테스트 닫기' }).click();
  assert.equal(await page.locator('[data-ait-snowflake-qa="true"]').count(), 0);
  assert.deepEqual(errors, [], 'No browser JS errors during full animation matrix');
  await context.close();

  // OS accessibility setting must prevent ANY autoplay, even when the
  // sandbox scene picker requests a motion variant.
  const reducedContext = await browser.newContext({
    viewport: { width: 390, height: 844 }, reducedMotion: 'reduce',
  });
  const reducedPage = await reducedContext.newPage();
  const reducedErrors = [];
  reducedPage.on('pageerror', error => reducedErrors.push(error.message.slice(0, 220)));
  await openQA(reducedPage);
  assert.equal(await reducedPage.locator('[data-qa-os-reduced]').getAttribute('data-qa-os-reduced'), 'true');
  await waitPaint(reducedPage);
  assert.equal(await reducedPage.locator('[data-snowflake="static"]').getAttribute('data-live'), 'off');
  await clickScenario(reducedPage, '첫 기록 성장', 'first');
  await waitPaint(reducedPage);
  assert.equal(await reducedPage.locator('[data-snowflake="event"],[data-snowflake="first-growth"]').count(), 0);
  assert.equal(await reducedPage.locator('[data-snowflake="static"]').getAttribute('data-live'), 'off');
  assert.deepEqual(reducedErrors, []);
  await reducedPage.screenshot({ path: 'test-results/ait-snowflake-qa-os-reduced.png', fullPage: true });
  await reducedContext.close();
  console.log('PASS OS prefers-reduced-motion: no autoplay or motion event');

  console.log('PASS all six AIT snowflake QA paths using the EXACT QR sandbox assets.');
} finally {
  await browser?.close();
  child.kill('SIGTERM');
}
