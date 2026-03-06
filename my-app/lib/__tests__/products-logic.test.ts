import { describe, it, expect } from "vitest";
import type { InventoryItem, Category } from "@/lib/types";

// These tests validate the pure business logic used in the products page.
// The algorithms are extracted from products-client.tsx to test independently.

// --- Filtering logic (from products-client.tsx filteredItems useMemo) ---

function filterItems(
  items: InventoryItem[],
  search: string,
  activeCategory: string | null
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

// --- Grouping logic (from products-client.tsx groupedItems useMemo) ---

const UNCATEGORISED: Category = { id: "__uncategorised__", name: "Uncategorised", image: "", created_at: "" };

function groupItems(
  filteredItems: InventoryItem[],
  categories: Category[]
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

// --- Cart logic (from products-client.tsx) ---

interface CartItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, c) => {
    return sum + c.quantity * c.unitPrice * (1 - c.discount / 100);
  }, 0);
}

function updateQuantity(
  cart: CartItem[],
  itemId: string,
  delta: number,
  maxQuantity: number
): CartItem[] {
  return cart.map((c) =>
    c.itemId === itemId
      ? { ...c, quantity: Math.max(1, Math.min(c.quantity + delta, maxQuantity)) }
      : c
  );
}

function isValidPrice(price: string): boolean {
  const num = parseFloat(price);
  return !(isNaN(num) || num < 0);
}

function isValidDiscount(discount: string): boolean {
  const num = parseFloat(discount);
  return !(isNaN(num) || num < 0 || num > 100);
}

function isValidQuantityInput(val: number, maxStock: number): boolean {
  return !isNaN(val) && val >= 1 && val <= maxStock;
}

// --- Back-calculate discount from catalog price (from products-client.tsx edit order loading) ---

function backCalculateDiscount(
  storedUnitPrice: number,
  catalogPrice: number | undefined
): { unitPrice: number; discount: number } {
  const price = catalogPrice ?? storedUnitPrice;
  const discount = storedUnitPrice < price
    ? Math.round((1 - storedUnitPrice / price) * 100)
    : 0;
  return { unitPrice: price, discount };
}

// --- Line items transformation (from order-review-sheet.tsx) ---

function buildLineItems(
  cart: CartItem[],
  getItemName: (id: string) => string
) {
  return cart.map((c) => ({
    item_id: c.itemId,
    item_name: getItemName(c.itemId),
    quantity: c.quantity,
    unit_price: c.unitPrice * (1 - c.discount / 100),
  }));
}

// --- Test fixtures ---

const makeItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: "item-1",
  name: "Widget",
  price: 10,
  quantity: 50,
  category_id: "cat-1",
  image: "",
  created_at: "",
  ...overrides,
});

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat-1",
  name: "Electronics",
  image: "",
  created_at: "",
  ...overrides,
});

// ============================================================
// Tests
// ============================================================

