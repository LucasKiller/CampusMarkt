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

describe("pickup completion architectural boundary tests", () => {
  it("allows importing public entry points of pickup domain, types, and validation in application layer", async () => {
    const diags = await diagnostics(
      `
        import {
          CAMPUS_PICKUP_SPOTS,
          SAFE_PICKUP_RULES,
          assertCanCompletePickup,
          canCompletePickup,
          assertCanTransitionToCompleted,
        } from "@campusmarkt/domain";
        import type {
          CompletePickupRequest,
          TransactionReceiptDTO,
          SafePickupSpot,
          SafePickupGuidanceDTO,
          PublicProfileDTO,
        } from "@campusmarkt/types";
        import {
          validateCompletePickupInput,
          validateReservationId,
          validateCompletedHistoryQuery,
        } from "@campusmarkt/validation";

        void [
          CAMPUS_PICKUP_SPOTS,
          SAFE_PICKUP_RULES,
          assertCanCompletePickup,
          canCompletePickup,
          assertCanTransitionToCompleted,
          validateCompletePickupInput,
          validateReservationId,
          validateCompletedHistoryQuery,
        ];
        export type T = {
          completeReq: CompletePickupRequest;
          receipt: TransactionReceiptDTO;
          spot: SafePickupSpot;
          guidance: SafePickupGuidanceDTO;
          profile: PublicProfileDTO;
        };
      `,
      "apps/web/src/modules/listings/application/pickup.ts",
    );

    expect(diags).toEqual([]);
  });

  it.each([
    [
      "packages/domain/src/listings/pickup.ts",
      "next/server",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
    [
      "packages/domain/src/listings/pickup.ts",
      "react",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
  ])(
    "rejects framework imports in pickup domain: %s importing %s",
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
      "packages/domain/src/listings/pickup.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/domain/src/listings/pickup.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/pickup.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/pickup.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/pickup.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/pickup.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
  ])(
    "rejects server-only or provider imports in portable pickup packages: %s importing %s",
    async (path, module, ruleCode) => {
      const diags = await diagnostics(
        `import item from "${module}"; void item;`,
        path,
      );

      expect(diags).toEqual(restrictedImport(ruleCode));
    },
  );

  it("rejects database adapters and infrastructure inside pickup presentation pages", async () => {
    const diagsProvider = await diagnostics(
      `import { createClient } from "@supabase/supabase-js"; void createClient;`,
      "apps/web/src/app/account/reservations/page.tsx",
    );
    expect(diagsProvider).toEqual(
      restrictedImport("ARCH_IDENTITY_PROVIDER_ADAPTER"),
    );

    const diagsInfra = await diagnostics(
      `import adapter from "../../../infrastructure/adapter"; void adapter;`,
      "apps/web/src/app/account/reservations/page.tsx",
    );
    expect(diagsInfra).toEqual(
      restrictedImport("ARCH_PRESENTATION_INFRASTRUCTURE"),
    );
  });

  it("rejects private deep workspace imports inside pickup validation", async () => {
    const diags = await diagnostics(
      `import { assertCanCompletePickup } from "@campusmarkt/domain/src/listings/pickup.ts"; void assertCanCompletePickup;`,
      "packages/validation/src/listings/pickup.ts",
    );

    expect(diags).toEqual(restrictedImport("ARCH_PRIVATE_WORKSPACE_IMPORT"));
  });

  it("enforces buyer identity and PII do not leak to public listing details or feeds", async () => {
    const diags = await diagnostics(
      `
        import type { PublicListingDetails, PublicFeedItem } from "@campusmarkt/types";

        type CheckBuyerLeak1 = "buyerId" extends keyof PublicListingDetails ? true : false;
        type CheckBuyerLeak2 = "buyer" extends keyof PublicListingDetails ? true : false;
        type CheckBuyerEmailLeak = "buyerEmail" extends keyof PublicListingDetails ? true : false;
        type CheckBuyerLeakFeed = "buyerId" extends keyof PublicFeedItem ? true : false;

        const check1: CheckBuyerLeak1 = false;
        const check2: CheckBuyerLeak2 = false;
        const check3: CheckBuyerEmailLeak = false;
        const check4: CheckBuyerLeakFeed = false;
        void [check1, check2, check3, check4];
      `,
      "apps/web/src/modules/listings/application/feed.ts",
    );

    expect(diags).toEqual([]);
  });

  it("prohibits introduction of payment custody or escrow abstractions into pickup types", async () => {
    const diags = await diagnostics(
      `
        import type { CompletePickupRequest, TransactionReceiptDTO } from "@campusmarkt/types";

        type CheckEscrowInRequest = "escrowId" extends keyof CompletePickupRequest ? true : false;
        type CheckEscrowInReceipt = "escrowId" extends keyof TransactionReceiptDTO ? true : false;
        type CheckPaymentIntent = "paymentIntentId" extends keyof CompletePickupRequest ? true : false;
        type CheckWallet = "walletId" extends keyof TransactionReceiptDTO ? true : false;

        const c1: CheckEscrowInRequest = false;
        const c2: CheckEscrowInReceipt = false;
        const c3: CheckPaymentIntent = false;
        const c4: CheckWallet = false;
        void [c1, c2, c3, c4];
      `,
      "apps/web/src/modules/listings/application/pickup.ts",
    );

    expect(diags).toEqual([]);
  });
});
