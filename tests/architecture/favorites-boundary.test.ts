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

function restrictedImport(message: string) {
  return [
    expect.objectContaining({
      ruleId: "no-restricted-imports",
      message: expect.stringContaining(message),
    }),
  ];
}

describe("marketplace favorites architectural boundary tests", () => {
  it("allows importing public entry points of favorites domain, types, and validation in application layer", async () => {
    const diags = await diagnostics(
      `
        import { assertCanFavorite, canFavorite, toggleFavoriteId, reconcileOptimisticFavorite } from "@campusmarkt/domain";
        import type { FavoriteItemDTO, FavoriteToggleResponse, UserFavoriteIdsResponse } from "@campusmarkt/types";
        import { validateListingIdParam, validateFavoritesPaginationQuery } from "@campusmarkt/validation";

        void [assertCanFavorite, canFavorite, toggleFavoriteId, reconcileOptimisticFavorite, validateListingIdParam, validateFavoritesPaginationQuery];
        export type T = { item: FavoriteItemDTO; toggle: FavoriteToggleResponse; ids: UserFavoriteIdsResponse };
      `,
      "apps/web/src/modules/listings/application/favorites.ts",
    );

    expect(diags).toEqual([]);
  });

  it.each([
    [
      "packages/domain/src/listings/favorites.ts",
      "next/server",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
    [
      "packages/domain/src/listings/favorites.ts",
      "react",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
  ])(
    "rejects framework imports in favorites domain: %s importing %s",
    async (path, module, ruleCode) => {
      const diags = await diagnostics(
        `import item from "${module}"; void item;`,
        path,
      );

      expect(diags).toEqual(restrictedImport(ruleCode));
    },
  );

  it.each([
    [
      "packages/domain/src/listings/favorites.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/domain/src/listings/favorites.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/favorites.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/favorites.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/favorites.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/favorites.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
  ])(
    "rejects server-only or provider imports in portable favorites packages: %s importing %s",
    async (path, module, ruleCode) => {
      const diags = await diagnostics(
        `import item from "${module}"; void item;`,
        path,
      );

      expect(diags).toEqual(restrictedImport(ruleCode));
    },
  );

  it("rejects database adapters and infrastructure inside favorites UI presentation", async () => {
    const diagsProvider = await diagnostics(
      `import { createClient } from "@supabase/supabase-js"; void createClient;`,
      "apps/web/src/app/favorites/page.tsx",
    );
    expect(diagsProvider).toEqual(
      restrictedImport("ARCH_IDENTITY_PROVIDER_ADAPTER"),
    );

    const diagsInfra = await diagnostics(
      `import adapter from "../infrastructure/adapter"; void adapter;`,
      "apps/web/src/app/favorites/page.tsx",
    );
    expect(diagsInfra).toEqual(
      restrictedImport("ARCH_PRESENTATION_INFRASTRUCTURE"),
    );
  });

  it("rejects private deep workspace imports inside favorites validation", async () => {
    const diags = await diagnostics(
      `import { assertCanFavorite } from "@campusmarkt/domain/src/listings/favorites.ts"; void assertCanFavorite;`,
      "packages/validation/src/listings/favorites.ts",
    );

    expect(diags).toEqual(restrictedImport("ARCH_PRIVATE_WORKSPACE_IMPORT"));
  });
});
