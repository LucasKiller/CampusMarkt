import { describe, expect, it } from "vitest";
import { getDictionary } from "@campusmarkt/domain";

describe("legal pages dictionary and compliance integration suite (T14 / T15)", () => {
  it("verifies German legal dictionary contains all statutory keys", () => {
    const deDict = getDictionary("de");

    expect(deDict.legal.impressum).toBe("Impressum");
    expect(deDict.legal.datenschutz).toBe("Datenschutz");
    expect(deDict.legal.agb).toBe("AGB");
    expect(deDict.legal.allRightsReserved).toBe("Alle Rechte vorbehalten");
    expect(deDict.legal.bindingGermanNotice).toContain("deutsche Fassung");
  });

  it("verifies English legal dictionary contains translated keys and statutory binding notice", () => {
    const enDict = getDictionary("en");

    expect(enDict.legal.impressum).toBe("Legal Notice");
    expect(enDict.legal.datenschutz).toBe("Privacy Policy");
    expect(enDict.legal.agb).toBe("Terms of Service");
    expect(enDict.legal.allRightsReserved).toBe("All rights reserved");
    expect(enDict.legal.bindingGermanNotice).toContain(
      "German statutory version",
    );
  });
});
