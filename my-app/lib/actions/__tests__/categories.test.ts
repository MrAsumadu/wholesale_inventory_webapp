import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
  storage: { from: vi.fn() },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("categories actions", () => {
  it("getCategories fetches from categories table ordered by name", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: "1", name: "A" }], error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getCategories } = await import("../categories");
    const result = await getCategories();

    expect(mockSupabase.from).toHaveBeenCalledWith("categories");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockOrder).toHaveBeenCalledWith("name");
    expect(result).toEqual([{ id: "1", name: "A" }]);
  });

  it("getCategories returns empty array when data is null", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getCategories } = await import("../categories");
    const result = await getCategories();

    expect(result).toEqual([]);
  });

  it("getCategories throws on error", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { getCategories } = await import("../categories");
    await expect(getCategories()).rejects.toThrow("DB error");
  });

  it("createCategory inserts with correct fields", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: "new" }, error: null });
    const mockSelectChain = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const { createCategory } = await import("../categories");
    const result = await createCategory({ name: "Test" });

    expect(mockInsert).toHaveBeenCalledWith({ name: "Test", image: "/placeholder-item.svg" });
    expect(result.error).toBeNull();
  });

  it("createCategory uses provided image", async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: "new" }, error: null });
    const mockSelectChain = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectChain });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const { createCategory } = await import("../categories");
    await createCategory({ name: "Test", image: "/custom.png" });

    expect(mockInsert).toHaveBeenCalledWith({ name: "Test", image: "/custom.png" });
  });

  it("updateCategory updates by id", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ update: mockUpdate });

    const { updateCategory } = await import("../categories");
    await updateCategory("test-id", { name: "Updated" });

    expect(mockUpdate).toHaveBeenCalledWith({ name: "Updated" });
    expect(mockEq).toHaveBeenCalledWith("id", "test-id");
  });

  it("deleteCategory deletes by id", async () => {
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

    const { deleteCategory } = await import("../categories");
    await deleteCategory("test-id");

    expect(mockSupabase.from).toHaveBeenCalledWith("categories");
    expect(mockDeleteEq).toHaveBeenCalledWith("id", "test-id");
  });

  it("deleteCategory returns error for foreign key violation", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({
      error: { code: "23503", message: "fk violation" },
    });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    const mockSelectSingle = vi.fn().mockResolvedValue({ data: { image: "/img.png" } });
    const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: mockSelect };
      return { delete: mockDelete };
    });

    const { deleteCategory } = await import("../categories");
    const result = await deleteCategory("test-id");

    expect(result.error?.message).toBe("Cannot delete a category that has items. Reassign items first.");
  });

  it("deleteCategory cleans up storage image on success", async () => {
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });
    const imageUrl = "https://abc.supabase.co/storage/v1/object/public/images/cat/photo.webp";
    const mockSelectSingle = vi.fn().mockResolvedValue({ data: { image: imageUrl } });
    const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });
    const mockRemove = vi.fn().mockResolvedValue({});
    mockSupabase.storage.from.mockReturnValue({ remove: mockRemove });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: mockSelect };
      return { delete: mockDelete };
    });

    const { deleteCategory } = await import("../categories");
    await deleteCategory("test-id");

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("images");
    expect(mockRemove).toHaveBeenCalledWith(["cat/photo.webp"]);
  });
});
