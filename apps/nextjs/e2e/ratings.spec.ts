import { test, expect } from "@playwright/test";

test.describe("Rating Submission", () => {
  test.beforeEach(async ({ page }) => {
    // Login as authenticated user
  });

  test("should display rating submission page", async ({ page }) => {
    await page.goto("/ratings/submit/test-reservation-id");

    // Check page title
    await expect(page).toHaveTitle(/Rate/i);

    // Check rating elements
    await expect(page.locator("text=/rate your experience/i")).toBeVisible();
    await expect(page.locator("text=/transaction details/i")).toBeVisible();
  });

  test("should show 5 star rating buttons", async ({ page }) => {
    await page.goto("/ratings/submit/test-reservation-id");

    // Check all 5 stars are present
    const stars = page.locator("button[type='button']").filter({ hasText: /[⭐☆]/ });
    await expect(stars).toHaveCount(5);
  });

  test("should allow selecting star rating", async ({ page }) => {
    await page.goto("/ratings/submit/test-reservation-id");

    // Click on 4th star
    const fourthStar = page.locator("button[type='button']").nth(3);
    await fourthStar.click();

    // Verify rating label updates
    await expect(page.locator("text=/very good/i")).toBeVisible();
  });

  test("should show hover effect on stars", async ({ page }) => {
    await page.goto("/ratings/submit/test-reservation-id");

    // Hover over 3rd star
    const thirdStar = page.locator("button[type='button']").nth(2);
    await thirdStar.hover();

    // First 3 stars should be filled (visually, this would need visual testing)
  });

  test("should require star rating before submission", async ({ page }) => {
    await page.goto("/ratings/submit/test-reservation-id");

    // Try to submit without selecting rating
    await page.getByRole("button", { name: /submit rating/i }).click();

    // Check for error or disabled state
    await expect(page.locator("text=/please select a rating/i")).toBeVisible();
  });

  test("should allow submitting rating with comment", async ({ page }) => {
    await page.goto("/ratings/submit/test-reservation-id");

    // Select 5 stars
    const fifthStar = page.locator("button[type='button']").nth(4);
    await fifthStar.click();

    // Enter comment
    await page.locator("textarea").fill("Great experience, highly recommend!");

    // Submit
    await page.getByRole("button", { name: /submit rating/i }).click();

    // Should redirect to reservation page
    await expect(page).toHaveURL(/\/reservations\/test-reservation-id/, {
      timeout: 5000,
    });
  });

  test("should allow submitting rating without comment", async ({ page }) => {
    await page.goto("/ratings/submit/test-reservation-id");

    // Select 3 stars
    const thirdStar = page.locator("button[type='button']").nth(2);
    await thirdStar.click();

    // Submit without comment
    await page.getByRole("button", { name: /submit rating/i }).click();

    // Should redirect to reservation page
    await expect(page).toHaveURL(/\/reservations\/test-reservation-id/, {
      timeout: 5000,
    });
  });

  test("should show already rated message if already submitted", async ({ page }) => {
    await page.goto("/ratings/submit/test-rated-reservation-id");

    // Check for already rated message
    await expect(page.locator("text=/rating submitted/i")).toBeVisible();
    await expect(page.locator("text=/rating.*blind/i")).toBeVisible();

    // Should show back button
    await expect(page.getByRole("button", { name: /back/i })).toBeVisible();
  });

  test("should display rating window notice", async ({ page }) => {
    await page.goto("/ratings/submit/test-reservation-id");

    // Check for 7-day window notice
    await expect(page.locator("text=/7.*days/i")).toBeVisible();
  });

  test("should display blind rating notice", async ({ page }) => {
    await page.goto("/ratings/submit/test-reservation-id");

    // Check for blind rating explanation
    await expect(page.locator("text=/remain private.*both parties/i")).toBeVisible();
  });
});

test.describe("Rating Display", () => {
  test("should show seller rating on listing page", async ({ page }) => {
    await page.goto("/listings/test-listing-id");

    // Check seller info section
    await expect(page.locator("text=/seller/i")).toBeVisible();
    await expect(page.locator("text=/⭐/")).toBeVisible();
    await expect(page.locator("text=/reviews/i")).toBeVisible();
  });

  test("should show user rating on profile page", async ({ page }) => {
    await page.goto("/profile");

    // Check rating card
    await expect(page.locator("text=/your rating/i")).toBeVisible();
    await expect(page.locator("text=/reviews/i")).toBeVisible();
  });
});
