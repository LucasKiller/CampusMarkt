import { expect, test, type Page } from "@playwright/test";

const mockListingId = "11111111-2222-3333-4444-555555555555";

const mockManageListing = {
  id: mockListingId,
  ownerId: "test-auth-user-id",
  title: "Calculus Textbook 3rd Edition",
  description: "Comprehensive calculus book in great condition with no marks.",
  category: "books_studies",
  condition: "GOOD",
  listingType: "SELL",
  priceCents: 2450,
  status: "active",
  pickupArea: "campus_nord_bienrode",
  createdAt: "2026-09-22T10:00:00Z",
  updatedAt: "2026-09-22T10:00:00Z",
  media: [
    {
      id: "img-1",
      storagePath: `listings/${mockListingId}/cover.webp`,
      position: 0,
    },
  ],
};

const mockMyListings = [
  {
    id: mockListingId,
    ownerId: "test-auth-user-id",
    title: "Calculus Textbook 3rd Edition",
    description: "Comprehensive calculus book in great condition.",
    category: "books_studies",
    condition: "GOOD",
    listingType: "SELL",
    priceCents: 2450,
    status: "active",
    pickupArea: "campus_nord_bienrode",
    media: [
      {
        id: "img-1",
        storagePath: `listings/${mockListingId}/cover.webp`,
        position: 0,
      },
    ],
    createdAt: "2026-09-22T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
  },
  {
    id: "22222222-3333-4444-5555-666666666666",
    ownerId: "test-auth-user-id",
    title: "Free Desk Lamp",
    description: "Functional desk lamp for study desk.",
    category: "furniture",
    condition: "FAIR",
    listingType: "GIVE_AWAY",
    priceCents: 0,
    status: "reserved",
    pickupArea: "campus_tu_altgebaeude",
    media: [],
    createdAt: "2026-09-21T10:00:00Z",
    updatedAt: "2026-09-21T11:00:00Z",
  },
  {
    id: "33333333-4444-5555-6666-777777777777",
    ownerId: "test-auth-user-id",
    title: "Looking for Bicycle Lock",
    description: "Need a secure U-lock for campus commute.",
    category: "bicycles_mobility",
    condition: "GOOD",
    listingType: "WANTED",
    priceCents: 0,
    status: "sold",
    pickupArea: "viewegs_garten_bebelhof",
    media: [],
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: "2026-09-20T12:00:00Z",
  },
  {
    id: "44444444-5555-6666-7777-888888888888",
    ownerId: "test-auth-user-id",
    title: "Old Monitor 24-inch",
    description: "Old LCD monitor, archived after semester.",
    category: "electronics",
    condition: "FAIR",
    listingType: "SELL",
    priceCents: 1500,
    status: "archived",
    pickupArea: "westliches_ringgebiet",
    media: [],
    createdAt: "2026-09-19T10:00:00Z",
    updatedAt: "2026-09-19T15:00:00Z",
  },
];

interface CapturedListingPayload {
  listingType?: string;
  priceCents?: number;
  title?: string;
  [key: string]: unknown;
}

async function dropListingPhoto(page: Page, name: string, type: string) {
  await page.evaluate(
    ({ fileName, contentType }) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array([137, 80, 78, 71])], fileName, {
          type: contentType,
        }),
      );
      document
        .querySelector("#photo-drop-zone")
        ?.dispatchEvent(
          new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
        );
    },
    { fileName: name, contentType: type },
  );
}

