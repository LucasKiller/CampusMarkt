import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookies = vi.fn();
const mockHeaders = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
  headers: () => mockHeaders(),
}));

import {
  getServerLocale,
  getServerDictionary,
  getServerLocaleAndDictionary,
} from "./get-server-locale";

describe("getServerLocale and getServerDictionary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts locale from valid NEXT_LOCALE cookie", async () => {
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "en" } : undefined,
    });
    mockHeaders.mockResolvedValue({
      get: () => "de-DE,de;q=0.9",
    });

    const locale = await getServerLocale();
    expect(locale).toBe("en");
  });

  it("falls back to Accept-Language header when NEXT_LOCALE cookie is absent", async () => {
    mockCookies.mockResolvedValue({
      get: () => undefined,
    });
    mockHeaders.mockResolvedValue({
      get: (name: string) =>
        name.toLowerCase() === "accept-language" ? "en-US,en;q=0.9" : null,
    });

    const locale = await getServerLocale();
    expect(locale).toBe("en");
  });

  it("defaults to 'de' when neither cookie nor header specify supported locale", async () => {
    mockCookies.mockResolvedValue({
      get: () => undefined,
    });
    mockHeaders.mockResolvedValue({
      get: () => null,
    });

    const locale = await getServerLocale();
    expect(locale).toBe("de");
  });

  it("getServerDictionary loads the English dictionary when locale is 'en'", async () => {
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "en" } : undefined,
    });
    mockHeaders.mockResolvedValue({
      get: () => null,
    });

    const dict = await getServerDictionary();
    expect(dict.common.appName).toBe("CampusMarkt");
    expect(dict.nav.language).toBe("Language");
  });

  it("getServerDictionary loads the German dictionary when locale is 'de'", async () => {
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "de" } : undefined,
    });
    mockHeaders.mockResolvedValue({
      get: () => null,
    });

    const dict = await getServerDictionary();
    expect(dict.common.appName).toBe("CampusMarkt");
    expect(dict.nav.language).toBe("Sprache");
  });

  it("getServerDictionary accepts an explicit locale override", async () => {
    mockCookies.mockResolvedValue({
      get: () => ({ value: "de" }),
    });
    mockHeaders.mockResolvedValue({
      get: () => null,
    });

    const dict = await getServerDictionary("en");
    expect(dict.nav.language).toBe("Language");
  });

  it("getServerLocaleAndDictionary returns both active locale and matching dictionary", async () => {
    mockCookies.mockResolvedValue({
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "en" } : undefined,
    });
    mockHeaders.mockResolvedValue({
      get: () => null,
    });

    const result = await getServerLocaleAndDictionary();
    expect(result.locale).toBe("en");
    expect(result.dictionary.nav.language).toBe("Language");
  });
});
