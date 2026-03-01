import { getCategories } from "@/lib/actions/categories";
import { getInventoryItemsSlim } from "@/lib/actions/inventory";
import { getShops } from "@/lib/actions/shops";
import { getRecentOrders, getOrderStats } from "@/lib/actions/orders";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const [categories, items, shops, recentOrders, orderStats] =
    await Promise.all([
      getCategories(),
      getInventoryItemsSlim(),
      getShops(),
      getRecentOrders(5),
      getOrderStats(),
    ]);

  return (
    <DashboardClient
      categories={categories}
      inventoryItems={items}
      shops={shops}
      recentOrders={recentOrders}
      orderStats={orderStats}
    />
  );
}
