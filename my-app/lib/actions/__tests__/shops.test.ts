import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
};

const mockCookies = [{ name: "sb-token", value: "test-token" }];

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
  createClientFromCookies: vi.fn(() => mockSupabase),
}));

const mockUpdateTag = vi.fn();

vi.mock("next/cache", () => ({
  updateTag: mockUpdateTag,
  unstable_cache: (fn: Function) => fn,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => mockCookies })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("shops actions", () => {
  it("getShops fetches from shops table ordered by name", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: "1", name: "Shop A" }], error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getShops } = await import("../shops");
    const result = await getShops();

    expect(mockSupabase.from).toHaveBeenCalledWith("shops");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockOrder).toHaveBeenCalledWith("name");
    expect(result).toEqual([{ id: "1", name: "Shop A" }]);
  });

  it("getShop calls .eq('id', id).single()", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: "s1", name: "Shop 1" }, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getShop } = await import("../shops");
    const result = await getShop("s1");

    expect(mockSupabase.from).toHaveBeenCalledWith("shops");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("id", "s1");
    expect(mockSingle).toHaveBeenCalled();
    expect(result).toEqual({ id: "s1", name: "Shop 1" });
  });

  it("getShop returns null on error", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getShop } = await import("../shops");
    const result = await getShop("missing");

    expect(result).toBeNull();
  });

  it("createShop inserts fields and calls updateTag", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: "new" }, error: null });
    const mockSelectChain = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const fields = {
      name: "New Shop",
      owner: "Owner",
      location: "London",
      phone: "123",
      opening_time: "08:00",
      closing_time: "18:00",
    };

    const { createShop } = await import("../shops");
    const result = await createShop(fields);

    expect(mockSupabase.from).toHaveBeenCalledWith("shops");
    expect(mockInsert).toHaveBeenCalledWith(fields);
    expect(result.error).toBeNull();
    expect(mockUpdateTag).toHaveBeenCalledWith("shops");
  });

  it("updateShop updates by id and calls updateTag", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const { updateShop } = await import("../shops");
    await updateShop("s1", { name: "Updated Shop" });

    expect(mockSupabase.from).toHaveBeenCalledWith("shops");
    expect(mockUpdate).toHaveBeenCalledWith({ name: "Updated Shop" });
    expect(mockEq).toHaveBeenCalledWith("id", "s1");
    expect(mockUpdateTag).toHaveBeenCalledWith("shops");
  });

  it("deleteShop deletes by id and calls updateTag", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ delete: mockDelete });

    const { deleteShop } = await import("../shops");
    await deleteShop("s1");

    expect(mockSupabase.from).toHaveBeenCalledWith("shops");
    expect(mockEq).toHaveBeenCalledWith("id", "s1");
    expect(mockUpdateTag).toHaveBeenCalledWith("shops");
  });

  it("deleteShop returns error for foreign key violation", async () => {
    const mockEq = vi.fn().mockResolvedValue({
      error: { code: "23503", message: "fk violation" },
    });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ delete: mockDelete });

    const { deleteShop } = await import("../shops");
    const result = await deleteShop("s1");

    expect(result.error?.message).toBe("Cannot delete a shop that has orders.");
  });
});
