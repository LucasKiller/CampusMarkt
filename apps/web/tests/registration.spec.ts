import { expect, test } from "@playwright/test";

test.describe("registration and confirmation journey", () => {
  for (const width of [360, 1280]) {
    test(`renders registration form without horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/register");

      await expect(
        page.getByRole("heading", { name: "Join CampusMarkt" }),
      ).toBeVisible();

      // Form inputs
      await expect(page.getByLabel("Email address")).toBeVisible();
      await expect(page.getByLabel("Display name (public)")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(
        page.getByLabel("I confirm that I am at least 18 years old."),
      ).toBeVisible();
      await expect(
        page.getByLabel("I agree to the Terms of Service and Privacy Policy."),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create account" }),
      ).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });
  }

  test("validates required consent and moves focus to error summary without retaining password", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByLabel("Email address").fill("test@example.com");
    await page.getByLabel("Display name (public)").fill("Alex");
    await page.getByLabel("Password").fill("Secret12345!");

    // Submit without checking required checkboxes
    await page.getByRole("button", { name: "Create account" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText("You must be at least 18 years old to register."),
    ).toBeVisible();
    await expect(
      errorSummary.getByText(
        "You must accept the Terms of Service and Privacy Policy.",
      ),
    ).toBeVisible();
    await expect(page.locator("#adultDeclared-error")).toBeVisible();
    await expect(page.locator("#termsConsent-error")).toBeVisible();

    // Password must be cleared (never repopulated on error)
    await expect(page.getByLabel("Password")).toHaveValue("");
  });

  test("handles server validation error, moves focus to summary, and clears password", async ({
    page,
  }) => {
    await page.route("**/api/identity/registrations", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "INVALID_INPUT",
          correlationId: "11111111-1111-4111-8111-111111111111",
          fieldErrors: {
            email: ["Enter a valid email address."],
            password: ["Password must contain 10 to 128 characters."],
          },
        }),
      });
    });

    await page.goto("/register");

    await page.getByLabel("Email address").fill("bad-email");
    await page.getByLabel("Display name (public)").fill("Valid Name");
    await page.getByLabel("Password").fill("short");
    await page.getByLabel("I confirm that I am at least 18 years old.").check();
    await page
      .getByLabel("I agree to the Terms of Service and Privacy Policy.")
      .check();

    await page.getByRole("button", { name: "Create account" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText("Enter a valid email address."),
    ).toBeVisible();
    await expect(
      errorSummary.getByText("Password must contain 10 to 128 characters."),
    ).toBeVisible();
    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page.locator("#password-error")).toBeVisible();

    // Password field must be cleared
    await expect(page.getByLabel("Password")).toHaveValue("");
  });

  test("disables submit button while submission is pending to prevent dedupe", async ({
    page,
  }) => {
    let requestDelayed = false;
    await page.route("**/api/identity/registrations", async (route) => {
      requestDelayed = true;
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { status: "accepted" },
          correlationId: "22222222-2222-4222-8222-222222222222",
        }),
      });
    });

    await page.goto("/register");

    await page.getByLabel("Email address").fill("valid@example.com");
    await page.getByLabel("Display name (public)").fill("Valid Name");
    await page.getByLabel("Password").fill("valid-password-123");
    await page.getByLabel("I confirm that I am at least 18 years old.").check();
    await page
      .getByLabel("I agree to the Terms of Service and Privacy Policy.")
      .check();

    await page.getByRole("button", { name: "Create account" }).click();

    // Button is disabled during submit with pending text
    const pendingBtn = page.getByRole("button", {
      name: "Creating account...",
    });
    await expect(pendingBtn).toBeDisabled();
    expect(requestDelayed).toBe(true);

    // Eventually confirmation success screen appears
    await expect(page.getByText("Check your inbox")).toBeVisible();
  });

  test("successful registration displays 24h confirmation instructions and resend action", async ({
    page,
  }) => {
    await page.route("**/api/identity/registrations", async (route) => {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { status: "accepted" },
          correlationId: "33333333-3333-4333-8333-333333333333",
        }),
      });
    });

    await page.goto("/register");

    await page.getByLabel("Email address").fill("newuser@example.com");
    await page.getByLabel("Display name (public)").fill("Sam Student");
    await page.getByLabel("Password").fill("super-secret-pass-123");
    await page.getByLabel("I confirm that I am at least 18 years old.").check();
    await page
      .getByLabel("I agree to the Terms of Service and Privacy Policy.")
      .check();

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Check your inbox")).toBeVisible();
    await expect(
      page.getByText(
        "Please click the link within 24 hours to confirm your account",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Resend confirmation email" }),
    ).toBeVisible();
  });

  test("confirmation page allows completing verification and links to sign-in", async ({
    page,
  }) => {
    await page.route("**/api/identity/confirmations", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { status: "confirmed" },
          correlationId: "44444444-4444-4444-8444-444444444444",
        }),
      });
    });

    await page.goto("/auth/confirm");

    await expect(
      page.getByRole("heading", { name: "Confirm your email address" }),
    ).toBeVisible();
    const confirmBtn = page.getByRole("button", { name: "Confirm Email" });
    await expect(confirmBtn).toBeVisible();

    await confirmBtn.click();

    await expect(
      page.getByRole("heading", { name: "Email confirmed!" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to sign in" }),
    ).toBeVisible();
  });
});
