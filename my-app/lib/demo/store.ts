import type { Category, InventoryItem, Shop, Order, OrderLineItem } from "@/lib/types";
import type { DemoData } from "@/lib/demo/types";
import { buildSeed } from "@/lib/demo/seed";
import { DEMO_STORAGE_KEY, isDemoMode } from "@/lib/demo/config";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type Err = { message: string } | null;
type LineInput = { item_id: string; item_name: string; quantity: number; unit_price: number };

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export interface DemoStore {
  // subscription (for useSyncExternalStore)
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => DemoData | null;
  getServerSnapshot: () => DemoData | null;
  // reads
  getCategories: () => Category[];
  getInventoryItems: () => InventoryItem[];
  getShops: () => Shop[];
  getOrders: () => Order[];
  getOrderStats: () => { count: number; totalRevenue: number };
  // category writes
  createCategory: (f: { name: string; image?: string }) => { data: Category | null; error: Err };
  updateCategory: (id: string, f: Partial<Category>) => { error: Err };
  deleteCategory: (id: string) => { error: Err };
  // item writes
  createItem: (f: { name: string; price: number; quantity: number; category_id: string; expiration_date?: string | null; image?: string }) => { data: InventoryItem | null; error: Err };
  updateItem: (id: string, f: Partial<InventoryItem>) => { error: Err };
  deleteItem: (id: string) => { error: Err };
  // shop writes
  createShop: (f: Omit<Shop, "id" | "created_at">) => { data: Shop | null; error: Err };
  updateShop: (id: string, f: Partial<Shop>) => { error: Err };
  deleteShop: (id: string) => { error: Err };
  // order writes
  placeOrder: (shopId: string, lines: LineInput[]) => { data: string | null; error: Err };
  confirmOrder: (orderId: string) => { error: Err };
  cancelOrder: (orderId: string) => { error: Err };
  updatePendingOrder: (orderId: string, lines: LineInput[]) => { error: Err };
  // misc
  reset: () => void;
}

