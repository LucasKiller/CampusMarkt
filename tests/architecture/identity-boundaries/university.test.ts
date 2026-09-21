import { resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
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

describe("university verification architectural boundaries", () => {
  it("allows university domain and validation packages to be used in web application layer", async () => {
    const diags = await diagnostics(
      `
        import { isUniversityVerificationActive } from "@campusmarkt/domain";
        import { validateInstitutionalEmail } from "@campusmarkt/validation";
        import type { UniversityBadge } from "@campusmarkt/types";

        const badge: UniversityBadge = {
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
        };
        void [isUniversityVerificationActive, validateInstitutionalEmail, badge];
      `,
      "apps/web/src/modules/identity/application/university/index.ts",
    );

    expect(diags).toEqual([]);
  });

  it.each([
    [
      "packages/domain/src/identity/university.ts",
      "next",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
    [
      "packages/domain/src/identity/university.ts",
      "next/server",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
    [
      "packages/domain/src/identity/university.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/identity/university/index.ts",
      "nodemailer",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/identity/university/index.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/identity/university.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
  ])(
    "rejects framework or infrastructure import in %s (%s)",
    async (file, pkg, ruleCode) => {
      const diags = await diagnostics(
        `import item from "${pkg}"; void item;`,
        file,
      );

      expect(diags).toEqual(restrictedImport(ruleCode));
    },
  );

  it.each([
    ["packages/domain/src/identity/university.ts"],
    ["packages/validation/src/identity/university/index.ts"],
    ["packages/types/src/identity/university.ts"],
  ])("rejects secret access in portable university module %s", async (file) => {
    const diags = await diagnostics(
      `export const pepper = process.env.IDENTITY_HASH_PEPPER;`,
      file,
    );

    expect(diags).toEqual([
      expect.objectContaining({
        ruleId: "no-restricted-syntax",
        message: expect.stringContaining("ARCH_IDENTITY_SECRET_BOUNDARY"),
      }),
    ]);
  });

  it("rejects database adapters inside UI components for university verification", async () => {
    const diags = await diagnostics(
      `import { createClient } from "@supabase/supabase-js"; void createClient;`,
      "apps/web/src/app/account/university-verification-section.tsx",
    );

    expect(diags).toEqual(restrictedImport("ARCH_IDENTITY_PROVIDER_ADAPTER"));
  });
});
