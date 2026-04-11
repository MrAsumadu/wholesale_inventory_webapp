"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";
import { compressImage } from "@/lib/upload-image";

interface ImageDropzoneProps {
  currentImageUrl?: string;
  onFileReady: (file: File | null) => void;
  height?: string;
}

export function ImageDropzone({
  currentImageUrl,
  onFileReady,
  height = "h-40",
}: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressError, setCompressError] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const setPreviewUrl = useCallback((url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setCompressing(true);
      setCompressError(false);
      try {
        const compressed = await compressImage(file);
        setPreviewUrl(URL.createObjectURL(compressed));
        onFileReady(compressed);
      } catch {
        setPreviewUrl(null);
        onFileReady(null);
        setCompressError(true);
        if (inputRef.current) inputRef.current.value = "";
      } finally {
        setCompressing(false);
      }
    },
    [onFileReady, setPreviewUrl]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setPreviewUrl(null);
    onFileReady(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onFileReady, setPreviewUrl]);

  const displayUrl =
    preview ||
    (currentImageUrl && !currentImageUrl.endsWith(".svg")
      ? currentImageUrl
      : null);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload image"
      className={`relative flex items-center justify-center ${height} rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/30"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {compressing ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Compressing...</span>
        </div>
      ) : compressError ? (
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm font-medium">Compression failed</span>
          <span className="text-xs text-muted-foreground">
            Try a smaller image
          </span>
        </div>
      ) : displayUrl ? (
        <>
          <Image
            src={displayUrl}
            alt="Preview"
            fill
            className="object-contain rounded-lg p-2"
            unoptimized={displayUrl.startsWith("blob:")}
          />
          <button
            type="button"
            aria-label="Remove image"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background shadow z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="w-10 h-10" />
          <span className="text-sm font-medium">
            Click or drag image to upload
          </span>
          <span className="text-xs text-muted-foreground/60">
            PNG, JPG — auto-compressed
          </span>
        </div>
      )}
    </div>
  );
}
