import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export function seal(value: string, secret: string): string {
  if (secret.length < 32)
    throw new Error("NEXTAUTH_SECRET must contain at least 32 characters.");
  const key = createHash("sha256").update(`jns-drive-v1:${secret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function unseal(value: string, secret: string): string {
  const data = Buffer.from(value, "base64url");
  const key = createHash("sha256").update(`jns-drive-v1:${secret}`).digest();
  const cipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([
    cipher.update(data.subarray(28)),
    cipher.final(),
  ]).toString("utf8");
}
export async function boundedBody(
  req: Request,
  limit: number,
): Promise<Buffer> {
  if (Number(req.headers.get("content-length")) > limit)
    throw new Error("File exceeds the upload limit.");
  if (!req.body) throw new Error("Empty file.");
  const reader = req.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("File exceeds the upload limit.");
      }
      parts.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new Error("Empty file.");
  return Buffer.concat(parts);
}
export function safeName(input: string): string {
  const name = input
    .replace(/[\x00-\x1f\x7f/\\]/g, "_")
    .trim()
    .slice(0, 180);
  if (!name) throw new Error("A file name is required.");
  return name;
}
export function previewType(bytes: Buffer): string {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString()))
    return "image/gif";
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  return "application/octet-stream";
}
