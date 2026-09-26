import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));

const mockCookies = vi.fn();
const mockHeaders = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
  headers: () => mockHeaders(),
}));

import ImpressumPage from "./page";
import DatenschutzPage from "../datenschutz/page";

describe("legal pages UI rendering (T14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "de" } : undefined,
    });
    mockHeaders.mockResolvedValue({
      get: () => "de-DE,de;q=0.9",
    });
    vi.stubEnv("PUBLIC_CONTACT_EMAIL", "kontakt@campusmarkt.inovv.co");
    vi.stubEnv("PUBLIC_PRIVACY_EMAIL", "datenschutz@campusmarkt.inovv.co");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders /impressum page in German with § 5 DDG details", async () => {
    const page = await ImpressumPage();
    const html = renderToString(page);

    expect(html).toContain("Impressum");
    expect(html).toContain("Angaben gemäß § 5 DDG");
    expect(html).toContain("mailto:kontakt@campusmarkt.inovv.co");
    expect(html).toContain("Universitätsplatz 2");
  });

  it("renders /impressum page in English with binding notice", async () => {
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "en" } : undefined,
    });
    const page = await ImpressumPage();
    const html = renderToString(page);

    expect(html).toContain("Legal Notice");
    expect(html).toContain("German statutory version is legally binding");
  });

  it("uses safe local role addresses when deployment contacts are absent", async () => {
    vi.stubEnv("PUBLIC_CONTACT_EMAIL", "");
    vi.stubEnv("PUBLIC_PRIVACY_EMAIL", "");

    const impressum = renderToString(await ImpressumPage());
    const privacy = renderToString(await DatenschutzPage());

    expect(impressum).toContain("kontakt@campusmarkt.local");
    expect(privacy).toContain("datenschutz@campusmarkt.local");
  });

  it("renders /datenschutz page with GDPR controller, HMAC hash, and rights", async () => {
    const page = await DatenschutzPage();
    const html = renderToString(page);

    expect(html).toContain("Datenschutzerklärung");
    expect(html).toContain("Verantwortliche Stelle");
    expect(html).toContain("HMAC-SHA-256");
    expect(html).toContain("zwölf Kalendermonate");
    expect(html).toContain("Rechte als betroffene Person");
  });
});
