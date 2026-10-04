import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));

const mockCookies = vi.fn();
const mockHeaders = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
  headers: () => mockHeaders(),
}));

import AgbPage from "./page";

describe("AGB page UI rendering (T15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "de" } : undefined,
    });
    mockHeaders.mockResolvedValue({
      get: () => "de-DE,de;q=0.9",
    });
  });

  it("renders /agb page in German with terms, peer-to-peer handover, and prohibited goods", async () => {
    const page = await AgbPage();
    const html = renderToString(page);

    expect(html).toContain("Allgemeine Geschäftsbedingungen");
    expect(html).toContain("Geltungsbereich");
    expect(html).toContain("Vor-Ort-Übergabe");
    expect(html).toContain("Unzulässige Inserate");
    expect(html).not.toContain("AD-");
  });

  it("renders /agb page in English with binding statutory notice", async () => {
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "en" } : undefined,
    });
    const page = await AgbPage();
    const html = renderToString(page);

    expect(html).toContain("Terms of Service");
    expect(html).toContain("German statutory version is legally binding");
    expect(html).toContain("Prohibited Goods");
    expect(html).not.toContain("AD-");
  });
});