export function createDemoStore(storage: StorageLike | null): DemoStore {
  let data: DemoData | null = null;
  let snapshot: DemoData | null = null;
  const listeners = new Set<() => void>();

  function load(): DemoData {
    if (storage) {
      try {
        const raw = storage.getItem(DEMO_STORAGE_KEY);
        if (raw) return JSON.parse(raw) as DemoData;
      } catch {
        /* fall through to seed */
      }
    }
    return buildSeed();
  }
  function clone(d: DemoData): DemoData {
    return {
      categories: [...d.categories],
      inventory_items: [...d.inventory_items],
      shops: [...d.shops],
      orders: [...d.orders],
    };
  }
  function ensure(): DemoData {
    if (!data) {
      data = load();
      snapshot = clone(data);
    }
    return data;
  }
  function commit() {
    if (!data) return;
    snapshot = clone(data);
    try {
      storage?.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota — ignore */
    }
    listeners.forEach((l) => l());
  }

  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot() {
      ensure();
      return snapshot;
    },
    getServerSnapshot() {
      return null;
    },

    getCategories: () => ensure().categories,
    getInventoryItems: () => ensure().inventory_items,
    getShops: () => ensure().shops,
    getOrders: () => ensure().orders,
    getOrderStats() {
      const done = ensure().orders.filter((o) => o.status === "completed");
      return { count: done.length, totalRevenue: done.reduce((t, o) => t + o.total, 0) };
    },

    createCategory(f) {
      const d = ensure();
      const cat: Category = {
        id: uid(),
        name: f.name,
        image: f.image ?? "/placeholder-item.svg",
        created_at: new Date().toISOString(),
      };
      d.categories = [...d.categories, cat];
      commit();
      return { data: cat, error: null };
    },
    updateCategory(id, f) {
      const d = ensure();
      d.categories = d.categories.map((c) => (c.id === id ? { ...c, ...f } : c));
      commit();
      return { error: null };
    },
    deleteCategory(id) {
      const d = ensure();
      if (d.inventory_items.some((i) => i.category_id === id))
        return { error: { message: "Cannot delete a category that has items. Reassign items first." } };
      d.categories = d.categories.filter((c) => c.id !== id);
      commit();
      return { error: null };
    },

    createItem(f) {
      const d = ensure();
      const item: InventoryItem = {
        id: uid(),
        name: f.name,
        image: f.image ?? "/placeholder-item.svg",
        price: f.price,
        quantity: f.quantity,
        expiration_date: f.expiration_date ?? null,
        category_id: f.category_id,
        created_at: new Date().toISOString(),
      };
      d.inventory_items = [...d.inventory_items, item];
      commit();
      return { data: item, error: null };
    },
    updateItem(id, f) {
      const d = ensure();
      d.inventory_items = d.inventory_items.map((i) => (i.id === id ? { ...i, ...f } : i));
      commit();
      return { error: null };
    },
    deleteItem(id) {
      const d = ensure();
      if (d.orders.some((o) => (o.line_items ?? []).some((li) => li.item_id === id)))
        return { error: { message: "Cannot delete an item that has been ordered." } };
      d.inventory_items = d.inventory_items.filter((i) => i.id !== id);
      commit();
      return { error: null };
    },

    createShop(f) {
      const d = ensure();
      const shop: Shop = { id: uid(), created_at: new Date().toISOString(), ...f };
      d.shops = [...d.shops, shop];
      commit();
      return { data: shop, error: null };
    },
    updateShop(id, f) {
      const d = ensure();
      d.shops = d.shops.map((s) => (s.id === id ? { ...s, ...f } : s));
      commit();
      return { error: null };
    },
    deleteShop(id) {
      const d = ensure();
      if (d.orders.some((o) => o.shop_id === id))
        return { error: { message: "Cannot delete a shop that has orders." } };
      d.shops = d.shops.filter((s) => s.id !== id);
      commit();
      return { error: null };
    },

    placeOrder(shopId, lines) {
      const d = ensure();
      const orderId = uid();
      const total = lines.reduce((t, l) => t + l.quantity * l.unit_price, 0);
      const line_items: OrderLineItem[] = lines.map((l) => ({ id: uid(), order_id: orderId, ...l }));
      const order: Order = {
        id: orderId,
        shop_id: shopId,
        total,
        status: "pending",
        created_at: new Date().toISOString(),
        line_items,
      };
      d.orders = [order, ...d.orders];
      commit();
      return { data: orderId, error: null };
    },
    confirmOrder(orderId) {
      const d = ensure();
      const order = d.orders.find((o) => o.id === orderId);
      if (!order) return { error: { message: "Order not found" } };
      if (order.status !== "pending") return { error: { message: `Order is already ${order.status}` } };
      for (const li of order.line_items ?? []) {
        const item = d.inventory_items.find((i) => i.id === li.item_id);
        if (!item) return { error: { message: `Item "${li.item_name}" not found` } };
        if (item.quantity < li.quantity)
          return { error: { message: `Insufficient stock for "${li.item_name}": requested ${li.quantity}, available ${item.quantity}` } };
      }
      d.inventory_items = d.inventory_items.map((i) => {
        const li = (order.line_items ?? []).find((x) => x.item_id === i.id);
        return li ? { ...i, quantity: i.quantity - li.quantity } : i;
      });
      d.orders = d.orders.map((o) => (o.id === orderId ? { ...o, status: "completed" } : o));
      commit();
      return { error: null };
    },
    cancelOrder(orderId) {
      const d = ensure();
      const order = d.orders.find((o) => o.id === orderId);
      if (!order || order.status !== "pending")
        return { error: { message: "Order not found or is not pending." } };
      d.orders = d.orders.filter((o) => o.id !== orderId);
      commit();
      return { error: null };
    },
    updatePendingOrder(orderId, lines) {
      const d = ensure();
      const order = d.orders.find((o) => o.id === orderId);
      if (!order) return { error: { message: "Order not found" } };
      if (order.status !== "pending") return { error: { message: `Cannot edit a ${order.status} order` } };
      const total = lines.reduce((t, l) => t + l.quantity * l.unit_price, 0);
      const line_items: OrderLineItem[] = lines.map((l) => ({ id: uid(), order_id: orderId, ...l }));
      d.orders = d.orders.map((o) => (o.id === orderId ? { ...o, total, line_items } : o));
      commit();
      return { error: null };
    },

    reset() {
      data = buildSeed();
      try {
        storage?.removeItem(DEMO_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      commit();
    },
  };
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    /* access denied */
  }
  return null;
}

/** App-wide singleton used by the UI. Tests use createDemoStore(memoryStorage). */
export const demoStore = createDemoStore(isDemoMode() ? browserStorage() : null);
