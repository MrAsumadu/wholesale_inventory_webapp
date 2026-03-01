"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { uploadImage, deleteImage } from "@/lib/upload-image";
import { createCategory, updateCategory } from "@/lib/actions/categories";
import type { Category } from "@/lib/types";

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
}

function CategoryForm({ category, onClose }: { category?: Category | null; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, "categories");
        if (category?.image) await deleteImage(category.image);
      }

      const fields = { name: name.trim(), ...(imageUrl && { image: imageUrl }) };
      const result = category
        ? await updateCategory(category.id, fields)
        : await createCategory(fields);

      if (result.error) {
        setError(result.error.message ?? "Failed to save category. Please try again.");
      } else {
        router.refresh();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload image. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          {category ? "Edit Category" : "Add Category"}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="cat-name">Name</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Produce"
          />
        </div>

        <div className="grid gap-2">
          <Label>Image</Label>
          <ImageDropzone
            currentImageUrl={category?.image}
            onFileReady={setImageFile}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-2">{error}</p>}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : category ? "Save Changes" : "Add Category"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CategoryFormModal({
  open,
  onClose,
  category,
}: CategoryFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <CategoryForm key={category?.id ?? "new"} category={category} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
