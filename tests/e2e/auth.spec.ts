import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // API returns { error: 'Invalid credentials' } on bad login (HTTP 401).
    // Use getByText so the locator is not coupled to Tailwind class names.
    await expect(page.getByText('Invalid credentials')).toBeVisible({ timeout: 8000 });
  });

  test('redirects unauthenticated user from /portal to login', async ({ page }) => {
    await page.goto('/portal');
    await expect(page).toHaveURL('/');
  });

  test('redirects unauthenticated user from /operator to login', async ({ page }) => {
    await page.goto('/operator');
    await expect(page).toHaveURL('/');
  });
});