test.describe("marketplace listing creation and management journeys", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: "campusmarkt-test-session",
        value: "authenticated",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
  });

  // 1. Responsive Viewports Layout Integrity
  for (const width of [360, 1280]) {
    test(`renders listing creation form without horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/listings/new");

      await expect(
        page.getByRole("heading", { name: "Create a Listing" }),
      ).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });

    test(`renders owner listing management editor without horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });

      await page.route(
        `**/api/listings/${mockListingId}/manage`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ok: true,
              data: { listing: mockManageListing },
              correlationId: "test-corr-1",
            }),
          });
        },
      );

      await page.goto(`/listings/${mockListingId}/manage`);

      await expect(
        page.getByRole("heading", { name: "Manage Listing" }),
      ).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });

    test(`renders my listings dashboard without horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });

      await page.route("**/api/listings/mine", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { listings: mockMyListings },
            correlationId: "test-corr-mine",
          }),
        });
      });

      await page.goto("/account/listings");

      await expect(
        page.getByRole("heading", { name: "My Listings" }),
      ).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    });
  }

  // 2. Listing Creation Journeys
  test("creates a SELL listing with photo upload and redirect", async ({
    page,
  }) => {
    let capturedCreatePayload: CapturedListingPayload = {};

    await page.route("**/api/listings/media/upload-intent", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            signedUploadUrl: "http://127.0.0.1:3100/api/mock-upload",
            storagePath: `listings/temp/${Date.now()}.webp`,
          },
        }),
      });
    });

    await page.route("http://127.0.0.1:3100/api/mock-upload", async (route) => {
      expect(route.request().method()).toBe("PUT");
      expect(route.request().headers()["content-type"]).toContain(
        "multipart/form-data",
      );
      expect(route.request().postData()).toContain("cacheControl");
      await route.fulfill({ status: 200, body: "ok" });
    });

    await page.route("**/api/listings", async (route) => {
      if (route.request().method() === "POST") {
        capturedCreatePayload = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { ...mockManageListing, id: "created-sell-id" },
            correlationId: "create-corr-sell",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/listings/new");

    // Policy guidance callout is visible
    await expect(page.getByText("CampusMarkt Policy Guidance")).toBeVisible();
    await expect(
      page.getByText("Prohibited items include alcohol"),
    ).toBeVisible();

    // Fill SELL listing
    await page.locator("#listing-title").fill("Calculus Textbook 3rd Edition");
    await page.locator("#listing-category").selectOption("books_studies");
    await page.locator("#listing-condition").selectOption("GOOD");
    await page
      .locator("#listing-pickup-area")
      .selectOption("campus_nord_bienrode");
    await page.locator("#listing-price").fill("24.50");
    await page
      .locator("#listing-description")
      .fill("Comprehensive calculus book in great condition with no marks.");

    // Upload photo via input
    await page.locator("#photo-upload-input").setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      ),
    });

    // Wait for uploaded badge
    await expect(page.getByText("1/8 uploaded")).toBeVisible();

    // Submit form
    await page.getByRole("button", { name: "Publish Listing" }).click();

    // Verify redirected or submitted
    await expect(page).toHaveURL(/\/listings\/created-sell-id\/manage/);
    expect(capturedCreatePayload.listingType).toBe("SELL");
    expect(capturedCreatePayload.priceCents).toBe(2450);
    expect(capturedCreatePayload.title).toBe("Calculus Textbook 3rd Edition");
  });

  test("accepts a dropped photo and shows the upload pending state", async ({
    page,
  }) => {
    let intentCount = 0;
    await page.route("**/api/listings/media/upload-intent", async (route) => {
      intentCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            signedUploadUrl: "http://127.0.0.1:3100/api/mock-upload",
            storagePath: "owner/dropped.png",
          },
        }),
      });
    });
    let releaseUpload!: () => void;
    const uploadGate = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    let uploadCount = 0;
    await page.route("**/api/mock-upload", async (route) => {
      uploadCount += 1;
      await uploadGate;
      await route.fulfill({ status: 200, body: "ok" });
    });

    await page.goto("/listings/new");
    await dropListingPhoto(page, "dropped.png", "image/png");
    await expect(
      page.getByRole("button", { name: "Uploading..." }),
    ).toBeDisabled();
    expect(await page.getByText("0/8 uploaded").isVisible()).toBe(true);
    await dropListingPhoto(page, "duplicate.png", "image/png");
    expect(intentCount).toBe(1);
    expect(uploadCount).toBe(1);
    releaseUpload();
    await expect(page.getByText("1/8 uploaded")).toBeVisible();
    expect(intentCount).toBe(1);
    await expect(
      page.getByRole("img", { name: "Listing photo 1" }),
    ).toBeVisible();
  });

  for (const { name, type } of [
    { name: "photo.jpg", type: "image/jpeg" },
    { name: "photo.webp", type: "image/webp" },
  ]) {
    test(`accepts a dropped ${type} photo`, async ({ page }) => {
      await page.route("**/api/listings/media/upload-intent", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              signedUploadUrl: "http://127.0.0.1:3100/api/mock-upload",
              storagePath: `owner/${name}`,
            },
          }),
        });
      });
      await page.route("**/api/mock-upload", async (route) => {
        await route.fulfill({ status: 200, body: "ok" });
      });

      await page.goto("/listings/new");
      await dropListingPhoto(page, name, type);
      await expect(page.getByText("1/8 uploaded")).toBeVisible();
    });
  }

  test("does not count a failed or unsupported photo upload", async ({
    page,
  }) => {
    let intentCount = 0;
    await page.route("**/api/listings/media/upload-intent", async (route) => {
      intentCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            signedUploadUrl: "http://127.0.0.1:3100/api/mock-upload",
            storagePath: "owner/failed.png",
          },
        }),
      });
    });
    await page.route("**/api/mock-upload", async (route) => {
      await route.fulfill({ status: 503, body: "unavailable" });
    });

    await page.goto("/listings/new");
    await dropListingPhoto(page, "document.pdf", "application/pdf");
    await expect(page.getByText(/must be JPEG, PNG, or WebP/)).toBeVisible();
    expect(intentCount).toBe(0);
    await dropListingPhoto(page, "failed.png", "image/png");
    await expect(
      page.getByText("Photo upload failed. Please try again."),
    ).toBeVisible();
    await expect(page.getByText("0/8 uploaded")).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Listing photo 1" }),
    ).toHaveCount(0);
  });

  test("applies the eight-photo and 5 MB limits to dropped files", async ({
    page,
  }) => {
    let intentCount = 0;
    await page.route("**/api/listings/media/upload-intent", async (route) => {
      intentCount += 1;
      await route.abort();
    });
    await page.goto("/listings/new");

    await page.evaluate(() => {
      const transfer = new DataTransfer();
      for (let index = 0; index < 9; index += 1) {
        transfer.items.add(
          new File(["photo"], `photo-${index}.png`, { type: "image/png" }),
        );
      }
      document
        .querySelector("#photo-drop-zone")
        ?.dispatchEvent(
          new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
        );
    });
    await expect(
      page.getByText("You can upload a maximum of 8 photos."),
    ).toBeVisible();
    expect(intentCount).toBe(0);

    await page.evaluate(() => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
          type: "image/png",
        }),
      );
      document
        .querySelector("#photo-drop-zone")
        ?.dispatchEvent(
          new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
        );
    });
    await expect(page.getByText(/exceeds the 5MB size limit/)).toBeVisible();
    await expect(page.getByText("0/8 uploaded")).toBeVisible();
    expect(intentCount).toBe(0);
  });

  test("creates a GIVE_AWAY listing with locked zero price", async ({
    page,
  }) => {
    let capturedCreatePayload: CapturedListingPayload = {};

    await page.route("**/api/listings/media/upload-intent", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            signedUploadUrl: "http://127.0.0.1:3100/api/mock-upload",
            storagePath: `listings/temp/${Date.now()}.webp`,
          },
        }),
      });
    });

    await page.route("http://127.0.0.1:3100/api/mock-upload", async (route) => {
      await route.fulfill({ status: 200, body: "ok" });
    });

    await page.route("**/api/listings", async (route) => {
      if (route.request().method() === "POST") {
        capturedCreatePayload = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              ...mockManageListing,
              id: "created-giveaway-id",
              listingType: "GIVE_AWAY",
              priceCents: 0,
            },
            correlationId: "create-corr-giveaway",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/listings/new");

    // Select Give Away intent
    await page.getByRole("button", { name: "Give Away (Verschenken)" }).click();

    // Price field is disabled
    const priceInput = page.locator("#listing-price");
    await expect(priceInput).toBeDisabled();

    // Fill form
    await page.locator("#listing-title").fill("Free Desk Lamp");
    await page.locator("#listing-category").selectOption("furniture");
    await page.locator("#listing-condition").selectOption("FAIR");
    await page
      .locator("#listing-pickup-area")
      .selectOption("campus_tu_altgebaeude");
    await page
      .locator("#listing-description")
      .fill("Functional desk lamp in good working order for pickup.");

    // Upload required photo
    await page.locator("#photo-upload-input").setInputFiles({
      name: "lamp.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
    await expect(page.getByText("1/8 uploaded")).toBeVisible();

    // Submit form
    await page.getByRole("button", { name: "Publish Listing" }).click();

    await expect(page).toHaveURL(/\/listings\/created-giveaway-id\/manage/);
    expect(capturedCreatePayload.listingType).toBe("GIVE_AWAY");
    expect(capturedCreatePayload.priceCents).toBe(0);
  });

  test("creates a WANTED listing without requiring photos", async ({
    page,
  }) => {
    let capturedCreatePayload: CapturedListingPayload = {};

    await page.route("**/api/listings", async (route) => {
      if (route.request().method() === "POST") {
        capturedCreatePayload = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              ...mockManageListing,
              id: "created-wanted-id",
              listingType: "WANTED",
              priceCents: 0,
            },
            correlationId: "create-corr-wanted",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/listings/new");

    // Select Wanted intent
    await page.getByRole("button", { name: "Wanted (Gesucht)" }).click();

    // Fill form
    await page.locator("#listing-title").fill("Looking for Bicycle Lock");
    await page.locator("#listing-category").selectOption("bicycles_mobility");
    await page.locator("#listing-condition").selectOption("GOOD");
    await page
      .locator("#listing-pickup-area")
      .selectOption("viewegs_garten_bebelhof");
    await page
      .locator("#listing-description")
      .fill("Searching for a sturdy U-lock for campus bike commuting.");

    // Submit form without photos (allowed for WANTED)
    await page.getByRole("button", { name: "Publish Listing" }).click();

    await expect(page).toHaveURL(/\/listings\/created-wanted-id\/manage/);
    expect(capturedCreatePayload.listingType).toBe("WANTED");
    expect(capturedCreatePayload.priceCents).toBeNull();
  });

  test("validates required title and moves focus to error summary", async ({
    page,
  }) => {
    await page.goto("/listings/new");

    // Clear title if any, leave empty
    await page.locator("#listing-title").fill("");
    await page.locator("#listing-description").fill("A short test description");

    await page.getByRole("button", { name: "Publish Listing" }).click();

    const errorSummary = page.locator(".error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toBeFocused();
    await expect(
      errorSummary.getByText("Title must be between 5 and 100 characters."),
    ).toBeVisible();
  });

  // 3. Owner Listing Management and Status Transitions
  test("proves complete status lifecycle: active -> reserved -> sold -> archived", async ({
    page,
  }) => {
    let currentStatus = "active";

    await page.route(
      `**/api/listings/${mockListingId}/manage`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              listing: {
                ...mockManageListing,
                status: currentStatus,
              },
            },
            correlationId: "manage-corr",
          }),
        });
      },
    );

    await page.route(
      `**/api/listings/${mockListingId}/status`,
      async (route) => {
        const body = JSON.parse(route.request().postData() || "{}");
        currentStatus = body.targetStatus;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              listing: {
                ...mockManageListing,
                status: currentStatus,
              },
            },
            correlationId: "status-corr",
          }),
        });
      },
    );

    await page.goto(`/listings/${mockListingId}/manage`);

    // Verify initial active state and immutable type indicator
    await expect(page.getByText("Sell (Verkaufen)")).toBeVisible();
    await expect(page.getByText(/Active/i)).toBeVisible();

    // 1. Transition active -> reserved
    const reserveButton = page.getByRole("button", {
      name: "Mark as Reserved",
    });
    await expect(reserveButton).toBeVisible();
    await reserveButton.click();

    await expect(page.getByRole("status")).toContainText(/Reserved/i);

    // 2. Transition reserved -> sold
    const soldButton = page.getByRole("button", { name: "Mark as Sold" });
    await expect(soldButton).toBeVisible();
    await soldButton.click();

    await expect(page.getByRole("status")).toContainText(/Sold/i);

    // 3. Transition sold -> archived
    const archiveButton = page.getByRole("button", { name: "Archive" });
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();

    await expect(page.getByRole("status")).toContainText(/Archived/i);

    // In archived state, all transition buttons are removed
    await expect(
      page.getByRole("button", { name: "Mark as Reserved" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Mark as Sold" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Archive" }),
    ).not.toBeVisible();
  });

  test("edits listing fields and persists changes", async ({ page }) => {
    let capturedPatch: CapturedListingPayload = {};

    await page.route(
      `**/api/listings/${mockListingId}/manage`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { listing: mockManageListing },
            correlationId: "manage-corr-edit",
          }),
        });
      },
    );

    await page.route(`**/api/listings/${mockListingId}`, async (route) => {
      if (route.request().method() === "PATCH") {
        capturedPatch = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              listing: {
                ...mockManageListing,
                title: capturedPatch.title,
                priceCents: capturedPatch.priceCents,
              },
            },
            correlationId: "patch-corr",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/listings/${mockListingId}/manage`);

    // Modify title and price
    const titleInput = page.locator("#edit-title");
    await titleInput.fill("Calculus Textbook 3rd Edition (Like New)");

    const priceInput = page.locator("#edit-price");
    await priceInput.fill("22.00");

    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(
      page.getByText("Listing details updated successfully."),
    ).toBeVisible();
    expect(capturedPatch.title).toBe(
      "Calculus Textbook 3rd Edition (Like New)",
    );
    expect(capturedPatch.priceCents).toBe(2200);
  });

  // 4. My Listings Dashboard Journeys
  test("displays user listings and filters by status tabs", async ({
    page,
  }) => {
    await page.route("**/api/listings/mine", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { listings: mockMyListings },
          correlationId: "mine-corr",
        }),
      });
    });

    await page.goto("/account/listings");

    // All listings are displayed initially
    await expect(page.getByText("Calculus Textbook 3rd Edition")).toBeVisible();
    await expect(page.getByText("Free Desk Lamp")).toBeVisible();
    await expect(page.getByText("Looking for Bicycle Lock")).toBeVisible();
    await expect(page.getByText("Old Monitor 24-inch")).toBeVisible();

    // Filter by Active
    await page.getByRole("button", { name: /Active/ }).click();
    await expect(page.getByText("Calculus Textbook 3rd Edition")).toBeVisible();
    await expect(page.getByText("Free Desk Lamp")).not.toBeVisible();

    // Filter by Reserved
    await page.getByRole("button", { name: /Reserved/ }).click();
    await expect(page.getByText("Free Desk Lamp")).toBeVisible();
    await expect(
      page.getByText("Calculus Textbook 3rd Edition"),
    ).not.toBeVisible();

    // Filter by Sold
    await page.getByRole("button", { name: /Sold/ }).click();
    await expect(page.getByText("Looking for Bicycle Lock")).toBeVisible();

    // Filter by Archived
    await page.getByRole("button", { name: /Archived/ }).click();
    await expect(page.getByText("Old Monitor 24-inch")).toBeVisible();

    // Navigation links work
    const manageLink = page
      .getByRole("link", { name: "Manage Listing" })
      .first();
    await expect(manageLink).toBeVisible();
    await expect(manageLink).toHaveAttribute(
      "href",
      "/listings/44444444-5555-6666-7777-888888888888/manage",
    );

    const createBtn = page.getByRole("link", { name: "Create new listing" });
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toHaveAttribute("href", "/listings/new");
  });
});
