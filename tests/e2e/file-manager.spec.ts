import { test, expect } from '@playwright/test';

test.describe('File Manager', () => {
  test('unauthenticated user redirected from /files to /login', async ({ page }) => {
    await page.goto('/files');
    await expect(page).toHaveURL(/\/login/);
  });

  test('files page shows empty state when no files', async ({ page }) => {
    // This test requires auth setup — placeholder for when auth E2E is configured
    // await page.goto('/files');
    // await expect(page.locator('text=This folder is empty')).toBeVisible();
  });
});
