import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation @a11y', () => {
  test('Tab navigation through interactive elements', async ({ page }) => {
    await page.goto('/');

    // Get all focusable elements
    const focusableElements = await page.evaluate(() => {
      const selector = 
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(document.querySelectorAll(selector)).length;
    });

    // Tab through all elements
    for (let i = 0; i < focusableElements; i++) {
      await page.keyboard.press('Tab');
    }

    // Shift+Tab back through all elements
    for (let i = 0; i < focusableElements; i++) {
      await page.keyboard.press('Shift+Tab');
    }
  });

  test('Skip to main content link', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab to focus skip link (should be first focusable element)
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('a[href="#main-content"], a:has-text("Skip to main")').first();
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeFocused();
      
      // Activate skip link
      await page.keyboard.press('Enter');
      
      // Main content should now be focused
      const mainContent = page.locator('#main-content, main').first();
      await expect(mainContent).toBeFocused();
    }
  });

  test('Modal - Keyboard trap and Escape to close', async ({ page }) => {
    await page.goto('/');
    
    // Open a modal (adjust selector as needed)
    const modalTrigger = page.locator('button:has-text("Open"), [data-modal-trigger]').first();
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      
      // Wait for modal to open
      const modal = page.locator('[role="dialog"], .modal').first();
      await expect(modal).toBeVisible();
      
      // Press Escape to close
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
      
      // Focus should return to trigger
      await expect(modalTrigger).toBeFocused();
    }
  });

  test('Dropdown menu - Arrow key navigation', async ({ page }) => {
    await page.goto('/');
    
    const dropdown = page.locator('[role="button"][aria-haspopup="true"]').first();
    if (await dropdown.count() > 0) {
      // Open dropdown with Enter
      await dropdown.focus();
      await page.keyboard.press('Enter');
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');
      
      // Close with Escape
      await page.keyboard.press('Escape');
    }
  });

  test('Form - Tab order and Enter to submit', async ({ page }) => {
    await page.goto('/contact'); // Or any page with a form
    
    // Tab to first input
    await page.keyboard.press('Tab');
    const firstInput = page.locator('input, textarea, select').first();
    if (await firstInput.count() > 0) {
      await expect(firstInput).toBeFocused();
      
      // Fill form with keyboard
      await page.keyboard.type('Test User');
      await page.keyboard.press('Tab');
      await page.keyboard.type('test@example.com');
      
      // Submit with Enter (if on submit button)
      await page.keyboard.press('Tab');
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        await expect(submitButton).toBeFocused();
        // Don't actually submit in test
      }
    }
  });
});
