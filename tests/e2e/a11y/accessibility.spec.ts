import { test, expect } from '@playwright/test';
import {
  setupAccessibilityChecks,
  checkAccessibility,
  checkColorContrast,
  checkKeyboardNavigation,
  checkHeadingHierarchy,
  checkAriaLabels,
} from '../utils/a11y-helpers';

test.describe('Accessibility Compliance @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await setupAccessibilityChecks(page);
  });

  test('Homepage - WCAG 2.1 AA compliance', async ({ page }) => {
    await page.goto('/');
    await checkAccessibility(page);
    await checkHeadingHierarchy(page);
  });

  test('Homepage - Color contrast', async ({ page }) => {
    await page.goto('/');
    await checkColorContrast(page, 'body');
  });

  test('Homepage - Keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await checkKeyboardNavigation(page, [
      'a[href]',
      'button',
      'input',
      'select',
      'textarea',
    ]);
  });

  test('Homepage - ARIA labels', async ({ page }) => {
    await page.goto('/');
    await checkAriaLabels(page);
  });
});
