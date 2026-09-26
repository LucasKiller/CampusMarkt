import { expect, test } from "@playwright/test";

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

test("identity tokens on home and search", async ({ page }) => {
  await page.setViewportSize(desktop);
  for (const route of ["/", "/search"]) {
    await page.goto(route);
    await expect(page.locator(".marketplace-header")).toBeVisible();
    const values = await page.locator("body").evaluate((element) => {
      const root = getComputedStyle(document.documentElement);
      return {
        brand: root.getPropertyValue("--color-brand").trim(),
        canvas: root.getPropertyValue("--color-canvas").trim(),
        font: getComputedStyle(element).fontFamily,
      };
    });
    expect(values.brand.toUpperCase()).toBe("#0B665E");
    expect(values.canvas.toUpperCase()).toBe("#F7F8F5");
    expect(values.font).toMatch(/Inter|system-ui/);
    const focusColor = await page
      .locator("body")
      .evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--color-focus")
          .trim(),
      );
    expect(focusColor.toUpperCase()).toBe("#9B5A18");
    await page.keyboard.press("Tab");
    const outline = await page.locator(":focus").evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, color: style.outlineColor };
    });
    expect(outline.style).toBe("solid");
    expect(outline.color).toBe("rgb(155, 90, 24)");
  }
});

test("home search and showcase at 390px", async ({ page }) => {
  await page.setViewportSize(mobile);
  await page.goto("/");
  const search = page.getByRole("link", { name: /search|suche/i }).first();
  await expect(search).toBeVisible();
  const searchBox = await search.boundingBox();
  const showcaseBox = await page
    .locator(".marketplace-feed-container")
    .boundingBox();
  expect(searchBox && searchBox.y).toBeLessThan(mobile.height);
  expect(showcaseBox && showcaseBox.y).toBeLessThan(mobile.height * 1.6);
});

test("five mobile destinations fit without overlap", async ({ page }) => {
  await page.setViewportSize(mobile);
  await page.goto("/");
  const nav = page.locator(".mobile-navigation");
  await expect(nav.getByRole("link")).toHaveCount(5);
  for (const path of ["/", "/search", "/favorites", "/messages", "/account"]) {
    await expect(nav.locator(`a[href="${path}"]`)).toBeVisible();
  }
  const geometry = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    bodyPadding: Number.parseFloat(
      getComputedStyle(document.body).paddingBottom,
    ),
    navHeight:
      document.querySelector(".mobile-navigation")?.getBoundingClientRect()
        .height ?? 0,
  }));
  expect(geometry.overflow).toBe(false);
  expect(geometry.bodyPadding).toBeGreaterThanOrEqual(geometry.navHeight);
  const lastCard = page.locator(".listing-card").last();
  await lastCard.scrollIntoViewIfNeeded();
  const lastCardBox = await lastCard.boundingBox();
  const navBox = await nav.boundingBox();
  expect((lastCardBox?.y ?? 0) + (lastCardBox?.height ?? 0)).toBeLessThan(
    navBox?.y ?? 0,
  );
});

test("mobile navigation follows locale cookie", async ({ page, context }) => {
  await page.setViewportSize(mobile);
  await page.goto("/");
  const nav = page.locator(".mobile-navigation");
  for (const [path, label] of [
    ["/", "Explore"],
    ["/search", "Search"],
    ["/favorites", "Favorites"],
    ["/messages", "Inbox"],
    ["/account", "Account"],
  ]) {
    await expect(nav.locator(`a[href="${path}"]`)).toHaveText(label);
  }
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "de", url: "http://127.0.0.1:3100" },
  ]);
  await page.reload();
  for (const [path, label] of [
    ["/", "Stöbern"],
    ["/search", "Suche"],
    ["/favorites", "Favoriten"],
    ["/messages", "Nachrichten"],
    ["/account", "Konto"],
  ]) {
    await expect(nav.locator(`a[href="${path}"]`)).toHaveText(label);
  }
});

