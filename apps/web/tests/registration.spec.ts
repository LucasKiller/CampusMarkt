import { expect, test } from "@playwright/test";

test.describe("registration and confirmation journey", () => {
  test("reveals and hides each password without changing its value", async ({
    page,
  }) => {
    let requestCount = 0;
    await page.route("**/api/identity/registrations", async (route) => {
      requestCount += 1;
      await route.abort();
    });
    await page.goto("/register");
    const password = page.getByLabel("Password", { exact: true });
    const confirmation = page.getByLabel("Confirm password", { exact: true });
    await password.fill("correct horse battery staple");
    await confirmation.fill("correct horse battery staple");

    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveAttribute("autocomplete", "new-password");
    await expect(confirmation).toHaveAttribute("autocomplete", "new-password");
    const showPassword = page.getByRole("button", { name: "Show password" });
    const showConfirmation = page.getByRole("button", {
      name: "Show confirm password",
    });
    await expect(showPassword).toHaveAttribute("type", "button");
    await expect(showPassword).toHaveAttribute("aria-pressed", "false");
    await expect(showConfirmation).toHaveAttribute("type", "button");
    await expect(showConfirmation).toHaveAttribute("aria-pressed", "false");
    await password.focus();
    await page.keyboard.press("Tab");
    await expect(showPassword).toBeFocused();
    await showPassword.click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(
      page.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(confirmation).toHaveAttribute("type", "password");
    await showConfirmation.click();
    await expect(confirmation).toHaveAttribute("type", "text");
    const hideConfirmation = page.getByRole("button", {
      name: "Hide confirm password",
    });
    await expect(hideConfirmation).toHaveAttribute("aria-pressed", "true");
    await expect(confirmation).toHaveValue("correct horse battery staple");
    await hideConfirmation.click();
    await expect(confirmation).toHaveAttribute("type", "password");
    await expect(
      page.getByRole("button", { name: "Show confirm password" }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(confirmation).toHaveValue("correct horse battery staple");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveValue("correct horse battery staple");
    await expect(page.locator(".error-summary")).toHaveCount(0);
    expect(requestCount).toBe(0);
  });

  test("shows progressive length guidance without adding composition requirements", async ({
    page,
  }) => {
    await page.goto("/register");
    const password = page.getByLabel("Password", { exact: true });
    const milestones = page.locator(".password-milestones li");
    const segments = page.locator(".password-progress span");
    const completeColor = "rgb(11, 102, 94)";
    const incompleteColor = "rgb(221, 229, 223)";
    const mutedTextColor = "rgb(83, 100, 95)";
    await expect(
      page.getByText("Length alone isn't a security score.", { exact: false }),
    ).toBeVisible();

    await password.fill("abcdefghij");
    await expect(milestones.nth(0)).toHaveClass(/is-complete/);
    await expect(milestones.nth(0)).toContainText("10 characters (required)");
    await expect(milestones.nth(0)).toHaveCSS("color", completeColor);
    await expect(milestones.nth(1)).not.toHaveClass(/is-complete/);
    await expect(milestones.nth(1)).toHaveCSS("color", mutedTextColor);
    await expect(page.getByText("Minimum length reached")).toBeVisible();
    await expect(segments.nth(0)).toHaveCSS("background-color", completeColor);
    await expect(segments.nth(1)).toHaveCSS(
      "background-color",
      incompleteColor,
    );

    await password.fill("abcdefghijklmn");
    await expect(milestones.nth(1)).toHaveClass(/is-complete/);
    await expect(milestones.nth(1)).toContainText(
      "14 characters (recommended)",
    );
    await expect(milestones.nth(1)).toHaveCSS("color", completeColor);
    await expect(page.getByText("Longer password")).toBeVisible();
    await expect(milestones.nth(2)).toHaveCSS("color", mutedTextColor);
    await expect(segments.nth(1)).toHaveCSS("background-color", completeColor);
    await expect(segments.nth(2)).toHaveCSS(
      "background-color",
      incompleteColor,
    );

    await password.fill("correct horse battery staple");
    await expect(milestones.nth(2)).toHaveClass(/is-complete/);
    await expect(milestones.nth(2)).toContainText(
      "20 characters (long passphrase)",
    );
    await expect(milestones.nth(2)).toHaveCSS("color", completeColor);
    await expect(page.getByText("Long passphrase length")).toBeVisible();
    await expect(segments.nth(2)).toHaveCSS("background-color", completeColor);

    const unicodePassphrase = "🙂".repeat(128);
    await password.fill(unicodePassphrase);
    await expect(password).toHaveValue(unicodePassphrase);
  });

  for (const input of [
    { name: "10-character pasted", value: "abcdefghij", paste: true },
    { name: "128-code-point filled", value: "🙂".repeat(128), paste: false },
  ]) {
    test(`submits the ${input.name} password without its confirmation`, async ({
      page,
    }) => {
      let submittedBody: Record<string, unknown> | null = null;
      await page.route("**/api/identity/registrations", async (route) => {
        submittedBody = route.request().postDataJSON();
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { status: "accepted" },
            correlationId: "88888888-8888-4888-8888-888888888888",
          }),
        });
      });
      await page.goto("/register");
      await page.getByLabel("Email address").fill("boundary@example.com");
      await page.getByLabel("Display name (public)").fill("Boundary User");
      const password = page.getByLabel("Password", { exact: true });
      if (input.paste) {
        await page
          .context()
          .grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.evaluate(
          (value) => navigator.clipboard.writeText(value),
          input.value,
        );
        await password.focus();
        await page.keyboard.press("ControlOrMeta+V");
      } else {
        await password.fill(input.value);
      }
      await expect(password).toHaveValue(input.value);
      await page
        .getByLabel("Confirm password", { exact: true })
        .fill(input.value);
      await page
        .getByLabel("I confirm that I am at least 18 years old.")
        .check();
      await page
        .getByLabel("I agree to the Terms of Service and Privacy Policy.")
        .check();

      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page.getByText("Check your inbox")).toBeVisible();
      expect(submittedBody).toMatchObject({
        email: "boundary@example.com",
        password: input.value,
      });
      expect(submittedBody).not.toHaveProperty("confirmPassword");
    });
  }

  test("does not send a registration request when confirmation differs", async ({
    page,
  }) => {
    let requestCount = 0;
    await page.route("**/api/identity/registrations", async (route) => {
      requestCount += 1;
      await route.abort();
    });
    await page.goto("/register");
    await page.getByLabel("Email address").fill("test@example.com");
    await page.getByLabel("Display name (public)").fill("Alex");
    await page
      .getByLabel("Password", { exact: true })
      .fill("first-password-123");
    await page
      .getByLabel("Confirm password", { exact: true })
      .fill("different-password-123");
    await page.getByLabel("I confirm that I am at least 18 years old.").check();
    await page
      .getByLabel("I agree to the Terms of Service and Privacy Policy.")
      .check();

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.locator(".error-summary")).toBeFocused();
    await expect(page.locator("#confirmPassword-error")).toHaveText(
      "Passwords do not match.",
    );
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
    await expect(
      page.getByLabel("Confirm password", { exact: true }),
    ).toHaveValue("");
    expect(requestCount).toBe(0);
  });

  test("requires a confirmation before registration", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/identity/registrations", async (route) => {
      requestCount += 1;
      await route.abort();
    });
    await page.goto("/register");
    await page.getByLabel("Email address").fill("test@example.com");
    await page.getByLabel("Display name (public)").fill("Alex");
    await page
      .getByLabel("Password", { exact: true })
      .fill("a-long-passphrase");
    await page.getByLabel("I confirm that I am at least 18 years old.").check();
    await page
      .getByLabel("I agree to the Terms of Service and Privacy Policy.")
      .check();

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.locator(".error-summary")).toBeFocused();
    await expect(page.locator("#confirmPassword-error")).toHaveText(
      "Confirm your password.",
    );
    expect(requestCount).toBe(0);
  });

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
      await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
      await expect(
        page.getByLabel("Confirm password", { exact: true }),
      ).toBeVisible();
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
    await page.getByLabel("Password", { exact: true }).fill("Secret12345!");

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
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
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
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByLabel("Confirm password", { exact: true }).fill("short");
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
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
    await expect(
      page.getByLabel("Confirm password", { exact: true }),
    ).toHaveValue("");
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
    await page
      .getByLabel("Password", { exact: true })
      .fill("valid-password-123");
    await page
      .getByLabel("Confirm password", { exact: true })
      .fill("valid-password-123");
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
      expect(route.request().postDataJSON()).toMatchObject({
        email: "newuser@example.com",
        password: "super-secret-pass-123",
      });
      expect(route.request().postDataJSON()).not.toHaveProperty(
        "confirmPassword",
      );
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
    await page
      .getByLabel("Password", { exact: true })
      .fill("super-secret-pass-123");
    await page
      .getByLabel("Confirm password", { exact: true })
      .fill("super-secret-pass-123");
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
