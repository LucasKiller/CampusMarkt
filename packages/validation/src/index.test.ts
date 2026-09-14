import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  VALIDATION_BOUNDARY,
  isValidationBoundary,
} from "@campusmarkt/validation";

describe("validation public boundary", () => {
  it("accepts the public validation boundary marker", () => {
    expect(isValidationBoundary(VALIDATION_BOUNDARY)).toBe(true);
  });

  it("rejects values outside the validation boundary", () => {
    expect(isValidationBoundary("presentation")).toBe(false);
    expect(isValidationBoundary(null)).toBe(false);
  });

  it("exports one public entry point without runtime dependencies", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      exports: Record<string, string>;
    };

    expect(manifest.exports).toEqual({ ".": "./src/index.ts" });
    expect(manifest.dependencies).toBeUndefined();
  });
});
