import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/localization/locale", () => {
  it("sets the NEXT_LOCALE cookie to 'en' when valid payload is provided", async () => {
    const request = new Request(
      "http://localhost:3000/api/localization/locale",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ locale: "en" }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toEqual({ ok: true, locale: "en" });

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("NEXT_LOCALE=en");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=31536000");
    expect(setCookie?.toLowerCase()).toContain("samesite=lax");
  });

  it("sets the NEXT_LOCALE cookie to 'de' when valid payload is provided", async () => {
    const request = new Request(
      "http://localhost:3000/api/localization/locale",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ locale: "de" }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toEqual({ ok: true, locale: "de" });

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("NEXT_LOCALE=de");
  });

  it("rejects unsupported locale codes with 400", async () => {
    const request = new Request(
      "http://localhost:3000/api/localization/locale",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ locale: "fr" }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Invalid or unsupported locale");
  });

  it("rejects non-JSON or invalid body with 400", async () => {
    const request = new Request(
      "http://localhost:3000/api/localization/locale",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: "not-json",
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.ok).toBe(false);
  });

  it("rejects forbidden origin when origin mismatch occurs", async () => {
    const request = new Request(
      "http://localhost:3000/api/localization/locale",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://malicious-attacker.com",
        },
        body: JSON.stringify({ locale: "en" }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("Forbidden");
  });
});
