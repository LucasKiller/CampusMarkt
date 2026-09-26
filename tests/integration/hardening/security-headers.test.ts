import { describe, expect, it } from "vitest";
import {
  SECURITY_HEADERS,
  middleware,
} from "../../../apps/web/src/middleware.ts";

describe("security headers and vary middleware", () => {
  function createRequest(options?: {
    url?: string;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    const url = options?.url ?? "https://campusmarkt.tu-braunschweig.de/";
    const headers = new Headers(options?.headers);
    const cookiesMap = new Map<string, string>(
      Object.entries(options?.cookies ?? {}),
    );

    return {
      url,
      headers,
      cookies: {
        get(name: string) {
          const value = cookiesMap.get(name);
          return value !== undefined ? { value } : undefined;
        },
      },
    } as unknown as Parameters<typeof middleware>[0];
  }

  it("attaches all required security headers to responses", () => {
    const req = createRequest();
    const res = middleware(req);

    expect(res.headers.get("Content-Security-Policy")).toBe(
      SECURITY_HEADERS["Content-Security-Policy"],
    );
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(res.headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
  });

  it("attaches Vary header covering Cookie and Accept-Language", () => {
    const req = createRequest();
    const res = middleware(req);

    expect(res.headers.get("Vary")).toBe("Cookie, Accept-Language");
  });

  it("sets Content-Language to German ('de') by default", () => {
    const req = createRequest();
    const res = middleware(req);

    expect(res.headers.get("Content-Language")).toBe("de");
  });

  it("sets Content-Language to English ('en') when NEXT_LOCALE cookie is 'en'", () => {
    const req = createRequest({
      cookies: { NEXT_LOCALE: "en" },
      headers: { "accept-language": "de-DE,de;q=0.9" },
    });
    const res = middleware(req);

    expect(res.headers.get("Content-Language")).toBe("en");
  });

  it("sets Content-Language to English ('en') when Accept-Language prefers English", () => {
    const req = createRequest({
      headers: { "accept-language": "en-US,en;q=0.9,de;q=0.8" },
    });
    const res = middleware(req);

    expect(res.headers.get("Content-Language")).toBe("en");
  });

  it("sanitizes malformed cookie values and falls back safely", () => {
    const req = createRequest({
      cookies: { NEXT_LOCALE: "<script>evil</script>" },
      headers: { "accept-language": "en-US,en;q=0.9" },
    });
    const res = middleware(req);

    expect(res.headers.get("Content-Language")).toBe("en");
  });

  it("enforces clickjacking defense and strict CSP directives", () => {
    const req = createRequest({
      url: "https://campusmarkt.tu-braunschweig.de/agb",
    });
    const res = middleware(req);

    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });
});
