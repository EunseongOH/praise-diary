/** Run against the dist/ assets used to package the actual Apps-in-Toss
 * sandbox bundle, NOT the unrelated December reviewer webServer.
 * Validates that real snowflake Canvas pixels are nonempty for 1/5/15 days.
 */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const host = 'http://127.0.0.1:4184';
const child = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4184', '--strictPort'
], { stdio: 'inherit' });
let browser;
try {
  let started = false;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw Error('Vite preview process exited unexpectedly.');
    try { const r = await fetch(host); if (r.ok) { started = true; break; } } catch { /* wait for server */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!started) throw Error('Vite preview did not start in time.');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(String(err.message).slice(0, 200)));
  await page.goto(host, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /12월 눈꽃 렌더링 테스트/ }).click();
  await page.locator('[data-ait-snowflake-qa="true"]').waitFor();
  for (const day of [1, 5, 15]) {
    await page.getByRole('button', { name: String(day)+'일', exact: true }).click();
    await page.locator('[data-sample-day-count="'+day+'"]').waitFor();
    await page.locator('[data-snowflake-qa-status="painted"]').waitFor({ timeout: 20000 });
    const canvas = page.locator('[data-ait-snowflake-qa] canvas[data-testid="flake-canvas"]');
    const dimensions = await canvas.evaluate(el => ({ width: el.width, height: el.height }));
    if (dimensions.width <= 0 || dimensions.height <= 0) throw Error('Empty Canvas: '+day+' days');
    console.log('Snowflake sandbox Canvas painted:', day, 'days', dimensions);
  }
  if (errors.length) throw Error('JavaScript runtime errors: '+errors.join('; '));
  await page.getByRole('button', { name: '눈꽃 테스트 닫기' }).click();
  if (await page.locator('[data-ait-snowflake-qa="true"]').count()) throw Error('QA dialog remained open');
  await context.close();
  console.log('QA artwork rendering succeeded using actual review build assets.');
} finally {
  await browser?.close();
  child.kill('SIGTERM');
}
