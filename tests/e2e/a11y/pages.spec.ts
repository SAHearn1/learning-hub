import { test as baseTest } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture';
import { setupAccessibilityChecks, checkAccessibility } from '../utils/a11y-helpers';

const publicPages = [
  { name: 'Homepage', path: '/' },
  { name: 'Methodology', path: '/methodology' },
  { name: 'Privacy', path: '/privacy' },
  { name: 'Terms', path: '/terms' },
  { name: 'Contact', path: '/contact' },
];

baseTest.describe('Public Pages - Accessibility @a11y', () => {
  baseTest.beforeEach(async ({ page }) => {
    await setupAccessibilityChecks(page);
  });

  for (const { name, path } of publicPages) {
    baseTest(`${name} page - WCAG 2.1 AA compliance`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await checkAccessibility(page);
    });
  }
});

authTest.describe('Student Dashboard - Accessibility @a11y', () => {
  authTest.use({ authenticatedStudent: undefined });

  authTest.beforeEach(async ({ page }) => {
    await setupAccessibilityChecks(page);
  });

  authTest('Student Dashboard - WCAG 2.1 AA compliance', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');
    await checkAccessibility(page);
  });
});

authTest.describe('Educator Dashboard - Accessibility @a11y', () => {
  authTest.use({ authenticatedEducator: undefined });

  authTest.beforeEach(async ({ page }) => {
    await setupAccessibilityChecks(page);
  });

  authTest('Educator Dashboard - WCAG 2.1 AA compliance', async ({ page }) => {
    await page.goto('/educator/dashboard');
    await page.waitForLoadState('networkidle');
    await checkAccessibility(page);
  });
});

authTest.describe('Parent Dashboard - Accessibility @a11y', () => {
  authTest.use({ authenticatedParent: undefined });

  authTest.beforeEach(async ({ page }) => {
    await setupAccessibilityChecks(page);
  });

  authTest('Parent Dashboard - WCAG 2.1 AA compliance', async ({ page }) => {
    await page.goto('/parent/dashboard');
    await page.waitForLoadState('networkidle');
    await checkAccessibility(page);
  });
});
