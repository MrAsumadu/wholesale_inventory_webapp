import { describe, it, expect, beforeEach, vi } from "vitest";
import type { CartItem, InventoryItem, Shop } from "@/lib/types";

// --- Extract the localStorage persistence logic as pure functions for testing ---
// These mirror the logic in use-cart.ts

const STORAGE_KEY = "wholesale-cart";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface SavedCart {
  shopId: string;
  items: CartItem[];
  timestamp: number;
}

/**
 * Attempt to restore a cart from a raw localStorage string.
 * Returns { shopId, items } if valid, or null if invalid/expired/missing.
 */
function restoreCart(
  raw: string | null,
  shops: Shop[],
  inventoryItems: InventoryItem[],
  now: number = Date.now(),
): { shopId: string; items: CartItem[] } | null {
  if (!raw) return null;

  let saved: SavedCart;
  try {
    saved = JSON.parse(raw);
  } catch {
    return null;
  }

  // Discard if too old
  if (now - saved.timestamp > MAX_AGE_MS) return null;

  // Discard if shop no longer exists
  if (!shops.some((s) => s.id === saved.shopId)) return null;

  // Filter out items that no longer exist in inventory
  const validItems = saved.items.filter((ci) =>
    inventoryItems.some((i) => i.id === ci.itemId),
  );

  if (validItems.length === 0) return null;

  return { shopId: saved.shopId, items: validItems };
}

/**
 * Build the data to persist to localStorage.
 */
function buildSaveData(shopId: string, cart: CartItem[]): string {
  const data: SavedCart = { shopId, items: cart, timestamp: Date.now() };
  return JSON.stringify(data);
}

// --- Test fixtures ---

const makeShop = (overrides: Partial<Shop> = {}): Shop => ({
  id: "shop-1",
  name: "Test Shop",
  owner: "owner",
  location: "123 Street",
  phone: "555-0100",
  opening_time: "09:00",
  closing_time: "17:00",
  created_at: "",
  ...overrides,
});

const makeItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: "item-1",
  name: "Widget",
  price: 10,
  quantity: 50,
  category_id: "cat-1",
  image: "",
  expiration_date: null,
  created_at: "",
  ...overrides,
});

const makeCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  itemId: "item-1",
  quantity: 2,
  unitPrice: 10,
  discount: 0,
  ...overrides,
});

// ============================================================
// Tests
// ============================================================

describe("restoreCart — localStorage restoration", () => {
  const shops = [makeShop({ id: "shop-1" }), makeShop({ id: "shop-2" })];
  const items = [
    makeItem({ id: "item-1" }),
    makeItem({ id: "item-2" }),
    makeItem({ id: "item-3" }),
  ];
  const now = Date.now();

  it("restores a valid saved cart", () => {
    const saved: SavedCart = {
      shopId: "shop-1",
      items: [makeCartItem({ itemId: "item-1" }), makeCartItem({ itemId: "item-2" })],
      timestamp: now - 1000, // 1 second ago
    };

    const result = restoreCart(JSON.stringify(saved), shops, items, now);

    expect(result).not.toBeNull();
    expect(result!.shopId).toBe("shop-1");
    expect(result!.items).toHaveLength(2);
  });

  it("returns null for null input", () => {
    expect(restoreCart(null, shops, items, now)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(restoreCart("not json{{{", shops, items, now)).toBeNull();
  });

  it("discards cart older than 24 hours", () => {
    const saved: SavedCart = {
      shopId: "shop-1",
      items: [makeCartItem()],
      timestamp: now - MAX_AGE_MS - 1, // just over 24h ago
    };

    expect(restoreCart(JSON.stringify(saved), shops, items, now)).toBeNull();
  });

  it("keeps cart at exactly 24 hours (boundary — not yet expired)", () => {
    const saved: SavedCart = {
      shopId: "shop-1",
      items: [makeCartItem()],
      timestamp: now - MAX_AGE_MS, // exactly 24h ago — > check is strict, so this passes
    };

    const result = restoreCart(JSON.stringify(saved), shops, items, now);
    expect(result).not.toBeNull();
  });

  it("keeps cart just under 24 hours", () => {
    const saved: SavedCart = {
      shopId: "shop-1",
      items: [makeCartItem()],
      timestamp: now - MAX_AGE_MS + 1, // just under 24h
    };

    const result = restoreCart(JSON.stringify(saved), shops, items, now);
    expect(result).not.toBeNull();
  });

  it("discards cart if shop no longer exists", () => {
    const saved: SavedCart = {
      shopId: "deleted-shop",
      items: [makeCartItem()],
      timestamp: now - 1000,
    };

    expect(restoreCart(JSON.stringify(saved), shops, items, now)).toBeNull();
  });

  it("filters out items that no longer exist in inventory", () => {
    const saved: SavedCart = {
      shopId: "shop-1",
      items: [
        makeCartItem({ itemId: "item-1" }),
        makeCartItem({ itemId: "deleted-item" }),
        makeCartItem({ itemId: "item-3" }),
      ],
      timestamp: now - 1000,
    };

    const result = restoreCart(JSON.stringify(saved), shops, items, now);

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(2);
    expect(result!.items.map((i) => i.itemId)).toEqual(["item-1", "item-3"]);
  });

  it("returns null if all saved items have been deleted", () => {
    const saved: SavedCart = {
      shopId: "shop-1",
      items: [
        makeCartItem({ itemId: "deleted-1" }),
        makeCartItem({ itemId: "deleted-2" }),
      ],
      timestamp: now - 1000,
    };

    expect(restoreCart(JSON.stringify(saved), shops, items, now)).toBeNull();
  });

  it("preserves exact saved values (price, discount, quantity)", () => {
    const saved: SavedCart = {
      shopId: "shop-2",
      items: [
        makeCartItem({ itemId: "item-1", quantity: 7, unitPrice: 15.5, discount: 12 }),
      ],
      timestamp: now - 1000,
    };

    const result = restoreCart(JSON.stringify(saved), shops, items, now);

    expect(result).not.toBeNull();
    expect(result!.items[0]).toEqual({
      itemId: "item-1",
      quantity: 7,
      unitPrice: 15.5,
      discount: 12,
    });
  });

  it("returns the correct shopId for restoration", () => {
    const saved: SavedCart = {
      shopId: "shop-2",
      items: [makeCartItem()],
      timestamp: now - 1000,
    };

    const result = restoreCart(JSON.stringify(saved), shops, items, now);
    expect(result!.shopId).toBe("shop-2");
  });
});

describe("buildSaveData — serialization", () => {
  it("serializes cart with shopId and timestamp", () => {
    const cart = [makeCartItem({ itemId: "item-1", quantity: 3, unitPrice: 20, discount: 5 })];
    const raw = buildSaveData("shop-1", cart);
    const parsed: SavedCart = JSON.parse(raw);

    expect(parsed.shopId).toBe("shop-1");
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]).toEqual({
      itemId: "item-1",
      quantity: 3,
      unitPrice: 20,
      discount: 5,
    });
    expect(typeof parsed.timestamp).toBe("number");
    expect(parsed.timestamp).toBeGreaterThan(0);
  });

  it("roundtrips through restoreCart successfully", () => {
    const shops = [makeShop()];
    const items = [makeItem()];
    const cart = [makeCartItem()];

    const raw = buildSaveData("shop-1", cart);
    const result = restoreCart(raw, shops, items);

    expect(result).not.toBeNull();
    expect(result!.items).toEqual(cart);
  });
});
