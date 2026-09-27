import { expect, test } from "@playwright/test";

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
