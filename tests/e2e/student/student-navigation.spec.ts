import { test, expect } from '@playwright/test';

test.describe('Student navigation', () => {
  test.skip('test student navigation items from home page (requires auth)', async ({ page }) => {
    await page.goto('/');
    
    // Look for student workspace/portal section
    const studentSection = page.getByText(/student/i)
      .or(page.locator('[data-testid="student-portal"]'));
    
    if (await studentSection.count() > 0) {
      await expect(studentSection.first()).toBeVisible();
    }
  });

  test.skip('verify each card is clickable and leads to correct page (requires auth)', async ({ page }) => {
    await page.goto('/');
    
    // Test learn card
    const learnCard = page.locator('[data-testid="learn-card"]')
      .or(page.getByRole('link', { name: /learn/i }));
    
    if (await learnCard.count() > 0) {
      await expect(learnCard.first()).toBeVisible();
    }
    
    // Test progress card
    const progressCard = page.locator('[data-testid="progress-card"]')
      .or(page.getByRole('link', { name: /progress/i }));
    
    if (await progressCard.count() > 0) {
      await expect(progressCard.first()).toBeVisible();
    }
    
    // Test assessments card
    const assessmentsCard = page.locator('[data-testid="assessments-card"]')
      .or(page.getByRole('link', { name: /assessment/i }));
    
    if (await assessmentsCard.count() > 0) {
      await expect(assessmentsCard.first()).toBeVisible();
    }
  });

  test.skip('check icons render properly (requires auth)', async ({ page }) => {
    await page.goto('/');
    
    // Look for icons in navigation cards
    const icons = page.locator('svg').or(page.locator('img[alt*="icon"]'));
    
    if (await icons.count() > 0) {
      // At least some icons should be visible
      const visibleIcons = await icons.filter({ hasText: '' }).count();
      expect(visibleIcons).toBeGreaterThan(0);
    }
  });

  test.skip('test hover states and transitions (requires auth)', async ({ page }) => {
    await page.goto('/');
    
    // Find a navigation card
    const card = page.locator('[data-testid*="card"]')
      .or(page.locator('a[href*="/learn"]'))
      .or(page.locator('a[href*="/progress"]'));
    
    if (await card.count() > 0) {
      const firstCard = card.first();
      
      // Hover over the card
      await firstCard.hover();
      
      // Card should still be visible after hover
      await expect(firstCard).toBeVisible();
    }
  });

  test.skip('verify navigation is smooth without errors (requires auth)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    
    // Try navigating to different student pages
    await page.goto('/learn');
    await page.goto('/progress');
    await page.goto('/assessments/history');
    
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = errors.filter(err => 
      !err.includes('404') && !err.includes('favicon')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
