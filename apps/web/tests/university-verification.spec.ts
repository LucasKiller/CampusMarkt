import { expect, test } from "@playwright/test";

test.describe("university verification account journeys", () => {
  for (const width of [360, 1280]) {
    test(`renders account settings with university verification section without horizontal overflow at ${width}px`, async ({
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

      await page.route(
        "**/api/identity/me/university-verification",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              data: {
                status: "none",
                universityId: null,
                badgeLabel: null,
                expiresAt: null,
                daysRemaining: null,
              },
              correlationId: "11111111-2222-3333-4444-555555555555",
            }),
          });
        },
      );

      await page.goto("/account");

      await expect(
        page.getByRole("heading", { name: "University Verification" }),
      ).toBeVisible();
      await expect(
        page.getByLabel("Institutional Email Address"),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Send Verification Email" }),
      ).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });
  }

  test("displays verified badge and 180-day expiry when active", async ({
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

    await page.route(
      "**/api/identity/me/university-verification",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              status: "verified",
              universityId: "tu-braunschweig",
              badgeLabel: "TU Braunschweig",
              expiresAt: "2027-03-21T10:00:00.000Z",
              daysRemaining: 180,
            },
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      },
    );

    await page.goto("/account");

    await expect(page.getByText("Verified · TU Braunschweig")).toBeVisible();
    await expect(page.getByText("Remaining validity: 180 days")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reverify / Renew" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Disconnect badge" }),
    ).toBeVisible();
  });

  test("displays expired state and reverification action when verification expired", async ({
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

    await page.route(
      "**/api/identity/me/university-verification",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              status: "expired",
              universityId: "tu-braunschweig",
              badgeLabel: null,
              expiresAt: "2026-03-21T10:00:00.000Z",
              daysRemaining: 0,
            },
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      },
    );

    await page.goto("/account");

    await expect(page.getByText("Affiliation Expired")).toBeVisible();
    await expect(page.getByText("Your affiliation has expired")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send Verification Email" }),
    ).toBeVisible();
  });

  test("validates initiation form: rejects empty input with accessible error", async ({
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

    await page.route(
      "**/api/identity/me/university-verification",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              status: "none",
              universityId: null,
              badgeLabel: null,
              expiresAt: null,
              daysRemaining: null,
            },
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      },
    );

    await page.goto("/account");

    await page.getByRole("button", { name: "Send Verification Email" }).click();

    const section = page.getByTestId("university-verification-section");
    const alert = section.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Enter an institutional email address.");
  });

  test("submits initiation form and shows 24h pending notice on success", async ({
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

    let getCount = 0;
    await page.route(
      "**/api/identity/me/university-verification",
      async (route) => {
        getCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              status: getCount > 1 ? "pending" : "none",
              universityId: "tu-braunschweig",
              badgeLabel: null,
              expiresAt: null,
              daysRemaining: null,
            },
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      },
    );

    await page.route(
      "**/api/identity/university-verifications",
      async (route) => {
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { status: "accepted" },
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      },
    );

    await page.goto("/account");

    await page
      .getByLabel("Institutional Email Address")
      .fill("student@tu-braunschweig.de");
    await page.getByRole("button", { name: "Send Verification Email" }).click();

    await expect(page.getByRole("status")).toContainText(
      "Verification email sent! Check your university inbox",
    );
  });

  test("confirms disconnect modal and purges verification", async ({
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

    let verificationActive = true;
    await page.route(
      "**/api/identity/me/university-verification",
      async (route) => {
        if (route.request().method() === "DELETE") {
          verificationActive = false;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              data: { status: "disconnected" },
              correlationId: "11111111-2222-3333-4444-555555555555",
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: verificationActive
              ? {
                  status: "verified",
                  universityId: "tu-braunschweig",
                  badgeLabel: "TU Braunschweig",
                  expiresAt: "2027-03-21T10:00:00.000Z",
                  daysRemaining: 180,
                }
              : {
                  status: "none",
                  universityId: null,
                  badgeLabel: null,
                  expiresAt: null,
                  daysRemaining: null,
                },
            correlationId: "11111111-2222-3333-4444-555555555555",
          }),
        });
      },
    );

    await page.goto("/account");

    await expect(page.getByText("Verified · TU Braunschweig")).toBeVisible();

    await page.getByRole("button", { name: "Disconnect badge" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Disconnect University Badge?" }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Confirm Disconnect" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "University verification disconnected successfully.",
    );
  });
});
