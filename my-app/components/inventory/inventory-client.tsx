"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, AlertTriangle, X } from "lucide-react";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { ItemFormModal } from "@/components/inventory/item-form-modal";
import type { InventoryItem, Category } from "@/lib/types";

interface InventoryClientProps {
  items: InventoryItem[];
  categories: Category[];
}

export function InventoryClient({ items, categories }: InventoryClientProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const lowStockItems = items.filter((item) => item.quantity < 10);

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-fade-in-up">
      {/* Low stock alert */}
      {lowStockItems.length > 0 && !alertDismissed && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm flex-1">
            <span className="font-semibold">{lowStockItems.length} items</span>{" "}
            are running low on stock:{" "}
            {lowStockItems.map((item) => item.name.split("(")[0].trim()).join(", ")}
          </p>
          <button
            onClick={() => setAlertDismissed(true)}
            className="text-amber-600 hover:text-amber-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl text-foreground">
          Inventory
        </h1>
        <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <InventoryTable items={filteredItems} categories={categories} />

      {/* Add Item Modal */}
      <ItemFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={categories}
      />
    </div>
  );
}
