import { describe, it, expect, beforeEach } from "vitest";
import { createDemoStore, type DemoStore } from "@/lib/demo/store";

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

let store: DemoStore;
beforeEach(() => { store = createDemoStore(new MemoryStorage()); });

describe("reads", () => {
  it("seeds collections on first access", () => {
    expect(store.getInventoryItems().length).toBeGreaterThan(0);
    expect(store.getCategories().length).toBeGreaterThan(0);
    expect(store.getShops().length).toBeGreaterThan(0);
  });
  it("stats only count completed orders", () => {
    const stats = store.getOrderStats();
    const completed = store.getOrders().filter((o) => o.status === "completed");
    expect(stats.count).toBe(completed.length);
  });
});

describe("placeOrder", () => {
  it("creates a PENDING order and does NOT deduct stock", () => {
    const item = store.getInventoryItems()[0];
    const before = item.quantity;
    const { data, error } = store.placeOrder(store.getShops()[0].id, [
      { item_id: item.id, item_name: item.name, quantity: 2, unit_price: item.price },
    ]);
    expect(error).toBeNull();
    expect(typeof data).toBe("string");
    const created = store.getOrders().find((o) => o.id === data)!;
    expect(created.status).toBe("pending");
    expect(created.total).toBeCloseTo(2 * item.price, 2);
    expect(store.getInventoryItems().find((i) => i.id === item.id)!.quantity).toBe(before);
  });
});

describe("confirmOrder", () => {
  it("deducts stock and marks completed", () => {
    const item = store.getInventoryItems()[0];
    const before = item.quantity;
    const { data: id } = store.placeOrder(store.getShops()[0].id, [
      { item_id: item.id, item_name: item.name, quantity: 3, unit_price: item.price },
    ]);
    const { error } = store.confirmOrder(id as string);
    expect(error).toBeNull();
    expect(store.getOrders().find((o) => o.id === id)!.status).toBe("completed");
    expect(store.getInventoryItems().find((i) => i.id === item.id)!.quantity).toBe(before - 3);
  });
  it("rejects insufficient stock without changing anything", () => {
    const item = store.getInventoryItems()[0];
    const before = item.quantity;
    const { data: id } = store.placeOrder(store.getShops()[0].id, [
      { item_id: item.id, item_name: item.name, quantity: before + 1, unit_price: item.price },
    ]);
    const { error } = store.confirmOrder(id as string);
    expect(error?.message).toMatch(/insufficient stock/i);
    expect(store.getInventoryItems().find((i) => i.id === item.id)!.quantity).toBe(before);
    expect(store.getOrders().find((o) => o.id === id)!.status).toBe("pending");
  });
  it("rejects confirming an already-completed order", () => {
    const item = store.getInventoryItems()[0];
    const { data: id } = store.placeOrder(store.getShops()[0].id, [
      { item_id: item.id, item_name: item.name, quantity: 1, unit_price: item.price },
    ]);
    store.confirmOrder(id as string);
    const { error } = store.confirmOrder(id as string);
    expect(error?.message).toMatch(/already/i);
  });
});

describe("cancelOrder / updatePendingOrder", () => {
  it("cancel removes a pending order", () => {
    const item = store.getInventoryItems()[0];
    const { data: id } = store.placeOrder(store.getShops()[0].id, [
      { item_id: item.id, item_name: item.name, quantity: 1, unit_price: item.price },
    ]);
    const { error } = store.cancelOrder(id as string);
    expect(error).toBeNull();
    expect(store.getOrders().some((o) => o.id === id)).toBe(false);
  });
  it("cancel refuses a completed order", () => {
    const o = store.getOrders().find((x) => x.status === "completed")!;
    expect(store.cancelOrder(o.id).error?.message).toMatch(/not pending|not found/i);
  });
  it("update replaces line items and recomputes total", () => {
    const item = store.getInventoryItems()[0];
    const { data: id } = store.placeOrder(store.getShops()[0].id, [
      { item_id: item.id, item_name: item.name, quantity: 1, unit_price: item.price },
    ]);
    store.updatePendingOrder(id as string, [
      { item_id: item.id, item_name: item.name, quantity: 5, unit_price: 2 },
    ]);
    const o = store.getOrders().find((x) => x.id === id)!;
    expect(o.total).toBeCloseTo(10, 2);
    expect(o.line_items!.length).toBe(1);
  });
});

describe("delete guards (mirror FK restrict)", () => {
  it("blocks deleting a category that has items", () => {
    const cat = store.getInventoryItems()[0].category_id;
    expect(store.deleteCategory(cat).error?.message).toMatch(/has items/i);
  });
  it("blocks deleting an item that has been ordered", () => {
    const orderedId = store.getOrders()[0].line_items![0].item_id;
    expect(store.deleteItem(orderedId).error?.message).toMatch(/ordered/i);
  });
  it("blocks deleting a shop that has orders", () => {
    const shopId = store.getOrders()[0].shop_id;
    expect(store.deleteShop(shopId).error?.message).toMatch(/has orders/i);
  });
});

describe("create/update", () => {
  it("creates an item and a category", () => {
    const { data: cat } = store.createCategory({ name: "Frozen" });
    const { data: it } = store.createItem({ name: "Peas (10 x 1kg)", price: 7, quantity: 12, category_id: cat!.id });
    expect(store.getCategories().some((c) => c.id === cat!.id)).toBe(true);
    expect(store.getInventoryItems().some((i) => i.id === it!.id)).toBe(true);
  });
});

describe("persistence + reset + snapshot", () => {
  it("persists across instances sharing storage", () => {
    const storage = new MemoryStorage();
    const a = createDemoStore(storage);
    const { data: cat } = a.createCategory({ name: "Frozen" });
    const b = createDemoStore(storage);
    expect(b.getCategories().some((c) => c.id === cat!.id)).toBe(true);
  });
  it("reset restores the seed", () => {
    store.createCategory({ name: "Frozen" });
    store.reset();
    expect(store.getCategories().some((c) => c.name === "Frozen")).toBe(false);
  });
  it("getSnapshot returns a stable ref until a mutation occurs", () => {
    const s1 = store.getSnapshot();
    const s2 = store.getSnapshot();
    expect(s1).toBe(s2);
    store.createCategory({ name: "Frozen" });
    expect(store.getSnapshot()).not.toBe(s1);
  });
});
