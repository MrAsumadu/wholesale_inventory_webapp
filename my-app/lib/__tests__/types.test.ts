import { describe, it, assertType } from "vitest";
import type { Category, InventoryItem, Shop, Order, OrderLineItem } from "../types";

describe("types match database schema", () => {
  it("Category has created_at", () => {
    assertType<Category["created_at"]>("" as string);
  });

  it("InventoryItem uses snake_case", () => {
    assertType<InventoryItem["category_id"]>("" as string);
    assertType<InventoryItem["expiration_date"]>("" as string | null);
  });

  it("Order uses shop_id and created_at", () => {
    assertType<Order["shop_id"]>("" as string);
    assertType<Order["created_at"]>("" as string);
  });

  it("OrderLineItem uses snake_case", () => {
    assertType<OrderLineItem["item_id"]>("" as string);
    assertType<OrderLineItem["item_name"]>("" as string);
    assertType<OrderLineItem["unit_price"]>(0 as number);
  });
});
