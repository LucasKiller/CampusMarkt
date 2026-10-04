import { expect, test } from "@playwright/test";

const legalPages = [
  { href: "/impressum", en: "Legal Notice", de: "Impressum" },
  { href: "/datenschutz", en: "Privacy Policy", de: "Datenschutzerklärung" },
  {
    href: "/agb",
    en: "Terms of Service",
    de: "Allgemeine Geschäftsbedingungen",
  },
] as const;

for (const locale of ["en", "de"] as const) {
  test(`home footer opens each legal page in ${locale} with marketplace styling`, async ({
    page,
    context,
  }, testInfo) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: locale, domain: "127.0.0.1", path: "/" },
    ]);

    for (const legalPage of legalPages) {
      await page.goto("/");
      await page
        .locator(`.marketplace-footer a[href="${legalPage.href}"]`)
        .click();
      await expect(page).toHaveURL(new RegExp(`${legalPage.href}$`));
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator(".legal-page h1")).toContainText(
        legalPage[locale],
      );
      await expect(page.locator(".marketplace-header")).toBeVisible();
      await expect(page.locator(".legal-article")).toHaveCSS(
        "background-color",
        "rgb(255, 255, 255)",
      );
      await expect(page.locator(".legal-page")).toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        "rgb(247, 248, 245)",
      );
      await expect(
        page.locator(".legal-page .marketplace-footer a"),
      ).toHaveCount(3);
      await expect(page.locator(".legal-article")).not.toContainText("AD-");
      if (locale === "en") {
        await expect(page.getByRole("note")).toContainText(
          "German statutory version is legally binding",
        );
      }
    }

    await page.goto("/impressum");
    if (locale === "en") {
      await page.screenshot({
        path: testInfo.outputPath("legal-desktop.png"),
        fullPage: true,
      });
    }
    await expect(page.locator(".legal-article")).toContainText(
      locale === "en"
        ? "open to everyone in Braunschweig. University verification is optional"
        : "offen für alle Menschen in Braunschweig. Die Hochschulverifikation ist freiwillig",
    );
  });
}

test("all legal pages and language controls fit a 320px mobile viewport", async ({
  page,
  context,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });

  for (const locale of ["en", "de"] as const) {
    for (const legalPage of legalPages) {
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "127.0.0.1", path: "/" },
      ]);
      await page.goto(legalPage.href);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator(".legal-page h1")).toContainText(
        legalPage[locale],
      );
      await expect(page.locator(".legal-mobile-language button")).toBeVisible();
      await expect(page.locator(".mobile-navigation")).toBeVisible();
      await expect(
        page.locator(".legal-page .marketplace-footer"),
      ).toBeVisible();

      const horizontalOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(horizontalOverflow, `${legalPage.href} in ${locale}`).toBe(false);
      if (locale === "en" && legalPage.href === "/agb") {
        await page.screenshot({
          path: testInfo.outputPath("legal-mobile.png"),
          fullPage: true,
        });
      }

      const lastFooterLink = page.locator(
        '.legal-page .marketplace-footer a[href="/agb"]',
      );
      await lastFooterLink.scrollIntoViewIfNeeded();
      const footerLinkBounds = await lastFooterLink.boundingBox();
      const mobileNavigationBounds = await page
        .locator(".mobile-navigation")
        .boundingBox();
      expect(footerLinkBounds).not.toBeNull();
      expect(mobileNavigationBounds).not.toBeNull();
      expect(footerLinkBounds!.y + footerLinkBounds!.height).toBeLessThan(
        mobileNavigationBounds!.y,
      );

      await page.locator(".legal-mobile-language button").click();
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        locale === "en" ? "de" : "en",
      );
      await expect(page.locator(".legal-page h1")).toContainText(
        legalPage[locale === "en" ? "de" : "en"],
      );
    }
  }
});
