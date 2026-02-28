import { test, expect } from '../fixtures/auth.fixture';

test.describe('Student explore-to-learn handoff', () => {
  test.use({ authenticatedStudent: true });

  test('navigates from explore topics to learn with topic query param', async ({ page }) => {
    await page.route('**/api/explore/pretest', async (route) => {
      await route.fulfill({
        status: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Pretest already completed for this subject' }),
      });
    });

    await page.route('**/api/explore/topics?subject=*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            {
              id: 'topic_e2e_fractions',
              name: 'Fractions Foundations',
              description: 'Understand equivalent fractions and comparisons.',
              gradeLevel: [5],
              estimatedDuration: 35,
              mastery: 22,
              masteryStatus: 'DEVELOPING',
              masteryDescription: 'Needs support',
            },
          ],
        }),
      });
    });

    await page.goto('/explore');
    await expect(page.getByRole('heading', { name: /explore subjects/i })).toBeVisible();

    await page.getByRole('button', { name: /math|mathematics/i }).first().click();

    await expect(page.getByRole('heading', { name: /topics/i })).toBeVisible();
    await expect(page.getByText(/fractions foundations/i)).toBeVisible();

    await page.getByRole('button', { name: /^start$/i }).click();

    await expect(page).toHaveURL(/\/learn\?topic=topic_e2e_fractions/);
    await expect(page.getByRole('heading', { name: /start a learning session/i })).toBeVisible();
  });
});
