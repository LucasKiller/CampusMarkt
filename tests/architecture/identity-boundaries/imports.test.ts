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

function restricted(message: string) {
  return [
    expect.objectContaining({
      ruleId: "no-restricted-imports",
      message: expect.stringContaining(message),
    }),
  ];
}

describe("identity provider import boundaries", () => {
  it("allows provider adapters inside identity infrastructure", async () => {
    await expect(
      diagnostics(
        `
          import "server-only";
          import { createClient } from "@supabase/supabase-js";
          import nodemailer from "nodemailer";
          import sharp from "sharp";
          void [createClient, nodemailer, sharp];
        `,
        "apps/web/src/modules/identity/infrastructure/adapters.ts",
      ),
    ).resolves.toEqual([]);
  });

  it("allows the server-only marker in the identity server DAL", async () => {
    await expect(
      diagnostics(
        `import "server-only"; export const boundary = "server";`,
        "apps/web/src/modules/identity/server/session.ts",
      ),
    ).resolves.toEqual([]);
  });

  it.each([
    ["packages/domain/src/identity/provider.ts", "@supabase/supabase-js"],
    ["packages/validation/src/identity/provider.ts", "sharp"],
    ["packages/types/src/identity/provider.ts", "nodemailer"],
    ["packages/api-client/src/identity/provider.ts", "server-only"],
  ])("rejects portable-package provider import in %s", async (path, module) => {
    await expect(
      diagnostics(`import dependency from "${module}"; void dependency;`, path),
    ).resolves.toEqual(restricted("ARCH_IDENTITY_PORTABLE"));
  });

  it.each([
    ["apps/web/src/app/account/page.tsx", "@supabase/supabase-js"],
    ["apps/web/src/app/account/avatar.tsx", "sharp"],
    ["apps/web/src/modules/identity/application/register.ts", "nodemailer"],
    ["apps/web/src/modules/identity/server/session.ts", "@supabase/ssr"],
  ])(
    "rejects provider import outside infrastructure in %s",
    async (path, module) => {
      await expect(
        diagnostics(
          `import dependency from "${module}"; void dependency;`,
          path,
        ),
      ).resolves.toEqual(restricted("ARCH_IDENTITY_PROVIDER_ADAPTER"));
    },
  );

  it("rejects server-only imports from a client component", async () => {
    await expect(
      diagnostics(
        `"use client"; import "server-only"; export const value = true;`,
        "apps/web/src/modules/identity/ui/profile.tsx",
      ),
    ).resolves.toEqual(restricted("ARCH_IDENTITY_SERVER_ONLY"));
  });
});
