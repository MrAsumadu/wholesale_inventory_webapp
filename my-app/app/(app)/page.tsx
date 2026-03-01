import { getCategories } from "@/lib/actions/categories";
import { getInventoryItemsSlim } from "@/lib/actions/inventory";
import { getShops } from "@/lib/actions/shops";
import { getRecentOrders, getOrderStats } from "@/lib/actions/orders";
import { getRecentAuditLogs } from "@/lib/actions/audit-logs";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const [categories, items, shops, recentOrders, orderStats, recentActivity] =
    await Promise.all([
      getCategories(),
      getInventoryItemsSlim(),
      getShops(),
      getRecentOrders(5),
      getOrderStats(),
      getRecentAuditLogs(8),
    ]);

  return (
    <DashboardClient
      categories={categories}
      inventoryItems={items}
      shops={shops}
      recentOrders={recentOrders}
      orderStats={orderStats}
      recentActivity={recentActivity}
    />
  );
}
