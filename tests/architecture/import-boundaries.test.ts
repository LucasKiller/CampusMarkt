import { resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: resolve(root, "eslint.config.mjs"),
});

async function lint(source: string, relativePath: string) {
  const [result] = await eslint.lintText(source, {
    filePath: resolve(root, relativePath),
  });

  return result.messages.map(({ message, ruleId }) => ({ message, ruleId }));
}

describe("architectural import boundaries", () => {
  it("allows consumers to use workspace package public entry points", async () => {
    const diagnostics = await lint(
      `
        import { DOMAIN_BOUNDARY } from "@campusmarkt/domain";
        import { VALIDATION_BOUNDARY } from "@campusmarkt/validation";
        import { parseReadinessResponse } from "@campusmarkt/api-client";
        import type { ReadinessResponse } from "@campusmarkt/types";

        const readiness: ReadinessResponse = { status: "ready", unavailable: [] };
        void [DOMAIN_BOUNDARY, VALIDATION_BOUNDARY, parseReadinessResponse(readiness)];
      `,
      "apps/web/src/app/page.tsx",
    );

    expect(diagnostics).toEqual([]);
  });

  it("rejects a domain import from a framework", async () => {
    const diagnostics = await lint(
      `import { NextRequest } from "next/server"; void NextRequest;`,
      "packages/domain/src/index.ts",
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        ruleId: "no-restricted-imports",
        message: expect.stringContaining("ARCH_DOMAIN_FRAMEWORK"),
      }),
    ]);
  });

  it("rejects presentation imports from infrastructure", async () => {
    const diagnostics = await lint(
      `import adapter from "../infrastructure/adapter"; void adapter;`,
      "apps/web/src/app/page.tsx",
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        ruleId: "no-restricted-imports",
        message: expect.stringContaining("ARCH_PRESENTATION_INFRASTRUCTURE"),
      }),
    ]);
  });

  it("rejects private workspace package deep imports", async () => {
    const diagnostics = await lint(
      `import { DOMAIN_BOUNDARY } from "@campusmarkt/domain/src/index.ts"; void DOMAIN_BOUNDARY;`,
      "packages/api-client/src/index.ts",
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        ruleId: "no-restricted-imports",
        message: expect.stringContaining("ARCH_PRIVATE_WORKSPACE_IMPORT"),
      }),
    ]);
  });
});
