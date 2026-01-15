import { test, expect } from "@playwright/test";

test.describe("Listing Search and Browse", () => {
  test("should display listings search page", async ({ page }) => {
    await page.goto("/listings/search");

    // Check page title
    await expect(page).toHaveTitle(/Search/i);

    // Check search form elements
    await expect(page.locator('input[placeholder*="postal code"]')).toBeVisible();
    await expect(page.locator('select[name="radiusKm"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /search/i })).toBeVisible();
  });

  test("should validate postal code format", async ({ page }) => {
    await page.goto("/listings/search");

    // Enter invalid postal code
    await page.locator('input[placeholder*="postal code"]').fill("invalid");
    await page.getByRole("button", { name: /search/i }).click();

    // Check for validation error
    await expect(page.locator("text=/invalid.*postal code/i")).toBeVisible();
  });

  test("should perform search with valid postal code", async ({ page }) => {
    await page.goto("/listings/search");

    // Enter valid Canadian postal code
    await page.locator('input[placeholder*="postal code"]').fill("M5H 2N2");

    // Select radius
    await page.locator('select[name="radiusKm"]').selectOption("10");

    // Click search
    await page.getByRole("button", { name: /search/i }).click();

    // Wait for results or empty state
    await expect(
      page.locator("text=/no listings found/i, [data-testid='listing-card']")
    ).toBeVisible({ timeout: 10000 });
  });

  test("should toggle between grid and map view", async ({ page }) => {
    await page.goto("/listings/search?postalCode=M5H2N2&radiusKm=10");

    // Check grid view is default
    await expect(page.locator("[data-testid='grid-view']")).toBeVisible();

    // Click map view button
    await page.getByRole("button", { name: /map/i }).click();

    // Check map view is shown
    await expect(page.locator("[data-testid='map-view']")).toBeVisible();

    // Click grid view button
    await page.getByRole("button", { name: /grid/i }).click();

    // Check grid view is shown again
    await expect(page.locator("[data-testid='grid-view']")).toBeVisible();
  });

  test("should navigate to listing detail page", async ({ page }) => {
    await page.goto("/listings/search?postalCode=M5H2N2&radiusKm=10");

    // Wait for listing cards
    const listingCard = page.locator("[data-testid='listing-card']").first();

    if (await listingCard.isVisible()) {
      await listingCard.click();

      // Verify navigation to detail page
      await expect(page).toHaveURL(/\/listings\/[a-zA-Z0-9-]+/);

      // Check detail page elements
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByRole("button", { name: /reserve/i })).toBeVisible();
    }
  });
});

test.describe("Listing Detail Page", () => {
  test("should display listing details", async ({ page }) => {
    // Navigate to a specific listing (this would require a known test listing ID)
    await page.goto("/listings/test-listing-id");

    // Check for key elements
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=/price/i")).toBeVisible();
    await expect(page.locator("text=/quantity/i")).toBeVisible();
    await expect(page.locator("text=/pickup address/i")).toBeVisible();
  });

  test("should show reserve modal when clicking reserve", async ({ page }) => {
    await page.goto("/listings/test-listing-id");

    // Click reserve button
    await page.getByRole("button", { name: /reserve/i }).click();

    // Check modal is shown
    await expect(page.locator("[role='dialog']")).toBeVisible();
    await expect(page.locator("text=/confirm reservation/i")).toBeVisible();
  });

  test("should validate quantity input", async ({ page }) => {
    await page.goto("/listings/test-listing-id");

    // Enter quantity exceeding available
    await page.locator('input[type="number"]').fill("99999");

    // Click reserve
    await page.getByRole("button", { name: /reserve/i }).click();

    // Check for validation error
    await expect(page.locator("text=/exceeds available/i")).toBeVisible();
  });
});
