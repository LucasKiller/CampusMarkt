import { expect, test, type Page } from "@playwright/test";

async function keepFeedAvailable(page: Page) {
  await page.route("**/api/marketplace/feed*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          items: [
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
                universityBadge: null,
              },
            },
          ],
          nextCursor: null,
        },
      }),
    }),
  );
}

test("approved home composition leads with real nearby items", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Good finds. Close to home." }),
  ).toBeVisible();
  const hero = page.getByTestId("home-hero-showcase");
  await expect(hero).toBeVisible();
  await expect(hero.locator("a[href^='/listings/']")).toHaveCount(3);
  await expect(hero).toContainText("Calculus Textbook 3rd Edition");
  await expect(hero).toContainText("Braunschweig");

  const layout = await page.locator(".home-hero").evaluate((element) => {
    const copy = element
      .querySelector(".home-hero-copy")!
      .getBoundingClientRect();
    const showcase = element
      .querySelector(".home-hero-showcase")!
      .getBoundingClientRect();
    return { copyRight: copy.right, showcaseLeft: showcase.left };
  });
  expect(layout.copyRight).toBeLessThanOrEqual(layout.showcaseLeft);
});

test("home search and discovery remain reachable at 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const search = await page.locator(".home-search").boundingBox();
  const listings = await page.locator(".home-listings").boundingBox();
  expect(search?.y ?? 9999).toBeLessThan(844);
  expect(listings?.y ?? 9999).toBeLessThan(844 * 1.6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("approved home copy follows the saved language", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator(".home-hero h1")).toHaveText(
    "Good finds. Close to home.",
  );
  await expect(page.locator(".home-search button")).toHaveText("Search");

  await context.addCookies([
    { name: "NEXT_LOCALE", value: "de", url: "http://127.0.0.1:3100" },
  ]);
  await page.reload();
  await expect(page.locator(".home-hero h1")).toHaveText(
    "Gute Funde. Ganz in deiner Nähe.",
  );
  await expect(page.locator(".home-search button")).toHaveText("Suchen");
  await expect(page.locator(".home-hero")).not.toContainText(
    "Good finds. Close to home.",
  );
});

test("discovery cards use restrained media motion on home and search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ["/", "/search?q=calculus"]) {
    await page.goto(route);
    const card = page.locator(".listing-card").first();
    const image = card.locator(".listing-card-media-wrapper img");
    await expect(image).toBeVisible();
    const before = await image.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        property: style.transitionProperty,
        duration: Number.parseFloat(style.transitionDuration) * 1000,
      };
    });
    expect(before.property).toBe("transform");
    expect(before.duration).toBeLessThanOrEqual(220);
    await card.hover();
    await expect
      .poll(() =>
        image.evaluate((element) => getComputedStyle(element).transform),
      )
      .not.toBe("none");
    await expect(card).toHaveCSS("transform", "none");
  }
});

test("reduced motion suppresses card and favorite transforms", async ({
  page,
}) => {
  await keepFeedAvailable(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const card = page.locator(".listing-card").first();
  const image = card.locator(".listing-card-media-wrapper img");
  const favorite = card.locator(".favorite-button-card");
  await card.hover();
  await expect(image).toHaveCSS("transform", "none");
  await expect(image).toHaveCSS("transition-duration", "0s");
  await expect(favorite).toHaveCSS("transition-duration", "0s");
});

test("card navigation and favorite both show keyboard focus", async ({
  page,
}) => {
  await keepFeedAvailable(page);
  await page.goto("/");
  const card = page.locator(".listing-card").first();
  const link = card.locator("a").first();
  const favorite = card.locator(".favorite-button-card");
  await page.keyboard.press("Tab");
  await link.focus();
  await expect(link).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await favorite.focus();
  await expect(favorite).toHaveCSS("outline-style", "solid");
});