test("feed and search cards share square media", async ({ page }) => {
  await page.setViewportSize(desktop);
  for (const route of ["/", "/search?q=calculus"]) {
    await page.goto(route);
    const card = page.locator(".listing-card").first();
    await expect(card).toBeVisible();
    const media = card.locator(".listing-card-media-wrapper");
    const box = await media.boundingBox();
    expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThan(2);
    await expect(media.locator("img")).toHaveCSS("object-fit", "cover");
    await expect(card.locator(".listing-card-title")).not.toBeEmpty();
    await expect(card.locator(".listing-card-price")).not.toBeEmpty();
    await expect(card.locator(".listing-type-tag")).not.toBeEmpty();
    await expect(card.locator(".listing-card-meta").first()).not.toBeEmpty();
    await expect(card.locator(".listing-card-title")).toContainText(
      "Calculus Textbook",
    );
    await expect(card.locator(".listing-card-price")).toContainText("€24.50");
    await expect(card.locator(".listing-card-meta").first()).toContainText(
      /Campus Nord|Nordcampus|Bienrode/i,
    );
    await expect(card.locator(".listing-type-tag")).toContainText(
      /sale|verkauf/i,
    );
    await expect(card.locator(".listing-card-seller")).toContainText(
      "Alex Student",
    );
    const visualOrder = await card.evaluate((element) => {
      const selectors = [
        ".listing-card-media-wrapper",
        ".listing-card-title",
        ".listing-card-price",
        ".listing-card-meta",
        ".listing-card-seller",
      ];
      return selectors.map(
        (selector) =>
          element.querySelector(selector)?.getBoundingClientRect().top ?? -1,
      );
    });
    expect(visualOrder).toEqual([...visualOrder].sort((a, b) => a - b));
    const favorite = card.locator(".listing-card-overlay button").first();
    const favoriteBox = await favorite.boundingBox();
    expect(favoriteBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(favoriteBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(
      await favorite.evaluate((element) => element.closest("a")),
    ).toBeNull();
  }
  await page.goto("/");
  await expect(page.locator(".reserved-badge").first()).toContainText(
    /reserved|reserviert/i,
  );
  const giveaway = page
    .locator(".listing-card")
    .filter({ hasText: "Free Desk Lamp" });
  await expect(giveaway.locator(".listing-card-price")).toContainText(
    /free|zu verschenken/i,
  );
  await expect(giveaway.locator(".listing-type-tag")).toContainText(
    /give away|verschenken/i,
  );
  const wanted = page
    .locator(".listing-card")
    .filter({ hasText: "Bicycle Lock" });
  await expect(wanted.locator(".listing-card-price")).toContainText(
    /max\.|bis zu/i,
  );
  await expect(wanted.locator(".listing-type-tag")).toContainText(
    /wanted|gesuch/i,
  );
});

test("discovery grid follows four responsive breakpoints", async ({ page }) => {
  for (const [width, columns] of [
    [390, 1],
    [768, 2],
    [1100, 3],
    [1440, 4],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const grid = page.getByTestId("marketplace-feed-grid");
    await expect(grid).toBeVisible();
    const tracks = await grid.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean),
    );
    expect(tracks).toHaveLength(columns);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
});

test("photo-less cards have honest placeholders", async ({ page }) => {
  await page.goto("/");
  const wanted = page
    .locator(".listing-card")
    .filter({ hasText: "Bicycle Lock" });
  await expect(wanted.locator(".listing-image-placeholder")).toContainText(
    /wanted|gesuch/i,
  );
  await expect(wanted.locator(".listing-card-media-wrapper img")).toHaveCount(
    0,
  );
  const box = await wanted.locator(".listing-card-media-wrapper").boundingBox();
  expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThan(2);
  const giveaway = page
    .locator(".listing-card")
    .filter({ hasText: "Desk Lamp" });
  await expect(giveaway.locator(".listing-image-placeholder")).toContainText(
    /no image|kein bild/i,
  );
  await expect(giveaway.locator(".listing-card-media-wrapper img")).toHaveCount(
    0,
  );
});

test("feed filters stay functional and visible", async ({ page }) => {
  const requests: URLSearchParams[] = [];
  await page.route("**/api/marketplace/feed*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(params);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          items: [],
          nextCursor: null,
          filters: Object.fromEntries(params),
        },
      }),
    });
  });
  await page.goto("/");
  await page.locator("#filter-category-select").selectOption("furniture");
  await expect.poll(() => requests.at(-1)?.get("category")).toBe("furniture");
  await expect(page.locator("#filter-category-select")).toHaveValue(
    "furniture",
  );
  await page.locator("#filter-area-select").selectOption("innenstadt");
  await expect
    .poll(() => requests.at(-1)?.get("pickupArea"))
    .toBe("innenstadt");
  await expect(page.locator("#filter-area-select")).toHaveValue("innenstadt");
  const sellFilter = page
    .locator(".feed-type-options button")
    .filter({ hasText: /sale|verkauf/i })
    .first();
  await sellFilter.click();
  await expect.poll(() => requests.at(-1)?.get("listingType")).toBe("SELL");
  expect(requests.at(-1)?.get("category")).toBe("furniture");
  expect(requests.at(-1)?.get("pickupArea")).toBe("innenstadt");
  await expect(sellFilter).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: /reset filters|filter zurücksetzen/i })
    .first()
    .click();
  await expect.poll(() => requests.at(-1)?.get("category")).toBeNull();
  expect(requests.at(-1)?.get("pickupArea")).toBeNull();
  expect(requests.at(-1)?.get("listingType")).toBeNull();
  await expect(page.locator("#filter-category-select")).toHaveValue("");
  await expect(page.locator("#filter-area-select")).toHaveValue("");
  await expect(sellFilter).toHaveAttribute("aria-pressed", "false");
});

