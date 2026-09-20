import {
  createAvatarService,
  type AvatarService,
} from "../../../../../modules/identity/avatar";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

interface RouteContext {
  params: Promise<{
    publicId: string;
    version: string;
  }>;
}

export function createAvatarMediaHandler(customService?: AvatarService) {
  return async function GET(
    _request: Request,
    context: RouteContext,
  ): Promise<Response> {
    const { publicId, version } = await context.params;

    if (!UUID_PATTERN.test(publicId)) {
      return new Response(null, { status: 404 });
    }

    const versionString = version.replace(/\.webp$/iu, "");
    if (!/^[1-9]\d*$/u.test(versionString)) {
      return new Response(null, { status: 404 });
    }

    const numericVersion = parseInt(versionString, 10);

    let service: AvatarService;
    try {
      service = customService ?? createAvatarService();
    } catch {
      return new Response(null, { status: 404 });
    }

    const buffer = await service.getAvatarMedia(publicId, numericVersion);

    if (!buffer) {
      return new Response(null, { status: 404 });
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  };
}

export const GET = createAvatarMediaHandler();
