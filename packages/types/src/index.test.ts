import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { LivenessResponse, ReadinessResponse } from "@campusmarkt/types";

describe("health transport contracts", () => {
  it("constructs typed liveness and readiness responses", () => {
    const liveness = { status: "live" } satisfies LivenessResponse;
    const readiness = {
      status: "not_ready",
      unavailable: ["supabase"],
    } satisfies ReadinessResponse;

    expect(liveness).toEqual({ status: "live" });
    expect(readiness).toEqual({
      status: "not_ready",
      unavailable: ["supabase"],
    });
  });

  it("exports one transport-only entry point without dependencies", () => {
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
