import { getOrders } from "@/lib/actions/orders";
import { getShops } from "@/lib/actions/shops";
import { OrdersClient } from "@/components/orders/orders-client";

export default async function OrdersPage() {
  const [orders, shops] = await Promise.all([getOrders(), getShops()]);
  return <OrdersClient orders={orders} shops={shops} />;
}
