import { expect, test } from "@playwright/test";

const testListingId = "11111111-2222-3333-4444-555555555555";
const testSoldListingId = "listing-sold-0000-0000-0000-000000000001";

test.describe("Marketplace Pickup Completion & Handover E2E Journeys (T16)", () => {
  test("safe pickup guidance and seller completion flow with confirmation modal", async ({
    page,
    context,
  }) => {
    // Authenticate as the seller
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "seller",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // Mock complete pickup API
    await page.route(
      "**/api/marketplace/reservations/*/complete",
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              data: {
                reservationId: "res-test-e2e-1",
                listingId: testListingId,
                status: "completed",
                agreedPriceCents: 2000,
                completedAt: "2026-09-24T18:00:00.000Z",
              },
              correlationId: "corr-complete-test-1",
            }),
          });
        } else {
          await route.continue();
        }
      },
    );

    await page.goto("/account/reservations");

    // 1. Verify Safe Pickup Checklist is visible
    const checklist = page.locator('[data-testid="safe-pickup-checklist"]');
    await expect(checklist).toBeVisible();
    await expect(checklist).toContainText("Sichere Übergabe auf dem Campus");
    await expect(checklist).toContainText(
      "Leitfaden für die persönliche Abholung und Barzahlung",
    );

    // 2. Verify active reservation details and seller complete trigger button
    const resCard = page.locator(
      '[data-testid="reservation-card-res-test-e2e-1"]',
    );
    await expect(resCard).toBeVisible();
    await expect(resCard).toContainText("Calculus Textbook 3rd Edition");
    await expect(resCard).toContainText("€20.00");
    await expect(resCard).toContainText("Campus Nord / Bienrode");

    const completeBtn = page.locator(
      '[data-testid="complete-handover-trigger"]',
    );
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    // 3. Verify confirmation modal opens
    const modal = page.locator('[data-testid="complete-handover-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Übergabe abschließen");
    await expect(modal).toContainText(
      "Bestätige die persönliche Übergabe und Bezahlung",
    );
    await expect(modal).toContainText("Dieser Schritt ist endgültig");

    // 4. Enter optional completion note
    const noteInput = page.locator('[data-testid="completion-note-input"]');
    await noteInput.fill(
      "Barzahlung vor Ort am Campus Nord erfolgreich abgewickelt.",
    );

    // 5. Confirm completion
    const confirmBtn = page.locator(
      '[data-testid="complete-handover-confirm"]',
    );
    await confirmBtn.click();

    // 6. Verify modal closes, feedback banner appears, and badge transitions to completed
    await expect(modal).not.toBeVisible();
    const successBanner = page.locator('[data-testid="cancellation-success"]');
    await expect(successBanner).toBeVisible();
    await expect(successBanner).toContainText(
      "erfolgreich abgeschlossen! Das Inserat wurde als verkauft markiert.",
    );

    const statusBadge = page.locator(
      '[data-testid="reservation-status-badge-res-test-e2e-1"]',
    );
    await expect(statusBadge).toContainText("Abgeschlossen");
  });

  test("sold listing detail page displays sold banner and hides negotiation and purchase CTAs", async ({
    page,
    context,
  }) => {
    // Authenticate as a buyer
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto(`/listings/${testSoldListingId}`);

    // Verify prominent sold banner and badge
    const soldBanner = page.locator('[data-testid="sold-banner"]');
    await expect(soldBanner).toBeVisible();
    await expect(soldBanner).toContainText(
      "Dieser Artikel wurde erfolgreich verkauft und übergeben.",
    );

    const soldBadge = page.locator('[data-testid="badge-sold"]');
    await expect(soldBadge).toBeVisible();
    await expect(soldBadge).toContainText("Verkauft");

    // Verify purchase, offer, and messaging CTAs are hidden
    const buyNowBtn = page.locator('[data-testid="cta-buy-now"]');
    const makeOfferBtn = page.locator('[data-testid="cta-make-offer"]');
    const messageBtn = page.locator('[data-testid="message-button"]');

    await expect(buyNowBtn).not.toBeVisible();
    await expect(makeOfferBtn).not.toBeVisible();
    await expect(messageBtn).not.toBeVisible();
  });

  test("completed transaction history displays completed sales for seller and completed purchases for buyer", async ({
    page,
    context,
  }) => {
    // 1. As Seller: view completed sales
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "seller",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/account/reservations?tab=completed");

    // Filter tab shows completed
    const completedTab = page.locator('[data-testid="filter-completed-btn"]');
    await expect(completedTab).toBeVisible();

    const completedCard = page.locator(
      '[data-testid="reservation-card-res-test-e2e-completed"]',
    );
    await expect(completedCard).toBeVisible();
    await expect(completedCard).toContainText("Vintage Desk Lamp");
    await expect(completedCard).toContainText("€15.00");
    await expect(completedCard).toContainText("Abgeschlossen");
    await expect(completedCard).toContainText("Lisa Buyer");

    const trustBadge = page.locator(
      '[data-testid="partner-trust-badge-res-test-e2e-completed"]',
    );
    await expect(trustBadge).toBeVisible();
    await expect(trustBadge).toContainText("TU Braunschweig");

    // 2. As Buyer: view completed purchases
    await context.clearCookies();
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/account/reservations?tab=completed");

    const buyerCompletedCard = page.locator(
      '[data-testid="reservation-card-res-test-e2e-completed"]',
    );
    await expect(buyerCompletedCard).toBeVisible();
    await expect(buyerCompletedCard).toContainText("Vintage Desk Lamp");
    await expect(buyerCompletedCard).toContainText("Verkäufer:");
    await expect(buyerCompletedCard).toContainText("Sarah TU");
  });

  test("concurrent cancellation is rejected with conflict error when reservation is already completed", async ({
    page,
    context,
  }) => {
    // Authenticate as a buyer attempting to cancel
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // Mock cancellation route returning HTTP 409 conflict
    await page.route(
      "**/api/marketplace/reservations/*/cancel",
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              ok: false,
              code: "RESERVATION_NOT_ACTIVE",
              message:
                "Die Reservierung ist nicht mehr aktiv und kann nicht storniert werden.",
            }),
          });
        } else {
          await route.continue();
        }
      },
    );

    await page.goto("/account/reservations");

    // Open cancellation modal
    const cancelBtn = page.locator(
      '[data-testid="cancel-reservation-btn-res-test-e2e-1"]',
    );
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    const cancelModal = page.locator(
      '[data-testid="cancel-reservation-modal"]',
    );
    await expect(cancelModal).toBeVisible();

    // Confirm cancellation
    const confirmCancelBtn = page.locator(
      '[data-testid="confirm-cancel-reservation-btn"]',
    );
    await confirmCancelBtn.click();

    // Modal stays or displays error, action error message is displayed
    const actionError = page.locator('[data-testid="cancellation-error"]');
    await expect(actionError).toBeVisible();
    await expect(actionError).toContainText(
      "Die Reservierung ist nicht mehr aktiv und kann nicht storniert werden.",
    );
  });
});
