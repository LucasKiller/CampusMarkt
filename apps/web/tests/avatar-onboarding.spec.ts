import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const publicId = "99999999-8888-4777-8666-555555555555";
const photoUrl = `/media/avatars/${publicId}/1.webp`;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function signedIn(context: BrowserContext) {
  await context.addCookies([
    {
      name: "campusmarkt-test-session",
      value: "authenticated",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
}

async function profileResponse(page: Page, avatarUrl: string | null = null) {
  await page.route("**/api/identity/me/profile", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          publicId,
          displayName: "Ada Lovelace",
          joinedMonth: "2026-09",
          avatarUrl,
        },
      }),
    }),
  );
}

async function choosePng(page: Page) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByText("Choose new avatar").click();
  await (
    await chooser
  ).setFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: png,
  });
}

test("confirmation leads to avatar setup", async ({ page, context }) => {
  await page.route("**/api/identity/confirmations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: { status: "confirmed" } }),
    }),
  );
  await page.goto("/auth/confirm");
  await page.getByRole("button", { name: "Confirm Email" }).click();
  const continueLink = page.getByRole("link", { name: "Continue to sign in" });
  await expect(continueLink).toHaveAttribute(
    "href",
    "/sign-in?returnTo=%2Faccount%3Fsetup%3Davatar",
  );
  await continueLink.click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);

  await page.route("**/api/identity/sessions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: { returnTo: "/account?setup=avatar" },
      }),
    }),
  );
  await signedIn(context);
  await profileResponse(page);
  await page.getByLabel("Email address").fill("ada@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Example12345!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account\?setup=avatar/);
  await expect(page.getByTestId("avatar-setup")).toBeVisible();
});

test("setup offers photo or later", async ({ page, context }) => {
  await signedIn(context);
  await profileResponse(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/account?setup=avatar");
  const setup = page.getByTestId("avatar-setup");
  await expect(setup.getByTestId("generated-avatar")).toBeVisible();
  await expect(setup.getByText("Choose new avatar")).toBeVisible();
  await expect(
    setup.getByRole("link", { name: "Do this later" }),
  ).toBeVisible();
  const positions = await setup.evaluate((element) => {
    const art = element.querySelector('[data-testid="generated-avatar"]')!;
    const upload = [...element.querySelectorAll("span")].find(
      (span) => span.textContent === "Choose new avatar",
    )!;
    const later = element.querySelector("a")!;
    return [art, upload, later].map((node) => node.getBoundingClientRect().top);
  });
  expect(positions[0]).toBeLessThan(positions[1]);
  expect(positions[1]).toBeLessThan(positions[2]);
});

test("skipping setup makes no avatar upload", async ({ page, context }) => {
  await signedIn(context);
  await profileResponse(page);
  let uploads = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/identity/me/avatar"
    ) {
      uploads += 1;
    }
  });
  await page.goto("/account?setup=avatar");
  await page.getByRole("link", { name: "Do this later" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId("avatar-setup")).toHaveCount(0);
  expect(uploads).toBe(0);
});

test("setup saves a valid photo", async ({ page, context }) => {
  await signedIn(context);
  await profileResponse(page);
  let posts = 0;
  await page.route("**/api/identity/me/avatar", (route) => {
    posts += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          status: "updated",
          profile: {
            publicId,
            displayName: "Ada Lovelace",
            joinedMonth: "2026-09",
            avatarUrl: photoUrl,
          },
        },
      }),
    });
  });
  await page.route(`**${photoUrl}`, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: png }),
  );
  await page.goto("/account?setup=avatar");
  await choosePng(page);
  await page.getByRole("button", { name: "Save avatar" }).click();
  await expect(page.getByText("Avatar updated successfully.")).toBeVisible();
  await expect(page.locator(`img[src='${photoUrl}']`)).toBeVisible();
  expect(posts).toBe(1);
});

test("invalid setup photo keeps generic avatar", async ({ page, context }) => {
  await signedIn(context);
  await profileResponse(page);
  await page.goto("/account?setup=avatar");
  const chooser = page.waitForEvent("filechooser");
  await page.getByText("Choose new avatar").click();
  await (
    await chooser
  ).setFiles({
    name: "document.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await expect(page.locator(".error-summary")).toContainText(
    "Choose a JPEG, PNG, or WebP image.",
  );
  await expect(page.getByTestId("generated-avatar")).toBeVisible();
  await expect(page.getByRole("link", { name: "Do this later" })).toBeVisible();
});

test("failed setup upload keeps generic avatar", async ({ page, context }) => {
  await signedIn(context);
  await profileResponse(page);
  await page.route("**/api/identity/me/avatar", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, code: "DEPENDENCY_UNAVAILABLE" }),
    }),
  );
  await page.goto("/account?setup=avatar");
  await choosePng(page);
  await page.getByRole("button", { name: "Save avatar" }).click();
  await expect(page.locator(".error-summary")).toContainText(
    "Failed to upload avatar. Please try again.",
  );
  await expect(page.getByTestId("generated-avatar")).toBeVisible();
  await expect(page.getByRole("link", { name: "Do this later" })).toBeVisible();
});

test("setup requires a confirmed session", async ({ page }) => {
  await page.goto("/account?setup=avatar");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  await expect(page.getByTestId("avatar-setup")).toHaveCount(0);
});

test("shared generic avatar appears on all profile surfaces", async ({
  page,
  context,
}) => {
  await signedIn(context);
  await profileResponse(page);
  const paths = [
    "/account",
    `/profiles/${publicId}`,
    "/listings/visual-active",
    "/messages",
    "/messages/conv-e2e-test-1111-4111-8111-111111111111",
    "/account/blocked-users?e2eAvatarFallback=1",
  ];
  let signature: string[] | null = null;
  for (const path of paths) {
    await page.goto(path);
    const avatar = page.getByTestId("generated-avatar").first();
    await expect(avatar).toBeVisible();
    const shapes = await avatar
      .locator("path")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("d") ?? ""),
      );
    if (signature) expect(shapes).toEqual(signature);
    else signature = shapes;
  }
});

test("removing photo restores the generic avatar", async ({
  page,
  context,
}) => {
  await signedIn(context);
  await profileResponse(page, photoUrl);
  await page.route("**/api/identity/me/avatar", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          status: "updated",
          profile: {
            publicId,
            displayName: "Ada Lovelace",
            joinedMonth: "2026-09",
            avatarUrl: null,
          },
        },
      }),
    }),
  );
  await page.goto("/account");
  await page.getByRole("button", { name: "Remove avatar" }).click();
  await expect(page.getByTestId("generated-avatar")).toBeVisible();
  await page.goto(`/profiles/${publicId}`);
  await expect(page.getByTestId("generated-avatar")).toBeVisible();
});

test("uploaded photo takes priority over generic avatar", async ({
  page,
  context,
}) => {
  await signedIn(context);
  await profileResponse(page, photoUrl);
  await page.route(`**${photoUrl}`, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: png }),
  );
  await page.goto("/account");
  await expect(page.locator(`img[src='${photoUrl}']`)).toBeVisible();
  await expect(page.getByTestId("generated-avatar")).toHaveCount(0);
});
