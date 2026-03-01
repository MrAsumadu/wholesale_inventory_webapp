# Order Review, Confirmation & Invoice PDF — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a review step to the order creation flow with an "Export to PDF" option, and fix the existing invoice modal to use jsPDF instead of broken window.print().

**Architecture:** Add a "review" step inside the existing `NewOrderFlow` modal between cart and success. Use `jsPDF` + `jspdf-autotable` for all PDF generation (draft preview before order, final invoice after order). Shared PDF utility handles both cases.

**Tech Stack:** jsPDF, jspdf-autotable, React, Next.js, TypeScript

---

### Task 1: Install jsPDF dependencies

**Step 1: Install packages**

Run: `cd my-app && npm install jspdf jspdf-autotable`

**Step 2: Verify installation**

Run: `cd my-app && node -e "require('jspdf'); require('jspdf-autotable'); console.log('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add my-app/package.json my-app/package-lock.json
git commit -m "chore: add jspdf and jspdf-autotable dependencies"
```

---

### Task 2: Create PDF generation utility

**Files:**
- Create: `my-app/lib/generate-order-pdf.ts`

**Step 1: Create the shared PDF generation utility**

Create `my-app/lib/generate-order-pdf.ts`:

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfLineItem {
  item_name: string;
  quantity: number;
  unit_price: number;
}

interface PdfShopInfo {
  name: string;
  location: string;
  phone: string;
}

interface GenerateInvoicePdfOptions {
  lineItems: PdfLineItem[];
  total: number;
  shop: PdfShopInfo;
  /** If provided, generates a final invoice. If null, generates a draft preview. */
  orderId: string | null;
  orderDate: string;
}