describe("filterItems", () => {
  const items = [
    makeItem({ id: "1", name: "Apple Juice", category_id: "cat-drinks" }),
    makeItem({ id: "2", name: "Banana Chips", category_id: "cat-snacks" }),
    makeItem({ id: "3", name: "Apple Cider Vinegar", category_id: "cat-condiments" }),
  ];

  it("returns all items when search is empty and no category", () => {
    expect(filterItems(items, "", null)).toHaveLength(3);
  });

  it("filters by search term case-insensitively", () => {
    const result = filterItems(items, "apple", null);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("filters by category", () => {
    const result = filterItems(items, "", "cat-snacks");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Banana Chips");
  });

  it("combines search and category filters", () => {
    const result = filterItems(items, "apple", "cat-drinks");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Apple Juice");
  });

  it("returns empty when nothing matches", () => {
    expect(filterItems(items, "xyz", null)).toHaveLength(0);
  });
});

describe("groupItems — uncategorised handling", () => {
  const categories = [
    makeCategory({ id: "cat-1", name: "Electronics" }),
    makeCategory({ id: "cat-2", name: "Food" }),
  ];

  it("groups items by their category", () => {
    const items = [
      makeItem({ id: "1", category_id: "cat-1" }),
      makeItem({ id: "2", category_id: "cat-2" }),
      makeItem({ id: "3", category_id: "cat-1" }),
    ];
    const groups = groupItems(items, categories);

    expect(groups).toHaveLength(2);
    expect(groups[0].category.name).toBe("Electronics");
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].category.name).toBe("Food");
    expect(groups[1].items).toHaveLength(1);
  });

  it("puts items with unknown category_id under Uncategorised", () => {
    const items = [
      makeItem({ id: "1", category_id: "cat-1" }),
      makeItem({ id: "2", category_id: "unknown-cat" }),
      makeItem({ id: "3", category_id: "deleted-cat" }),
    ];
    const groups = groupItems(items, categories);

    expect(groups).toHaveLength(2);
    const uncatGroup = groups.find((g) => g.category.name === "Uncategorised");
    expect(uncatGroup).toBeDefined();
    expect(uncatGroup!.items).toHaveLength(2);
    expect(uncatGroup!.items.map((i) => i.id)).toEqual(["2", "3"]);
  });

  it("sorts groups alphabetically by category name", () => {
    const items = [
      makeItem({ id: "1", category_id: "cat-2" }),
      makeItem({ id: "2", category_id: "cat-1" }),
    ];
    const groups = groupItems(items, categories);
    expect(groups.map((g) => g.category.name)).toEqual(["Electronics", "Food"]);
  });

  it("handles empty items list", () => {
    expect(groupItems([], categories)).toEqual([]);
  });

  it("handles empty categories list — all items become uncategorised", () => {
    const items = [makeItem({ id: "1" }), makeItem({ id: "2" })];
    const groups = groupItems(items, []);

    expect(groups).toHaveLength(1);
    expect(groups[0].category.name).toBe("Uncategorised");
    expect(groups[0].items).toHaveLength(2);
  });
});

describe("cartTotal", () => {
  it("sums items without discount", () => {
    const cart: CartItem[] = [
      { itemId: "1", quantity: 3, unitPrice: 10, discount: 0 },
      { itemId: "2", quantity: 2, unitPrice: 5, discount: 0 },
    ];
    expect(cartTotal(cart)).toBe(40);
  });

  it("applies percentage discount correctly", () => {
    const cart: CartItem[] = [
      { itemId: "1", quantity: 1, unitPrice: 100, discount: 25 },
    ];
    expect(cartTotal(cart)).toBe(75);
  });

  it("handles 100% discount", () => {
    const cart: CartItem[] = [
      { itemId: "1", quantity: 5, unitPrice: 10, discount: 100 },
    ];
    expect(cartTotal(cart)).toBe(0);
  });

  it("returns 0 for empty cart", () => {
    expect(cartTotal([])).toBe(0);
  });

  it("handles multiple items with different discounts", () => {
    const cart: CartItem[] = [
      { itemId: "1", quantity: 2, unitPrice: 50, discount: 10 },  // 2 * 50 * 0.9 = 90
      { itemId: "2", quantity: 1, unitPrice: 20, discount: 50 },  // 1 * 20 * 0.5 = 10
    ];
    expect(cartTotal(cart)).toBe(100);
  });
});

describe("updateQuantity — bounds checking", () => {
  const cart: CartItem[] = [
    { itemId: "item-1", quantity: 5, unitPrice: 10, discount: 0 },
  ];

  it("increments quantity by delta", () => {
    const updated = updateQuantity(cart, "item-1", 1, 50);
    expect(updated[0].quantity).toBe(6);
  });

  it("decrements quantity by delta", () => {
    const updated = updateQuantity(cart, "item-1", -1, 50);
    expect(updated[0].quantity).toBe(4);
  });

  it("clamps to minimum of 1", () => {
    const updated = updateQuantity(cart, "item-1", -100, 50);
    expect(updated[0].quantity).toBe(1);
  });

  it("clamps to maximum stock", () => {
    const updated = updateQuantity(cart, "item-1", 100, 10);
    expect(updated[0].quantity).toBe(10);
  });

  it("does not modify other items in cart", () => {
    const multiCart = [
      ...cart,
      { itemId: "item-2", quantity: 3, unitPrice: 5, discount: 0 },
    ];
    const updated = updateQuantity(multiCart, "item-1", 1, 50);
    expect(updated[1].quantity).toBe(3);
  });
});

