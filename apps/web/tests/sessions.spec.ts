import { expect, test } from "@playwright/test";

test.describe("session and logout journey", () => {
  test("shows and hides the current password without submitting", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    const password = page.getByLabel("Password", { exact: true });
    await password.fill("PastedSecretPass123!");

    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveAttribute("autocomplete", "current-password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("PastedSecretPass123!");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  for (const width of [360, 1280]) {
    test(`renders sign-in form without horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/sign-in");

      await expect(
        page.getByRole("heading", { name: "Sign In" }),
      ).toBeVisible();

      // Form inputs and controls
      await expect(page.getByLabel("Email address")).toBeVisible();
      await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Forgot password?" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Create an account" }),
      ).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });
  }

  test("supports pasting into password input", async ({ page }) => {
    await page.goto("/sign-in");

    const passwordInput = page.getByLabel("Password", { exact: true });
    await passwordInput.focus();

    // Paste password content via clipboard or fill
    await page.evaluate(() => {
      const input = document.getElementById("password") as HTMLInputElement;
      input.value = "PastedSecretPass123!";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await expect(passwordInput).toHaveValue("PastedSecretPass123!");
  });

  test("validates required credentials and moves focus to error summary without retaining password", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await page.getByLabel("Email address").fill("invalid-email");
    await page.getByLabel("Password", { exact: true }).fill("Secret123!");

    // Submit form with invalid email format
    await page.getByRole("button", { name: "Sign in" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText("Enter a valid email address."),
    ).toBeVisible();
    await expect(page.locator("#email-error")).toBeVisible();

    // Password must be cleared
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  });

  test("handles invalid credentials from server, shows generic error, moves focus to summary, and clears password", async ({
    page,
  }) => {
    await page.route("**/api/identity/sessions", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            code: "UNAUTHENTICATED",
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/sign-in");

    await page.getByLabel("Email address").fill("person@example.com");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");

    await page.getByRole("button", { name: "Sign in" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText(
        "Invalid email or password, or account is unconfirmed.",
      ),
    ).toBeVisible();

    // Password must be cleared, email retained
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Email address")).toHaveValue(
      "person@example.com",
    );
  });

  test("handles rate limit error from server (429) and displays retry message", async ({
    page,
  }) => {
    await page.route("**/api/identity/sessions", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          headers: { "retry-after": "60" },
          body: JSON.stringify({
            ok: false,
            code: "RATE_LIMITED",
            retryAfterSeconds: 60,
            correlationId: "22222222-3333-4444-5555-666666666666",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/sign-in");

    await page.getByLabel("Email address").fill("person@example.com");
    await page.getByLabel("Password", { exact: true }).fill("somepassword123");

    await page.getByRole("button", { name: "Sign in" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByText(
        "Too many sign-in attempts. Please try again later.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  });

  test("handles successful sign-in and redirects to returnTo destination", async ({
    page,
  }) => {
    await page.route("**/api/identity/sessions", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "set-cookie":
              "campusmarkt-auth=session; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax",
          },
          body: JSON.stringify({
            ok: true,
            data: {
              status: "authenticated",
              returnTo: "/listings/create",
            },
            correlationId: "33333333-4444-5555-6666-777777777777",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/sign-in?returnTo=%2Flistings%2Fcreate");

    await page.getByLabel("Email address").fill("person@example.com");
    await page
      .getByLabel("Password", { exact: true })
      .fill("CorrectPassword123!");

    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/listings/create");
    expect(page.url()).toContain("/listings/create");
  });

  test("redirects unauthenticated visitor to /account to /sign-in?returnTo=/account", async ({
    page,
  }) => {
    await page.goto("/account");

    await page.waitForURL((url) => url.pathname === "/sign-in");
    expect(page.url()).toContain("returnTo=");
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  });

  test("current device logout triggers DELETE /api/identity/sessions/current and redirects to /sign-in", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "authenticated",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    let deleteRequested = false;
    await page.route("**/api/identity/sessions/current", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteRequested = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { status: "signed_out" },
            correlationId: "44444444-5555-6666-7777-888888888888",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "My Account" }),
    ).toBeVisible();

    const signOutCurrentBtn = page.getByRole("button", {
      name: "Sign out this device",
    });
    await expect(signOutCurrentBtn).toBeVisible();

    await signOutCurrentBtn.click();
    await page.waitForURL("**/sign-in");
    expect(deleteRequested).toBe(true);
  });

  test("all devices logout triggers DELETE /api/identity/sessions and redirects to /sign-in", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "authenticated",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    let deleteRequested = false;
    await page.route("**/api/identity/sessions", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteRequested = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { status: "signed_out" },
            correlationId: "55555555-6666-7777-8888-999999999999",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "My Account" }),
    ).toBeVisible();

    const signOutAllBtn = page.getByRole("button", {
      name: "Sign out all devices",
    });
    await expect(signOutAllBtn).toBeVisible();

    await signOutAllBtn.click();
    await page.waitForURL("**/sign-in");
    expect(deleteRequested).toBe(true);
  });
});
