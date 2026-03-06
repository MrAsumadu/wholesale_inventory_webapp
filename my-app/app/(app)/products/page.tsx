import { getInventoryItems } from "@/lib/actions/inventory";
import { getCategories } from "@/lib/actions/categories";
import { getShops } from "@/lib/actions/shops";
import { ProductsClient } from "@/components/products/products-client";

export default async function ProductsPage() {
  const [items, categories, shops] = await Promise.all([
    getInventoryItems(),
    getCategories(),
    getShops(),
  ]);
  return <ProductsClient items={items} categories={categories} shops={shops} />;
}