export function generateOrderPdf({
  lineItems,
  total,
  shop,
  orderId,
  orderDate,
}: GenerateInvoicePdfOptions): void {
  const doc = new jsPDF();
  const isDraft = !orderId;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Draft watermark
  if (isDraft) {
    doc.setFontSize(50);
    doc.setTextColor(220, 220, 220);
    doc.text("ORDER PREVIEW", pageWidth / 2, 150, { angle: 45, align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Header — Shahjalal Inventory
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Shahjalal Inventory", 14, 22);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(isDraft ? "Order Preview" : "Invoice", 14, 28);
  doc.setTextColor(0, 0, 0);

  // Invoice # and date (right side)
  doc.setFontSize(10);
  if (orderId) {
    doc.text(`Invoice #${orderId.slice(0, 8).toUpperCase()}`, pageWidth - 14, 22, { align: "right" });
  }
  const formattedDate = new Date(orderDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  doc.text(formattedDate, pageWidth - 14, 28, { align: "right" });

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 33, pageWidth - 14, 33);

  // Bill To
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("BILL TO", 14, 42);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(shop.name, 14, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(shop.location, 14, 54);
  doc.text(shop.phone, 14, 60);

  // Line items table
  const tableData = lineItems.map((item) => [
    item.item_name,
    item.quantity.toString(),
    `$${item.unit_price.toFixed(2)}`,
    `$${(item.quantity * item.unit_price).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 68,
    head: [["Item", "Qty", "Unit Price", "Subtotal"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [41, 37, 36],
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 25 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  });

  // Total
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, finalY, pageWidth - 14, finalY);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total", 14, finalY + 8);
  doc.text(`$${total.toFixed(2)}`, pageWidth - 14, finalY + 8, { align: "right" });

  // Footer for draft
  if (isDraft) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("This is a draft preview. Order has not been placed.", 14, finalY + 20);
  }

  // Download
  const filename = orderId
    ? `invoice-${orderId.slice(0, 8).toUpperCase()}.pdf`
    : `order-preview-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd my-app && npx tsc --noEmit lib/generate-order-pdf.ts 2>&1 | head -20`

If there are type issues with jspdf-autotable, add a `// @ts-expect-error` or install `@types/jspdf-autotable` if available. The `lastAutoTable` property on `doc` may need casting — the code above handles this with `as unknown as`.

**Step 3: Commit**

```bash
git add my-app/lib/generate-order-pdf.ts
git commit -m "feat: add shared PDF generation utility using jsPDF"
```

---

### Task 3: Add review step to NewOrderFlow

**Files:**
- Modify: `my-app/components/orders/new-order-flow.tsx`

This is the main task. The current flow has two states: cart (default) and `confirmed` (success). We need to add a `reviewing` state between them.

**Step 1: Add review state and shop prop**

In `new-order-flow.tsx`, the component needs the shop's location and phone for the PDF. Update the props interface:

```typescript
interface NewOrderFlowProps {
  open: boolean;
  onClose: () => void;
  shopName: string;
  shopId: string;
  shopLocation: string;
  shopPhone: string;
  items: InventoryItemSlim[];
  categories: Category[];
}
```

Add a `reviewing` state and `orderId` state:

```typescript
const [reviewing, setReviewing] = useState(false);
const [orderId, setOrderId] = useState<string | null>(null);
```

Add new imports at top:

```typescript
import { ArrowLeft, FileDown } from "lucide-react";
import { generateOrderPdf } from "@/lib/generate-order-pdf";
```

**Step 2: Change "Confirm Order" button to go to review step**

Replace `handleConfirm` — rename it to `handleReview`. This function validates the cart and sets `reviewing = true` instead of placing the order:

```typescript
const handleReview = () => {
  setError(null);
  if (cart.length === 0) { setError("Add at least one item to the order."); return; }
  if (hasOverStock) { setError("One or more items exceed available stock. Reduce quantities before confirming."); return; }
  if (hasInvalidPrice) { setError("Unit price cannot be negative."); return; }
  setReviewing(true);
};
```

Add a new `handlePlaceOrder` function that actually places the order:

```typescript
const handlePlaceOrder = () => {
  setError(null);
  const lineItems = cart.map((c) => ({
    item_id: c.itemId,
    item_name: c.itemName,
    quantity: c.quantity,
    unit_price: c.unitPrice,
  }));

  startTransition(async () => {
    const result = await placeOrder(shopId, lineItems);
    if (result.error) {
      setError(result.error.message ?? "Failed to place order. Stock may be insufficient.");
    } else {
      setOrderId(result.data as string);
      setConfirmed(true);
      setReviewing(false);
      router.refresh();
    }
  });
};
```

**Step 3: Add PDF export handlers**

```typescript
const handleExportPreviewPdf = () => {
  generateOrderPdf({
    lineItems: cart.map((c) => ({
      item_name: c.itemName,
      quantity: c.quantity,
      unit_price: c.unitPrice,
    })),
    total,
    shop: { name: shopName, location: shopLocation, phone: shopPhone },
    orderId: null,
    orderDate: new Date().toISOString(),
  });
};

const handleExportInvoicePdf = () => {
  if (!orderId) return;
  generateOrderPdf({
    lineItems: cart.map((c) => ({
      item_name: c.itemName,
      quantity: c.quantity,
      unit_price: c.unitPrice,
    })),
    total,
    shop: { name: shopName, location: shopLocation, phone: shopPhone },
    orderId,
    orderDate: new Date().toISOString(),
  });
};
```

**Step 4: Update handleClose to reset new state**

```typescript
const handleClose = () => {
  setCart([]);
  setSearch("");
  setConfirmed(false);
  setReviewing(false);
  setOrderId(null);
  setError(null);
  onClose();
};
```

**Step 5: Add the review step UI**

The modal content should now have three states: `confirmed`, `reviewing`, and default (cart). Replace the ternary in the render:

```tsx
{confirmed ? (
  /* Success state — same as before but add Export Invoice button */
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <CheckCircle2 className="w-8 h-8 text-primary" />
    </div>
    <h3 className="font-display text-xl mb-2">Order placed successfully</h3>
    <p className="text-muted-foreground text-sm mb-1">
      {itemCount} items totaling ${total.toFixed(2)}
    </p>
    <p className="text-muted-foreground/70 text-xs">
      Order for {shopName}
    </p>
    <div className="flex gap-2 mt-6">
      <Button variant="outline" onClick={handleExportInvoicePdf}>
        <FileDown className="w-4 h-4 mr-2" />
        Export Invoice
      </Button>
      <Button onClick={handleClose} className="bg-primary hover:bg-primary/90">
        Done
      </Button>
    </div>
  </div>
) : reviewing ? (
  /* Review step */
  <>
    {error && (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    )}

    <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
      <div className="space-y-1">
        {/* Simple line items table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-xs text-muted-foreground">Item</th>
                <th className="text-right p-3 font-medium text-xs text-muted-foreground">Qty</th>
                <th className="text-right p-3 font-medium text-xs text-muted-foreground">Price</th>
                <th className="text-right p-3 font-medium text-xs text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((c) => (
                <tr key={c.itemId} className="border-b border-border last:border-0">
                  <td className="p-3">{c.itemName}</td>
                  <td className="p-3 text-right tabular-nums">{c.quantity}</td>
                  <td className="p-3 text-right tabular-nums">${c.unitPrice.toFixed(2)}</td>
                  <td className="p-3 text-right tabular-nums font-medium">
                    ${(c.quantity * c.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-3">
          <span className="text-sm font-medium">Total</span>
          <span className="text-lg font-semibold tabular-nums">${total.toFixed(2)}</span>
        </div>

        {/* Warning */}
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-xs mt-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>This action cannot be undone. Stock will be deducted immediately.</span>
        </div>
      </div>
    </div>

    <DialogFooter className="flex-row items-center justify-between sm:justify-between border-t border-border pt-4 mt-2">
      <Button variant="outline" size="sm" onClick={handleExportPreviewPdf}>
        <FileDown className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { setReviewing(false); setError(null); }} disabled={isPending}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handlePlaceOrder}
          disabled={isPending}
          className="bg-primary hover:bg-primary/90"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Placing Order...
            </>
          ) : (
            "Place Order"
          )}
        </Button>
      </div>
    </DialogFooter>
  </>
) : (
  /* Cart step — existing code, but change button from handleConfirm to handleReview, label from "Confirm Order" to "Review Order" */
  ...existing cart JSX...
  /* Change: onClick={handleReview} and label "Review Order" */
)}
```

**Step 6: Update the DialogTitle to reflect all three states**

```tsx
<DialogTitle className="font-display text-xl">
  {confirmed
    ? "Order Confirmed"
    : reviewing
      ? "Review Order"
      : `New Order — ${shopName}`}
</DialogTitle>
```

**Step 7: Update the cart footer button**

Change the "Confirm Order" button text and handler:
- `onClick={handleConfirm}` → `onClick={handleReview}`
- Label: `"Confirm Order"` → `"Review Order"`
- Remove `isPending` from this button (it no longer submits)
- Remove the Loader2 spinner from this button

**Step 8: Commit**

```bash
git add my-app/components/orders/new-order-flow.tsx
git commit -m "feat: add review step with PDF preview to order flow"
```

---

### Task 4: Pass shop details to NewOrderFlow

**Files:**
- Modify: The parent page that renders `<NewOrderFlow>` — likely `my-app/app/(app)/shops/[id]/page.tsx`

**Step 1: Find where NewOrderFlow is rendered**

Search for `<NewOrderFlow` or `NewOrderFlow` imports to find the parent component. Pass `shopLocation` and `shopPhone` props from the shop data that's already fetched on the shop detail page.

```tsx
<NewOrderFlow
  open={orderDialogOpen}
  onClose={() => setOrderDialogOpen(false)}
  shopName={shop.name}
  shopId={shop.id}
  shopLocation={shop.location}
  shopPhone={shop.phone}
  items={items}
  categories={categories}
/>
```

**Step 2: Commit**

```bash
git add my-app/app/\(app\)/shops/\[id\]/page.tsx
git commit -m "feat: pass shop location and phone to order flow for PDF"
```

---

### Task 5: Fix existing invoice modal to use jsPDF

**Files:**
- Modify: `my-app/components/orders/invoice-modal.tsx`

**Step 1: Replace window.print() with jsPDF**

Replace the `handlePrint` function with:

```typescript
import { generateOrderPdf } from "@/lib/generate-order-pdf";

const handlePrint = () => {
  generateOrderPdf({
    lineItems: (order.line_items ?? []).map((li) => ({
      item_name: li.item_name,
      quantity: li.quantity,
      unit_price: li.unit_price,
    })),
    total: order.total,
    shop: shop
      ? { name: shop.name, location: shop.location, phone: shop.phone }
      : { name: "Unknown Shop", location: "", phone: "" },
    orderId: order.id,
    orderDate: order.created_at,
  });
};
```

**Step 2: Update the button label from "Print" to "Export PDF"**

Change icon from `Printer` to `FileDown` and label from "Print" to "Export PDF":

```tsx
import { Package, FileDown } from "lucide-react";

<Button onClick={handlePrint}>
  <FileDown className="w-4 h-4 mr-2" />
  Export PDF
</Button>
```

Remove unused `Printer` import.

**Step 3: Commit**

```bash
git add my-app/components/orders/invoice-modal.tsx
git commit -m "fix: replace broken window.print() with jsPDF in invoice modal"
```

---

### Task 6: Verify full flow works

**Step 1: Run TypeScript check**

Run: `cd my-app && npx tsc --noEmit`
Expected: No errors

**Step 2: Run build**

Run: `cd my-app && npm run build`
Expected: Build succeeds

**Step 3: Manual testing checklist**
- Open a shop → click "New Order" → add items → click "Review Order"
- Verify review step shows line items table, total, warning
- Click "Export PDF" on review step → verify draft PDF downloads with "ORDER PREVIEW" watermark
- Click "Back" → verify returns to cart with items intact
- Click "Review Order" again → "Place Order" → verify order placed
- On success screen, click "Export Invoice" → verify final PDF with invoice #
- Go to orders page → expand an order → click "View Invoice" → "Export PDF" → verify PDF downloads correctly

**Step 4: Final commit if any fixes needed**
