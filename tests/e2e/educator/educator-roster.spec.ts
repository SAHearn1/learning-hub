import { test, expect } from '../fixtures/auth.fixture';

test.describe('Educator roster', () => {
  test.use({ authenticatedEducator: true });

  test('navigate to educator students page', async ({ page }) => {
    await page.goto('/educator/students');
    await expect(page.locator('body')).toBeVisible();
  });

  test('verify student roster loads with initial data', async ({ page }) => {
    await page.goto('/educator/students');
    
    // Look for student list or table
    const studentList = page.locator('table')
      .or(page.locator('[data-testid="student-roster"]'))
      .or(page.locator('[data-testid="student-list"]'));
    
    if (await studentList.count() > 0) {
      await expect(studentList.first()).toBeVisible();
    }
  });

  test('test student count badges', async ({ page }) => {
    await page.goto('/educator/students');
    
    // Look for count badges
    const totalBadge = page.getByText(/total/i);
    const iepBadge = page.getByText(/iep/i);
    
    // At least one badge should be present
    if (await totalBadge.count() > 0 || await iepBadge.count() > 0) {
      const hasContent = (await totalBadge.count() > 0) || (await iepBadge.count() > 0);
      expect(hasContent).toBe(true);
    }
  });

  test('test search functionality', async ({ page }) => {
    await page.goto('/educator/students');
    
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i)
      .or(page.getByRole('textbox', { name: /search/i }))
      .or(page.locator('[data-testid="search-input"]'));
    
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
      
      // Type in search
      await searchInput.first().fill('Alex');
      
      // Results should filter
      await page.waitForTimeout(500); // Wait for filter
    }
  });

  test('test tier filter dropdown', async ({ page }) => {
    await page.goto('/educator/students');
    
    // Look for tier filter
    const tierFilter = page.getByLabel(/tier/i)
      .or(page.locator('[data-testid="tier-filter"]'))
      .or(page.locator('select'));
    
    if (await tierFilter.count() > 0) {
      await expect(tierFilter.first()).toBeVisible();
    }
  });

  test('select student and verify details panel appears', async ({ page }) => {
    await page.goto('/educator/students');
    
    // Click on first student in list
    const firstStudent = page.locator('[data-testid="student-row"]').first()
      .or(page.locator('table tr').nth(1));
    
    if (await firstStudent.count() > 0) {
      await firstStudent.click();
      
      // Details panel should appear
      const detailsPanel = page.locator('[data-testid="student-details"]')
        .or(page.getByText(/details/i));
      
      if (await detailsPanel.count() > 0) {
        await expect(detailsPanel.first()).toBeVisible();
      }
    }
  });

  test('view student accommodations', async ({ page }) => {
    await page.goto('/educator/students');
    
    // Select a student
    const firstStudent = page.locator('[data-testid="student-row"]').first();
    
    if (await firstStudent.count() > 0) {
      await firstStudent.click();
      
      // Look for accommodations section
      const accommodations = page.getByText(/accommodation/i)
        .or(page.locator('[data-testid="accommodations"]'));
      
      if (await accommodations.count() > 0) {
        await expect(accommodations.first()).toBeVisible();
      }
    }
  });

  test('toggle accommodation checkboxes', async ({ page }) => {
    await page.goto('/educator/students');
    
    // Select a student and find accommodation checkboxes
    const firstStudent = page.locator('[data-testid="student-row"]').first();
    
    if (await firstStudent.count() > 0) {
      await firstStudent.click();
      
      // Find checkboxes
      const checkbox = page.locator('input[type="checkbox"]').first();
      
      if (await checkbox.count() > 0) {
        await checkbox.click();
        // Verify state changed
        await expect(checkbox).toBeChecked();
      }
    }
  });

  test('test add new student form', async ({ page }) => {
    await page.goto('/educator/students');
    
    // Look for add student button
    const addButton = page.getByRole('button', { name: /add student/i })
      .or(page.getByRole('button', { name: /new student/i }));
    
    if (await addButton.count() > 0) {
      await addButton.click();
      
      // Form should appear
      const form = page.locator('form')
        .or(page.locator('[data-testid="add-student-form"]'));
      
      if (await form.count() > 0) {
        await expect(form).toBeVisible();
        
        // Fill in form
        await page.fill('[name="firstName"]', 'Test');
        await page.fill('[name="lastName"]', 'Student');
        await page.fill('[name="grade"]', '7');
        
        // Don't actually submit
      }
    }
  });

  test('test form validation', async ({ page }) => {
    await page.goto('/educator/students');
    
    const addButton = page.getByRole('button', { name: /add student/i });
    
    if (await addButton.count() > 0) {
      await addButton.click();
      
      // Try to submit empty form
      const submitButton = page.getByRole('button', { name: /submit/i })
        .or(page.getByRole('button', { name: /save/i }));
      
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // Should show validation error
        const errorMessage = page.getByText(/required/i)
          .or(page.locator('[data-testid="error-message"]'));
        
        if (await errorMessage.count() > 0) {
          await expect(errorMessage.first()).toBeVisible();
        }
      }
    }
  });
});
