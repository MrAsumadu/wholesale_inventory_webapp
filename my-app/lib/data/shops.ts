import { isDemoMode } from "@/lib/demo/config";
import { demoStore } from "@/lib/demo/store";
import * as real from "@/lib/actions/shops";

type ShopFields = {
  name: string;
  owner: string;
  location: string;
  phone: string;
  opening_time: string;
  closing_time: string;
};

export async function createShop(fields: ShopFields) {
  return isDemoMode() ? demoStore.createShop(fields) : real.createShop(fields);
}
export async function updateShop(id: string, fields: Partial<ShopFields>) {
  return isDemoMode() ? demoStore.updateShop(id, fields) : real.updateShop(id, fields);
}
export async function deleteShop(id: string) {
  return isDemoMode() ? demoStore.deleteShop(id) : real.deleteShop(id);
}
