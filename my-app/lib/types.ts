export interface Category {
  id: string;
  name: string;
  image: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  expiration_date: string | null;
  category_id: string;
  created_at: string;
}

export type InventoryItemSlim = Pick<
  InventoryItem,
  "id" | "name" | "price" | "quantity" | "category_id"
>;

export interface Shop {
  id: string;
  name: string;
  owner: string;
  location: string;
  phone: string;
  opening_time: string;
  closing_time: string;
  created_at: string;
}

export interface OrderLineItem {
  id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  shop_id: string;
  total: number;
  created_at: string;
  line_items?: OrderLineItem[];
}

export interface RecentOrder {
  id: string;
  shop_id: string;
  total: number;
  created_at: string;
  line_items?: { id: string }[];
}

export type AuditEntityType = "category" | "inventory_item" | "shop" | "order";
export type AuditAction = "create" | "update" | "delete";

export interface AuditLog {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;
  user_id: string;
  user_email: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}
