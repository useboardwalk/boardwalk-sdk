// Isomorphic logo upload — generalizes token-launcher/lib/api/mutations.ts
// `uploadLogo(File)` to accept a Blob, raw bytes, or a data URL. The backend
// hard-caps at 1MB; compress (e.g. sharp) before calling if larger.
import { API_BASE_URL, LOGO_ALLOWED_TYPES, LOGO_MAX_SIZE } from "../constants";
import type { UploadLogoOptions, UploadLogoResult } from "../types";

/** Copy bytes into a fresh ArrayBuffer so the Blob part is `ArrayBuffer`, not
 *  `ArrayBufferLike` (avoids the SharedArrayBuffer-union mismatch with BlobPart). */
function bytesToBlob(bytes: Uint8Array, mime: string): Blob {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: mime });
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const parts = dataUrl.split(",");
  const header = parts[0] ?? "";
  const data = parts[1] ?? "";
  if (!data) throw new Error("Invalid data URL");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "application/octet-stream";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: bytesToBlob(bytes, mime), mime };
}

/**
 * Upload a logo and return its CDN URL. Accepts a `Blob`, raw `Uint8Array`
 * (+ `mime`), or a `data:` URL. Validates type + size; the result is
 * content-deduped (`existed`) so retries are idempotent.
 */
export async function uploadLogo(
  image: Blob | Uint8Array | string,
  options: UploadLogoOptions = {},
): Promise<UploadLogoResult> {
  let blob: Blob;
  let mime = options.mime;

  if (typeof image === "string") {
    if (!image.startsWith("data:")) {
      throw new Error(
        "String logo must be a data URL (data:<mime>;base64,...)",
      );
    }
    const result = dataUrlToBlob(image);
    blob = result.blob;
    mime = mime ?? result.mime;
  } else if (image instanceof Uint8Array) {
    if (!mime) throw new Error("mime is required when passing raw bytes");
    blob = bytesToBlob(image, mime);
  } else {
    blob = image;
    mime = mime ?? image.type;
  }

  if (!mime || !(LOGO_ALLOWED_TYPES as readonly string[]).includes(mime)) {
    throw new Error(
      `Invalid logo type "${mime || "unknown"}". Allowed: ${LOGO_ALLOWED_TYPES.join(", ")}`,
    );
  }
  if (blob.size > LOGO_MAX_SIZE) {
    throw new Error(
      `Logo too large (${blob.size} bytes, max ${LOGO_MAX_SIZE}). Compress to <=1MB first.`,
    );
  }

  const filename = options.filename ?? `logo.${mime.split("/")[1] ?? "png"}`;
  const form = new FormData();
  form.append("file", blob, filename);

  const url = new URL(
    "/boardwalk-upload-logo",
    options.baseUrl ?? API_BASE_URL,
  );
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Logo upload failed: ${res.status} ${res.statusText} ${body}`,
    );
  }
  return res.json() as Promise<UploadLogoResult>;
}
