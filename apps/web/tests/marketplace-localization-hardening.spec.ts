import { expect, test } from "@playwright/test";

test.describe("Bilingual Localization & Launch Hardening E2E Journeys (T16)", () => {
  test("renders homepage in German with NEXT_LOCALE=de and switches to English via LanguageSwitcher", async ({
    page,
    context,
  }) => {
    // 1. Set cookie to German
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "de",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await page.goto("/");

    // 2. Verify root HTML lang attribute is German
    const htmlLang = await page.getAttribute("html", "lang");
    expect(htmlLang).toBe("de");

    // 3. Verify German interface elements
    const brand = page.locator(".brand");
    await expect(brand).toContainText("CampusMarkt");
    const feedHeader = page.locator("h2");
    await expect(feedHeader.first()).toBeVisible();

    // 4. Wait for client hydration, then click EN button to switch to English
    const container = page
      .locator('[data-testid="language-switcher-container"]')
      .first();
    await expect(container).toHaveAttribute("data-hydrated", "true");

    const enBtn = page.locator('[data-testid="language-btn-en"]').first();
    await expect(enBtn).toBeVisible();
    await enBtn.click();
    await page.waitForTimeout(1000);

    // 5. Verify page updates to English
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // 6. Verify cookie NEXT_LOCALE is set to 'en'
    const cookies = await context.cookies();
    const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(localeCookie).toBeDefined();
    expect(localeCookie?.value).toBe("en");
  });

  test("renders statutory legal pages /impressum, /datenschutz, and /agb with full disclosures in German", async ({
    page,
    context,
  }) => {
    // Set German cookie
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "de",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // 1. Visit /impressum
    const impressumResponse = await page.goto("/impressum");
    expect(impressumResponse?.status()).toBe(200);

    const impressumHeading = page.locator("h1");
    await expect(impressumHeading).toContainText("Impressum");
    await expect(page.locator("body")).toContainText("§ 5 DDG");
    await expect(page.locator("body")).toContainText(
      "kontakt@campusmarkt.tu-braunschweig.de",
    );

    // 2. Visit /datenschutz
    const datenschutzResponse = await page.goto("/datenschutz");
    expect(datenschutzResponse?.status()).toBe(200);

    const datenschutzHeading = page.locator("h1");
    await expect(datenschutzHeading).toContainText("Datenschutzerklärung");
    await expect(page.locator("body")).toContainText("HMAC-SHA-256");
    await expect(page.locator("body")).toContainText("Verantwortliche Stelle");

    // 3. Visit /agb
    const agbResponse = await page.goto("/agb");
    expect(agbResponse?.status()).toBe(200);

    const agbHeading = page.locator("h1");
    await expect(agbHeading).toContainText("Allgemeine Geschäftsbedingungen");
    await expect(page.locator("body")).toContainText("Vor-Ort-Übergabe");
    await expect(page.locator("body")).toContainText("Unzulässige Inserate");
  });

  test("verifies HTTP security headers on server responses", async ({
    page,
  }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();

    const headers = response?.headers();
    expect(headers).toBeDefined();

    // Verify critical security headers
    expect(headers?.["x-frame-options"]?.toUpperCase()).toBe("DENY");
    expect(headers?.["x-content-type-options"]?.toLowerCase()).toBe("nosniff");
    expect(headers?.["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers?.["content-security-policy"]).toContain(
      "default-src 'self'",
    );
  });

  test("renders legal pages in English with legally binding German statutory notice", async ({
    page,
    context,
  }) => {
    // Set locale cookie to English
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "en",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/impressum");
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Legal Notice");

    const bindingNotice = page.locator('[role="note"]');
    await expect(bindingNotice).toBeVisible();
    await expect(bindingNotice).toContainText(
      "German statutory version is legally binding",
    );

    // Navigate to AGB in English
    await page.goto("/agb");
    const agbH1 = page.locator("h1");
    await expect(agbH1).toContainText("Terms of Service");
    await expect(page.locator('[role="note"]')).toBeVisible();
  });
});
