# E2E Testing Documentation

This directory contains end-to-end (E2E) tests for the RootWork Learning Hub application using Playwright.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Setup Instructions](#setup-instructions)
- [Running Tests](#running-tests)
- [Writing New Tests](#writing-new-tests)
- [Viewing Test Results](#viewing-test-results)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The E2E test suite validates user experience across all key user personas and workflows:

- **Students**: Learning, progress tracking, assessments
- **Educators**: Dashboard, student roster, assessment management
- **Parents**: Dashboard and settings
- **Admins**: Compliance and data retention
- **Shared**: Authentication, navigation, responsive design

## Test Structure

```
tests/e2e/
├── student/
│   ├── student-progress.spec.ts
│   ├── student-learning.spec.ts
│   └── student-navigation.spec.ts
├── educator/
│   ├── educator-dashboard.spec.ts
│   ├── educator-roster.spec.ts
│   └── educator-assessments.spec.ts
├── parent/
│   └── parent-dashboard.spec.ts
├── admin/
│   └── admin-compliance.spec.ts
├── shared/
│   ├── authentication.spec.ts
│   ├── navigation.spec.ts
│   ├── responsive.spec.ts
│   └── smoke.spec.ts
├── fixtures/
│   ├── auth.fixture.ts        # Authentication fixtures
│   └── test-data.fixture.ts   # Test data fixtures
└── helpers/
    ├── auth-helpers.ts         # Authentication utilities
    └── data-helpers.ts         # Data management utilities
```

## Setup Instructions

### Prerequisites

- Node.js 20 or later
- npm
- PostgreSQL database (for local testing)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

3. **Install system dependencies (Linux only):**
   ```bash
   npx playwright install-deps
   ```

### Environment Configuration

Create a `.env.test` file for test-specific environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rootwork_test?schema=public

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_TESTING_TOKEN=testing_token_from_clerk_dashboard
E2E_CLERK_USER_STUDENT_EMAIL=student.test@rootwork.edu
E2E_CLERK_USER_STUDENT_PASSWORD=change_me
E2E_CLERK_USER_EDUCATOR_EMAIL=educator.test@rootwork.edu
E2E_CLERK_USER_EDUCATOR_PASSWORD=change_me
E2E_CLERK_USER_PARENT_EMAIL=parent.test@rootwork.edu
E2E_CLERK_USER_PARENT_PASSWORD=change_me
E2E_CLERK_USER_ADMIN_EMAIL=admin.test@rootwork.edu
E2E_CLERK_USER_ADMIN_PASSWORD=change_me

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
BASE_URL=http://localhost:3000

# API Keys (can use placeholders for E2E tests)
ANTHROPIC_API_KEY=sk-ant-placeholder
STRIPE_SECRET_KEY=sk_test_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder

# Clerk E2E: bypasses CAPTCHA/bot-detection during programmatic sign-in
CLERK_TESTING_TOKEN=<from Clerk dashboard>

# Per-role test user credentials (fall back to defaults if unset)
E2E_CLERK_USER_STUDENT_EMAIL=student.test@rootwork.edu
E2E_CLERK_USER_STUDENT_PASSWORD=<password>
E2E_CLERK_USER_EDUCATOR_EMAIL=educator.test@rootwork.edu
E2E_CLERK_USER_EDUCATOR_PASSWORD=<password>
E2E_CLERK_USER_PARENT_EMAIL=parent.test@rootwork.edu
E2E_CLERK_USER_PARENT_PASSWORD=<password>
E2E_CLERK_USER_ADMIN_EMAIL=admin.test@rootwork.edu
E2E_CLERK_USER_ADMIN_PASSWORD=<password>
```

### Database Setup

1. **Create test database:**
   ```bash
   createdb rootwork_test
   ```

2. **Run migrations:**
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/rootwork_test npx prisma migrate deploy
   ```

3. **Seed test data:**
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/rootwork_test npm run db:seed
   ```

## Running Tests

### Run All Tests

```bash
# Run all E2E tests (headless mode)
npm run test:e2e
```

### Run Specific Test Files

```bash
# Run a specific test file
npx playwright test tests/e2e/shared/navigation.spec.ts

# Run all tests in a directory
npx playwright test tests/e2e/student/
```

### Run Tests by Pattern

```bash
# Run tests matching a pattern
npx playwright test student
npx playwright test authentication
```

### Run Tests in Different Modes

```bash
# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode (step through tests)
npm run test:e2e:debug

# Run with UI mode (interactive)
npm run test:e2e:ui
```

### Run on Specific Browsers

```bash
# Run on chromium only
npx playwright test --project=chromium

# Run on firefox only
npx playwright test --project=firefox

# Run on webkit (Safari) only
npx playwright test --project=webkit

# Run on mobile viewport
npx playwright test --project=mobile
```

### Run Specific Tests

```bash
# Run a single test by name
npx playwright test -g "homepage loads"

# Run tests matching regex pattern
npx playwright test -g "navigation"
```

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature name', () => {
  test('should do something', async ({ page }) => {
    // Navigate to page
    await page.goto('/path');
    
    // Interact with elements
    await page.click('button');
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Make assertions
    await expect(page.locator('h1')).toHaveText('Welcome');
  });
});
```

### Using Fixtures

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.use({ authenticatedStudent: true });

test('authenticated test', async ({ page }) => {
  // User is already authenticated as a student
  await page.goto('/learn');
  await expect(page).toHaveURL('/learn');
});
```

### Best Practices

1. **Use Playwright's auto-waiting**: Playwright automatically waits for elements to be actionable
   ```typescript
   // Good - auto-waits
   await page.click('button');
   
   // Avoid - manual waits
   await page.waitForTimeout(1000);
   ```

2. **Use semantic selectors**:
   ```typescript
   // Prefer role-based selectors
   await page.getByRole('button', { name: 'Submit' });
   
   // Use test IDs for dynamic content
   await page.locator('[data-testid="user-profile"]');
   
   // Avoid brittle selectors
   await page.locator('div > div > button.class1.class2');
   ```

3. **Test user behavior, not implementation**:
   ```typescript
   // Good - tests user action
   await page.click('text=Sign in');
   
   // Avoid - tests implementation
   await page.click('#sign-in-button-id-12345');
   ```

4. **Keep tests independent**:
   - Each test should be able to run alone
   - Don't rely on test execution order
   - Clean up test data if created

5. **Use descriptive test names**:
   ```typescript
   // Good
   test('user can search for students by name', async ({ page }) => {});
   
   // Avoid
   test('test1', async ({ page }) => {});
   ```

### Page Object Model (Optional)

For complex pages, consider using the Page Object Model:

```typescript
// pages/student-roster.page.ts
export class StudentRosterPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/educator/students');
  }
  
  async searchStudent(name: string) {
    await this.page.fill('[data-testid="search-input"]', name);
  }
  
  async getStudentCount() {
    return await this.page.locator('[data-testid="student-row"]').count();
  }
}

// In test file
import { StudentRosterPage } from '../pages/student-roster.page';

test('search filters students', async ({ page }) => {
  const rosterPage = new StudentRosterPage(page);
  await rosterPage.goto();
  await rosterPage.searchStudent('Alex');
  
  const count = await rosterPage.getStudentCount();
  expect(count).toBeGreaterThan(0);
});
```

## Viewing Test Results

### HTML Report

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

This opens an interactive report in your browser with:
- Test results and status
- Failed test screenshots
- Test execution timeline
- Detailed error messages

### Viewing Traces

If a test fails, view its trace for debugging:

```bash
npx playwright show-trace trace.zip
```

The trace viewer shows:
- Screenshots at each step
- DOM snapshots
- Network activity
- Console logs
- Test source code

### Screenshots and Videos

Failed tests automatically capture:
- **Screenshots**: Saved to `test-results/` directory
- **Videos**: Saved to `test-results/` directory (on failure)

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main` branch

The workflow is defined in `.github/workflows/e2e-tests.yml`

### Running Tests in CI

The CI environment automatically:
1. Sets up Node.js
2. Installs dependencies
3. Installs Playwright browsers
4. Runs database migrations
5. Executes tests with retries
6. Uploads test artifacts

### Viewing CI Results

1. Go to the Actions tab in GitHub
2. Select the workflow run
3. View test results in the summary
4. Download artifacts (screenshots, videos, reports)

## Troubleshooting

### Common Issues

#### Issue: Tests fail with "Timeout waiting for element"

**Solution:**
- Check if element selector is correct
- Verify element is actually rendered on the page
- Increase timeout if needed:
  ```typescript
  await page.waitForSelector('button', { timeout: 10000 });
  ```

#### Issue: Tests are flaky (sometimes pass, sometimes fail)

**Solutions:**
- Use Playwright's auto-waiting instead of manual waits
- Avoid `waitForTimeout` - use `waitForSelector` or `waitForLoadState`
- Check for race conditions (async operations completing at different times)
- Increase retries in `playwright.config.ts` temporarily to identify pattern

#### Issue: Authentication tests fail

**Solution:**
- Verify Clerk test keys are configured correctly
- Check that test user accounts exist
- Implement proper authentication fixtures (currently placeholder)
- Consider using Clerk's test mode or API tokens

#### Issue: Database connection errors

**Solutions:**
- Verify `DATABASE_URL` is correct in `.env.test`
- Check that PostgreSQL is running
- Ensure migrations are up to date
- Run `npx prisma generate` to regenerate Prisma client

#### Issue: Browser not found

**Solution:**
```bash
# Reinstall browsers
npx playwright install --with-deps
```

#### Issue: Port 3000 already in use

**Solutions:**
- Stop other processes using port 3000
- Change port in `playwright.config.ts`:
  ```typescript
  use: {
    baseURL: 'http://localhost:3001',
  },
  webServer: {
    command: 'PORT=3001 npm run dev',
    url: 'http://localhost:3001',
  }
  ```

### Debugging Tips

1. **Run test in headed mode:**
   ```bash
   npm run test:e2e:headed
   ```

2. **Use debug mode to step through:**
   ```bash
   npm run test:e2e:debug
   ```

3. **Add console logs:**
   ```typescript
   test('my test', async ({ page }) => {
     console.log('Current URL:', page.url());
     console.log('Page title:', await page.title());
   });
   ```

4. **Take manual screenshots:**
   ```typescript
   await page.screenshot({ path: 'debug-screenshot.png' });
   ```

5. **Pause execution:**
   ```typescript
   await page.pause(); // Opens Playwright Inspector
   ```

6. **Check network requests:**
   ```typescript
   page.on('request', request => console.log('>>', request.method(), request.url()));
   page.on('response', response => console.log('<<', response.status(), response.url()));
   ```

### Getting Help

- **Playwright Documentation**: https://playwright.dev
- **Playwright Discord**: https://aka.ms/playwright/discord
- **Project Issues**: Create an issue in the repository

## Test Coverage Goals

- ✅ Public pages (homepage, privacy, terms, etc.)
- ⚠️ Authentication flows (requires Clerk test configuration)
- ⚠️ Student portal (requires authentication)
- ⚠️ Educator portal (requires authentication)
- ⚠️ Parent portal (requires authentication)
- ⚠️ Admin portal (requires authentication)
- ✅ Responsive design across viewports
- ✅ Navigation flows

**Note**: Many tests are currently marked as `.skip()` because they require proper authentication setup with Clerk. Once authentication fixtures are fully implemented, these tests can be enabled.

## Future Improvements

- [ ] Implement full Clerk authentication in fixtures
- [ ] Add visual regression testing
- [ ] Implement API-based data seeding for tests
- [ ] Add accessibility (a11y) testing
- [ ] Implement parallel test execution with isolated databases
- [ ] Add performance testing metrics
- [ ] Create reusable page object models for complex pages
