import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("orders actions", () => {
  it("getOrders fetches orders with line_items ordered by created_at desc", async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: [{ id: "o1", shop_id: "s1", line_items: [] }],
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getOrders } = await import("../orders");
    const result = await getOrders();

    expect(mockSupabase.from).toHaveBeenCalledWith("orders");
    expect(mockSelect).toHaveBeenCalledWith("*, line_items:order_line_items(*)");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(result).toEqual([{ id: "o1", shop_id: "s1", line_items: [] }]);
  });

  it("getOrders throws on error", async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "fail" },
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getOrders } = await import("../orders");
    await expect(getOrders()).rejects.toEqual({ message: "fail" });
  });

  it("getRecentOrders fetches with limit and slim select", async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: [{ id: "o1", shop_id: "s1", total: 50, created_at: "2026-01-01", line_items: [{ id: "li1" }] }],
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getRecentOrders } = await import("../orders");
    const result = await getRecentOrders(3);

    expect(mockSelect).toHaveBeenCalledWith("id, shop_id, total, status, created_at, line_items:order_line_items(id)");
    expect(mockLimit).toHaveBeenCalledWith(3);
    expect(result).toHaveLength(1);
  });

  it("getOrderStats calls RPC and returns count and totalRevenue", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { count: 10, totalRevenue: 500 },
      error: null,
    });

    const { getOrderStats } = await import("../orders");
    const result = await getOrderStats();

    expect(mockSupabase.rpc).toHaveBeenCalledWith("get_order_stats");
    expect(result).toEqual({ count: 10, totalRevenue: 500 });
  });

  it("getOrderStats returns zeroes when data is null", async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    const { getOrderStats } = await import("../orders");
    const result = await getOrderStats();

    expect(result).toEqual({ count: 0, totalRevenue: 0 });
  });

  it("getShopOrders fetches orders filtered by shopId", async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: [{ id: "o2", shop_id: "s1", line_items: [] }],
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getShopOrders } = await import("../orders");
    const result = await getShopOrders("s1");

    expect(mockSupabase.from).toHaveBeenCalledWith("orders");
    expect(mockSelect).toHaveBeenCalledWith("*, line_items:order_line_items(*)");
    expect(mockEq).toHaveBeenCalledWith("shop_id", "s1");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(result).toEqual([{ id: "o2", shop_id: "s1", line_items: [] }]);
  });

  it("getShopOrders throws on error", async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "shop fail" },
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getShopOrders } = await import("../orders");
    await expect(getShopOrders("s1")).rejects.toEqual({ message: "shop fail" });
  });

  it("getOrderCountsByShop calls RPC and returns record", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { s1: 5, s2: 3 },
      error: null,
    });

    const { getOrderCountsByShop } = await import("../orders");
    const result = await getOrderCountsByShop();

    expect(mockSupabase.rpc).toHaveBeenCalledWith("get_order_counts_by_shop");
    expect(result).toEqual({ s1: 5, s2: 3 });
  });

  it("placeOrder calls rpc with shop id and line items", async () => {
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

  it("confirmOrder calls rpc with order id", async () => {
    mockSupabase.rpc.mockResolvedValue({ error: null });

    const { confirmOrder } = await import("../orders");
    const result = await confirmOrder("order-1");

    expect(mockSupabase.rpc).toHaveBeenCalledWith("confirm_order", {
      p_order_id: "order-1",
    });
    expect(result).toEqual({ error: null });
  });

  it("confirmOrder returns error from rpc", async () => {
    mockSupabase.rpc.mockResolvedValue({ error: { message: "already confirmed" } });

    const { confirmOrder } = await import("../orders");
    const result = await confirmOrder("order-1");

    expect(result.error).toEqual({ message: "already confirmed" });
  });

  it("cancelOrder deletes pending order", async () => {
    const mockEq2 = vi.fn().mockResolvedValue({ error: null, count: 1 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockSupabase.from.mockReturnValue({ delete: mockDelete });

    const { cancelOrder } = await import("../orders");
    const result = await cancelOrder("order-2");

    expect(mockSupabase.from).toHaveBeenCalledWith("orders");
    expect(mockDelete).toHaveBeenCalledWith({ count: "exact" });
    expect(mockEq1).toHaveBeenCalledWith("id", "order-2");
    expect(mockEq2).toHaveBeenCalledWith("status", "pending");
    expect(result).toEqual({ error: null });
  });

  it("cancelOrder returns error when order not found or not pending", async () => {
    const mockEq2 = vi.fn().mockResolvedValue({ error: null, count: 0 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockSupabase.from.mockReturnValue({ delete: mockDelete });

    const { cancelOrder } = await import("../orders");
    const result = await cancelOrder("order-2");

    expect(result.error).toEqual({ message: "Order not found or is not pending." });
  });

  it("cancelOrder returns error on db failure", async () => {
    const mockEq2 = vi.fn().mockResolvedValue({ error: { message: "db error" }, count: null });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq1 });
    mockSupabase.from.mockReturnValue({ delete: mockDelete });

    const { cancelOrder } = await import("../orders");
    const result = await cancelOrder("order-2");

    expect(result.error).toEqual({ message: "db error" });
  });

  it("updatePendingOrder calls rpc with order id and line items", async () => {
    mockSupabase.rpc.mockResolvedValue({ error: null });

    const { updatePendingOrder } = await import("../orders");
    const lineItems = [
      { item_id: "i1", item_name: "Widget", quantity: 3, unit_price: 15 },
    ];
    const result = await updatePendingOrder("order-3", lineItems);

    expect(mockSupabase.rpc).toHaveBeenCalledWith("update_pending_order", {
      p_order_id: "order-3",
      p_line_items: lineItems,
    });
    expect(result).toEqual({ error: null });
  });

  it("updatePendingOrder returns error on failure", async () => {
    mockSupabase.rpc.mockResolvedValue({ error: { message: "update failed" } });

    const { updatePendingOrder } = await import("../orders");
    const result = await updatePendingOrder("order-3", []);

    expect(result.error).toEqual({ message: "update failed" });
  });

  it("getOrderById returns order when found", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "o1", shop_id: "s1", line_items: [] },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getOrderById } = await import("../orders");
    const result = await getOrderById("o1");

    expect(mockSupabase.from).toHaveBeenCalledWith("orders");
    expect(mockSelect).toHaveBeenCalledWith("*, line_items:order_line_items(*)");
    expect(mockEq).toHaveBeenCalledWith("id", "o1");
    expect(result).toEqual({ id: "o1", shop_id: "s1", line_items: [] });
  });

  it("getOrderById returns null on error", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getOrderById } = await import("../orders");
    const result = await getOrderById("nonexistent");

    expect(result).toBeNull();
  });
});
