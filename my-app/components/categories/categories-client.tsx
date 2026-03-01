"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { CategoryCard } from "@/components/categories/category-card";
import { CategoryFormModal } from "@/components/categories/category-form-modal";
import { deleteCategory } from "@/lib/actions/categories";
import type { Category } from "@/lib/types";

interface CategoriesClientProps {
  categories: Category[];
  itemCounts: Record<string, number>;
}

export function CategoriesClient({ categories, itemCounts }: CategoriesClientProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!deleteCat) return;
    setDeleting(true);
    setDeleteError("");
    const { error } = await deleteCategory(deleteCat.id);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message || "Failed to delete category. Please try again.");
    } else {
      setDeleteCat(null);
      router.refresh();
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl text-foreground">
          Categories
        </h1>
        <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No categories yet</p>
          <p className="text-muted-foreground/70 text-sm mt-1 mb-4">
            Create your first category to organize inventory
          </p>
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              itemCount={itemCounts[cat.id] ?? 0}
              onEdit={setEditCategory}
              onDelete={setDeleteCat}
            />
          ))}
        </div>
      )}

      <CategoryFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <CategoryFormModal
        open={!!editCategory}
        onClose={() => setEditCategory(null)}
        category={editCategory}
      />

      <Dialog open={!!deleteCat} onOpenChange={(v) => { if (!v) { setDeleteCat(null); setDeleteError(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteCat?.name}&rdquo;?
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteCat(null); setDeleteError(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
