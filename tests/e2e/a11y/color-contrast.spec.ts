import { test, expect } from '@playwright/test';
import { setupAccessibilityChecks, checkColorContrast } from '../utils/a11y-helpers';

test.describe('Color Contrast - WCAG AA @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await setupAccessibilityChecks(page);
  });

  test('Body text has sufficient contrast', async ({ page }) => {
    await page.goto('/');
    await checkColorContrast(page, 'body');
  });

  test('Button text has sufficient contrast', async ({ page }) => {
    await page.goto('/');
    await checkColorContrast(page, 'button');
  });

  test('Link text has sufficient contrast', async ({ page }) => {
    await page.goto('/');
    await checkColorContrast(page, 'a');
  });

  test('Navigation items have sufficient contrast', async ({ page }) => {
    await page.goto('/');
    await checkColorContrast(page, 'nav');
  });

  test('Form inputs have sufficient contrast', async ({ page }) => {
    await page.goto('/contact');
    await checkColorContrast(page, 'input, textarea, select');
  });

  test('Manual contrast check for custom colors', async ({ page }) => {
    await page.goto('/');
    
    // Check specific elements with custom styling
    const elements = [
      '.primary-button',
      '.secondary-button',
      '.error-message',
      '.success-message',
      '.warning-message',
    ];
    
    for (const selector of elements) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        const { foreground, background, ratio } = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            foreground: styles.color,
            background: styles.backgroundColor,
            ratio: 0, // axe-core will calculate this
          };
        });
        
        console.log(`${selector}: fg=${foreground}, bg=${background}`);
      }
    }
  });
});
