import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import sharp from "sharp";
import {
  detectAvatarMagicBytes,
  processAvatarImage,
  MAX_AVATAR_BYTES,
  AVATAR_OUTPUT_SIZE,
} from "../../../apps/web/src/modules/identity/infrastructure/avatar/processor.ts";
import {
  createAvatarService,
  type AvatarServicePorts,
  type AvatarStorageClient,
} from "../../../apps/web/src/modules/identity/avatar/index.ts";
import {
  createAvatarMediaHandler,
  GET,
} from "../../../apps/web/src/app/media/avatars/[publicId]/[version]/route.ts";

async function createSampleImage(
  format: "jpeg" | "png" | "webp",
  width = 600,
  height = 600,
  options?: { animated?: boolean; withExif?: boolean },
): Promise<Buffer> {
  let instance = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 100, g: 150, b: 200, alpha: 1 },
    },
  });

  if (options?.withExif) {
    instance = instance.withMetadata({
      exif: {
        IFD0: {
          Artist: "CampusMarkt User",
        },
      },
    });
  }

  if (format === "jpeg") {
    return instance.jpeg().toBuffer();
  }
  if (format === "png") {
    return instance.png().toBuffer();
  }
  return instance.webp().toBuffer();
}

describe("Avatar processing and private media access (T28)", () => {
  describe("Magic byte detection", () => {
    it("identifies valid JPEG magic bytes", async () => {
      const jpegBuffer = await createSampleImage("jpeg");
      expect(detectAvatarMagicBytes(jpegBuffer)).toBe("image/jpeg");
    });

    it("identifies valid PNG magic bytes", async () => {
      const pngBuffer = await createSampleImage("png");
      expect(detectAvatarMagicBytes(pngBuffer)).toBe("image/png");
    });

    it("identifies valid WebP magic bytes", async () => {
      const webpBuffer = await createSampleImage("webp");
      expect(detectAvatarMagicBytes(webpBuffer)).toBe("image/webp");
    });

    it("rejects SVG content", () => {
      const svgBuffer = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',
      );
      expect(detectAvatarMagicBytes(svgBuffer)).toBeNull();
    });

    it("rejects GIF content", () => {
      const gifBuffer = Buffer.from(
        "GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;",
      );
      expect(detectAvatarMagicBytes(gifBuffer)).toBeNull();
    });

    it("rejects executable or random binary content", () => {
      const binBuffer = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00,
      ]); // MZ executable
      expect(detectAvatarMagicBytes(binBuffer)).toBeNull();
    });

    it("rejects too-short buffers", () => {
      expect(detectAvatarMagicBytes(Buffer.from([0xff, 0xd8]))).toBeNull();
    });
  });

  describe("Image bounds and format enforcement", () => {
    it.each(["jpeg", "png", "webp"] as const)(
      "accepts supported avatar formats: %s",
      async (format) => {
        const buffer = await createSampleImage(format);
        const result = await processAvatarImage(
          buffer,
          { x: 0, y: 0, size: 1 },
          `image/${format}`,
        );
        expect(result.ok).toBe(true);
      },
    );

    it("rejects empty buffer", async () => {
      const result = await processAvatarImage(Buffer.alloc(0), {
        x: 0,
        y: 0,
        size: 1,
      });
      expect(result).toEqual({ ok: false, code: "AVATAR_PAYLOAD_EMPTY" });
    });

    it("rejects payload exceeding 5 MB", async () => {
      const largeBuffer = Buffer.alloc(MAX_AVATAR_BYTES + 1);
      const result = await processAvatarImage(largeBuffer, {
        x: 0,
        y: 0,
        size: 1,
      });
      expect(result).toEqual({ ok: false, code: "AVATAR_PAYLOAD_TOO_LARGE" });
    });

    it("rejects unsupported SVG through processAvatarImage", async () => {
      const svgBuffer = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>',
      );
      const result = await processAvatarImage(svgBuffer, {
        x: 0,
        y: 0,
        size: 1,
      });
      expect(result).toEqual({ ok: false, code: "AVATAR_UNSUPPORTED_FORMAT" });
    });

    it("rejects unsupported GIF through processAvatarImage", async () => {
      const gifBuffer = Buffer.from("GIF87a\x01\x00\x01\x00\x80\x00\x00");
      const result = await processAvatarImage(gifBuffer, {
        x: 0,
        y: 0,
        size: 1,
      });
      expect(result).toEqual({ ok: false, code: "AVATAR_UNSUPPORTED_FORMAT" });
    });

    it("rejects when declared media type mismatches detected format", async () => {
      const jpegBuffer = await createSampleImage("jpeg");
      const result = await processAvatarImage(
        jpegBuffer,
        { x: 0, y: 0, size: 1 },
        "image/png",
      );
      expect(result).toEqual({ ok: false, code: "AVATAR_MEDIA_TYPE_MISMATCH" });
    });

    it("accepts when declared media type matches detected format", async () => {
      const pngBuffer = await createSampleImage("png");
      const result = await processAvatarImage(
        pngBuffer,
        { x: 0, y: 0, size: 1 },
        "image/png",
      );
      expect(result.ok).toBe(true);
    });

    it("rejects malformed / corrupt image data with valid magic bytes", async () => {
      const fakeJpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x00, 0x00,
      ]);
      const result = await processAvatarImage(fakeJpeg, {
        x: 0,
        y: 0,
        size: 1,
      });
      expect(result).toEqual({ ok: false, code: "AVATAR_MALFORMED" });
    });

    it("rejects invalid crop parameters", async () => {
      const webpBuffer = await createSampleImage("webp");
      const result = await processAvatarImage(webpBuffer, {
        x: 0,
        y: 0,
        size: 0,
      }); // size must be > 0
      expect(result).toEqual({ ok: false, code: "AVATAR_INVALID_CROP" });
    });

    it("rejects out-of-bounds crop parameters", async () => {
      const webpBuffer = await createSampleImage("webp");
      const result = await processAvatarImage(webpBuffer, {
        x: 0.8,
        y: 0.8,
        size: 0.5,
      }); // x + size > 1
      expect(result).toEqual({ ok: false, code: "AVATAR_INVALID_CROP" });
    });
  });

  describe("Crop processing, output normalization, and metadata stripping", () => {
    it("renders exactly 512x512 WebP from square JPEG", async () => {
      const jpegBuffer = await createSampleImage("jpeg", 800, 800);
      const result = await processAvatarImage(jpegBuffer, {
        x: 0.1,
        y: 0.1,
        size: 0.8,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe("image/webp");
        const meta = await sharp(result.buffer).metadata();
        expect(meta.format).toBe("webp");
        expect(meta.width).toBe(AVATAR_OUTPUT_SIZE);
        expect(meta.height).toBe(AVATAR_OUTPUT_SIZE);
      }
    });

    it("renders exactly 512x512 WebP from landscape PNG", async () => {
      const pngBuffer = await createSampleImage("png", 1200, 800);
      const result = await processAvatarImage(pngBuffer, {
        x: 0.2,
        y: 0.2,
        size: 0.5,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const meta = await sharp(result.buffer).metadata();
        expect(meta.format).toBe("webp");
        expect(meta.width).toBe(AVATAR_OUTPUT_SIZE);
        expect(meta.height).toBe(AVATAR_OUTPUT_SIZE);
      }
    });

    it("renders exactly 512x512 WebP from portrait WebP", async () => {
      const webpBuffer = await createSampleImage("webp", 600, 1000);
      const result = await processAvatarImage(webpBuffer, {
        x: 0,
        y: 0.1,
        size: 0.7,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const meta = await sharp(result.buffer).metadata();
        expect(meta.format).toBe("webp");
        expect(meta.width).toBe(AVATAR_OUTPUT_SIZE);
        expect(meta.height).toBe(AVATAR_OUTPUT_SIZE);
      }
    });

    it("strips EXIF metadata completely from the derivative", async () => {
      const jpegWithExif = await createSampleImage("jpeg", 600, 600, {
        withExif: true,
      });
      const initialMeta = await sharp(jpegWithExif).metadata();
      expect(initialMeta.exif).toBeDefined();

      const result = await processAvatarImage(jpegWithExif, {
        x: 0,
        y: 0,
        size: 1,
      });
      expect(result.ok).toBe(true);

      if (result.ok) {
        const processedMeta = await sharp(result.buffer).metadata();
        expect(processedMeta.exif).toBeUndefined();
        expect(processedMeta.icc).toBeUndefined();
        expect(processedMeta.iptc).toBeUndefined();
        expect(processedMeta.xmp).toBeUndefined();
      }
    });
  });

  describe("Avatar service operations (upload, CAS swap, removal)", () => {
    const testIdentity = {
      authUserId: "018f47a0-1234-7abc-8def-0123456789ab",
      sessionId: "018f47a0-9999-7abc-8def-0123456789ab",
    };
    const testPublicId = "018f47a0-0000-7abc-8def-0123456789ab";

    function mockPorts(overrides?: {
      uploadError?: unknown;
      downloadError?: unknown;
      downloadData?: { arrayBuffer(): Promise<ArrayBuffer> } | null;
      swapResult?: unknown;
      removeResult?: unknown;
      accountData?: unknown;
    }): AvatarServicePorts {
      const uploaded: Array<{ path: string; body: Buffer | Uint8Array }> = [];

      const storage: AvatarStorageClient = {
        from: () => ({
          upload: async (path: string, body: Buffer | Uint8Array) => {
            if (overrides?.uploadError) {
              return { data: null, error: overrides.uploadError };
            }
            uploaded.push({ path, body });
            return { data: { path }, error: null };
          },
          download: async () => {
            if (overrides?.downloadError) {
              return { data: null, error: overrides.downloadError };
            }
            return {
              data: overrides?.downloadData ?? null,
              error: null,
            };
          },
        }),
      };

      const repository = {
        swapAvatar: async () => {
          if (overrides?.swapResult !== undefined) {
            return overrides.swapResult as never;
          }
          return {
            ok: true as const,
            value: {
              swapped: true,
              avatar_version: 1,
              previous_object_key: null,
            },
          };
        },
        removeAvatar: async () => {
          if (overrides?.removeResult !== undefined) {
            return overrides.removeResult as never;
          }
          return {
            ok: true as const,
            value: {
              changed: true,
              avatar_version: 2,
              previous_object_key: "profiles/old.webp",
            },
          };
        },
        resolveAvatarMedia: async (_publicId: string, version: number) => {
          const account = overrides?.accountData as
            | {
                state?: string;
                profiles?: {
                  avatar_version?: number;
                  avatar_object_key?: string | null;
                };
              }
            | undefined;
          const profile = account?.profiles;
          return {
            ok: true as const,
            value:
              account?.state === "active_confirmed" &&
              profile?.avatar_version === version
                ? (profile.avatar_object_key ?? null)
                : null,
          };
        },
      } as never;

      return { storage, repository };
    }

    it("successfully swaps avatar and returns new avatarUrl", async () => {
      const ports = mockPorts();
      const service = createAvatarService(ports);
      const image = await createSampleImage("png");

      const result = await service.replaceAvatar(
        testIdentity,
        testPublicId,
        0,
        image,
        { x: 0, y: 0, size: 1 },
      );

      expect(result).toEqual({
        status: "success",
        avatarVersion: 1,
        avatarUrl: `/media/avatars/${testPublicId}/1.webp`,
      });
    });

    it("returns conflict on CAS version mismatch", async () => {
      const ports = mockPorts({
        swapResult: {
          ok: true,
          value: {
            swapped: false,
            avatar_version: 2,
            previous_object_key: "profiles/winner.webp",
          },
        },
      });
      const service = createAvatarService(ports);
      const image = await createSampleImage("png");

      const result = await service.replaceAvatar(
        testIdentity,
        testPublicId,
        0, // expected 0, but current is 2
        image,
        { x: 0, y: 0, size: 1 },
      );

      expect(result).toEqual({ status: "conflict" });
    });

    it("returns unavailable when storage upload fails", async () => {
      const ports = mockPorts({
        uploadError: new Error("Storage unreachable"),
      });
      const service = createAvatarService(ports);
      const image = await createSampleImage("png");

      const result = await service.replaceAvatar(
        testIdentity,
        testPublicId,
        0,
        image,
        { x: 0, y: 0, size: 1 },
      );

      expect(result).toEqual({ status: "unavailable" });
    });

    it("returns invalid on malformed image input without contacting storage", async () => {
      const ports = mockPorts();
      const service = createAvatarService(ports);

      const result = await service.replaceAvatar(
        testIdentity,
        testPublicId,
        0,
        Buffer.from("invalid-image"),
        { x: 0, y: 0, size: 1 },
      );

      expect(result).toEqual({
        status: "invalid",
        code: "AVATAR_UNSUPPORTED_FORMAT",
      });
    });

    it("successfully removes avatar pointer", async () => {
      const ports = mockPorts();
      const service = createAvatarService(ports);

      const result = await service.removeAvatar(testIdentity);
      expect(result).toEqual({ status: "removed" });
    });

    it("returns unavailable if removeAvatar RPC fails", async () => {
      const ports = mockPorts({
        removeResult: { ok: false, code: "DEPENDENCY_UNAVAILABLE" },
      });
      const service = createAvatarService(ports);

      const result = await service.removeAvatar(testIdentity);
      expect(result).toEqual({ status: "unavailable" });
    });
  });

  describe("Media streaming route and 404 security rules", () => {
    it("returns 404 for invalid publicId format", async () => {
      const req = new Request(
        "http://localhost/media/avatars/not-a-uuid/1.webp",
      );
      const res = await GET(req, {
        params: Promise.resolve({ publicId: "not-a-uuid", version: "1.webp" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 404 for invalid version format", async () => {
      const req = new Request(
        "http://localhost/media/avatars/018f47a0-0000-7abc-8def-0123456789ab/invalid",
      );
      const res = await GET(req, {
        params: Promise.resolve({
          publicId: "018f47a0-0000-7abc-8def-0123456789ab",
          version: "invalid",
        }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent profile", async () => {
      const mockService = {
        getAvatarMedia: vi.fn(async () => null),
      };
      const handler = createAvatarMediaHandler(mockService as never);
      const req = new Request(
        "http://localhost/media/avatars/018f47a0-0000-7abc-8def-0123456789ab/1.webp",
      );
      const res = await handler(req, {
        params: Promise.resolve({
          publicId: "018f47a0-0000-7abc-8def-0123456789ab",
          version: "1.webp",
        }),
      });
      expect(res.status).toBe(404);
      expect(mockService.getAvatarMedia).toHaveBeenCalledWith(
        "018f47a0-0000-7abc-8def-0123456789ab",
        1,
      );
    });

    it("returns 404 when profile is hidden (unconfirmed or deletion pending)", async () => {
      const ports: AvatarServicePorts = {
        storage: {
          from: () => ({
            upload: async () => ({ data: null, error: null }),
            download: async () => ({ data: null, error: null }),
          }),
        },
        repository: {
          resolveAvatarMedia: async () => ({ ok: true, value: null }),
        } as never,
      };

      const service = createAvatarService(ports);
      const media = await service.getAvatarMedia(
        "018f47a0-0000-7abc-8def-0123456789ab",
        1,
      );
      expect(media).toBeNull();
    });

    it("returns 404 when requested version does not match active avatar version", async () => {
      const ports: AvatarServicePorts = {
        storage: {
          from: () => ({
            upload: async () => ({ data: null, error: null }),
            download: async () => ({ data: null, error: null }),
          }),
        },
        repository: {
          resolveAvatarMedia: async () => ({ ok: true, value: null }),
        } as never,
      };

      const service = createAvatarService(ports);
      const media = await service.getAvatarMedia(
        "018f47a0-0000-7abc-8def-0123456789ab",
        1,
      ); // requesting 1
      expect(media).toBeNull();
    });

    it("streams WebP with correct cache headers when avatar exists", async () => {
      const fakeWebp = await createSampleImage("webp", 512, 512);

      const ports: AvatarServicePorts = {
        storage: {
          from: () => ({
            upload: async () => ({ data: null, error: null }),
            download: async () => ({
              data: {
                arrayBuffer: async () =>
                  fakeWebp.buffer.slice(
                    fakeWebp.byteOffset,
                    fakeWebp.byteOffset + fakeWebp.byteLength,
                  ),
              },
              error: null,
            }),
          }),
        },
        repository: {
          resolveAvatarMedia: async () => ({
            ok: true,
            value: "profiles/key1.webp",
          }),
        } as never,
      };

      const service = createAvatarService(ports);
      const media = await service.getAvatarMedia(
        "018f47a0-0000-7abc-8def-0123456789ab",
        1,
      );

      expect(media).not.toBeNull();
      if (media) {
        expect(media.length).toBe(fakeWebp.length);
      }

      // Also test through createAvatarMediaHandler to verify HTTP headers
      const handler = createAvatarMediaHandler(service);
      const req = new Request(
        "http://localhost/media/avatars/018f47a0-0000-7abc-8def-0123456789ab/1.webp",
      );
      const res = await handler(req, {
        params: Promise.resolve({
          publicId: "018f47a0-0000-7abc-8def-0123456789ab",
          version: "1.webp",
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/webp");
      expect(res.headers.get("cache-control")).toBe(
        "public, max-age=31536000, immutable",
      );
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("content-length")).toBe(
        fakeWebp.length.toString(),
      );
    });
  });
});
