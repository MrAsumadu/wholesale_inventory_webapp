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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { uploadImage, deleteImage } from "@/lib/upload-image";
import { createItem, updateItem } from "@/lib/actions/inventory";
import { createCategory } from "@/lib/actions/categories";
import type { InventoryItem, Category } from "@/lib/types";

interface ItemFormModalProps {
  open: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
  categories: Category[];
}

function ItemForm({
  item,
  onClose,
  categories,
}: {
  item?: InventoryItem | null;
  onClose: () => void;
  categories: Category[];
}) {
  const router = useRouter();
  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? "");
  const [price, setPrice] = useState(item?.price.toString() ?? "");
  const [quantity, setQuantity] = useState(item?.quantity.toString() ?? "");
  const [expirationDate, setExpirationDate] = useState(
    item?.expiration_date ?? ""
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategoryLoading(true);
    try {
      const { data, error: err } = await createCategory({ name: trimmed });
      if (err) throw err;
      if (data) {
        setLocalCategories((prev) => [...prev, data as Category]);
        setCategoryId(data.id);
      }
      setNewCategoryName("");
      setCreatingCategory(false);
    } catch {
      setError("Failed to create category.");
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) { setError("Item name is required."); return; }
    if (!categoryId) { setError("Please select a category."); return; }
    if (price === "" || isNaN(parseFloat(price)) || parseFloat(price) < 0) { setError("Please enter a valid price."); return; }
    if (quantity === "" || isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) < 0) { setError("Please enter a valid quantity."); return; }

    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, "inventory");
      }

      const fields = {
        name: name.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        category_id: categoryId,
        expiration_date: expirationDate || null,
        ...(imageUrl && { image: imageUrl }),
      };

      if (item) {
        const { error: err } = await updateItem(item.id, fields);
        if (err) throw err;
      } else {
        const { error: err } = await createItem(fields);
        if (err) throw err;
      }

      if (imageFile && item?.image) await deleteImage(item.image);
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          {item ? "Edit Item" : "Add Item"}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Basmati Rice (20kg sack)"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          {creatingCategory ? (
            <div className="flex gap-2">
              <Input
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                disabled={categoryLoading}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleCreateCategory}
                disabled={categoryLoading || !newCategoryName.trim()}
                className="shrink-0 bg-primary hover:bg-primary/90"
              >
                {categoryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setCreatingCategory(false); setNewCategoryName(""); }}
                disabled={categoryLoading}
                className="shrink-0"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category" className="flex-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {localCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCreatingCategory(true)}
                className="shrink-0"
                title="New category"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="price">Price ($)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="expiration">Expiration Date</Label>
          <Input
            id="expiration"
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Image</Label>
          <ImageDropzone
            currentImageUrl={item?.image}
            onFileReady={setImageFile}
            height="h-32"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-primary hover:bg-primary/90"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {item ? "Save Changes" : "Add Item"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ItemFormModal({ open, onClose, item, categories }: ItemFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <ItemForm
          key={item?.id ?? "new"}
          item={item}
          onClose={onClose}
          categories={categories}
        />
      </DialogContent>
    </Dialog>
  );
}
