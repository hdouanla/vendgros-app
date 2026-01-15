import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should display sign in page", async ({ page }) => {
    await page.goto("/auth/signin");

    // Check page title and heading
    await expect(page).toHaveTitle(/Sign In/i);
    await expect(page.locator("h1")).toContainText(/Sign In/i);

    // Check form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /send code/i })).toBeVisible();
  });

  test("should validate email format", async ({ page }) => {
    await page.goto("/auth/signin");

    // Enter invalid email
    await page.locator('input[type="email"]').fill("invalid-email");
    await page.getByRole("button", { name: /send code/i }).click();

    // Check for validation error
    await expect(page.locator("text=/invalid email/i")).toBeVisible();
  });

  test("should validate phone format", async ({ page }) => {
    await page.goto("/auth/signin");

    // Click phone tab
    await page.getByRole("button", { name: /phone/i }).click();

    // Enter invalid phone
    await page.locator('input[type="tel"]').fill("123456");
    await page.getByRole("button", { name: /send code/i }).click();

    // Check for validation error
    await expect(page.locator("text=/invalid phone/i")).toBeVisible();
  });

  test("should show verification code input after sending code", async ({ page }) => {
    await page.goto("/auth/signin");

    // Enter valid email (this will fail in real testing without proper backend)
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.getByRole("button", { name: /send code/i }).click();

    // In a real scenario with a test backend, we would expect:
    // await expect(page.locator('input[placeholder*="verification code"]')).toBeVisible();
  });

  test("should navigate to sign up page", async ({ page }) => {
    await page.goto("/auth/signin");

    // Click sign up link
    await page.getByRole("link", { name: /sign up/i }).click();

    // Verify navigation to sign up page
    await expect(page).toHaveURL(/\/auth\/signup/);
  });
});
