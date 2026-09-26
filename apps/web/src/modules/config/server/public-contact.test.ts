import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPublicContactConfiguration } from "./public-contact";

describe("public contact configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses safe local role-address fallbacks", () => {
    vi.stubEnv("PUBLIC_CONTACT_EMAIL", "");
    vi.stubEnv("PUBLIC_PRIVACY_EMAIL", "");

    expect(getPublicContactConfiguration()).toEqual({
      contactEmail: "kontakt@campusmarkt.local",
      privacyEmail: "datenschutz@campusmarkt.local",
    });
  });

  it("reads deployment-specific role addresses at render time", () => {
    vi.stubEnv("PUBLIC_CONTACT_EMAIL", "kontakt@campusmarkt.inovv.co");
    vi.stubEnv("PUBLIC_PRIVACY_EMAIL", "datenschutz@campusmarkt.inovv.co");

    expect(getPublicContactConfiguration()).toEqual({
      contactEmail: "kontakt@campusmarkt.inovv.co",
      privacyEmail: "datenschutz@campusmarkt.inovv.co",
    });
  });
});
