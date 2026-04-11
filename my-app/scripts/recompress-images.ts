/**
 * One-time migration script to re-compress oversized images in Supabase Storage.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/recompress-images.ts
 *
 * Requires: sharp, @supabase/supabase-js
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "images";
const MAX_SIZE_BYTES = 300 * 1024;
const MAX_DIMENSION = 1200;
const CACHE_CONTROL = "31536000";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Usage:\n  NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/recompress-images.ts"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i + 1}/${retries - 1}...`);
    }
  }
  throw new Error("unreachable");
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

interface ImageRow {
  table: "inventory_items" | "categories";
  id: string;
  image: string;
  storagePath: string;
}

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const all: T[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function getImageRows(): Promise<ImageRow[]> {
  const rows: ImageRow[] = [];

  const items = await fetchAll<{ id: string; image: string }>("inventory_items", "id, image");

  for (const item of items) {
    if (!item.image) continue;
    const path = extractStoragePath(item.image);
    if (path) rows.push({ table: "inventory_items", id: item.id, image: item.image, storagePath: path });
  }

  const cats = await fetchAll<{ id: string; image: string }>("categories", "id, image");

  for (const cat of cats) {
    if (!cat.image) continue;
    const path = extractStoragePath(cat.image);
    if (path) rows.push({ table: "categories", id: cat.id, image: cat.image, storagePath: path });
  }

  return rows;
}

async function processImage(row: ImageRow): Promise<{ beforeKB: number; afterKB: number } | null> {
  // Download original
  const blob = await withRetry(async () => {
    const { data, error } = await supabase.storage.from(BUCKET).download(row.storagePath);
    if (error || !data) {
      throw new Error(`Download failed: ${row.storagePath} — ${error?.message ?? "no data"}`);
    }
    return data;
  });

  const originalBytes = blob.size;
  if (originalBytes <= MAX_SIZE_BYTES) {
    return null; // Already small enough
  }

  // Compress with sharp
  const buffer = Buffer.from(await blob.arrayBuffer());
  const compressed = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // If still too large, try lower quality
  let finalBuffer = compressed;
  if (compressed.length > MAX_SIZE_BYTES) {
    finalBuffer = await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 60 })
      .toBuffer();

    if (finalBuffer.length > MAX_SIZE_BYTES) {
      throw new Error(
        `Still exceeds 300KB after quality 60 (${Math.round(finalBuffer.length / 1024)}KB) — ${row.storagePath}`
      );
    }
  }

  // Determine folder from old path
  const folder = row.storagePath.startsWith("categories/") ? "categories" : "inventory";
  const newPath = `${folder}/${randomUUID()}.webp`;

  // Upload new file
  await withRetry(async () => {
    const { error } = await supabase.storage.from(BUCKET).upload(newPath, finalBuffer, {
      contentType: "image/webp",
      cacheControl: CACHE_CONTROL,
      upsert: false,
    });
    if (error) {
      throw new Error(`Upload failed: ${newPath} — ${error.message}`);
    }
  });

  // Update DB row — only after upload succeeds
  const newUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${newPath}`;
  const { error: dbErr } = await supabase
    .from(row.table)
    .update({ image: newUrl })
    .eq("id", row.id);
  if (dbErr) {
    // Clean up the uploaded file since DB update failed
    await supabase.storage.from(BUCKET).remove([newPath]);
    throw new Error(`DB update failed for ${row.table}/${row.id} — ${dbErr.message}`);
  }

  // Delete old file — only after DB write succeeds
  try {
    await supabase.storage.from(BUCKET).remove([row.storagePath]);
  } catch {
    console.warn(`  Warning: could not delete old file ${row.storagePath} (orphaned)`);
  }

  return {
    beforeKB: Math.round(originalBytes / 1024),
    afterKB: Math.round(finalBuffer.length / 1024),
  };
}

async function main() {
  console.log("Fetching image rows from database...");
  const rows = await getImageRows();
  console.log(`Found ${rows.length} images with storage paths.\n`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let totalSaved = 0;

  for (const row of rows) {
    console.log(`Processing: ${row.storagePath}`);
    try {
      const result = await processImage(row);
      if (result === null) {
        skipped++;
        console.log("  Skipped (already <=300KB)");
      } else {
        processed++;
        const saved = result.beforeKB - result.afterKB;
        totalSaved += saved;
        console.log(
          `  ${result.beforeKB}KB → ${result.afterKB}KB (saved ${saved}KB)`
        );
      }
    } catch (err) {
      failed++;
      console.error(`  Failed:`, err);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Processed: ${processed}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Total saved: ${Math.round(totalSaved / 1024)}MB`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
