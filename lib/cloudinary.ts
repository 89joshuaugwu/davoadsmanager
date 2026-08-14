/**
 * Direct unsigned upload via fetch — no SDK, matches the pattern used across
 * Joshua's other projects. Requires an "Unsigned" upload preset created in
 * the Cloudinary dashboard (Settings → Upload → Upload presets).
 */
export async function uploadToCloudinary(file: File | Blob, filename?: string) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary env vars missing. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const formData = new FormData();
  formData.append("file", file, filename);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Cloudinary upload failed: ${errBody}`);
  }

  return (await res.json()) as { secure_url: string; public_id: string; [key: string]: unknown };
}
