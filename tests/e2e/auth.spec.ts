import { test, expect } from '@playwright/test';

test.describe('Authentication flows', () => {
  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/files');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.locator('text=Sign in to TutisCloud'),
    ).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('login shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPass123!');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('text=Invalid email or password'),
    ).toBeVisible();
  });

  test('forgot password flow', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('text=If an account exists with that email'),
    ).toBeVisible();
  });

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register');
    await expect(
      page.locator('text=Create your account'),
    ).toBeVisible();
    await expect(
      page.locator('input[name="acceptTerms"]'),
    ).toBeVisible();
  });

  test('registration validates password requirements', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Test');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('text=at least 8 characters'),
    ).toBeVisible();
  });

  test('registration validates password match', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Test');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'StrongPass1!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPass1!');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('text=Passwords do not match'),
    ).toBeVisible();
  });

  test('forgot password link on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.locator('a[href="/forgot-password"]'),
    ).toBeVisible();
  });

  test('register link on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.locator('a[href="/register"]'),
    ).toBeVisible();
  });
});
