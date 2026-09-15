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

describe("identity secret access boundary", () => {
  it("allows identity secrets inside infrastructure configuration", async () => {
    await expect(
      diagnostics(
        `
          export const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          export const pepper = process.env.IDENTITY_HASH_PEPPER;
          export const smtpPassword = process.env.SMTP_PASS;
        `,
        "apps/web/src/modules/identity/infrastructure/environment.ts",
      ),
    ).resolves.toEqual([]);
  });

  it.each([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SERVICE_ROLE_KEY",
    "IDENTITY_HASH_PEPPER",
    "SMTP_PASS",
  ])("rejects secret %s outside identity infrastructure", async (secret) => {
    const result = await diagnostics(
      `export const leaked = process.env.${secret};`,
      "apps/web/src/modules/identity/application/leak.ts",
    );

    expect(result).toEqual([
      expect.objectContaining({
        ruleId: "no-restricted-syntax",
        message: expect.stringContaining("ARCH_IDENTITY_SECRET_BOUNDARY"),
      }),
    ]);
  });
});
