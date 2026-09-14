import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { DOMAIN_BOUNDARY } from "@campusmarkt/domain";

describe("domain public boundary", () => {
  it("imports the public framework-independent marker", () => {
    expect(DOMAIN_BOUNDARY).toBe("domain");
  });

  it("exports only its public entry point without runtime dependencies", () => {
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
