import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock browser-image-compression
vi.mock("browser-image-compression", () => ({
  default: vi.fn(),
}));

// Mock supabase client
const mockUpload = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  }),
}));

import imageCompression from "browser-image-compression";
const mockCompression = vi.mocked(imageCompression);

function makeFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
});

describe("uploadImage", () => {
  // Dynamically import to get fresh module after mocks are set
  async function getUploadImage() {
    const mod = await import("@/lib/upload-image");
    return mod.uploadImage;
  }

  it("compresses the file before uploading", async () => {
    const uploadImage = await getUploadImage();
    const original = makeFile("photo.png", 500_000, "image/png");
    const compressed = makeFile("photo.webp", 100_000, "image/webp");

    mockCompression.mockResolvedValue(compressed);
    mockUpload.mockResolvedValue({ error: null });

    await uploadImage(original, "inventory");

    expect(mockCompression).toHaveBeenCalledWith(
      original,
      expect.objectContaining({
        fileType: "image/webp",
      })
    );
    // Should upload the compressed file, not the original
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/\.webp$/),
      compressed,
      expect.any(Object)
    );
  });

  it("rejects files with MIME !== image/webp after compression", async () => {
    const uploadImage = await getUploadImage();
    const original = makeFile("photo.png", 500_000, "image/png");
    // Simulate compression returning non-webp (broken compression)
    const badResult = makeFile("photo.png", 100_000, "image/png");

    mockCompression.mockResolvedValue(badResult);

    await expect(uploadImage(original, "inventory")).rejects.toThrow(
      /format/i
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects files > 300KB after compression", async () => {
    const uploadImage = await getUploadImage();
    const original = makeFile("photo.png", 1_000_000, "image/png");
    // Simulate compression not shrinking enough
    const tooLarge = makeFile("photo.webp", 350_000, "image/webp");

    mockCompression.mockResolvedValue(tooLarge);

    await expect(uploadImage(original, "inventory")).rejects.toThrow(
      /size/i
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("throws on compression failure (no silent fallback)", async () => {
    const uploadImage = await getUploadImage();
    const original = makeFile("photo.png", 500_000, "image/png");

    mockCompression.mockRejectedValue(new Error("Compression failed"));

    await expect(uploadImage(original, "inventory")).rejects.toThrow(
      "Compression failed"
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("sets cacheControl on upload options", async () => {
    const uploadImage = await getUploadImage();
    const original = makeFile("photo.png", 500_000, "image/png");
    const compressed = makeFile("photo.webp", 100_000, "image/webp");

    mockCompression.mockResolvedValue(compressed);
    mockUpload.mockResolvedValue({ error: null });

    await uploadImage(original, "inventory");

    expect(mockUpload).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(File),
      expect.objectContaining({
        cacheControl: "31536000",
      })
    );
  });
});

describe("compressImage", () => {
  it("skips re-compression for webp files already under 300KB", async () => {
    const { compressImage } = await import("@/lib/upload-image");
    const smallWebp = makeFile("photo.webp", 100_000, "image/webp");

    const result = await compressImage(smallWebp);

    expect(result).toBe(smallWebp);
    expect(mockCompression).not.toHaveBeenCalled();
  });

  it("times out at 8 seconds", async () => {
    vi.useFakeTimers();

    const { compressImage } = await import("@/lib/upload-image");
    const file = makeFile("photo.png", 500_000, "image/png");

    // Never resolve — simulate hung compression
    mockCompression.mockReturnValue(new Promise(() => {}));

    const promise = compressImage(file);

    vi.advanceTimersByTime(8_000);

    await expect(promise).rejects.toThrow(/timed out/i);

    vi.useRealTimers();
  });
});
