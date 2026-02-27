"use client";

import { useState } from "react";
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
import { Upload } from "lucide-react";
import type { Category } from "@/lib/types";

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
}

function CategoryForm({ category, onClose }: { category?: Category | null; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? "");

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
          <div className="flex items-center justify-center h-40 rounded-lg border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-colors group">
            <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-muted-foreground/80">
              <Upload className="w-10 h-10" />
              <span className="text-sm font-medium">
                Click or drag image to upload
              </span>
              <span className="text-xs text-muted-foreground/60">
                PNG, JPG up to 5MB
              </span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose} className="bg-primary hover:bg-primary/90">
          {category ? "Save Changes" : "Add Category"}
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