test("empty discovery has a next action", async ({ page }) => {
  await page.goto("/");
  await page.route("**/api/marketplace/feed*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: { items: [], nextCursor: null } }),
    }),
  );
  await page.locator("#filter-category-select").selectOption("furniture");
  await expect(page.locator(".empty-feed-state")).toContainText(
    /no listings|keine inserate/i,
  );
  await expect(page.locator(".empty-feed-state button")).toBeVisible();
  await page.locator(".empty-feed-state button").click();
  await expect(page.locator("#filter-category-select")).toHaveValue("");
  await page.goto("/search?q=no-matches");
  await expect(page.getByTestId("search-empty-state")).toBeVisible();
  await expect(page.getByTestId("search-empty-state")).toContainText(
    /no listings found|keine inserate gefunden/i,
  );
  await expect(page.getByTestId("empty-reset-filters")).toBeVisible();
  await page.getByTestId("empty-reset-filters").click();
  await expect(page).toHaveURL(/\/search(?:\?|$)/);
  await expect(page.getByTestId("search-input")).toHaveValue("");
});

test("discovery failures offer retry", async ({ page }) => {
  await page.goto("/");
  let failFeed = true;
  await page.route("**/api/marketplace/feed*", (route) =>
    route.fulfill(
      failFeed
        ? { status: 503, body: "unavailable" }
        : {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              data: { items: [], nextCursor: null },
            }),
          },
    ),
  );
  await page.locator("#filter-category-select").selectOption("furniture");
  await expect(page.locator(".marketplace-error[role='alert']")).toContainText(
    /could not load|fehler/i,
  );
  await expect(
    page.getByRole("button", { name: /retry|erneut/i }),
  ).toBeVisible();
  failFeed = false;
  await page.getByRole("button", { name: /retry|erneut/i }).click();
  await expect(page.locator(".marketplace-error[role='alert']")).toHaveCount(0);
  await page.goto("/search");
  let failSearch = true;
  await page.route("**/api/marketplace/search*", (route) =>
    route.fulfill(
      failSearch
        ? { status: 503, body: "unavailable" }
        : {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              data: { items: [], nextCursor: null },
            }),
          },
    ),
  );
  await page.getByTestId("search-input").fill("desk");
  await page.getByTestId("search-input").press("Enter");
  await expect(page.locator(".marketplace-error[role='alert']")).toContainText(
    /could not load|fehler/i,
  );
  failSearch = false;
  await page
    .locator(".search-container")
    .getByRole("button", { name: /retry|erneut/i })
    .click();
  await expect(page.locator(".marketplace-error[role='alert']")).toHaveCount(0);
  await expect(page.getByTestId("search-empty-state")).toBeVisible();
});

test("detail presents public decision information", async ({ page }) => {
  await page.goto("/listings/visual-active");
  await expect(page.locator(".listing-details-container h1")).toContainText(
    "Calculus Textbook",
  );
  await expect(page.locator(".listing-details-container h1")).toHaveCSS(
    "color",
    "rgb(24, 37, 34)",
  );
  await expect(page.locator(".listing-details-container")).toContainText(
    "Alex Student",
  );
  await expect(page.locator(".listing-details-container")).toContainText(
    "Braunschweig",
  );
  await expect(page.locator(".listing-details-container")).toContainText(
    "Campus North / Bienrode",
  );
  await expect(page.locator(".listing-details-container")).toContainText(
    "TU Braunschweig",
  );
  await expect(page.locator(".listing-gallery-carousel")).toBeVisible();
  await expect(page.locator(".listing-details-container")).toContainText(
    "€24.50",
  );
  await expect(page.locator(".listing-details-container")).toContainText(
    "Comprehensive calculus textbook",
  );
  await expect(page.locator(".listing-details-container")).not.toContainText(
    /@/,
  );
  await expect(page.locator(".listing-details-container")).not.toContainText(
    /\b(?:Straße|Strasse|Street|Weg)\s+\d+\b/i,
  );
  const layout = page.locator(".detail-layout");
  await expect(layout).toHaveCSS("display", "grid");
  const gallery = await page.locator(".listing-gallery-carousel").boundingBox();
  const reading = await page
    .locator(".listing-details-container h1")
    .boundingBox();
  expect((gallery?.x ?? 0) + (gallery?.width ?? 0)).toBeLessThan(
    reading?.x ?? 0,
  );
  await expect(page.getByTestId("cta-buy-now")).toBeVisible();
  await expect(page.getByTestId("cta-make-offer")).toBeVisible();
  await expect(page.getByTestId("cta-send-message")).toBeVisible();
});

