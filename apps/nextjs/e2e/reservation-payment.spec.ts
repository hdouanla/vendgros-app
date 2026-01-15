import { test, expect } from "@playwright/test";

test.describe("Reservation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login as authenticated user
    // This would require setting up auth state or using API to create session
  });

  test("should create reservation from listing", async ({ page }) => {
    await page.goto("/listings/test-listing-id");

    // Set quantity
    await page.locator('input[type="number"]').fill("5");

    // Click reserve
    await page.getByRole("button", { name: /reserve/i }).click();

    // Confirm reservation in modal
    await page.getByRole("button", { name: /confirm/i }).click();

    // Should redirect to payment page
    await expect(page).toHaveURL(/\/payment\/[a-zA-Z0-9-]+/, { timeout: 10000 });
  });

  test("should display reservation details", async ({ page }) => {
    await page.goto("/reservations/test-reservation-id");

    // Check reservation details are shown
    await expect(page.locator("text=/reservation code/i")).toBeVisible();
    await expect(page.locator("text=/total price/i")).toBeVisible();
    await expect(page.locator("text=/deposit amount/i")).toBeVisible();
    await expect(page.locator("text=/balance due/i")).toBeVisible();
  });

  test("should show QR code after payment", async ({ page }) => {
    // Navigate to paid reservation
    await page.goto("/reservations/test-paid-reservation-id");

    // Check QR code is displayed
    await expect(page.locator("[data-testid='qr-code']")).toBeVisible();
    await expect(page.locator("text=/verification code/i")).toBeVisible();
  });
});

test.describe("Payment Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login as authenticated user
  });

  test("should display payment page", async ({ page }) => {
    await page.goto("/payment/test-reservation-id");

    // Check page title
    await expect(page).toHaveTitle(/Payment/i);

    // Check order summary
    await expect(page.locator("text=/order summary/i")).toBeVisible();
    await expect(page.locator("text=/deposit amount/i")).toBeVisible();
  });

  test("should show Stripe Elements payment form", async ({ page }) => {
    await page.goto("/payment/test-reservation-id");

    // Wait for Stripe Elements to load
    await expect(page.locator("[data-testid='payment-element']")).toBeVisible({
      timeout: 10000,
    });

    // Check submit button
    await expect(page.getByRole("button", { name: /pay now/i })).toBeVisible();
  });

  test("should redirect to reservation after successful payment", async ({ page }) => {
    await page.goto("/payment/test-reservation-id");

    // In a real test, we would use Stripe test card number
    // and fill the payment form, then submit

    // After successful payment, should redirect
    // await expect(page).toHaveURL(/\/reservations\/test-reservation-id/);
  });

  test("should show error on failed payment", async ({ page }) => {
    await page.goto("/payment/test-reservation-id");

    // Wait for Stripe Elements
    await page.waitForSelector("[data-testid='payment-element']", {
      timeout: 10000,
    });

    // In a real test, we would use Stripe test card that fails
    // and verify error message is shown

    // await expect(page.locator("text=/payment failed/i")).toBeVisible();
  });

  test("should redirect if already paid", async ({ page }) => {
    await page.goto("/payment/test-paid-reservation-id");

    // Should redirect back to reservation page
    await expect(page).toHaveURL(/\/reservations\/test-paid-reservation-id/, {
      timeout: 5000,
    });
  });
});
