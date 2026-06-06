import { isDemoMode } from "@/lib/demo/config";
import { demoStore } from "@/lib/demo/store";
import * as real from "@/lib/actions/categories";

export async function createCategory(fields: { name: string; image?: string }) {
  return isDemoMode() ? demoStore.createCategory(fields) : real.createCategory(fields);
}
export async function updateCategory(id: string, fields: { name?: string; image?: string }) {
  return isDemoMode() ? demoStore.updateCategory(id, fields) : real.updateCategory(id, fields);
}
export async function deleteCategory(id: string) {
  return isDemoMode() ? demoStore.deleteCategory(id) : real.deleteCategory(id);
}
