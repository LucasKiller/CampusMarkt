export async function uploadSignedListingPhoto(
  signedUploadUrl: string,
  file: File,
) {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);

  const response = await fetch(signedUploadUrl, { method: "PUT", body });
  if (!response.ok) {
    throw new Error("Photo upload failed. Please try again.");
  }
}
