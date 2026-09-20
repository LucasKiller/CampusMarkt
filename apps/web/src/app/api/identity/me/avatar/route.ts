import type { ProfileMutationResult, PublicProfile } from "@campusmarkt/types";
import { parseAvatarCrop } from "@campusmarkt/validation";
import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
  validateMutationRequest,
} from "../../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../../modules/identity/server/access";
import {
  createAvatarService,
  type AvatarService,
} from "../../../../../modules/identity/avatar";
import {
  getProfileService,
  type ProfileService,
} from "../../../../../modules/identity/server/profile";

const MAX_AVATAR_PAYLOAD_BYTES = 6 * 1024 * 1024; // 6 MB to account for multipart boundaries
const MAX_AVATAR_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createAvatarRouteHandler(
  avatarService?: AvatarService,
  profileService?: ProfileService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;
  const getAvatar = () => avatarService ?? createAvatarService();
  const getProfile = () => profileService ?? getProfileService();

  return {
    async POST(request: Request) {
      const httpContext = createIdentityHttpContext(request);
      const origin = canonicalOrigin ?? getCanonicalOrigin(request);

      const decision = validateMutationRequest(request, {
        canonicalOrigin: origin,
        allowedContentTypes: ["multipart/form-data"],
        maxBodyBytes: MAX_AVATAR_PAYLOAD_BYTES,
      });

      if (!decision.ok) {
        return createFailureResponse(decision.code, httpContext.correlationId);
      }

      const dal = getDal(origin);
      let identity;
      try {
        identity = await dal.requireActiveIdentity();
      } catch {
        return createFailureResponse(
          "UNAUTHENTICATED",
          httpContext.correlationId,
        );
      }

      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return createFailureResponse(
          "INVALID_INPUT",
          httpContext.correlationId,
        );
      }

      const file = formData.get("file");
      if (!file || !(file instanceof Blob) || file.size === 0) {
        return createFailureResponse(
          "INVALID_INPUT",
          httpContext.correlationId,
          { fieldErrors: { file: ["Choose a JPEG, PNG, or WebP image."] } },
        );
      }

      if (file.size > MAX_AVATAR_FILE_BYTES) {
        return createFailureResponse(
          "INVALID_INPUT",
          httpContext.correlationId,
          { fieldErrors: { file: ["Image must be no larger than 5 MB."] } },
        );
      }

      const cropRaw = formData.get("crop");
      if (!cropRaw || typeof cropRaw !== "string") {
        return createFailureResponse(
          "INVALID_INPUT",
          httpContext.correlationId,
          { fieldErrors: { crop: ["Choose a valid square crop."] } },
        );
      }

      let cropParsedJson: unknown;
      try {
        cropParsedJson = JSON.parse(cropRaw);
      } catch {
        return createFailureResponse(
          "INVALID_INPUT",
          httpContext.correlationId,
          { fieldErrors: { crop: ["Choose a valid square crop."] } },
        );
      }

      const parsedCrop = parseAvatarCrop(cropParsedJson);
      if (!parsedCrop.ok) {
        return createFailureResponse(
          "INVALID_INPUT",
          httpContext.correlationId,
          { fieldErrors: { crop: parsedCrop.errors } },
        );
      }

      const expectedVersionRaw = formData.get("expectedVersion");
      if (
        !expectedVersionRaw ||
        typeof expectedVersionRaw !== "string" ||
        !/^\d+$/u.test(expectedVersionRaw)
      ) {
        return createFailureResponse(
          "INVALID_INPUT",
          httpContext.correlationId,
          {
            fieldErrors: {
              expectedVersion: [
                "Expected version must be a non-negative integer.",
              ],
            },
          },
        );
      }
      const expectedVersion = parseInt(expectedVersionRaw, 10);

      const resolvedProfileService = getProfile();
      const ownerProfileResult = await resolvedProfileService.getOwnerProfile(
        identity.authUserId,
      );

      if (ownerProfileResult.status === "not_found") {
        return createFailureResponse("NOT_FOUND", httpContext.correlationId);
      }
      if (ownerProfileResult.status === "unavailable") {
        return createFailureResponse(
          "DEPENDENCY_UNAVAILABLE",
          httpContext.correlationId,
        );
      }

      const publicId = ownerProfileResult.profile.publicId;
      const arrayBuffer = await file.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuffer);

      const resolvedAvatarService = getAvatar();
      const swapResult = await resolvedAvatarService.replaceAvatar(
        identity,
        publicId,
        expectedVersion,
        rawBuffer,
        parsedCrop.value,
        file.type,
      );

      if (swapResult.status === "invalid") {
        return createFailureResponse(
          "INVALID_INPUT",
          httpContext.correlationId,
          { fieldErrors: { file: ["Choose a JPEG, PNG, or WebP image."] } },
        );
      }

      if (swapResult.status === "conflict") {
        return createFailureResponse("CONFLICT", httpContext.correlationId);
      }

      if (swapResult.status === "unavailable") {
        return createFailureResponse(
          "DEPENDENCY_UNAVAILABLE",
          httpContext.correlationId,
        );
      }

      const updatedProfile: PublicProfile = {
        ...ownerProfileResult.profile,
        avatarUrl: swapResult.avatarUrl,
      };

      return createSuccessResponse<ProfileMutationResult>(
        {
          status: "updated",
          profile: updatedProfile,
        },
        httpContext.correlationId,
      );
    },

    async DELETE(request: Request) {
      const httpContext = createIdentityHttpContext(request);
      const origin = canonicalOrigin ?? getCanonicalOrigin(request);

      const suppliedOrigin = request.headers.get("origin");
      let expectedOrigin: string;
      try {
        expectedOrigin = new URL(origin).origin;
      } catch {
        return createFailureResponse("FORBIDDEN", httpContext.correlationId);
      }

      if (
        !suppliedOrigin ||
        new URL(suppliedOrigin).origin !== expectedOrigin ||
        suppliedOrigin !== expectedOrigin
      ) {
        return createFailureResponse("FORBIDDEN", httpContext.correlationId);
      }

      const dal = getDal(origin);
      let identity;
      try {
        identity = await dal.requireActiveIdentity();
      } catch {
        return createFailureResponse(
          "UNAUTHENTICATED",
          httpContext.correlationId,
        );
      }

      const resolvedProfileService = getProfile();
      const ownerProfileResult = await resolvedProfileService.getOwnerProfile(
        identity.authUserId,
      );

      if (ownerProfileResult.status === "not_found") {
        return createFailureResponse("NOT_FOUND", httpContext.correlationId);
      }
      if (ownerProfileResult.status === "unavailable") {
        return createFailureResponse(
          "DEPENDENCY_UNAVAILABLE",
          httpContext.correlationId,
        );
      }

      const resolvedAvatarService = getAvatar();
      const removeResult = await resolvedAvatarService.removeAvatar(identity);

      if (removeResult.status === "unavailable") {
        return createFailureResponse(
          "DEPENDENCY_UNAVAILABLE",
          httpContext.correlationId,
        );
      }

      const updatedProfile: PublicProfile = {
        ...ownerProfileResult.profile,
        avatarUrl: null,
      };

      return createSuccessResponse<ProfileMutationResult>(
        {
          status: "updated",
          profile: updatedProfile,
        },
        httpContext.correlationId,
      );
    },
  };
}

const defaultHandler = createAvatarRouteHandler();
export const POST = defaultHandler.POST;
export const DELETE = defaultHandler.DELETE;
