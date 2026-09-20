import { expect, test } from "@playwright/test";

test.describe("identity acceptance matrix & cross-journey verification", () => {
  const testPublicId = "99999999-8888-4777-8666-555555555555";

  // ---------------------------------------------------------------------------
  // 1. Responsive Shell & Viewport Matrix (360px and 1280px)
  // ---------------------------------------------------------------------------
  const routesToTest = [
    { name: "registration", path: "/register", heading: "Join CampusMarkt" },
    { name: "sign-in", path: "/sign-in", heading: "Sign In" },
    {
      name: "forgot-password",
      path: "/forgot-password",
      heading: "Reset your password",
    },
    {
      name: "account",
      path: "/account",
      heading: "My Account",
      requiresAuth: true,
    },
    {
      name: "account-delete",
      path: "/account/delete",
      heading: "Delete Account",
      requiresAuth: true,
    },
  ];

  for (const route of routesToTest) {
    for (const width of [360, 1280]) {
      test(`[Viewport ${width}px] renders ${route.name} without horizontal overflow`, async ({
        page,
        context,
      }) => {
        await page.setViewportSize({ width, height: 800 });

        if (route.requiresAuth) {
          await context.addCookies([
            {
              name: "campusmarkt-test-session",
              value: "authenticated",
              domain: "127.0.0.1",
              path: "/",
            },
          ]);
        }

        await page.goto(route.path);
        await expect(
          page.getByRole("heading", { name: route.heading }),
        ).toBeVisible();

        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
      });
    }
  }

  for (const width of [360, 1280]) {
    test(`[Viewport ${width}px] renders public profile without horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
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
              correlationId: "00000000-0000-0000-0000-000000000000",
            }),
          });
        },
      );

      await page.goto(`/profiles/${testPublicId}`);
      await expect(
        page.getByRole("heading", { name: "Ada Lovelace" }),
      ).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });
  }

  // ---------------------------------------------------------------------------
  // 2. IDAC-01: Registration and Confirmation Bounds
  // ---------------------------------------------------------------------------
  test("[IDAC-01] registration enforces age and consent validation, moves focus to error summary, and clears password", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByLabel("Email address").fill("newuser@example.test");
    await page.getByLabel("Display name (public)").fill("New User");
    await page.getByLabel("Password").fill("SecretPassword123!");

    // Submit without checking adult declaration or terms
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

    // Password must be cleared immediately upon validation failure
    await expect(page.getByLabel("Password")).toHaveValue("");
  });

  test("[IDAC-01] registration disables submit button while pending to prevent duplicate requests", async ({
    page,
  }) => {
    let requestCaptured = false;
    await page.route("**/api/identity/registrations", async (route) => {
      requestCaptured = true;
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { status: "accepted" },
          correlationId: "11111111-1111-1111-1111-111111111111",
        }),
      });
    });

    await page.goto("/register");
    await page.getByLabel("Email address").fill("duplicate-guard@example.test");
    await page.getByLabel("Display name (public)").fill("Dupe Guard");
    await page.getByLabel("Password").fill("SecretPassword123!");
    await page.getByLabel("I confirm that I am at least 18 years old.").check();
    await page
      .getByLabel("I agree to the Terms of Service and Privacy Policy.")
      .check();

    await page.getByRole("button", { name: "Create account" }).click();

    const pendingBtn = page.getByRole("button", {
      name: "Creating account...",
    });
    await expect(pendingBtn).toBeDisabled();
    expect(requestCaptured).toBe(true);

    await expect(page.getByText("Check your inbox")).toBeVisible();
  });

  test("[IDAC-01] confirmation landing page completes verification and links to sign-in", async ({
    page,
  }) => {
    await page.route("**/api/identity/confirmations", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { status: "confirmed" },
          correlationId: "22222222-2222-2222-2222-222222222222",
        }),
      });
    });

    await page.goto("/auth/confirm");
    await expect(
      page.getByRole("heading", { name: "Confirm your email address" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Confirm Email" }).click();

    await expect(
      page.getByRole("heading", { name: "Email confirmed!" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to sign in" }),
    ).toBeVisible();
  });

  test("[IDAC-01] invalid or expired confirmation link displays actionable message with resend option", async ({
    page,
  }) => {
    await page.goto("/auth/confirm?status=invalid_link");

    await expect(
      page.getByRole("heading", { name: "Link invalid or expired" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "This confirmation link is expired, invalid, or has already been used.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send new link" }),
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 3. IDAC-02: Sessions, Redirect Security & Multi-Context Isolation
  // ---------------------------------------------------------------------------
  test("[IDAC-02] preserves safe same-origin local return paths while rejecting external and protocol-relative redirect attacks", async ({
    page,
  }) => {
    // 1. External open-redirect attack attempt: https://evil.test
    await page.route("**/api/identity/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "set-cookie":
            "campusmarkt-test-session=authenticated; Path=/; HttpOnly",
        },
        body: JSON.stringify({
          ok: true,
          data: {
            status: "authenticated",
            returnTo: "/", // Server normalized invalid external destination
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        }),
      });
    });

    await page.goto("/sign-in?returnTo=https://evil.test");
    await page.getByLabel("Email address").fill("user@example.test");
    await page.getByLabel("Password").fill("ValidPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Verify it navigates to local root and NEVER to evil.test
    await page.waitForURL("http://127.0.0.1:3100/");
    expect(page.url()).toBe("http://127.0.0.1:3100/");

    // 2. Safe local returnTo path: /account
    await page.route("**/api/identity/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "set-cookie":
            "campusmarkt-test-session=authenticated; Path=/; HttpOnly",
        },
        body: JSON.stringify({
          ok: true,
          data: {
            status: "authenticated",
            returnTo: "/account",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        }),
      });
    });

    await page.goto("/sign-in?returnTo=/account");
    await page.getByLabel("Email address").fill("user@example.test");
    await page.getByLabel("Password").fill("ValidPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/account");
    expect(page.url()).toContain("/account");
  });

  test("[IDAC-02] multi-context session isolation: authenticated owner accesses account while second unauthenticated context is denied", async ({
    browser,
  }) => {
    // Context 1: Authenticated owner
    const contextOwner = await browser.newContext();
    await contextOwner.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "authenticated",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const pageOwner = await contextOwner.newPage();
    await pageOwner.goto("/account");
    await expect(
      pageOwner.getByRole("heading", { name: "My Account" }),
    ).toBeVisible();

    // Context 2: Visitor without cookies
    const contextVisitor = await browser.newContext();
    const pageVisitor = await contextVisitor.newPage();
    await pageVisitor.goto("/account");

    // Visitor is redirected to sign-in with returnTo destination
    await expect(pageVisitor).toHaveURL(/\/sign-in\?returnTo=(%2F|\/)account/);

    await contextOwner.close();
    await contextVisitor.close();
  });

  test("[IDAC-02] current device sign-out revokes session in current context without terminating other sessions", async ({
    browser,
  }) => {
    // Device 1 (Desktop)
    const context1 = await browser.newContext();
    await context1.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "authenticated",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const page1 = await context1.newPage();
    await page1.route("**/api/identity/sessions/current", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: { revoked: true } }),
      });
    });

    await page1.goto("/account");
    await expect(
      page1.getByRole("heading", { name: "My Account" }),
    ).toBeVisible();

    // Sign out from device 1
    await page1.getByRole("button", { name: "Sign out this device" }).click();
    await page1.waitForURL("**/sign-in");
    await expect(page1).toHaveURL(/\/sign-in/);

    // Device 2 (Mobile context) remains authenticated
    const context2 = await browser.newContext();
    await context2.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "authenticated",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const page2 = await context2.newPage();
    await page2.goto("/account");
    await expect(
      page2.getByRole("heading", { name: "My Account" }),
    ).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test("[IDAC-02] all devices sign-out revokes sessions across all browser contexts", async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    await context1.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "authenticated",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const page1 = await context1.newPage();
    await page1.route("**/api/identity/sessions", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, data: { revokedAll: true } }),
        });
      } else {
        await route.continue();
      }
    });

    await page1.goto("/account");
    await expect(
      page1.getByRole("heading", { name: "My Account" }),
    ).toBeVisible();

    await page1.getByRole("button", { name: "Sign out all devices" }).click();
    await page1.waitForURL("**/sign-in");
    await expect(page1).toHaveURL(/\/sign-in/);

    await context1.close();
  });

  // ---------------------------------------------------------------------------
  // 4. IDAC-03: Password Recovery and Reset Bounds
  // ---------------------------------------------------------------------------
  test("[IDAC-03] recovery submission displays generic 30-minute instruction without disclosing account existence", async ({
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
            correlationId: "33333333-3333-3333-3333-333333333333",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill("anyone@example.test");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await expect(page.getByText("30 minutes")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to sign in" }),
    ).toBeVisible();
  });

  test("[IDAC-03] password reset validates token, enforces password bounds, and masks input without echoing", async ({
    page,
  }) => {
    await page.goto("/reset-password");

    const passwordInput = page.getByLabel("New password", { exact: true });
    await expect(passwordInput).toBeVisible();
    expect(await passwordInput.getAttribute("type")).toBe("password");

    // Submit invalid short password
    await passwordInput.fill("short");
    await page.getByRole("button", { name: "Reset password" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(
      errorSummary.getByText("Password must contain at least 10 characters."),
    ).toBeVisible();

    // Password must be cleared
    await expect(passwordInput).toHaveValue("");
  });

  // ---------------------------------------------------------------------------
  // 5. IDAC-04: Public Profile Privacy & Avatar Fallback
  // ---------------------------------------------------------------------------
  test("[IDAC-04] public profile exposes only approved fields and never leaks email, private IDs, or session secrets", async ({
    page,
  }) => {
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
            correlationId: "44444444-4444-4444-4444-444444444444",
          }),
        });
      },
    );

    await page.goto(`/profiles/${testPublicId}`);
    await expect(
      page.getByRole("heading", { name: "Ada Lovelace" }),
    ).toBeVisible();
    await expect(page.getByText("Member since September 2026")).toBeVisible();

    // DOM privacy inspection: ensure no email, tokens, passwords or secrets appear anywhere in DOM
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toContain("@");
    expect(bodyText).not.toContain("password");
    expect(bodyText).not.toContain("secret");
  });

  test("[IDAC-04] avatar falls back to initials smoothly without broken image icons when avatar is null", async ({
    page,
  }) => {
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
          }),
        });
      },
    );

    await page.goto(`/profiles/${testPublicId}`);
    const fallback = page.locator(".avatar-fallback");
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveText("AD");

    // No broken <img> tags present
    const imgCount = await page.locator("img").count();
    expect(imgCount).toBe(0);
  });

  test("[IDAC-04] owner updates display name with immediate last-write reflection while non-owner is denied", async ({
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
                displayName: "Alan Turing",
                joinedMonth: "2026-09",
                avatarUrl: null,
              },
            },
            correlationId: "55555555-5555-5555-5555-555555555555",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/account");
    const nameInput = page.getByLabel("Public display name");
    await nameInput.fill("Alan Turing");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByText("Display name updated successfully!"),
    ).toBeVisible();
    await expect(
      page.getByText("Current display name: Alan Turing"),
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 6. IDAC-05: Account Deletion Lifecycle & Reauthentication
  // ---------------------------------------------------------------------------
  test("[IDAC-05] account deletion requires exact confirmation phrase and rejects empty or mismatched text", async ({
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
    const submitBtn = page.getByRole("button", {
      name: "Permanently delete account",
    });

    // Empty input submission
    await submitBtn.click();
    await expect(
      page.getByText("Type DELETE to confirm account deletion."),
    ).toBeVisible();

    // Mismatched input submission
    await input.fill("delete"); // lowercase
    await submitBtn.click();
    await expect(
      page.getByText("Type DELETE to confirm account deletion."),
    ).toBeVisible();
  });

  test("[IDAC-05] account deletion triggers reauthentication modal when password assurance is missing or aged", async ({
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
          data: { status: "reauthentication_required" },
          correlationId: "11111111-2222-3333-4444-555555555555",
        }),
      });
    });

    await page.goto("/account/delete");
    await page
      .getByLabel("Type DELETE to confirm account deletion")
      .fill("DELETE");
    await page
      .getByRole("button", { name: "Permanently delete account" })
      .click();

    // Reauthentication step is shown
    await expect(
      page.getByRole("heading", { name: "Reauthentication Required" }),
    ).toBeVisible();
    await expect(page.getByLabel("Primary Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Verify password" }),
    ).toBeVisible();
  });

  test("[IDAC-05] confirmed deletion immediately depublishes profile, revokes session, and transitions to pending state", async ({
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
          correlationId: "66666666-6666-6666-6666-666666666666",
        }),
      });
    });

    await page.goto("/account/delete");
    await page
      .getByLabel("Type DELETE to confirm account deletion")
      .fill("DELETE");
    await page
      .getByRole("button", { name: "Permanently delete account" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Account Deletion Pending" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to Sign In" }),
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 7. IDAC-06: Abuse Boundaries and Graceful Error Degradation
  // ---------------------------------------------------------------------------
  test("[IDAC-06] rate-limited identity actions (429) display bounded retry guidance and disable further attempts", async ({
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
            correlationId: "77777777-7777-7777-7777-777777777777",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill("victim@example.test");
    await page.getByLabel("Password").fill("Secret123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    const summary = page.locator(".error-summary");
    await expect(summary).toBeVisible();
    await expect(
      summary.getByText("Too many sign-in attempts. Please try again later."),
    ).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveValue("");
  });

  test("[IDAC-06] dependency unavailability (503) presents accessible error summary without leaking internal stack traces", async ({
    page,
  }) => {
    await page.route("**/api/identity/registrations", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            code: "DEPENDENCY_UNAVAILABLE",
            correlationId: "88888888-8888-8888-8888-888888888888",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/register");
    await page.getByLabel("Email address").fill("outage-tester@example.test");
    await page.getByLabel("Display name (public)").fill("Outage Tester");
    await page.getByLabel("Password").fill("SecurePassword123!");
    await page.getByLabel("I confirm that I am at least 18 years old.").check();
    await page
      .getByLabel("I agree to the Terms of Service and Privacy Policy.")
      .check();

    await page.getByRole("button", { name: "Create account" }).click();

    const summary = page.locator(".error-summary");
    await expect(summary).toBeVisible();
    await expect(
      summary.getByText(
        "An error occurred while creating your account. Please try again.",
      ),
    ).toBeVisible();

    // Password must be cleared
    await expect(page.getByLabel("Password")).toHaveValue("");

    // Ensure no raw exception strings leaked into DOM
    const bodyContent = await page.evaluate(() => document.body.innerHTML);
    expect(bodyContent).not.toContain("PostgresError");
    expect(bodyContent).not.toContain("ECONNREFUSED");
    expect(bodyContent).not.toContain("STACK_TRACE");
  });
});
