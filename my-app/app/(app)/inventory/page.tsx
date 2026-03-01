import { getInventoryItems } from "@/lib/actions/inventory";
import { getCategories } from "@/lib/actions/categories";
import { InventoryClient } from "@/components/inventory/inventory-client";

export default async function InventoryPage() {
  const [items, categories] = await Promise.all([
    getInventoryItems(),
    getCategories(),
  ]);

  return <InventoryClient items={items} categories={categories} />;
}
