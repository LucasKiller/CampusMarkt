import { describe, expect, it } from "vitest";
import { POST } from "../../../apps/web/src/app/api/localization/locale/route.ts";
import { getDictionary, resolveLocale } from "@campusmarkt/domain";

describe("locale routes integration suite (T12)", () => {
  const origin = "http://localhost:3000";

  function createToggleRequest(
    body: unknown,
    headersInit?: Record<string, string>,
  ) {
    return new Request(`${origin}/api/localization/locale`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        ...headersInit,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("POST /api/localization/locale sets NEXT_LOCALE cookie to 'en'", async () => {
    const request = createToggleRequest({ locale: "en" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ ok: true, locale: "en" });

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("NEXT_LOCALE=en");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=31536000");
    expect(setCookie?.toLowerCase()).toContain("samesite=lax");
  });

  it("POST /api/localization/locale sets NEXT_LOCALE cookie to 'de'", async () => {
    const request = createToggleRequest({ locale: "de" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ ok: true, locale: "de" });

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("NEXT_LOCALE=de");
  });

  it("verifies malformed and unsupported locales return 400", async () => {
    const invalidPayloads = [
      { locale: "fr" },
      { locale: "es" },
      { locale: "invalid" },
      { locale: 123 },
      { locale: null },
      { locale: "" },
      {},
      [],
    ];

    for (const payload of invalidPayloads) {
      const request = createToggleRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe("Invalid or unsupported locale");
    }
  });

  it("verifies malformed JSON returns 400", async () => {
    const request = createToggleRequest("not-a-valid-json{{{");
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("verifies cross-origin requests with mismatched origin are rejected with 403", async () => {
    const request = createToggleRequest(
      { locale: "en" },
      { origin: "http://malicious-site.example.com" },
    );
    const response = await POST(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Forbidden");
  });

  it("proves end-to-end resolution and dictionary retrieval matches updated cookie", async () => {
    // 1. Toggle to English via API
    const toggleReq = createToggleRequest({ locale: "en" });
    const toggleRes = await POST(toggleReq);
    expect(toggleRes.status).toBe(200);

    const setCookie = toggleRes.headers.get("set-cookie");
    const cookieMatch = /NEXT_LOCALE=([^;]+)/.exec(setCookie ?? "");
    const cookieValue = cookieMatch?.[1];
    expect(cookieValue).toBe("en");

    // 2. Server resolves locale using the extracted cookie
    const resolved = resolveLocale(cookieValue);
    expect(resolved).toBe("en");

    // 3. Dictionary loaded for resolved locale has expected English strings
    const dict = getDictionary(resolved);
    expect(dict.common.appName).toBe("CampusMarkt");
    expect(dict.nav.language).toBe("Language");
    expect(dict.nav.createListing).toBe("Create Listing");
  });
});
