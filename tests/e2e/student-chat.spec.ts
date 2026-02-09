import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../helpers/auth';

test.describe('Student Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'STUDENT');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('should start a new tutoring session', async ({ page }) => {
    await page.goto('/learn');

    await expect(page.locator('[data-testid="phase-selector"]')).toBeVisible();

    await page.click('[data-testid="phase-root"]');

    await page.fill('[data-testid="chat-input"]', 'I need help with fractions');
    await page.click('[data-testid="send-message"]');

    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible();

    const sessionTitle = await page.locator('[data-testid="session-title"]').textContent();
    expect(sessionTitle).toBeTruthy();
  });

  test('should switch to Calm Corner when dysregulated', async ({ page }) => {
    await page.goto('/learn');

    await page.click('[data-testid="calm-corner-trigger"]');

    await expect(page.locator('[data-testid="calm-corner-modal"]')).toBeVisible();

    await page.click('[data-testid="breathing-exercise"]');

    await page.waitForSelector('[data-testid="exercise-complete"]', { timeout: 10000 });

    await page.click('[data-testid="return-to-chat"]');
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
  });
});
