import { expect, test } from "@playwright/test";

test.describe("avatar upload, crop, and removal journey", () => {
  const testPublicId = "99999999-8888-4777-8666-555555555555";

  test("redirects unauthenticated user from /account to sign-in", async ({
    page,
  }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?returnTo=(%2F|\/)account/);
  });

  for (const width of [360, 1280]) {
    test(`renders avatar controls without horizontal overflow at ${width}px`, async ({
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

      await page.route("**/api/identity/me/profile", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              publicId: testPublicId,
              displayName: "Ada Lovelace",
              joinedMonth: "2026-09",
              avatarUrl: null,
            },
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      });

      await page.goto("/account");

      await expect(
        page.getByRole("heading", { name: "My Account" }),
      ).toBeVisible();
      await expect(page.locator(".avatar-fallback")).toHaveText("AL");

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });
  }

  test("validates file size limit (> 5 MB) on client and focuses error summary", async ({
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
            publicId: testPublicId,
            displayName: "Ada Lovelace",
            joinedMonth: "2026-09",
            avatarUrl: null,
          },
          correlationId: "11111111-2222-3333-4444-555555555555",
        }),
      });
    });

    await page.goto("/account");

    // Create a 6MB dummy file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Choose new avatar").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "oversized.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(6 * 1024 * 1024),
    });

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText("Image must be no larger than 5 MB."),
    ).toBeVisible();
  });

  test("validates unsupported file format on client and focuses error summary", async ({
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
            publicId: testPublicId,
            displayName: "Ada Lovelace",
            joinedMonth: "2026-09",
            avatarUrl: null,
          },
          correlationId: "11111111-2222-3333-4444-555555555555",
        }),
      });
    });

    await page.goto("/account");

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Choose new avatar").click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 ..."),
    });

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText("Choose a JPEG, PNG, or WebP image."),
    ).toBeVisible();
  });

  test("shows crop preview, saves avatar, and displays updated image", async ({
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
            publicId: testPublicId,
            displayName: "Ada Lovelace",
            joinedMonth: "2026-09",
            avatarUrl: null,
          },
          correlationId: "11111111-2222-3333-4444-555555555555",
        }),
      });
    });

    let uploaded = false;
    await page.route("**/api/identity/me/avatar", async (route) => {
      if (route.request().method() === "POST") {
        uploaded = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              status: "updated",
              profile: {
                publicId: testPublicId,
                displayName: "Ada Lovelace",
                joinedMonth: "2026-09",
                avatarUrl: `/media/avatars/${testPublicId}/1.webp`,
              },
            },
            correlationId: "22222222-3333-4444-5555-666666666666",
          }),
        });
      }
    });

    await page.goto("/account");

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Choose new avatar").click();
    const fileChooser = await fileChooserPromise;

    // Small valid 1x1 PNG
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await fileChooser.setFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });

    // Expect Crop preview to be displayed
    await expect(
      page.getByRole("heading", { name: "Adjust Square Crop" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save avatar" }),
    ).toBeVisible();

    // Click Save
    await page.getByRole("button", { name: "Save avatar" }).click();

    expect(uploaded).toBe(true);
    await expect(page.getByText("Avatar updated successfully.")).toBeVisible();
    const img = page.getByRole("img", { name: "Ada Lovelace's avatar" });
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute(
      "src",
      `/media/avatars/${testPublicId}/1.webp`,
    );
    await expect(
      page.getByRole("button", { name: "Remove avatar" }),
    ).toBeVisible();
  });

  test("removes avatar and restores fallback initials", async ({
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
            publicId: testPublicId,
            displayName: "Ada Lovelace",
            joinedMonth: "2026-09",
            avatarUrl: `/media/avatars/${testPublicId}/1.webp`,
          },
          correlationId: "11111111-2222-3333-4444-555555555555",
        }),
      });
    });

    let removed = false;
    await page.route("**/api/identity/me/avatar", async (route) => {
      if (route.request().method() === "DELETE") {
        removed = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              status: "updated",
              profile: {
                publicId: testPublicId,
                displayName: "Ada Lovelace",
                joinedMonth: "2026-09",
                avatarUrl: null,
              },
            },
            correlationId: "33333333-4444-5555-6666-777777777777",
          }),
        });
      }
    });

    await page.goto("/account");

    const removeBtn = page.getByRole("button", { name: "Remove avatar" });
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    expect(removed).toBe(true);
    await expect(page.getByText("Avatar removed.")).toBeVisible();
    await expect(page.locator(".avatar-fallback")).toHaveText("AL");
    await expect(
      page.getByRole("button", { name: "Remove avatar" }),
    ).not.toBeVisible();
  });

  test("handles broken avatar image gracefully by falling back to initials", async ({
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
            publicId: testPublicId,
            displayName: "Ada Lovelace",
            joinedMonth: "2026-09",
            avatarUrl: "/media/avatars/broken-image.webp",
          },
          correlationId: "11111111-2222-3333-4444-555555555555",
        }),
      });
    });

    // Make the media endpoint return 404
    await page.route("**/media/avatars/broken-image.webp", async (route) => {
      await route.fulfill({ status: 404 });
    });

    await page.goto("/account");

    // Because the image fails to load, onError triggers and renders initials fallback
    await expect(page.locator(".avatar-fallback")).toHaveText("AL");
  });
});
