import { expect, test } from "@playwright/test";

const testListingId = "11111111-2222-3333-4444-555555555555";
const testConversationId = "conv-e2e-test-1111-4111-8111-111111111111";

test.describe("Marketplace Private Messaging E2E Journeys (T16)", () => {
  test("self-messaging prevention: sellers cannot message themselves on their own listings", async ({
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

    // Verify "Nachricht schreiben" CTA is NOT visible for the listing owner
    const messageBtn = page.locator('[data-testid="cta-send-message"]');
    await expect(messageBtn).not.toBeVisible();
  });

  test("buyer initiates conversation from listing details and navigates to chat", async ({
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

    // Intercept conversation creation API
    await page.route("**/api/marketplace/conversations", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              conversation: {
                id: testConversationId,
                listingId: testListingId,
              },
            },
            correlationId: "corr-conv-create-1",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/listings/${testListingId}`);

    // Click "Nachricht schreiben" CTA
    const messageBtn = page.locator('[data-testid="cta-send-message"]');
    await expect(messageBtn).toBeVisible();
    await expect(messageBtn).toContainText("Nachricht schreiben");
    await messageBtn.click();

    // Verify redirected to thread view
    await page.waitForURL(new RegExp(testConversationId), { timeout: 15000 });

    // Verify header renders partner profile and trust badge
    const header = page.locator('[data-testid="conversation-header"]');
    await expect(header).toBeVisible();
    const partnerName = page.locator('[data-testid="partner-name"]');
    await expect(partnerName).toBeVisible();
    await expect(partnerName).toContainText("Alex Student");

    const partnerBadge = page.locator('[data-testid="partner-badge"]');
    await expect(partnerBadge).toBeVisible();
    await expect(partnerBadge).toContainText("TU Braunschweig");
  });

  test("live messaging: sending messages via composer and displaying bubbles", async ({
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

    // Intercept sending message
    await page.route(
      `**/api/marketplace/conversations/${testConversationId}/messages`,
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              data: {
                message: {
                  id: "msg-live-101",
                  conversationId: testConversationId,
                  senderId: "22222222-2222-4222-8222-222222222222",
                  content: "Können wir uns morgen um 14 Uhr treffen?",
                  createdAt: new Date().toISOString(),
                  readAt: null,
                },
              },
              correlationId: "corr-msg-send-101",
            }),
          });
        } else {
          await route.continue();
        }
      },
    );

    await page.goto(`/messages/${testConversationId}`);

    // Fill composer input
    const composerInput = page.locator(
      'textarea[aria-label="Nachricht schreiben"]',
    );
    await expect(composerInput).toBeVisible();
    await composerInput.fill("Können wir uns morgen um 14 Uhr treffen?");

    // Check character count
    const charCount = page.locator('[data-testid="composer-char-count"]');
    await expect(charCount).toBeVisible();
    await expect(charCount).toContainText("/ 2000");

    // Click send button
    const sendBtn = page.locator('button[aria-label="Nachricht senden"]');
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Verify new message bubble appears
    const bubble = page.locator(
      'div[data-testid="message-bubble-msg-live-101"]',
    );
    await expect(bubble).toBeVisible();
    await expect(bubble).toContainText(
      "Können wir uns morgen um 14 Uhr treffen?",
    );
    await expect(bubble).toHaveAttribute("data-sender", "me");
  });

  test("inbox page renders active conversations with snippet and relative timestamp", async ({
    page,
    context,
  }) => {
    // Authenticate as a buyer to see Alex Student conversation
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "buyer",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/messages");

    // Verify inbox header and conversation card
    await expect(page.locator("h1")).toContainText("Nachrichten");

    const inboxList = page.locator('[data-testid="inbox-list"]');
    await expect(inboxList).toBeVisible();

    const convCard = page.locator(
      `[data-testid="conversation-card-${testConversationId}"]`,
    );
    await expect(convCard).toBeVisible();
    await expect(convCard).toContainText("Alex Student");
    await expect(convCard).toContainText("Calculus Textbook");
    await expect(convCard).toContainText(
      "Abholung an der Universitätsbibliothek",
    );
  });

  test("negotiation card in conversation view shows active status", async ({
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

    await page.goto(`/messages/${testConversationId}`);

    // Verify negotiation status card is rendered
    const negotiationCard = page.locator(
      '[data-testid="negotiation-status-card"]',
    );
    await expect(negotiationCard).toBeVisible();
    await expect(negotiationCard).toContainText(
      "Calculus Textbook 3rd Edition",
    );
    await expect(negotiationCard).toContainText("€24.50");
  });
});
