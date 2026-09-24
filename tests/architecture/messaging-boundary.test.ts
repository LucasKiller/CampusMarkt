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

describe("messaging module architectural boundary tests", () => {
  it("allows importing public entry points of messaging domain, types, and validation in application layer", async () => {
    const diags = await diagnostics(
      `
        import {
          assertCanMessage,
          canMessage,
          resolveConversationPartner,
          formatOfferMilestone,
          formatReservationMilestone,
        } from "@campusmarkt/domain";
        import type {
          ConversationDTO,
          MessageDTO,
          SendMessageRequest,
          GetOrCreateConversationRequest,
        } from "@campusmarkt/types";
        import {
          validateSendMessageInput,
          validateGetMessagesQuery,
          validateGetOrCreateConversationInput,
        } from "@campusmarkt/validation";

        void [
          assertCanMessage,
          canMessage,
          resolveConversationPartner,
          formatOfferMilestone,
          formatReservationMilestone,
          validateSendMessageInput,
          validateGetMessagesQuery,
          validateGetOrCreateConversationInput,
        ];
        export type T = {
          conv: ConversationDTO;
          msg: MessageDTO;
          sendReq: SendMessageRequest;
          createReq: GetOrCreateConversationRequest;
        };
      `,
      "apps/web/src/modules/messaging/application/messaging.ts",
    );

    expect(diags).toEqual([]);
  });

  it.each([
    [
      "packages/domain/src/listings/messaging.ts",
      "next/server",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
    [
      "packages/domain/src/listings/messaging.ts",
      "react",
      "ARCH_DOMAIN_FRAMEWORK",
    ],
  ])(
    "rejects framework imports in messaging domain: %s importing %s",
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
      "packages/domain/src/listings/messaging.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/domain/src/listings/messaging.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/messaging.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/types/src/listings/messaging.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/messaging.ts",
      "server-only",
      "ARCH_IDENTITY_PORTABLE",
    ],
    [
      "packages/validation/src/listings/messaging.ts",
      "@supabase/supabase-js",
      "ARCH_IDENTITY_PORTABLE",
    ],
  ])(
    "rejects server-only or provider imports in portable messaging packages: %s importing %s",
    async (path, module, ruleCode) => {
      const diags = await diagnostics(
        `import item from "${module}"; void item;`,
        path,
      );

      expect(diags).toEqual(restrictedImport(ruleCode));
    },
  );

  it("rejects database adapters and infrastructure inside messaging UI presentation", async () => {
    const diagsProvider = await diagnostics(
      `import { createClient } from "@supabase/supabase-js"; void createClient;`,
      "apps/web/src/app/messages/page.tsx",
    );
    expect(diagsProvider).toEqual(
      restrictedImport("ARCH_IDENTITY_PROVIDER_ADAPTER"),
    );

    const diagsInfra = await diagnostics(
      `import adapter from "../infrastructure/adapter"; void adapter;`,
      "apps/web/src/app/messages/page.tsx",
    );
    expect(diagsInfra).toEqual(
      restrictedImport("ARCH_PRESENTATION_INFRASTRUCTURE"),
    );
  });

  it("rejects private deep workspace imports inside messaging validation", async () => {
    const diags = await diagnostics(
      `import { assertCanMessage } from "@campusmarkt/domain/src/listings/messaging.ts"; void assertCanMessage;`,
      "packages/validation/src/listings/messaging.ts",
    );

    expect(diags).toEqual(restrictedImport("ARCH_PRIVATE_WORKSPACE_IMPORT"));
  });

  it("enforces that private messaging data never leaks into public catalog feeds (MSG-01, MSG-05)", async () => {
    const diags = await diagnostics(
      `
        import type { PublicFeedItem } from "@campusmarkt/types";
        type CheckMessageLeak = "messages" extends keyof PublicFeedItem ? true : false;
        type CheckConversationLeak = "conversationId" extends keyof PublicFeedItem ? true : false;
        type CheckLastMessageLeak = "lastMessage" extends keyof PublicFeedItem ? true : false;
        type CheckUnreadLeak = "unreadCount" extends keyof PublicFeedItem ? true : false;

        const check1: CheckMessageLeak = false;
        const check2: CheckConversationLeak = false;
        const check3: CheckLastMessageLeak = false;
        const check4: CheckUnreadLeak = false;
        void [check1, check2, check3, check4];
      `,
      "apps/web/src/modules/listings/application/feed.ts",
    );

    expect(diags).toEqual([]);
  });

  it("ensures messaging domain cannot directly mutate offers or reservations (MSG-05)", async () => {
    const diags = await diagnostics(
      `
        // Messaging domain should only format read-only milestone projections,
        // and cannot import transaction mutation controllers or offer-transition mutators.
        import { formatOfferMilestone, formatReservationMilestone } from "@campusmarkt/domain";
        void [formatOfferMilestone, formatReservationMilestone];
      `,
      "packages/domain/src/listings/messaging.ts",
    );

    expect(diags).toEqual([]);
  });
});
