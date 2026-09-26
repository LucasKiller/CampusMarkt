import { resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { de, en, getDictionary, resolveLocale } from "@campusmarkt/domain";

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

describe("localization architectural boundary tests", () => {
  it("allows importing public entry points of localization domain in application layer", async () => {
    await expect(
      diagnostics(
        `
          import {
            de,
            en,
            dictionaries,
            resolveLocale,
            getDictionary,
            isSupportedLocale,
            type SupportedLocale,
            type Dictionary,
          } from "@campusmarkt/domain";

          void [de, en, dictionaries, resolveLocale, getDictionary, isSupportedLocale];
          export type T = SupportedLocale | Dictionary;
        `,
        "apps/web/src/modules/localization/server/test.ts",
      ),
    ).resolves.toEqual([]);
  });

  it.each([
    ["packages/domain/src/localization/index.ts", "next/server"],
    ["packages/domain/src/localization/index.ts", "react"],
    ["packages/domain/src/localization/resolve-locale.ts", "next/server"],
    ["packages/domain/src/localization/resolve-locale.ts", "react"],
    ["packages/domain/src/localization/types.ts", "next/server"],
    ["packages/domain/src/localization/types.ts", "react"],
  ])(
    "rejects framework imports in localization domain: %s importing %s",
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
    ["packages/domain/src/localization/index.ts", "server-only"],
    ["packages/domain/src/localization/index.ts", "@supabase/supabase-js"],
    ["packages/domain/src/localization/resolve-locale.ts", "server-only"],
    [
      "packages/domain/src/localization/resolve-locale.ts",
      "@supabase/supabase-js",
    ],
  ])(
    "rejects server-only or provider imports in portable localization package: %s importing %s",
    async (path, module) => {
      await expect(
        diagnostics(`import dep from "${module}"; void dep;`, path),
      ).resolves.toEqual(restricted("ARCH_IDENTITY_PORTABLE"));
    },
  );

  it("rejects private deep workspace imports inside localization consumers", async () => {
    await expect(
      diagnostics(
        `import { de } from "@campusmarkt/domain/src/localization/dictionaries/de.ts"; void de;`,
        "apps/web/src/modules/localization/server/test.ts",
      ),
    ).resolves.toEqual(restricted("ARCH_PRIVATE_WORKSPACE_IMPORT"));
  });

  it("verifies dictionary files export pure plain data objects without functions", () => {
    for (const dict of [de, en]) {
      expect(typeof dict).toBe("object");
      expect(dict).not.toBeNull();
      expect(Object.getPrototypeOf(dict)).toBe(Object.prototype);

      const serialized = JSON.stringify(dict);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(dict);

      for (const section of Object.values(dict)) {
        expect(typeof section).toBe("object");
        for (const [key, value] of Object.entries(section)) {
          expect(typeof value).toBe("string");
          expect(typeof key).toBe("string");
        }
      }
    }
  });

  it("verifies localization resolution functions are pure and execute without browser or next globals", () => {
    // Should run purely using argument values without accessing window, document, or Next.js globals
    const resolved = resolveLocale("en", "de");
    expect(resolved).toBe("en");

    const dict = getDictionary(resolved);
    expect(dict.common.appName).toBe("CampusMarkt");
  });
});
