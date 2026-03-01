import { getCategories } from "@/lib/actions/categories";
import { getInventoryItems } from "@/lib/actions/inventory";
import { getShops } from "@/lib/actions/shops";
import { getOrders } from "@/lib/actions/orders";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const [categories, items, shops, orders] = await Promise.all([
    getCategories(),
    getInventoryItems(),
    getShops(),
    getOrders(),
  ]);

  return (
    <DashboardClient
      categories={categories}
      inventoryItems={items}
      shops={shops}
      orders={orders}
    />
  );
}
