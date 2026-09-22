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

describe("marketplace feed architectural boundary tests", () => {
  it("allows importing public entry points of feed domain, types, and validation in application layer", async () => {
    const diags = await diagnostics(
      `
        import { formatListingPrice, formatRelativeTime, getCategoryLabel } from "@campusmarkt/domain";
        import type { PublicFeedItem, PublicFeedResponse, PublicListingDetails, FeedCursor } from "@campusmarkt/types";
        import { encodeCursor, decodeCursor, validateFeedFilterParams } from "@campusmarkt/validation";

        void [formatListingPrice, formatRelativeTime, getCategoryLabel, encodeCursor, decodeCursor, validateFeedFilterParams];
        export type T = { item: PublicFeedItem; res: PublicFeedResponse; details: PublicListingDetails; cursor: FeedCursor };
      `,
      "apps/web/src/modules/listings/application/feed.ts",
    );

    expect(diags).toEqual([]);
  });

  it.each([
    [
      "packages/domain/src/listings/feed.ts",
      "next/server",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
    ["packages/domain/src/listings/feed.ts", "react", "ARCH_DOMAIN_FRAMEWORK"],
  ])(
    "rejects framework imports in feed domain: %s importing %s",
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
      "packages/domain/src/listings/feed.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/domain/src/listings/feed.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/feed.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/feed.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/feed.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/feed.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
  ])(
    "rejects server-only or provider imports in portable feed packages: %s importing %s",
    async (path, module, ruleCode) => {
      const diags = await diagnostics(
        `import item from "${module}"; void item;`,
        path,
      );

      expect(diags).toEqual(restrictedImport(ruleCode));
    },
  );

  it("rejects database adapters and infrastructure inside feed page UI presentation", async () => {
    const diagsProvider = await diagnostics(
      `import { createClient } from "@supabase/supabase-js"; void createClient;`,
      "apps/web/src/app/listings/page.tsx",
    );
    expect(diagsProvider).toEqual(
      restrictedImport("ARCH_IDENTITY_PROVIDER_ADAPTER"),
    );

    const diagsInfra = await diagnostics(
      `import adapter from "../infrastructure/adapter"; void adapter;`,
      "apps/web/src/app/listings/page.tsx",
    );
    expect(diagsInfra).toEqual(
      restrictedImport("ARCH_PRESENTATION_INFRASTRUCTURE"),
    );
  });

  it("rejects private deep workspace imports inside feed validation", async () => {
    const diags = await diagnostics(
      `import { CATEGORY_LABELS_DE } from "@campusmarkt/domain/src/listings/feed.ts"; void CATEGORY_LABELS_DE;`,
      "packages/validation/src/listings/feed.ts",
    );

    expect(diags).toEqual(restrictedImport("ARCH_PRIVATE_WORKSPACE_IMPORT"));
  });
});
