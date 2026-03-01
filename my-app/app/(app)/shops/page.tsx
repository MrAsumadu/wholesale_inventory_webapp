import { getShops } from "@/lib/actions/shops";
import { getOrderCountsByShop } from "@/lib/actions/orders";
import { ShopsClient } from "@/components/shops/shops-client";

export default async function ShopsPage() {
  const [shops, orderCounts] = await Promise.all([
    getShops(),
    getOrderCountsByShop(),
  ]);

  return <ShopsClient shops={shops} orderCounts={orderCounts} />;
}
