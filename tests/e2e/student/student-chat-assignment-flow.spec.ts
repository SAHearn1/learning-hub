import { test, expect } from '../fixtures/auth.fixture';

test.describe('Student chat and assignment flow', () => {
  test.use({ authenticatedStudent: true });

  test('log in, open assignment, chat with bot, and complete assessment', async ({ page }) => {
    // Mock chat streaming so the flow is deterministic and does not require external AI providers.
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: [
          'data: {"text":"Great question! Let\'s solve this together."}\n\n',
          'data: {"done":true}\n\n',
        ].join(''),
      });
    });

    // Log in (via fixture cookie/session injection) and open the learning assignment/chat.
    await page.goto('/learn');
    await expect(page.locator('body')).toBeVisible();

    const chatInput = page.getByPlaceholder(/type your message/i);
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Can you help me understand fractions?');
    await page.getByRole('button', { name: /send message/i }).click();

    await expect(page.getByText(/great question! let\'s solve this together\./i)).toBeVisible();

    // Open a diagnostic assignment and complete at least one item end-to-end.
    await page.goto('/assessments/diagnostic');
    await expect(page.getByRole('heading', { name: /diagnostic assessment/i })).toBeVisible();

    const answerBox = page.getByPlaceholder(/type your answer here/i).first();
    await expect(answerBox).toBeVisible();
    await answerBox.fill('My answer is 12 because I multiplied 3 by 4.');

    await page.getByRole('button', { name: /submit answer/i }).click();
    await expect(page.getByText(/score:/i)).toBeVisible();

    const completeButton = page.getByRole('button', { name: /complete assessment/i });
    const nextButton = page.getByRole('button', { name: /next question/i });
    if (await completeButton.count()) {
      await completeButton.click();
    } else if (await nextButton.count()) {
      await nextButton.click();
    }
  });
});
