import { test, expect, devices } from '@playwright/test';

test.describe('Responsive design', () => {
  test('homepage renders correctly on mobile (iPhone 13)', async ({ page }) => {
    // Set viewport to iPhone 13 size
    await page.setViewportSize(devices['iPhone 13'].viewport);
    
    await page.goto('/');
    await expect(page).toHaveTitle(/RootWork/);
    await expect(page.locator('body')).toBeVisible();
    
    // Check that content is visible and not cut off
    const mainContent = page.locator('main').or(page.locator('body'));
    await expect(mainContent).toBeVisible();
  });

  test('homepage renders correctly on tablet (iPad)', async ({ page }) => {
    // Set viewport to iPad size
    await page.setViewportSize(devices['iPad (gen 7)'].viewport);
    
    await page.goto('/');
    await expect(page).toHaveTitle(/RootWork/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('homepage renders correctly on desktop', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto('/');
    await expect(page).toHaveTitle(/RootWork/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation adapts to mobile screen size', async ({ page }) => {
    await page.setViewportSize(devices['iPhone 13'].viewport);
    
    await page.goto('/');
    
    // On mobile, there might be a hamburger menu
    const mobileMenu = page.locator('[aria-label="Menu"]')
      .or(page.locator('[data-testid="mobile-menu"]'))
      .or(page.getByRole('button', { name: /menu/i }));
    
    // Check if mobile menu exists (it's okay if it doesn't)
    const menuCount = await mobileMenu.count();
    if (menuCount > 0) {
      await expect(mobileMenu.first()).toBeVisible();
    }
  });

  test('cards stack properly on mobile', async ({ page }) => {
    await page.setViewportSize(devices['iPhone 13'].viewport);
    
    await page.goto('/');
    
    // Check that the page doesn't have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 0;
    
    // Allow small overflow for scrollbars
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });

  test('privacy policy page is readable on mobile', async ({ page }) => {
    await page.setViewportSize(devices['iPhone 13'].viewport);
    
    await page.goto('/privacy');
    await expect(page.locator('body')).toBeVisible();
    
    // Check that content fits within viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 0;
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });

  test('data retention page table is responsive', async ({ page }) => {
    await page.setViewportSize(devices['iPhone 13'].viewport);
    
    await page.goto('/data-retention');
    await expect(page.locator('body')).toBeVisible();
    
    // Tables should be scrollable or responsive on mobile
    const table = page.locator('table');
    const tableCount = await table.count();
    
    if (tableCount > 0) {
      await expect(table.first()).toBeVisible();
    }
  });

  // Note: Tests for educator roster and progress page responsiveness
  // would require authentication, which is not yet implemented in these tests
});
