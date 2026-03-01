import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
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

describe("orders actions", () => {
  it("getOrders fetches orders with line_items ordered by created_at desc", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: "o1", shop_id: "s1", line_items: [] }],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getOrders } = await import("../orders");
    const result = await getOrders();

    expect(mockSupabase.from).toHaveBeenCalledWith("orders");
    expect(mockSelect).toHaveBeenCalledWith("*, line_items:order_line_items(*)");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ id: "o1", shop_id: "s1", line_items: [] }]);
  });

  it("getOrders throws on error", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "fail" },
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getOrders } = await import("../orders");
    await expect(getOrders()).rejects.toEqual({ message: "fail" });
  });

  it("getShopOrders fetches orders filtered by shopId", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: "o2", shop_id: "s1", line_items: [] }],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getShopOrders } = await import("../orders");
    const result = await getShopOrders("s1");

    expect(mockSupabase.from).toHaveBeenCalledWith("orders");
    expect(mockSelect).toHaveBeenCalledWith("*, line_items:order_line_items(*)");
    expect(mockEq).toHaveBeenCalledWith("shop_id", "s1");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ id: "o2", shop_id: "s1", line_items: [] }]);
  });

  it("getShopOrders throws on error", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "shop fail" },
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getShopOrders } = await import("../orders");
    await expect(getShopOrders("s1")).rejects.toEqual({ message: "shop fail" });
  });

  it("placeOrder calls rpc and revalidates paths", async () => {
    mockSupabase.rpc.mockResolvedValue({ data: "new-order-id", error: null });

    const { placeOrder } = await import("../orders");
    const lineItems = [
      { item_id: "i1", item_name: "Widget", quantity: 5, unit_price: 10 },
    ];
    const result = await placeOrder("s1", lineItems);

    expect(mockSupabase.rpc).toHaveBeenCalledWith("place_order", {
      p_shop_id: "s1",
      p_line_items: lineItems,
    });
    expect(result).toEqual({ data: "new-order-id", error: null });
  });

  it("placeOrder returns error without throwing", async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: "rpc fail" } });

    const { placeOrder } = await import("../orders");
    const result = await placeOrder("s1", []);

    expect(result.error).toEqual({ message: "rpc fail" });
  });
});
