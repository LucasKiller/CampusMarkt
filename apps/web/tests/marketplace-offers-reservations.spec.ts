import { expect, test } from "@playwright/test";

const testListingId = "11111111-2222-3333-4444-555555555555";

test.describe("Marketplace Offers, Negotiation & Reservations E2E Journeys (T16)", () => {
  test("self-purchase prevention: sellers cannot buy or make offers on their own listings", async ({
    page,
    context,
  }) => {
    // Authenticate as the seller of the listing
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "seller",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto(`/listings/${testListingId}`);

    // Verify buyer negotiation action CTAs are NOT shown to the seller
    const buyNowBtn = page.locator('[data-testid="cta-buy-now"]');
    const makeOfferBtn = page.locator('[data-testid="cta-make-offer"]');
    await expect(buyNowBtn).not.toBeVisible();
    await expect(makeOfferBtn).not.toBeVisible();

    // Verify seller offers management card is shown instead
    const sellerCard = page.locator('[data-testid="seller-offers-card"]');
    await expect(sellerCard).toBeVisible();
  });

  test("buyer purchase intent and seller acceptance to reserve listing", async ({
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

    // Intercept offer submission
    await page.route("**/api/marketplace/offers", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              offerId: "off-intent-101",
              listingId: testListingId,
              amountCents: 2450,
            },
            correlationId: "corr-offer-intent-101",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/listings/${testListingId}`);

    // Click Buy Now (Kaufanfrage senden)
    const buyNowBtn = page.locator('[data-testid="cta-buy-now"]');
    await expect(buyNowBtn).toBeVisible();
    await buyNowBtn.click();

    // Verify OfferModal opens
    const modal = page.locator('[data-testid="offer-modal-dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Kaufanfrage & Preisvorschlag");

    // Fill message and submit
    const messageInput = page.locator("#offer-message-input");
    await messageInput.fill(
      "Hallo, ich möchte das Buch gerne zum Festpreis kaufen.",
    );

    const submitBtn = page.locator('[data-testid="submit-intent-btn"]');
    await submitBtn.click();

    // Modal closes and pending offer status card appears
    await expect(modal).not.toBeVisible();
    const pendingCard = page.locator(
      '[data-testid="buyer-pending-offer-card"]',
    );
    await expect(pendingCard).toBeVisible();
    await expect(pendingCard).toContainText("€24.50");
    await expect(pendingCard).toContainText("Ausstehend beim Verkäufer");
  });

  test("buyer price negotiation with counteroffer flow", async ({
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

    await page.route("**/api/marketplace/offers", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              offerId: "off-negotiation-202",
              listingId: testListingId,
              amountCents: 1800,
            },
            correlationId: "corr-offer-negotiation-202",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/listings/${testListingId}`);

    // Click Make Offer (Preis vorschlagen)
    const makeOfferBtn = page.locator('[data-testid="cta-make-offer"]');
    await expect(makeOfferBtn).toBeVisible();
    await makeOfferBtn.click();

    // Verify modal is open on offer tab
    const modal = page.locator('[data-testid="offer-modal-dialog"]');
    await expect(modal).toBeVisible();
    await expect(page.locator('[data-testid="tab-offer"]')).toBeVisible();

    // Enter offer amount below asking price
    const amountInput = page.locator("#offer-amount-input");
    await amountInput.fill("18.00");

    const messageInput = page.locator("#offer-message-input");
    await messageInput.fill(
      "Wären 18 Euro für die Übergabe am Hauptcampus in Ordnung?",
    );

    const submitBtn = page.locator('[data-testid="submit-offer-btn"]');
    await submitBtn.click();

    await expect(modal).not.toBeVisible();
    const pendingCard = page.locator(
      '[data-testid="buyer-pending-offer-card"]',
    );
    await expect(pendingCard).toBeVisible();
    await expect(pendingCard).toContainText("€18.00");
  });

  test("reservations dashboard: viewing active reservation and cancelling with structured reason", async ({
    page,
    context,
  }) => {
    // Authenticate user
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    // Intercept cancellation API
    await page.route(
      "**/api/marketplace/reservations/*/cancel",
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
                status: "cancelled",
              },
              correlationId: "corr-cancel-303",
            }),
          });
        } else {
          await route.continue();
        }
      },
    );

    await page.goto("/account/reservations");

    // Verify active reservation card is visible
    const resCard = page.locator(
      '[data-testid="reservation-card-res-test-e2e-1"]',
    );
    await expect(resCard).toBeVisible();
    await expect(resCard).toContainText("Calculus Textbook 3rd Edition");
    await expect(resCard).toContainText("€20.00");
    await expect(resCard).toContainText("Campus Nord / Bienrode");

    // Verify partner info and university badge
    const partnerName = page.locator(
      '[data-testid="reservation-partner-name-res-test-e2e-1"]',
    );
    await expect(partnerName).toContainText("Alex Student");

    const badge = page.locator(
      '[data-testid="partner-trust-badge-res-test-e2e-1"]',
    );
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("TU Braunschweig");

    // Click cancel reservation button
    const cancelBtn = page.locator(
      '[data-testid="cancel-reservation-btn-res-test-e2e-1"]',
    );
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Verify cancellation modal opens
    const cancelModal = page.locator(
      '[data-testid="cancel-reservation-modal"]',
    );
    await expect(cancelModal).toBeVisible();
    await expect(cancelModal).toContainText("Reservierung stornieren");

    // Select structured cancellation reason
    const reasonSelect = page.locator(
      '[data-testid="cancellation-reason-select"]',
    );
    await reasonSelect.selectOption("scheduling_conflict");

    // Confirm cancellation
    const confirmCancelBtn = page.locator(
      '[data-testid="confirm-cancel-reservation-btn"]',
    );
    await confirmCancelBtn.click();

    // Modal closes and success banner appears
    await expect(cancelModal).not.toBeVisible();
    const successBanner = page.locator('[data-testid="cancellation-success"]');
    await expect(successBanner).toBeVisible();
    await expect(successBanner).toContainText(
      "wurde erfolgreich storniert. Das Inserat ist wieder als aktiv gelistet.",
    );

    // Status badge transitions to Storniert
    const statusBadge = page.locator(
      '[data-testid="reservation-status-badge-res-test-e2e-1"]',
    );
    await expect(statusBadge).toContainText("Storniert");
  });
});
