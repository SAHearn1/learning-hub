import { test } from '@playwright/test';
import { setupAccessibilityChecks, checkAccessibility } from '../utils/a11y-helpers';

const publicPages = [
  { name: 'Homepage', path: '/' },
  { name: 'Methodology', path: '/methodology' },
  { name: 'Privacy', path: '/privacy' },
  { name: 'Terms', path: '/terms' },
  { name: 'Contact', path: '/contact' },
];

test.describe('Public Pages - Accessibility @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await setupAccessibilityChecks(page);
  });

  for (const { name, path } of publicPages) {
    test(`${name} page - WCAG 2.1 AA compliance`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await checkAccessibility(page);
    });
  }
});

// Note: Authenticated pages will be tested once authentication fixtures are implemented
test.describe('Authenticated Pages - Accessibility @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await setupAccessibilityChecks(page);
  });

  // TODO: Enable these tests once authentication fixtures are ready
  test.skip('Student Dashboard - WCAG 2.1 AA compliance', async ({ page }) => {
    // await authenticateAsStudent(page);
    await page.goto('/learn');
    await checkAccessibility(page);
  });

  test.skip('Educator Dashboard - WCAG 2.1 AA compliance', async ({ page }) => {
    // await authenticateAsEducator(page);
    await page.goto('/teach');
    await checkAccessibility(page);
  });

  test.skip('Parent Dashboard - WCAG 2.1 AA compliance', async ({ page }) => {
    // await authenticateAsParent(page);
    await page.goto('/parent');
    await checkAccessibility(page);
  });
});
