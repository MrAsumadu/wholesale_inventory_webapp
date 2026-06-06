import { isDemoMode } from "@/lib/demo/config";
import { demoStore } from "@/lib/demo/store";
import * as real from "@/lib/actions/inventory";

type CreateFields = {
  name: string;
  price: number;
  quantity: number;
  category_id: string;
  expiration_date?: string | null;
  image?: string;
};
type UpdateFields = Partial<{
  name: string;
  price: number;
  quantity: number;
  category_id: string;
  expiration_date: string | null;
  image: string;
}>;

export async function createItem(fields: CreateFields) {
  return isDemoMode() ? demoStore.createItem(fields) : real.createItem(fields);
}
export async function updateItem(id: string, fields: UpdateFields) {
  return isDemoMode() ? demoStore.updateItem(id, fields) : real.updateItem(id, fields);
}
export async function deleteItem(id: string) {
  return isDemoMode() ? demoStore.deleteItem(id) : real.deleteItem(id);
}
