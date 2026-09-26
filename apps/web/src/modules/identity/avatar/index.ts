import "server-only";

import { randomBytes } from "node:crypto";

import { createAdminSupabaseClient } from "../infrastructure/supabase/client";
import {
  createIdentityRepository,
  type ServerIdentity,
} from "../infrastructure/supabase/repository";
import {
  processAvatarImage,
  type AvatarProcessingErrorCode,
} from "../infrastructure/avatar/processor";

export type AvatarSwapResult =
  | {
      status: "success";
      avatarVersion: number;
      avatarUrl: string;
    }
  | { status: "conflict" }
  | { status: "invalid"; code: AvatarProcessingErrorCode }
  | { status: "unavailable" };

export type AvatarRemovalResult =
  { status: "removed" } | { status: "unavailable" };

export interface AvatarStorageClient {
  from(bucket: string): {
    upload(
      path: string,
      body: Buffer | Uint8Array,
      options?: { contentType?: string; upsert?: boolean },
    ): Promise<{ data: unknown; error: unknown }>;
    download(path: string): Promise<{
      data: { arrayBuffer(): Promise<ArrayBufferLike> } | null;
      error: unknown;
    }>;
    remove?(paths: string[]): Promise<{ data: unknown; error: unknown }>;
  };
}

export type AvatarServicePorts = {
  storage: AvatarStorageClient;
  repository: ReturnType<typeof createIdentityRepository>;
};

function createDefaultPorts(): AvatarServicePorts {
  const admin = createAdminSupabaseClient();
  const repo = createIdentityRepository({
    user: admin,
    service: admin,
  });

  return {
    storage: admin.storage as unknown as AvatarStorageClient,
    repository: repo,
  };
}

export type AvatarService = ReturnType<typeof createAvatarService>;

export function createAvatarService(
  ports: AvatarServicePorts = createDefaultPorts(),
) {
  return {
    async replaceAvatar(
      identity: ServerIdentity,
      publicId: string,
      expectedVersion: number,
      rawBuffer: Buffer,
      crop: unknown,
      declaredMediaType?: string,
    ): Promise<AvatarSwapResult> {
      const processed = await processAvatarImage(
        rawBuffer,
        crop,
        declaredMediaType,
      );
      if (!processed.ok) {
        return { status: "invalid", code: processed.code };
      }

      const candidateVersion = expectedVersion + 1;
      const hash = randomBytes(16).toString("hex");
      const candidateKey = `profiles/${publicId}/${candidateVersion}-${hash}.webp`;

      try {
        const { error: uploadError } = await ports.storage
          .from("profile-avatars")
          .upload(candidateKey, processed.buffer, {
            contentType: "image/webp",
            upsert: false,
          });

        if (uploadError) {
          return { status: "unavailable" };
        }
      } catch {
        return { status: "unavailable" };
      }

      const swapResponse = await ports.repository.swapAvatar(
        identity,
        expectedVersion,
        candidateKey,
      );

      if (!swapResponse.ok) {
        return { status: "unavailable" };
      }

      const data = swapResponse.value as
        | { swapped?: boolean; avatar_version?: number | string }
        | Array<{ swapped?: boolean; avatar_version?: number | string }>
        | null;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !row.swapped) {
        return { status: "conflict" };
      }

      const version = Number(row.avatar_version ?? candidateVersion);
      return {
        status: "success",
        avatarVersion: version,
        avatarUrl: `/media/avatars/${publicId}/${version}.webp`,
      };
    },

    async removeAvatar(identity: ServerIdentity): Promise<AvatarRemovalResult> {
      const result = await ports.repository.removeAvatar(identity);
      if (!result.ok) {
        return { status: "unavailable" };
      }
      return { status: "removed" };
    },

    async getAvatarMedia(
      publicId: string,
      version: number,
    ): Promise<Buffer | null> {
      try {
        const resolved = await ports.repository.resolveAvatarMedia(
          publicId,
          version,
        );
        if (!resolved.ok || !resolved.value) {
          return null;
        }

        const { data: blob, error: downloadError } = await ports.storage
          .from("profile-avatars")
          .download(resolved.value);

        if (downloadError || !blob) {
          return null;
        }

        const arrayBuffer = await blob.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch {
        return null;
      }
    },
  };
}
