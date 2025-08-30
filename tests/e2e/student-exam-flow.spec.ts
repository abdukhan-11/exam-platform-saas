import { test, expect } from '@playwright/test';

test.describe('Student Exam Flow', () => {
  test('start → answer → submit → view result', async ({ page }) => {
    // Seed: assume an exam exists with id 'exam-123' and endTime in future
    const examId = 'exam-123';

    // Mock exam details
    await page.route(`**/api/exams/${examId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: examId,
          title: 'Demo Exam',
          duration: 30,
          totalMarks: 10,
          endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
      });
    });

    // Mock questions
    await page.route(`**/api/exams/${examId}/questions`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 'q1', text: '2+2=?', type: 'MULTIPLE_CHOICE', options: JSON.stringify([{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }]) },
            { id: 'q2', text: 'True?', type: 'TRUE_FALSE', options: JSON.stringify([{ text: 'true', isCorrect: true }, { text: 'false', isCorrect: false }]) }
          ]
        })
      });
    });

    // Mock answer sync
    await page.route(`**/api/exams/${examId}/answers`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    // Mock submit
    await page.route(`**/api/exams/${examId}/submit`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, score: 10, totalMarks: 10, percentage: 100 })
      });
    });

    // Mock result page API
    await page.route(`**/api/results/exams/${examId}/mine`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ score: 10, totalMarks: 10, percentage: 100 })
      });
    });

    // Go to student exam page
    await page.goto(`/dashboard/student/exams/${examId}`);

    // Wait for header
    await expect(page.getByText('Secure Exam')).toBeVisible();

    // Select first option for first question
    await page.locator('label').filter({ hasText: '4' }).click();
    await page.getByRole('button', { name: 'Next →' }).click();

    // Select true for second question
    await page.locator('label').filter({ hasText: 'true' }).click();
    await page.getByRole('button', { name: 'Finish Exam' }).click();

    // Confirm submit dialog
    await expect(page.getByText('Exam Summary:')).toBeVisible();
    await page.getByRole('button', { name: 'Submit Exam' }).click();

    // Should navigate to results page
    await expect(page).toHaveURL(`/dashboard/student/exams/${examId}/results`);
    await expect(page.getByText('Score:')).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
  });
});


