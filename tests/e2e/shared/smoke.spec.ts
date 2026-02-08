import { test, expect } from '@playwright/test';

test.describe('Public pages load', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RootWork/);
  });

  test('methodology page loads', async ({ page }) => {
    await page.goto('/methodology');
    await expect(page.locator('body')).toBeVisible();
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('body')).toBeVisible();
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('body')).toBeVisible();
  });

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('body')).toBeVisible();
  });
});
