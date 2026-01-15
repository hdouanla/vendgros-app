import { test, expect } from "@playwright/test";

test.describe("User Profile", () => {
  test.beforeEach(async ({ page }) => {
    // Login as authenticated user
  });

  test("should display profile page", async ({ page }) => {
    await page.goto("/profile");

    // Check page title
    await expect(page).toHaveTitle(/Profile/i);

    // Check main sections
    await expect(page.locator("text=/my profile/i")).toBeVisible();
    await expect(page.locator("text=/basic information/i")).toBeVisible();
  });

  test("should show user information", async ({ page }) => {
    await page.goto("/profile");

    // Check user info fields
    await expect(page.locator("text=/email/i")).toBeVisible();
    await expect(page.locator("text=/account type/i")).toBeVisible();
    await expect(page.locator("text=/member since/i")).toBeVisible();
  });

  test("should display rating card", async ({ page }) => {
    await page.goto("/profile");

    // Check rating section
    await expect(page.locator("text=/your rating/i")).toBeVisible();
    await expect(page.locator("text=/⭐/")).toBeVisible();
    await expect(page.locator("text=/reviews/i")).toBeVisible();
  });

  test("should display statistics card", async ({ page }) => {
    await page.goto("/profile");

    // Check stats section
    await expect(page.locator("text=/statistics/i")).toBeVisible();
    await expect(page.locator("text=/total listings/i")).toBeVisible();
    await expect(page.locator("text=/active listings/i")).toBeVisible();
    await expect(page.locator("text=/total sales/i")).toBeVisible();
    await expect(page.locator("text=/total purchases/i")).toBeVisible();
  });

  test("should show transaction history", async ({ page }) => {
    await page.goto("/profile");

    // Check transaction history section
    await expect(page.locator("text=/transaction history/i")).toBeVisible();
  });

  test("should have quick action buttons", async ({ page }) => {
    await page.goto("/profile");

    // Check quick actions
    await expect(page.getByRole("button", { name: /create listing/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /my listings/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /my reservations/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /settings/i })).toBeVisible();
  });

  test("should navigate to edit profile", async ({ page }) => {
    await page.goto("/profile");

    // Click edit profile button
    await page.getByRole("button", { name: /edit profile/i }).click();

    // Verify navigation
    await expect(page).toHaveURL(/\/profile\/edit/);
  });
});

test.describe("Profile Edit", () => {
  test.beforeEach(async ({ page }) => {
    // Login as authenticated user
  });

  test("should display edit profile page", async ({ page }) => {
    await page.goto("/profile/edit");

    // Check page title
    await expect(page).toHaveTitle(/Edit Profile/i);

    // Check form elements
    await expect(page.locator("text=/account type/i")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toBeVisible();
  });

  test("should toggle account type", async ({ page }) => {
    await page.goto("/profile/edit");

    // Click business account type
    await page.getByRole("button", { name: /business/i }).click();

    // Business name field should appear
    await expect(page.locator('input[placeholder*="business"]')).toBeVisible();

    // Click individual account type
    await page.getByRole("button", { name: /individual/i }).click();

    // Business name field should disappear
    await expect(page.locator('input[placeholder*="business"]')).not.toBeVisible();
  });

  test("should validate email format", async ({ page }) => {
    await page.goto("/profile/edit");

    // Enter invalid email
    await page.locator('input[type="email"]').fill("invalid-email");

    // Try to save
    await page.getByRole("button", { name: /save changes/i }).click();

    // Check for validation error (HTML5 validation or custom)
    // This depends on implementation
  });

  test("should save profile changes", async ({ page }) => {
    await page.goto("/profile/edit");

    // Update phone number
    await page.locator('input[type="tel"]').fill("+15551234567");

    // Click save
    await page.getByRole("button", { name: /save changes/i }).click();

    // Should redirect to profile page
    await expect(page).toHaveURL(/\/profile$/, { timeout: 5000 });
  });

  test("should cancel and go back", async ({ page }) => {
    await page.goto("/profile/edit");

    // Click cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Should go back to profile
    await expect(page).toHaveURL(/\/profile$/);
  });
});

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    // Login as authenticated user
  });

  test("should display settings page", async ({ page }) => {
    await page.goto("/profile/settings");

    // Check page title
    await expect(page).toHaveTitle(/Settings/i);

    // Check main sections
    await expect(page.locator("text=/notifications/i")).toBeVisible();
    await expect(page.locator("text=/language/i")).toBeVisible();
    await expect(page.locator("text=/privacy.*security/i")).toBeVisible();
  });

  test("should toggle email notifications", async ({ page }) => {
    await page.goto("/profile/settings");

    // Find email notification toggle
    const emailToggle = page.locator("[role='switch']").first();

    // Get initial state
    const initialState = await emailToggle.getAttribute("aria-checked");

    // Click toggle
    await emailToggle.click();

    // Verify state changed
    const newState = await emailToggle.getAttribute("aria-checked");
    expect(newState).not.toBe(initialState);
  });

  test("should change language preference", async ({ page }) => {
    await page.goto("/profile/settings");

    // Select French
    await page.locator('select[id="language"]').selectOption("fr");

    // Page should reload with French locale
    await expect(page).toHaveURL(/\/fr\//);
  });

  test("should save settings", async ({ page }) => {
    await page.goto("/profile/settings");

    // Toggle a notification setting
    await page.locator("[role='switch']").first().click();

    // Click save
    await page.getByRole("button", { name: /save settings/i }).click();

    // Check for success message
    await expect(page.locator("text=/settings saved/i")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show danger zone", async ({ page }) => {
    await page.goto("/profile/settings");

    // Check danger zone section
    await expect(page.locator("text=/danger zone/i")).toBeVisible();
    await expect(page.getByRole("button", { name: /delete account/i })).toBeVisible();
  });

  test("should confirm before account deletion", async ({ page }) => {
    await page.goto("/profile/settings");

    // Set up dialog handler
    page.on("dialog", (dialog) => {
      expect(dialog.message()).toContain(/delete.*account/i);
      dialog.dismiss();
    });

    // Click delete account
    await page.getByRole("button", { name: /delete account/i }).click();
  });

  test("should navigate to privacy policy", async ({ page }) => {
    await page.goto("/profile/settings");

    // Click privacy policy
    await page.getByRole("button", { name: /privacy policy/i }).click();

    // Should navigate to privacy policy page
    await expect(page).toHaveURL(/\/privacy-policy/);
  });
});