test("wanted detail never offers purchase", async ({ page }) => {
  await page.goto("/listings/visual-wanted");
  await expect(page.locator(".listing-details-container")).toContainText(
    /wanted|gesuch/i,
  );
  await expect(page.getByTestId("cta-buy-now")).toHaveCount(0);
  await expect(page.getByTestId("cta-make-offer")).toHaveCount(0);
  await expect(page.locator(".listing-details-actions")).toContainText(
    /message|nachricht/i,
  );
  await expect(page.getByTestId("cta-send-message")).toBeVisible();
  await page.goto("/listings/visual-giveaway");
  await expect(page.locator(".listing-details-container")).toContainText(
    /free|zu verschenken/i,
  );
  await expect(page.getByTestId("cta-buy-now")).toBeVisible();
  await expect(page.getByTestId("cta-make-offer")).toHaveCount(0);
  await expect(page.getByTestId("cta-send-message")).toBeVisible();
});

test("unavailable buyer actions stay unavailable", async ({
  page,
  context,
}) => {
  for (const id of ["visual-reserved", "visual-sold", "visual-archived"]) {
    await page.goto(`/listings/${id}`);
    await expect(page.getByTestId("cta-buy-now")).toHaveCount(0);
    await expect(page.getByTestId("cta-make-offer")).toHaveCount(0);
    await expect(page.locator(".listing-details-container")).toContainText(
      id === "visual-reserved"
        ? /reserved|reserviert/i
        : id === "visual-sold"
          ? /sold|verkauft/i
          : /archived|archiviert/i,
    );
    await expect(
      page.locator(
        id === "visual-reserved"
          ? ".reserved-notice-banner"
          : ".inactive-notice-banner",
      ),
    ).toHaveCSS(
      "color",
      id === "visual-archived" ? "rgb(83, 100, 95)" : "rgb(128, 82, 11)",
    );
  }
  await context.addCookies([
    {
      name: "campusmarkt-test-session",
      value: "seller",
      url: "http://127.0.0.1:3100",
    },
  ]);
  await page.goto("/listings/visual-active");
  await expect(page.getByTestId("cta-buy-now")).toHaveCount(0);
  await expect(page.getByTestId("cta-make-offer")).toHaveCount(0);
  await expect(page.getByTestId("cta-send-message")).toHaveCount(0);
  await expect(page.getByTestId("negotiation-bar")).toBeVisible();
});

test("mobile detail action leaves content reachable", async ({ page }) => {
  await page.setViewportSize(mobile);
  await page.goto("/listings/visual-active");
  await expect(page.getByTestId("cta-buy-now")).toBeVisible();
  const actionBox = await page
    .locator(".listing-details-actions")
    .boundingBox();
  const navBox = await page.locator(".mobile-navigation").boundingBox();
  expect((actionBox?.y ?? 0) + (actionBox?.height ?? 0)).toBeLessThanOrEqual(
    (navBox?.y ?? 0) + 1,
  );
  await page.locator(".seller-profile-card").scrollIntoViewIfNeeded();
  await expect(page.locator(".seller-profile-card")).toBeInViewport();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  const gallery = await page.locator(".listing-gallery-carousel").boundingBox();
  const heading = await page
    .locator(".listing-details-container h1")
    .boundingBox();
  expect((gallery?.y ?? 0) + (gallery?.height ?? 0)).toBeLessThan(
    heading?.y ?? 0,
  );
});

test("unavailable detail links back to browse", async ({ page }) => {
  await page.goto("/listings/visual-missing");
  await expect(
    page.getByRole("link", { name: /browse|explore|übersicht|entdecken/i }),
  ).toBeVisible();
  await expect(page.getByTestId("cta-buy-now")).toHaveCount(0);
  await page.locator(".detail-not-found a").click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
});
