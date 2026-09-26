import { expect, test } from "@playwright/test";

const sampleFeedItems = [
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
    listingType: "GIVE_AWAY",
    title: "Free Desk Lamp",
    priceCents: null,
    category: "furniture",
    pickupArea: "campus_tu_altgebaeude",
    condition: "FAIR",
    status: "reserved",
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

const page2FeedItems = [
  {
    id: "44444444-5555-6666-7777-888888888888",
    listingType: "SELL",
    title: "Computer Monitor 24-inch",
    priceCents: 6000,
    category: "electronics",
    pickupArea: "westliches_ringgebiet",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T07:00:00.000Z",
    coverImage: null,
    seller: {
      publicId: "seller-4",
      displayName: "Stefan Tech",
      avatarUrl: null,
      universityBadge: null,
    },
  },
];

const sampleDetails = {
  ...sampleFeedItems[0],
  description:
    "Comprehensive calculus textbook in great condition. Minimal highlights, ideal for engineering students at TU Braunschweig.",
  images: [
    { storagePath: "listings/sample/cover.webp", position: 0 },
    { storagePath: "listings/sample/photo2.webp", position: 1 },
  ],
};

const soldDetails = {
  ...sampleDetails,
  id: "sold-listing-id-1234",
  title: "Sold Vintage Desk",
  status: "sold",
};

test.describe("Marketplace Feed and Listing Details E2E Journeys (T16)", () => {
  test.beforeEach(async ({ page }) => {
    await page
      .context()
      .addCookies([
        { name: "NEXT_LOCALE", value: "de", url: "http://127.0.0.1:3100" },
      ]);
    // Intercept feed API calls for reliable deterministic testing
    await page.route("**/api/marketplace/feed*", async (route) => {
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get("cursor");
      const category = url.searchParams.get("category");
      const pickupArea = url.searchParams.get("pickupArea");

      if (category === "furniture" && pickupArea === "weststadt") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { items: [], nextCursor: null },
          }),
        });
      }

      if (category === "furniture") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              items: sampleFeedItems.filter((i) => i.category === "furniture"),
              nextCursor: null,
            },
          }),
        });
      }

      if (cursor === "test-page-2-cursor") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { items: page2FeedItems, nextCursor: null },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            items: sampleFeedItems,
            nextCursor: "test-page-2-cursor",
          },
        }),
      });
    });

    // Intercept listing details API
    await page.route("**/api/marketplace/listings/*", async (route) => {
      const url = route.request().url();
      if (url.includes("sold-listing-id-1234")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, data: soldDetails }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: sampleDetails }),
      });
    });
  });

  test("Journey 1: browse public feed with titles, prices, reserved tags, and trust badges", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify page header and hero branding
    await expect(page.locator("a.brand")).toHaveText("CampusMarkt");
    await expect(
      page.getByRole("heading", { name: "Dein Marktplatz für Braunschweig" }),
    ).toBeVisible();

    // Verify listing cards render
    await expect(page.getByText("Calculus Textbook 3rd Edition")).toBeVisible();
    await expect(page.getByText("€24.50")).toBeVisible();
    await expect(page.getByText("Free Desk Lamp")).toBeVisible();
    await expect(page.getByText("Zu verschenken").first()).toBeVisible();

    // Verify reserved badge on reserved item
    await expect(page.getByText("Reserviert").first()).toBeVisible();

    // Verify seller trust badge for verified student
    await expect(
      page.getByLabel("TU Braunschweig verifiziert").first(),
    ).toBeVisible();

    // Verify zero-image WANTED placeholder
    await expect(page.getByText("Looking for Bicycle Lock")).toBeVisible();
    await expect(page.getByLabel("Gesuch ohne Foto").first()).toBeVisible();
  });

  test("Journey 2: filter feed by category and reset filters on empty results", async ({
    page,
  }) => {
    await page.goto("/");

    // Filter by Category: Möbel & Wohnen (furniture)
    const categorySelect = page.locator("#filter-category-select");
    await categorySelect.selectOption("furniture");

    // Expect Free Desk Lamp to remain visible
    await expect(page.getByText("Free Desk Lamp")).toBeVisible();

    // Filter by Pickup Area: Weststadt (yields 0 listings)
    const areaSelect = page.locator("#filter-area-select");
    await areaSelect.selectOption("weststadt");

    // Empty state should render
    await expect(page.getByText("Keine Inserate gefunden")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Filter zurücksetzen" }).first(),
    ).toBeVisible();

    // Reset filters
    await page
      .getByRole("button", { name: "Filter zurücksetzen" })
      .first()
      .click();

    // Listings should be restored
    await expect(page.getByText("Calculus Textbook 3rd Edition")).toBeVisible();
  });

  test("Journey 3: keyset pagination loads next page of listings", async ({
    page,
  }) => {
    await page.goto("/");

    // Initial items visible
    await expect(page.getByText("Calculus Textbook 3rd Edition")).toBeVisible();

    // Scroll to sentinel to trigger infinite scroll
    const sentinel = page.getByTestId("feed-sentinel");
    await sentinel.scrollIntoViewIfNeeded();

    // Page 2 item should load
    await expect(page.getByText("Computer Monitor 24-inch")).toBeVisible();
  });

  test("Journey 4: view full listing details with photo gallery, description, and seller card", async ({
    page,
  }) => {
    await page.goto(`/listings/${sampleDetails.id}`);

    // Verify title and price
    await expect(
      page.getByRole("heading", { name: "Calculus Textbook 3rd Edition" }),
    ).toBeVisible();
    await expect(page.getByText("€24.50")).toBeVisible();

    // Verify description
    await expect(
      page.getByText("Comprehensive calculus textbook in great condition."),
    ).toBeVisible();

    // Verify pickup area banner
    await expect(page.getByText("Campus Nord / Bienrode")).toBeVisible();

    // Verify seller card with trust badge
    await expect(page.getByText("Alex Student")).toBeVisible();
    await expect(page.getByText("TU Braunschweig").first()).toBeVisible();

    // Verify gallery photo count
    await expect(page.getByText("1 / 2")).toBeVisible();
  });

  test("Journey 5: inspect sold listing shows inactive notice banner", async ({
    page,
  }) => {
    await page.goto("/listings/sold-listing-id-1234");

    // Verify inactive notice banner
    await expect(
      page.getByText(
        "Dieses Inserat wurde bereits verkauft und ist nicht mehr verfügbar.",
      ),
    ).toBeVisible();
  });

  test("Journey 6: mobile viewport (360px) layout renders without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/");

    // Verify cards and elements fit cleanly
    const card = page.getByTestId(
      "listing-card-11111111-2222-3333-4444-555555555555",
    );
    await expect(card).toBeVisible();

    // Check page width doesn't overflow 360px
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(360);
  });
});
