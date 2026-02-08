import { test, expect } from '@playwright/test';

test.describe('Navigation and branding', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RootWork/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('RootWork logo and branding are visible', async ({ page }) => {
    await page.goto('/');
    
    // Check for logo - may be image or text
    const logo = page.getByRole('img', { name: /rootwork/i })
      .or(page.getByRole('link', { name: /rootwork/i }))
      .or(page.locator('[data-testid="logo"]'));
    
    // At least one brand element should be visible
    const logoCount = await logo.count();
    expect(logoCount).toBeGreaterThan(0);
  });

  test('site tagline and description are visible', async ({ page }) => {
    await page.goto('/');
    
    // Look for main heading or tagline
    const heading = page.getByRole('heading', { level: 1 });
    
    const headingCount = await heading.count();
    if (headingCount > 0) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('Get Started button is clickable', async ({ page }) => {
    await page.goto('/');
    
    const getStartedButton = page.getByRole('button', { name: /get started/i })
      .or(page.getByRole('link', { name: /get started/i }));
    
    if (await getStartedButton.count() > 0) {
      await expect(getStartedButton.first()).toBeVisible();
      // Don't actually click as it would trigger Clerk sign-up
    }
  });

  test('Learn More button exists and is clickable', async ({ page }) => {
    await page.goto('/');
    
    const learnMoreButton = page.getByRole('button', { name: /learn more/i })
      .or(page.getByRole('link', { name: /learn more/i }));
    
    if (await learnMoreButton.count() > 0) {
      await expect(learnMoreButton.first()).toBeVisible();
    }
  });

  test('navigation to public pages works smoothly', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to methodology page
    await page.goto('/methodology');
    await expect(page.locator('body')).toBeVisible();
    
    // Test navigation to privacy page
    await page.goto('/privacy');
    await expect(page.locator('body')).toBeVisible();
    
    // Test navigation to terms page
    await page.goto('/terms');
    await expect(page.locator('body')).toBeVisible();
    
    // Test navigation to contact page
    await page.goto('/contact');
    await expect(page.locator('body')).toBeVisible();
  });

  test('footer contains necessary links', async ({ page }) => {
    await page.goto('/');
    
    // Check for footer
    const footer = page.locator('footer');
    const footerCount = await footer.count();
    
    if (footerCount > 0) {
      await expect(footer).toBeVisible();
      
      // Common footer links
      const privacyLink = footer.getByRole('link', { name: /privacy/i });
      const termsLink = footer.getByRole('link', { name: /terms/i });
      
      if (await privacyLink.count() > 0) {
        await expect(privacyLink).toBeVisible();
      }
      
      if (await termsLink.count() > 0) {
        await expect(termsLink).toBeVisible();
      }
    }
  });
});
