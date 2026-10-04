const LISTING_MEDIA_PUBLIC_PATH = "/storage/v1/object/public/listing-media/";

export function listingMediaUrl(storagePath: string): string {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  return (
    LISTING_MEDIA_PUBLIC_PATH +
    storagePath.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")
  );
}
