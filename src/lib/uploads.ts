import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";

/*
 * Fotoğraf depolama:
 *  - BLOB_READ_WRITE_TOKEN tanımlıysa (Vercel Blob) dosyalar buluta yüklenir.
 *  - Değilse (yerel geliştirme / kendi sunucunuz) `uploads/` klasörüne yazılır ve /media/<dosya> ile sunulur.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const allowed: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
// Vercel'de istek gövdesi 4.5 MB ile sınırlı; tarayıcı fotoğrafları yüklemeden önce küçültür.
const MAX = 4 * 1024 * 1024;

export async function saveImage(file: File): Promise<{ url: string } | { error: string }> {
  const ext = allowed[file.type];
  if (!ext) return { error: "Sadece JPG, PNG veya WEBP yükleyebilirsiniz." };
  if (file.size > MAX) return { error: "Dosya en fazla 4 MB olabilir." };
  const name = `${randomUUID()}${ext}`;
  if (blobEnabled()) {
    const blob = await put(`oyuncular/${name}`, file, { access: "public", contentType: file.type });
    return { url: blob.url };
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/media/${name}` };
}

export async function deleteImage(url: string) {
  if (url.startsWith("/media/")) {
    await unlink(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, path.basename(url))).catch(() => {});
  } else if (blobEnabled() && url.includes(".blob.vercel-storage.com/")) {
    await del(url).catch(() => {});
  }
}
