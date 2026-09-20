import type { CartItem, Category, InventoryItem, Shop } from "@/lib/types";

// Pure business logic for the products/ordering flow and cart persistence.
// Kept out of the components so both the UI and the tests use the same code.

// --- Catalogue filtering and grouping (products-client.tsx) ---

export function filterItems(
  items: InventoryItem[],
  search: string,
  activeCategory: string | null,
): InventoryItem[] {
  let result = items;
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((item) => item.name.toLowerCase().includes(q));
  }
  if (activeCategory) {
    result = result.filter((item) => item.category_id === activeCategory);
  }
  return result;
}

export const UNCATEGORISED: Category = {
  id: "__uncategorised__",
  name: "Uncategorised",
  image: "",
  created_at: "",
};

export function groupItems(
  filteredItems: InventoryItem[],
  categories: Category[],
): { category: Category; items: InventoryItem[] }[] {
  const groups: { category: Category; items: InventoryItem[] }[] = [];
  const catMap = new Map(categories.map((c) => [c.id, c]));

  for (const item of filteredItems) {
    const cat = catMap.get(item.category_id) ?? UNCATEGORISED;
    let group = groups.find((g) => g.category.id === cat.id);
    if (!group) {
      group = { category: cat, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  groups.sort((a, b) => a.category.name.localeCompare(b.category.name));
  return groups;
}

// --- Cart maths (use-cart.ts) ---

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce(
    (sum, c) => sum + c.quantity * c.unitPrice * (1 - c.discount / 100),
    0,
  );
}

export function updateQuantity(
  cart: CartItem[],
  itemId: string,
  delta: number,
  maxQuantity: number,
): CartItem[] {
  return cart.map((c) =>
    c.itemId === itemId
      ? { ...c, quantity: Math.max(1, Math.min(c.quantity + delta, maxQuantity)) }
      : c,
  );
}

// --- Input validation (use-cart.ts, product-detail-modal.tsx) ---

export function isValidPrice(price: string): boolean {
  const num = parseFloat(price);
  return !(isNaN(num) || num < 0);
}

export function isValidDiscount(discount: string): boolean {
  const num = parseFloat(discount);
  return !(isNaN(num) || num < 0 || num > 100);
}

export function isValidQuantityInput(val: number, maxStock: number): boolean {
  return !isNaN(val) && val >= 1 && val <= maxStock;
}

// --- Recovering a discount when loading an existing order for edit ---

export function backCalculateDiscount(
  storedUnitPrice: number,
  catalogPrice: number | undefined,
): { unitPrice: number; discount: number } {
  const price = catalogPrice ?? storedUnitPrice;
  const discount =
    storedUnitPrice < price
      ? Math.round((1 - storedUnitPrice / price) * 100)
      : 0;
  return { unitPrice: price, discount };
}

// --- Turning a cart into order line items (order-review-sheet.tsx) ---

export function buildLineItems(
  cart: CartItem[],
  getItemName: (id: string) => string,
) {
  return cart.map((c) => ({
    item_id: c.itemId,
    item_name: getItemName(c.itemId),
    quantity: c.quantity,
    unit_price: c.unitPrice * (1 - c.discount / 100),
  }));
}

// --- Cart persistence (use-cart.ts) ---

export const STORAGE_KEY = "wholesale-cart";
export const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SavedCart {
  shopId: string;
  items: CartItem[];
  timestamp: number;
}

/**
 * Decide whether a raw localStorage string can be restored into a cart.
 * Returns { shopId, items } if valid, or null if missing/corrupt/expired/stale.
 * Callers are responsible for clearing storage when this returns null.
 */
export function restoreCart(
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

export function buildSaveData(shopId: string, cart: CartItem[]): string {
  const data: SavedCart = { shopId, items: cart, timestamp: Date.now() };
  return JSON.stringify(data);
}
