import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadSignedListingPhoto } from "./upload-photo";

afterEach(() => vi.unstubAllGlobals());

describe("signed listing photo upload", () => {
  it("sends the selected photo as a multipart signed PUT", async () => {
    const request = vi.fn(async (_url: string, _options: RequestInit) => {
      void _url;
      void _options;
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal("fetch", request);
    const file = new File(["photo-bytes"], "item.png", {
      type: "image/png",
    });

    await uploadSignedListingPhoto(
      "https://market.example.test/storage/v1/object/upload/sign/listing-media/item.png?token=signed",
      file,
    );

    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0]?.[0]).toContain("token=signed");
    const options = request.mock.calls[0]?.[1];
    expect(options.method).toBe("PUT");
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get("cacheControl")).toBe("3600");
    expect((options.body as FormData).get("")).toMatchObject({
      name: "item.png",
      type: "image/png",
    });
    expect(options.headers).toBeUndefined();
  });

  it("rejects a failed Storage response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    );
    const file = new File(["photo-bytes"], "item.png", {
      type: "image/png",
    });

    await expect(
      uploadSignedListingPhoto("https://market.example.test/upload", file),
    ).rejects.toThrow("Photo upload failed. Please try again.");
  });
});
