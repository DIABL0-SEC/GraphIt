import { test, expect } from '@playwright/test';

test.describe('GraphIt Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to initialize
    await expect(page.locator('text=GraphIt')).toBeVisible({ timeout: 10000 });
  });

  test('should show the main layout', async ({ page }) => {
    await page.goto('/');

    // Wait for initialization
    await page.waitForTimeout(2000);

    // Check sidebar is visible
    await expect(page.locator('[data-testid="sidebar"]').or(page.locator('text=Workspaces'))).toBeVisible();
  });

  test('should have query editor', async ({ page }) => {
    await page.goto('/');

    // Wait for Monaco editor to load
    await page.waitForTimeout(3000);

    // Check for Monaco editor container
    await expect(page.locator('.monaco-editor').first()).toBeVisible();
  });

  test('should create new tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Find and click the new tab button
    const newTabButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await newTabButton.click();

    // Check that a new tab was created
    await expect(page.locator('text=New Query')).toBeVisible();
  });

  test('should switch sidebar sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Click on settings icon
    const buttons = page.locator('button');
    await buttons.nth(3).click();

    // Check settings panel is shown
    await expect(page.locator('text=Theme').or(page.locator('text=Settings'))).toBeVisible();
  });

  test('should toggle theme', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Navigate to settings
    const buttons = page.locator('button');
    await buttons.nth(3).click();

    // Find theme selector
    await page.locator('text=Theme').waitFor();

    // Check dark mode can be selected
    await page.locator('button:has-text("System")').or(page.locator('[role="combobox"]').first()).click();
    await page.locator('text=Dark').click();

    // Check dark class is applied
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
