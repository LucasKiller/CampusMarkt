import { expect, test } from "@playwright/test";

test.describe("public and owner profile journeys", () => {
  const testPublicId = "99999999-8888-4777-8666-555555555555";

  for (const width of [360, 1280]) {
    test(`renders public profile page without horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });

      // Route the public profile API
      await page.route(
        `**/api/identity/profiles/${testPublicId}`,
        async (route) => {
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
        },
      );

      // Route the HTML request
      await page.goto(`/profiles/${testPublicId}`);

      await expect(
        page.getByRole("heading", { name: "Ada Lovelace" }),
      ).toBeVisible();
      await expect(page.getByText("Member since September 2026")).toBeVisible();
      await expect(page.locator(".avatar-fallback")).toHaveText("AD");

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });
  }

  test("renders avatar image when avatarUrl is present", async ({ page }) => {
    const avatarPublicId = "88888888-7777-4666-8555-444444444444";
    await page.route(
      `**/api/identity/profiles/${avatarPublicId}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              publicId: avatarPublicId,
              displayName: "Grace Hopper",
              joinedMonth: "2026-08",
              avatarUrl: "/media/avatars/sample.webp",
            },
            correlationId: "22222222-3333-4444-5555-666666666666",
          }),
        });
      },
    );

    await page.goto(`/profiles/${avatarPublicId}`);

    await expect(
      page.getByRole("heading", { name: "Grace Hopper" }),
    ).toBeVisible();
    const img = page.getByRole("img", { name: "Grace Hopper" });
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("src", "/media/avatars/sample.webp");
  });

  test("renders 404 not found page for non-existent public profile", async ({
    page,
  }) => {
    const missingPublicId = "00000000-0000-4000-8000-000000000000";
    await page.route(
      `**/api/identity/profiles/${missingPublicId}`,
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            code: "NOT_FOUND",
            correlationId: "33333333-4444-5555-6666-777777777777",
          }),
        });
      },
    );

    const response = await page.goto(`/profiles/${missingPublicId}`);
    expect(response?.status()).toBe(404);
  });

  test("validates short display name on account page and focuses error summary", async ({
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

    await page.goto("/account");

    const input = page.getByLabel("Public display name");
    await expect(input).toBeVisible();

    await input.fill("X");
    await page.getByRole("button", { name: "Save changes" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText("Display name must contain 2 to 50 characters."),
    ).toBeVisible();
  });

  test("validates display name with control characters or markup", async ({
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

    await page.goto("/account");

    const input = page.getByLabel("Public display name");
    await input.fill("<script>evil</script>");
    await page.getByRole("button", { name: "Save changes" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByText(
        "Enter a display name without control characters or markup.",
      ),
    ).toBeVisible();
  });

  test("successfully updates display name and reflects last-successful-write immediately", async ({
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
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              status: "updated",
              profile: {
                publicId: testPublicId,
                displayName: "Katherine Johnson",
                joinedMonth: "2026-09",
                avatarUrl: null,
              },
            },
            correlationId: "44444444-5555-6666-7777-888888888888",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/account");

    const input = page.getByLabel("Public display name");
    await input.fill("Katherine Johnson");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByText("Display name updated successfully!"),
    ).toBeVisible();
    await expect(
      page.getByText("Current display name: Katherine Johnson"),
    ).toBeVisible();
  });

  test("loads the saved registration name and keeps an updated name after refresh", async ({
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

    let savedName = "Registration Name";
    await page.route("**/api/identity/me/profile", async (route) => {
      if (route.request().method() === "PATCH") {
        savedName = JSON.parse(route.request().postData() || "{}").displayName;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              status: "updated",
              profile: {
                publicId: testPublicId,
                displayName: savedName,
                joinedMonth: "2026-09",
                avatarUrl: null,
              },
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            publicId: testPublicId,
            displayName: savedName,
            joinedMonth: "2026-09",
            avatarUrl: null,
          },
        }),
      });
    });

    await page.goto("/account");
    const input = page.getByLabel("Public display name");
    await expect(input).toHaveValue("Registration Name");
    await expect(
      page.getByText("Current display name: Registration Name"),
    ).toBeVisible();

    await input.fill("Updated Name");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByText("Current display name: Updated Name"),
    ).toBeVisible();

    await page.reload();
    await expect(input).toHaveValue("Updated Name");
    await expect(
      page.getByText("Current display name: Updated Name"),
    ).toBeVisible();
  });

  test("keeps an in-progress edit when the saved profile loads late", async ({
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

    let releaseRead!: () => void;
    const readGate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    await page.route("**/api/identity/me/profile", async (route) => {
      await readGate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { displayName: "Saved Name" },
        }),
      });
    });

    await page.goto("/account");
    const input = page.getByLabel("Public display name");
    await input.fill("Unsaved Edit");
    releaseRead();

    await expect(
      page.getByText("Current display name: Saved Name"),
    ).toBeVisible();
    await expect(input).toHaveValue("Unsaved Edit");
  });

  test("keeps a successful save when the initial profile read finishes late", async ({
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

    let releaseRead!: () => void;
    const readGate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    await page.route("**/api/identity/me/profile", async (route) => {
      if (route.request().method() === "GET") {
        await readGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, data: { displayName: "Old Name" } }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { profile: { displayName: "New Name" } },
        }),
      });
    });

    await page.goto("/account");
    const input = page.getByLabel("Public display name");
    await input.fill("New Name");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByText("Current display name: New Name"),
    ).toBeVisible();
    releaseRead();
    await expect(input).toHaveAttribute("aria-busy", "false");
    await expect(input).toHaveValue("New Name");
    await expect(
      page.getByText("Current display name: New Name"),
    ).toBeVisible();
  });

  test("does not present a placeholder as a saved name when profile read fails", async ({
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
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false }),
      });
    });

    await page.goto("/account");
    await expect(
      page.getByText(
        "Unable to load your display name. Please refresh the page.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Public display name")).toHaveValue("");
    await expect(page.getByText("Current display name: User")).toHaveCount(0);
  });
});
