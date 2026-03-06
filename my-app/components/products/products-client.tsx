"use client";

import type { InventoryItem, Category, Shop } from "@/lib/types";

interface ProductsClientProps {
  items: InventoryItem[];
  categories: Category[];
  shops: Shop[];
}

export function ProductsClient({ items, categories, shops }: ProductsClientProps) {
  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-fade-in-up">
      <h1 className="font-display text-2xl md:text-3xl text-foreground mb-6">Products</h1>
      <p className="text-muted-foreground">{items.length} products across {categories.length} categories</p>
    </div>
  );
}