describe("quantity input validation", () => {
  it("accepts valid values within stock range", () => {
    expect(isValidQuantityInput(1, 50)).toBe(true);
    expect(isValidQuantityInput(25, 50)).toBe(true);
    expect(isValidQuantityInput(50, 50)).toBe(true);
  });

  it("rejects zero", () => {
    expect(isValidQuantityInput(0, 50)).toBe(false);
  });

  it("rejects values above stock", () => {
    expect(isValidQuantityInput(51, 50)).toBe(false);
  });

  it("rejects NaN", () => {
    expect(isValidQuantityInput(NaN, 50)).toBe(false);
  });

  it("rejects negative values", () => {
    expect(isValidQuantityInput(-1, 50)).toBe(false);
  });
});

describe("price validation", () => {
  it("accepts valid prices", () => {
    expect(isValidPrice("10")).toBe(true);
    expect(isValidPrice("0")).toBe(true);
    expect(isValidPrice("99.99")).toBe(true);
  });

  it("rejects negative prices", () => {
    expect(isValidPrice("-1")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(isValidPrice("abc")).toBe(false);
    expect(isValidPrice("")).toBe(false);
  });
});

describe("discount validation", () => {
  it("accepts valid discount percentages", () => {
    expect(isValidDiscount("0")).toBe(true);
    expect(isValidDiscount("50")).toBe(true);
    expect(isValidDiscount("100")).toBe(true);
  });

  it("rejects discounts over 100", () => {
    expect(isValidDiscount("101")).toBe(false);
  });

  it("rejects negative discounts", () => {
    expect(isValidDiscount("-5")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(isValidDiscount("abc")).toBe(false);
  });
});

describe("backCalculateDiscount — edit order discount recovery", () => {
  it("calculates discount when stored price is below catalog price", () => {
    // £10 item stored at £9 → 10% discount
    const result = backCalculateDiscount(9, 10);
    expect(result).toEqual({ unitPrice: 10, discount: 10 });
  });

  it("returns 0 discount when prices are equal", () => {
    const result = backCalculateDiscount(10, 10);
    expect(result).toEqual({ unitPrice: 10, discount: 0 });
  });

  it("returns 0 discount when stored price is above catalog (no overcharge %)", () => {
    // Price dropped from £12 to £10 since order was placed
    const result = backCalculateDiscount(12, 10);
    expect(result).toEqual({ unitPrice: 10, discount: 0 });
  });

  it("uses stored price when catalog item not found", () => {
    const result = backCalculateDiscount(9, undefined);
    expect(result).toEqual({ unitPrice: 9, discount: 0 });
  });

  it("rounds discount to nearest integer", () => {
    // £10 item stored at £6.67 → 33.3% → rounds to 33%
    const result = backCalculateDiscount(6.67, 10);
    expect(result.discount).toBe(33);
  });

  it("handles 50% discount", () => {
    const result = backCalculateDiscount(5, 10);
    expect(result).toEqual({ unitPrice: 10, discount: 50 });
  });

  it("handles large discount", () => {
    // £100 item stored at £5 → 95% discount
    const result = backCalculateDiscount(5, 100);
    expect(result).toEqual({ unitPrice: 100, discount: 95 });
  });
});

describe("buildLineItems — discount applied to unit_price", () => {
  it("applies discount to unit_price in line items", () => {
    const cart: CartItem[] = [
      { itemId: "item-1", quantity: 3, unitPrice: 20, discount: 10 },
    ];
    const getName = (id: string) => (id === "item-1" ? "Widget" : "");
    const result = buildLineItems(cart, getName);

    expect(result).toEqual([
      {
        item_id: "item-1",
        item_name: "Widget",
        quantity: 3,
        unit_price: 18, // 20 * (1 - 10/100)
      },
    ]);
  });

  it("passes full price when no discount", () => {
    const cart: CartItem[] = [
      { itemId: "item-1", quantity: 1, unitPrice: 50, discount: 0 },
    ];
    const getName = () => "Gadget";
    const result = buildLineItems(cart, getName);

    expect(result[0].unit_price).toBe(50);
  });

  it("handles multiple items with mixed discounts", () => {
    const cart: CartItem[] = [
      { itemId: "a", quantity: 2, unitPrice: 100, discount: 25 },
      { itemId: "b", quantity: 1, unitPrice: 40, discount: 0 },
    ];
    const names: Record<string, string> = { a: "Item A", b: "Item B" };
    const result = buildLineItems(cart, (id) => names[id] ?? "");

    expect(result[0].unit_price).toBe(75);
    expect(result[1].unit_price).toBe(40);
  });
});
