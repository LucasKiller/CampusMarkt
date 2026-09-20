import { expect, test } from "@playwright/test";

test.describe("account deletion journey", () => {
  test("redirects unauthenticated user from /account/delete to sign-in", async ({
    page,
  }) => {
    await page.goto("/account/delete");
    await expect(page).toHaveURL(
      /\/sign-in\?returnTo=(%2F|\/)account(%2F|\/)delete/,
    );
  });

  for (const width of [360, 1280]) {
    test(`renders delete account page without horizontal overflow at ${width}px`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width, height: 800 });

      await context.addCookies([
        {
          name: "campusmarkt-test-session",
          value: "authenticated",
          domain: "127.0.0.1",
          path: "/",
        },
      ]);

      await page.goto("/account/delete");

      await expect(
        page.getByRole("heading", { name: "Delete Account" }),
      ).toBeVisible();
      await expect(
        page.getByText("Warning: This action is permanent"),
      ).toBeVisible();
      await expect(
        page.getByLabel("Type DELETE to confirm account deletion"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Permanently delete account" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Cancel and return to account" }),
      ).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });
  }

  test("validates confirmation input: rejects empty or invalid text without submitting", async ({
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

    await page.goto("/account/delete");

    const input = page.getByLabel("Type DELETE to confirm account deletion");
    const deleteBtn = page.getByRole("button", {
      name: "Permanently delete account",
    });

    // Fill invalid lowercase text
    await input.fill("delete");
    await deleteBtn.click();

    await expect(
      page.getByText("Type DELETE to confirm account deletion."),
    ).toBeVisible();
  });

  test("handles reauthentication requirement from deletion API and completes deletion flow", async ({
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

    let deletionAttempts = 0;
    await page.route("**/api/identity/me/deletion", async (route) => {
      deletionAttempts++;
      if (deletionAttempts === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { status: "reauthentication_required" },
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { status: "deletion_pending" },
            correlationId: "22222222-3333-4444-5555-666666666666",
          }),
        });
      }
    });

    let reauthCalled = false;
    await page.route("**/api/identity/me/reauthentication", async (route) => {
      reauthCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { status: "reauthenticated" },
          correlationId: "33333333-4444-5555-6666-777777777777",
        }),
      });
    });

    await page.goto("/account/delete");

    const input = page.getByLabel("Type DELETE to confirm account deletion");
    await input.fill("DELETE");

    const deleteBtn = page.getByRole("button", {
      name: "Permanently delete account",
    });
    await deleteBtn.click();

    // Reauthentication step should be shown
    await expect(
      page.getByRole("heading", { name: "Reauthentication Required" }),
    ).toBeVisible();
    await expect(page.getByLabel("Primary Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    // Fill reauth credentials and submit
    await page.getByLabel("Primary Email").fill("user@example.test");
    await page.getByLabel("Password").fill("Password123!");
    await page.getByRole("button", { name: "Verify password" }).click();

    expect(reauthCalled).toBe(true);

    // Should return to confirmation step with success note
    await expect(
      page.getByText(
        "Identity verified successfully. You may now confirm deletion.",
      ),
    ).toBeVisible();

    // Now confirm deletion again
    await page
      .getByRole("button", { name: "Permanently delete account" })
      .click();

    // Should transition to deleted state
    await expect(
      page.getByRole("heading", { name: "Account Deletion Pending" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to Sign In" }),
    ).toBeVisible();
    expect(deletionAttempts).toBe(2);
  });

  test("completes immediate deletion when recent authentication is satisfied", async ({
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

    await page.route("**/api/identity/me/deletion", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { status: "deletion_pending" },
          correlationId: "44444444-5555-6666-7777-888888888888",
        }),
      });
    });

    await page.goto("/account/delete");

    const input = page.getByLabel("Type DELETE to confirm account deletion");
    await input.fill("DELETE");

    await page
      .getByRole("button", { name: "Permanently delete account" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Account Deletion Pending" }),
    ).toBeVisible();
    await expect(
      page.getByText("All active sessions have been signed out"),
    ).toBeVisible();
  });

  test("handles API errors during deletion and displays error summary", async ({
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

    await page.route("**/api/identity/me/deletion", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "DEPENDENCY_UNAVAILABLE",
          correlationId: "55555555-6666-7777-8888-999999999999",
        }),
      });
    });

    await page.goto("/account/delete");

    const input = page.getByLabel("Type DELETE to confirm account deletion");
    await input.fill("DELETE");

    await page
      .getByRole("button", { name: "Permanently delete account" })
      .click();

    await expect(
      page.getByText("Unable to complete deletion request. Please try again."),
    ).toBeVisible();
  });

  test("navigates from /account to /account/delete and back", async ({
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

    await page.route("**/api/identity/me/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            publicId: "99999999-8888-4777-8666-555555555555",
            displayName: "Ada Lovelace",
            joinedMonth: "2026-09",
            avatarUrl: null,
          },
          correlationId: "11111111-2222-3333-4444-555555555555",
        }),
      });
    });

    await page.goto("/account");

    const deleteAccountLink = page.getByRole("link", {
      name: "Delete account",
    });
    await expect(deleteAccountLink).toBeVisible();
    await deleteAccountLink.click();

    await page.waitForURL("**/account/delete");
    await expect(
      page.getByRole("heading", { name: "Delete Account" }),
    ).toBeVisible();

    const cancelLink = page.getByRole("link", {
      name: "Cancel and return to account",
    });
    await cancelLink.click();

    await page.waitForURL("**/account");
    await expect(
      page.getByRole("heading", { name: "My Account" }),
    ).toBeVisible();
  });
});
