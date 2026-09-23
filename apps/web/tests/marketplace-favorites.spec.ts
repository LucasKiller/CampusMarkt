import { expect, test } from "@playwright/test";

test.describe("Marketplace Favorites E2E Journeys (T16)", () => {
  test("guest visitor journey: clicking favorite redirects to login with next parameter", async ({
    page,
  }) => {
    // Visit home page with public feed
    await page.goto("/");

    // Locate favorite button on a listing card
    const firstFavoriteBtn = page
      .locator('[data-testid^="favorite-button-"]')
      .first();
    await expect(firstFavoriteBtn).toBeVisible({ timeout: 10000 });

    // Click favorite as unauthenticated guest
    await firstFavoriteBtn.click();

    // Verify redirected to login with next param
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("guest dashboard protection: visiting /favorites redirects to login", async ({
    page,
  }) => {
    await page.goto("/favorites");
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)favorites/);
  });

  test("authenticated empty state journey: displays message with CTA to explore feed", async ({
    page,
    context,
  }) => {
    // Set test authentication cookie
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "authenticated",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/favorites");

    // Verify empty state is displayed
    const emptyState = page.locator('[data-testid="favorites-empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("Deine Merkliste ist leer");

    // Click explore feed CTA
    const exploreCta = page.locator('[data-testid="explore-feed-cta"]');
    await expect(exploreCta).toBeVisible();
    await exploreCta.click();

    // Verify navigates to /feed
    await expect(page).toHaveURL(/\/feed/);
  });

  test("authenticated dashboard items journey: displays saved listings with status chips and handles remove & undo", async ({
    page,
    context,
  }) => {
    // Set authenticated session and test items cookie
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "authenticated",
        domain: "127.0.0.1",
        path: "/",
      },
      {
        name: "campusmarkt-test-items",
        value: "true",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/favorites");

    // Verify grid of saved items is displayed
    const grid = page.locator('[data-testid="favorites-grid"]');
    await expect(grid).toBeVisible();

    // Verify active item
    const activeItem = page.locator(
      '[data-testid="favorite-item-11111111-2222-3333-4444-555555555555"]',
    );
    await expect(activeItem).toBeVisible();
    await expect(activeItem).toContainText("Calculus Textbook 3rd Edition");

    // Verify reserved item with status badge
    const reservedItem = page.locator(
      '[data-testid="favorite-item-22222222-3333-4444-5555-666666666666"]',
    );
    await expect(reservedItem).toBeVisible();
    const reservedBadge = page.locator(
      '[data-testid="status-badge-reserved-22222222-3333-4444-5555-666666666666"]',
    );
    await expect(reservedBadge).toBeVisible();
    await expect(reservedBadge).toContainText("Reserviert");

    // Verify sold item with status badge
    const soldItem = page.locator(
      '[data-testid="favorite-item-33333333-4444-5555-6666-777777777777"]',
    );
    await expect(soldItem).toBeVisible();
    const soldBadge = page.locator(
      '[data-testid="status-badge-sold-33333333-4444-5555-6666-777777777777"]',
    );
    await expect(soldBadge).toBeVisible();
    await expect(soldBadge).toContainText("Verkauft");

    // Remove active item
    const removeBtn = page.locator(
      '[data-testid="remove-favorite-11111111-2222-3333-4444-555555555555"]',
    );
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    // Item is optimistically removed
    await expect(activeItem).not.toBeVisible();

    // Undo toast appears
    const undoToast = page.locator('[data-testid="favorites-undo-toast"]');
    await expect(undoToast).toBeVisible();
    await expect(undoToast).toContainText("Calculus Textbook 3rd Edition");

    // Click undo
    const undoBtn = page.locator('[data-testid="favorites-undo-button"]');
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    // Item is restored to the list
    await expect(activeItem).toBeVisible();
    await expect(undoToast).not.toBeVisible();
  });
});
