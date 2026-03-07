import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "images";
const MAX_SIZE_MB = 0.2;
const MAX_WIDTH = 1200;

const COMPRESS_TIMEOUT_MS = 15_000;

export async function compressImage(file: File): Promise<File> {
  const compression = imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH,
    useWebWorker: false,
    fileType: "image/webp",
  });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Compression timed out")), COMPRESS_TIMEOUT_MS)
  );

  return Promise.race([compression, timeout]);
}

export async function uploadImage(
  file: File,
  folder: "categories" | "inventory"
): Promise<string> {
  const supabase = createClient();
  const ext = file.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
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
