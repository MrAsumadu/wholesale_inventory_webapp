import { describe, it, expect, vi, beforeEach } from "vitest";

const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFont = vi.fn();
const mockSave = vi.fn();
const mockSaveGraphicsState = vi.fn();
const mockRestoreGraphicsState = vi.fn();
const mockGState = vi.fn().mockReturnValue({});
const mockSetGState = vi.fn();

const mockDoc = {
  text: mockText,
  setFontSize: mockSetFontSize,
  setTextColor: mockSetTextColor,
  setFont: mockSetFont,
  save: mockSave,
  saveGraphicsState: mockSaveGraphicsState,
  restoreGraphicsState: mockRestoreGraphicsState,
  GState: mockGState,
  setGState: mockSetGState,
  internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  lastAutoTable: { finalY: 120 },
};

vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(function () { return mockDoc; }),
}));

const mockAutoTable = vi.fn();
vi.mock("jspdf-autotable", () => ({
  default: mockAutoTable,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateOrderPdf", () => {
  const baseParams = {
    lineItems: [
      { item_name: "Widget", quantity: 5, unit_price: 10.0 },
      { item_name: "Gadget", quantity: 2, unit_price: 25.5 },
    ],
    total: 101.0,
    shop: { name: "Test Shop", location: "123 Main St", phone: "07700000000" },
    orderId: "abcdef12-3456-7890-abcd-ef1234567890",
    orderDate: "2026-03-06T12:00:00Z",
  };

  it("uses grid theme for the table", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf(baseParams);

    expect(mockAutoTable).toHaveBeenCalledOnce();
    const config = mockAutoTable.mock.calls[0][1];
    expect(config.theme).toBe("grid");
  });

  it("passes correct table headers and body", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf(baseParams);

    const config = mockAutoTable.mock.calls[0][1];
    expect(config.head).toEqual([["Item", "Qty", "Unit Price", "Subtotal"]]);
    expect(config.body).toEqual([
      ["Widget", "5", "£10.00", "£50.00"],
      ["Gadget", "2", "£25.50", "£51.00"],
    ]);
  });

  it("right-aligns price columns", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf(baseParams);

    const config = mockAutoTable.mock.calls[0][1];
    expect(config.columnStyles[2].halign).toBe("right");
    expect(config.columnStyles[3].halign).toBe("right");
  });

  it("saves file with invoice filename for final orders", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf(baseParams);

    expect(mockSave).toHaveBeenCalledWith("invoice-ABCDEF12.pdf");
  });

  it("shows invoice header and number for final orders", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf(baseParams);

    expect(mockText).toHaveBeenCalledWith("Invoice", 14, 32);
    expect(mockText).toHaveBeenCalledWith("Invoice #: ABCDEF12", 14, expect.any(Number));
  });

  it("saves file with preview filename for draft orders", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf({ ...baseParams, orderId: null });

    expect(mockSave).toHaveBeenCalledWith("order-preview-2026-03-06.pdf");
  });

  it("shows Order Preview header for draft orders", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf({ ...baseParams, orderId: null });

    expect(mockText).toHaveBeenCalledWith("Order Preview", 14, 32);
  });

  it("adds watermark for draft orders", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf({ ...baseParams, orderId: null });

    expect(mockSaveGraphicsState).toHaveBeenCalled();
    expect(mockText).toHaveBeenCalledWith(
      "ORDER PREVIEW",
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ angle: 45, align: "center" })
    );
    expect(mockRestoreGraphicsState).toHaveBeenCalled();
  });

  it("does not add watermark for final orders", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf(baseParams);

    expect(mockSaveGraphicsState).not.toHaveBeenCalled();
  });

  it("renders shop billing info", async () => {
    const { generateOrderPdf } = await import("../generate-order-pdf");
    generateOrderPdf(baseParams);

    expect(mockText).toHaveBeenCalledWith("Bill To:", 14, expect.any(Number));
    expect(mockText).toHaveBeenCalledWith("Test Shop", 14, expect.any(Number));
    expect(mockText).toHaveBeenCalledWith("123 Main St", 14, expect.any(Number));
    expect(mockText).toHaveBeenCalledWith("07700000000", 14, expect.any(Number));
  });
});
