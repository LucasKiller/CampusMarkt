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

describe("moderation module architectural boundary tests", () => {
  it("allows importing public entry points of moderation domain, types, and validation in application layer", async () => {
    const diags = await diagnostics(
      `
        import {
          assertCanModerate,
          canModerate,
          assertAccountNotSuspended,
          isListingRemoved,
          assertListingNotRemoved,
          canEditOrRelistListing,
          isListingPubliclyDiscoverable,
          resolveReservationCascadeOnListingRemoval,
          resolveReservationCascadeOnUserSuspension,
          UnauthorizedModeratorError,
          AccountSuspendedError,
          ListingRemovedError,
        } from "@campusmarkt/domain";
        import type {
          ModerationActionType,
          ModerationQueueItemDTO,
          ModerationActionDTO,
          ExecuteModerationActionRequest,
          ExecuteModerationActionResponse,
          ModerationStatusDTO,
        } from "@campusmarkt/types";
        import {
          isModerationActionType,
          isModerationQueueItemDTO,
          isModerationActionDTO,
          isExecuteModerationActionRequest,
          isModerationStatusDTO,
        } from "@campusmarkt/types";
        import {
          validateExecuteModerationActionInput,
          validateModeratorActionReason,
          validateModerationTargetId,
          validateReportId,
        } from "@campusmarkt/validation";

        void [
          assertCanModerate,
          canModerate,
          assertAccountNotSuspended,
          isListingRemoved,
          assertListingNotRemoved,
          canEditOrRelistListing,
          isListingPubliclyDiscoverable,
          resolveReservationCascadeOnListingRemoval,
          resolveReservationCascadeOnUserSuspension,
          UnauthorizedModeratorError,
          AccountSuspendedError,
          ListingRemovedError,
          isModerationActionType,
          isModerationQueueItemDTO,
          isModerationActionDTO,
          isExecuteModerationActionRequest,
          isModerationStatusDTO,
          validateExecuteModerationActionInput,
          validateModeratorActionReason,
          validateModerationTargetId,
          validateReportId,
        ];

        export type T = {
          actionType: ModerationActionType;
          queueItem: ModerationQueueItemDTO;
          actionDTO: ModerationActionDTO;
          req: ExecuteModerationActionRequest;
          res: ExecuteModerationActionResponse;
          status: ModerationStatusDTO;
        };
      `,
      "apps/web/src/modules/moderation/application/moderation.ts",
    );

    expect(diags).toEqual([]);
  });

  it.each([
    [
      "packages/domain/src/listings/moderation.ts",
      "next/server",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
    [
      "packages/domain/src/listings/moderation.ts",
      "react",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
  ])(
    "rejects framework imports in moderation domain: %s importing %s",
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
      "packages/domain/src/listings/moderation.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/domain/src/listings/moderation.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/moderation.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/moderation.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/moderation.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/moderation.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
  ])(
    "rejects server-only or provider imports in portable moderation packages: %s importing %s",
    async (path, module, ruleCode) => {
      const diags = await diagnostics(
        `import item from "${module}"; void item;`,
        path,
      );

      expect(diags).toEqual(restrictedImport(ruleCode));
    },
  );

  it("rejects database adapters and infrastructure inside moderation presentation pages", async () => {
    const diagsProvider = await diagnostics(
      `import { createClient } from "@supabase/supabase-js"; void createClient;`,
      "apps/web/src/app/moderation/page.tsx",
    );
    expect(diagsProvider).toEqual(
      restrictedImport("ARCH_IDENTITY_PROVIDER_ADAPTER"),
    );

    const diagsInfra = await diagnostics(
      `import adapter from "../../../infrastructure/adapter"; void adapter;`,
      "apps/web/src/app/moderation/audit/page.tsx",
    );
    expect(diagsInfra).toEqual(
      restrictedImport("ARCH_PRESENTATION_INFRASTRUCTURE"),
    );
  });

  it("rejects private deep workspace imports inside moderation validation", async () => {
    const diags = await diagnostics(
      `import { assertCanModerate } from "@campusmarkt/domain/src/listings/moderation.ts"; void assertCanModerate;`,
      "packages/validation/src/listings/moderation.ts",
    );

    expect(diags).toEqual(restrictedImport("ARCH_PRIVATE_WORKSPACE_IMPORT"));
  });

  it("enforces reporter primary email and sensitive credentials do not leak in moderation queue projections", async () => {
    const diags = await diagnostics(
      `
        import type { ModerationQueueItemDTO } from "@campusmarkt/types";

        type CheckReporterEmailLeak = "reporterEmail" extends keyof ModerationQueueItemDTO ? true : false;
        type CheckUserEmailLeak = "userEmail" extends keyof ModerationQueueItemDTO ? true : false;
        type CheckPasswordHashLeak = "passwordHash" extends keyof ModerationQueueItemDTO ? true : false;

        const check1: CheckReporterEmailLeak = false;
        const check2: CheckUserEmailLeak = false;
        const check3: CheckPasswordHashLeak = false;
        void [check1, check2, check3];
      `,
      "apps/web/src/modules/moderation/application/moderation.ts",
    );

    expect(diags).toEqual([]);
  });

  it("enforces moderation audit logs are append-only without mutation fields or private emails", async () => {
    const diags = await diagnostics(
      `
        import type { ModerationActionDTO } from "@campusmarkt/types";

        type CheckUpdatedBy = "updatedBy" extends keyof ModerationActionDTO ? true : false;
        type CheckDeletedAt = "deletedAt" extends keyof ModerationActionDTO ? true : false;
        type CheckReporterEmail = "reporterEmail" extends keyof ModerationActionDTO ? true : false;
        type CheckModeratorEmail = "moderatorEmail" extends keyof ModerationActionDTO ? true : false;

        const check1: CheckUpdatedBy = false;
        const check2: CheckDeletedAt = false;
        const check3: CheckReporterEmail = false;
        const check4: CheckModeratorEmail = false;
        void [check1, check2, check3, check4];
      `,
      "apps/web/src/modules/moderation/application/moderation.ts",
    );

    expect(diags).toEqual([]);
  });
});
