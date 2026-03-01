import { notFound } from "next/navigation";
import { getShop } from "@/lib/actions/shops";
import { getShopOrders } from "@/lib/actions/orders";
import { getInventoryItems } from "@/lib/actions/inventory";
import { getCategories } from "@/lib/actions/categories";
import { ShopDetailClient } from "@/components/shops/shop-detail-client";

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) notFound();

  const [orders, items, categories] = await Promise.all([
    getShopOrders(id),
    getInventoryItems(),
    getCategories(),
  ]);

  return <ShopDetailClient shop={shop} orders={orders} items={items} categories={categories} />;
}
