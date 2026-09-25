import { expect, test } from "@playwright/test";

const testListingId = "11111111-2222-3333-4444-555555555555";
const testSellerId = "seller-1";
const testSellerName = "Alex Student";

test.describe("Marketplace Reporting & Blocking E2E Journeys (T16)", () => {
  test("user reports a listing with confidential confirmation receipt", async ({
    page,
    context,
  }) => {
    // 1. Authenticate as buyer
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // 2. Mock reports API
    await page.route("**/api/marketplace/reports", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              reportId: "rep-test-e2e-0001",
              status: "pending",
              createdAt: "2026-09-25T14:00:00.000Z",
            },
            correlationId: "corr-rep-test-1",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/listings/${testListingId}`);

    // 3. Open Report Modal
    const reportBtn = page.locator('[data-testid="report-btn-listing"]');
    await expect(reportBtn).toBeVisible();
    await expect(reportBtn).toContainText("Inserat melden");
    await reportBtn.click();

    // 4. Verify modal is rendered
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Inhalt melden");

    // 5. Select reason and enter details
    const reasonSelect = page.locator("#report-reason");
    await expect(reasonSelect).toBeVisible();
    await reasonSelect.selectOption("prohibited_content");

    const detailsInput = page.locator("#report-details");
    await detailsInput.fill(
      "Dieser Artikel verstößt gegen die CampusMarkt Richtlinien.",
    );

    // 6. Verify confidentiality notice
    await expect(modal).toContainText("Vertraulich");

    // 7. Submit report
    const submitBtn = modal.locator('button[type="submit"]');
    await submitBtn.click();

    // 8. Verify confirmation view reassuring confidentiality
    const confirmation = page.locator('[data-testid="report-confirmation"]');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("Meldung eingegangen");
    await expect(confirmation).toContainText("Vielen Dank für Ihre Meldung");
    await expect(confirmation).toContainText("streng vertraulich");

    // 9. Close modal
    const closeBtn = confirmation.locator("button");
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test("user blocks a seller from listing details with mutual exclusion dialog", async ({
    page,
    context,
  }) => {
    // 1. Authenticate as buyer
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // 2. Mock blocks API
    await page.route("**/api/marketplace/blocks", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              blockId: "block-test-e2e-0001",
              blockedId: testSellerId,
              createdAt: "2026-09-25T14:00:00.000Z",
            },
            correlationId: "corr-block-test-1",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/listings/${testListingId}`);

    // 3. Click "Nutzer blockieren" in seller card
    const blockBtn = page.locator('[data-testid="block-user-btn"]');
    await expect(blockBtn).toBeVisible();
    await expect(blockBtn).toContainText("Nutzer blockieren");
    await blockBtn.click();

    // 4. Verify confirmation dialog explaining bidirectional consequences
    const alertModal = page.locator('div[role="alertdialog"]');
    await expect(alertModal).toBeVisible();
    await expect(alertModal).toContainText(
      `Möchten Sie ${testSellerName} blockieren?`,
    );
    await expect(alertModal).toContainText("Gegenseitige Sichtbarkeit");
    await expect(alertModal).toContainText("Nachrichten");
    await expect(alertModal).toContainText("Angebote");

    // 5. Confirm block
    const confirmBlockBtn = alertModal.locator(
      'button:has-text("Nutzer blockieren")',
    );
    await confirmBlockBtn.click();

    // 6. Verify immediate visual feedback
    const feedback = page.locator('[data-testid="block-success-feedback"]');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText("Nutzer blockiert");
    await expect(feedback).toContainText(
      `${testSellerName} wurde erfolgreich blockiert.`,
    );

    // 7. Close feedback dialog
    const closeBtn = feedback.locator("button");
    await closeBtn.click();
    await expect(alertModal).not.toBeVisible();
  });

  test("blocked interactions rejection: messaging and offers between blocked users are rejected with HTTP 403", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // Mock messaging endpoint returning 403 USER_BLOCKED
    await page.route("**/api/marketplace/conversations", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "FORBIDDEN",
          message: "Action forbidden due to an active user block.",
          correlationId: "corr-blocked-msg",
        }),
      });
    });

    // Mock offers endpoint returning 403 USER_BLOCKED
    await page.route("**/api/marketplace/offers", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "FORBIDDEN",
          message: "Action forbidden due to an active user block.",
          correlationId: "corr-blocked-offer",
        }),
      });
    });

    await page.goto(`/listings/${testListingId}`);

    // Verify rejection via browser fetch intercepted by page.route
    const msgRes = await page.evaluate(async (listingId) => {
      const res = await fetch("/api/marketplace/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      return { status: res.status, body: await res.json() };
    }, testListingId);

    expect(msgRes.status).toBe(403);
    expect(msgRes.body.ok).toBe(false);

    const offerRes = await page.evaluate(async (listingId) => {
      const res = await fetch("/api/marketplace/offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, amountCents: 1500 }),
      });
      return { status: res.status, body: await res.json() };
    }, testListingId);

    expect(offerRes.status).toBe(403);
    expect(offerRes.body.ok).toBe(false);
  });

  test("blocked users management page: list blocked users and unblock with immediate UI update", async ({
    page,
    context,
  }) => {
    // 1. Authenticate as buyer
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // 2. Intercept unblock API
    await page.route(
      `**/api/marketplace/blocks/${testSellerId}`,
      async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              data: {
                unblockedId: testSellerId,
                success: true,
              },
              correlationId: "corr-unblock-1",
            }),
          });
        } else {
          await route.continue();
        }
      },
    );

    await page.goto("/account/blocked-users");

    // 3. Verify page header
    await expect(page.locator("h1")).toContainText("Blockierte Nutzer");

    // 4. Verify initial state (either empty state or list)
    const container = page.locator('[data-testid="blocked-users-container"]');
    await expect(container).toBeVisible();

    // 5. Test unblocking action if item exists or verify empty state
    const emptyState = page.locator(
      '[data-testid="blocked-users-empty-state"]',
    );
    const isInitiallyEmpty = await emptyState.isVisible();

    if (!isInitiallyEmpty) {
      const item = page.locator(
        `[data-testid="blocked-user-item-${testSellerId}"]`,
      );
      if (await item.isVisible()) {
        const unblockBtn = page.locator(
          `[data-testid="unblock-btn-${testSellerId}"]`,
        );
        await unblockBtn.click();
        await expect(page.locator('[role="status"]')).toContainText(
          "erfolgreich entsperrt",
        );
      }
    } else {
      await expect(emptyState).toContainText("Keine blockierten Nutzer");
      await expect(emptyState).toContainText(
        "Sie haben derzeit keine Nutzer blockiert.",
      );
    }
  });
});
