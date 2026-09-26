import { expect, test } from "@playwright/test";

const testModeratorId = "99999999-9999-4999-8999-999999999999";
const testListingId = "11111111-2222-3333-4444-555555555555";
const testUserId = "44444444-5555-6666-7777-888888888888";
const testReportId = "rep-1111-2222-3333-4444-555555555555";

test.describe("Marketplace Moderation E2E Journeys (T16)", () => {
  test("non-moderator cannot access /moderation and sees 403 access denied", async ({
    page,
    context,
  }) => {
    // 1. Authenticate as regular buyer
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // 2. Mock status API returning non-moderator
    await page.route("**/api/moderation/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { isModerator: false },
          correlationId: "corr-status-non-mod",
        }),
      });
    });

    await page.goto("/moderation");

    // 3. Verify 403 forbidden view is presented
    const forbidden = page.locator('[data-testid="moderation-forbidden"]');
    await expect(forbidden).toBeVisible();
    await expect(forbidden).toContainText("Zugriff verweigert (403)");
    await expect(forbidden).toContainText(
      "Dieser Bereich ist ausschließlich für autorisierte Moderatoren zugänglich.",
    );

    const homeLink = forbidden.locator("a");
    await expect(homeLink).toBeVisible();
  });

  test("moderator triages pending report and dismisses with mandatory justification note", async ({
    page,
    context,
  }) => {
    // 1. Authenticate as moderator
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "moderator",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // 2. Mock status API returning moderator: true
    await page.route("**/api/moderation/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { isModerator: true },
          correlationId: "corr-status-mod",
        }),
      });
    });

    // 3. Mock moderation queue returning 1 report
    await page.route("**/api/moderation/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            queue: [
              {
                id: testReportId,
                targetType: "listing",
                targetId: testListingId,
                reason: "prohibited_content",
                details: "Suspicious exam cheat sheet listing.",
                status: "pending",
                createdAt: "2026-09-26T01:00:00.000Z",
                listingTitle: "Exam Cheat Sheet Notes",
              },
            ],
          },
          correlationId: "corr-queue-1",
        }),
      });
    });

    // 4. Mock actions API
    let actionPayload: unknown = null;
    await page.route("**/api/moderation/actions", async (route) => {
      if (route.request().method() === "POST") {
        actionPayload = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { success: true, status: "dismissed" },
            correlationId: "corr-action-dismiss",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/moderation");

    // 5. Verify report card is visible
    const card = page.locator('[data-testid="moderation-report-card"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText("Exam Cheat Sheet Notes");
    await expect(card).toContainText("Verbotene Inhalte");

    // 6. Click dismiss button
    const dismissBtn = page.locator('[data-testid="dismiss-report-button"]');
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();

    // 7. Verify modal opens
    const modal = page.locator('[data-testid="moderation-action-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Meldung verwerfen");

    const submitBtn = page.locator('[data-testid="moderation-submit-button"]');
    await expect(submitBtn).toBeDisabled();

    // 8. Fill justification note
    const reasonInput = page.locator('[data-testid="moderation-reason-input"]');
    await reasonInput.fill("Unfounded report after manual content inspection.");
    await expect(submitBtn).toBeEnabled();

    // 9. Submit dismissal
    await submitBtn.click();

    // 10. Verify card is removed from queue and success notification appears
    await expect(
      page.locator('[data-testid="moderation-success-notice"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="empty-queue-message"]'),
    ).toBeVisible();

    expect(actionPayload).toMatchObject({
      actionType: "dismiss_report",
      reportId: testReportId,
      reason: "Unfounded report after manual content inspection.",
    });
  });

  test("moderator removes listing, verifying listing removal action cascades", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "moderator",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.route("**/api/moderation/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { isModerator: true },
          correlationId: "corr-status-mod",
        }),
      });
    });

    await page.route("**/api/moderation/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            queue: [
              {
                id: testReportId,
                targetType: "listing",
                targetId: testListingId,
                reason: "counterfeit_or_scam",
                details: "Fake concert tickets.",
                status: "pending",
                createdAt: "2026-09-26T01:30:00.000Z",
                listingTitle: "Campus Festival Tickets",
              },
            ],
          },
          correlationId: "corr-queue-2",
        }),
      });
    });

    let actionPayload: unknown = null;
    await page.route("**/api/moderation/actions", async (route) => {
      if (route.request().method() === "POST") {
        actionPayload = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { success: true, status: "removed" },
            correlationId: "corr-action-remove",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/moderation");

    const removeBtn = page.locator('[data-testid="remove-listing-button"]');
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    const modal = page.locator('[data-testid="moderation-action-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Inserat entfernen");
    await expect(modal).toContainText(
      "Aktive Reservierungen werden automatisch storniert.",
    );

    const reasonInput = page.locator('[data-testid="moderation-reason-input"]');
    await reasonInput.fill(
      "Confirmed counterfeit tickets violating campus marketplace policies.",
    );

    const submitBtn = page.locator('[data-testid="moderation-submit-button"]');
    await submitBtn.click();

    await expect(
      page.locator('[data-testid="moderation-success-notice"]'),
    ).toContainText(
      "Inserat erfolgreich entfernt und Reservierungen storniert.",
    );
    await expect(
      page.locator('[data-testid="empty-queue-message"]'),
    ).toBeVisible();

    expect(actionPayload).toMatchObject({
      actionType: "remove_listing",
      targetType: "listing",
      targetId: testListingId,
      reportId: testReportId,
      reason:
        "Confirmed counterfeit tickets violating campus marketplace policies.",
    });
  });

  test("moderator suspends user, verifying user suspension action", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "moderator",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.route("**/api/moderation/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { isModerator: true },
          correlationId: "corr-status-mod",
        }),
      });
    });

    await page.route("**/api/moderation/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            queue: [
              {
                id: testReportId,
                targetType: "user",
                targetId: testUserId,
                reason: "harassment_or_abuse",
                details: "Repeated harassment in chats.",
                status: "pending",
                createdAt: "2026-09-26T02:00:00.000Z",
                userName: "Rude User",
              },
            ],
          },
          correlationId: "corr-queue-3",
        }),
      });
    });

    let actionPayload: unknown = null;
    await page.route("**/api/moderation/actions", async (route) => {
      if (route.request().method() === "POST") {
        actionPayload = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { success: true, status: "suspended" },
            correlationId: "corr-action-suspend",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/moderation");

    const suspendBtn = page.locator('[data-testid="suspend-user-button"]');
    await expect(suspendBtn).toBeVisible();
    await suspendBtn.click();

    const modal = page.locator('[data-testid="moderation-action-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Nutzer sperren");
    await expect(modal).toContainText("Alle aktiven Inserate werden entfernt");

    const reasonInput = page.locator('[data-testid="moderation-reason-input"]');
    await reasonInput.fill(
      "Confirmed abusive behavior violating community guidelines.",
    );

    const submitBtn = page.locator('[data-testid="moderation-submit-button"]');
    await submitBtn.click();

    await expect(
      page.locator('[data-testid="moderation-success-notice"]'),
    ).toContainText("Nutzerkonto erfolgreich gesperrt.");

    expect(actionPayload).toMatchObject({
      actionType: "suspend_user",
      targetType: "user",
      targetId: testUserId,
      reportId: testReportId,
      reason: "Confirmed abusive behavior violating community guidelines.",
    });
  });

  test("moderator views immutable audit log with chronological records", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "moderator",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.route("**/api/moderation/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { isModerator: true },
          correlationId: "corr-status-mod",
        }),
      });
    });

    await page.route("**/api/moderation/audit*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            auditLog: [
              {
                id: "audit-1",
                moderatorId: testModeratorId,
                reportId: testReportId,
                actionType: "remove_listing",
                targetType: "listing",
                targetId: testListingId,
                reason: "Counterfeit festival tickets.",
                createdAt: "2026-09-26T02:15:00.000Z",
              },
              {
                id: "audit-2",
                moderatorId: testModeratorId,
                reportId: null,
                actionType: "suspend_user",
                targetType: "user",
                targetId: testUserId,
                reason: "Confirmed scammer.",
                createdAt: "2026-09-26T02:10:00.000Z",
              },
            ],
          },
          correlationId: "corr-audit-log",
        }),
      });
    });

    await page.goto("/moderation/audit");

    const auditList = page.locator('[data-testid="moderation-audit-list"]');
    await expect(auditList).toBeVisible();

    const rows = page.locator('[data-testid="audit-row"]');
    await expect(rows).toHaveCount(2);

    await expect(rows.nth(0)).toContainText("Inserat entfernt");
    await expect(rows.nth(0)).toContainText("Counterfeit festival tickets.");
    await expect(rows.nth(0)).toContainText(testListingId);

    await expect(rows.nth(1)).toContainText("Nutzer gesperrt");
    await expect(rows.nth(1)).toContainText("Confirmed scammer.");
    await expect(rows.nth(1)).toContainText(testUserId);
  });
});
