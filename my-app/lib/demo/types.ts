import type { Category, InventoryItem, Shop, Order } from "@/lib/types";

/** The full in-browser dataset. Orders always carry their line_items inline. */
export interface DemoData {
  categories: Category[];
  inventory_items: InventoryItem[];
  shops: Shop[];
  orders: Order[];
}
