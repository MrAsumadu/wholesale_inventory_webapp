import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfLineItem {
  item_name: string;
  quantity: number;
  unit_price: number;
}

interface PdfShop {
  name: string;
  location: string;
  phone: string;
}

interface GenerateOrderPdfParams {
  lineItems: PdfLineItem[];
  total: number;
  shop: PdfShop;
  orderId: string | null;
  orderDate: string;
}

function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateOrderPdf({
  lineItems,
  total,
  shop,
  orderId,
  orderDate,
}: GenerateOrderPdfParams): void {
  const isDraft = orderId === null;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header ---
  doc.setFontSize(20);
  doc.setTextColor(41, 37, 36);
  doc.text("Shahjalal Inventory", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(isDraft ? "Order Preview" : "Invoice", 14, 32);

  // --- Invoice number & date (final only) ---
  let yPos = 44;

  if (!isDraft) {
    const invoiceNumber = orderId.substring(0, 8).toUpperCase();
    doc.setFontSize(10);
    doc.setTextColor(41, 37, 36);
    doc.text(`Invoice #: ${invoiceNumber}`, 14, yPos);
    doc.text(`Date: ${formatDate(orderDate)}`, 14, yPos + 6);
    yPos += 18;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(41, 37, 36);
    doc.text(`Date: ${formatDate(orderDate)}`, 14, yPos);
    yPos += 12;
  }

  // --- Shop billing info ---
  doc.setFontSize(11);
  doc.setTextColor(41, 37, 36);
  doc.text("Bill To:", 14, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(shop.name, 14, yPos);
  yPos += 5;
  doc.text(shop.location, 14, yPos);
  yPos += 5;
  doc.text(shop.phone, 14, yPos);
  yPos += 12;

  // --- Line items table ---
  const tableBody = lineItems.map((item) => [
    item.item_name,
    item.quantity.toString(),
    formatCurrency(item.unit_price),
    formatCurrency(item.quantity * item.unit_price),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Item", "Qty", "Unit Price", "Subtotal"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [41, 37, 36],
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
    },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  // --- Total ---
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY;
  const totalY = finalY + 10;

  doc.setFontSize(12);
  doc.setTextColor(41, 37, 36);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${formatCurrency(total)}`, pageWidth - 14, totalY, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");

  // --- Draft footer ---
  if (isDraft) {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "This is a draft preview. Order has not been placed.",
      pageWidth / 2,
      totalY + 16,
      { align: "center" }
    );
  }

  // --- Draft watermark (drawn last so it appears on top) ---
  if (isDraft) {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.15 }));
    doc.setFontSize(60);
    doc.setTextColor(150, 150, 150);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text("ORDER PREVIEW", pageWidth / 2, pageHeight / 2, {
      angle: 45,
      align: "center",
    });
    doc.restoreGraphicsState();
  }

  // --- Save ---
  if (isDraft) {
    const dateStr = orderDate.substring(0, 10);
    doc.save(`order-preview-${dateStr}.pdf`);
  } else {
    const invoiceId = orderId!.substring(0, 8).toUpperCase();
    doc.save(`invoice-${invoiceId}.pdf`);
  }
}
