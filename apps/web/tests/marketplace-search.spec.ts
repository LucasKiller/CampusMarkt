import { expect, test } from "@playwright/test";

const sampleSearchItems = [
  {
    id: "11111111-2222-3333-4444-555555555555",
    listingType: "SELL",
    title: "Calculus Textbook 3rd Edition",
    priceCents: 2450,
    category: "books_studies",
    pickupArea: "campus_nord_bienrode",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T10:00:00.000Z",
    coverImage: "listings/sample/cover.webp",
    seller: {
      publicId: "seller-1",
      displayName: "Alex Student",
      avatarUrl: null,
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
  },
  {
    id: "22222222-3333-4444-5555-666666666666",
    listingType: "SELL",
    title: "Vintage Oak Desk",
    priceCents: 4500,
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T09:00:00.000Z",
    coverImage: null,
    seller: {
      publicId: "seller-2",
      displayName: "Maria WG",
      avatarUrl: null,
      universityBadge: null,
    },
  },
  {
    id: "33333333-4444-5555-6666-777777777777",
    listingType: "WANTED",
    title: "Looking for Bicycle Lock",
    priceCents: 1500,
    category: "bicycles_mobility",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T08:00:00.000Z",
    coverImage: null,
    seller: {
      publicId: "seller-3",
      displayName: "Jonas Rad",
      avatarUrl: null,
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
  },
];

test.describe("Marketplace Search and Filters E2E Journeys (T16)", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept search API calls for fast, deterministic E2E assertions
    await page.route("**/api/marketplace/search*", async (route) => {
      const url = new URL(route.request().url());
      const query = (
        url.searchParams.get("q") ??
        url.searchParams.get("query") ??
        ""
      ).toLowerCase();
      const verifiedOnly =
        url.searchParams.get("verified") === "true" ||
        url.searchParams.get("verifiedOnly") === "true";

      if (query.includes("nonexistent")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { items: [], nextCursor: null, appliedFilters: { query } },
          }),
        });
      }

      let filtered = [...sampleSearchItems];

      if (query) {
        filtered = filtered.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query),
        );
      }

      if (verifiedOnly) {
        filtered = filtered.filter((item) =>
          Boolean(item.seller.universityBadge),
        );
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            items: filtered,
            nextCursor: null,
            appliedFilters: {
              query: query || undefined,
              verifiedOnly: verifiedOnly || undefined,
            },
          },
        }),
      });
    });
  });

  test("keyword search journey: searches for terms, updates URL, renders matching listings, and supports clear", async ({
    page,
  }) => {
    await page.goto("/search");

    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();

    // Type query and submit
    await searchInput.fill("Calculus");
    await page.locator('[data-testid="search-submit-button"]').click();

    // Verify URL synchronized
    await expect(page).toHaveURL(/q=Calculus/);

    // Verify results grid shows matching listing
    const resultsGrid = page.locator('[data-testid="search-results-grid"]');
    await expect(resultsGrid).toBeVisible();
    await expect(resultsGrid).toContainText("Calculus Textbook 3rd Edition");

    // Click clear button
    const clearButton = page.locator('[data-testid="search-clear-button"]');
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Input is cleared
    await expect(searchInput).toHaveValue("");
  });

  test("multi-facet filtering and sort journey (Desktop)", async ({ page }) => {
    await page.goto("/search?q=Textbook");

    // Change sort order
    const sortSelect = page.locator('[data-testid="sort-select"]');
    await expect(sortSelect).toBeVisible();
    await sortSelect.selectOption("price_asc");

    await expect(page).toHaveURL(/sort=price_asc/);

    // Toggle verified badge filter
    const verifiedToggle = page.locator('[data-testid="verified-toggle"]');
    await expect(verifiedToggle).toBeVisible();
    await verifiedToggle.check();

    await expect(page).toHaveURL(/verified=true/);

    // Click clear all filters
    const clearAllButton = page.locator('[data-testid="clear-all-filters"]');
    await expect(clearAllButton).toBeVisible();
    await clearAllButton.click();

    await expect(page).not.toHaveURL(/verified=true/);
  });

  test("mobile filter drawer journey (360px viewport)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/search");

    // Open filter drawer
    const openDrawerButton = page.locator('[data-testid="filter-drawer-open"]');
    await expect(openDrawerButton).toBeVisible();
    await openDrawerButton.click();

    const drawer = page.locator('[data-testid="filter-drawer"]');
    await expect(drawer).toBeVisible();

    // Fill price range
    const minPriceInput = page.locator('[data-testid="price-min-input"]');
    const maxPriceInput = page.locator('[data-testid="price-max-input"]');
    await minPriceInput.fill("10");
    await maxPriceInput.fill("50");

    // Toggle verified in drawer
    const drawerVerified = page.locator(
      '[data-testid="filter-drawer-verified"]',
    );
    await drawerVerified.check();

    // Apply filters
    const applyButton = page.locator('[data-testid="filter-drawer-apply"]');
    await applyButton.click();

    // Drawer closes
    await expect(drawer).not.toBeVisible();

    // URL has applied parameters
    await expect(page).toHaveURL(/minPrice=1000/);
    await expect(page).toHaveURL(/maxPrice=5000/);
    await expect(page).toHaveURL(/verified=true/);
  });

  test("empty state journey: displays message with reset button when 0 items match", async ({
    page,
  }) => {
    await page
      .context()
      .addCookies([
        { name: "NEXT_LOCALE", value: "de", url: "http://127.0.0.1:3100" },
      ]);
    await page.goto("/search?q=nonexistent");

    const emptyState = page.locator('[data-testid="search-empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("Keine Inserate gefunden");

    const resetButton = page.locator('[data-testid="empty-reset-filters"]');
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    await expect(emptyState).not.toBeVisible();
  });
});
