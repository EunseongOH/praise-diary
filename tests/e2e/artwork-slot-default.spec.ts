/** Default build (snowflake flag OFF = production default): every screen keeps the existing placeholder slot. */
import { test, expect } from '@playwright/test';

test('flag off: no snowflake renderer, no canvas, the existing placeholder contract stays', async ({ page }) => {
  await page.route('https://**/*', r => r.abort());
  await page.goto('/');
  await page.getByRole('button', { name: '도감', exact: true }).click();
  await expect(page.locator('.artwork-slot--snowflake')).toHaveCount(0);
  await expect(page.locator('.month-tiles canvas')).toHaveCount(0);
  expect(await page.evaluate(() => typeof (window as Window & { __snowflakeReview?: unknown }).__snowflakeReview)).toBe('undefined');
});
