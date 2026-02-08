import { test, expect } from '@playwright/test';

test.describe('Compliance pages', () => {
  test('privacy, terms, and data retention pages are accessible', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /privacy/i })).toBeVisible();

    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /terms/i })).toBeVisible();

    await page.goto('/data-retention');
    await expect(page.getByRole('heading', { name: /data retention/i })).toBeVisible();
  });
});
