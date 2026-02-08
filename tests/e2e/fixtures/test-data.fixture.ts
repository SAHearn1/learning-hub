import { test as base } from '@playwright/test';

/**
 * Test data fixture for Playwright tests
 * 
 * This fixture provides test data management capabilities.
 * It can be used to:
 * 1. Set up test data before tests run
 * 2. Clean up test data after tests complete
 * 3. Provide consistent test data across test suites
 */

type TestDataFixtures = {
  testStudent: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  testEducator: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

export const test = base.extend<TestDataFixtures>({
  testStudent: async ({}, use) => {
    // Use seed data from the database
    const student = {
      id: 'clerk_student_demo_001',
      email: 'alex.martinez@demo.rootwork.edu',
      firstName: 'Alex',
      lastName: 'Martinez',
    };
    await use(student);
    // Cleanup if needed
  },

  testEducator: async ({}, use) => {
    // Use seed data from the database
    const educator = {
      id: 'clerk_educator_demo_001',
      email: 'ms.johnson@demo.rootwork.edu',
      firstName: 'Sarah',
      lastName: 'Johnson',
    };
    await use(educator);
    // Cleanup if needed
  },
});

export { expect } from '@playwright/test';
