import "server-only";

import { parseAvatarCrop, type SquareCrop } from "@campusmarkt/validation";
import sharp from "sharp";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
export const AVATAR_OUTPUT_SIZE = 512;

export type DetectedAvatarFormat = "image/jpeg" | "image/png" | "image/webp";

export type AvatarProcessingErrorCode =
  | "AVATAR_PAYLOAD_EMPTY"
  | "AVATAR_PAYLOAD_TOO_LARGE"
  | "AVATAR_UNSUPPORTED_FORMAT"
  | "AVATAR_MEDIA_TYPE_MISMATCH"
  | "AVATAR_ANIMATED_REJECTED"
  | "AVATAR_MALFORMED"
  | "AVATAR_INVALID_CROP";

export type AvatarProcessingResult =
  | { ok: true; buffer: Buffer; format: "image/webp" }
  | { ok: false; code: AvatarProcessingErrorCode };

export function detectAvatarMagicBytes(
  buffer: Buffer,
): DetectedAvatarFormat | null {
  if (buffer.length < 12) {
    return null;
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF ... WEBP
  // Byte 0-3: 0x52 0x49 0x46 0x46 ("RIFF")
  // Byte 8-11: 0x57 0x45 0x42 0x50 ("WEBP")
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function processAvatarImage(
  inputBuffer: Buffer,
  cropInput: unknown,
  declaredMediaType?: string,
): Promise<AvatarProcessingResult> {
  if (inputBuffer.length === 0) {
    return { ok: false, code: "AVATAR_PAYLOAD_EMPTY" };
  }

  if (inputBuffer.length > MAX_AVATAR_BYTES) {
    return { ok: false, code: "AVATAR_PAYLOAD_TOO_LARGE" };
  }

  const detected = detectAvatarMagicBytes(inputBuffer);
  if (!detected) {
    return { ok: false, code: "AVATAR_UNSUPPORTED_FORMAT" };
  }

  if (declaredMediaType && declaredMediaType !== detected) {
    return { ok: false, code: "AVATAR_MEDIA_TYPE_MISMATCH" };
  }

  const parsedCrop = parseAvatarCrop(cropInput);
  if (!parsedCrop.ok) {
    return { ok: false, code: "AVATAR_INVALID_CROP" };
  }
  const crop: SquareCrop = parsedCrop.value;

  try {
    const image = sharp(inputBuffer, {
      animated: false,
    });

    const metadata = await image.metadata();

    if (
      !metadata.format ||
      !["jpeg", "png", "webp"].includes(metadata.format)
    ) {
      return { ok: false, code: "AVATAR_UNSUPPORTED_FORMAT" };
    }

    if (metadata.pages && metadata.pages > 1) {
      return { ok: false, code: "AVATAR_ANIMATED_REJECTED" };
    }

    const width = metadata.width;
    const height = metadata.height;

    if (!width || !height || width < 1 || height < 1) {
      return { ok: false, code: "AVATAR_MALFORMED" };
    }

    // Compute pixel crop rectangle
    const pixelWidth = Math.round(crop.size * width);
    const pixelHeight = Math.round(crop.size * height);
    const side = Math.max(1, Math.min(pixelWidth, pixelHeight));

    let left = Math.round(crop.x * width);
    let top = Math.round(crop.y * height);

    if (left + side > width) {
      left = Math.max(0, width - side);
    }
    if (top + side > height) {
      top = Math.max(0, height - side);
    }

    const finalSide = Math.min(side, width - left, height - top);

    // Process: rotate (auto-orient EXIF), extract square crop, resize to 512x512, export as WebP
    // Sharp strips EXIF/ICC metadata by default on output unless withMetadata() is explicitly called
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .extract({
        left,
        top,
        width: finalSide,
        height: finalSide,
      })
      .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, {
        fit: "cover",
      })
      .webp({
        quality: 85,
        effort: 4,
      })
      .toBuffer();

    return {
      ok: true,
      buffer: outputBuffer,
      format: "image/webp",
    };
  } catch {
    return { ok: false, code: "AVATAR_MALFORMED" };
  }
}
