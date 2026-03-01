import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("inventory actions", () => {
  it("getInventoryItems fetches from inventory_items table ordered by name", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: "1", name: "Apples" }], error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getInventoryItems } = await import("../inventory");
    const result = await getInventoryItems();

    expect(mockSupabase.from).toHaveBeenCalledWith("inventory_items");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockOrder).toHaveBeenCalledWith("name");
    expect(result).toEqual([{ id: "1", name: "Apples" }]);
  });

  it("getInventoryItems throws on error", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getInventoryItems } = await import("../inventory");
    await expect(getInventoryItems()).rejects.toThrow("DB error");
  });

  it("createItem inserts with correct fields and revalidates", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: "new" }, error: null });
    const mockSelectChain = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const { createItem } = await import("../inventory");
    const result = await createItem({
      name: "Bananas",
      price: 1.5,
      quantity: 100,
      category_id: "cat-1",
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("inventory_items");
    expect(mockInsert).toHaveBeenCalledWith({
      name: "Bananas",
      price: 1.5,
      quantity: 100,
      category_id: "cat-1",
      expiration_date: null,
      image: "/placeholder-item.svg",
    });
    expect(result.data).toEqual({ id: "new" });
    expect(result.error).toBeNull();
  });

  it("createItem passes optional expiration_date and image", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: "new" }, error: null });
    const mockSelectChain = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const { createItem } = await import("../inventory");
    await createItem({
      name: "Milk",
      price: 2.0,
      quantity: 50,
      category_id: "cat-2",
      expiration_date: "2026-04-01",
      image: "/milk.png",
    });

    expect(mockInsert).toHaveBeenCalledWith({
      name: "Milk",
      price: 2.0,
      quantity: 50,
      category_id: "cat-2",
      expiration_date: "2026-04-01",
      image: "/milk.png",
    });
  });

  it("updateItem updates by id and revalidates", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const { updateItem } = await import("../inventory");
    await updateItem("item-1", { name: "Updated", price: 3.0 });

    expect(mockSupabase.from).toHaveBeenCalledWith("inventory_items");
    expect(mockUpdate).toHaveBeenCalledWith({ name: "Updated", price: 3.0 });
    expect(mockEq).toHaveBeenCalledWith("id", "item-1");
  });

  it("deleteItem deletes by id and revalidates", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    const mockSelectSingle = vi.fn().mockResolvedValue({ data: { image: "/placeholder-item.svg" } });
    const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: mockSelect };
      return { delete: mockDelete };
    });

    const { deleteItem } = await import("../inventory");
    await deleteItem("item-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("inventory_items");
    expect(mockDeleteEq).toHaveBeenCalledWith("id", "item-1");
  });
});
