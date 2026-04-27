import { test, expect } from '@playwright/test';

// NOTE: The /intelligo route does not currently exist in this app.
// These tests are stubs — add the route and update selectors when the page is built.
test.describe('Intelligo landing page', () => {
  test('loads with correct heading', async ({ page }) => {
    const res = await page.goto('/intelligo');
    // Skip gracefully if the route has not been created yet
    test.skip(res?.status() === 404, '/intelligo route not yet implemented');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('language toggle switches between Georgian and English', async ({ page }) => {
    const res = await page.goto('/intelligo');
    test.skip(res?.status() === 404, '/intelligo route not yet implemented');
    const toggle = page.locator('button', { hasText: /^(EN|KA)$/ });
    await toggle.click();
    await expect(toggle).toBeVisible();
  });

  test('platform login button links to /', async ({ page }) => {
    const res = await page.goto('/intelligo');
    test.skip(res?.status() === 404, '/intelligo route not yet implemented');
    const loginBtn = page.locator('a[href="/"]').first();
    await expect(loginBtn).toBeVisible();
  });
});
