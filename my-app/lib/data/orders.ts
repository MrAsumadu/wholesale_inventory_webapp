import { isDemoMode } from "@/lib/demo/config";
import { demoStore } from "@/lib/demo/store";
import * as real from "@/lib/actions/orders";

type LineItem = { item_id: string; item_name: string; quantity: number; unit_price: number };

export async function placeOrder(shopId: string, lineItems: LineItem[]) {
  return isDemoMode() ? demoStore.placeOrder(shopId, lineItems) : real.placeOrder(shopId, lineItems);
}
export async function confirmOrder(orderId: string) {
  return isDemoMode() ? demoStore.confirmOrder(orderId) : real.confirmOrder(orderId);
}
export async function cancelOrder(orderId: string) {
  return isDemoMode() ? demoStore.cancelOrder(orderId) : real.cancelOrder(orderId);
}
export async function updatePendingOrder(orderId: string, lineItems: LineItem[]) {
  return isDemoMode() ? demoStore.updatePendingOrder(orderId, lineItems) : real.updatePendingOrder(orderId, lineItems);
}
