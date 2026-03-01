import { getCategories } from "@/lib/actions/categories";
import { getInventoryItems } from "@/lib/actions/inventory";
import { CategoriesClient } from "@/components/categories/categories-client";

export default async function CategoriesPage() {
  const [categories, items] = await Promise.all([
    getCategories(),
    getInventoryItems(),
  ]);

  const itemCounts: Record<string, number> = {};
  for (const item of items) {
    itemCounts[item.category_id] = (itemCounts[item.category_id] ?? 0) + 1;
  }

  return <CategoriesClient categories={categories} itemCounts={itemCounts} />;
}
