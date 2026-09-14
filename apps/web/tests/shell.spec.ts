import { expect, test } from "@playwright/test";

for (const width of [360, 1280]) {
  test(`renders the product shell without horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Dein Marktplatz für Braunschweig" }),
    ).toBeVisible();
    await expect(
      page.getByText("Buy. Sell. Give away. Find what you need."),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  });
}
