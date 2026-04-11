import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "images";
const MAX_SIZE_MB = 0.3;
const MAX_WIDTH = 1200;

const COMPRESS_TIMEOUT_MS = 8_000;
const MAX_SIZE_BYTES = 300 * 1024;

export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/webp" && file.size <= MAX_SIZE_BYTES) return file;

  const compression = imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH,
    useWebWorker: false,
    fileType: "image/webp",
  });

  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Compression timed out")), COMPRESS_TIMEOUT_MS);
  });

  return Promise.race([compression, timeout]).finally(() => clearTimeout(timer));
}

export async function uploadImage(
  file: File,
  folder: "categories" | "inventory"
): Promise<string> {
  const compressed = await compressImage(file);

  if (compressed.type !== "image/webp") {
    throw new Error(`Unexpected format: ${compressed.type}. Expected image/webp.`);
  }

  if (compressed.size > MAX_SIZE_BYTES) {
    throw new Error(`Compressed image exceeds size limit (${Math.round(compressed.size / 1024)}KB > 300KB).`);
  }

  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      contentType: compressed.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function extractStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

export async function deleteImage(publicUrl: string): Promise<void> {
  const path = extractStoragePath(publicUrl);
  if (!path) return;
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}
