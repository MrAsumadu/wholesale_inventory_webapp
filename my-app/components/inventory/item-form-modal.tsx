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
import { Upload, Loader2 } from "lucide-react";
import { createItem, updateItem } from "@/lib/actions/inventory";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) { setError("Item name is required."); return; }
    if (!categoryId) { setError("Please select a category."); return; }
    if (!price || parseFloat(price) < 0) { setError("Please enter a valid price."); return; }
    if (!quantity || parseInt(quantity, 10) < 0) { setError("Please enter a valid quantity."); return; }

    setLoading(true);
    try {
      const fields = {
        name: name.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        category_id: categoryId,
        expiration_date: expirationDate || null,
      };

      if (item) {
        const { error: err } = await updateItem(item.id, fields);
        if (err) throw err;
      } else {
        const { error: err } = await createItem(fields);
        if (err) throw err;
      }

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
            placeholder="e.g. Organic Bananas (40lb case)"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-8 h-8" />
              <span className="text-sm">Click or drag to upload</span>
            </div>
          </div>
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
