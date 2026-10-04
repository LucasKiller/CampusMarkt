import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createListingsRouteHandler } from "../../../apps/web/src/app/api/listings/route.ts";
import { createUploadIntentRouteHandler } from "../../../apps/web/src/app/api/listings/media/upload-intent/route.ts";
import type { ListingApplicationService } from "../../../apps/web/src/modules/listings/server/index.ts";
import type { ListingRepository } from "../../../apps/web/src/modules/listings/server/repository.ts";
import type { ListingEntity } from "@campusmarkt/types";

const canonicalOrigin = "https://markt.example.test";
const authUserId = "11111111-1111-4111-8111-111111111111";

function postRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mockSessionDal(
  activeIdentity: { authUserId: string } | null = { authUserId },
) {
  return () =>
    ({
      async requireActiveIdentity() {
        if (!activeIdentity) {
          throw new Error("UNAUTHENTICATED");
        }
        return activeIdentity;
      },
    }) as never;
}

describe("listings routes integration (T11)", () => {
  const sampleListing: ListingEntity = {
    id: "22222222-2222-4222-8222-222222222222",
    ownerId: authUserId,
    listingType: "SELL",
    title: "Wooden Study Desk",
    description: "Good condition wooden desk in central Braunschweig.",
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    priceCents: 5000,
    status: "active",
    media: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        storagePath: `${authUserId}/desk.webp`,
        position: 0,
      },
    ],
    createdAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
  };

  describe("POST /api/listings", () => {
    const validPayload = {
      listingType: "SELL",
      title: "Wooden Study Desk",
      description: "Good condition wooden desk in central Braunschweig.",
      category: "furniture",
      pickupArea: "innenstadt",
      condition: "GOOD",
      priceCents: 5000,
      mediaStoragePaths: [`${authUserId}/desk.webp`],
    };

    it("returns HTTP 201 when listing is successfully created", async () => {
      const mockService: Partial<ListingApplicationService> = {
        createListing: vi.fn(async () => ({
          status: "success" as const,
          data: sampleListing,
        })),
      };

      const handler = createListingsRouteHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(`${canonicalOrigin}/api/listings`, validPayload);
      const res = await handler(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual(sampleListing);
      expect(mockService.createListing).toHaveBeenCalledWith(
        authUserId,
        validPayload,
        expect.objectContaining({ correlationId: expect.any(String) }),
      );
    });

    it("returns HTTP 401 when user is not authenticated", async () => {
      const mockService: Partial<ListingApplicationService> = {
        createListing: vi.fn(),
      };

      const handler = createListingsRouteHandler(
        mockService as ListingApplicationService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = postRequest(`${canonicalOrigin}/api/listings`, validPayload);
      const res = await handler(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHENTICATED");
      expect(mockService.createListing).not.toHaveBeenCalled();
    });

    it("returns HTTP 400 with field errors when payload is invalid", async () => {
      const mockService: Partial<ListingApplicationService> = {
        createListing: vi.fn(async () => ({
          status: "invalid" as const,
          fieldErrors: {
            title: ["Title must contain between 5 and 100 characters."],
          },
        })),
      };

      const handler = createListingsRouteHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(`${canonicalOrigin}/api/listings`, {
        ...validPayload,
        title: "abc",
      });
      const res = await handler(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("INVALID_INPUT");
      expect(json.fieldErrors?.title).toBeDefined();
    });

    it("returns HTTP 429 when rate limit is exceeded", async () => {
      const mockService: Partial<ListingApplicationService> = {
        createListing: vi.fn(async () => ({
          status: "rate_limited" as const,
          retryAfterSeconds: 3600,
        })),
      };

      const handler = createListingsRouteHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(`${canonicalOrigin}/api/listings`, validPayload);
      const res = await handler(req);

      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("3600");
    });
  });

  describe("POST /api/listings/media/upload-intent", () => {
    const validIntent = {
      contentType: "image/webp",
      fileSizeBytes: 1024 * 500, // 500 KB
    };

    it("returns the signed Storage path and token on the public site origin", async () => {
      const mockRepo: Partial<ListingRepository> = {
        createSignedUploadUrl: vi.fn(async (path) => ({
          ok: true as const,
          value: {
            signedUploadUrl: `http://api-gw:8000/storage/v1/object/upload/sign/listing-media/${path}?token=signed-token`,
            storagePath: path,
            expiresAt: "2026-09-22T11:00:00.000Z",
          },
        })),
      };

      const handler = createUploadIntentRouteHandler(
        mockRepo as ListingRepository,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/listings/media/upload-intent`,
        validIntent,
      );
      const res = await handler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.signedUploadUrl).toBe(
        `${canonicalOrigin}/storage/v1/object/upload/sign/listing-media/${json.data.storagePath}?token=signed-token`,
      );
      expect(json.data.storagePath).toMatch(
        new RegExp(`^${authUserId}/[0-9a-f-]+\\.webp$`),
      );
      expect(mockRepo.createSignedUploadUrl).toHaveBeenCalled();
    });

    it.each([
      "not-a-url",
      "http://api-gw:8000/storage/v1/object/upload/sign/listing-media/other/photo.png?token=signed-token",
      `http://api-gw:8000/storage/v1/object/upload/sign/listing-media/${authUserId}/photo.png`,
    ])("rejects an invalid signed upload URL: %s", async (signedUploadUrl) => {
      const mockRepo: Partial<ListingRepository> = {
        createSignedUploadUrl: vi.fn(async (path) => ({
          ok: true as const,
          value: {
            signedUploadUrl,
            storagePath: path,
            expiresAt: "2026-09-22T11:00:00.000Z",
          },
        })),
      };
      const handler = createUploadIntentRouteHandler(
        mockRepo as ListingRepository,
        mockSessionDal(),
        canonicalOrigin,
      );

      const response = await handler(
        postRequest(
          `${canonicalOrigin}/api/listings/media/upload-intent`,
          validIntent,
        ),
      );
      expect(response.status).toBe(503);
      expect((await response.json()).data).toBeUndefined();
    });

    it("rejects a signed Storage path without its token", async () => {
      const mockRepo: Partial<ListingRepository> = {
        createSignedUploadUrl: vi.fn(async (path) => ({
          ok: true as const,
          value: {
            signedUploadUrl: `http://api-gw:8000/storage/v1/object/upload/sign/listing-media/${path}`,
            storagePath: path,
            expiresAt: "2026-09-22T11:00:00.000Z",
          },
        })),
      };
      const handler = createUploadIntentRouteHandler(
        mockRepo as ListingRepository,
        mockSessionDal(),
        canonicalOrigin,
      );
      const response = await handler(
        postRequest(
          `${canonicalOrigin}/api/listings/media/upload-intent`,
          validIntent,
        ),
      );

      expect(response.status).toBe(503);
      expect((await response.json()).data).toBeUndefined();
    });

    it("rejects invalid MIME types with HTTP 400", async () => {
      const mockRepo: Partial<ListingRepository> = {
        createSignedUploadUrl: vi.fn(),
      };

      const handler = createUploadIntentRouteHandler(
        mockRepo as ListingRepository,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/listings/media/upload-intent`,
        {
          contentType: "application/pdf",
          fileSizeBytes: 1024,
        },
      );
      const res = await handler(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("INVALID_INPUT");
      expect(json.fieldErrors?.contentType).toBeDefined();
    });

    it("rejects file exceeding 5MB limit with HTTP 400", async () => {
      const mockRepo: Partial<ListingRepository> = {
        createSignedUploadUrl: vi.fn(),
      };

      const handler = createUploadIntentRouteHandler(
        mockRepo as ListingRepository,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/listings/media/upload-intent`,
        {
          contentType: "image/jpeg",
          fileSizeBytes: 6 * 1024 * 1024,
        },
      );
      const res = await handler(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.fieldErrors?.fileSizeBytes).toBeDefined();
    });

    it("returns HTTP 401 when unauthenticated", async () => {
      const mockRepo: Partial<ListingRepository> = {
        createSignedUploadUrl: vi.fn(),
      };

      const handler = createUploadIntentRouteHandler(
        mockRepo as ListingRepository,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/listings/media/upload-intent`,
        validIntent,
      );
      const res = await handler(req);

      expect(res.status).toBe(401);
    });
  });
});
