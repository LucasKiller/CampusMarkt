import { resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: resolve(root, "eslint.config.mjs"),
  overrideConfig: {
    languageOptions: { parserOptions: { projectService: false } },
  },
});

async function diagnostics(source: string, relativePath: string) {
  const [result] = await eslint.lintText(source, {
    filePath: resolve(root, relativePath),
  });

  return result.messages.map(({ message, ruleId }) => ({ message, ruleId }));
}

function restricted(message: string) {
  return [
    expect.objectContaining({
      ruleId: "no-restricted-imports",
      message: expect.stringContaining(message),
    }),
  ];
}

describe("listings module architectural boundary tests", () => {
  it("allows importing public entry points of domain, types, and validation", async () => {
    await expect(
      diagnostics(
        `
          import { LISTING_TYPES, validatePriceRule } from "@campusmarkt/domain";
          import type { CreateListingRequest } from "@campusmarkt/types";
          import { parseCreateListingInput } from "@campusmarkt/validation";

          void [LISTING_TYPES, validatePriceRule, parseCreateListingInput];
          export type T = CreateListingRequest;
        `,
        "apps/web/src/modules/listings/application/test.ts",
      ),
    ).resolves.toEqual([]);
  });

  it.each([
    ["packages/domain/src/listings/index.ts", "next/server"],
    ["packages/domain/src/listings/index.ts", "react"],
  ])(
    "rejects framework imports in listings domain: %s importing %s",
    async (path, module) => {
      await expect(
        diagnostics(
          `import { something } from "${module}"; void something;`,
          path,
        ),
      ).resolves.toEqual(restricted("ARCH_DOMAIN_FRAMEWORK"));
    },
  );

  it.each([
    ["packages/domain/src/listings/adapter.ts", "server-only"],
    ["packages/domain/src/listings/db.ts", "@supabase/supabase-js"],
    ["packages/types/src/listings/server.ts", "server-only"],
    ["packages/types/src/listings/db.ts", "@supabase/supabase-js"],
    ["packages/validation/src/listings/server.ts", "server-only"],
    ["packages/validation/src/listings/db.ts", "@supabase/supabase-js"],
    ["packages/validation/src/listings/sharp.ts", "sharp"],
  ])(
    "rejects server-only or provider imports in portable listings package: %s importing %s",
    async (path, module) => {
      await expect(
        diagnostics(`import dep from "${module}"; void dep;`, path),
      ).resolves.toEqual(restricted("ARCH_IDENTITY_PORTABLE"));
    },
  );

  it("rejects private deep workspace imports inside listings packages", async () => {
    await expect(
      diagnostics(
        `import { LISTING_TYPES } from "@campusmarkt/domain/src/listings/index.ts"; void LISTING_TYPES;`,
        "packages/validation/src/listings/index.ts",
      ),
    ).resolves.toEqual(restricted("ARCH_PRIVATE_WORKSPACE_IMPORT"));
  });
});
