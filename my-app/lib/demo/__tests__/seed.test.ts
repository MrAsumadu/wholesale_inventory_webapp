import { describe, it, expect } from "vitest";
import { buildSeed } from "@/lib/demo/seed";

describe("buildSeed", () => {
  it("returns a populated London dataset", () => {
    const s = buildSeed();
    expect(s.categories.length).toBeGreaterThanOrEqual(5);
    expect(s.inventory_items.length).toBeGreaterThanOrEqual(20);
    expect(s.shops.length).toBeGreaterThanOrEqual(4);
    expect(s.orders.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least two low-stock items (<10) to show the alert", () => {
    const s = buildSeed();
    expect(s.inventory_items.filter((i) => i.quantity < 10).length).toBeGreaterThanOrEqual(2);
  });

  it("keeps referential integrity (items->categories, orders->shops, line items->items)", () => {
    const s = buildSeed();
    const catIds = new Set(s.categories.map((c) => c.id));
    const shopIds = new Set(s.shops.map((sh) => sh.id));
    const itemIds = new Set(s.inventory_items.map((i) => i.id));
    expect(s.inventory_items.every((i) => catIds.has(i.category_id))).toBe(true);
    expect(s.orders.every((o) => shopIds.has(o.shop_id))).toBe(true);
    expect(
      s.orders.every((o) => (o.line_items ?? []).every((li) => itemIds.has(li.item_id))),
    ).toBe(true);
  });

  it("returns fresh copies each call (no shared references)", () => {
    const a = buildSeed();
    const b = buildSeed();
    expect(a.inventory_items).not.toBe(b.inventory_items);
    a.inventory_items[0].quantity = -999;
    expect(b.inventory_items[0].quantity).not.toBe(-999);
  });

  it("order totals equal the sum of their line items", () => {
    const s = buildSeed();
    for (const o of s.orders) {
      const sum = (o.line_items ?? []).reduce((t, li) => t + li.quantity * li.unit_price, 0);
      expect(o.total).toBeCloseTo(sum, 2);
    }
  });
});
