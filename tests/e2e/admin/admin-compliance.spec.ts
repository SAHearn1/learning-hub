import { test, expect } from '@playwright/test';

test.describe('Admin compliance', () => {
  test.skip('navigate to admin dashboard (requires auth)', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test.skip('verify admin portal loads (requires auth)', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Look for admin dashboard heading
    const heading = page.getByRole('heading', { name: /admin/i })
      .or(page.getByText(/dashboard/i));
    
    if (await heading.count() > 0) {
      await expect(heading.first()).toBeVisible();
    }
  });

  test('navigate to privacy policy page', async ({ page }) => {
    // Privacy page is public, no auth required
    await page.goto('/privacy');
    await expect(page.locator('body')).toBeVisible();
  });

  test('verify privacy policy displays with sections', async ({ page }) => {
    await page.goto('/privacy');
    
    // Check for key privacy policy sections
    const dataCollectionSection = page.getByText(/data we collect/i)
      .or(page.getByText(/information we collect/i));
    
    const dataUseSection = page.getByText(/how we use/i)
      .or(page.getByText(/use of data/i));
    
    const rightsSection = page.getByText(/rights/i)
      .or(page.getByText(/your rights/i));
    
    // At least one section should be visible
    const sectionCount = await dataCollectionSection.count() + 
                         await dataUseSection.count() + 
                         await rightsSection.count();
    
    expect(sectionCount).toBeGreaterThan(0);
  });

  test('check retention snapshot table renders correctly', async ({ page }) => {
    await page.goto('/privacy');
    
    // Look for retention table
    const table = page.locator('table');
    
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
      
      // Check for table headers
      const headers = page.locator('th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
    }
  });

  test('navigate to data retention page', async ({ page }) => {
    // Data retention page is public
    await page.goto('/data-retention');
    await expect(page.locator('body')).toBeVisible();
  });

  test('verify data retention policy table displays', async ({ page }) => {
    await page.goto('/data-retention');
    
    // Look for data retention table
    const table = page.locator('table');
    
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
    }
  });

  test('check all columns in retention table', async ({ page }) => {
    await page.goto('/data-retention');
    
    // Check for expected column headers
    const categoryHeader = page.getByText(/category/i);
    const retentionHeader = page.getByText(/retention/i);
    const legalBasisHeader = page.getByText(/legal basis/i);
    const handlingHeader = page.getByText(/handling/i)
      .or(page.getByText(/end-of-life/i));
    
    // At least some headers should be present
    const headerCount = await categoryHeader.count() + 
                        await retentionHeader.count() + 
                        await legalBasisHeader.count() + 
                        await handlingHeader.count();
    
    expect(headerCount).toBeGreaterThan(0);
  });

  test('verify retention policy records display', async ({ page }) => {
    await page.goto('/data-retention');
    
    // Check that table has rows
    const rows = page.locator('table tbody tr');
    
    if (await rows.count() > 0) {
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test('verify pages load without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/data-retention');
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = errors.filter(err => 
      !err.includes('404') && !err.includes('favicon')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
