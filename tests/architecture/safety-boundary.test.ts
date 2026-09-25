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

describe("reporting and blocking architectural boundary tests", () => {
  it("allows importing public entry points of safety domain, types, and validation in application layer", async () => {
    const diags = await diagnostics(
      `
        import {
          assertCanReport,
          canReport,
          assertCanBlock,
          canBlock,
          SelfReportError,
          SelfBlockError,
          DuplicatePendingReportError,
          UserBlockedInteractionError,
        } from "@campusmarkt/domain";
        import type {
          ReportReason,
          ReportTargetType,
          ReportStatus,
          CreateReportRequest,
          ReportConfirmationDTO,
          UserBlockDTO,
          BlockUserRequest,
          BlockUserResponse,
          UnblockUserResponse,
          BlockedUsersListResponse,
        } from "@campusmarkt/types";
        import {
          validateCreateReportInput,
          validateBlockUserInput,
          validateReportTargetId,
          validateBlockedUserId,
        } from "@campusmarkt/validation";

        void [
          assertCanReport,
          canReport,
          assertCanBlock,
          canBlock,
          SelfReportError,
          SelfBlockError,
          DuplicatePendingReportError,
          UserBlockedInteractionError,
          validateCreateReportInput,
          validateBlockUserInput,
          validateReportTargetId,
          validateBlockedUserId,
        ];
        export type T = {
          reason: ReportReason;
          targetType: ReportTargetType;
          status: ReportStatus;
          createReport: CreateReportRequest;
          receipt: ReportConfirmationDTO;
          block: UserBlockDTO;
          blockReq: BlockUserRequest;
          blockRes: BlockUserResponse;
          unblockRes: UnblockUserResponse;
          blockListRes: BlockedUsersListResponse;
        };
      `,
      "apps/web/src/modules/safety/application/safety.ts",
    );

    expect(diags).toEqual([]);
  });

  it.each([
    [
      "packages/domain/src/listings/safety.ts",
      "next/server",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
    [
      "packages/domain/src/listings/safety.ts",
      "react",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
  ])(
    "rejects framework imports in safety domain: %s importing %s",
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
      "packages/domain/src/listings/safety.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/domain/src/listings/safety.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/safety.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/safety.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/safety.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/safety.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
  ])(
    "rejects server-only or provider imports in portable safety packages: %s importing %s",
    async (path, module, ruleCode) => {
      const diags = await diagnostics(
        `import item from "${module}"; void item;`,
        path,
      );

      expect(diags).toEqual(restrictedImport(ruleCode));
    },
  );

  it("rejects database adapters and infrastructure inside safety presentation pages", async () => {
    const diagsProvider = await diagnostics(
      `import { createClient } from "@supabase/supabase-js"; void createClient;`,
      "apps/web/src/app/account/blocked-users/page.tsx",
    );
    expect(diagsProvider).toEqual(
      restrictedImport("ARCH_IDENTITY_PROVIDER_ADAPTER"),
    );

    const diagsInfra = await diagnostics(
      `import adapter from "../../../infrastructure/adapter"; void adapter;`,
      "apps/web/src/app/account/blocked-users/page.tsx",
    );
    expect(diagsInfra).toEqual(
      restrictedImport("ARCH_PRESENTATION_INFRASTRUCTURE"),
    );
  });

  it("rejects private deep workspace imports inside safety validation", async () => {
    const diags = await diagnostics(
      `import { assertCanReport } from "@campusmarkt/domain/src/listings/safety.ts"; void assertCanReport;`,
      "packages/validation/src/listings/safety.ts",
    );

    expect(diags).toEqual(restrictedImport("ARCH_PRIVATE_WORKSPACE_IMPORT"));
  });

  it("enforces reporter identity, email, and safety details do not leak to public listing details, feeds, or search", async () => {
    const diags = await diagnostics(
      `
        import type { PublicListingDetails, PublicFeedItem, PublicSearchResultItem } from "@campusmarkt/types";

        type CheckReporterLeakListing = "reporterId" extends keyof PublicListingDetails ? true : false;
        type CheckReporterEmailLeakListing = "reporterEmail" extends keyof PublicListingDetails ? true : false;
        type CheckReportLeakListing = "reportId" extends keyof PublicListingDetails ? true : false;
        type CheckReporterLeakFeed = "reporterId" extends keyof PublicFeedItem ? true : false;
        type CheckReporterEmailLeakFeed = "reporterEmail" extends keyof PublicFeedItem ? true : false;
        type CheckReporterLeakSearch = "reporterId" extends keyof PublicSearchResultItem ? true : false;

        const check1: CheckReporterLeakListing = false;
        const check2: CheckReporterEmailLeakListing = false;
        const check3: CheckReportLeakListing = false;
        const check4: CheckReporterLeakFeed = false;
        const check5: CheckReporterEmailLeakFeed = false;
        const check6: CheckReporterLeakSearch = false;
        void [check1, check2, check3, check4, check5, check6];
      `,
      "apps/web/src/modules/listings/application/feed.ts",
    );

    expect(diags).toEqual([]);
  });

  it("enforces report confirmation receipts and block DTOs exclude private emails or internal credentials", async () => {
    const diags = await diagnostics(
      `
        import type { ReportConfirmationDTO, UserBlockDTO } from "@campusmarkt/types";

        type CheckReporterEmailInReceipt = "reporterEmail" extends keyof ReportConfirmationDTO ? true : false;
        type CheckEmailInReceipt = "email" extends keyof ReportConfirmationDTO ? true : false;
        type CheckPasswordInReceipt = "passwordHash" extends keyof ReportConfirmationDTO ? true : false;
        type CheckEmailInBlockDTO = "email" extends keyof UserBlockDTO ? true : false;
        type CheckPrimaryEmailInBlockDTO = "primaryEmail" extends keyof UserBlockDTO ? true : false;
        type CheckPhoneInBlockDTO = "phone" extends keyof UserBlockDTO ? true : false;

        const c1: CheckReporterEmailInReceipt = false;
        const c2: CheckEmailInReceipt = false;
        const c3: CheckPasswordInReceipt = false;
        const c4: CheckEmailInBlockDTO = false;
        const c5: CheckPrimaryEmailInBlockDTO = false;
        const c6: CheckPhoneInBlockDTO = false;
        void [c1, c2, c3, c4, c5, c6];
      `,
      "apps/web/src/modules/safety/application/safety.ts",
    );

    expect(diags).toEqual([]);
  });
});
