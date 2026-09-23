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

describe("offers and reservations architectural boundary tests", () => {
  it("allows importing public entry points of offers domain, types, and validation in application layer", async () => {
    const diags = await diagnostics(
      `
        import {
          assertCanNegotiate,
          canNegotiate,
          assertValidOfferTransition,
          canTransitionOffer,
          canTransitionReservation,
          assertValidReservationTransition,
          supersedeCompromisedOffers,
        } from "@campusmarkt/domain";
        import type {
          OfferDTO,
          ReservationDTO,
          OfferStatus,
          ReservationStatus,
          CreateOfferRequest,
          CounterOfferRequest,
          CancelReservationRequest,
        } from "@campusmarkt/types";
        import {
          validateCreateOfferInput,
          validateCounterOfferInput,
          validateCancelReservationInput,
        } from "@campusmarkt/validation";

        void [
          assertCanNegotiate,
          canNegotiate,
          assertValidOfferTransition,
          canTransitionOffer,
          canTransitionReservation,
          assertValidReservationTransition,
          supersedeCompromisedOffers,
          validateCreateOfferInput,
          validateCounterOfferInput,
          validateCancelReservationInput,
        ];
        export type T = {
          offer: OfferDTO;
          reservation: ReservationDTO;
          oStatus: OfferStatus;
          rStatus: ReservationStatus;
          createReq: CreateOfferRequest;
          counterReq: CounterOfferRequest;
          cancelReq: CancelReservationRequest;
        };
      `,
      "apps/web/src/modules/listings/application/negotiation.ts",
    );

    expect(diags).toEqual([]);
  });

  it.each([
    [
      "packages/domain/src/listings/offers.ts",
      "next/server",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
    [
      "packages/domain/src/listings/offers.ts",
      "react",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
  ])(
    "rejects framework imports in offers domain: %s importing %s",
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
      "packages/domain/src/listings/offers.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/domain/src/listings/offers.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/offers.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/offers.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/offers.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/offers.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
  ])(
    "rejects server-only or provider imports in portable offers packages: %s importing %s",
    async (path, module, ruleCode) => {
      const diags = await diagnostics(
        `import item from "${module}"; void item;`,
        path,
      );

      expect(diags).toEqual(restrictedImport(ruleCode));
    },
  );

  it("rejects database adapters and infrastructure inside negotiation UI presentation", async () => {
    const diagsProvider = await diagnostics(
      `import { createClient } from "@supabase/supabase-js"; void createClient;`,
      "apps/web/src/app/account/reservations/page.tsx",
    );
    expect(diagsProvider).toEqual(
      restrictedImport("ARCH_IDENTITY_PROVIDER_ADAPTER"),
    );

    const diagsInfra = await diagnostics(
      `import adapter from "../infrastructure/adapter"; void adapter;`,
      "apps/web/src/app/account/reservations/page.tsx",
    );
    expect(diagsInfra).toEqual(
      restrictedImport("ARCH_PRESENTATION_INFRASTRUCTURE"),
    );
  });

  it("rejects private deep workspace imports inside offers validation", async () => {
    const diags = await diagnostics(
      `import { assertCanNegotiate } from "@campusmarkt/domain/src/listings/offers.ts"; void assertCanNegotiate;`,
      "packages/validation/src/listings/offers.ts",
    );

    expect(diags).toEqual(restrictedImport("ARCH_PRIVATE_WORKSPACE_IMPORT"));
  });

  it("prohibits private negotiation and email fields from public catalog types", async () => {
    const diags = await diagnostics(
      `
        import type { FeedItemDTO } from "@campusmarkt/types";
        type CheckEmailLeak = "email" extends keyof FeedItemDTO ? true : false;
        type CheckBuyerLeak = "buyerId" extends keyof FeedItemDTO ? true : false;
        type CheckOfferLeak = "offerId" extends keyof FeedItemDTO ? true : false;

        const check1: CheckEmailLeak = false;
        const check2: CheckBuyerLeak = false;
        const check3: CheckOfferLeak = false;
        void [check1, check2, check3];
      `,
      "apps/web/src/modules/listings/application/feed.ts",
    );

    expect(diags).toEqual([]);
  });
});
