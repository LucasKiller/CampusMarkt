import { handleIdentityJsonMutation } from "../../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../../modules/identity/server/access";
import { parseMediaUploadIntentInput } from "@campusmarkt/validation";
import { getListingRepository } from "../../../../../modules/listings/server/index";
import type { ListingRepository } from "../../../../../modules/listings/server/repository";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function createUploadIntentRouteHandler(
  repository?: ListingRepository,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function POST(request: Request) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const resolvedRepo = repository ?? getListingRepository();
    const dal = getDal(origin);

    return handleIdentityJsonMutation(
      request,
      { canonicalOrigin: origin },
      async (body) => {
        let identity;
        try {
          identity = await dal.requireActiveIdentity();
        } catch {
          return {
            ok: false,
            code: "UNAUTHENTICATED",
          };
        }

        const parseResult = parseMediaUploadIntentInput(body);
        if (!parseResult.ok) {
          return {
            ok: false,
            code: "INVALID_INPUT",
            fieldErrors: parseResult.fieldErrors,
          };
        }

        const extension =
          EXTENSION_BY_MIME[parseResult.value.contentType] || "webp";
        const fileId = globalThis.crypto.randomUUID();
        const storagePath = `${identity.authUserId}/${fileId}.${extension}`;

        const uploadResult =
          await resolvedRepo.createSignedUploadUrl(storagePath);
        if (!uploadResult.ok) {
          return {
            ok: false,
            code: "DEPENDENCY_UNAVAILABLE",
          };
        }

        let signedUploadUrl: string;
        try {
          const signed = new URL(uploadResult.value.signedUploadUrl);
          const expectedPath = `/storage/v1/object/upload/sign/listing-media/${storagePath}`;
          if (
            uploadResult.value.storagePath !== storagePath ||
            signed.pathname !== expectedPath ||
            !signed.searchParams.get("token")
          ) {
            throw new Error("INVALID_SIGNED_UPLOAD_URL");
          }
          signedUploadUrl = new URL(
            `${signed.pathname}${signed.search}`,
            origin,
          ).toString();
        } catch {
          return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
        }

        return {
          ok: true,
          data: { ...uploadResult.value, signedUploadUrl },
          status: 200,
        };
      },
    );
  };
}

export const POST = createUploadIntentRouteHandler();
