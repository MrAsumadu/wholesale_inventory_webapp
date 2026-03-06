import { getInventoryItems } from "@/lib/actions/inventory";
import { getCategories } from "@/lib/actions/categories";
import { getShops } from "@/lib/actions/shops";
import { getOrderById } from "@/lib/actions/orders";
import { ProductsClient } from "@/components/products/products-client";

interface ProductsPageProps {
  searchParams: Promise<{ edit?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const [items, categories, shops] = await Promise.all([
    getInventoryItems(),
    getCategories(),
    getShops(),
  ]);

  const editOrder = params.edit ? await getOrderById(params.edit) : null;

  return <ProductsClient items={items} categories={categories} shops={shops} editOrder={editOrder} />;
}
