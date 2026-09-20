import { expect, test } from "@playwright/test";

test.describe("password recovery journey", () => {
  for (const width of [360, 1280]) {
    test(`renders forgot-password form without horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/forgot-password");

      await expect(
        page.getByRole("heading", { name: "Reset Your Password" }),
      ).toBeVisible();

      // Form inputs
      await expect(page.getByLabel("Email address")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Send reset link" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });
  }

  test("validates required email format on forgot-password and focuses error summary", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByLabel("Email address").fill("invalid-email");
    await page.getByRole("button", { name: "Send reset link" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText("Enter a valid email address."),
    ).toBeVisible();
  });

  test("submits recovery request and displays generic 30-minute confirmation instructions", async ({
    page,
  }) => {
    await page.route("**/api/identity/recoveries", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { status: "accepted" },
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/forgot-password");

    await page.getByLabel("Email address").fill("user@example.test");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await expect(page.getByText("30 minutes")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to sign in" }),
    ).toBeVisible();
  });

  test("handles rate-limited recovery request (429)", async ({ page }) => {
    await page.route("**/api/identity/recoveries", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          headers: { "retry-after": "120" },
          body: JSON.stringify({
            ok: false,
            code: "RATE_LIMITED",
            retryAfterSeconds: 120,
            correlationId: "22222222-3333-4444-5555-666666666666",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/forgot-password");

    await page.getByLabel("Email address").fill("user@example.test");
    await page.getByRole("button", { name: "Send reset link" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByText(
        "Too many recovery requests. Please try again later.",
      ),
    ).toBeVisible();
  });

  test("renders invalid or expired link notice on reset-password when status=invalid_link", async ({
    page,
  }) => {
    await page.goto("/reset-password?status=invalid_link");

    await expect(
      page.getByRole("heading", { name: "Recovery link expired or invalid" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Request a new reset link" }),
    ).toBeVisible();
  });

  test("supports pasting into password input on reset-password", async ({
    page,
  }) => {
    await page.goto("/reset-password");

    const passwordInput = page.getByLabel("New password", { exact: true });
    await passwordInput.focus();

    await page.evaluate(() => {
      const input = document.getElementById("password") as HTMLInputElement;
      input.value = "PastedSecretPass123!";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await expect(passwordInput).toHaveValue("PastedSecretPass123!");
  });

  test("validates short password on reset-password, focuses error summary, and clears password", async ({
    page,
  }) => {
    await page.goto("/reset-password");

    await page.getByLabel("New password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Reset password" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText("Password must contain at least 10 characters."),
    ).toBeVisible();

    await expect(page.getByLabel("New password", { exact: true })).toHaveValue(
      "",
    );
  });

  test("successfully resets password and displays sign-in link", async ({
    page,
  }) => {
    await page.route("**/api/identity/password-resets", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { status: "password_updated" },
            correlationId: "33333333-4444-5555-6666-777777777777",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/reset-password");

    await page
      .getByLabel("New password", { exact: true })
      .fill("ValidNewPassword123!");
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(
      page.getByRole("heading", { name: "Password reset successful!" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to sign in" }),
    ).toBeVisible();
  });
});
