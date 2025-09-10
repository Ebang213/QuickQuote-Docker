import { test, expect } from '@playwright/test';

test('happy path updates total and downloads PDF', async ({ page }) => {
  await page.goto('/');

  // Change sqft
  const sqft = page.getByLabel(/Room Size/i);
  await sqft.fill('120');

  // Expect Total to be visible
  await expect(page.getByText(/Total/i)).toBeVisible();

  // Trigger PDF download
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Download PDF/i }).click(),
  ]);

  // Assert suggested filename
  expect(download.suggestedFilename()).toBe('QuickQuote_Estimate.pdf');
});

