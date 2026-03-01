import { getShops } from "@/lib/actions/shops";
import { getOrders } from "@/lib/actions/orders";
import { ShopsClient } from "@/components/shops/shops-client";

export default async function ShopsPage() {
  const [shops, orders] = await Promise.all([getShops(), getOrders()]);

  const orderCounts: Record<string, number> = {};
  for (const order of orders) {
    orderCounts[order.shop_id] = (orderCounts[order.shop_id] ?? 0) + 1;
  }

  return <ShopsClient shops={shops} orderCounts={orderCounts} />;
}
