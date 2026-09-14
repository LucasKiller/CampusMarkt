import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseReadinessResponse } from "@campusmarkt/api-client";

describe("foundation health client contract", () => {
  it("parses a healthy readiness response", () => {
    expect(
      parseReadinessResponse({ status: "ready", unavailable: [] }),
    ).toEqual({ status: "ready", unavailable: [] });
  });

  it("parses a non-ready response with unavailable dependencies", () => {
    expect(
      parseReadinessResponse({
        status: "not_ready",
        unavailable: ["supabase"],
      }),
    ).toEqual({ status: "not_ready", unavailable: ["supabase"] });
  });

  it("depends only on the public transport contract", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
      exports: Record<string, string>;
    };

    expect(manifest.dependencies).toEqual({ "@campusmarkt/types": "0.0.0" });
    expect(manifest.exports).toEqual({ ".": "./src/index.ts" });
  });
});
